import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Image, Button, Navbar, Container } from 'react-bootstrap';

const BRAND_PRIMARY = '#32C48D';

const navLinkStyle = ({ isActive }) => ({
  display: 'inline-block',
  padding: '6px 14px',
  borderRadius: 8,
  fontWeight: 500,
  fontSize: '0.95rem',
  textDecoration: 'none',
  transition: 'background 0.15s, color 0.15s',
  backgroundColor: isActive ? BRAND_PRIMARY : 'transparent',
  color: isActive ? '#fff' : '#374151',
  cursor: 'pointer',
});

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
      style={{ minHeight: 64, borderBottom: `2px solid ${BRAND_PRIMARY}` }}
    >
      <Container fluid style={{ padding: '0 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left section: logo + navigation */}
        <div className="d-flex align-items-center gap-4">
          <Navbar.Brand href="/" className="d-flex align-items-center gap-3" style={{ fontWeight: 600, fontSize: '1.25rem', color: '#1f2937', textDecoration: 'none' }}>
            <Image
              src="/hive_logo.jpg"
              alt="Hive Report"
              rounded
              height={64}
              width={64}
              style={{ objectFit: 'contain' }}
            />
            <span style={{ color: BRAND_PRIMARY }}>Hive Report</span>
          </Navbar.Brand>

          <nav className="d-flex gap-1">
            <NavLink to="/overview" style={navLinkStyle}>
              🗂️ Зведений вигляд
            </NavLink>
            <NavLink to="/certs" style={navLinkStyle}>
              🔐 Сертифікати
            </NavLink>
            <NavLink to="/medoc_license" style={navLinkStyle}>
              🐝 Ліцензії M.E.Doc
            </NavLink>
          </nav>
        </div>

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
