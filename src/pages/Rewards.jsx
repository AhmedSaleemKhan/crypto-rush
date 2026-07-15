import { useEffect, useState, useCallback } from 'react'
import { formatEther } from 'ethers'
import { useWeb3 } from '../context/Web3Context'

export default function Rewards() {
  const { contract, account, connect, refreshBalance } = useWeb3()
  const [claimable, setClaimable] = useState(0n)
  const [wins, setWins] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  const load = useCallback(async () => {
    if (!contract || !account) return
    const stats = await contract.getPlayerStats(account)
    setClaimable(stats.claimable)
    setWins(Number(stats.winsCount))
  }, [contract, account])

  useEffect(() => { load() }, [load])

  async function claim() {
    if (!contract) return
    setBusy(true)
    setStatus(null)
    try {
      const tx = await contract.claimRewards()
      setStatus('Confirming claim…')
      await tx.wait()
      setStatus('Rewards sent to your wallet! 💸')
      await load()
      await refreshBalance()
    } catch (e) {
      setStatus(e?.shortMessage || e?.message || 'Transaction failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page rewards">
      <div className="page-head">
        <div>
          <div className="eyebrow">TREASURY</div>
          <h1>Rewards</h1>
        </div>
        {!account && <button className="glow-btn" onClick={connect}>Connect Wallet</button>}
      </div>

      <div className="reward-card glass-card">
        <div className="reward-ring">
          <svg viewBox="0 0 120 120" width="140" height="140">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52" fill="none" stroke="url(#g)" strokeWidth="10"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={claimable > 0n ? 2 * Math.PI * 52 * 0.18 : 2 * Math.PI * 52}
              strokeLinecap="round" transform="rotate(-90 60 60)"
            />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff2ea6" />
                <stop offset="100%" stopColor="#17e8d5" />
              </linearGradient>
            </defs>
          </svg>
          <div className="ring-value">
            <span className="mono">{claimable ? Number(formatEther(claimable)).toFixed(4) : '0.0000'}</span>
            <span className="unit">AVAX</span>
          </div>
        </div>

        <div className="reward-info">
          <p className="reward-desc">
            Winnings accumulate here every time you win a race. Claim any time —
            gas is the only cost.
          </p>
          <div className="reward-meta">
            <div><span className="eyebrow">Total wins</span><div className="meta-val">{wins}</div></div>
          </div>
          <button className="glow-btn" disabled={!account || busy || claimable === 0n} onClick={claim}>
            {busy ? 'Processing…' : 'Claim Rewards'}
          </button>
          {status && <div className="status-line">{status}</div>}
        </div>
      </div>

      <style>{`
        .page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .reward-card { display: flex; gap: 32px; align-items: center; padding: 30px; flex-wrap: wrap; }
        .reward-ring { position: relative; display: grid; place-items: center; }
        .ring-value { position: absolute; display: flex; flex-direction: column; align-items: center; }
        .ring-value .mono { font-family: var(--font-mono); font-size: 17px; color: var(--gold); }
        .ring-value .unit { font-size: 10px; color: var(--text-low); }
        .reward-info { flex: 1; min-width: 220px; }
        .reward-desc { color: var(--text-mid); max-width: 44ch; line-height: 1.5; margin: 0 0 16px; }
        .reward-meta { display: flex; gap: 24px; margin-bottom: 18px; }
        .meta-val { font-family: var(--font-display); font-size: 20px; margin-top: 4px; }
        .status-line { margin-top: 14px; color: var(--cyan); font-size: 13.5px; font-family: var(--font-mono); }
      `}</style>
    </div>
  )
}
