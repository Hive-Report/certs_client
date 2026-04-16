import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../services/apiService.js';
import UspacyTab from './UspacyTab.jsx';
import pageStateStore from '../store/pageStateStore.js';
import edrpouCache from '../store/edrpouCache.js';

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

function aggregateModules(licenses) {
  const map = new Map();
  for (const lic of licenses) {
    for (const mod of lic.modules) {
      const name = mod.name_module || '';
      const prev = map.get(name);
      if (!prev || (mod.end_date && mod.end_date > prev)) map.set(name, mod.end_date);
    }
  }
  const active = [];
  const lapsed = [];
  for (const [name, end_date] of map) {
    if (isActive(end_date)) active.push({ name_module: name, end_date });
    else if (end_date)      lapsed.push({ name_module: name, end_date });
  }
  const byDateDesc = (a, b) => (b.end_date || '').localeCompare(a.end_date || '');
  active.sort(byDateDesc);
  lapsed.sort(byDateDesc);
  return { active, lapsed };
}

// Returns { active, expiringSoon, lapsed } counts for module-level stats
function getModuleStats(licenses) {
  const { active, lapsed } = aggregateModules(licenses);
  const expiringSoon = active.filter(m => isExpiringSoon(m.end_date)).length;
  return { active: active.length, expiringSoon, lapsed: lapsed.length };
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
function StatsRow({ items, dealer }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '12px 18px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', alignItems: 'center' }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color }}>{value}</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
        </div>
      ))}
      {dealer && (
        <>
          <span style={{ color: '#d1d5db' }}>|</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            Дилер: <span style={{ color: '#374151', fontWeight: 500 }}>{dealer}</span>
          </span>
        </>
      )}
    </div>
  );
}

