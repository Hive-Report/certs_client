import React, { useEffect, useRef } from 'react';
import config from '../config/config.js';
import authService from '../services/authService.js';

const GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;

const GoogleLoginButton = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.accounts && window.google.accounts.id && buttonRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        // auto_select: true enables silent One Tap sign-in when possible.
        auto_select: true,
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
      // Exchange the short-lived Google ID token for a 7-day backend JWT.
      // authService stores the JWT (and its expiry) in localStorage.
      const data = await authService.exchangeGoogleToken(response.credential);
      onSuccess(data.user);
    } catch (err) {
      onError(err.message || 'Google login failed');
    }
  };

  return <div ref={buttonRef}></div>;
};

export default GoogleLoginButton;
