import type { Request, Response } from 'express';
import type { Logger } from 'winston';
import { createLogger } from '../logger/index.js';
import { CertsService } from '../services/certs/CertsService.js';

export class CertsController {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async getCerts(req: Request, res: Response): Promise<void> {
    const { edrpou } = req.params;
    if (!edrpou) {
      this.logger.error('EDRPOU is required');
      res.status(400).json({ error: 'EDRPOU is required' });
      return;
    }
    if (edrpou.length < 8) {
      this.logger.error('EDRPOU is too short');
      res.status(500).json({ error: 'EDRPOU is too short' });
      return;
    }
    this.logger.info(`Getting certs for EDRPOU: ${edrpou}`);
    const certsService = new CertsService(createLogger('CertsService'));
    try {
      const certs = await certsService.getCerts(edrpou);
      this.logger.info(`Successfully retrieved ${certs.length} certs for EDRPOU: ${edrpou}`);
      res.status(200).json(certs);
    } catch (error) {
      this.logger.error('Error fetching certs:', error);
      res.status(500).json({ error: 'Failed to fetch certs' });
    }
  }
}
