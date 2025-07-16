import React, { useState, useEffect } from 'react';
import SearchCerts from './components/SearchCerts';
import Login from './components/Login';
import Register from './components/Register';
import Header from './components/Header';
import config from './config/config.js';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    // Перевіряємо чи користувач вже авторизований
    const authStatus = localStorage.getItem(config.STORAGE_KEYS.IS_AUTHENTICATED);
    const savedUsername = localStorage.getItem(config.STORAGE_KEYS.USERNAME);
    
    if (authStatus === 'true' && savedUsername) {
      setIsAuthenticated(true);
      setUsername(savedUsername);
    }
  }, []);

  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setUsername(user);
    setShowRegister(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(config.STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(config.STORAGE_KEYS.USERNAME);
    localStorage.removeItem(config.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(config.STORAGE_KEYS.USER);
    setIsAuthenticated(false);
    setUsername('');
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
      <Header username={username} onLogout={handleLogout} />
      <SearchCerts />
    </div>
  );
}

export default App;
