// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  login: vi.fn(),
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  authHeader: vi.fn(() => ({})),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Login />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login', () => {
  it('renders the employee ID form', () => {
    renderLogin();
    expect(screen.getByLabelText(/employee id/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('calls login with the entered employee ID', async () => {
    (client.login as ReturnType<typeof vi.fn>).mockResolvedValue({ token: 't', expiresAt: 1 });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: 'emp1' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(client.login).toHaveBeenCalledWith('emp1'));
  });

  it('shows the error message when login fails', async () => {
    (client.login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid employee ID'));
    renderLogin();
    fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Invalid employee ID/);
  });
});
