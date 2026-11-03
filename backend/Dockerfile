FROM node:20-alpine

WORKDIR /app

# Dépendances (cache de couche)
COPY package*.json ./
RUN npm ci --omit=dev

# Code applicatif — copié au nom de `node` : un fichier laissé en 600 côté hôte
# (ce que `COPY` conserve) deviendrait illisible pour l'utilisateur non-root.
COPY --chown=node:node . .

# Répertoire de logs accessible à l'utilisateur non-root
RUN mkdir -p /app/logs && chown node:node /app/logs

ENV NODE_ENV=production
EXPOSE 5000

# Exécution en utilisateur non privilégié
USER node

CMD ["node", "server.js"]
