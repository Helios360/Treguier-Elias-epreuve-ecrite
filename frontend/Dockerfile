# --- Étape 1 : build du bundle React ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL de l'API injectée au build (par défaut : même origine, proxifiée par nginx)
ARG REACT_APP_API_BASE_URL=/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

RUN npm run build

# --- Étape 2 : serveur web de production ---
FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
