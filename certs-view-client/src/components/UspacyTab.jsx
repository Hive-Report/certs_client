import React from 'react';

/**
 * Uspacy CRM embedded as iframe with auto-search
 */
export default function UspacyTab({ edrpou }) {
  // Build API request URL with EDRPOU filter
  // When user authenticates in iframe, fetch will include their auth cookie/token
  const getUspacyURL = () => {
    if (!edrpou) {
      return 'https://ihive.uspacy.ua/crm/companies';
    }

    // API URL with EDRPOU filter
    return `https://ihive.uspacy.ua/crm/v1/entities/companies/?page=1&list=20&sort_by%5Bcreated_at%5D=desc&table_fields%5B%5D=id&table_fields%5B%5D=title&table_fields%5B%5D=owner&table_fields%5B%5D=phone&table_fields%5B%5D=email&table_fields%5B%5D=company_label&table_fields%5B%5D=contacts&table_fields%5B%5D=uf_crm_1707834642093&table_fields%5B%5D=uf_crm_1632905074&table_fields%5B%5D=created_at&table_fields%5B%5D=updated_at&table_fields%5B%5D=crm_avatar&filters%5Bfilters%5D%5B0%5D%5Bfield%5D=uf_crm_1632905074&filters%5Bfilters%5D%5B0%5D%5Boperator%5D=like&filters%5Bfilters%5D%5B0%5D%5Bvalues%5D=${encodeURIComponent(edrpou)}`;
  };

  const USPACY_URL = getUspacyURL();

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
