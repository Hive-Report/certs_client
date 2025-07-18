import type { Request, Response } from 'express';
import userService from '../services/UserServiceSQLite.js';
import logger from '../logger/index.js';

export class AuthController {
  private static readonly loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCK_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

  /**
   * Перевірка спроб логіну
   */
  private static checkLoginAttempts(email: string): boolean {
    const now = Date.now();
    const attempts = this.loginAttempts.get(email);

    if (attempts) {
      // Якщо пройшов час блокування, скидаємо лічильник
      if (now - attempts.lastAttempt > this.LOCK_TIME) {
        this.loginAttempts.delete(email);
        return true;
      }

      // Якщо перевищено ліміт спроб
      if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
        return false;
      }
    }

    return true;
  }

  /**
   * Оновлення лічильника спроб логіну
   */
  private static updateLoginAttempts(email: string): void {
    const attempts = this.loginAttempts.get(email);
    
    if (attempts) {
      attempts.count += 1;
      attempts.lastAttempt = Date.now();
    } else {
      this.loginAttempts.set(email, { count: 1, lastAttempt: Date.now() });
    }
  }

  /**
   * Реєстрація нового користувача
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Перевірка на наявність body
      if (!req.body) {
        res.status(400).json({ 
          error: 'Registration data is required' 
        });
        return;
      }

      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({ 
          error: 'Username, email, and password are required' 
        });
        return;
      }

      const result = await userService.register({ username, email, password });

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Авторизація користувача
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Перевірка на наявність body
      if (!req.body) {
        res.status(400).json({ 
          error: 'Email and password are required' 
        });
        return;
      }

      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ 
          error: 'Email and password are required' 
        });
        return;
      }

      // Перевірка на кількість спроб логіну
      if (!this.checkLoginAttempts(email)) {
        res.status(429).json({ 
          error: 'Too many login attempts. Please try again later.' 
        });
        return;
      }

      // Валідація даних
      if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ 
          error: 'Invalid data format' 
        });
        return;
      }

      // Валідація email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ 
          error: 'Invalid email format' 
        });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ 
          error: 'Password must be at least 8 characters' 
        });
        return;
      }

      const result = await userService.login({ email, password });

      if (result.success) {
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Логаут користувача
   */
  static logout(req: Request, res: Response): void {
    try {
      // В JWT системі logout відбувається на клієнті (видалення токена)
      // Тут можна додати логіку для blacklist токенів
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Верифікація JWT токена
   */
  static async verify(req: Request, res: Response): Promise<void> {
    try {
      // Перевірка на наявність body
      if (!req.body) {
        res.status(401).json({ error: 'Token is required' });
        return;
      }

      const { token } = req.body;

      if (!token) {
        res.status(401).json({ error: 'Token is required' });
        return;
      }

      const result = await userService.verifyToken(token);

      if (result.success) {
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      logger.error('Token verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Отримання профілю користувача
   */
  static getProfile(req: Request, res: Response): void {
    try {
      // Middleware має встановити user в req
      const user = req.user;
      
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
