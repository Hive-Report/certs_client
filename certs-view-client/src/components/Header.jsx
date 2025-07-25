import React from 'react';

const Header = ({ username, onLogout }) => {
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      onLogout();
    }
  };

  return (
    <header className="bg-white shadow border-b">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Лівий блок: логотип + заголовок */}
          <div className="flex items-center gap-3">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md text-white">
              <svg className="w-2 h-2" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-semibold text-gray-800">Пошук сертифікатів</h1>
              <p className="text-sm text-gray-500">Сертифікати електронного підпису</p>
            </div>
          </div>

          {/* Правий блок: профіль + кнопка виходу */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md">
              <svg className="w-2 h-2 text-gray-600" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm text-gray-700 font-medium">{username}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
            >
              <svg className="w-2 h-2" style={{ width: '8px', height: '8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Вихід</span>
            </button>
          </div>
        </div>
      </div>
    </header>

  );
};

export default Header;
