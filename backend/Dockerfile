FROM node:20-alpine

WORKDIR /app

# Dépendances (cache de couche)
COPY package*.json ./
RUN npm ci --omit=dev

# Code applicatif
COPY . .

# Répertoire de logs accessible à l'utilisateur non-root
RUN mkdir -p /app/logs && chown node:node /app/logs

ENV NODE_ENV=production
EXPOSE 5000

# Exécution en utilisateur non privilégié
USER node

CMD ["node", "server.js"]
