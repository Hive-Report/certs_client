import type { Request, Response, NextFunction } from 'express';
import userService from '../services/UserServiceSQLite.js';
import logger from '../logger/index.js';

// Розширюємо Request interface для користувача
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware для перевірки JWT токена
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Отримуємо токен з заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing' });
      return;
    }
    
    // Обрізаємо пробіли з початку і кінця
    const trimmedHeader = authHeader.trim();
    
    if (!trimmedHeader.startsWith('Bearer')) {
      res.status(401).json({ error: 'Invalid authorization format. Use Bearer token' });
      return;
    }

    // Перевіряємо чи є пробіл після Bearer і витягуємо токен
    if (trimmedHeader.length === 6) { // "Bearer" має 6 символів
      res.status(401).json({ error: 'Token is empty' });
      return;
    }

    if (trimmedHeader.charAt(6) !== ' ') {
      res.status(401).json({ error: 'Invalid authorization format. Use Bearer token' });
      return;
    }

    const token = trimmedHeader.substring(7).trim(); // Видаляємо "Bearer " і обрізаємо пробіли
        
    if (!token) {
      res.status(401).json({ error: 'Token is empty' });
      return;
    }
    
    const result = await userService.verifyToken(token);
    
    if (result.success && result.user) {
      // Додаємо користувача до запиту
      req.user = {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email
      };
      next();
    } else {
      res.status(401).json({ error: result.error ?? 'Invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware для перевірки ролей (приклад для майбутнього розширення)
 */
export const requireRole = (_roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Тут можна додати логіку перевірки ролей
    // Наразі просто пропускаємо
    next();
  };
};
