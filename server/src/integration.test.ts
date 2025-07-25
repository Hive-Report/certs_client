import request from 'supertest';
import { setTimeout } from 'timers/promises';
import express from 'express';
import cors from 'cors';
import router from './router/index.js';
import fs from 'fs';
import path from 'path';

describe('API Integration Tests', () => {
  let app: express.Application;
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

  describe('Error Handling', () => {
    test('should handle malformed JSON in request body', async () => {
      await request(app)
        .post('/api/some-endpoint')
        .send('{"invalid": json}')
        .set('Content-Type', 'application/json')
        .expect(400);
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
        .options('/api/some-endpoint')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});
