import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken, streamChat } from '../api/client';
import AppShell from '../components/AppShell';
import MarkdownContent from '../components/MarkdownContent';

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

const STAGE_LABELS: Record<string, string> = {
  understanding: 'Understanding your question…',
  tools: 'Checking HR records…',
  composing: 'Writing your answer…',
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, statusText, busy]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
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

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  const lastAssistant =
    messages.length > 0 && messages[messages.length - 1].role === 'assistant'
      ? messages[messages.length - 1]
      : null;

  return (
    <AppShell title="HR Helpdesk Assistant" subtitle="Ask about leave, policies, and reimbursements">
      <div className="chat-panel">
        <div data-testid="message-list" className="message-list" role="log" aria-live="polite">
          {messages.length === 0 && (
            <div className="empty-state">
              <h2>How can I help?</h2>
              <p>Ask an HR question, or start with one of these:</p>
              <div className="suggestion-grid">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} type="button" className="suggestion-chip" onClick={() => void send(q)} disabled={busy}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isPendingAssistant = m.role === 'assistant' && i === messages.length - 1 && busy;
            const showStatus = isPendingAssistant && !m.content;
            return (
              <div key={i} className={`message-row ${m.role}`}>
                <article className={`bubble ${m.role}`} aria-label={m.role === 'user' ? 'Your message' : 'Assistant message'}>
                  <span className="bubble-label">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                  {showStatus ? (
                    <p className="status-line">{statusText || '…'}</p>
                  ) : m.content ? (
                    <MarkdownContent content={m.content} />
                  ) : (
                    <p className="status-line">…</p>
                  )}
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <p className="tools-used">
                      Tools used: {m.toolsUsed.map((t) => `${t.name}${t.ok ? '' : ' (failed)'}`).join(', ')}
                    </p>
                  )}
                  {isPendingAssistant && m.content && statusText && (
                    <p className="status-line" style={{ marginTop: 8 }}>
                      {statusText}
                    </p>
                  )}
                </article>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          {lastAssistant?.followUps && lastAssistant.followUps.length > 0 && !busy && (
            <div className="follow-ups">
              {lastAssistant.followUps.map((f) => (
                <button key={f} type="button" className="follow-up-chip" onClick={() => void send(f)}>
                  {f}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}

          <div className="composer-row">
            <textarea
              className="composer-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask an HR question…"
              rows={1}
              aria-label="Message"
            />
            <button type="submit" className="send-btn" disabled={busy || !input.trim()}>
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
