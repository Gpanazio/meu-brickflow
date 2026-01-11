# Usa uma imagem leve do Node
FROM node:18-alpine

# Define a pasta de trabalho
WORKDIR /app

# Copia os arquivos de configuração
COPY package.json ./

# Instala TODAS as dependências (Front e Back)
RUN npm install

# Copia todo o resto do projeto
COPY . .

# Constrói o Frontend (React -> HTML/JS estático na pasta dist)
RUN npm run build

# Expõe a porta 3000 (onde nosso servidor vai rodar)
EXPOSE 3000

# Define modo de produção
ENV NODE_ENV=production

# Comando para iniciar o servidor
CMD ["node", "server/index.js"]
