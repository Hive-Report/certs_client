import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../services/apiService.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const BRAND   = '#32C48D';
const PAGE_BG = '#f4f6f9';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const IN_TWO_MONTHS = new Date(TODAY);
IN_TWO_MONTHS.setDate(IN_TWO_MONTHS.getDate() + 60);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isActive(iso) {
  if (!iso) return false;
  return new Date(iso) >= TODAY;
}
function isExpiringSoon(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= TODAY && d <= IN_TWO_MONTHS;
}
function formatIso(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}.${m}.${y}`;
}
// Cert dates can be ISO "2023-04-15T00:00:00.000Z",
// or Ukrainian "17.04.2027 00:00:00", or plain "2023-04-15"
function certIso(str) {
  if (!str) return null;
  // Already ISO – just take the date part
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // DD.MM.YYYY[ HH:MM:SS]
  const m = str.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Fallback: let Date parse it and normalise
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

// ── Forms-set: pick from the most recently purchased license in the group ─────
// Backend derives forms_set from Quantity: "0" → Повний комплект, "2" → Єдиний податок
function extractFormsSet(licenses) {
  const sorted = [...licenses].sort((a, b) =>
    (b.lic_cre_date || '').localeCompare(a.lic_cre_date || ''),
  );
  for (const lic of sorted) {
    if (lic.forms_set) return lic.forms_set;
  }
  return null;
}

// ── Aggregate modules for a group (deduped by name, keep latest end_date) ────
function dedupeModules(licenses) {
  const map = new Map();
  for (const lic of licenses) {
    for (const mod of lic.modules) {
      const name = mod.name_module || '';
      const prev = map.get(name);
      if (!prev || (mod.end_date && mod.end_date > prev)) map.set(name, mod.end_date);
    }
  }
  return Array.from(map.entries()).map(([name, end_date]) => ({ name_module: name, end_date }));
}

function getActiveModules(licenses) {
  return dedupeModules(licenses)
    .filter(m => isActive(m.end_date))
    .sort((a, b) => (b.end_date || '').localeCompare(a.end_date || ''));
}

// Returns { active, expiringSoon, lapsed } counts for module-level stats
function getModuleStats(licenses) {
  const modules = dedupeModules(licenses);
  const active      = modules.filter(m => isActive(m.end_date)).length;
  const expiringSoon = modules.filter(m => isExpiringSoon(m.end_date)).length;
  const lapsed      = modules.filter(m =>
    !isActive(m.end_date) && m.end_date
  ).length;
  return { active, expiringSoon, lapsed };
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ iso }) {
  const active = isActive(iso);
  const soon   = active && isExpiringSoon(iso);
  const [bg, color, label] = !active
    ? ['#fee2e2', '#991b1b', 'Прострочений']
    : soon
    ? ['#fff8e1', '#b45309', 'Закінчується']
    : ['#e8faf4', '#1a7a56', 'Діючий'];
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      backgroundColor: bg, color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function CertStatusPill({ status }) {
  const [bg, color] =
    status === 'Діючий'      ? ['#e8faf4', '#1a7a56'] :
    status === 'Заблокований'? ['#fee2e2', '#991b1b']  :
    status === 'Скасований'  ? ['#fff8e1', '#b45309']  :
                               ['#f3f4f6', '#374151'];
  return (
    <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600, backgroundColor: bg, color }}>
      {status || '—'}
    </span>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      marginBottom: 20, ...style,
    }}>
      {children}
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────
function StatsRow({ items }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '12px 18px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color }}>{value}</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Licenses aggregate section ────────────────────────────────────────────────
function LicensesSection({ licenses }) {
  const byType = useMemo(() => {
    const map = new Map();
    for (const lic of licenses) {
      if (!map.has(lic.lic_type)) map.set(lic.lic_type, { name: lic.lic_type_name, list: [] });
      map.get(lic.lic_type).list.push(lic);
    }
    return Array.from(map.values());
  }, [licenses]);

  // Section-level stats: aggregate across ALL types
  const sectionStats = useMemo(() => {
    const all = dedupeModules(licenses);
    const active       = all.filter(m => isActive(m.end_date)).length;
    const expiringSoon = all.filter(m => isExpiringSoon(m.end_date)).length;
    const lapsed       = all.filter(m =>
      !isActive(m.end_date) && m.end_date
    ).length;
    return { active, expiringSoon, lapsed };
  }, [licenses]);

  return (
    <Card>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.1rem' }}>🐝</span>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Ліцензії M.E.Doc</span>
      </div>
      <StatsRow items={[
        { label: 'діючих модулів',          value: sectionStats.active,       color: '#1a7a56' },
        ...(sectionStats.expiringSoon > 0 ? [{ label: 'закінчуються ≤2 міс.', value: sectionStats.expiringSoon, color: '#b45309' }] : []),
        ...(sectionStats.lapsed > 0       ? [{ label: 'не продовжено',        value: sectionStats.lapsed,       color: '#991b1b' }] : []),
      ]} />

      <div style={{ padding: '12px 18px' }}>
        {byType.map(({ name, list }) => {
          const forms_set     = extractFormsSet(list);
          const activeModules = getActiveModules(list);
          const mStats        = getModuleStats(list);

          return (
            <div key={name} style={{ marginBottom: 18 }}>
              {/* Type name + forms_set + per-type module counters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>{name}</span>
                {forms_set && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 6,
                    backgroundColor: '#ede9fe', color: '#5b21b6', fontWeight: 600,
                  }}>
                    📋 {forms_set}
                  </span>
                )}
                <span style={{ fontSize: 11, backgroundColor: '#e8faf4', color: '#1a7a56', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                  {mStats.active} діючих
                </span>
                {mStats.expiringSoon > 0 && (
                  <span style={{ fontSize: 11, backgroundColor: '#fff8e1', color: '#b45309', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                    ⏳ {mStats.expiringSoon} закінчуються
                  </span>
                )}
                {mStats.lapsed > 0 && (
                  <span style={{ fontSize: 11, backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                    ✕ {mStats.lapsed} не продовжено
                  </span>
                )}
              </div>
              {activeModules.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>Немає діючих модулів</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={TH}>Модуль</th>
                      <th style={{ ...TH, width: 140 }}>Закінчується</th>
                      <th style={{ ...TH, width: 120 }}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeModules.map((mod, i) => {
                      const soon  = isExpiringSoon(mod.end_date);
                      const rowBg = soon ? '#fff8e1' : (i % 2 ? '#fafafa' : '#fff');
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: rowBg }}>
                          <td style={TD}>{mod.name_module}</td>
                          <td style={{ ...TD, color: soon ? '#b45309' : '#374151', fontWeight: soon ? 700 : 400 }}>
                            {formatIso(mod.end_date)}
                          </td>
                          <td style={TD}><StatusPill iso={mod.end_date} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Certs section — shows only certs valid today (end_date >= today) ──────────
function CertsSection({ certs }) {
  // Filter: only signing certs (Підписання) that haven't expired
  const visible = useMemo(
    () => certs.filter(c => c.crypt === 'Підписання' && isActive(certIso(c.end_date))),
    [certs],
  );

  const soon    = visible.filter(c => isExpiringSoon(certIso(c.end_date))).length;
  const hidden  = certs.length / 2 - visible.length;

  if (visible.length === 0) return (
    <Card>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.1rem' }}>🔐</span>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Сертифікати КЕП</span>
      </div>
      <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        Немає діючих сертифікатів
        {hidden > 0 && <span style={{ marginLeft: 6 }}>({hidden} прострочених приховано)</span>}
      </div>
    </Card>
  );

  return (
    <Card>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.1rem' }}>🔐</span>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Сертифікати КЕП</span>
        {hidden > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
            {hidden} прострочених приховано
          </span>
        )}
      </div>
      <StatsRow items={[
        { label: 'діючих сертифікатів', value: visible.length, color: '#1a7a56' },
        ...(soon > 0 ? [{ label: 'закінчуються ≤2 міс.', value: soon, color: '#b45309' }] : []),
      ]} />

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={TH}>Власник</th>
              <th style={TH}>Email</th>
              <th style={{ ...TH, width: 120 }}>Тип</th>
              <th style={{ ...TH, width: 150 }}>Сховище</th>
              <th style={{ ...TH, width: 120 }}>Початок дії</th>
              <th style={{ ...TH, width: 120 }}>Кінець дії</th>
              <th style={{ ...TH, width: 120 }}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((cert, i) => {
              const endIso = certIso(cert.end_date);
              const expSoon = isExpiringSoon(endIso);
              const rowBg  = expSoon ? '#fff8e1' : (i % 2 ? '#fafafa' : '#fff');
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: rowBg }}>
                  <td style={{ ...TD, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={cert.name}>
                    {cert.name || '—'}
                  </td>
                  <td style={TD}>{cert.email || '—'}</td>
                  <td style={TD}>{cert.type || '—'}</td>
                  <td style={TD}>{cert.storage_type || '—'}</td>
                  <td style={TD}>{formatIso(certIso(cert.start_date))}</td>
                  <td style={{ ...TD, color: expSoon ? '#b45309' : '#374151', fontWeight: expSoon ? 700 : 400 }}>
                    {formatIso(endIso)}
                  </td>
                  <td style={TD}><CertStatusPill status={cert.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const TH = {
  padding: '7px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb',
};
const TD = { padding: '8px 14px', color: '#374151' };

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SearchAggregate() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search,   setSearch]   = useState(searchParams.get('q') || '');
  const [licenses, setLicenses] = useState(null);
  const [certs,    setCerts]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [searched, setSearched] = useState('');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) doSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (edrpou) => {
    setLoading(true);
    setError('');
    setLicenses(null);
    setCerts(null);

    const [licR, certR] = await Promise.allSettled([
      apiService.searchMedoc(edrpou.trim()),
      apiService.searchCerts(edrpou.trim()),
    ]);

    if (licR.status === 'fulfilled') {
      setLicenses(Array.isArray(licR.value) ? licR.value : []);
    } else {
      setLicenses([]);
    }

    if (certR.status === 'fulfilled') {
      const d = certR.value;
      setCerts(Array.isArray(d) ? d : (d?.data ?? []));
    } else {
      setCerts([]);
    }

    if (licR.status === 'rejected' && certR.status === 'rejected') {
      setError('Помилка завантаження даних. Перевірте ЄДРПОУ.');
    }

    setSearched(edrpou.trim());
    setSearchParams({ q: edrpou.trim() }, { replace: true });
    setLoading(false);
  };

  const handleSearch = () => {
    if (!search.trim()) { setError('Будь ласка, введіть ЄДРПОУ'); return; }
    doSearch(search.trim());
  };

  const hasData   = licenses !== null || certs !== null;
  const hasNothing = hasData && (licenses?.length ?? 0) === 0 && (certs?.length ?? 0) === 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: PAGE_BG }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', marginBottom: 6 }}>
          🗂️ Зведений вигляд
        </h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
          Введіть ЄДРПОУ — буде показано ліцензії M.E.Doc та сертифікати КЕП одночасно.
        </p>

        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, maxWidth: 380 }}>
            <input
              className="form-control"
              type="text"
              placeholder="Введіть ЄДРПОУ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                backgroundColor: BRAND, color: '#fff', border: 'none',
                borderRadius: 6, padding: '6px 18px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-1" />Завантаження...</>
                : '🔍 Шукати'}
            </button>
          </div>
          {error && <div className="alert alert-danger mt-2 mb-0">{error}</div>}
        </div>

        {/* ЄДРПОУ badge */}
        {searched && !loading && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            backgroundColor: '#fff', border: `1px solid ${BRAND}`, borderRadius: 8,
            padding: '6px 14px', marginBottom: 20,
          }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>ЄДРПОУ:</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{searched}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div className="spinner-border" style={{ width: 44, height: 44, color: BRAND }} />
            <p style={{ color: '#6b7280', marginTop: 12 }}>Завантаження даних...</p>
          </div>
        )}

        {/* Nothing found */}
        {!loading && hasNothing && (
          <div style={{ textAlign: 'center', padding: '48px 0', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🔍</div>
            <h3 style={{ fontWeight: 600, color: '#374151' }}>Нічого не знайдено</h3>
            <p style={{ color: '#6b7280' }}>Перевірте правильність ЄДРПОУ</p>
          </div>
        )}

        {/* Results */}
        {!loading && !hasNothing && (
          <>
            {licenses && licenses.length > 0 && <LicensesSection licenses={licenses} />}
            {certs    && certs.length    > 0 && <CertsSection    certs={certs} />}
          </>
        )}
      </div>
    </div>
  );
}