// ── Licenses aggregate section ────────────────────────────────────────────────
function LicensesSection({ licenses, dealer }) {
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
    const { active, lapsed } = aggregateModules(licenses);
    const expiringSoon = active.filter(m => isExpiringSoon(m.end_date)).length;
    return { active: active.length, expiringSoon, lapsed: lapsed.length };
  }, [licenses]);

  const [copied, setCopied] = useState(false);

  const handleCopyLicensesInfo = () => {
    const lines = byType.map(({ name, list }, idx) => {
      const forms_set = extractFormsSet(list);
      const { active, lapsed } = aggregateModules(list);
      const modules = [...active, ...lapsed].filter(m => m.end_date);
      const header = (idx === 0 && dealer)
        ? `Дилер: ${dealer} ${name}${forms_set ? ` (${forms_set})` : ''}`
        : `${name}${forms_set ? ` (${forms_set})` : ''}`;
      const modulesText = modules.map(m => `- ${m.name_module}: ${formatIso(m.end_date)}`).join('\n');
      return `${header}${modulesText ? `\n${modulesText}` : ''}`;
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <Card>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>🐝</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Ліцензії M.E.Doc</span>
        </div>
        <button
          onClick={handleCopyLicensesInfo}
          style={{
            backgroundColor: 'transparent', border: `1px solid ${copied ? '#1a7a56' : '#d1d5db'}`,
            color: copied ? '#1a7a56' : '#374151',
            borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s, border-color 0.15s',
          }}
          title="Копіювати інформацію про ліцензії"
        >
          {copied ? '✓ Скопійовано' : '📋 Копіювати'}
        </button>
      </div>
      <StatsRow
        dealer={dealer}
        items={[
          { label: 'діючих модулів',          value: sectionStats.active,       color: '#1a7a56' },
          ...(sectionStats.expiringSoon > 0 ? [{ label: 'закінчуються ≤2 міс.', value: sectionStats.expiringSoon, color: '#b45309' }] : []),
          ...(sectionStats.lapsed > 0       ? [{ label: 'не продовжено',        value: sectionStats.lapsed,       color: '#991b1b' }] : []),
        ]}
      />

      <div style={{ padding: '12px 18px' }}>
        {byType.map(({ name, list }) => {
          const forms_set          = extractFormsSet(list);
          const { active: activeModules, lapsed: lapsedModules } = aggregateModules(list);
          const mStats             = getModuleStats(list);

          return (
            <div key={name} style={{ marginBottom: 22 }}>
              {/* Type name + forms_set + per-type module counters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
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

              {/* Active modules */}
              {activeModules.length > 0 && (
                <div style={{ marginBottom: lapsedModules.length > 0 ? 10 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#1a7a56', marginBottom: 4 }}>✅ Діючі:</div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
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
                  </div>
                </div>
              )}

              {/* Lapsed modules */}
              {lapsedModules.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#b91c1c', marginBottom: 4 }}>❌ Не продовжено:</div>
                  <div style={{ border: '1px solid #fca5a5', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th style={TH}>Модуль</th>
                          <th style={{ ...TH, width: 140 }}>Закінчилось</th>
                          <th style={{ ...TH, width: 120 }}>Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lapsedModules.map((mod, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: i % 2 ? '#fef9f9' : '#fff' }}>
                            <td style={TD}>{mod.name_module}</td>
                            <td style={{ ...TD, color: '#dc2626', fontWeight: 700 }}>{formatIso(mod.end_date)}</td>
                            <td style={TD}><StatusPill iso={mod.end_date} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeModules.length === 0 && lapsedModules.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>Немає даних про модулі</p>
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
  const hidden  = certs.length - visible.length;

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
              <th style={{ ...TH, width: 300 }}>Власник</th>
              <th style={TH}>Email</th>
              <th style={{ ...TH, width: 150 }}>Телефон</th>
              <th style={{ ...TH, width: 200 }}>Адм. реєстрації</th>
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
                  <td style={{ ...TD, minWidth: 300 }}>
                    {cert.name || '—'}
                  </td>
                  <td style={TD}>{cert.email || '—'}</td>
                  <td style={TD}>{cert.phone || '—'}</td>
                  <td style={TD}>{cert.admin_reg || '—'}</td>
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

  // ── Restore from session store if available ───────────────────────────────
  const _saved = pageStateStore.get('aggregate');
  const _urlQ  = searchParams.get('q');

  const [search,      setSearch]      = useState(_urlQ || localStorage.getItem('hive_last_edrpou') || _saved?.search || '');
  const [licenses,    setLicenses]    = useState(_saved?.licenses ?? null);
  const [certs,       setCerts]       = useState(_saved?.certs    ?? null);
  const [dealer,      setDealer]      = useState(_saved?.dealer   ?? null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [searched,    setSearched]    = useState(_saved?.searched ?? '');
  const [crmOpen,      setCrmOpen]      = useState(false);
  const [crmMounted,   setCrmMounted]   = useState(true);
  const [crmSearching, setCrmSearching] = useState(false);
  const [crmCompanyId, setCrmCompanyId] = useState(_saved?.crmCompanyId ?? null); // latest from main search
  const [iframeCompanyId, setIframeCompanyId] = useState(_saved?.crmCompanyId ?? null); // what iframe actually shows

  useEffect(() => {
    const q = searchParams.get('q');
    const target = q || localStorage.getItem('hive_last_edrpou') || '';
    // Skip only if we already have results for this exact EDRPOU
    if (target && _saved?.searched === target) return;
    if (target) doSearch(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (edrpou) => {
    const key = edrpou.trim();
    setLoading(true);
    setError('');
    setLicenses(null);
    setCerts(null);
    setCrmCompanyId(null);
    setDealer(null);

    // Reuse cached results when available — only fetch what's missing
    const cachedMedoc  = edrpouCache.hasMedoc(key)   ? edrpouCache.getMedoc(key)   : undefined;
    const cachedCerts  = edrpouCache.hasCerts(key)   ? edrpouCache.getCerts(key)   : undefined;
    const cachedCrmId  = edrpouCache.hasCrmId(key)   ? edrpouCache.getCrmId(key)   : undefined;
    const cachedDealer = edrpouCache.hasDealer(key)  ? edrpouCache.getDealer(key)  : undefined;

    const needMedoc  = cachedMedoc  === undefined;
    const needCerts  = cachedCerts  === undefined;
    const needCrmId  = cachedCrmId  === undefined;
    const needDealer = cachedDealer === undefined;

    const [licR, certR, crmR, dealerR] = await Promise.allSettled([
      needMedoc  ? apiService.searchMedoc(key)                                       : Promise.resolve(cachedMedoc),
      needCerts  ? apiService.searchCerts(key)                                       : Promise.resolve(cachedCerts),
      needCrmId  ? apiService.getUspacyCompanyId(key)                               : Promise.resolve({ companyId: cachedCrmId }),
      needDealer ? apiService.getMedocDealer(key)                                   : Promise.resolve({ dealer: cachedDealer }),
    ]);

    const licData  = licR.status === 'fulfilled'
      ? (Array.isArray(licR.value) ? licR.value : [])
      : [];
    const certData = certR.status === 'fulfilled'
      ? (() => { const d = certR.value; return Array.isArray(d) ? d : (d?.data ?? []); })()
      : [];
    const companyId  = crmR.status    === 'fulfilled' ? (crmR.value?.companyId   ?? null) : null;
    const dealerName = dealerR.status === 'fulfilled' ? (dealerR.value?.dealer   ?? null) : null;

    // Populate shared cache for any data that was freshly fetched
    if (needMedoc  && licR.status    === 'fulfilled') edrpouCache.setMedoc(key, licData);
    if (needCerts  && certR.status   === 'fulfilled') edrpouCache.setCerts(key, certData);
    if (needCrmId  && crmR.status    === 'fulfilled') edrpouCache.setCrmId(key, companyId);
    if (needDealer && dealerR.status === 'fulfilled') edrpouCache.setDealer(key, dealerName);

    setLicenses(licData);
    setCerts(certData);
    setCrmCompanyId(companyId);
    setDealer(dealerName);

    if (licR.status === 'rejected' && certR.status === 'rejected') {
      setError('Помилка завантаження даних. Перевірте ЄДРПОУ.');
    }

    setSearched(key);
    localStorage.setItem('hive_last_edrpou', key);
    setSearchParams({ q: key }, { replace: true });
    pageStateStore.set('aggregate', {
      search:       key,
      searched:     key,
      licenses:     licData,
      certs:        certData,
      crmCompanyId: companyId,
      dealer:       dealerName,
    });
    setLoading(false);
  };

  const handleSearch = () => {
    if (!search.trim()) { setError('Будь ласка, введіть ЄДРПОУ'); return; }
    doSearch(search.trim());
    setCrmOpen(false);
  };

  const handleCrmSearch = () => {
    if (!searched) return;
    setCrmSearching(true);
    setCrmOpen(true);
    setCrmMounted(true);
    setIframeCompanyId(crmCompanyId); // only here does the iframe actually update
    setTimeout(() => setCrmSearching(false), 500);
    requestAnimationFrame(() => fastScroll(document.body.scrollHeight));
  };

  const hasData   = licenses !== null || certs !== null;
  const hasNothing = hasData && (licenses?.length ?? 0) === 0 && (certs?.length ?? 0) === 0;

  return (
    <div style={{ backgroundColor: PAGE_BG }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>

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
              placeholder="Введіть ЄДРПОУ"
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

        {/* ЄДРПОУ badge with org name from latest "печатка" cert */}
        {searched && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              backgroundColor: '#fff', border: `1px solid ${BRAND}`, borderRadius: 8,
              padding: '6px 14px',
            }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>ЄДРПОУ:</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{searched}</span>
            </div>
            {certs && certs.length > 0 && (() => {
              const sealCert = [...certs].sort((a, b) => (certIso(b.start_date) || '').localeCompare(certIso(a.start_date) || '')).find(c => c.type === 'Печатка');
              return sealCert ? (
                <div style={{
                  fontSize: 14, fontWeight: 500, color: '#374151',
                  backgroundColor: '#f3f4f6', padding: '6px 12px', borderRadius: 6,
                }}>
                  {sealCert.name}
                </div>
              ) : null;
            })()}
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
            {licenses && licenses.length > 0 && <LicensesSection licenses={licenses} dealer={dealer} />}
            {certs    && certs.length    > 0 && <CertsSection    certs={certs} />}
          </>
        )}
      </div>

      {/* CRM Collapsible Panel - Full Width */}
      <div id="crm-panel" style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        {/* Header */}
        <div style={{
          padding: '14px 24px', display: 'flex', alignItems: 'center',
          gap: 12, justifyContent: 'space-between',
          borderBottom: crmOpen ? '1px solid #e5e7eb' : 'none',
          cursor: 'pointer',
        }}
          onClick={() => { setCrmOpen(o => !o); setCrmMounted(true); }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>🌐</span>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Uspacy</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            {searched && (
              <button
                onClick={handleCrmSearch}
                disabled={crmSearching}
                style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600,
                  backgroundColor: BRAND, color: '#fff', border: 'none',
                  borderRadius: 6, cursor: crmSearching ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap', opacity: crmSearching ? 0.7 : 1,
                }}
              >
                {crmSearching ? '⏳' : '🔍 Пошук'}
              </button>
            )}
            <span style={{
              fontSize: '1rem', color: '#6b7280',
              display: 'inline-block',
              transform: crmOpen ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s',
            }}>▼</span>
          </div>
        </div>

        {crmMounted && (
          <div style={{ display: crmOpen ? 'block' : 'none' }}>
            <UspacyTab companyId={iframeCompanyId} />
          </div>
        )}
      </div>

      {/* Floating scroll shortcuts */}
      <div style={{
        position: 'fixed', right: 16, bottom: 24,
        display: 'flex', flexDirection: 'column', gap: 6, zIndex: 1000,
      }}>
        <button
          onClick={() => fastScroll(0)}
          title="На початок сторінки"
          style={scrollBtnStyle}
        >↑</button>
        <button
          onClick={() => fastScroll(document.body.scrollHeight)}
          title="В кінець сторінки"
          style={scrollBtnStyle}
        >↓</button>
      </div>
    </div>
  );
}

function fastScroll(target) {
  const start = window.scrollY;
  const dist  = target - start;
  const dur   = 150; // ms
  let t0 = null;
  function step(ts) {
    if (!t0) t0 = ts;
    const p = Math.min((ts - t0) / dur, 1);
    // ease-out quad
    window.scrollTo(0, start + dist * (1 - (1 - p) * (1 - p)));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const scrollBtnStyle = {
  width: 32, height: 32,
  backgroundColor: '#fff',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14, fontWeight: 700,
  color: '#6b7280',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
  lineHeight: 1,
  padding: 0,
};
