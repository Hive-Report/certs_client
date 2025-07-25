import React, { useEffect, useRef } from 'react';
import config from '../config/config.js';
import apiService from '../services/apiService.js';

const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;

const GoogleLoginButton = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.accounts && window.google.accounts.id && buttonRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(
        buttonRef.current,
        { theme: 'outline', size: 'large' }
      );
    }
    // Очищення при анмаунті
    return () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      // Зберігаємо Google ID Token у localStorage
      localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, response.credential);
      // Надсилаємо Google ID Token на бекенд
      const res = await apiService.postGoogleToken(response.credential);
      if (res.success) {
        onSuccess(res.user);
      } else {
        onError(res.error || 'Google login failed');
      }
    } catch (err) {
      onError('Network error');
    }
  };

  return <div ref={buttonRef}></div>;
};

export default GoogleLoginButton;
