FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Code applicatif — copié au nom de `node` : un fichier laissé en 600 côté hôte
# (ce que `COPY` conserve) deviendrait illisible pour l'utilisateur non-root.
COPY --chown=node:node . .

ENV NODE_ENV=production
EXPOSE 8000

USER node

CMD ["node", "server.js"]
