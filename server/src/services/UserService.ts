import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import type { User, UserRegistration, UserLogin, AuthResponse, JWTPayload } from '../types.js';
import logger from '../logger/index.js';
import { config } from '../config.js';

// Тимчасове сховище користувачів (в реальному проєкті - база даних)
const users: User[] = [];
let userIdCounter = 1;

// Валідація схем
const registrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    })
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

export class UserService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = config.JWT_SECRET ?? 'your-super-secret-jwt-key-change-in-production';
  private static readonly JWT_EXPIRES_IN = '24h';

  /**
   * Реєстрація нового користувача
   */
  static async register(userData: UserRegistration): Promise<AuthResponse> {
    try {
      // Валідація вхідних даних
      const { error } = registrationSchema.validate(userData);
      if (error) {
        return {
          success: false,
          error: error.details[0].message
        };
      }

      // Перевірка на існування користувача
      const existingUser = users.find(u => 
        u.username === userData.username || u.email === userData.email
      );
      
      if (existingUser) {
        return {
          success: false,
          error: 'User with this username or email already exists'
        };
      }

      // Хешування паролю
      const passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS);

      // Створення користувача
      const newUser: User = {
        id: userIdCounter++,
        username: userData.username,
        email: userData.email,
        passwordHash,
        createdAt: new Date()
      };

      users.push(newUser);

      // Генерація JWT токена
      const token = this.generateJWTToken(newUser);

      logger.info(`User registered successfully: ${newUser.username}`);

      return {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        },
        token
      };

    } catch (error) {
      logger.error('Registration error:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Авторизація користувача
   */
  static async login(credentials: UserLogin): Promise<AuthResponse> {
    try {
      // Валідація вхідних даних
      const { error } = loginSchema.validate(credentials);
      if (error) {
        return {
          success: false,
          error: error.details[0].message
        };
      }

      // Пошук користувача
      const user = users.find(u => u.username === credentials.username);
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Перевірка паролю
      const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Оновлення часу останнього входу
      user.lastLogin = new Date();

      // Генерація JWT токена
      const token = this.generateJWTToken(user);

      logger.info(`User logged in successfully: ${user.username}`);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        token
      };

    } catch (error) {
      logger.error('Login error:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Верифікація JWT токена
   */
  static verifyToken(token: string): { success: boolean; user?: { id: number; username: string; email: string }; error?: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      
      // Перевірка існування користувача
      const user = users.find(u => u.id === decoded.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };

    } catch (error) {
      logger.error('Token verification error:', error);
      return {
        success: false,
        error: 'Invalid token'
      };
    }
  }

  /**
   * Генерація JWT токена
   */
  private static generateJWTToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      username: user.username,
      email: user.email
    };

    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
  }

  /**
   * Отримання всіх користувачів (для адміністрування)
   */
  static getAllUsers(): Omit<User, 'passwordHash'>[] {
    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }));
  }

  /**
   * Видалення користувача
   */
  static deleteUser(userId: number): boolean {
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users.splice(index, 1);
      logger.info(`User deleted: ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * Створення демо користувачів (тільки для розробки)
   */
  static async createDemoUsers(): Promise<void> {
    if (users.length === 0) {
      await this.register({
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin123!'
      });

      await this.register({
        username: 'user',
        email: 'user@example.com',
        password: 'User123!'
      });

      logger.info('Demo users created');
    }
  }
}
