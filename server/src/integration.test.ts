import request from 'supertest';
import { setTimeout } from 'timers/promises';
import express from 'express';
import cors from 'cors';
import router from './router/index.js';
import userService from './services/UserServiceSQLite.js';
import fs from 'fs';
import path from 'path';

describe('API Integration Tests', () => {
  let app: express.Application;
  let testToken: string;
  let userId: string;
  const testDbPath = path.join(process.cwd(), 'data', 'test_integration.db');

  beforeAll(() => {
    // Встановлюємо тестове середовище
    process.env.NODE_ENV = 'test';
    
    // Налаштовуємо Express app для тестів
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api', router);
  });

  afterAll(async () => {
    userService.close();
    // Дати час для закриття файлу
    await setTimeout(100);
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Спробуємо видалити тестову базу даних після закриття з'єднання
    const testDbFile = path.join(process.cwd(), 'data', 'test_users.db');
    try {
      if (fs.existsSync(testDbFile)) {
        fs.unlinkSync(testDbFile);
      }
    } catch {
      // Ігноруємо помилки видалення
    }
  });

  describe('Authentication Flow', () => {
    test('should register new user', async () => {
      // Очищуємо дані перед першим тестом
      userService.clearTestData();
      
      const userData = {
        username: 'integrationtest',
        email: 'integration@test.com',
        password: 'IntegrationTest123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);

      // Зберігаємо токен для подальших тестів
      testToken = response.body.token;
      userId = response.body.user.id;
    });

    test('should reject registration with invalid domain', async () => {
      const userData = {
        username: 'invaliduser',
        email: 'invalid@gmail.com',
        password: 'ValidPassword123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Помилка валідації даних');
      expect(response.body.details).toBeDefined();
    });

    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'integration@test.com',
        password: 'IntegrationTest123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
    });

    test('should reject login with wrong password', async () => {
      const loginData = {
        email: 'integration@test.com',
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should verify valid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: testToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({ token: 'invalid.token.here' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Protected Routes', () => {
    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
    });

    test('should reject profile request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('should reject profile request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('should reject certs request without token', async () => {
      const response = await request(app)
        .get('/api/certs/12345678')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('should handle certs request with valid token but invalid EDRPOU', async () => {
      const response = await request(app)
        .get('/api/certs/invalid')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch certs');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON in request body', async () => {
      await request(app)
        .post('/api/auth/login')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    test('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle non-existent route', async () => {
      await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });
  });

  describe('CORS and Headers', () => {
    test('should handle preflight OPTIONS request', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    test('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Content-Type Validation', () => {
    test('should require JSON content type for POST requests', async () => {
      await request(app)
        .post('/api/auth/login')
        .send('email=test@test.com&password=test')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(400);
    });

    test('should accept proper JSON content type', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'IntegrationTest123'
        })
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
