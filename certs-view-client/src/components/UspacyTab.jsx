import React, { useState } from 'react';

const BRAND = '#32C48D';

/**
 * Tabbed interface with Uspacy CRM embedded as iframe
 */
export default function UspacyTab({ edrpou }) {
  const [activeTab, setActiveTab] = useState('data');

  // Build Uspacy URL with search parameter
  const getUspacyURL = () => {
    const baseURL = 'https://ihive.uspacy.ua/';
    if (!edrpou) return baseURL;
    // Try to add search parameter
    return `${baseURL}?search=${encodeURIComponent(edrpou)}`;
  };

  const USPACY_URL = getUspacyURL();

  return (
    <div style={{ marginTop: 24 }}>
      {/* Tab buttons */}
      <div style={{
        display: 'flex', gap: 0,
        border: `1px solid #e5e7eb`, borderRadius: '8px 8px 0 0',
        overflow: 'hidden', backgroundColor: '#fff',
      }}>
        <button
          onClick={() => setActiveTab('data')}
          style={{
            flex: 1, padding: '12px 16px', border: 'none',
            backgroundColor: activeTab === 'data' ? BRAND : '#f9fafb',
            color: activeTab === 'data' ? '#fff' : '#6b7280',
            fontWeight: activeTab === 'data' ? 600 : 400,
            cursor: 'pointer', fontSize: 14,
            borderRight: '1px solid #e5e7eb',
            transition: 'all 0.15s',
          }}
        >
          📋 Дані
        </button>
        <button
          onClick={() => setActiveTab('uspacy')}
          style={{
            flex: 1, padding: '12px 16px', border: 'none',
            backgroundColor: activeTab === 'uspacy' ? BRAND : '#f9fafb',
            color: activeTab === 'uspacy' ? '#fff' : '#6b7280',
            fontWeight: activeTab === 'uspacy' ? 600 : 400,
            cursor: 'pointer', fontSize: 14,
            transition: 'all 0.15s',
          }}
        >
          🌐 Uspacy CRM
        </button>
      </div>

      {/* Tab content */}
      <div style={{
        border: '1px solid #e5e7eb', borderTop: 'none',
        borderRadius: '0 0 8px 8px', backgroundColor: '#fff',
        overflow: 'hidden',
      }}>
        {/* Data tab - message to scroll up */}
        {activeTab === 'data' && (
          <div style={{
            padding: '24px', textAlign: 'center', color: '#6b7280',
            minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>📊 Дані показані вище</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                Ліцензії та сертифікати знаходяться у верхній частині сторінки
              </div>
            </div>
          </div>
        )}

        {/* Uspacy tab - iframe */}
        {activeTab === 'uspacy' && (
          <div style={{ width: '100%', minHeight: '600px' }}>
            <iframe
              src={USPACY_URL}
              title="Uspacy CRM"
              style={{
                width: '100%', height: '600px', border: 'none',
                display: 'block',
              }}
              allow="autoplay; microphone; camera; geolocation; clipboard-write"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation allow-storage"
            />
            {edrpou && (
              <div style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                🔍 Пошук за ЄДРПОУ: <strong>{edrpou}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
