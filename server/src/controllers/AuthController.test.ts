import { AuthController } from './AuthController.js';
import userService from '../services/UserServiceSQLite.js';
import type { Request, Response } from 'express';

// Мокаємо UserService
jest.mock('../services/UserServiceSQLite.js');

// Розширюємо типи для тестів
interface TestRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<TestRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    authController = new AuthController();
    
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    // Очищуємо всі моки перед кожним тестом
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should register user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'TestPass123'
      };

      mockRequest.body = userData;

      const mockRegisterResult = {
        success: true,
        user: { id: '1', username: 'testuser', email: 'test@test.com', createdAt: new Date() },
        token: 'mock-jwt-token'
      };

      (userService.register as jest.Mock).mockResolvedValue(mockRegisterResult);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(userService.register).toHaveBeenCalledWith(userData);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockRegisterResult);
    });

    test('should handle registration validation errors', async () => {
      const userData = {
        username: 'ab',
        email: 'invalid-email',
        password: 'weak'
      };

      mockRequest.body = userData;

      const mockRegisterResult = {
        success: false,
        error: 'Помилка валідації даних',
        details: [
          { message: 'Ім\'я користувача повинно містити щонайменше 3 символи', path: ['username'] }
        ]
      };

      (userService.register as jest.Mock).mockResolvedValue(mockRegisterResult);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(mockRegisterResult);
    });

    test('should handle duplicate user error', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'TestPass123'
      };

      mockRequest.body = userData;

      const mockRegisterResult = {
        success: false,
        error: 'Користувач з таким ім\'ям вже існує'
      };

      (userService.register as jest.Mock).mockResolvedValue(mockRegisterResult);

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(mockRegisterResult);
    });

    test('should handle server errors during registration', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'TestPass123'
      };

      (userService.register as jest.Mock).mockRejectedValue(new Error('Database error'));

      await authController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });

  describe('login', () => {
    test('should login user successfully', async () => {
      const loginData = {
        email: 'test@test.com',
        password: 'TestPass123'
      };

      mockRequest.body = loginData;

      const mockLoginResult = {
        success: true,
        user: { id: '1', username: 'testuser', email: 'test@test.com', createdAt: new Date() },
        token: 'mock-jwt-token'
      };

      (userService.login as jest.Mock).mockResolvedValue(mockLoginResult);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(userService.login).toHaveBeenCalledWith(loginData);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockLoginResult);
    });

    test('should handle invalid credentials', async () => {
      const loginData = {
        email: 'test@test.com',
        password: 'WrongPassword'
      };

      mockRequest.body = loginData;

      const mockLoginResult = {
        success: false,
        error: 'Невірна електронна пошта або пароль'
      };

      (userService.login as jest.Mock).mockResolvedValue(mockLoginResult);

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(mockLoginResult);
    });

    test('should handle server errors during login', async () => {
      mockRequest.body = {
        email: 'test@test.com',
        password: 'TestPass123'
      };

      (userService.login as jest.Mock).mockRejectedValue(new Error('Database error'));

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Database error'
      });
    });
  });

  describe('verify', () => {
    test('should verify token successfully', async () => {
      const token = 'valid-jwt-token';
      mockRequest.body = { token };
      const mockVerifyResult = {
        success: true,
        user: { id: '1', username: 'testuser', email: 'test@test.com', createdAt: new Date() }
      };
      (userService.verifyToken as jest.Mock).mockResolvedValue(mockVerifyResult);
      await authController.verify(mockRequest as Request, mockResponse as Response);
      expect(userService.verifyToken).toHaveBeenCalledWith(token);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockVerifyResult);
    });

    test('should handle invalid token', async () => {
      const token = 'invalid-token';
      mockRequest.body = { token };
      const mockVerifyResult = {
        success: false,
        error: 'Невірний або прострочений токен'
      };
      (userService.verifyToken as jest.Mock).mockResolvedValue(mockVerifyResult);
      await authController.verify(mockRequest as Request, mockResponse as Response);
      expect(userService.verifyToken).toHaveBeenCalledWith(token);
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(mockVerifyResult);
    });

    test('should handle missing token', async () => {
      mockRequest.body = {};
      await authController.verify(mockRequest as Request, mockResponse as Response);
      expect(userService.verifyToken).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Token is required' });
    });
  });

  describe('getProfile', () => {
    test('should get user profile successfully', () => {
      mockRequest.user = { id: '1', username: 'testuser', email: 'test@test.com' };

      authController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: { id: '1', username: 'testuser', email: 'test@test.com' }
      });
    });

    test('should handle missing user in request', () => {
      mockRequest.user = undefined;

      authController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unauthorized'
      });
    });

    test('should handle user not found', () => {
      mockRequest.user = { id: '999', username: 'nonexistent', email: 'none@test.com' };

      authController.getProfile(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: { id: '999', username: 'nonexistent', email: 'none@test.com' }
      });
    });
  });

  describe('logout', () => {
    test('should logout successfully', () => {
      authController.logout(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});
