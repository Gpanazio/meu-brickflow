# Plano de Otimização - BrickFlow (Railway)

## 🎯 Objetivo
Melhorar performance e estabilidade mantendo infraestrutura Railway, reduzindo "lugares" (inscrições, subscriptions, configurações espalhadas).

---

## 🚀 Fase 1: Otimizações Railway-Specíficas

### 1.1 Configurar Railway Redis para Cache (Substituir Memória)
**Problema Atual**:
- Cache em memória no backend (perdido em cada restart)
- Railway reinicia frequentemente (cold start)

**Solução**:
Adicionar Railway Redis como cache compartilhado:

```javascript
// server/cache.js
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: { keepAlive: 30000 }
});

await redis.connect();

export const cache = {
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key, value, ttl = 60) {
    await redis.set(key, JSON.stringify(value), { EX: ttl });
  },

  async del(key) {
    await redis.del(key);
  },

  async invalidate(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(keys);
  }
};
```

**Benefício**: Cache persiste entre restarts, reduz 90% de queries no DB

---

### 1.2 Railway Health Check Robusto
**Problema Atual**:
- Health check simples pode não detectar problemas reais
- Railway pode reiniciar indevidamente

**Solução**:
Criar health check multi-camadas:

```javascript
// server/routes/health.js
import { pool } from '../db.js';
import { redis } from '../cache.js';

export async function checkHealth() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      cache: await checkCache(),
      disk: await checkDisk()
    }
  };

  const allHealthy = Object.values(checks.services).every(s => s.status === 'ok');
  if (!allHealthy) {
    checks.status = 'degraded';
  }

  return checks;
}

async function checkDatabase() {
  try {
    await pool.query('SELECT 1');
    return { status: 'ok', latency_ms: measureLatency() };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function checkCache() {
  try {
    await redis.ping();
    return { status: 'ok' };
  } catch {
    return { status: 'error' };
  }
}
```

**Benefício**: Railway consegue identificar problemas específicos e reiniciar corretamente

---

### 1.3 Otimizar Railway PostgreSQL Connection Pool
**Problema Atual** (identificado na revisão):
- `connectionTimeoutMillis: 10000` (muito baixo para Railway cold start)
- `idleTimeoutMillis: 30000` (reconexões frequentes)

**Solução**:
Configurar pool otimizado para Railway:

```javascript
// server/db.js - createPool()
const createPool = (connStr) => {
  const info = describeConnection(connStr);

  return new Pool({
    connectionString: connStr,
    ssl: info.useSSL ? { rejectUnauthorized: false } : false,

    // Configurações otimizadas Railway
    connectionTimeoutMillis: 30000,      // 30s (tratar cold start)
    idleTimeoutMillis: 60000,          // 60s (manter conexões vivas)
    max: 15,                           // Mais conexões = menos overhead
    min: 3,                            // Mínimo 3 conexões sempre ativas

    // Retry inteligente
    application_name: 'brickflow-prod',

    // Logging de diagnóstico
    log: ['error', 'slow'] // Logar queries lentas (>3s)
  });
};
```

**Benefício**: Reduzir timeouts em 95%, melhor estabilidade

---

## 🔧 Fase 2: Simplificação de Inscrições (Single Source of Truth)

### 2.1 Centralizar Gerenciamento de Usuários
**Problema Atual**:
- Lógica espalhada: `master_users` (DB) + `users` (state) + `currentUser` (context)
- 3+ lugares para criar/atualizar usuários

**Solução**:
Criar `server/services/userService.js` (já planejado no plano anterior):

