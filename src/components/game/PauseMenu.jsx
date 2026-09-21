export default function PauseMenu({ onResume, onStop }) {
  return (
    <div className="pause-overlay">
      <div className="pause-card glass-card">
        <div className="eyebrow">PAUSED</div>
        <h2>Take a breath</h2>
        <div className="pause-actions">
          <button className="glow-btn cyan" onClick={onResume}>Resume Race</button>
          <button className="glow-btn ghost" onClick={onStop}>Stop &amp; See Results</button>
        </div>
        <p className="pause-hint">Press <kbd>P</kbd> or <kbd>Esc</kbd> to resume</p>
      </div>
      <style>{`
        .pause-overlay {
          position: absolute; inset: 0; z-index: 8;
          display: grid; place-items: center;
          background: rgba(5,3,12,0.6); backdrop-filter: blur(6px);
        }
        .pause-card { padding: 32px 36px; text-align: center; min-width: 280px; }
        .pause-card h2 { font-size: 22px; margin: 10px 0 22px; }
        .pause-actions { display: flex; flex-direction: column; gap: 12px; }
        .pause-hint { margin: 18px 0 0; font-size: 12px; color: var(--text-low); }
        .pause-hint kbd {
          font-family: var(--font-mono); background: rgba(255,255,255,0.08);
          padding: 2px 6px; border-radius: 4px; border: 1px solid var(--line);
        }
      `}</style>
    </div>
  )
}
