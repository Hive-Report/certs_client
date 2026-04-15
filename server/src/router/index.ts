import type { Request, Response } from 'express';
import { Router } from 'express';
import { createLogger } from '../logger/index.js';
import { CertsController } from '../controllers/CertsController.js';
import { MedocController } from '../controllers/MedocController.js';
import { googleAuth } from '../controllers/GoogleAuthController.js';
import { combinedAuthMiddleware } from '../middleware/combinedAuthMiddleware.js';

const certsController = new CertsController(createLogger('CertsController'));
const medocController = new MedocController(createLogger('MedocController'));
const router = Router();

router.post('/auth/google', googleAuth);

// Захищені маршрути.
// combinedAuthMiddleware приймає як backend JWT (7 днів), так і Google ID Token —
// це забезпечує зворотну сумісність для сторонніх клієнтів.
router.get('/certs/:edrpou', combinedAuthMiddleware, (req: Request, res: Response) => certsController.getCerts(req, res));
router.get('/medoc/:edrpou', combinedAuthMiddleware, (req: Request, res: Response) => medocController.getLicenses(req, res));

export default router;
