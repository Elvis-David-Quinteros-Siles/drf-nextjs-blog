FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# React 19 RC genera conflictos de peer dependencies con algunas librerías
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
