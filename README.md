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
