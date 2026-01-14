# Plano de Execução - Correção de Problemas Estruturais

## 🎯 Objetivo
Corrigir problemas estruturais no App.jsx que causam erros de build, focando em manter a lógica atual mas com estrutura JSX correta.

---

## 📋 Problemas Identificados

### 1. Tags Descasadas
**Erro**: `ERROR: Unexpected closing "main" tag does not match opening "div" tag`
**Linha**: ~388, ~480
**Causa**: Tags `</div>` e `</main>` não estão sendo fechados na ordem correta

### 2. Destrutura JSX Quebrada
**Arquivo**: `src/App.jsx`
**Problema**: Componentes estão fora da estrutura `<div>` principal

**Estrutura Atual (problemática)**:
```jsx
<div>
  <main>
    {/* Modals */}
  </main>
    
    {/* Componentes */}
    <CreateProjectModal x3 /> {/* DUPLICADO */}
    <GlobalSearch />
</div>
```

**Estrutura Correta**:
```jsx
return (
  <div>
    <main>
      {/* Modais */}
    </main>
    
    {/* Componentes */}
    <GlobalSearch />
  </div>
)
```

---

## 🎯 Plano de Ação

### Passo 1: Analisar App.jsx Atual
**Arquivo**: `src/App.jsx`
- Ler linhas 400-500 para entender onde estão os componentes
- Identificar onde estão sendo renderizados
- Planejar a reestruturação correta

### Passo 2: Reestruturar JSX
**Objetivo**: Fechar com que todos os componentes estejam dentro da `<div>` principal
- Remover componentes duplicados (CreateProjectModal x3)

### Passo 3: Testar Build
**Objetivo**: Garantir que build não tem erros
- Rodar `npm run build`
- Verificar se há erros remanescentes

### Passo 4: Revisar Uso de Context
**Objetivo**: Verificar se componentes estão importando `useApp()` corretamente
- Verificar se `currentView` e `setCurrentView` estão sendo usados
- Ajustar props quebram destruturados

### Passo 5: Testar Funcionalidade
**Objetivo**: Garantir que navegação, modais e busca continuam funcionando
- Abrir projeto, buscar itens, criar tarefas
- Verificar se `currentUser` e `projects` estão sincronizados com contexto

---

## 🔧 Passo 1: Analisar Estrutura Atual

Vou ler App.jsx completo para entender a estrutura atual antes de fazer mudanças.