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

### 3. Navegação
- Página inicial: Lista de projetos
- Clique no projeto: Entra no projeto (com autenticação se necessário)
- Botão "Voltar": Retorna à página inicial
- Botão "Novo Projeto": Cria novo projeto

### 4. Autenticação
- Projetos protegidos exigem senha
- Senha válida por sessão (localStorage)
- Logout automático ao fechar navegador

