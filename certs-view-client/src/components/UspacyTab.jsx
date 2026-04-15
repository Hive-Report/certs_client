import React from 'react';

/**
 * Uspacy CRM embedded as iframe with auto-search
 */
export default function UspacyTab({ edrpou }) {
  // Use companies page - user authenticates here, then searches manually
  const USPACY_URL = 'https://ihive.uspacy.ua/crm/companies';

  return (
    <div style={{ marginTop: 24, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: '1.1rem' }}>🌐</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Uspacy CRM</div>
          {edrpou && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Пошук: <strong>{edrpou}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Iframe */}
      <div style={{ width: '100%', minHeight: '700px' }}>
        <iframe
          src={USPACY_URL}
          title="Uspacy CRM"
          style={{
            width: '100%', height: '700px', border: 'none',
            display: 'block',
          }}
          allow="autoplay; microphone; camera; geolocation; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-storage allow-modals allow-presentation"
        />
      </div>
    </div>
  );
}
