import type { Request, Response } from 'express';
import { Router } from 'express';
import { createLogger } from '../logger/index.js';
import { CertsController } from '../controllers/CertsController.js';
import { AuthController } from '../controllers/AuthController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const certsController = new CertsController(createLogger('CertsController'));
const router = Router();

// Публічні маршрути (без авторизації)
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', AuthController.logout);
router.post('/auth/verify', AuthController.verify);

// Захищені маршрути (з авторизацією)
router.get('/auth/profile', authMiddleware, AuthController.getProfile);
router.get('/certs/:edrpou', authMiddleware, (req: Request, res: Response) => certsController.getCerts(req, res));

export default router;
