import { authMiddleware } from './authMiddleware.js';
import userService from '../services/UserServiceSQLite.js';
import type { Request, Response, NextFunction } from 'express';

// Мокаємо UserService
jest.mock('../services/UserServiceSQLite.js');

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();
    
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    // Очищуємо всі моки перед кожним тестом
    jest.clearAllMocks();
  });

  test('should authenticate user with valid token', async () => {
    const token = 'valid-jwt-token';
    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@test.com',
      createdAt: new Date()
    };

    const mockVerifyResult = {
      success: true,
      user: mockUser
    };

    (userService.verifyToken as jest.Mock).mockResolvedValue(mockVerifyResult);

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(userService.verifyToken).toHaveBeenCalledWith(token);
    expect(mockRequest.user).toEqual({
      id: mockUser.id,
      username: mockUser.username,
      email: mockUser.email
    });
    expect(mockNext).toHaveBeenCalled();
  });

  test('should reject request without authorization header', async () => {
    mockRequest.headers = {};

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Authorization header is missing'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should reject request with malformed authorization header', async () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token-here'
    };

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Invalid authorization format. Use Bearer token'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should reject request with empty token', async () => {
    mockRequest.headers = {
      authorization: 'Bearer   '
    };

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Token is empty'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should reject request with invalid token', async () => {
    const token = 'invalid-token';
    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    const mockVerifyResult = {
      success: false,
      error: 'Невірний або прострочений токен'
    };

    (userService.verifyToken as jest.Mock).mockResolvedValue(mockVerifyResult);

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(userService.verifyToken).toHaveBeenCalledWith(token);
    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Невірний або прострочений токен'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should handle token verification errors', async () => {
    const token = 'some-token';
    mockRequest.headers = {
      authorization: `Bearer ${token}`
    };

    (userService.verifyToken as jest.Mock).mockRejectedValue(new Error('Database error'));

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'Internal server error'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should handle authorization header with extra spaces', async () => {
    const token = 'valid-jwt-token';
    mockRequest.headers = {
      authorization: `  Bearer   ${token}  `
    };

    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@test.com',
      createdAt: new Date()
    };

    const mockVerifyResult = {
      success: true,
      user: mockUser
    };

    (userService.verifyToken as jest.Mock).mockResolvedValue(mockVerifyResult);

    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(userService.verifyToken).toHaveBeenCalledWith(token);
    expect(mockNext).toHaveBeenCalled();
  });
});
