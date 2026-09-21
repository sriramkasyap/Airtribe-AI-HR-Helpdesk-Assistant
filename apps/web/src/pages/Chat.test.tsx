// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Chat from './Chat';
import * as client from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    streamChat: vi.fn(),
  };
});

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
  vi.mocked(client.streamChat).mockImplementation(async (_body, handlers) => {
    handlers.onToken?.('You have **3** casual leaves left.');
    handlers.onSuggestions?.(['Check sick leave']);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderChat() {
  return render(
    <MemoryRouter>
      <Chat />
    </MemoryRouter>,
  );
}

describe('Chat UI', () => {
  it('shows distinct user and assistant bubbles with markdown', async () => {
    renderChat();

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'How many casual leaves?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Your message')).toBeTruthy();
      expect(screen.getByLabelText('Assistant message')).toBeTruthy();
    });

    expect(screen.getByLabelText('Your message').className).toContain('user');
    expect(screen.getByLabelText('Assistant message').className).toContain('assistant');
    expect(screen.getByText('3').tagName).toBe('STRONG');
  });

  it('sends a suggested question without relying on input state', async () => {
    renderChat();
    fireEvent.click(screen.getByRole('button', { name: /casual leaves/i }));

    await waitFor(() => {
      expect(client.streamChat).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'How many casual leaves do I have left?' }),
        expect.any(Object),
      );
    });
  });
});
