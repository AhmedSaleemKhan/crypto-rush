import { useEffect, useState, useCallback } from 'react'
import { formatEther } from 'ethers'
import { useWeb3 } from '../context/Web3Context'

export default function Leaderboard() {
  const { contract } = useWeb3()
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!contract) return
    setLoading(true)
    try {
      const recent = await contract.getRecentRaces(25)
      setRaces(recent)
    } finally {
      setLoading(false)
    }
  }, [contract])

  useEffect(() => { load() }, [load])

  const tally = races.reduce((acc, r) => {
    acc[r.winner] = (acc[r.winner] || 0) + 1
    return acc
  }, {})
  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1])

  return (
    <div className="page leaderboard">
      <div className="page-head">
        <div>
          <div className="eyebrow">HALL OF WINNERS</div>
          <h1>Leaderboard</h1>
        </div>
        <button className="glow-btn ghost" onClick={load}>Refresh</button>
      </div>

      <div className="board-grid">
        <div className="glass-card ranked-card">
          <div className="eyebrow">TOP RACERS</div>
          {ranked.length === 0 && <p className="empty">No races resolved yet.</p>}
          <ol className="ranked-list">
            {ranked.slice(0, 10).map(([addr, count], i) => (
              <li key={addr} className="ranked-row">
                <span className={'rank rank-' + (i + 1)}>#{i + 1}</span>
                <span className="mono">{addr.slice(0, 8)}…{addr.slice(-6)}</span>
                <span className="win-count">{count} win{count > 1 ? 's' : ''}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="glass-card history-card">
          <div className="eyebrow">RECENT RACES</div>
          {loading && <p className="empty">Loading race history…</p>}
          {!loading && races.length === 0 && <p className="empty">No races yet — go start one.</p>}
          <div className="history-list">
            {races.map((r) => (
              <div className="history-row" key={r.raceId.toString()}>
                <span className="mono race-id">#{r.raceId.toString()}</span>
                <span className="mono winner">{r.winner.slice(0, 6)}…{r.winner.slice(-4)}</span>
                <span className="prize">{formatEther(r.prize)} AVAX</span>
                <span className="players">{r.playerCount.toString()} racers</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .board-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 18px; }
        @media (max-width: 800px) { .board-grid { grid-template-columns: 1fr; } }
        .ranked-card, .history-card { padding: 24px; }
        .ranked-list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .ranked-row { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.03); font-size: 13.5px; }
        .rank { font-family: var(--font-display); font-size: 13px; width: 30px; color: var(--text-mid); }
        .rank-1 { color: var(--gold); }
        .rank-2 { color: #d8d8e6; }
        .rank-3 { color: #d59a63; }
        .win-count { margin-left: auto; font-family: var(--font-mono); color: var(--cyan); font-size: 12px; }
        .mono { font-family: var(--font-mono); }
        .history-list { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto; }
        .history-row {
          display: grid; grid-template-columns: 50px 1fr auto auto; align-items: center; gap: 12px;
          font-size: 13px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.03);
        }
        .race-id { color: var(--text-low); }
        .winner { color: var(--text-hi); }
        .prize { color: var(--gold); font-family: var(--font-mono); }
        .players { color: var(--text-mid); font-size: 11.5px; }
        .empty { color: var(--text-low); font-size: 13.5px; margin-top: 14px; }
      `}</style>
    </div>
  )
}
