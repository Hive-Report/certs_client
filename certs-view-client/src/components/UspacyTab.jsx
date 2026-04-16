import React from 'react';

const USPACY_BASE = 'https://ihive.uspacy.ua';

/**
 * Uspacy CRM embedded as iframe — fills remaining viewport height.
 *
 * Props:
 *   companyId  – numeric Uspacy company ID (optional).
 *                When provided, opens the specific company card directly.
 *                Falls back to the companies list if absent.
 */
export default function UspacyTab({ companyId }) {
  const url = companyId
    ? `${USPACY_BASE}/crm/companies/${companyId}`
    : `${USPACY_BASE}/crm/companies`;

  return (
    <iframe
      key={url}   /* remount when the URL changes so the new page loads */
      src={url}
      title="Uspacy"
      style={{
        display: 'block',
        width: '100%',
        height: 'calc(100vh - 104px)',
        minHeight: 500,
        border: 'none',
      }}
      allow="autoplay; microphone; camera; geolocation; clipboard-write"
      sandbox="allow-downloads allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-storage allow-modals allow-presentation"
    />
  );
}
