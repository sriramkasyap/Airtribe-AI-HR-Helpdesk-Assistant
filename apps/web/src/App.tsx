import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import { getToken } from './api/client';

function RequireAuth({ children }: { children: ReactElement }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

/** Must be a route element so getToken() re-runs on navigation (not baked into App render). */
function GuestOnly({ children }: { children: ReactElement }) {
  if (getToken()) return <Navigate to="/" replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Chat />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
