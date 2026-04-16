import React from 'react';

/**
 * Uspacy CRM embedded as iframe — fills remaining viewport height
 */
export default function UspacyTab({ edrpou }) {
  const USPACY_URL = 'https://ihive.uspacy.ua/crm/companies';

  return (
    <iframe
      src={USPACY_URL}
      title="Uspacy"
      style={{
        display: 'block',
        width: '100%',
        // fill whatever is left below the site header + CRM panel header
        height: 'calc(100vh - 104px)',
        minHeight: 500,
        border: 'none',
      }}
      allow="autoplay; microphone; camera; geolocation; clipboard-write"
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-storage allow-modals allow-presentation"
    />
  );
}
