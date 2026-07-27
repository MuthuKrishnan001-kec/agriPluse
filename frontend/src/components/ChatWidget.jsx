import React, { useState } from 'react';
import { api } from '../api';

export default function ChatWidget({ dataset, table }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', content: string}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggle = () => setOpen(!open);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const res = await api.sendChat(newHistory, dataset, table);
      const assistantMsg = { role: 'assistant', content: res.reply || '' };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setError(e.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Bubble button */}
      <button
        onClick={toggle}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-crop text-linen shadow-lg hover:bg-moss"
        aria-label="Open chat"
      >
        💬
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-2 w-80 rounded-lg border border-border/25 bg-linen shadow-xl">
          <div className="flex items-center justify-between bg-crop p-2 text-linen rounded-t-lg">
            <span className="font-semibold">Farm Advisor</span>
            <button onClick={toggle} className="text-linen hover:text-wheat">✕</button>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {messages.map((msg, i) => (
              <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                <span className={`inline-block max-w-full rounded px-2 py-1 ${msg.role === 'user' ? 'bg-crop text-linen' : 'bg-earth/10 text-earth'}`}> {msg.content} </span>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-earth/60 italic">Thinking...</div>
            )}
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
          </div>
          <div className="border-t border-border/25 p-2">
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question..."
              className="w-full rounded border border-border/25 p-1 text-sm focus:outline-none focus:ring-2 focus:ring-crop"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="mt-1 w-full rounded bg-crop px-3 py-1 text-sm text-linen hover:bg-moss disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
