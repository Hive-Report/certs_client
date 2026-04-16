import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../services/apiService.js';

const BRAND   = '#32C48D';
const PAGE_BG = '#f4f6f9';

const TH = {
  padding: '7px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
};
const TD = { padding: '8px 12px', fontSize: 13, color: '#374151', verticalAlign: 'top' };

// Returns today as DD.MM.YYYY
function todayDmy() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
// Returns first day of current month as DD.MM.YYYY
function firstOfMonthDmy() {
  const d = new Date();
  return `01.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
// Auto-mask: inserts dots after DD and MM while user types
function applyDateMask(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let result = digits;
  if (digits.length > 2) result = digits.slice(0, 2) + '.' + digits.slice(2);
  if (digits.length > 4) result = result.slice(0, 5) + '.' + digits.slice(4);
  return result;
}
// Validates DD.MM.YYYY
function isValidDmy(dmy) {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(dmy);
}
// DD.MM.YYYY → YYYY-MM-DD (for hidden date input)
function dmyToIso(dmy) {
  if (!isValidDmy(dmy)) return '';
  const [d, m, y] = dmy.split('.');
  return `${y}-${m}-${d}`;
}
// YYYY-MM-DD → DD.MM.YYYY
function isoToDmy(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ── Date input with DD.MM.YYYY text mask + calendar icon ─────────────────────
function DateInput({ label, value, onChange, onEnter }) {
  const hiddenRef = useRef(null);

  const openPicker = () => {
    if (hiddenRef.current) {
      try { hiddenRef.current.showPicker(); }
      catch { hiddenRef.current.click(); }
    }
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control"
          style={{ width: 140, paddingRight: 32 }}
          placeholder="ДД.ММ.РРРР"
          value={value}
          onChange={e => onChange(applyDateMask(e.target.value))}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          maxLength={10}
        />
        {/* Calendar icon button */}
        <button
          type="button"
          onClick={openPicker}
          style={{
            position: 'absolute', right: 6, background: 'none', border: 'none',
            padding: 0, cursor: 'pointer', color: '#9ca3af', fontSize: 15, lineHeight: 1,
          }}
          tabIndex={-1}
          title="Обрати дату"
        >
          📅
        </button>
        {/* Hidden native date input — only used for the picker UI */}
        <input
          ref={hiddenRef}
          type="date"
          value={dmyToIso(value)}
          onChange={e => onChange(isoToDmy(e.target.value))}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SearchCertPayment() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [dateStart,   setDateStart]   = useState(searchParams.get('ds')   || firstOfMonthDmy());
  const [dateEnd,     setDateEnd]     = useState(searchParams.get('de')   || todayDmy());
  const [edrpou,      setEdrpou]      = useState(searchParams.get('e')    || localStorage.getItem('hive_last_edrpou') || '');
  const [naznachenie, setNaznachenie] = useState(searchParams.get('nazn') || '');

  const [payments,  setPayments]  = useState(null);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  // Auto-search on mount if params are in URL
  useEffect(() => {
    if (searchParams.get('ds')) doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async () => {
    if (!isValidDmy(dateStart) || !isValidDmy(dateEnd)) {
      setError('Введіть дати у форматі ДД.ММ.РРРР');
      return;
    }
    setLoading(true);
    setError('');
    setPayments(null);
    setSummary(null);

    const params = new URLSearchParams({
      dateStart,
      dateEnd,
      ...(edrpou      ? { edrpou }      : {}),
      ...(naznachenie ? { naznachenie } : {}),
    });

    if (edrpou.trim()) localStorage.setItem('hive_last_edrpou', edrpou.trim());
    setSearchParams({
      ds: dateStart, de: dateEnd,
      ...(edrpou      ? { e:    edrpou }      : {}),
      ...(naznachenie ? { nazn: naznachenie } : {}),
    }, { replace: true });

    try {
      const result = await apiService.searchCertPayments(params.toString());
      setPayments(result.payments ?? []);
      setSummary(result.summary ?? null);
    } catch (err) {
      setError(err.message || 'Помилка запиту');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: PAGE_BG }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827', marginBottom: 6 }}>
          💳 Реєстр оплат КЕП
        </h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
          Пошук оплат дилерів у системі cert.suzs.info
        </p>

        {/* Filters */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>

            <DateInput label="З"  value={dateStart} onChange={setDateStart} onEnter={doSearch} />
            <DateInput label="По" value={dateEnd}   onChange={setDateEnd}   onEnter={doSearch} />

            {/* EDRPOU */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                ЄДРПОУ
              </label>
              <input
                type="text"
                className="form-control"
                style={{ width: 160 }}
                value={edrpou}
                onChange={e => setEdrpou(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
              />
            </div>

            {/* Naznachenie */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Призначення платежу
              </label>
              <input
                type="text"
                className="form-control"
                value={naznachenie}
                onChange={e => setNaznachenie(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
              />
            </div>

            {/* Search button */}
            <button
              onClick={doSearch}
              disabled={loading}
              style={{
                backgroundColor: BRAND, color: '#fff', border: 'none',
                borderRadius: 6, padding: '8px 22px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1, whiteSpace: 'nowrap',
              }}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-1" />Завантаження...</>
                : '🔍 Шукати'}
            </button>
          </div>

          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div className="spinner-border" style={{ width: 44, height: 44, color: BRAND }} />
            <p style={{ color: '#6b7280', marginTop: 12 }}>Запит до cert.suzs.info...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && payments !== null && payments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>💳</div>
            <h3 style={{ fontWeight: 600, color: '#374151' }}>Оплат не знайдено</h3>
            <p style={{ color: '#6b7280' }}>Спробуйте змінити діапазон дат або параметри фільтру</p>
          </div>
        )}

        {/* Results */}
        {!loading && payments && payments.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

            {/* Summary bar */}
            {summary && (
              <div style={{ padding: '12px 18px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1a7a56' }}>{summary.count}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>записів</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{summary.total_sum}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>грн загальна сума</span>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={TH}>ЄДРПОУ</th>
                    <th style={TH}>Назва</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Сума</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Використано</th>
                    <th style={TH}>Дата</th>
                    <th style={TH}>Зараховано</th>
                    <th style={{ ...TH, minWidth: 280 }}>Призначення платежу</th>
                    <th style={TH}>Сертифікат до</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ ...TD, fontWeight: 600, whiteSpace: 'nowrap' }}>{p.edrpou}</td>
                      <td style={TD}>{p.name}</td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', color: '#1a7a56' }}>{p.sum}</td>
                      <td style={{ ...TD, textAlign: 'right', whiteSpace: 'nowrap' }}>{p.used_sum}</td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{p.date}</td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{p.credited_date}</td>
                      <td style={{ ...TD, maxWidth: 360, wordBreak: 'break-word' }}>{p.purpose}</td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{p.cert_until}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
