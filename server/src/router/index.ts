import type { Request, Response } from 'express';
import { Router } from 'express';
import { createLogger } from '../logger/index.js';
import { CertsController } from '../controllers/CertsController.js';
import { AuthController } from '../controllers/AuthController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const certsController = new CertsController(createLogger('CertsController'));
const authController = new AuthController();
const router = Router();

// Публічні маршрути (без авторизації)
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.post('/auth/logout', (req, res) => authController.logout(req, res));
router.post('/auth/verify', (req, res) => authController.verify(req, res));

// Захищені маршрути (з авторизацією)
router.get('/auth/profile', authMiddleware, (req, res) => authController.getProfile(req, res));
router.get('/certs/:edrpou', authMiddleware, (req: Request, res: Response) => certsController.getCerts(req, res));

export default router;
