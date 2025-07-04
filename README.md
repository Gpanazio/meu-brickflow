# 🧱 BrickFlow - Deploy Simplificado

## 🚀 Como Hospedar (SUPER FÁCIL)

### 1. Configurar Supabase
Antes de fazer o deploy, configure estas variáveis no Netlify:

```
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### 2. Deploy no Netlify
- Faça upload deste repositório no GitHub
- Conecte com Netlify
- Configure as variáveis acima
- Deploy automático!

### 3. Configurações do Build
- **Build command:** `npm run build`
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
npm install

# Executar em desenvolvimento
npm run dev

# Fazer build para produção
npm run build

# Preview do build
npm run preview
```

## 🛡️ Segurança

Este projeto está configurado com:
- ✅ HTTPS automático
- ✅ Headers de segurança
- ✅ Cache otimizado
- ✅ Redirecionamentos SPA

## 📞 Suporte

Se precisar de ajuda, verifique:
1. Se as variáveis do Supabase estão corretas
2. Se o build está passando no Netlify
3. Se não há erros no console do navegador

---

**Versão:** 2.0  
**Última atualização:** 30/06/2025  
**Compatível com:** Netlify, Vercel, GitHub Pages

