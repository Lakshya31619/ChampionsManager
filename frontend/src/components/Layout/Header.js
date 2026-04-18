import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <h1>🏆 WWE <span>Champions</span> Roster Manager</h1>
        <div className="header-actions">
          <span className="user-info">Welcome, <strong>{user?.username}</strong></span>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;