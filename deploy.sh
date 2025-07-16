#!/bin/bash

# Скрипт для збірки та запуску сервісу сертифікатів

set -e

echo "🔧 Збірка сервісу сертифікатів..."

# Перевіряємо, чи існує docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не знайдено. Будь ласка, встановіть Docker Compose."
    exit 1
fi

# Зупиняємо старі контейнери
echo "🛑 Зупинка старих контейнерів..."
docker-compose down

# Збираємо образи
echo "🏗️  Збірка образів..."
docker-compose build --no-cache

# Запускаємо сервіси
echo "🚀 Запуск сервісів..."
docker-compose up -d

# Виводимо статус
echo "📊 Статус сервісів:"
docker-compose ps

echo ""
echo "✅ Сервіс успішно запущено!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:3001"
echo ""
echo "📝 Для перегляду логів: docker-compose logs -f"
echo "🛑 Для зупинки: docker-compose down"
