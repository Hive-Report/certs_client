import React, { useState } from 'react';
import apiService from '../services/apiService.js';
import config from '../config/config.js';

const Login = ({ onLogin, onShowRegister }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiService.login(credentials);

      if (data.success) {
        localStorage.setItem(config.STORAGE_KEYS.IS_AUTHENTICATED, 'true');
        localStorage.setItem(config.STORAGE_KEYS.USERNAME, data.user.username);
        localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, data.token);
        localStorage.setItem(config.STORAGE_KEYS.USER, JSON.stringify(data.user));
        onLogin(data.user.username);
      } else {
        setError(data.error || 'Помилка авторизації');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Помилка з\'єднання з сервером');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white inline-block mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Вхід до системи</h1>
            <p className="text-gray-600">Пошук сертифікатів електронного підпису</p>
          </div>

          {/* Форма логіну */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Логін
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Введіть логін"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Введіть пароль"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Вхід...
                </div>
              ) : (
                'Увійти'
              )}
            </button>
          </form>

          {/* Реєстрація */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Немає акаунту?{' '}
              <button
                onClick={onShowRegister}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Зареєструватися
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
