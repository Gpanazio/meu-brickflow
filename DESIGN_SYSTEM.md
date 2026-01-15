# BRICK Design System - Typography

## 🖋️ Tipografia (BRICK Typography)

A tipografia BRICK é baseada na precisão e legibilidade técnica.

### Famílias Tipográficas

#### 1. Titles & Headers
- **Font Family:** `Inter`
- **Weight:** `Black (900)`
- **Tracking:** `-0.05em` (Tight)
- **Uso:** Títulos de marketing, cabeçalhos de seções, chamadas principais.
- **Exemplo:**
  > **PAINEL DE CONTROLE**

#### 2. Body & UI
- **Font Family:** `Inter`
- **Weight:** `Light (300)` ou `Regular (400)`
- **Uso:** Textos corridos, descrições, labels de formulários.
- **Exemplo:**
  > Este é um texto de exemplo para leitura confortável em interfaces densas.

#### 3. Technical Data
- **Font Family:** `JetBrains Mono`
- **Weight:** `Regular (400)`
- **Uso:** Legendas técnicas, números, datas, IDs, código, metadados de arquivos.
- **Regra:** Jamais usar em títulos de marketing.
- **Exemplo:**
  > `V.2025.01` | `ID: #8291`

---

## 🎨 Utilização no Código

```javascript
// Exemplo de uso com Tailwind (Classes sugeridas)

// Títulos
<h1 className="font-brick-title text-4xl">DASHBOARD</h1>

// Corpo
<p className="font-brick-body text-zinc-400">Gerencie seus projetos com eficiência.</p>

// Dados Técnicos
<span className="font-brick-mono text-xs text-zinc-600">ID: 5591-A</span>
```

### Configuração Tailwind (Theme)

```javascript
theme: {
  extend: {
    fontFamily: {
      'brick-title': ['Inter', 'sans-serif'], // Weight 900, tracking -0.05em
      'brick-body': ['Inter', 'sans-serif'],  // Weight 300/400
      'brick-mono': ['JetBrains Mono', 'monospace'],
    }
  }
}
```
