import type { Logger } from 'winston';
import { config } from '../../config.js';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  companyId: number | null;
  expiresAt: number;
}

const COMPANY_CACHE_TTL = 5 * 60 * 1000; // 5 min — company IDs don't change often

// ─────────────────────────────────────────────────────────────────────────────

export class UspacyService {
  private readonly logger: Logger;

  /** Bearer token (Uspacy calls it "refreshToken" but uses it for all requests) */
  private token: string = '';
  private tokenExpiresAt: number = 0;
  /** Scheduled auto-refresh timer */
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /** Per-EDRPOU cache of resolved company IDs */
  private readonly cache = new Map<string, CacheEntry>();

  private get baseUrl(): string {
    return `https://${config.USPACY_SPACE}.uspacy.ua`;
  }

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // ── Token management ──────────────────────────────────────────────────────

  private async signIn(): Promise<void> {
    this.logger.info('Uspacy: signing in');
    const url = `${this.baseUrl}/auth/v1/auth/sign_in`;
    const res = await axios.post(url, {
      email:    config.USPACY_EMAIL,
      password: config.USPACY_PASSWORD,
    }, {
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      timeout: 10_000,
    });

    this.applyToken(res.data.refreshToken, res.data.expireInSeconds);
    this.logger.info('Uspacy: signed in successfully');
  }

  private async refreshToken(): Promise<void> {
    this.logger.info('Uspacy: refreshing token');
    try {
      const url = `${this.baseUrl}/auth/v1/auth/refresh_token`;
      const res = await axios.post(url, undefined, {
        headers: {
          accept:        'application/json',
          authorization: `Bearer ${this.token}`,
        },
        timeout: 10_000,
      });
      this.applyToken(res.data.refreshToken, res.data.expireInSeconds);
      this.logger.info('Uspacy: token refreshed');
    } catch (err) {
      this.logger.warn('Uspacy: token refresh failed, re-signing in');
      await this.signIn();
    }
  }

  private applyToken(token: string, expireInSeconds: number): void {
    this.token = token;
    // Refresh 30 seconds before actual expiry
    const refreshInMs = Math.max((expireInSeconds - 30) * 1000, 60_000);
    this.tokenExpiresAt = Date.now() + expireInSeconds * 1000;

    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch(e =>
        this.logger.error(`Uspacy background refresh error: ${e.message}`)
      );
    }, refreshInMs);

    // Prevent the timer from keeping the process alive
    if (this.refreshTimer.unref) this.refreshTimer.unref();
  }

  private isTokenValid(): boolean {
    return !!this.token && Date.now() < this.tokenExpiresAt - 5_000;
  }

  private async ensureToken(): Promise<void> {
    if (!this.isTokenValid()) await this.signIn();
  }

  // ── Company search ────────────────────────────────────────────────────────

  /**
   * Find the first Uspacy CRM company whose EDRPOU field (`uf_crm_1632905074`)
   * matches the given code. Uses the CRM companies filter endpoint with a
   * `like` operator so it works whether the field stores plain text or HTML.
   *
   * Returns the numeric company ID, or null if nothing was found.
   */
  async findCompanyIdByEdrpou(edrpou: string): Promise<number | null> {
    const key = edrpou.trim();

    // Cache hit
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.info(`Uspacy cache HIT for edrpou=${key} → id=${cached.companyId}`);
      return cached.companyId;
    }

    await this.ensureToken();

    const url = `${this.baseUrl}/crm/v1/entities/companies/`;
    const res = await axios.get(url, {
      headers: {
        accept:        'application/json',
        authorization: `Bearer ${this.token}`,
      },
      params: {
        page:                               1,
        list:                               20,
        'sort_by[created_at]':              'desc',
        'table_fields[]':                   'id',
        'filters[filters][0][field]':       'uf_crm_1632905074',
        'filters[filters][0][operator]':    'like',
        'filters[filters][0][values]':      key,
      },
      timeout: 10_000,
    });

    // Response shape: { data: [{ id: 9987, ... }], meta: { ... } }
    const companies: Array<{ id: number }> = res.data?.data ?? [];
    const companyId = companies.length > 0 ? (companies[0].id ?? null) : null;

    this.cache.set(key, { companyId, expiresAt: Date.now() + COMPANY_CACHE_TTL });
    this.logger.info(`Uspacy search edrpou=${key} → id=${companyId}`);
    return companyId;
  }
}
