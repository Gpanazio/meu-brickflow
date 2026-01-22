# Arquitetura Refatorada - BrickFlow V2

Realizei uma reestruturação completa do sistema para atender aos objetivos de escalabilidade e segurança.

## Mudanças Principais

### 1. Banco de Dados Relacional (PostgreSQL) 🗄️
Substituímos o "blob" JSON monolítico por tabelas relacionais reais.
- **Tabelas Criadas:** `projects`, `sub_projects`, `lists`, `cards`, `project_members`.
- **Benefício:** Permite edição simultânea sem conflitos e queries eficientes.
- **Migração:** Um script (`server/scripts/migrate_to_relational.js`) foi criado e executado para transferir seus dados antigos.

### 2. API Granular (V2) ⚙️
Nova camada de API em `/api/v2/`.
- **Rotas:**
    - `GET /api/v2/projects` (Lista de projetos)
    - `GET /api/v2/subprojects/:id` (Dados do quadro kanban)
    - `POST /api/v2/tasks` (Criar tarefa)
    - `PUT /api/v2/tasks/:id/move` (Mover tarefa)
- **Benefício:** O frontend agora carrega apenas o que precisa, tornando a navegação instantânea.

### 3. Frontend Moderno com React Router ⚛️
O `App.jsx` foi refatorado para usar rotas reais.
- **URLs Amigáveis:**
    - `/` (Home)
    - `/project/:id` (Visão do Projeto)
    - `/project/:id/area/:areaId` (Quadro Kanban)
- **Lazy Loading:** Componentes pesados são carregados sob demanda.

## Como Testar

1.  **Reinicie o Servidor:**
    Como houve mudanças nas rotas do backend, é crucial reiniciar o processo Node.
    ```bash
    npm run server
    ```

2.  **Acesse o App:**
    Navegue pelo browser. Tente criar tarefas, movê-las entre colunas e trocar de projetos. A URL deve mudar conforme você navega.

## Próximos Passos (Sugestões)
- **Otimistic UI Refinement:** A interface atualiza rapidamente, mas pode ser melhorada com rollback em caso de erro.
- **Mobile Support:** Verificar se o Drag & Drop funciona perfeitamente no novo componente BoardPage em telas touch.
