import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { clearToken, getRole } from '../api/client';

export default function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const isManager = getRole() === 'manager';

  function logout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-page">
      <header className="app-header">
        <div className="chat-brand">
          <Link to="/" className="brand-link">
            <h1>{title}</h1>
          </Link>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="header-actions">
          <nav className="app-nav" aria-label="Main">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Chat
            </NavLink>
            {isManager && (
              <NavLink
                to="/policies"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Policies
              </NavLink>
            )}
          </nav>
          <button type="button" className="ghost-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
