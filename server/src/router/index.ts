import { Router, Request, Response } from 'express';
import { createLogger } from '../logger/index.js';
import { CertsController } from '../controllers/CertsController.js';

const certsController = new CertsController(createLogger('CertsController'));
const router = Router();

router.post('/certs', (req: Request, res: Response) => certsController.parseCerts(req, res));

export default router;