# Meu Brickflow

Projeto full-stack com frontend em Vite e backend em Express, preparado para rodar localmente e com banco no Railway.

## Requisitos

- Node.js 18+
- pnpm (recomendado) ou npm

## Instalação

Escolha **pnpm** ou **npm**:

```bash
pnpm install
```

ou

```bash
npm install
```

## Executar localmente (frontend + backend)

Para subir **frontend e backend** juntos:

```bash
npm run dev:full
```

## Build

Gere o build de produção:

```bash
npm run build
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto e defina as variáveis necessárias. Exemplo:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME"
```

### `DATABASE_URL`

- **Obrigatória** para o backend Express.
- A aplicação espera uma URL de conexão válida do PostgreSQL (por exemplo, fornecida pelo Railway).

## Proxy do Vite para `/api`

O frontend usa um proxy no `vite.config.js` para encaminhar chamadas feitas para `/api` ao backend Express durante o desenvolvimento. Isso evita problemas de CORS e mantém a mesma origem no browser.

Exemplo de uso no frontend:

```ts
fetch('/api/health')
```

O Vite redireciona essa chamada para o servidor Express configurado no proxy.

## Regras “em pedra”: Banco + Login

Esta seção descreve o **contrato** de funcionamento do Brickflow em produção (Railway) e em dev local. Se você mudar comportamento aqui, atualize também o código em `server/db.js`, `server/index.js` e o hook `src/hooks/useUsers.js`.

### Banco (Postgres / Railway)

- **Variável principal**: o backend usa `DATABASE_URL` (Railway) como string de conexão do Postgres.
- **Fallback opcional**: se a URL interna (`*.railway.internal`) der timeout, o backend pode cair para `DATABASE_URL_FALLBACK` (normalmente a URL pública `*.proxy.rlwy.net`).
- **SSL (regra determinística)**
  - Host `*.railway.internal` → SSL **INATIVO** (rede interna).
  - Host `*.proxy.rlwy.net` e hosts remotos → SSL **ATIVO**.
  - Override manual via `DATABASE_SSL=true|false|auto`.
- **Logs esperados ao subir**: o servidor imprime `Host`, `Ambiente` e `SSL` na inicialização do banco para facilitar debug.

### Login (Sessão)

- **Cookie de sessão**: `bf_session` (HttpOnly, `SameSite=Lax`). Em produção, `Secure` só é aplicado quando a requisição está em HTTPS (via `x-forwarded-proto`).
- **Persistência**: sessões ficam na tabela `brickflow_sessions` e expiram em ~30 dias.
- **Fluxo do frontend** (resumo):
  - `/api/health` confirma que o backend e o banco respondem.
  - `/api/auth/me` retorna `{ user: null }` se não houver sessão válida.
  - `/api/auth/login` valida credenciais e cria sessão.
  - `/api/auth/logout` remove a sessão.

### Usuários (fonte de verdade)

- A fonte de verdade de usuários é a tabela `master_users` no Postgres.
- O frontend **nunca** deve receber hash de senha (`password_hash`).
- O usuário `Gabriel` é garantido como `owner` (admin) no bootstrap do backend.

### Variáveis de ambiente (produção)

- `DATABASE_URL` (**obrigatória**) — conexão Postgres.
- `DATABASE_SSL` (opcional; default `auto`) — força SSL `true|false`.
- `DATABASE_URL_FALLBACK` (opcional) — URL alternativa caso a interna dê timeout.
