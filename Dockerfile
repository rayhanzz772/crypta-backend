FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "npx sequelize db:migrate && npm run start"]
