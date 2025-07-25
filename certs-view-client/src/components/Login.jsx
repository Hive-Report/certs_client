import React, { useState } from 'react';
import GoogleLoginButton from './GoogleLoginButton.jsx';
import config from '../config/config.js';

const Login = ({ onLogin, onShowRegister }) => {
  const [error, setError] = useState("");

  const handleGoogleSuccess = (user) => {
    localStorage.setItem(config.STORAGE_KEYS.IS_AUTHENTICATED, "true");
    localStorage.setItem(config.STORAGE_KEYS.USERNAME, user.username || user.email);
    localStorage.setItem(config.STORAGE_KEYS.USER, JSON.stringify(user));
    if (typeof onLogin === "function") onLogin(user.username || user.email);
  };

  const handleGoogleError = (error) => {
    setError(error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white inline-block mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Вхід до системи</h1>
            <p className="text-gray-600">Пошук сертифікатів електронного підпису</p>
          </div>
          {/* Google Sign-In */}
          <div className="mt-6">
            <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
