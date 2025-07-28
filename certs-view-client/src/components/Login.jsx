import React, { useState } from 'react';
import GoogleLoginButton from './GoogleLoginButton.jsx';
import config from '../config/config.js';
import { Container, Card, Alert, Image } from 'react-bootstrap';

const Login = ({ onLogin, onShowRegister }) => {
  const [error, setError] = useState("");

  const handleGoogleSuccess = (user) => {
    localStorage.setItem(config.STORAGE_KEYS.IS_AUTHENTICATED, "true");
    localStorage.setItem(config.STORAGE_KEYS.USERNAME, user.username || user.email);
    localStorage.setItem(config.STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem('avatarUrl', user.picture || "");
    if (typeof onLogin === "function") onLogin(user.username || user.email, user.picture || "");
  };

  const handleGoogleError = (error) => {
    setError(error);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container className="d-flex flex-column align-items-center justify-content-center" style={{ padding: '2rem', maxWidth: '100%' }}>
      <Card style={{ background: '#fff', padding: '2.5rem 2rem', borderRadius: 20, boxShadow: '0 6px 32px rgba(0,0,0,0.10)', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <Card.Body>
          <div className="text-center mb-4">
            <div className="mb-3 d-flex justify-content-center align-items-center" style={{ gap: '32px' }}>
              <Image
                src="/hive_logo.jpg"
                alt="Hive Report"
                thumbnail
                rounded
                height={100}
                width={100}
                style={{ objectFit: 'contain', marginRight: '40px' }}
              />
              <Image
                src="/acsk_logo.png"
                alt="ACSK Logo"
                thumbnail
                rounded
                height={80}
                width={80}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <Card.Title as="h1" className="mb-2" style={{ fontSize: '2rem', fontWeight: 'bold' }}>Вхід до системи</Card.Title>
            <Card.Text className="text-muted">Пошук сертифікатів електронного підпису</Card.Text>
          </div>
          <div
            className="mb-3"
            style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '3rem' }}
          >
            {window.google ? (
              <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            ) : (
              <div className="text-danger" style={{ fontSize: '1rem', fontWeight: 500, marginTop: 24 }}>
                Не вдалося завантажити кнопку входу Google.<br />Будь ласка, перезавантажте сторінку!
              </div>
            )}
          </div>
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
    </div>
  );
};

export default Login;
