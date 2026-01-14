# Meu Brickflow

Projeto full-stack com frontend em React (Vite) e backend em Node.js (Express), focado em gestão de projetos com arquitetura modular e segurança reforçada.

## 🚀 Arquitetura e Limpeza (Fase 0)

O projeto passou por uma refatoração massiva para garantir manutenibilidade:
- **Frontend Modular:** Redução de 76% no tamanho do `App.jsx`, movendo componentes para módulos especializados (`/src/components/modals`, `/src/components/views`, `/src/constants`, `/src/utils`).
- **Backend Modular:** Extração de middlewares de autenticação e helpers, reduzindo o arquivo principal em 87%.
- **Eliminação de Código Morto:** Remoção de arquivos não utilizados e correção de todos os erros de lint.

## 🛡️ Segurança (Fase 1)

Implementação de camadas de segurança robustas:
- **Validação de Dados:** Uso de `Zod` para validar todos os payloads de entrada nos endpoints de autenticação e projetos.
- **Segurança de Cabeçalhos:** Integração com `Helmet` para proteção contra ataques comuns de web.
- **Controle de Taxa (Rate Limiting):**
  - `authLimiter`: Limita tentativas de login (10 req / 15 min).
  - `apiLimiter`: Limite geral de API (100 req / 1 min).
  - `writeLimiter`: Limite para operações de escrita/salvamento (30 req / 1 min).
- **Criptografia:**
  - Senhas de usuários (`master_users`) usam `bcrypt`.
  - Senhas de projetos dentro do estado do sistema agora são hashadas no salvamento e mascaradas no retorno da API.
- **CORS:** Whitelist dinâmica via variável de ambiente `ALLOWED_ORIGINS`.

## 🔍 Busca e Acesso (Fase 3)

Melhorias na experiência de navegação e segurança de acesso:
- **Verificação de Senha:** Projetos protegidos agora exigem verificação no backend (`bcrypt`) antes de permitir o acesso.
- **Busca Global:** Atalho `Cmd+K` para busca instantânea de projetos, áreas e tarefas, com navegação automática e abertura de modais.

## 🎨 Design System e UI (Fase 4)

Refinamento completo da interface seguindo a estética "Prismática":
- **Componentes Atômicos:** `MechButton` (tátil), `MonoScramble` (terminal-style text), `StatusLED` (pulsating neon).
- **Motion System:** Transições de visualização suaves com `Framer Motion` (zoom, blur e staggers).
- **Consistência Visual:** Padronização de cores e efeitos em todo o app (Home, Header, Boards).
- **Design Lab:** Sincronizado como fonte de verdade para os componentes do sistema.

## 📦 Performance e Melhorias (Fase 2)

- **Otimização de Bundle:** Code splitting e React Lazy para carregamento sob demanda.
- **Cache de Backend:** Implementação de cache em memória para reduzir latência de leitura (TTL 60s).


## 📋 Requisitos

- Node.js 18+
- npm ou pnpm

## ⚙️ Instalação

```bash
npm install
```

## 🛠️ Executar localmente

```bash
# Frontend + Backend (Proxy configurado)
npm run dev:full
```

## 🏗️ Build de Produção

```bash
npm run build
```

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```bash
DATABASE_URL="postgresql://..." # Obrigatória
ALLOWED_ORIGINS="http://localhost:5173,https://meu-app.com" # Whitelist CORS
NODE_ENV="production" # Define comportamento de segurança (SSL/Cookies)
```

## 📜 Contrato de Funcionamento

### Banco (Postgres / Railway)
- **Primary:** `DATABASE_URL`.
- **Fallback:** `DATABASE_URL_FALLBACK` (útil se a rede interna do Railway falhar).
- **SSL:** Ativado automaticamente para conexões remotas; desativado para `localhost` e rede interna.

### Autenticação
- **Cookie:** `bf_session` (HttpOnly, SameSite=Lax, Secure em produção).
- **Tabelas:** `master_users` (usuários), `brickflow_sessions` (sessões), `brickflow_state` (estado global).

