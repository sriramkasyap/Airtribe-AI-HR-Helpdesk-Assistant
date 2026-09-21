// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import { getToken, setToken, setRole } from './api/client';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppRoutes auth redirects', () => {
  it('stays on login after logout instead of looping with root', async () => {
    setToken('session-token');
    setRole('employee');

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /log out/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/employee id/i)).toBeTruthy();
    });

    // Must remain on login — the old bug bounced back to Chat via a stale getToken() element.
    expect(screen.queryByRole('button', { name: /log out/i })).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('redirects authenticated users away from /login', () => {
    setToken('session-token');
    setRole('employee');

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /log out/i })).toBeTruthy();
    expect(screen.queryByLabelText(/employee id/i)).toBeNull();
  });

  it('shows Policies nav for managers and hides it for employees', () => {
    setToken('session-token');
    setRole('manager');

    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /policies/i })).toBeTruthy();
    unmount();

    setRole('employee');
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /policies/i })).toBeNull();
  });

  it('redirects non-managers away from /policies', () => {
    setToken('session-token');
    setRole('employee');

    render(
      <MemoryRouter initialEntries={['/policies']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('message-list')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /^policies$/i })).toBeNull();
  });
});
