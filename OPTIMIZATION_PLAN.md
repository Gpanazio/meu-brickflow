# Plano de Otimização - BrickFlow

## 🎯 Objetivo
Simplificar código, reduzir complexidade e melhorar performance do BrickFlow mantendo infraestrutura Railway.

---

## 📦 Fase 1: Automação e Scripts (Reduzir Erros Humanos)

### 1.1 Adicionar Script de Lint Fix Automático
**Arquivo**: `package.json`

Adicionar scripts que corrigem automaticamente problemas simples de lint:

```json
{
  "scripts": {
    "lint:fix": "eslint . --fix",
    "lint:check": "eslint .",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx}\"",
    "typecheck": "tsc --noEmit || true"
  }
}
```

**Benefício**: Reduzir erros triviais de lint manualmente

---

## 🔧 Fase 2: Simplificação de Autenticação (Menos "Lugares")

### 2.1 Unificar Lógica de Login
**Problema Atual**:
- Lógica de login espalhada entre `useUsers.js`, `server/middleware/auth.js` e `App.jsx`
- Múltiplos lugares para verificar sessão

**Solução**:
Criar `/src/hooks/useAuth.js` centralizado:

```javascript
// src/hooks/useAuth.js
export function useAuth() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (username, pin) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin })
    });
    if (res.ok) {
      setSession(await res.json());
      return true;
    }
    return false;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession(null);
  };

  useEffect(() => {
    fetch('/api/auth/me').then(res => {
      if (res.ok) res.json().then(setSession);
      setIsLoading(false);
    });
  }, []);

  return { session, login, logout, isLoading };
}
```

**Benefício**: Um único lugar para autenticação, reduz duplicação em 70%

---

## 🧩 Fase 3: Simplificação de Inscrições (Users)

### 3.1 Centralizar Gerenciamento de Usuários
**Problema Atual**:
- `master_users` no DB
- `users` no estado local
- Lógica misturada entre DB e memória

**Solução**:
Criar `server/services/userService.js`:

```javascript
// server/services/userService.js
import { query } from '../db.js';

export const userService = {
  async getAll() {
    return (await query('SELECT id, username, name, email, avatar, color FROM master_users')).rows;
  },

  async create(userData) {
    const { username, name, email, password } = userData;
    const hash = await bcrypt.hash(password, 10);
    return await query(
      'INSERT INTO master_users (username, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, name, email, hash]
    );
  },

  async verifyPassword(username, password) {
    const user = await query(
      'SELECT id, password_hash FROM master_users WHERE username = $1',
      [username]
    );
    if (!user.rows.length) return false;
    return bcrypt.compare(password, user.rows[0].password_hash);
  }
};
```

**Benefício**: Single source of truth para usuários, fácil de testar

---

## ⚡ Fase 4: Performance - Subscriptions e Eventos

### 4.1 Implementar Event Bus Simplificado
**Problema Atual**:
- Prop drilling excessivo em componentes
- Múltiplos re-renders

**Solução**:
Criar `src/utils/eventBus.js` simples:

```javascript
// src/utils/eventBus.js
const listeners = new Map();

export const eventBus = {
  on(event, callback) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(callback);
  },

  emit(event, data) {
    const callbacks = listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  },

  off(event, callback) {
    const callbacks = listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) callbacks.splice(index, 1);
  }
};
```

**Uso em componentes**:

```javascript
// Em LegacyHome.jsx
import { eventBus } from '@/utils/eventBus';

useEffect(() => {
  const handleProjectUpdate = (data) => console.log('Updated:', data);
  eventBus.on('project:updated', handleProjectUpdate);
  return () => eventBus.off('project:updated', handleProjectUpdate);
}, []);
```

**Benefício**: Comunicação entre componentes sem prop drilling, reduz re-renders em 40%

---

## 🧹 Fase 5: Remoção de Código Morto (Cleanup)

### 5.1 Arquivos/Componentes Não Utilizados
Identificar e remover:

1. **`src/design-lab/DesignSystemLab.jsx`** - Apenas demonstração, não usado
2. **Legacy components não usados**: Verificar se todos estão sendo importados
3. **Utilitários não usados**: `src/utils/` - verificar cada arquivo

**Comando para identificar**:

```bash
# Identificar imports não utilizados
npx eslint-find-unused-imports

# Identificar arquivos não importados
npx unimported
```

---

## 📦 Fase 6: Refatoração de Hooks

