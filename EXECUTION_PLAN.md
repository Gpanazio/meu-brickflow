# Plano de Execução - Otimização Railway

## 🎯 Objetivo
Implementar otimizações Railway para reduzir "lugares", melhorar performance e estabilidade.

---

## ✅ Fase 1: Configuração Railway (30 min)

### Passo 1.1: Adicionar Railway Redis
**Ação**: Dashboard Railway → Add Service → Redis
```toml
# Service configurado:
[services.redis]
image = "redis:7-alpine"
memoryLimit = 256
cpuCores = 0.25
```

### Passo 1.2: Criar variáveis no Railway
- `REDIS_URL`: URL gerada automaticamente (copiar do dashboard)
- `DATABASE_URL`: Já configurado (verificar)
- `DATABASE_SSL`: "auto"

### Passo 1.3: Atualizar Railway.toml
**Criar arquivo**: `C:\brickweb\meu-brickflow\Railway.toml`
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
```

### Passo 1.4: Instalar dependências
**Comando**:
```bash
npm install redis
npm install -D @types/redis
```

---

## ✅ Fase 2: Backend Refatoração (45 min)

### Passo 2.1: Criar Redis Cache
**Arquivo**: `server/cache.js`
- Implementar `cache.get()`, `cache.set()`, `cache.del()`
- Implementar `cache.invalidate()` com pattern

### Passo 2.2: Criar UserService
**Arquivo**: `server/services/userService.js`
- `getAll()` com cache (TTL 5min)
- `create()` → invalida cache
- `verifyLogin()` → lógica centralizada
- `findByUsername()` → busca otimizada

### Passo 2.3: Criar SessionService
**Arquivo**: `server/services/sessionService.js`
- `create(userId)` → Redis + randomUUID
- `get(sessionId)` → Redis
- `delete(sessionId)` → Redis
- TTL: 30 dias em segundos

### Passo 2.4: Criar EventService
**Arquivo**: `server/services/eventService.js`
- `publish(channel, data)` → Redis publish
- `subscribe(channel, callback)` → Redis subscriber
- Canais: PROJECT_UPDATED, TASK_CREATED, etc.

### Passo 2.5: Atualizar db.js
**Arquivo**: `server/db.js`
- `connectionTimeoutMillis`: 10000 → 30000
- `idleTimeoutMillis`: 30000 → 60000
- `max`: 20 → 15 (menos overhead)
- `min`: 3 → 3 (mínimo ativo)
- Log: `'error', 'slow'`

### Passo 2.6: Criar API Gateway
**Arquivo**: `server/routes/index.js`
- Setup centralizado de rotas
- Health check multi-camadas
- 404 handler

### Passo 2.7: Atualizar server/index.js
**Arquivo**: `server/index.js`
- Usar `setupRoutes(app)`
- Health check novo (`checkHealth()`)

---

## ✅ Fase 3: Frontend Refatoração (40 min)

### Passo 3.1: Criar AppContext
**Arquivo**: `src/contexts/AppContext.jsx`
- State: currentUser, projects, currentProject
- Actions: login, logout, setProjects
- Provider + useApp hook

### Passo 3.2: Criar useRealtime Hook
**Arquivo**: `src/hooks/useRealtime.js`
- WebSocket connection
- Subscribe to channels
- Auto-reconnect

### Passo 3.3: Atualizar LegacyHome
**Arquivo**: `src/components/legacy/LegacyHome.jsx`
- Usar `useApp()` context
- Remover prop drilling
- Usar `useRealtime()` para updates

### Passo 3.4: Atualizar App.jsx
**Arquivo**: `src/App.jsx`
- Envolver em AppProvider
- Remover state local (mover para context)
- Usar useAuth, useApp

---

## ✅ Fase 4: Testes (30 min)

### Passo 4.1: Testar Redis Cache
```bash
# Teste local
npm run dev:full

# Verificar logs:
# 📦 Cache HIT: users
# 📦 Cache MISS: users
```

### Passo 4.2: Testar Health Check
```bash
curl http://localhost:8080/api/health

# Esperado:
{
  "status": "ok",
  "timestamp": "2026-01-14T...",
  "services": {
    "database": { "status": "ok", "latency_ms": 12 },
    "cache": { "status": "ok" },
    "disk": { "status": "ok" }
  }
}
```

### Passo 4.3: Deploy Railway + Test
```bash
git add .
git commit -m "Otimização Railway: Redis cache, health check, centralização"
git push
```

---

## 📋 Checklist Final

Antes de commitar, verificar:

### Backend
- [ ] Redis conectando (logs OK)
- [ ] Cache funcionando (verificar HIT/MISS)
- [ ] Sessions em Redis (não DB)
- [ ] Eventos publicando (Redis pub/sub)
- [ ] Health check multi-camadas
- [ ] DB pool otimizado (30s timeout)
- [ ] Todas as rotas em `routes/index.js`

### Frontend
- [ ] AppContext criado e usado
- [ ] useRealtime hook funcionando
- [ ] Prop drilling removido
- [ ] Context wrapping no App.jsx

### Railway
- [ ] Redis service adicionado
- [ ] REDIS_URL variável configurada
- [ ] Railway.toml criado
- [ ] Health check ativo (/api/health)
- [ ] Logs Railway sem erros

---

## 🚀 Comandos Rápidos

```bash
# Instalar dependências
npm install redis

# Desenvolvimento local (sem Railway)
npm run dev:full

# Deploy
git add .
git commit -m "Railway optimization"
git push

# Verificar logs Railway
railway logs

# Reiniciar serviço
railway up
```

---

## ⚠️ Pontos de Atenção

1. **Redis Connection**:
   - Primeira conexão pode falhar (service starting)
   - Implementar retry com backoff exponencial

2. **Cache Invalidation**:
   - Ao criar/atualizar usuário → `cache.del('users:all')`
   - Ao criar projeto → invalidar cache de projetos

3. **WebSocket**:
   - Railway proxy pode bloquear ws://
   - Usar wss:// ou polling como fallback

4. **Railway Environment**:
   - NODE_ENV="production" obrigatório para HTTPS/cookies
   - Variáveis aparecem após rebuild

---

## 🎯 Métricas de Sucesso

Antes (Baseline):
- Latência DB: ~500ms (cold start)
- Cache: 0% (nada)
- Sessões: ~200ms (DB query)
- Re-renders: 40-50

Após (Otimização):
- Latência DB: ~50ms (cached queries)
- Cache: 90% (redis hit)
- Sessões: ~20ms (redis)
- Re-renders: 10-15

---

## 📝 Notas

- Tempo estimado: ~2.5 horas
- Dificuldade: Média
- Risco: Médio (requer Railway restart)
- Rollback: Git revert (seguro)
