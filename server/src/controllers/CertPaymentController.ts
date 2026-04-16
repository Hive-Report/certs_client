import type { Request, Response } from 'express';
import type { Logger } from 'winston';
import { SuzsPaymentService } from '../services/suzs/SuzsPaymentService.js';

export class CertPaymentController {
  private readonly service: SuzsPaymentService;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.service = new SuzsPaymentService(logger);
  }

  async searchPayments(req: Request, res: Response): Promise<void> {
    const { dateStart, dateEnd, edrpou, naznachenie, updateDateStart, updateDateEnd, certDateStart, certDateEnd } = req.query as Record<string, string>;

    if (!dateStart || !dateEnd) {
      res.status(400).json({ error: 'dateStart та dateEnd є обовʼязковими параметрами' });
      return;
    }

    try {
      this.logger.info(`Payment search: ${dateStart} – ${dateEnd}, edrpou=${edrpou ?? ''}, nazn=${naznachenie ?? ''}`);
      const result = await this.service.searchPayments({
        dateStart,
        dateEnd,
        edrpou,
        naznachenie,
        updateDateStart,
        updateDateEnd,
        certDateStart,
        certDateEnd,
      });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Помилка при пошуку оплат';
      this.logger.error(`Payment search error: ${message}`);
      res.status(500).json({ error: message });
    }
  }
}
