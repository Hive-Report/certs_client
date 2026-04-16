import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SearchCerts from './components/SearchCerts';
import SearchMedoc from './components/SearchMedoc';
import SearchAggregate from './components/SearchAggregate';
import SearchCertPayment from './components/SearchCertPayment';
import SearchBulk from './components/SearchBulk';
import Login from './components/Login';
import Register from './components/Register';
import Header from './components/Header';
import config from './config/config.js';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    // Перевіряємо чи користувач вже авторизований
    const authStatus = localStorage.getItem(config.STORAGE_KEYS.IS_AUTHENTICATED);
    const savedUsername = localStorage.getItem(config.STORAGE_KEYS.USERNAME);
    const savedAvatar = localStorage.getItem('avatarUrl');
    if (authStatus === 'true' && savedUsername) {
      setIsAuthenticated(true);
      setUsername(savedUsername);
      setAvatarUrl(savedAvatar || '');
    }
  }, []);

  // Якщо тихе оновлення токена не вдалося (Google-сесія завершена),
  // apiService надсилає цю подію — скидаємо стан і показуємо сторінку входу.
  useEffect(() => {
    const onSessionExpired = () => {
      setIsAuthenticated(false);
      setUsername('');
      setAvatarUrl('');
    };
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, []);

  const handleLogin = (user, avatar) => {
    setIsAuthenticated(true);
    setUsername(user);
    setAvatarUrl(avatar || '');
    setShowRegister(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(config.STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(config.STORAGE_KEYS.USERNAME);
    localStorage.removeItem(config.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(config.STORAGE_KEYS.USER);
    localStorage.removeItem('avatarUrl');
    setIsAuthenticated(false);
    setUsername('');
    setAvatarUrl('');
    setShowRegister(false);
  };

  const handleRegistrationSuccess = (user) => {
    if (user) {
      setIsAuthenticated(true);
      setUsername(user.username);
      setShowRegister(false);
    } else {
      setShowRegister(false);
    }
  };

  const handleShowRegister = () => {
    setShowRegister(true);
  };

  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onRegistrationSuccess={handleRegistrationSuccess} />;
    }
    return <Login onLogin={handleLogin} onShowRegister={handleShowRegister} />;
  }

  return (
    <div className="App">
      <Header
        username={username}
        avatarUrl={avatarUrl}
        onLogout={handleLogout}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<SearchAggregate />} />
        <Route path="/certs" element={<SearchCerts />} />
        <Route path="/medoc_license" element={<SearchMedoc />} />
        <Route path="/cert-payments" element={<SearchCertPayment />} />
        <Route path="/bulk" element={<SearchBulk />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </div>
  );
}

export default App;
