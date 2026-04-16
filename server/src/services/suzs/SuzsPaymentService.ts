import type { Logger } from 'winston';
import type { SuzsPayment, SuzsPaymentResult } from '../../types.js';
import { config } from '../../config.js';
import axios from 'axios';

const SUZS_URL = 'https://cert.suzs.info/ru/dealer-payments/';

const HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  'Referer': SUZS_URL,
};

export class SuzsPaymentService {
  private readonly logger: Logger;
  /** In-memory session cookies — reused across requests */
  private sessionCookies: string = '';
  private sessionExpiry: number = 0;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // ── Authentication ────────────────────────────────────────────────────────

  private async authenticate(): Promise<void> {
    this.logger.info('Authenticating to cert.suzs.info');
    const payload = `email=${encodeURIComponent(config.SUZS_EMAIL)}&password=${encodeURIComponent(config.SUZS_PASSWORD)}`;

    const response = await axios.post(SUZS_URL, payload, {
      headers: HEADERS,
      maxRedirects: 5,
      withCredentials: true,
      responseType: 'arraybuffer',
      timeout: 15_000,
    });

    // Extract Set-Cookie headers
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      this.sessionCookies = cookies.map((c: string) => c.split(';')[0]).join('; ');
    }
    // Session valid for 30 minutes
    this.sessionExpiry = Date.now() + 30 * 60 * 1000;
    this.logger.info('SUZS authentication successful');
  }

  private isSessionValid(): boolean {
    return !!this.sessionCookies && Date.now() < this.sessionExpiry;
  }

  private async ensureSession(): Promise<void> {
    if (!this.isSessionValid()) {
      await this.authenticate();
    }
  }

  // ── HTML parsing ──────────────────────────────────────────────────────────

  /** Normalize a Ukrainian/European number string to a JS float.
   *  Handles spaces and &nbsp; as thousands separator, comma as decimal.
   *  Examples: "9 565 498,12" → 9565498.12 | "534,00" → 534.00
   */
  private parseSum(raw: string): number {
    // Replace &nbsp; and regular spaces (thousands separators), then swap comma→dot
    const normalized = raw
      .replace(/&nbsp;/g, '')
      .replace(/\s/g, '')
      .replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }

  /** Format a float as "9 565 498.12" (space-separated thousands, dot decimal) */
  private formatSum(value: number): string {
    return value.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private parsePayments(html: string): SuzsPaymentResult {
    const payments: SuzsPayment[] = [];

    // Find <table class="text1">
    const tableMatch = html.match(/<table[^>]+class=text1[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) return { payments, summary: { count: 0, total_sum: '0.00' } };

    const tableHtml = tableMatch[1];

    // Extract all rows with class=flag1 cells
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      const cells: string[] = [];

      const cellRegex = /<td[^>]*class=flag1[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        // Strip HTML tags, decode entities, trim
        const text = cellMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(text);
      }

      if (cells.length >= 8) {
        payments.push({
          edrpou:        cells[0],
          name:          cells[1],
          sum:           cells[2],
          used_sum:      cells[3],
          date:          cells[4],
          credited_date: cells[5],
          purpose:       cells[6],
          cert_until:    cells[7],
        });
      }
    }

    // Calculate total sum from individual payment rows (most reliable approach).
    // The HTML summary may use &nbsp; as thousands separator which can trip up
    // simple regexes, so we sum the already-parsed cell values instead.
    const totalFromRows = payments.reduce((acc, p) => acc + this.parseSum(p.sum), 0);

    // Attempt to read record count from the summary section; fall back to row count.
    const countMatch = html.match(/К-СТЬ ЗАПИСІВ[\s\S]*?<b>(\d+)<\/b>/i);

    return {
      payments,
      summary: {
        count:     countMatch ? parseInt(countMatch[1], 10) : payments.length,
        total_sum: this.formatSum(totalFromRows),
      },
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async searchPayments(params: {
    dateStart:    string;  // DD.MM.YYYY
    dateEnd:      string;  // DD.MM.YYYY
    edrpou?:      string;
    naznachenie?: string;
    updateDateStart?: string;
    updateDateEnd?:   string;
    certDateStart?:   string;
    certDateEnd?:     string;
  }): Promise<SuzsPaymentResult> {
    await this.ensureSession();

    const doRequest = async (): Promise<SuzsPaymentResult> => {
      const payload = [
        `PaysDateStart=${encodeURIComponent(params.dateStart)}`,
        `PaysDateEnd=${encodeURIComponent(params.dateEnd)}`,
        `Naznachenie=${encodeURIComponent(params.naznachenie ?? '')}`,
        `UpdateDateStart=${encodeURIComponent(params.updateDateStart ?? '')}`,
        `UpdateDateEnd=${encodeURIComponent(params.updateDateEnd ?? '')}`,
        `EnterpriseEdrpo=${encodeURIComponent(params.edrpou ?? '')}`,
        `certDateStart=${encodeURIComponent(params.certDateStart ?? '')}`,
        `certDateEnd=${encodeURIComponent(params.certDateEnd ?? '')}`,
        `sert_edrpo=%7Bsert_edrpo%7D`,
        `search=%CF%CE%D8%D3%CA`,  // "ПОШУК" in Windows-1251
      ].join('&');

      const response = await axios.post(SUZS_URL, payload, {
        headers: {
          ...HEADERS,
          Cookie: this.sessionCookies,
        },
        responseType: 'arraybuffer',
        timeout: 20_000,
      });

      const html = new TextDecoder('windows-1251').decode(Buffer.from(response.data));
      return this.parsePayments(html);
    };

    try {
      return await doRequest();
    } catch (err) {
      // Re-authenticate once and retry
      this.logger.warn('SUZS payment request failed, re-authenticating...');
      await this.authenticate();
      return doRequest();
    }
  }
}
