import type { Request, Response } from 'express';
import { Router } from 'express';
import { createLogger } from '../logger/index.js';
import { CertsController } from '../controllers/CertsController.js';

const certsController = new CertsController(createLogger('CertsController'));
const router = Router();

router.get('/certs/:edrpou', (req: Request, res: Response) => certsController.getCerts(req, res));

export default router;
