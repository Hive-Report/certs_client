import React, { useState } from 'react';
import { Container, Image, Button, Navbar, Nav } from 'react-bootstrap';

const Header = ({ username, avatarUrl, onLogout }) => {
  const [avatarError, setAvatarError] = useState(false);

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
    <Navbar
      expand="lg"
      fluid
      className="shadow-sm border-bottom bg-white"
      style={{ width: 'auto', padding: '0rem 2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
        {/* Left block */}
        <Navbar.Brand
          href="/"
          className="d-flex align-items-center gap-3"
          style={{ color: '#1f2937', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '0.5px' }}
        >
          <Image
          href="/"
          src="/hive_logo.jpg" 
          alt="Hive Report" 
          thumbnail
          rounded
          height={100}
          width={100}
          style={{ objectFit: 'contain' }}
        />
        </Navbar.Brand>
        <Navbar.Toggle />
        {/* Right block */}
        <Navbar.Collapse className="d-flex align-items-center gap-3">
          <Navbar.Text style={{ color: '#374151', fontWeight: 500, fontSize: '1.05rem', marginRight: 8 }}>
            {username}
          </Navbar.Text>
          {!avatarUrl || avatarError ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, backgroundColor: '#e5e7eb', borderRadius: '50%', objectFit: 'cover' }}>
              <span style={{ color: '#6b7280', fontSize: 20 }}>:)</span>
            </div>
          ) : (
            <Image
              src={avatarUrl}
              roundedCircle
              height={40}
              width={40}
              onError={() => setAvatarError(true)}
              style={{ objectFit: 'cover', background: '#eee', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            />
          )}
          <Button 
            variant="warning" 
            size="sm" 
            style={{ fontWeight: 500, marginLeft: 12 }} 
            onClick={handleLogout}
          >
            Вихід
          </Button>
        </Navbar.Collapse>
    </Navbar>
  );
};

export default Header;
