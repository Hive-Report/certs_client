import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import apiService from '../services/apiService.js';
import edrpouCache from '../store/edrpouCache.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_BG    = '#f4f6f9';
const BRAND      = '#32C48D';
const HORIZON_DAYS = 90; // 3 months

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const HORIZON = new Date(TODAY);
HORIZON.setDate(HORIZON.getDate() + HORIZON_DAYS);

// ── Helpers ───────────────────────────────────────────────────────────────────
function toIso(str) {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const m = str.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, mo, d] = iso.split('-');
  return `${d}.${mo}.${y}`;
}

function daysLeft(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - TODAY) / 86_400_000);
}

function isWithinHorizon(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d >= TODAY && d <= HORIZON;
}

function parseEdrpous(text) {
  return [...new Set(
    text
      .split(/[\n\r]+/)
      .map(s => s.trim().replace(/\D/g, ''))
      .filter(s => s.length >= 8),
  )];
}

// Run tasks with a max concurrency limit
async function withConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function urgencyStyle(days) {
  if (days <= 14) return { bg: '#fee2e2', color: '#991b1b' };
  if (days <= 30) return { bg: '#fff3cd', color: '#92400e' };
  return { bg: '#f0fdf4', color: '#166534' };
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SearchBulk() {
  const [input,    setInput]    = useState('');
  const [rows,     setRows]     = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [loading,  setLoading]  = useState(false);
  const abortRef = useRef(false);

  const handleSearch = async () => {
    const edrpous = parseEdrpous(input);
    if (!edrpous.length) return;

    abortRef.current = false;
    setLoading(true);
    setRows(null);
    setProgress({ done: 0, total: edrpous.length });

    const allRows = [];

    const tasks = edrpous.map(edrpou => async () => {
      if (abortRef.current) return;

      const [licData, certData, dealerResult] = await Promise.all([
        edrpouCache.hasMedoc(edrpou)
          ? Promise.resolve(edrpouCache.getMedoc(edrpou) ?? [])
          : apiService.searchMedoc(edrpou)
              .then(d => { const a = Array.isArray(d) ? d : []; edrpouCache.setMedoc(edrpou, a); return a; })
              .catch(() => []),
        edrpouCache.hasCerts(edrpou)
          ? Promise.resolve(edrpouCache.getCerts(edrpou) ?? [])
          : apiService.searchCerts(edrpou)
              .then(d => { const a = Array.isArray(d) ? d : (d?.data ?? []); edrpouCache.setCerts(edrpou, a); return a; })
              .catch(() => []),
        edrpouCache.hasDealer(edrpou)
          ? Promise.resolve({ dealer: edrpouCache.getDealer(edrpou) })
          : apiService.getMedocDealer(edrpou)
              .then(r => { edrpouCache.setDealer(edrpou, r?.dealer ?? null); return r; })
              .catch(() => ({ dealer: null })),
      ]);
      const dealer = dealerResult?.dealer ?? null;

      // Org name: latest "Печатка" cert
      const sealCert = [...certData]
        .filter(c => c.type === 'Печатка')
        .sort((a, b) => (toIso(b.start_date) || '').localeCompare(toIso(a.start_date) || ''))[0];
      const orgName = sealCert?.name || '';

      // Licenses: dedupe modules, keep latest end_date per module name
      const moduleMap = new Map();
      for (const lic of licData) {
        for (const mod of lic.modules || []) {
          const prev = moduleMap.get(mod.name_module);
          if (!prev || (mod.end_date && mod.end_date > prev)) {
            moduleMap.set(mod.name_module, mod.end_date);
          }
        }
      }
      for (const [name, endDate] of moduleMap) {
        if (!isWithinHorizon(endDate)) continue;
        allRows.push({
          edrpou, orgName,
          type: 'Ліцензія M.E.Doc',
          item: name,
          endDate,
          days: daysLeft(endDate),
          dealer,
          certType: null,
          adminReg: null,
        });
      }

      // Signing certs
      for (const cert of certData) {
        if (cert.crypt !== 'Підписання') continue;
        const iso = toIso(cert.end_date);
        if (!isWithinHorizon(iso)) continue;
        allRows.push({
          edrpou,
          orgName: orgName || cert.name || '',
          type: 'Сертифікат КЕП',
          item: cert.name || '—',
          endDate: iso,
          days: daysLeft(iso),
          dealer: null,
          certType: cert.type || null,
          adminReg: cert.admin_reg || null,
        });
      }

      setProgress(p => ({ ...p, done: p.done + 1 }));
    });

    await withConcurrency(tasks, 5);

    allRows.sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));
    setRows(allRows);
    setLoading(false);
  };

  const handleExport = () => {
    if (!rows?.length) return;

    const data = rows.map(r => ({
      'ЄДРПОУ':                              r.edrpou,
      'Організація':                          r.orgName,
      'Тип':                                  r.type,
      'Назва модуля / Власник сертифіката':   r.item,
      'Тип сертифіката':                      r.certType ?? '',
      'Дилер / Адм. реєстрації':              r.dealer ?? r.adminReg ?? '',
      'Дата закінчення':                      formatDate(r.endDate),
      'Залишилось днів':                      r.days,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 14 }, { wch: 42 }, { wch: 22 }, { wch: 52 },
      { wch: 18 }, { wch: 32 }, { wch: 18 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Поновлення');
    XLSX.writeFile(wb, `renewal_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const edrpouCount = parseEdrpous(input).length;

  return (
    <div style={{ backgroundColor: PAGE_BG, minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', marginBottom: 6 }}>
          📋 Масовий пошук
        </h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
          Введіть ЄДРПОУ (кожен з нового рядка) — буде показано ліцензії та сертифікати КЕП,
          що закінчуються протягом 3 місяців.
        </p>

        {/* ── Input card ── */}
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: 20, marginBottom: 20,
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSearch(); }}
            placeholder={'12345678\n87654321\n11223344'}
            rows={6}
            style={{
              width: '100%', resize: 'vertical',
              border: '1px solid #d1d5db', borderRadius: 8,
              padding: '10px 12px', fontSize: 14, fontFamily: 'monospace',
              outline: 'none', boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleSearch}
              disabled={loading || edrpouCount === 0}
              style={{
                backgroundColor: BRAND, color: '#fff', border: 'none',
                borderRadius: 6, padding: '8px 22px', fontWeight: 600, fontSize: 14,
                cursor: loading || edrpouCount === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || edrpouCount === 0 ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm" />Завантаження...</>
                : `🔍 Шукати${edrpouCount > 0 ? ` (${edrpouCount})` : ''}`}
            </button>

            {loading && progress.total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 140, height: 6, backgroundColor: '#e5e7eb', borderRadius: 99, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', backgroundColor: BRAND, borderRadius: 99,
                    width: `${(progress.done / progress.total) * 100}%`,
                    transition: 'width 0.2s',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
                  {progress.done} / {progress.total}
                </span>
              </div>
            )}

            {!loading && rows !== null && (
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {rows.length > 0
                  ? `Знайдено ${rows.length} позицій`
                  : 'Нічого не знайдено — всі ліцензії та сертифікати діють більше 3 місяців'}
              </span>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        {rows !== null && rows.length > 0 && (
          <div style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                Закінчення протягом 90 днів
              </span>
              <button
                onClick={handleExport}
                style={{
                  backgroundColor: '#16a34a', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '6px 16px', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                📥 Вивантажити Excel
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={TH}>ЄДРПОУ</th>
                    <th style={TH}>Організація</th>
                    <th style={{ ...TH, width: 150 }}>Тип</th>
                    <th style={TH}>Модуль / Сертифікат</th>
                    <th style={{ ...TH, width: 120 }}>Тип серт.</th>
                    <th style={{ ...TH, width: 200 }}>Дилер / Адм. реєстрації</th>
                    <th style={{ ...TH, width: 125 }}>Закінчується</th>
                    <th style={{ ...TH, width: 105 }}>Залишилось</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const u = urgencyStyle(row.days);
                    const isLic = row.type === 'Ліцензія M.E.Doc';
                    return (
                      <tr key={i} style={{
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: i % 2 ? '#fafafa' : '#fff',
                      }}>
                        <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {row.edrpou}
                        </td>
                        <td style={{ ...TD, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.orgName || '—'}
                        </td>
                        <td style={TD}>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                            backgroundColor: isLic ? '#ede9fe' : '#dbeafe',
                            color:           isLic ? '#5b21b6' : '#1e40af',
                            whiteSpace: 'nowrap',
                          }}>
                            {row.type}
                          </span>
                        </td>
                        <td style={TD}>{row.item}</td>
                        <td style={{ ...TD, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {row.certType || '—'}
                        </td>
                        <td style={{ ...TD, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.dealer || row.adminReg || '—'}
                        </td>
                        <td style={{ ...TD, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {formatDate(row.endDate)}
                        </td>
                        <td style={TD}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                            backgroundColor: u.bg, color: u.color, fontWeight: 700, fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}>
                            {row.days} дн.
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TH = {
  padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
};
const TD = { padding: '9px 14px', color: '#374151', verticalAlign: 'middle' };
