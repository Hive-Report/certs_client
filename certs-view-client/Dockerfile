# Multi-stage build для React додатка
FROM node:18-alpine AS builder

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо файли конфігурації
COPY package*.json ./

# Встановлюємо залежності
RUN npm ci --only=production

# Копіюємо весь код
COPY . .

# Будуємо продакшн версію
RUN npm run build

# Production stage з nginx
FROM nginx:alpine

# Копіюємо збудований додаток
COPY --from=builder /app/build /usr/share/nginx/html

# Копіюємо конфігурацію nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Відкриваємо порт
EXPOSE 80

# Запускаємо nginx
CMD ["nginx", "-g", "daemon off;"]
