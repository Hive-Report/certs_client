import React from 'react';

/**
 * Uspacy CRM embedded as iframe with auto-search
 */
export default function UspacyTab({ edrpou }) {
  // Use companies page - user authenticates here, then searches manually
  const USPACY_URL = 'https://ihive.uspacy.ua/crm/companies';

  return (
    <div style={{ width: '100%' }}>
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
