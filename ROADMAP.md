# Roadmap e To-Do List do Projeto BrickFlow

Este documento centraliza todas as tarefas, melhorias e funcionalidades planejadas para o projeto.
*Última atualização: 15/01/2026*

---

## 🎨 Design System & UI (Prioridade Imediata)

### Padronização Tipográfica (BRICK Typography)
- [ ] **Ajustar Títulos (Inter Black):**
    - [ ] Aplicar `Inter Black` (-0.05em tracking) em todos os títulos de marketing e cabeçalhos principais.
    - [ ] Remover fontes serifadas ou outras variações não autorizadas.
- [ ] **Ajustar Texto de Apoio (Inter Light/Regular):**
    - [ ] Usar `Inter Light (300)` ou `Regular (400)` para textos corridos e descrições.
- [ ] **Ajustar Dados Técnicos (JetBrains Mono):**
    - [ ] Garantir que legendas, numerações, códigos e dados técnicos usem EXCLUSIVAMENTE `JetBrains Mono`.
    - [ ] Onde: Metadados de arquivos, datas, IDs, contadores.
- [ ] **Atualizar CSS Global (`App.css`):**
    - [ ] Definir classes utilitárias `.font-brick-title`, `.font-brick-body`, `.font-brick-mono`.

---

## 🚀 Em Progresso

### 📂 Feature: Pastas Virtuais na Aba Arquivos
*Status: Planejamento Concluído / Pronto para Implementar*

- [ ] **Decisões de Design:**
    - [ ] Definir se terá aninhamento infinito ou apenas 1 nível.
    - [ ] Definir se terá seletor de cores para pastas.
- [ ] **Backend / Modelo de Dados:**
    - [ ] Atualizar `useFiles.js` para suportar estrutura de pastas (`folderId` nos arquivos, array de `folders`).
- [ ] **UI - Componentes Novos:**
    - [ ] Criar `FolderCard.jsx` (Visualização de pasta no grid).
    - [ ] Criar `FolderBreadcrumb.jsx` (Navegação: Raiz > Pasta A > Pasta B).
    - [ ] Criar `CreateFolderModal.jsx` (Criar/Renomear pastas).
- [ ] **UI - Integração em `LegacyBoard.jsx`:**
    - [ ] Adicionar Breadcrumb acima dos filtros.
    - [ ] Renderizar pastas antes dos arquivos no grid.
    - [ ] Implementar Drag & Drop (Arquivo -> Pasta).
    - [ ] Adicionar botão "Nova Pasta".

---

## 🐛 Bugs Conhecidos

### 1. Inconsistência de Autenticação
*Impacto: Médio | Risco: Bugs sutis de estado*
- [ ] Unificar lógica de login/logout. Atualmente dividida entre `AppContext` e `useUsers`. Centralizar em um único hook ou contexto.

---

## 🔧 Refatoração e Dívida Técnica

### 1. `LegacyModal.jsx` Gigante
*Tamanho atual: ~650 linhas*
- [ ] Extrair `TaskModalContent` (Formulário de tarefa).
- [ ] Extrair `TaskComments` (Área de comentários).
- [ ] Extrair `TaskActivity` (Log de atividades).
- [ ] Extrair `ProjectModalContent` (Formulário de projeto).

### 2. `App.jsx` Gigante
*Tamanho atual: ~800 linhas*
- [ ] Mover lógica de Drag & Drop para hook `useBoardDragAndDrop`.
- [ ] Mover lógica de ações de tarefa (save, delete, move) para `useTaskActions`.

---

## 🔮 Backlog de Features (Futuro)

### Notificações
- [ ] Expandir WebSocket para suportar notificações em tempo real.
- [ ] Notificar quando usuário for mencionado (`@usuario`) em comentários.

### Histórico de Tarefas
- [ ] Criar sistema de versionamento para tarefas (quem mudou o que e quando).
- [ ] Interface para visualizar e restaurar versões anteriores.

### Power User Features
- [ ] **Labels Personalizáveis:** Permitir criar/editar nomes das labels de cor.
- [ ] **Modo Offline / PWA:** Cache local para acesso sem internet.
- [ ] **Exportação:** Gerar PDF ou JSON de projetos inteiros.
- [ ] **Lembretes de Prazo:** Emails ou push notifications para tarefas vencendo.

---

## ✅ Concluído Recentemente

### Bugs e Correções
- [x] **Mobile Fix:** Responsividade da barra de filtros e header no mobile.
- [x] **Files:** `useFiles.jsx` renomeado para `.js`.
- [x] **Files:** Fallback para `handleFileDrop` undefined.
- [x] **WebSocket:** Implementado backoff exponencial na reconexão.
- [x] **Visualização:** Comentários e Atividades agora usam nome do usuário real (não mais 'admin').
- [x] **Limpeza:** Removidos arquivos de backup e logs da raiz do repositório.

### Features Entregues
- [x] **Filtros Avançados (Arquivos):** Busca por nome, filtro por tipo (IMG, PDF, DOC, VIDEO) e ordenação.
