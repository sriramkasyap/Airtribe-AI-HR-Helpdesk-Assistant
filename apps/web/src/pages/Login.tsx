import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employeeId.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(employeeId.trim());
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>HR Helpdesk Assistant</h1>
      <p>Sign in with your employee ID.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="employeeId" style={{ display: 'block', marginBottom: 8 }}>
          Employee ID
        </label>
        <input
          id="employeeId"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="e.g. emp1"
          autoComplete="username"
          style={{ width: '100%', padding: 8, marginBottom: 12 }}
        />
        <button type="submit" disabled={busy} style={{ width: '100%', padding: 10 }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error && (
        <p role="alert" style={{ color: 'crimson', marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
