FROM node:20-alpine

WORKDIR /app

# El lockfile válido del proyecto es yarn.lock (package-lock.json está desactualizado)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . .

EXPOSE 3000

CMD ["yarn", "dev"]
