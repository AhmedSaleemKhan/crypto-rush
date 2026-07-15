import { useEffect, useState, useCallback } from 'react'
import { formatEther } from 'ethers'
import { useWeb3 } from '../context/Web3Context'

export default function Stats() {
  const { contract, account, connect, contractAddress, explorerUrl } = useWeb3()
  const [stats, setStats] = useState(null)
  const [globalRaceId, setGlobalRaceId] = useState(0)
  const [entryFee, setEntryFee] = useState(0n)

  const load = useCallback(async () => {
    if (!contract) return
    const [rid, fee] = await Promise.all([contract.currentRaceId(), contract.entryFee()])
    setGlobalRaceId(Number(rid))
    setEntryFee(fee)
    if (account) {
      const s = await contract.getPlayerStats(account)
      setStats(s)
    }
  }, [contract, account])

  useEffect(() => { load() }, [load])

  const winRate = stats && Number(stats.racesJoinedCount) > 0
    ? ((Number(stats.winsCount) / Number(stats.racesJoinedCount)) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="page stats">
      <div className="page-head">
        <div>
          <div className="eyebrow">DASHBOARD</div>
          <h1>Statistics</h1>
        </div>
        {!account && <button className="glow-btn" onClick={connect}>Connect Wallet</button>}
      </div>

      <div className="stat-grid">
        <StatCard label="Total races on-chain" value={globalRaceId > 0 ? globalRaceId - 1 : 0} />
        <StatCard label="Current entry fee" value={`${entryFee ? formatEther(entryFee) : '—'} AVAX`} />
        <StatCard label="Your races joined" value={stats ? stats.racesJoinedCount.toString() : '—'} />
        <StatCard label="Your wins" value={stats ? stats.winsCount.toString() : '—'} />
        <StatCard label="Your win rate" value={`${winRate}%`} />
        <StatCard label="Unclaimed rewards" value={`${stats ? Number(formatEther(stats.claimable)).toFixed(4) : '0.0000'} AVAX`} />
      </div>

      <div className="glass-card contract-card">
        <div className="eyebrow">DEPLOYED CONTRACT</div>
        <div className="contract-addr mono">{contractAddress || 'Set VITE_CONTRACT_ADDRESS in your .env'}</div>
        {contractAddress && (
          <a
            className="glow-btn ghost explorer-link"
            href={`${explorerUrl}/address/${contractAddress}`}
            target="_blank" rel="noreferrer"
          >
            View on Snowtrace ↗
          </a>
        )}
      </div>

      <style>{`
        .page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        @media (max-width: 760px) { .stat-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px) { .stat-grid { grid-template-columns: 1fr; } }
        .contract-card { padding: 22px; }
        .contract-addr { font-size: 13px; margin-top: 8px; color: var(--text-mid); word-break: break-all; }
        .mono { font-family: var(--font-mono); }
        .explorer-link { display: inline-block; margin-top: 14px; }
      `}</style>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="glass-card stat-card">
      <div className="eyebrow">{label}</div>
      <div className="stat-value">{value}</div>
      <style>{`
        .stat-card { padding: 20px; }
        .stat-value { font-family: var(--font-display); font-size: 22px; margin-top: 8px; }
      `}</style>
    </div>
  )
}