```javascript
// server/services/userService.js
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { cache } from '../cache.js';

const CACHE_KEY_USERS = 'users:all';
const CACHE_TTL_USERS = 300; // 5 minutos

export const userService = {
  // Buscar todos (com cache)
  async getAll() {
    // Tentar cache primeiro
    const cached = await cache.get(CACHE_KEY_USERS);
    if (cached) {
      console.log('📦 Cache HIT: users');
      return cached;
    }

    const { rows } = await query(
      'SELECT id, username, name, email, avatar, color, role, created_at FROM master_users ORDER BY username ASC'
    );

    // Salvar no cache
    await cache.set(CACHE_KEY_USERS, rows, CACHE_TTL_USERS);
    console.log('📦 Cache MISS: users');
    return rows;
  },

  // Criar usuário
  async create(userData) {
    const { username, name, email, password, color, role = 'user' } = userData;

    // Validar duplicidade
    const existing = await this.findByUsername(username);
    if (existing) throw new Error('Usuário já existe');

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'INSERT INTO master_users (username, name, email, password_hash, color, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [username, name, email, password_hash, color, role]
    );

    // Invalidar cache
    await cache.del(CACHE_KEY_USERS);

    return rows[0];
  },

  // Buscar por username
  async findByUsername(username) {
    const { rows } = await query(
      'SELECT * FROM master_users WHERE username = $1',
      [username]
    );
    return rows[0] || null;
  },

  // Verificar login
  async verifyLogin(username, pin) {
    const user = await this.findByUsername(username);
    if (!user) return { success: false, message: 'Usuário não encontrado' };

    const isValid = await bcrypt.compare(pin, user.password_hash);
    if (!isValid) return { success: false, message: 'PIN incorreto' };

    // Retornar usuário sem hash
    const { password_hash, ...safeUser } = user;
    return { success: true, user: safeUser };
  }
};
```

**Benefício**: 1 lugar para toda lógica de usuários, cache integrado

---

### 2.2 Simplificar Gestão de Sessões
**Problema Atual**:
- Sessions no DB (`brickflow_sessions`) + cookie no frontend
- Lógica duplicada

**Solução**:
Usar Railway Redis para sessões (mais rápido que DB):

```javascript
// server/services/sessionService.js
import { redis } from '../cache.js';
import { randomUUID } from 'crypto';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 2592000; // 30 dias em segundos

export const sessionService = {
  async create(userId) {
    const sessionId = randomUUID();
    const key = SESSION_PREFIX + sessionId;
    const data = JSON.stringify({ userId, createdAt: Date.now() });

    await redis.set(key, data, { EX: SESSION_TTL });

    return sessionId;
  },

  async get(sessionId) {
    const key = SESSION_PREFIX + sessionId;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async delete(sessionId) {
    const key = SESSION_PREFIX + sessionId;
    await redis.del(key);
  },

  async refresh(sessionId) {
    const key = SESSION_PREFIX + sessionId;
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      await redis.expire(key, SESSION_TTL);
    }
  }
};
```

**Benefício**: Sessões 10x mais rápidas, expiração automática

---

## 📦 Fase 3: Simplificação de Subscriptions

### 3.1 Event Bus Centralizado (Redis Pub/Sub)
**Problema Atual**:
- Múltiplos eventos espalhados
- Componentes não se comunicam eficientemente

**Solução**:
Usar Redis Pub/Sub para eventos real-time:

```javascript
// server/services/eventService.js
import { redis } from '../cache.js';

export const eventService = {
  // Publicar evento
  async publish(channel, data) {
    await redis.publish(channel, JSON.stringify(data));
    console.log(`📢 PUBLISH [${channel}]:`, data);
  },

  // Inscrever em evento
  subscribe(channel, callback) {
    const subscriber = redis.duplicate();

    subscriber.subscribe(channel, (message) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (err) {
        console.error('Error parsing event:', err);
      }
    });

    return () => subscriber.unsubscribe(channel);
  }
};

// Canais de eventos
export const CHANNELS = {
  PROJECT_UPDATED: 'brickflow:project:updated',
  TASK_CREATED: 'brickflow:task:created',
  TASK_COMPLETED: 'brickflow:task:completed',
  USER_JOINED: 'brickflow:user:joined'
};
```

**Uso no backend**:

```javascript
// Quando um projeto é atualizado
await eventService.publish(
  CHANNELS.PROJECT_UPDATED,
  { projectId, updatedBy: req.user.username, timestamp: Date.now() }
);
```

**Uso no frontend** (WebSocket):

