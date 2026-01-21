# Reestruturação do BrickFlow

## Nova Arquitetura

### 1. Estrutura de Dados
```javascript
{
  projects: [
    {
      id: 'brick-adm',
      name: 'BRICK - ADM',
      description: 'Administração e gestão interna',
      color: 'red',
      isProtected: true,
      password: 'Brick$2025-FGL',
      lists: [...] // listas específicas do projeto
    },
    {
      id: 'originais-brick',
      name: 'ORIGINAIS BRICK',
      description: 'Projetos originais da marca',
      color: 'blue',
      isProtected: false,
      lists: [...]
    },
    {
      id: 'comunicacao-brick',
      name: 'COMUNICAÇÃO BRICK',
      description: 'Marketing e comunicação',
      color: 'green',
      isProtected: false,
      lists: [...]
    }
  ],
  currentProject: null,
  authenticatedProjects: [] // IDs dos projetos autenticados na sessão
}
```

### 2. Componentes Necessários
- ProjectsView: Página inicial com lista de projetos
- ProjectCard: Card individual de cada projeto
- ProjectView: Visualização das listas de um projeto específico
- PasswordModal: Modal para autenticação de projetos protegidos
- ProjectForm: Formulário para criar novos projetos
- QuickLookModal: Visualizador universal (Imagens, PDF, Metadados)

### 3. Navegação
- Página inicial: Lista de projetos
- Clique no projeto: Entra no projeto (com autenticação se necessário)
- Botão "Voltar": Retorna à página inicial
- Botão "Novo Projeto": Cria novo projeto

### 4. Autenticação
- Projetos protegidos exigem senha
- Senha válida por sessão (localStorage)
- Logout automático ao fechar navegador

### 5. Melhorias Futuras
- Integrar suporte a usuários e permissões diferentes (ex.: admin, editor, leitor).
- Persistir dados em um banco remoto (ex.: Supabase) para sincronização em tempo real.
- Adicionar testes de integração para garantir a comunicação entre os componentes principais.

---

## Contrato de Banco e Autenticação (produção)

Esta seção define o comportamento esperado do Brickflow em produção (Railway) e o que **não pode** mudar sem quebrar login/sessão.

### Banco (Railway Postgres)

- **Conexão**: `server/db.js` lê `DATABASE_URL` (Railway). Opcionalmente pode usar `DATABASE_URL_FALLBACK` se a conexão interna sofrer timeout.
- **SSL por hostname** (regra de ouro):
  - `*.railway.internal` → SSL **INATIVO**.
  - `*.proxy.rlwy.net` / hosts remotos → SSL **ATIVO**.
  - Override manual: `DATABASE_SSL=true|false|auto`.
- **Observabilidade**: o backend loga `Host`, `Ambiente` e `SSL` na inicialização.

### Tabelas

- `master_users`: fonte de verdade de usuários.
  - Campos usados pelo app: `id (uuid)`, `username`, `name`, `email`, `password_hash`, `created_at`.
  - Campos adicionais suportados: `role`, `avatar`, `color`.
  - **Nunca** retornar `password_hash` para o frontend.
- `brickflow_sessions`: sessões de login.
  - `id` (session id), `user_id` (username), `expires_at`.
- `brickflow_state`: estado do app (projetos/boards/etc). Não é a fonte de verdade de usuários.

### Cache e Performance (Railway Redis)
- **Redis**: Usado para cache de queries de banco, sessões e real-time events.
- **Fallback**: Caso o Redis falhe, o sistema alterna automaticamente para um `memory-fallback`.
- **Compressão**: Todas as rotas de API e arquivos estáticos são comprimidos via Gzip.

### Sessão (cookie)

- Cookie: `bf_session`.
- Flags: `HttpOnly`, `SameSite=Lax`, `Secure` apenas quando `NODE_ENV=production` e a requisição é HTTPS.
- Expiração: ~30 dias.

### Endpoints de autenticação

- `GET /api/health`: saúde do backend + DB.
- `GET /api/auth/me`: retorna `{ user: null }` se não autenticado.
- `POST /api/auth/login`: valida credenciais e cria sessão.
- `POST /api/auth/logout`: encerra sessão.

### Regra do usuário "Gabriel"

- O backend garante que exista um usuário `Gabriel` e que ele tenha papel `owner` (admin).
- Usuários com papel `owner` podem gerenciar novos usuários (CRUD) via endpoints admin.

---

## Mason AI Assistant

O Mason é um assistente virtual integrado ao BrickFlow com personalidade inspirada no HAL 9000.

### Arquitetura

```
Frontend (MasonFloating.jsx)
    ↓ POST /api/mason/chat
Backend (routes/mason.js)
    ↓ processMessage()
MasonService (services/masonService.js)
    ↓ Gemini API + Function Calling
Database (brickflow_state)
    ↓ eventService.publish()
React (useRealtime) ← Atualização automática
```

### Ferramentas Disponíveis

| Ferramenta | Tipo | Descrição |
|------------|------|-----------|
| `list_projects` | Leitura | Lista todos os projetos |
| `get_project_details` | Leitura | Detalhes de projeto com tarefas |
| `create_project` | Mutação | Cria novo projeto |
| `create_subproject` | Mutação | Cria área em projeto existente |
| `create_task` | Mutação | Cria tarefa em coluna |
| `update_task` | Mutação | Atualiza título/descrição |
| `move_task` | Mutação | Move tarefa entre colunas |
| `delete_task` | Mutação | Remove tarefa permanentemente |

### Contexto Injetado

A cada mensagem, o frontend envia `clientContext`:
- `view`: home, project, subproject, trash
- `projectId` / `projectName`: Projeto ativo
- `subProjectId` / `subProjectName`: Área ativa
- `user`: Nome do usuário

### Personalidade (HAL MODE)

- **Tom:** Calmo, educado, ligeiramente perturbador
- **Frases:** "Posso confirmar...", "Receio que...", "Entendido..."
- **Idioma:** Português (PT-BR) como padrão
- **Proibições:** Não repete slogans, não usa emojis
