import { useEffect, useRef, useState } from 'react'

function short(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}

function useCountUp(target, active, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    if (!active) { setValue(0); return }
    const start = performance.now()
    const from = 0
    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, active, duration])
  return value
}

export default function ResultsPodium({
  standings = [],
  playerPosition,
  chainResult,
  chainError,
  account,
  onClaim,
  claiming,
  claimStatus,
  claimed,
  onBackToLobby,
}) {
  const isWinner = chainResult && account && chainResult.winner.toLowerCase() === account.toLowerCase()
  const prizeNum = chainResult ? Number(chainResult.prizeFormatted) : 0
  const animatedPrize = useCountUp(prizeNum, !!isWinner)

  return (
    <div className="results-wrap">
      <div className="results-grid">
        <div className="glass-card race-position-card">
          <div className="eyebrow">YOUR RACE</div>
          <div className="finish-badge">P{playerPosition}<span>/{standings.length}</span></div>
          <ol className="standing-list">
            {standings.slice(0, 5).map((s) => (
              <li key={s.id} className={'standing-row' + (s.isPlayer ? ' me' : '')}>
                <span className="pos">P{s.position}</span>
                <span className="who">{s.isPlayer ? 'YOU' : short(s.label)}</span>
              </li>
            ))}
          </ol>
          <p className="hint-text">Your finishing order is your own driving — bragging rights only.</p>
        </div>

        <div className={'glass-card prize-card' + (isWinner ? ' winner' : '')}>
          <div className="eyebrow">🔗 ON-CHAIN PRIZE DRAW</div>

          {chainError && (
            <div className="chain-error">
              <p>The on-chain draw didn't confirm: {chainError}</p>
              <p className="hint-text">Your race entry is unaffected — try Start Engines again from the grid.</p>
            </div>
          )}

          {!chainError && !chainResult && (
            <div className="verifying">
              <div className="spinner" />
              <p>Verifying <code>WinnerPicked</code> on-chain…</p>
            </div>
          )}

          {!chainError && chainResult && isWinner && (
            <div className="winner-panel">
              <div className="winner-title">🏆 YOU WON!</div>
              <div className="prize-amount">{animatedPrize.toFixed(4)} <span>AVAX</span></div>
              <p className="hint-text">Prize credited to your claimable rewards — verified by the contract's WinnerPicked event.</p>
              <button className="glow-btn" disabled={claiming || claimed} onClick={onClaim}>
                {claimed ? 'Claimed ✓' : claiming ? 'Claiming…' : 'Claim Rewards'}
              </button>
              {claimStatus && <div className="status-line">{claimStatus}</div>}
            </div>
          )}

          {!chainError && chainResult && !isWinner && (
            <div className="loser-panel">
              <div className="winner-title dim">Race Resolved</div>
              <p>Winner <span className="mono">{short(chainResult.winner)}</span> took the pot:</p>
              <div className="prize-amount dim">{Number(chainResult.prizeFormatted).toFixed(4)} <span>AVAX</span></div>
              <p className="hint-text">Better luck on the next pool — your entry rolls into race history.</p>
            </div>
          )}
        </div>
      </div>

      <div className="results-actions">
        <button className="glow-btn cyan" onClick={onBackToLobby}>Back to Grid</button>
      </div>

      <style>{`
        .results-wrap { padding: 4px; }
        .results-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 18px; }
        @media (max-width: 760px) { .results-grid { grid-template-columns: 1fr; } }
        .race-position-card, .prize-card { padding: 26px; }
        .finish-badge {
          font-family: var(--font-display); font-size: 40px; margin: 10px 0 16px; color: var(--text-hi);
        }
        .finish-badge span { font-size: 18px; color: var(--text-low); }
        .standing-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .standing-row { display: flex; gap: 10px; padding: 7px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); font-size: 13px; }
        .standing-row.me { background: rgba(255,46,166,0.14); color: var(--text-hi); font-weight: 700; }
        .standing-row .pos { color: var(--cyan); font-family: var(--font-mono); width: 26px; }
        .hint-text { color: var(--text-low); font-size: 12px; margin-top: 14px; line-height: 1.5; }
        .prize-card { position: relative; overflow: hidden; }
        .prize-card.winner { border-color: rgba(255,200,87,0.5); box-shadow: 0 0 40px rgba(255,200,87,0.15); }
        .verifying { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px 0; color: var(--text-mid); }
        .spinner {
          width: 32px; height: 32px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.15); border-top-color: var(--cyan);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .chain-error { color: var(--danger); font-size: 13.5px; line-height: 1.6; }
        .winner-panel, .loser-panel { text-align: center; padding: 8px 0; }
        .winner-title { font-family: var(--font-display); font-size: 20px; color: var(--gold); margin-bottom: 8px; }
        .winner-title.dim { color: var(--text-hi); }
        .prize-amount { font-family: var(--font-display); font-size: 34px; color: var(--gold); margin: 10px 0; }
        .prize-amount span { font-size: 15px; color: var(--text-low); }
        .prize-amount.dim { font-size: 24px; color: var(--text-mid); }
        .mono { font-family: var(--font-mono); color: var(--text-hi); }
        .status-line { margin-top: 12px; color: var(--cyan); font-size: 13px; font-family: var(--font-mono); }
        .results-actions { display: flex; justify-content: center; margin-top: 22px; }
      `}</style>
    </div>
  )
}
