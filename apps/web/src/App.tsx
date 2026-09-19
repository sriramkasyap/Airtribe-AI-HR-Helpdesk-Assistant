import React, { useState, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, `You: ${input}`]);
    const res = await fetch('/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer <token>' },
      body: JSON.stringify({ message: input, stream: true })
    });
    const reader = res.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setMessages(prev => [...prev, decoder.decode(value)]);
      }
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>HR Helpdesk Assistant</h1>
      <div style={{ border: '1px solid #ccc', padding: 16, minHeight: 400 }}>
        {messages.map((m, i) => <p key={i}>{m}</p>)}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask an HR question..." />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App;