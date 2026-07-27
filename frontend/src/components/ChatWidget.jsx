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
      <div className="relative">
        {!open && (
          <div className="absolute -inset-1 rounded-full bg-crop opacity-30 blur animate-pulse" />
        )}
        <button
          onClick={toggle}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-crop text-white shadow-lg shadow-crop/40 hover:bg-moss transition-transform hover:scale-105"
          aria-label="Open chat"
        >
          <span className="text-xl">{open ? '✕' : '💬'}</span>
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-16 right-0 mt-2 w-80 rounded-2xl border border-border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-crop p-3 text-white rounded-t-2xl">
            <span className="font-bold tracking-tight">Farm Advisor</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center text-sm text-slate-500 py-4">Ask me anything about your farm data!</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`mb-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
                <span className={`inline-block max-w-[90%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${msg.role === 'user' ? 'bg-crop text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-earth rounded-tl-sm'}`}> 
                  {msg.content} 
                </span>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-slate-500 italic mb-2">Thinking...</div>
            )}
            {error && (
              <div className="text-sm text-red-600 mb-2">{error}</div>
            )}
          </div>
          <div className="border-t border-border bg-white p-3 rounded-b-2xl">
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-crop resize-none bg-slate-50 text-earth"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="mt-2 w-full rounded-xl bg-crop px-4 py-2 text-sm font-bold text-white hover:bg-moss disabled:opacity-50 transition-colors shadow-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
