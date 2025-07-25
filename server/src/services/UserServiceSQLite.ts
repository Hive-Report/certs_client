import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import logger from '../logger/index.js';
import path from 'path';
import fs from 'fs';

interface UserData {
  username: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
}

interface UserResponse {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

export class UserService {
  private readonly db: Database.Database;
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = config.JWT_SECRET;
  private static readonly JWT_EXPIRES_IN = '24h';

  constructor() {
    try {
      // Створюємо директорію для бази даних, якщо вона не існує
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Створюємо базу даних в папці проекту
      const dbPath = path.join(dataDir, 'users.db');
      logger.info('Database path:', dbPath);
      
      this.db = new Database(dbPath);
      
      // Ініціалізуємо таблицю користувачів
      this.initializeDatabase();
    } catch (error) {
      logger.error('Error initializing database:', error);
      throw error;
    }
  }

  private initializeDatabase(): void {
    // Створюємо таблицю користувачів
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Створюємо індекси для швидкого пошуку
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_email ON users(email);
    `);

    logger.info('Database initialized successfully');
  }

  // Валідація даних реєстрації
  private validateRegistrationData(userData: UserData): Joi.ValidationResult {
    const schema = Joi.object({
      username: Joi.string().min(3).max(50).required().messages({
        'string.min': 'Ім\'я користувача повинно містити щонайменше 3 символи',
        'string.max': 'Ім\'я користувача не повинно перевищувати 50 символів',
        'any.required': 'Ім\'я користувача є обов\'язковим'
      }),
      email: Joi.string().email().required().custom((value, helpers) => {
        const allowedDomains = config.ALLOWED_EMAIL_DOMAINS?.split(',') ?? [];
        const emailDomain = value.split('@')[1];
        
        if (!allowedDomains.includes(emailDomain)) {
          return helpers.error('string.domain', { 
            allowedDomains: allowedDomains.join(', ') 
          });
        }
        
        return value;
      }).messages({
        'string.email': 'Невірний формат електронної пошти',
        'string.domain': 'Реєстрація не дозволена.',
        'any.required': 'Електронна пошта є обов\'язковою'
      }),
      password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
        'string.min': 'Пароль повинен містити щонайменше 8 символів',
        'string.pattern.base': 'Пароль повинен містити щонайменше одну велику літеру, одну малу літеру та одну цифру',
        'any.required': 'Пароль є обов\'язковим'
      })
    });

    return schema.validate(userData);
  }

  // Валідація даних логіну
  private validateLoginData(loginData: LoginData): Joi.ValidationResult {
    const schema = Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'Невірний формат електронної пошти',
        'any.required': 'Електронна пошта є обов\'язковою'
      }),
      password: Joi.string().required().messages({
        'any.required': 'Пароль є обов\'язковим'
      })
    });

    return schema.validate(loginData);
  }

  // Генерація JWT токена
  private generateJWTToken(user: User): string {
    return jwt.sign(
      { 
        id: user.id.toString(), 
        username: user.username,
        email: user.email 
      },
      UserService.JWT_SECRET,
      { expiresIn: UserService.JWT_EXPIRES_IN }
    );
  }

  // Форматування користувача для відповіді
  private formatUserResponse(user: User): UserResponse {
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      createdAt: new Date(user.created_at)
    };
  }

  // Створення демо користувачів
  async initializeDemoUsers(): Promise<void> {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
      const result = stmt.get() as { count: number };
      
      if (result.count > 0) {
        logger.info('Demo users already exist');
        return;
      }

      const demoUsers = [
        {
          username: 'admin',
          email: 'admin@hive.report',
          password: 'Admin123'
        },
        {
          username: 'user',
          email: 'user@hive.report',
          password: 'User123'
        }
      ];

      for (const userData of demoUsers) {
        await this.register(userData);
      }

      logger.info('Demo users created successfully');
    } catch (error) {
      logger.error('Error initializing demo users:', error);
    }
  }

  // Реєстрація нового користувача
  async register(userData: UserData): Promise<{ success: boolean; user?: UserResponse; token?: string; error?: string; details?: Joi.ValidationErrorItem[] }> {
    try {
      // Валідація вхідних даних
      const validation = this.validateRegistrationData(userData);
      if (validation.error) {
        return {
          success: false,
          error: 'Помилка валідації даних',
          details: validation.error.details
        };
      }

      // Нормалізація email
      const normalizedEmail = userData.email.toLowerCase();

      // Перевірка на існування користувача
      const checkStmt = this.db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
      const existingUser = checkStmt.get(userData.username, normalizedEmail) as User | undefined;

      if (existingUser) {
        return {
          success: false,
          error: existingUser.username === userData.username 
            ? 'Користувач з таким ім\'ям вже існує'
            : 'Користувач з такою електронною поштою вже існує'
        };
      }

      // Хешування пароля
      const hashedPassword = await bcrypt.hash(userData.password, UserService.SALT_ROUNDS);

      // Створення нового користувача
      const insertStmt = this.db.prepare(`
        INSERT INTO users (username, email, password)
        VALUES (?, ?, ?)
      `);

      const result = insertStmt.run(userData.username, normalizedEmail, hashedPassword);
      
      // Отримання створеного користувача
      const getUserStmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const newUser = getUserStmt.get(result.lastInsertRowid) as User;

      // Генерація токена
      const token = this.generateJWTToken(newUser);

      logger.info(`User registered successfully: ${newUser.username}`);

      return {
        success: true,
        user: this.formatUserResponse(newUser),
        token
      };

    } catch (error) {
      logger.error('Registration error:', error);
      return {
        success: false,
        error: 'Помилка сервера при реєстрації'
      };
    }
  }

  // Авторизація користувача
  async login(loginData: LoginData): Promise<{ success: boolean; user?: UserResponse; token?: string; error?: string; details?: Joi.ValidationErrorItem[] }> {
    try {
      logger.info('Login attempt for email:', loginData.email);
      
      // Валідація вхідних даних
      const validation = this.validateLoginData(loginData);
      if (validation.error) {
        logger.error('Login validation error:', validation.error);
        return {
          success: false,
          error: 'Помилка валідації даних',
          details: validation.error.details
        };
      }

      // Нормалізація email і пошук користувача
      const normalizedEmail = loginData.email.toLowerCase();
      logger.info('Looking for user with email:', normalizedEmail);
      
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
      const user = stmt.get(normalizedEmail) as User | undefined;
      
      logger.info('User found:', user ? 'yes' : 'no');
      
      if (!user) {
        return {
          success: false,
          error: 'Невірна електронна пошта або пароль'
        };
      }

      // Перевірка пароля
      const isValidPassword = await bcrypt.compare(loginData.password, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Невірне ім\'я користувача або пароль'
        };
      }

      // Генерація токена
      const token = this.generateJWTToken(user);

      logger.info(`User logged in successfully: ${user.username}`);

      return {
        success: true,
        user: this.formatUserResponse(user),
        token
      };

    } catch (error) {
      logger.error('Login error:', error);
      return {
        success: false,
        error: 'Помилка сервера при авторизації'
      };
    }
  }

  // Верифікація JWT токена
  verifyToken(token: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const decoded = jwt.verify(token, UserService.JWT_SECRET) as { id: string; username: string; email: string };
      
      // Отримання користувача з бази даних
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(parseInt(decoded.id)) as User | undefined;
      
      if (!user) {
        return Promise.resolve({
          success: false,
          error: 'Користувач не знайдений'
        });
      }

      return Promise.resolve({
        success: true,
        user: this.formatUserResponse(user)
      });

    } catch (error) {
      logger.error('Token verification error:', error);
      return Promise.resolve({
        success: false,
        error: 'Невірний або прострочений токен'
      });
    }
  }

  // Отримання профілю користувача
  getUserProfile(userId: string): Promise<{ success: boolean; user?: UserResponse; error?: string }> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(parseInt(userId)) as User | undefined;
      
      if (!user) {
        return Promise.resolve({
          success: false,
          error: 'Користувач не знайдений'
        });
      }

      return Promise.resolve({
        success: true,
        user: this.formatUserResponse(user)
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      return Promise.resolve({
        success: false,
        error: 'Помилка при отриманні профілю'
      });
    }
  }

  // Закриття з'єднання з базою
  close(): void {
    this.db.close();
  }
}

export default new UserService();
