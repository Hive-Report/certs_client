import type { Request, Response } from 'express';
import { Router } from 'express';
import { createLogger } from '../logger/index.js';
import { CertsController } from '../controllers/CertsController.js';
import { MedocController } from '../controllers/MedocController.js';
import { CertPaymentController } from '../controllers/CertPaymentController.js';
import { UspacyController } from '../controllers/UspacyController.js';
import { googleAuth } from '../controllers/GoogleAuthController.js';
import { combinedAuthMiddleware } from '../middleware/combinedAuthMiddleware.js';

const certsController       = new CertsController(createLogger('CertsController'));
const medocController       = new MedocController(createLogger('MedocController'));
const certPaymentController = new CertPaymentController(createLogger('CertPaymentController'));
const uspacyController      = new UspacyController(createLogger('UspacyController'));
const router = Router();

router.post('/auth/google', googleAuth);

router.get('/certs/:edrpou',        combinedAuthMiddleware, (req: Request, res: Response) => certsController.getCerts(req, res));
router.get('/medoc/:edrpou',        combinedAuthMiddleware, (req: Request, res: Response) => medocController.getLicenses(req, res));
router.get('/medoc/:edrpou/dealer', combinedAuthMiddleware, (req: Request, res: Response) => medocController.getDealer(req, res));
router.get('/cert-payments',        combinedAuthMiddleware, (req: Request, res: Response) => certPaymentController.searchPayments(req, res));
router.get('/uspacy/company-id',    combinedAuthMiddleware, (req: Request, res: Response) => uspacyController.getCompanyId(req, res));

export default router;
