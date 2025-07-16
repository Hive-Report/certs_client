# Використовуємо офіційний Node.js образ
FROM node:18-alpine

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо файли конфігурації
COPY package*.json ./
COPY tsconfig.json ./

# Встановлюємо залежності
RUN npm ci --only=production

# Копіюємо весь код
COPY . .

# Компілюємо TypeScript
RUN npm run build

# Створюємо користувача для безпеки
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Створюємо директорію для логів
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Змінюємо користувача
USER nodejs

# Відкриваємо порт
EXPOSE 3001

# Команда для запуску
CMD ["node", "dist/index.js"]
