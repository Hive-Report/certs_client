# Makefile для сервісу сертифікатів

.PHONY: help build up down logs clean install dev test

# Допомога
help:
	@echo "Доступні команди:"
	@echo "  build     - Збірка всіх образів"
	@echo "  up        - Запуск сервісів"
	@echo "  down      - Зупинка сервісів"
	@echo "  logs      - Перегляд логів"
	@echo "  clean     - Очищення контейнерів та образів"
	@echo "  install   - Встановлення залежностей"
	@echo "  dev       - Запуск для розробки"
	@echo "  test      - Запуск тестів"

# Збірка образів
build:
	docker-compose build --no-cache

# Запуск сервісів
up:
	docker-compose up -d

# Зупинка сервісів
down:
	docker-compose down

# Перегляд логів
logs:
	docker-compose logs -f

# Очищення
clean:
	docker-compose down --rmi all --volumes
	docker system prune -f

# Встановлення залежностей
install:
	cd certs-view-client && npm install
	cd server && npm install

# Розробка
dev:
	docker-compose -f docker-compose.dev.yml up

# Тести
test:
	cd server && npm test
	cd certs-view-client && npm test

# Повна збірка та запуск
deploy: build up
	@echo "Сервіс запущено!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:3001"
