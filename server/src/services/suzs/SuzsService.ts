import axios from 'axios';
import type { Logger } from 'winston';
import type { SuzsRegistration } from '../../types.js';

const SUZS_URL =
  'https://cert.suzs.info/ru/BestzvitpaysSert/page.htm?edrpo={edrpou}&Bestzvitpaysid=3490051&acsk=2';

function normalizeName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

function stripTags(cell: string): string {
  return cell.replace(/<[^>]+>/g, '').trim();
}

export class SuzsService {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async getRegistrations(edrpou: string): Promise<Map<string, SuzsRegistration>> {
    const url = SUZS_URL.replace('{edrpou}', encodeURIComponent(edrpou));

    let html: string;
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10_000,
      });
      html = new TextDecoder('windows-1251').decode(Buffer.from(response.data));
    } catch (err) {
      this.logger.warn(`[SuzsService] Failed to fetch suzs.info for ${edrpou}: ${err}`);
      return new Map();
    }

    try {
      return this.parseHtml(html);
    } catch (err) {
      this.logger.warn(`[SuzsService] Failed to parse suzs.info response for ${edrpou}: ${err}`);
      return new Map();
    }
  }

  private parseHtml(html: string): Map<string, SuzsRegistration> {
    const result = new Map<string, SuzsRegistration>();

    // Find the table that contains "ИНН" header
    const innIdx = html.indexOf('ИНН');
    if (innIdx === -1) {
      this.logger.warn('[SuzsService] "ИНН" column not found in suzs.info HTML');
      return result;
    }

    // Backtrack to find the <table that precedes this position
    const tableStart = html.lastIndexOf('<table', innIdx);
    if (tableStart === -1) {
      return result;
    }

    // Find end of this table
    const tableEnd = html.indexOf('</table>', innIdx);
    if (tableEnd === -1) {
      return result;
    }

    const tableHtml = html.slice(tableStart, tableEnd + '</table>'.length);

    // Parse rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowContent = rowMatch[1];

      // Only process rows that have flag2 cells (data rows, not header)
      if (!rowContent.includes('flag2')) continue;

      const cells: string[] = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(stripTags(cellMatch[1]));
      }

      if (cells.length < 10) continue;

      // [name, ipn, admin_reg, email, docs, date, signature_type, phone, address, city]
      const [name, ipn, admin_reg, email, , reg_date, , phone, address, city] = cells;

      if (!name) continue;

      const key = normalizeName(name);
      const existing = result.get(key);

      // Keep most recent by reg_date, or just last if same/missing
      if (existing) {
        const existingDate = (existing as SuzsRegistration & { _reg_date?: string })._reg_date ?? '';
        if (reg_date && reg_date > existingDate) {
          result.set(key, {
            name,
            ipn: ipn || null,
            admin_reg: admin_reg || null,
            email: email || null,
            phone: phone || null,
            address: address || null,
            city: city || null,
            _reg_date: reg_date,
          } as SuzsRegistration & { _reg_date: string });
        }
      } else {
        result.set(key, {
          name,
          ipn: ipn || null,
          admin_reg: admin_reg || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          city: city || null,
          _reg_date: reg_date,
        } as SuzsRegistration & { _reg_date: string });
      }
    }

    // Strip the internal _reg_date field before returning
    for (const [key, reg] of result.entries()) {
      const clean: SuzsRegistration = {
        name: reg.name,
        ipn: reg.ipn,
        admin_reg: reg.admin_reg,
        email: reg.email,
        phone: reg.phone,
        address: reg.address,
        city: reg.city,
      };
      result.set(key, clean);
    }

    return result;
  }
}
