import type { Logger } from 'winston';
import { config } from '../../config.js';
import axios from 'axios';

// ── In-memory cache (dealer names rarely change) ──────────────────────────────

interface CacheEntry {
  dealer: string | null;
  expiresAt: number;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const _cache = new Map<string, CacheEntry>();

// ── Parsing helper ─────────────────────────────────────────────────────────────

const PREFIX = 'за телефоном: ';
const SEPARATOR = ' - ';

/**
 * Extracts the dealer name from the support text.
 *
 * Example input:
 *   "З питань супроводження «M.E.Doc» звертайтесь за телефоном: ФОП Глоба Олена Василівна - (063) 247-66-99"
 *
 * Returns "ФОП Глоба Олена Василівна".
 */
function parseDealer(text: string | null | undefined): string | null {
  if (!text) return null;

  const prefixIdx = text.indexOf(PREFIX);
  if (prefixIdx === -1) return null;

  const after = text.slice(prefixIdx + PREFIX.length);
  const sepIdx = after.indexOf(SEPARATOR);

  const name = sepIdx === -1 ? after.trim() : after.slice(0, sepIdx).trim();
  return name || null;
}

// ─────────────────────────────────────────────────────────────────────────────

export class DealerService {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * XOR-decodes the response from action_new.php.
   * The API uses UTF-8 (unlike acc_code.php which uses Windows-1251).
   */
  private xorDecodeUtf8(data: Buffer, key: string): string {
    const keyBytes = Buffer.from(key, 'utf-8');
    const decoded = Buffer.allocUnsafe(data.length);
    for (let i = 0; i < data.length; i++) {
      decoded[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    // Strip null bytes / whitespace added by the server
    return decoded.toString('utf-8').replace(/\x00/g, '').trim();
  }

  /**
   * Fetches the dealer name for the given EDRPOU from M.E.Doc action_new.php.
   * Returns null if dealer info is not available or the request fails.
   */
  async getDealerName(edrpou: string): Promise<string | null> {
    const key = edrpou.trim();

    // Cache hit
    const cached = _cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.info(`Dealer cache HIT for EDRPOU=${key} → ${cached.dealer}`);
      return cached.dealer;
    }

    try {
      this.logger.info(`Fetching dealer info for EDRPOU=${key}`);

      const response = await axios.get<ArrayBuffer>(config.MEDOC_ACTION_URL, {
        params: { edrpo: key },
        headers: { 'User-Agent': config.MEDOC_USER_AGENT },
        responseType: 'arraybuffer',
        timeout: 15_000,
      });

      const raw    = Buffer.from(response.data);
      const marker = Buffer.from(config.MEDOC_DECRYPT_MARKER, 'ascii');

      let jsonStr: string;
      if (raw.subarray(0, marker.length).equals(marker)) {
        jsonStr = this.xorDecodeUtf8(raw.subarray(marker.length), config.MEDOC_ACTION_XOR_KEY);
      } else {
        jsonStr = raw.toString('utf-8').trim();
      }

      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      const supportText = (parsed?.support as Record<string, unknown>)?.text as string | undefined;
      const dealer = parseDealer(supportText);

      this.logger.info(`Dealer for EDRPOU=${key}: ${dealer}`);
      _cache.set(key, { dealer, expiresAt: Date.now() + CACHE_TTL });
      return dealer;
    } catch (err) {
      this.logger.warn(`Failed to fetch dealer for EDRPOU=${key}: ${(err as Error).message}`);
      _cache.set(key, { dealer: null, expiresAt: Date.now() + CACHE_TTL });
      return null;
    }
  }
}
