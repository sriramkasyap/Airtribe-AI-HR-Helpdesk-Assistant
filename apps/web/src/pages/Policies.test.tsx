// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Policies from './Policies';
import { setRole, setToken } from '../api/client';

const store = new Map<string, string>();

const samplePolicy = {
  id: 'pol-test',
  title: 'Remote Work',
  category: 'remote_work',
  content: 'Employees may work remotely two days per week.',
  effectiveDate: '2024-01-01',
  isActive: true,
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
  setToken('mgr-token');
  setRole('manager');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Policies page', () => {
  it('lists policies and opens the create form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ success: true, data: [samplePolicy] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    render(
      <MemoryRouter>
        <Policies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Remote Work')).toBeTruthy();
    });
    expect(screen.getByText(/remote_work/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /add policy/i }));
    expect(screen.getByRole('heading', { name: /new policy/i })).toBeTruthy();
    expect(screen.getByLabelText(/title/i)).toBeTruthy();
  });

  it('creates a policy via the form', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { ...samplePolicy, id: 'pol-new', title: 'PTO Policy' },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ ...samplePolicy, id: 'pol-new', title: 'PTO Policy' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <Policies />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add policy/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /add policy/i }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'PTO Policy' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'leave' } });
    fireEvent.change(screen.getByLabelText(/content/i), {
      target: { value: 'Request PTO two weeks ahead.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create policy/i }));

    await waitFor(() => {
      expect(screen.getByText('PTO Policy')).toBeTruthy();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/policy',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
