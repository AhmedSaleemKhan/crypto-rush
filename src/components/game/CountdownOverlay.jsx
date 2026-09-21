export default function CountdownOverlay({ count }) {
  if (count == null) return null
  return (
    <div className="countdown-overlay">
      <div key={count} className="countdown-num">{count > 0 ? count : 'GO!'}</div>
      <style>{`
        .countdown-overlay {
          position: absolute; inset: 0; display: grid; place-items: center;
          pointer-events: none; z-index: 6;
        }
        .countdown-num {
          font-family: var(--font-display); font-weight: 900;
          font-size: clamp(64px, 16vw, 140px);
          color: var(--text-hi);
          text-shadow: 0 0 40px var(--magenta), 0 0 80px var(--magenta-soft);
          animation: countdownPop 0.9s cubic-bezier(0.2, 0.8, 0.3, 1);
        }
        @keyframes countdownPop {
          0% { transform: scale(0.4); opacity: 0; }
          30% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
