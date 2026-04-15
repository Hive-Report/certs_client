import type { Request, Response } from 'express';
import type { Logger } from 'winston';
import { createLogger } from '../logger/index.js';
import { CertsService } from '../services/certs/CertsService.js';
import { SuzsService } from '../services/suzs/SuzsService.js';

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
    const suzsService = new SuzsService(createLogger('SuzsService'));
    try {
      const [certsResult, suzsResult] = await Promise.allSettled([
        certsService.getCerts(edrpou),
        suzsService.getRegistrations(edrpou),
      ]);

      if (certsResult.status === 'rejected') {
        this.logger.error('Error fetching certs:', certsResult.reason);
        res.status(500).json({ error: 'Failed to fetch certs' });
        return;
      }

      const certs = certsResult.value;
      const suzsMap = suzsResult.status === 'fulfilled' ? suzsResult.value : new Map();

      for (const cert of certs) {
        const normalizedName = (cert.name || '').trim().toUpperCase().replace(/\s+/g, ' ');
        const reg = suzsMap.get(normalizedName);
        if (reg) {
          Object.assign(cert, {
            ipn: reg.ipn,
            admin_reg: reg.admin_reg,
            email: reg.email,
            phone: reg.phone,
            address: reg.address,
            city: reg.city,
          });
        }
      }

      this.logger.info(`Successfully retrieved ${certs.length} certs for EDRPOU: ${edrpou}`);
      res.status(200).json(certs);
    } catch (error) {
      this.logger.error('Error fetching certs:', error);
      res.status(500).json({ error: 'Failed to fetch certs' });
    }
  }
}
