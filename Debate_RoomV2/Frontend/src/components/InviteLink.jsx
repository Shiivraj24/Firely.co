import React from 'react';

export default function InviteLink({ roomId }) {
  if (!roomId) return null;
  const inviteURL = `${window.location.origin}?roomId=${roomId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteURL).catch(err => console.error('Copy failed', err));
  };

  return (
    <div className="invite-link">
      <input type="text" readOnly value={inviteURL} onFocus={e => e.target.select()} />
      <button onClick={copyLink}>Copy Link</button>
    </div>
  );
}
