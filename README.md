# 🧱 BrickFlow - Deploy Simplificado

## 🚀 Como Hospedar (SUPER FÁCIL)

### 1. Configurar Supabase
Antes de fazer o deploy, crie um arquivo `.env` (ou copie `.env.example`) e configure estas variáveis no Netlify:

```
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
VITE_DEBUG_LOG=false
```
As variáveis são lidas em `src/lib/supabaseClient.js` e dentro do componente principal `LegacyApp`.
Um modelo atualizado está disponível em `.env.example`. **Não commit o arquivo `.env` com chaves reais.**

### 2. Deploy no Netlify
- Faça upload deste repositório no GitHub
- Conecte com Netlify
- Configure as variáveis acima
- Deploy automático!

### 3. Configurações do Build
- **Build command:** `pnpm run build`
- **Publish directory:** `dist`
- **Node version:** 18

## 📁 Arquivos Importantes

- `netlify.toml` - Configurações do Netlify
- `package.json` - Dependências do projeto
- `src/` - Código fonte do BrickFlow
- `dist/` - Arquivos compilados (gerados automaticamente)

## 🔧 Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Executar em desenvolvimento
pnpm run dev

# Fazer build para produção
pnpm run build

# Preview do build
pnpm run preview
```

## 🛡️ Segurança

Este projeto está configurado com:
- ✅ HTTPS automático
- ✅ Headers de segurança
- ✅ Cache otimizado
- ✅ Redirecionamentos SPA

## 💡 Sugestões de Melhorias

- Adicionar testes de ponta a ponta (E2E) para cobrir fluxos críticos do usuário.
- Configurar uma pipeline de CI/CD (por exemplo, GitHub Actions) para rodar `lint` e `test` a cada commit.
- Incluir suporte a Docker para padronizar o ambiente de desenvolvimento.
- Formalizar um guia de contribuição explicando como rodar lint, testes e quais padrões de código seguir.

## 📞 Suporte

Se precisar de ajuda, verifique:
1. Se as variáveis do Supabase estão corretas
2. Se o build está passando no Netlify
3. Se não há erros no console do navegador

---

**Versão:** 2.0  
**Última atualização:** 30/06/2025  
**Compatível com:** Netlify, Vercel, GitHub Pages

