import type { Request, Response } from 'express';
import type { Logger } from 'winston';
import { createLogger } from '../logger/index.js';
import { MedocService } from '../services/medoc/MedocService.js';
import { DealerService } from '../services/medoc/DealerService.js';

export class MedocController {
  private readonly logger: Logger;
  private readonly dealerService: DealerService;

  constructor(logger: Logger) {
    this.logger = logger;
    this.dealerService = new DealerService(createLogger('DealerService'));
  }

  async getLicenses(req: Request, res: Response): Promise<void> {
    const { edrpou } = req.params;

    if (!edrpou) {
      res.status(400).json({ error: 'EDRPOU is required' });
      return;
    }
    if (edrpou.length < 8) {
      res.status(400).json({ error: 'EDRPOU is too short' });
      return;
    }

    this.logger.info(`Getting MedDoc licenses for EDRPOU: ${edrpou}`);
    const medocService = new MedocService(createLogger('MedocService'));

    try {
      const licenses = await medocService.getLicenses(edrpou);
      this.logger.info(
        `Successfully retrieved ${licenses.length} license modules for EDRPOU: ${edrpou}`,
      );
      res.status(200).json(licenses);
    } catch (error) {
      this.logger.error('Error fetching MedDoc licenses:', error);
      res.status(500).json({ error: 'Failed to fetch MedDoc licenses' });
    }
  }

  async getDealer(req: Request, res: Response): Promise<void> {
    const { edrpou } = req.params;

    if (!edrpou || edrpou.length < 8) {
      res.status(400).json({ error: 'EDRPOU is required (min 8 chars)' });
      return;
    }

    try {
      const dealer = await this.dealerService.getDealerName(edrpou);
      res.status(200).json({ dealer });
    } catch (error) {
      this.logger.error('Error fetching dealer info:', error);
      res.status(500).json({ error: 'Failed to fetch dealer info' });
    }
  }
}
