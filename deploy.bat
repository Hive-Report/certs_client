@echo off
REM Скрипт для збірки та запуску сервісу сертифікатів

echo 🔧 Збірка сервісу сертифікатів...

REM Перевіряємо, чи існує docker-compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose не знайдено. Будь ласка, встановіть Docker Compose.
    exit /b 1
)

REM Зупиняємо старі контейнери
echo 🛑 Зупинка старих контейнерів...
docker-compose down

REM Збираємо образи
echo 🏗️  Збірка образів...
docker-compose build --no-cache

REM Запускаємо сервіси
echo 🚀 Запуск сервісів...
docker-compose up -d

REM Виводимо статус
echo 📊 Статус сервісів:
docker-compose ps

echo.
echo ✅ Сервіс успішно запущено!
echo 🌐 Frontend: http://localhost:3000
echo 🔗 Backend API: http://localhost:3001
echo.
echo 📝 Для перегляду логів: docker-compose logs -f
echo 🛑 Для зупинки: docker-compose down

pause
