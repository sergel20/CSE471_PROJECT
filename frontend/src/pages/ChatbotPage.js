import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';

const WELCOME_MESSAGE = {
  role: 'assistant',
  text: "Hi! I'm the MediLab Connect support assistant. I can help with general questions about diagnostic tests, test preparation, your report status, and medicines. I'm not a doctor, so for diagnosis, treatment, or medication changes, please consult a qualified healthcare professional.",
};

const MAX_MESSAGE_LENGTH = 1000;

function ChatBubble({ role, text }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          isUser ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function ChatbotPage() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      setError(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setError('');
    setSending(true);

    try {
      const { data } = await apiClient.post('/chatbot/message', { message: text });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-gray-900">Support Assistant</h1>
        <p className="mt-2 text-sm text-gray-500">
          General information only — not a substitute for professional medical advice. For diagnosis,
          treatment, or medication changes, please consult a doctor or pharmacist.
        </p>
      </div>

      <div className="flex h-[65vh] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} role={msg.role} text={msg.text} />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
                Thinking...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-end gap-3 border-t border-gray-200 p-4">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about tests, preparation, reports, or medicines..."
            maxLength={MAX_MESSAGE_LENGTH}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-gray-300"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatbotPage;
