/**
 * Швидкі тести валідації системи безпеки
 */
import { UserService } from './services/UserServiceSQLite.js';
import fs from 'fs';
import path from 'path';

describe('Security Validation Tests', () => {
  let userService: UserService;

  beforeEach(() => {
    // Створюємо новий екземпляр для кожного тесту
    const testDbPath = path.join(process.cwd(), 'data', `security_test_${Date.now()}.db`);
    
    // Очищуємо якщо існує
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Встановлюємо унікальну тестову базу
    process.env.DB_PATH = testDbPath;
    
    userService = new UserService();
  });

  afterEach(() => {
    if (userService) {
      userService.close();
    }
    // Очистимо environment
    delete process.env.DB_PATH;
  });

  test('Password validation - should reject weak passwords', async () => {
    const result = await userService.register({
      username: 'testuser3',
      email: 'test3@test.com',
      password: 'weak'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Помилка валідації даних');
  });

  test('Authentication - should login with valid credentials', async () => {
    // Спочатку реєструємо користувача
    const email = `valid_${Date.now()}@test.com`;
    await userService.register({
      username: `validuser_${Date.now()}`,
      email: email,
      password: 'TestPass123'
    });

    const loginResult = await userService.login({
      email: email,
      password: 'TestPass123'
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
  });

  test('Authentication - should reject invalid credentials', async () => {
    // Спочатку реєструємо користувача
    const email = `invalid_${Date.now()}@test.com`;
    await userService.register({
      username: `invaliduser_${Date.now()}`,
      email: email,
      password: 'TestPass123'
    });

    const loginResult = await userService.login({
      email: email,
      password: 'WrongPassword'
    });

    expect(loginResult.success).toBe(false);
  });

  test('Token verification - should work with valid tokens', async () => {
    // Спочатку реєструємо користувача
    const email = `tokenuser_${Date.now()}@test.com`;
    await userService.register({
      username: `tokenuser_${Date.now()}`,
      email: email,
      password: 'TestPass123'
    });

    const loginResult = await userService.login({
      email: email,
      password: 'TestPass123'
    });

    if (loginResult.token) {
      const verifyResult = await userService.verifyToken(loginResult.token);
      expect(verifyResult.success).toBe(true);
    }
  });

  test('Token verification - should reject invalid tokens', async () => {
    const verifyResult = await userService.verifyToken('invalid.token.here');
    expect(verifyResult.success).toBe(false);
  });
});
