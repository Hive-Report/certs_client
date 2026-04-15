import type { MedocRawLicense, MedocLicenseGroup, MedocModule } from '../../types.js';
import type { Logger } from 'winston';
import { config } from '../../config.js';
import axios from 'axios';

const LIC_TYPE_NAMES: Record<string, string> = {
  '1':  'Локальна версія',
  '12': 'Локальна версія',
  '13': 'Мережева версія',
  '7':  'SAF-T UA',
};

const QUANTITY_FORMS_SET: Record<string, string> = {
  '0': 'Повний комплект',
  '2': 'Єдиний податок',
};

export class MedocService {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // ── Decryption ────────────────────────────────────────────────────────────

  /**
   * XOR-decodes a buffer using the provided key, then decodes the result
   * from Windows-1251 (the encoding used by the M.E.Doc API).
   */
  private xorDecode(data: Buffer, key: string): string {
    const keyBytes = Buffer.from(key, 'utf-8');
    const decoded = Buffer.allocUnsafe(data.length);
    for (let i = 0; i < data.length; i++) {
      decoded[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    // Node.js TextDecoder supports Windows-1251 natively
    return new TextDecoder('windows-1251').decode(decoded);
  }

  // ── Date parsing ──────────────────────────────────────────────────────────

  /**
   * Parses a M.E.Doc date string (DD.MM.YYYY or DD/MM/YYYY) into ISO YYYY-MM-DD.
   * Returns null for missing or invalid values.
   */
  private parseMedocDate(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const normalized = raw.replace(/\//g, '.');
    const parts = normalized.split('.');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }

  /**
   * Parses a M.E.Doc creation timestamp ('YYYY-MM-DD HH:MM:SS') into ISO date.
   */
  private parseCreDate(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const date = new Date(raw);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }

  // ── API call ──────────────────────────────────────────────────────────────

  async getLicenses(edrpou: string): Promise<MedocLicenseGroup[]> {
    this.logger.info(`Fetching M.E.Doc licenses for EDRPOU: ${edrpou}`);

    const response = await axios.get<ArrayBuffer>(config.MEDOC_API_URL, {
      params: { edrpo: edrpou, type: 'json', prg_type: 'medoc' },
      headers: { 'User-Agent': config.MEDOC_USER_AGENT },
      responseType: 'arraybuffer',
      timeout: 15_000,
    });

    const raw = Buffer.from(response.data);
    const marker = Buffer.from(config.MEDOC_DECRYPT_MARKER, 'ascii');

    let jsonStr: string;
    if (raw.subarray(0, marker.length).equals(marker)) {
      jsonStr = this.xorDecode(raw.subarray(marker.length), config.MEDOC_XOR_KEY);
    } else {
      jsonStr = new TextDecoder('windows-1251').decode(raw);
    }

    // The API can return null or an empty array when there is no data
    const parsed: unknown = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      this.logger.info(`No M.E.Doc licenses found for EDRPOU: ${edrpou}`);
      return [];
    }

    const licenses = parsed as MedocRawLicense[];
    const result: MedocLicenseGroup[] = [];

    for (const lic of licenses) {
      const licType = String(lic.LIC_Type ?? '');
      const rawModules = Array.isArray(lic.Lic_TypeR) ? lic.Lic_TypeR : [];

      // Derive forms_set from Quantity field: '0' = Повний комплект, '2' = Єдиний податок
      const quantity = String(lic.Quantity ?? '');
      const forms_set: string | null = QUANTITY_FORMS_SET[quantity] ?? null;

      const modules: MedocModule[] = rawModules.map(mod => ({
        name_module: mod.name_module ?? '',
        end_date: this.parseMedocDate(mod.end_date),
      }));

      result.push({
        lic_id:        String(lic.LIC_Id ?? ''),
        lic_type:      licType,
        lic_type_name: LIC_TYPE_NAMES[licType] ?? licType,
        lic_end_date:  this.parseMedocDate(lic.LIC_EndDate as string | undefined),
        lic_cre_date:  this.parseCreDate(lic.LIC_CreDate as string | undefined),
        forms_set,
        modules,
      });
    }

    this.logger.info(
      `Successfully fetched ${result.length} license groups for EDRPOU: ${edrpou}`,
    );
    return result;
  }
}
