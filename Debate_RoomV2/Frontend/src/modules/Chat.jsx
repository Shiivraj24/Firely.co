import React, { useState } from 'react';

export default function Chat({ messages, onSend, onClose }) {
  const [input, setInput] = useState('');

  const handleSend = e => {
    e.preventDefault();
    if (!input.trim()) return;
    if (onSend) {
      onSend(input.trim());
    }
    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span>Chat</span>
        <button onClick={onClose}>×</button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="message">
            <div className="sender">{msg.senderName}</div>
            <div className="content">{msg.message}</div>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={e => e.key === 'Enter' && handleSend(e)}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
