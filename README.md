# BrickFlow

Sistema de gestão de projetos com interface Brutalist e arquitetura moderna.

![Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![Stack](https://img.shields.io/badge/Vite-5-646CFF?logo=vite) ![Stack](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js) ![Stack](https://img.shields.io/badge/PostgreSQL-Railway-4169E1?logo=postgresql)

---

## ✨ Features

### 📋 Gestão de Projetos
- **Kanban & Lista:** Visualizações alternáveis para organização de tarefas
- **Subprojetos:** Hierarquia flexível para grandes projetos
- **Drag & Drop:** Reorganização intuitiva de tarefas e colunas
- **Busca Global:** `Cmd+K` para navegar instantaneamente

### 📁 Central de Arquivos
- **Upload até 50MB** com preview em tempo real
- **QuickLook:** Pressione `Espaço` para visualizar arquivos
- **Filtros Avançados:** Busca por nome, tipo (imagem/PDF/vídeo/áudio) e ordenação
- Suporte a imagens, PDFs, áudio e vídeo

### 🎨 Design System (BRICK)
- **Tipografia:** Inter Black para títulos, JetBrains Mono para dados técnicos
- **UI Prismática:** Glassmorphism, ruído digital, efeitos de glitch
- **Componentes:** MechButton, StatusLED, PrismaticPanel
- **Animações:** Framer Motion com transições suaves

### � Segurança
- Autenticação com sessões seguras (HttpOnly cookies)
- Rate limiting por endpoint
- Validação de dados com Zod
- Proteção de headers com Helmet
- Senhas hashadas com bcrypt

---

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento (frontend + backend)
npm run dev:full

# Build de produção
npm run build
```

---

## ⚙️ Variáveis de Ambiente

```bash
DATABASE_URL="postgresql://..."        # Obrigatória
ALLOWED_ORIGINS="http://localhost:5173" # CORS whitelist
NODE_ENV="production"                   # Ativa segurança (SSL, cookies secure)
REDIS_URL="redis://..."                 # Opcional: cache persistente
```

---

## � Estrutura do Projeto

```
├── src/
│   ├── components/       # Componentes React
│   │   ├── legacy/       # LegacyBoard, LegacyModal, etc.
│   │   ├── ui/           # Componentes atômicos (MechButton, etc.)
│   │   └── modals/       # Modais de criação/edição
│   ├── hooks/            # Custom hooks (useFiles, useRealtime, etc.)
│   ├── contexts/         # AppContext (estado global)
│   └── utils/            # Helpers e constantes
├── server/
│   ├── routes/           # API endpoints
│   ├── services/         # WebSocket, cache, etc.
│   └── middleware/       # Auth, rate limiting
└── ROADMAP.md            # To-dos e planejamento
```

---

## 📖 Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [ROADMAP.md](./ROADMAP.md) | To-dos, bugs e features planejadas |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Regras de tipografia e UI |
| [ARQUITETURA.md](./ARQUITETURA.md) | Decisões arquiteturais |

---

## 🛠️ Tech Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 19, Vite 5, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, PostgreSQL |
| Infra | Railway (deploy), Redis (cache opcional) |
| UI | Radix UI, Lucide Icons, Sonner (toasts) |

---

## 📜 Licença

Projeto privado. © 2026
