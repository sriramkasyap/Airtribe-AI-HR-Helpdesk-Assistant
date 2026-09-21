import { useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken, streamChat } from '../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: Array<{ name: string; ok: boolean }>;
  followUps?: string[];
}

const SUGGESTED_QUESTIONS = [
  'How many casual leaves do I have left?',
  'What is the remote work policy?',
  'Show my reimbursement status',
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const STAGE_LABELS: Record<string, string> = {
    understanding: 'Understanding your question…',
    tools: 'Checking HR records…',
    composing: 'Writing your answer…',
  };

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setError(null);
    setStatusText(STAGE_LABELS.understanding);
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    try {
      await streamChat(
        { message: text, ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}) },
        {
          onSessionId: (sid) => {
            sessionIdRef.current = sid;
          },
          onStatus: (stage) => setStatusText(STAGE_LABELS[stage] ?? stage),
          onToken: (content) =>
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + content };
              }
              return copy;
            }),
          onTool: (name, ok) =>
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = {
                  ...last,
                  toolsUsed: [...(last.toolsUsed ?? []), { name, ok }],
                };
              }
              return copy;
            }),
          onSuggestions: (items) =>
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant') {
                copy[copy.length - 1] = { ...last, followUps: items };
              }
              return copy;
            }),
        },
      );
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        clearToken();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setBusy(false);
      setStatusText(null);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function logout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  const lastAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'
    ? messages[messages.length - 1]
    : null;

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>HR Helpdesk Assistant</h1>
        <button onClick={logout}>Log out</button>
      </header>

      <div
        data-testid="message-list"
        style={{ border: '1px solid #ccc', padding: 16, minHeight: 400, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#888' }}>
            <p>Ask an HR question to get started, or try one of these:</p>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <li key={q}>
                  <button
                    onClick={() => {
                      setInput(q);
                      void send();
                    }}
                    style={{ background: 'none', border: 'none', color: '#06c', cursor: 'pointer', padding: 0 }}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.map((m, i) => {
          const isPendingAssistant = m.role === 'assistant' && i === messages.length - 1 && busy;
          return (
            <div key={i}>
              <p style={{ margin: 0, fontWeight: m.role === 'user' ? 600 : 400 }}>
                {m.role === 'user' ? 'You: ' : 'Assistant: '}
                {m.content || (isPendingAssistant ? statusText || '…' : '…')}
              </p>
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
                  Tools used: {m.toolsUsed.map((t) => `${t.name}${t.ok ? '' : ' (failed)'}`).join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {lastAssistant?.followUps && lastAssistant.followUps.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {lastAssistant.followUps.map((f) => (
            <button
              key={f}
              onClick={() => {
                setInput(f);
                void send();
              }}
              style={{ margin: '0 8px 8px 0', padding: '4px 10px', cursor: 'pointer' }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask an HR question…"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={() => void send()} disabled={busy}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
