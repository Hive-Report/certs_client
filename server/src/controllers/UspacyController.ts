import type { Request, Response } from 'express';
import type { Logger } from 'winston';
import { UspacyService } from '../services/uspacy/UspacyService.js';

export class UspacyController {
  private readonly service: UspacyService;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.service = new UspacyService(logger);
  }

  /**
   * GET /api/uspacy/company-id?edrpou=12345678
   *
   * Returns { companyId: number } if found, or { companyId: null } if not.
   * Never throws a 500 for "not found" — only for hard errors.
   */
  async getCompanyId(req: Request, res: Response): Promise<void> {
    const edrpou = (req.query.edrpou as string | undefined)?.trim();

    if (!edrpou) {
      res.status(400).json({ error: 'edrpou query parameter is required' });
      return;
    }

    try {
      const companyId = await this.service.findCompanyIdByEdrpou(edrpou);
      res.json({ companyId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Помилка запиту до Uspacy';
      this.logger.error(`Uspacy getCompanyId error: ${message}`);
      // Return null rather than 500 so the frontend gracefully falls back
      res.json({ companyId: null });
    }
  }
}
