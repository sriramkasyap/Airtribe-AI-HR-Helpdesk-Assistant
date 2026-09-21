import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import {
  clearToken,
  createPolicy,
  deletePolicy,
  listPolicies,
  updatePolicy,
  type HRPolicy,
  type PolicyInput,
} from '../api/client';

const EMPTY_FORM: PolicyInput & { isActive: boolean; effectiveDate: string } = {
  title: '',
  category: '',
  content: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  isActive: true,
};

export default function Policies() {
  const [policies, setPolicies] = useState<HRPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPolicies(await listPolicies());
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        clearToken();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(policy: HRPolicy) {
    setEditingId(policy.id);
    setForm({
      title: policy.title,
      category: policy.category,
      content: policy.content,
      effectiveDate: policy.effectiveDate.slice(0, 10),
      isActive: policy.isActive,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload: PolicyInput = {
        title: form.title.trim(),
        category: form.category.trim(),
        content: form.content.trim(),
        effectiveDate: form.effectiveDate,
        isActive: form.isActive,
      };
      if (editingId) {
        await updatePolicy(editingId, payload);
      } else {
        await createPolicy(payload);
      }
      cancelForm();
      await load();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        clearToken();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(policy: HRPolicy) {
    if (!window.confirm(`Delete policy “${policy.title}”? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deletePolicy(policy.id);
      if (editingId === policy.id) cancelForm();
      await load();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        clearToken();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="HR Helpdesk Assistant" subtitle="Manage HR policies">
      <div className="policies-panel">
        <div className="policies-toolbar">
          <h2>Policies</h2>
          {!showForm && (
            <button type="button" className="send-btn" onClick={startCreate} disabled={busy}>
              Add policy
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}

        {showForm && (
          <form className="policy-form" onSubmit={handleSubmit}>
            <h3>{editingId ? 'Edit policy' : 'New policy'}</h3>
            <label htmlFor="policy-title">Title</label>
            <input
              id="policy-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <label htmlFor="policy-category">Category</label>
            <input
              id="policy-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. leave, remote_work, conduct"
              required
            />
            <label htmlFor="policy-content">Content</label>
            <textarea
              id="policy-content"
              className="policy-content"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={8}
              required
            />
            <div className="policy-form-row">
              <div>
                <label htmlFor="policy-date">Effective date</label>
                <input
                  id="policy-date"
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  required
                />
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active
              </label>
            </div>
            <div className="policy-form-actions">
              <button type="submit" className="send-btn" disabled={busy}>
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create policy'}
              </button>
              <button type="button" className="ghost-btn" onClick={cancelForm} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="status-line">Loading policies…</p>
        ) : policies.length === 0 ? (
          <p className="status-line">No policies yet. Add one to get started.</p>
        ) : (
          <ul className="policy-list">
            {policies.map((p) => (
              <li key={p.id} className="policy-card">
                <div className="policy-card-head">
                  <div>
                    <h3>{p.title}</h3>
                    <p className="policy-meta">
                      <span className="policy-chip">{p.category}</span>
                      <span>{p.isActive ? 'Active' : 'Inactive'}</span>
                      <span>Effective {p.effectiveDate.slice(0, 10)}</span>
                      <span className="policy-id">{p.id}</span>
                    </p>
                  </div>
                  <div className="policy-card-actions">
                    <button type="button" className="ghost-btn" onClick={() => startEdit(p)} disabled={busy}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-btn danger-btn"
                      onClick={() => void handleDelete(p)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="policy-preview">{p.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
