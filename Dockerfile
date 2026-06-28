FROM node:18-alpine

WORKDIR /app

# Install build tools required for native modules (argon2, bcrypt)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "npx sequelize db:migrate && npx sequelize db:seed:all || true && npm run start"]
