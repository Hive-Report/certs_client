# === Етап 1: Збірка ===
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY . .

RUN npm ci
RUN npm run build

# === Етап 2: Продакшн ===
FROM node:18-alpine

WORKDIR /app

# Лише продакшн-залежності
COPY package*.json ./
RUN npm ci --only=production

# Копіюємо зібраний код
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/logs ./logs

# Створення користувача
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]
