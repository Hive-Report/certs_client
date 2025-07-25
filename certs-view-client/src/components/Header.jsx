import React from 'react';
import { Container, Image, Button } from 'react-bootstrap';

const Header = ({ username, avatarUrl, onLogout }) => {
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
    <header className="bg-white shadow-sm border-bottom" style={{ width: '100%', padding: 0 }}>
      <Container fluid style={{ maxWidth: 1200, padding: '0.5rem 2rem' }}>
        <div className="d-flex align-items-center justify-content-between" style={{ minHeight: 64 }}>
          <div className="d-flex align-items-center gap-3">
            <Image src="/hive_logo.jpg" alt="Hive Report" roundedCircle height={44} width={44} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
            <span style={{ color: '#1f2937', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '0.5px' }}>Пошук сертифікатів</span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span style={{ color: '#374151', fontWeight: 500, fontSize: '1.05rem', marginRight: 8 }}>{username}</span>
            {avatarUrl ? (
              <Image src={avatarUrl} alt="avatar" roundedCircle height={40} width={40} style={{ objectFit: 'cover', background: '#eee', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#6b7280', fontSize: 20 }}>?</span>
              </div>
            )}
            <Button variant="outline-danger" size="sm" style={{ fontWeight: 500, marginLeft: 12 }} onClick={handleLogout}>
              Вихід
            </Button>
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;
