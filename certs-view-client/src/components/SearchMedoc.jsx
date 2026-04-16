import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../services/apiService.js';
import pageStateStore from '../store/pageStateStore.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const BRAND   = '#32C48D';
const PAGE_BG = '#f4f6f9';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const IN_TWO_MONTHS = new Date(TODAY);
IN_TWO_MONTHS.setDate(IN_TWO_MONTHS.getDate() + 60);

// ── Date helpers ──────────────────────────────────────────────────────────────
function isActive(iso) {
  if (!iso) return false;
  return new Date(iso) >= TODAY;
}
function isExpiringSoon(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= TODAY && d <= IN_TWO_MONTHS;
}
function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ── Forms-set: pick from the most recently purchased license in the group ─────
// The backend derives forms_set from the Quantity field:
//   Quantity "0" → "Повний комплект", Quantity "2" → "Єдиний податок"
function extractFormsSet(licenses) {
  const sorted = [...licenses].sort((a, b) =>
    (b.lic_cre_date || '').localeCompare(a.lic_cre_date || ''),
  );
  for (const lic of sorted) {
    if (lic.forms_set) return lic.forms_set;
  }
  return null;
}

// ── Aggregate modules for a type group ───────────────────────────────────────
function aggregateModules(licenses) {
  const moduleMap = new Map(); // name → max iso end_date

  for (const lic of licenses) {
    for (const mod of lic.modules) {
      const name = mod.name_module || '';
      const prev = moduleMap.get(name);
      if (!prev || (mod.end_date && mod.end_date > prev)) {
        moduleMap.set(name, mod.end_date);
      }
    }
  }

  const active   = [];
  const lapsed   = [];

  for (const [name, end_date] of moduleMap) {
    if (isActive(end_date)) {
      active.push({ name_module: name, end_date });
    } else if (end_date) {
      lapsed.push({ name_module: name, end_date });
    }
  }

  const byDateDesc = (a, b) => (b.end_date || '').localeCompare(a.end_date || '');
  active.sort(byDateDesc);
  lapsed.sort(byDateDesc);

  return { active, lapsed };
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ iso }) {
  const active = isActive(iso);
  const soon   = active && isExpiringSoon(iso);

  const [bg, color, border, label] = !active
    ? ['#fee2e2', '#991b1b', '#fca5a5', 'Прострочений']
    : soon
    ? ['#fff8e1', '#b45309', '#fcd34d', 'Закінчується']
    : ['#e8faf4', '#1a7a56', BRAND,     'Діючий'];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.4px',
      backgroundColor: bg, color, border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ── Module table ──────────────────────────────────────────────────────────────
function ModuleTable({ modules, isLapsed }) {
  if (modules.length === 0) return null;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f9fafb' }}>
          <th style={TH}>Назва модуля</th>
          <th style={{ ...TH, width: 160 }}>Дата закінчення дії</th>
          <th style={{ ...TH, width: 130 }}>Статус</th>
        </tr>
      </thead>
      <tbody>
        {modules.map((mod, i) => {
          const soon    = !isLapsed && isExpiringSoon(mod.end_date);
          const rowBg   = isLapsed ? '#fef9f9' : soon ? '#fff8e1' : (i % 2 ? '#fafafa' : '#fff');
          const dateClr = isLapsed ? '#dc2626' : soon ? '#b45309' : '#374151';
          return (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: rowBg }}>
              <td style={TD}>{mod.name_module}</td>
              <td style={{ ...TD, color: dateClr, fontWeight: (isLapsed || soon) ? 700 : 400 }}>
                {formatDate(mod.end_date)}
              </td>
              <td style={TD}>
                <StatusBadge iso={mod.end_date} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const TH = {
  padding: '7px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb',
};
const TD = { padding: '8px 14px', fontSize: 13, color: '#374151' };

// ── Type panel ────────────────────────────────────────────────────────────────
function TypePanel({ licenses }) {
  const forms_set              = useMemo(() => extractFormsSet(licenses), [licenses]);
  const { active, lapsed }     = useMemo(() => aggregateModules(licenses), [licenses]);

  return (
    <div style={{ padding: '16px 24px 24px' }}>
      {forms_set && (
        <div style={{ marginBottom: 18 }}>
          <span style={{ fontWeight: 700, color: '#374151' }}>Комплект бланків: </span>
          <span style={{
            backgroundColor: '#ede9fe', color: '#5b21b6',
            padding: '2px 10px', borderRadius: 6, fontWeight: 600, fontSize: 13,
          }}>
            {forms_set}
          </span>
        </div>
      )}

      {active.length === 0 && lapsed.length === 0 && (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>
          Немає даних для відображення
        </p>
      )}

      {active.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a7a56', marginBottom: 8 }}>
            ✅ Діючі ліцензії:
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <ModuleTable modules={active} isLapsed={false} />
          </div>
        </div>
      )}

      {lapsed.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#b91c1c', marginBottom: 8 }}>
            ❌ Не продовжено (минулий рік):
          </div>
          <div style={{ border: '1px solid #fca5a5', borderRadius: 8, overflow: 'hidden' }}>
            <ModuleTable modules={lapsed} isLapsed={true} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SearchMedoc() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Restore from session store if available ───────────────────────────────
  const _saved = pageStateStore.get('medoc');
  const _urlQ  = searchParams.get('q');

  const [search,    setSearch]    = useState(_urlQ || _saved?.search || localStorage.getItem('hive_last_edrpou') || '');
  const [data,      setData]      = useState(_saved?.data     ?? []);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [searched,  setSearched]  = useState(_saved?.searched ?? '');
  const [activeTab, setActiveTab] = useState(_saved?.activeTab || searchParams.get('tab') || '');

  // Auto-search on mount if q is in URL — skip if store already has matching results
  useEffect(() => {
    const q = searchParams.get('q');
    if (_saved?.searched && (!q || _saved.searched === q)) return;
    if (q) doSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (edrpou) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiService.searchMedoc(edrpou.trim());
      const list = Array.isArray(result) ? result : [];
      // Set default tab to first available type
      const firstType = list.length > 0 ? list[0].lic_type : '';
      const tabParam   = searchParams.get('tab');
      const validTab = list.some(l => l.lic_type === tabParam) ? tabParam : firstType;

      setData(list);
      setSearched(edrpou.trim());
      setActiveTab(validTab);
      localStorage.setItem('hive_last_edrpou', edrpou.trim());
      setSearchParams({ q: edrpou.trim(), ...(validTab ? { tab: validTab } : {}) }, { replace: true });
      pageStateStore.set('medoc', {
        search:    edrpou.trim(),
        searched:  edrpou.trim(),
        data:      list,
        activeTab: validTab,
      });
    } catch (err) {
      setError(err.message || 'Помилка при завантаженні даних');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!search.trim()) { setError('Будь ласка, введіть ЄДРПОУ'); return; }
    doSearch(search.trim());
  };

  const handleTabChange = (type) => {
    setActiveTab(type);
    setSearchParams({ q: searched, tab: type }, { replace: true });
  };

  // Group by license type
  const typeGroups = useMemo(() => {
    const map = new Map();
    for (const lic of data) {
      if (!map.has(lic.lic_type)) map.set(lic.lic_type, { name: lic.lic_type_name, licenses: [] });
      map.get(lic.lic_type).licenses.push(lic);
    }
    return Array.from(map.entries()).map(([type, g]) => ({ type, name: g.name, licenses: g.licenses }));
  }, [data]);

  const activeGroup = typeGroups.find(g => g.type === activeTab) || typeGroups[0];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: PAGE_BG }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', marginBottom: 20 }}>
          🐝 Ліцензії M.E.Doc
        </h1>

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

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div className="spinner-border" style={{ width: 44, height: 44, color: BRAND }} />
            <p style={{ color: '#6b7280', marginTop: 12 }}>Завантаження даних...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && searched && data.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '48px 0', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🔍</div>
            <h3 style={{ fontWeight: 600, color: '#374151' }}>Ліцензій не знайдено</h3>
            <p style={{ color: '#6b7280' }}>Перевірте правильність ЄДРПОУ</p>
          </div>
        )}

        {/* Results */}
        {!loading && data.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>

            {/* ЄДРПОУ header */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>ЄДРПОУ: </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{searched}</span>
            </div>

            {/* Type selector */}
            <div style={{ padding: '14px 24px 0', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 10 }}>
                Тип ліцензії
              </div>
              <div style={{ display: 'flex', gap: 0, width: 'fit-content', border: '1px solid #e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                {typeGroups.map((g, i) => (
                  <button
                    key={g.type}
                    onClick={() => handleTabChange(g.type)}
                    style={{
                      padding: '8px 22px',
                      border: 'none',
                      borderRight: i < typeGroups.length - 1 ? '1px solid #e5e7eb' : 'none',
                      cursor: 'pointer',
                      fontWeight: activeGroup?.type === g.type ? 700 : 400,
                      fontSize: 14,
                      backgroundColor: activeGroup?.type === g.type ? '#f59e0b' : 'transparent',
                      color: activeGroup?.type === g.type ? '#fff' : '#6b7280',
                      transition: 'background 0.15s',
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <div style={{ height: 12 }} />
            </div>

            {activeGroup && <TypePanel licenses={activeGroup.licenses} />}
          </div>
        )}
      </div>
    </div>
  );
}
