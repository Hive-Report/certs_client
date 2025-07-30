import React, { useState } from 'react';
import { Image, Button, Navbar, Container } from 'react-bootstrap';

const Header = ({ username, avatarUrl, onLogout }) => {
  const [avatarError, setAvatarError] = useState(false);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    <Navbar
      expand="lg"
      bg="white"
      variant="light"
      className="shadow-sm border-bottom"
      style={{ minHeight: 64 }}
    >
      <Container fluid style={{ padding: '0 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left section: logo */}
        <Navbar.Brand href="/" className="d-flex align-items-center gap-3" style={{ fontWeight: 600, fontSize: '1.25rem', color: '#1f2937' }}>
          <Image
            src="/hive_logo.jpg"
            alt="Hive Report"
            rounded
            height={64}
            width={64}
            style={{ objectFit: 'contain' }}
          />
          <span>Hive Report</span>
        </Navbar.Brand>

        {/* Right section: username, avatar, logout button */}
        <div className="d-flex align-items-center gap-3">
          <Navbar.Text style={{ color: '#374151', fontWeight: 500, fontSize: '1.1rem' }}>
            {username}
          </Navbar.Text>

          {!avatarUrl || avatarError ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                backgroundColor: '#e5e7eb',
                borderRadius: '50%',
                color: '#6b7280',
                fontSize: 24,
                userSelect: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
            >
              {/* fallback emoji або іконка */}
              🙂
            </div>
          ) : (
            <Image
              src={avatarUrl}
              roundedCircle
              height={40}
              width={40}
              onError={() => setAvatarError(true)}
              style={{ objectFit: 'cover', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
          )}

          <Button
            variant="warning"
            size="sm"
            style={{ fontWeight: 600 }}
            onClick={handleLogout}
            aria-label="Logout"
          >
            Вихід
          </Button>
        </div>
      </Container>
    </Navbar>
  );
};

export default Header;
