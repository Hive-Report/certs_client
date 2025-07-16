import type { Request, Response } from 'express';
import userService from '../services/UserServiceSQLite.js';
import logger from '../logger/index.js';

export class AuthController {
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
          error: 'Username and password are required' 
        });
        return;
      }

      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ 
          error: 'Username and password are required' 
        });
        return;
      }

      const result = await userService.login({ username, password });

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
      const user = (req as any).user;
      
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
