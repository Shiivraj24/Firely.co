import React from 'react';

export default function SpeakerQueue({
  queue,
  peers,
  isModerator,
  onMove,
  onStart,
  onAdd,
  onRemove,
}) {
  const getPeer = id => peers.find(p => p.id === id);
  const available = peers.filter(
    p => p.roleName === 'speaker' && !queue.includes(p.id)
  );

  return (
    <div className="speaker-queue">
      <h3>Speaker Queue</h3>
      <ol>
        {queue.map((id, idx) => {
          const peer = getPeer(id);
          if (!peer) return null;
          return (
            <li key={id}>
              {peer.name}
              {isModerator && (
                <>
                  <button onClick={() => onMove(idx, idx - 1)} disabled={idx === 0}>
                    ↑
                  </button>
                  <button
                    onClick={() => onMove(idx, idx + 1)}
                    disabled={idx === queue.length - 1}
                  >
                    ↓
                  </button>
                  <button onClick={() => onStart(id)}>Start</button>
                  <button onClick={() => onRemove(id)}>Remove</button>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {isModerator && available.length > 0 && (
        <>
          <h4>Add Speaker</h4>
          <ul>
            {available.map(p => (
              <li key={p.id}>
                {p.name} <button onClick={() => onAdd(p.id)}>Add</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
