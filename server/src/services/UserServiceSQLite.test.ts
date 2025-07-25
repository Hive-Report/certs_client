import { UserService } from './UserServiceSQLite';
import path from 'path';
import fs from 'fs';

describe('UserServiceSQLite (integration, test DB)', () => {
  let userService: UserService;
  const testDbPath = path.join(process.cwd(), 'data', 'test_users.db');

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    userService = new UserService();
  });

  afterAll(() => {
    userService.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  beforeEach(() => {
    userService.clearTestData();
  });

  it('registers a new user', async () => {
    const result = await userService.register({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Test1234'
    });
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.user?.username).toBe('testuser');
  });

  it('does not register duplicate username/email', async () => {
    await userService.register({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Test1234'
    });
    const result = await userService.register({
      username: 'testuser',
      email: 'other@example.com',
      password: 'Test1234'
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/існує/);
  });

  it('logs in a registered user', async () => {
    await userService.register({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Test1234'
    });
    const result = await userService.login({
      email: 'testuser@example.com',
      password: 'Test1234'
    });
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
  });

  it('fails login with wrong password', async () => {
    await userService.register({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Test1234'
    });
    const result = await userService.login({
      email: 'testuser@example.com',
      password: 'WrongPass1'
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/пароль/);
  });

  it('verifies token for registered user', async () => {
    const reg = await userService.register({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Test1234'
    });
    const verify = await userService.verifyToken(reg.token!);
    expect(verify.success).toBe(true);
    expect(verify.user?.username).toBe('testuser');
  });

  it('gets user profile by id', async () => {
    const reg = await userService.register({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Test1234'
    });
    const profile = await userService.getUserProfile(reg.user!.id);
    expect(profile.success).toBe(true);
    expect(profile.user?.username).toBe('testuser');
  });

  it('returns error for non-existent user profile', async () => {
    const profile = await userService.getUserProfile('9999');
    expect(profile.success).toBe(false);
    expect(profile.error).toMatch(/не знайдений/);
  });
});