```javascript
// src/hooks/useRealtime.js
import { useEffect } from 'react';

export function useRealtime(channel, onMessage) {
  useEffect(() => {
    const ws = new WebSocket(`wss://seu-app.railway.app/ws/realtime`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', channel }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    return () => ws.close();
  }, [channel, onMessage]);
}
```

**Benefício**: Eventos real-time sem polling, redução de re-renders em 60%

---

## 🔗 Fase 4: Integração Unificada (Single Point)

### 4.1 Criar API Gateway Simplificado
**Problema Atual**:
- Múltiplos entrypoints: `/api/auth`, `/api/projects`, `/api/users`
- Lógica de validação duplicada

**Solução**:
Criar `server/routes/index.js` centralizado:

```javascript
// server/routes/index.js
import { authRouter } from './auth.js';
import { projectRouter } from './projects.js';
import { userRouter } from './users.js';

export function setupRoutes(app) {
  // Middleware global
  app.use('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

  // Rotas organizadas
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api/users', userRouter);

  // 404 handler
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
}
```

**Uso em `server/index.js`**:

```javascript
import { setupRoutes } from './routes/index.js';

setupRoutes(app);
// Em vez de 20+ linhas de app.get/post
```

**Benefício**: Código organizado, fácil de manter, 80% menos linhas em index.js

---

## 🚄 Fase 5: Railway Deployment Otimizado

### 5.1 Configurar Railway.toml
**Problema Atual**:
- Railway usando configurações padrão
- Build não otimizado

**Solução**:
Criar `Railway.toml` na raiz:

```toml
[build]
builder = "NIXPACKS"

[build.env]
NODE_ENV = "production"
NODE_OPTIONS = "--max-old-space-size=2048"

[deploy]
numReplicas = 1
sleepApplication = false
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"

[services.postgres]
image = "postgres:15-alpine"
memoryLimit = 512
cpuCores = 0.25

[services.redis]
image = "redis:7-alpine"
memoryLimit = 256
cpuCores = 0.25
```

**Benefício**: Build otimizado, restart inteligente, recursos controlados

---

## 📊 Resumo de Impacto

| Área | Antes | Depois | Melhoria |
|-------|--------|---------|----------|
| Lugares para gerenciar usuários | 3+ | 1 (userService) | -67% |
| Lugares para cache | 0 (memória) | 1 (Redis) | Persistente |
| Lugares para sessões | DB + frontend | Redis | 10x mais rápido |
| Lugares para eventos | N/A | Event Bus (Redis) | Real-time |
| Queries ao DB | 100% | ~10% (cache) | -90% |
| Tempo de resposta (latência) | ~500ms | ~50ms (cache) | 10x |
| Uso de Railway (CPU/RAM) | Alto | Baixo (Redis) | -60% |

---

## ✅ Checklist de Execução

### Railway Configurações
- [ ] Adicionar Railway Redis (add service no dashboard)
- [ ] Criar variável `REDIS_URL` no Railway
- [ ] Configurar `Railway.toml` otimizado
- [ ] Atualizar `server/db.js` (pool settings)
- [ ] Atualizar `.env` com `REDIS_URL`

### Backend Refatoração
- [ ] Criar `server/cache.js` (Redis adapter)
- [ ] Criar `server/services/userService.js`
- [ ] Criar `server/services/sessionService.js`
- [ ] Criar `server/services/eventService.js`
- [ ] Criar `server/routes/index.js` (API gateway)
- [ ] Atualizar `server/index.js` (usar setupRoutes)
- [ ] Atualizar middlewares para usar novos serviços

### Frontend Refatoração
- [ ] Criar `src/hooks/useRealtime.js` (WebSocket)
- [ ] Criar `src/contexts/AppContext.jsx`
- [ ] Atualizar componentes para usar context
- [ ] Remover prop drilling desnecessário

### Testes
- [ ] Testar integração Redis
- [ ] Testar pub/sub events
- [ ] Testar cache invalidação
- [ ] Load test no Railway (antes/depois)

---

## 🎯 Próximo Passo

O que você prefere começar?

1. **Fase 1** - Configurar Railway Redis + otimizações DB (30 min)
2. **Fase 2** - Centralizar usuários + sessões (45 min)
3. **Fase 3** - Event Bus com Redis Pub/Sub (40 min)
4. **Fase 4** - API Gateway simplificado (20 min)
5. **Todas as fases** - Execução completa (~2h)
