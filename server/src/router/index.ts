import type { Request, Response } from 'express';
import { Router } from 'express';
import { createLogger } from '../logger/index.js';
import { CertsController } from '../controllers/CertsController.js';
import { googleAuth } from '../controllers/GoogleAuthController.js';
import { googleTokenMiddleware } from '../middleware/googleTokenMiddleware.js';

const certsController = new CertsController(createLogger('CertsController'));
const router = Router();

router.post('/auth/google', googleAuth);

// Захищені маршрути (з авторизацією)
router.get('/certs/:edrpou', googleTokenMiddleware, (req: Request, res: Response) => certsController.getCerts(req, res));

export default router;
