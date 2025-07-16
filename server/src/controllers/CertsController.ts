import { Request, Response } from 'express';
import { Logger } from 'winston';
import { createLogger } from '../logger/index.js';
import { CertsService } from '../services/certs/CertsService.js';

export class CertsController {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  parseCerts(req: Request, res: Response) {
    const { edrpou } = req.body;
    if (!edrpou) {
      this.logger.error('EDRPOU is required');
      return res.status(400).json({ error: 'EDRPOU is required' });
    }
    this.logger.info(`Parsing certs for EDRPOU: ${edrpou}`);
    const certsService = new CertsService(createLogger('CertsService'));
    certsService
      .getCerts(edrpou)
      .then((certs) => {
        this.logger.info(`Successfully parsed ${certs.length} certs for EDRPOU: ${edrpou}`);
        res.status(200).json(certs);
      })
      .catch((error) => {
        this.logger.error('Error fetching certs:', error);
        res.status(500).json({ error: 'Failed to fetch certs' });
      });
  }
}
