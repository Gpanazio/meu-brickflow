# 🚀 BrickFlow - Guia de Configuração

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- Chave da API Gemini (para Mason AI)

## Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/brickflow

# Gemini AI Configuration (OBRIGATÓRIO para Mason AI)
GEMINI_API_KEY=sua_chave_aqui
```

### 3. Obter Chave da API Gemini

O Mason AI requer uma chave válida da API Gemini para funcionar.

1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em "Get API Key" ou "Create API Key"
4. Copie a chave gerada
5. Cole no arquivo `.env` na variável `GEMINI_API_KEY`

### 4. Configurar Banco de Dados

```bash
# Conecte-se ao PostgreSQL e crie o banco
createdb brickflow

# Ou via psql:
psql -U postgres -c "CREATE DATABASE brickflow;"
```

### 5. Iniciar o Servidor

**Desenvolvimento (com hot reload):**
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run dev
```

**Ou rodar tudo junto:**
```bash
npm run dev:full
```

**Produção:**
```bash
npm run build
npm start
```

## Problemas Comuns

### Mason AI não responde ou mostra "ERRO CRÍTICO"

**Causa:** `GEMINI_API_KEY` não configurada ou inválida.

**Solução:**
1. Verifique se o arquivo `.env` existe
2. Confirme que `GEMINI_API_KEY` está preenchida com uma chave válida
3. Reinicie o servidor (`Ctrl+C` e depois `npm run server`)

**Como verificar:**
```bash
# Verifique se a variável está sendo carregada
node -e "require('dotenv').config(); console.log(process.env.GEMINI_API_KEY ? 'Configurada' : 'NÃO configurada')"
```

### Erro de conexão com banco de dados

**Causa:** `DATABASE_URL` incorreta ou banco não está rodando.

**Solução:**
1. Verifique se o PostgreSQL está rodando: `pg_isready`
2. Confirme as credenciais no `.env`
3. Teste a conexão: `psql $DATABASE_URL -c "SELECT 1;"`

### Erro de CORS em produção

**Causa:** Origem não permitida.

**Solução:**
Adicione a origem permitida no `.env`:
```env
ALLOWED_ORIGINS=https://seudominio.com,https://outro.com
```

## Variáveis de Ambiente - Referência Completa

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `DATABASE_URL` | ✅ Sim | - | URL de conexão PostgreSQL |
| `GEMINI_API_KEY` | ✅ Sim (para Mason) | - | Chave da API Gemini |
| `PORT` | ❌ Não | `3000` | Porta do servidor |
| `NODE_ENV` | ❌ Não | `development` | Ambiente (development/production) |
| `REDIS_URL` | ❌ Não | - | URL do Redis (cache opcional) |
| `ALLOWED_ORIGINS` | ❌ Não | - | Origens CORS permitidas (produção) |
| `DATABASE_SSL` | ❌ Não | `auto` | Forçar SSL no banco (true/false/auto) |

## Scripts Disponíveis

```bash
npm run dev          # Frontend (Vite)
npm run server       # Backend (Express + nodemon)
npm run dev:full     # Frontend + Backend juntos
npm run build        # Build de produção
npm start            # Servidor de produção
npm test             # Testes
npm run lint         # Linter
```

## Suporte

- 📖 Documentação: Ver README.md
- 🐛 Issues: [GitHub Issues](https://github.com/Gpanazio/meu-brickflow/issues)
- 💬 Discussões: [GitHub Discussions](https://github.com/Gpanazio/meu-brickflow/discussions)