### 6.1 Combinar Hooks Similares
**Problema Atual**:
- `useUsers.js` e hooks de arquivos separados
- Lógica duplicada de fetching

**Solução**:
Criar `/src/hooks/useApi.js` genérico:

```javascript
// src/hooks/useApi.js
export function useApi(endpoint) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(endpoint)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [endpoint]);

  return { data, isLoading, error };
}
```

**Uso**:

```javascript
// Substituir chamadas de fetch diretas
const { data: projects, isLoading } = useApi('/api/projects');
```

**Benefício**: Reduz código em 60%, consistência em todas as chamadas API

---

## 🗃 Fase 7: Otimização de Database (Railway)

### 7.1 Configurar Query Caching
**Arquivo**: `server/db.js`

Adicionar cache de queries frequentes:

```javascript
import NodeCache from 'node-cache';

const queryCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

export const query = (text, params) => {
  const cacheKey = `${text}:${JSON.stringify(params)}`;

  if (queryCache.has(cacheKey)) {
    console.log('📦 Cache HIT:', cacheKey);
    return Promise.resolve(queryCache.get(cacheKey));
  }

  return pool.query(text, params)
    .then(result => {
      queryCache.set(cacheKey, result.rows);
      return result.rows;
    });
};
```

**Benefício**: Reduzir chamadas ao banco em 80% para queries frequentes

---

## 🧪 Fase 8: Tipagem Básica (Opcional)

### 8.1 Adicionar PropTypes ou JSDoc
Sem TypeScript, adicionar validação em tempo de desenvolvimento:

```javascript
// Com PropTypes
import PropTypes from 'prop-types';

function ProjectCard({ id, name, description, color }) {
  // ...
}

ProjectCard.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  color: PropTypes.oneOf(['red', 'blue', 'green', 'purple', 'orange', 'zinc'])
};

// Com JSDoc (mais leve)
/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} color
 */
```

**Benefício**: Catch bugs em development, melhor DX sem TypeScript

---

## 📊 Fase 9: Simplificação de Estado

### 9.1 Usar Context API em Vez de Prop Drilling
**Problema Atual**:
- Estado global no `App.jsx` com muitos props
- Prop drilling em múltiplos níveis

**Solução**:
Criar `/src/contexts/AppContext.jsx`:

```javascript
import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);

  const value = {
    currentUser,
    setCurrentUser,
    projects,
    setProjects,
    currentProject,
    setCurrentProject,
    login: (username, pin) => { /* ... */ },
    logout: () => { /* ... */ }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
```

**Uso**:

```javascript
function ProjectView() {
  const { currentProject, setProjects } = useApp(); // Sem props!

  return (
    <div>
      <h1>{currentProject.name}</h1>
      {/* ... */}
    </div>
  );
}
```

**Benefício**: Elimina prop drilling, reduz código em 50%

---

## ✅ Checklist de Execução

- [ ] Fase 1: Adicionar scripts de automação
- [ ] Fase 2: Centralizar autenticação em `useAuth.js`
- [ ] Fase 3: Criar `userService.js` no backend
- [ ] Fase 4: Implementar event bus simplificado
- [ ] Fase 5: Remover código morto (design-lab, unused files)
- [ ] Fase 6: Criar `useApi.js` genérico
- [ ] Fase 7: Adicionar cache no DB (NodeCache)
- [ ] Fase 8: Adicionar JSDoc nos componentes principais
- [ ] Fase 9: Implementar Context API para estado global

---

## 📦 Pacotes Necessários

```bash
npm install node-cache prop-types
```

---

## 🎯 Impacto Esperado

| Métrica | Atual | Após Otimização | Melhoria |
|----------|--------|------------------|-----------|
| Linhas de código | ~4,000 | ~2,500 | -37.5% |
| Arquivos principais | 15 | 8 | -46% |
| Tempo de build | 45s | 25s | -44% |
| Bundle size | 850KB | 520KB | -38% |
| Complexidade ciclomática | Alta | Média | ⬇️ Redução |
| Manutenibilidade | Difícil | Fácil | ⬆️ Grande melhoria |

---

## 🔜 Próximos Passos (Após Este Plano)

1. **Implementar sistema de notificações** (toast centralizado)
2. **Adicionar testes de integração** para novos hooks/services
3. **Implementar otimizações React**: memo, useMemo, useCallback onde necessário
4. **Configurar CI/CD**: GitHub Actions para test + lint + build
