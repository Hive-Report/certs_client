/**
 * Cross-page in-memory cache for EDRPOU search results.
 *
 * Keyed by EDRPOU code so that any page can reuse data already fetched by
 * another page in the same browser session — no redundant API calls.
 *
 * Structure per entry:
 *   { certs: Array|null, medoc: Array|null, crmCompanyId: number|null|undefined, dealer: string|null|undefined }
 *
 * `undefined` means "not yet fetched"; `null` means "fetched, nothing found".
 */

const _cache = {};

const edrpouCache = {
  // ── Readers ──────────────────────────────────────────────────────────────

  /** Returns cached certs array, or undefined if not fetched yet. */
  getCerts:    (edrpou) => _cache[edrpou]?.certs,

  /** Returns cached medoc array, or undefined if not fetched yet. */
  getMedoc:    (edrpou) => _cache[edrpou]?.medoc,

  /** Returns cached Uspacy company ID (number|null), or undefined if not fetched yet. */
  getCrmId:    (edrpou) => _cache[edrpou]?.crmCompanyId,

  /** Returns cached dealer name (string|null), or undefined if not fetched yet. */
  getDealer:   (edrpou) => _cache[edrpou]?.dealer,

  // ── Writers ──────────────────────────────────────────────────────────────

  setCerts:    (edrpou, data)   => { (_cache[edrpou] ??= {}).certs        = data;   },
  setMedoc:    (edrpou, data)   => { (_cache[edrpou] ??= {}).medoc        = data;   },
  setCrmId:    (edrpou, id)     => { (_cache[edrpou] ??= {}).crmCompanyId = id;     },
  setDealer:   (edrpou, name)   => { (_cache[edrpou] ??= {}).dealer       = name;   },

  // ── Existence checks ─────────────────────────────────────────────────────

  hasCerts:    (edrpou) => _cache[edrpou] !== undefined && 'certs'        in (_cache[edrpou] ?? {}),
  hasMedoc:    (edrpou) => _cache[edrpou] !== undefined && 'medoc'        in (_cache[edrpou] ?? {}),
  hasCrmId:    (edrpou) => _cache[edrpou] !== undefined && 'crmCompanyId' in (_cache[edrpou] ?? {}),
  hasDealer:   (edrpou) => _cache[edrpou] !== undefined && 'dealer'       in (_cache[edrpou] ?? {}),
};

export default edrpouCache;
