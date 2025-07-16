# Сервіс Пошуку Сертифікатів

Веб-додаток для пошуку та управління сертифікатами електронного підпису за ЄДРПОУ.

## 🏗️ Архітектура

- **Frontend**: React + Tailwind CSS
- **Backend**: Node.js + TypeScript + Express
- **Containerization**: Docker + Docker Compose

## 📋 Вимоги

- Docker >= 20.10
- Docker Compose >= 1.29

## 🚀 Швидкий старт

### 1. Клонування репозиторію

```bash
git clone <repository-url>
cd certs_client
```

### 2. Запуск з Docker Compose

#### Linux/macOS:
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Windows:
```cmd
deploy.bat
```

#### Або вручну:
```bash
docker-compose up --build
```

### 3. Доступ до сервісів

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 📁 Структура проєкту

```
certs_client/
├── certs-view-client/          # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── SearchCerts.jsx
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── server/                     # Node.js Backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── router/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml
├── deploy.sh
├── deploy.bat
└── README.md
```

## 🔧 Розробка

### Локальна розробка без Docker

#### Frontend:
```bash
cd certs-view-client
npm install
npm start
```

#### Backend:
```bash
cd server
npm install
npm run dev
```

### Збірка окремих сервісів

#### Frontend:
```bash
cd certs-view-client
docker build -t certs-frontend .
docker run -p 3000:80 certs-frontend
```

#### Backend:
```bash
cd server
docker build -t certs-backend .
docker run -p 3001:3001 certs-backend
```

## 🛠️ Налаштування

### Environment Variables

#### Frontend (.env):
```
REACT_APP_API_URL=http://localhost:3001
```

#### Backend (.env):
```
NODE_ENV=production
PORT=3001
```

### Nginx Configuration

Конфігурація nginx знаходиться у `certs-view-client/nginx.conf`:
- Проксі для API запитів на backend
- Кешування статичних ресурсів
- Налаштування безпеки
- Gzip стиснення

## 📝 API Endpoints

### Пошук сертифікатів
```
GET /api/certs/:edrpou
```

**Параметри:**
- `edrpou`: ЄДРПОУ організації

**Відповідь:**
```json
[
  {
    "serial": "1234567890",
    "name": "Назва сертифікату",
    "start_date": "2024-01-01",
    "end_date": "2025-01-01",
    "type": "Тип сертифікату",
    "storage_type": "Тип зберігання",
    "crypt": "Криптографія",
    "status": "active"
  }
]
```

## 🔍 Функціональність

### Frontend:
- 🔍 Пошук за ЄДРПОУ
- 📊 Таблиця з сертифікатами
- 🔧 Налаштування стовпців
- 🎛️ Фільтри (текстові, за датами)
- 📋 Копіювання даних
- 📱 Респонсивний дизайн

### Backend:
- 🔌 RESTful API
- 📝 Логування
- 🔒 Обробка помилок
- ⚡ TypeScript

## 🐛 Відлагодження

### Перегляд логів:
```bash
docker-compose logs -f
```

### Перегляд логів окремого сервісу:
```bash
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Зупинка сервісів:
```bash
docker-compose down
```

### Видалення контейнерів та образів:
```bash
docker-compose down --rmi all --volumes
```

## 🚀 Деплой

### Production Build:
```bash
# Збірка для продакшну
docker-compose -f docker-compose.yml build

# Запуск в продакшні
docker-compose -f docker-compose.yml up -d
```

### Моніторинг:
```bash
# Статус контейнерів
docker-compose ps

# Використання ресурсів
docker stats
```

## 📚 Технології

- **React 19**: UI фреймворк
- **Tailwind CSS**: Стилізація
- **Node.js 18**: Backend runtime
- **TypeScript**: Типізація
- **Express**: Web framework
- **Docker**: Контейнеризація
- **Nginx**: Reverse proxy

## 🤝 Внесок

1. Fork репозиторій
2. Створіть feature branch
3. Commit зміни
4. Push до branch
5. Створіть Pull Request

## 📄 Ліцензія

MIT License
