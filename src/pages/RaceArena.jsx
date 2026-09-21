import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { formatEther } from 'ethers'
import { useWeb3 } from '../context/Web3Context'
import RaceCanvas from '../components/game/RaceCanvas'
import ResultsPodium from '../components/game/ResultsPodium'
import { getSelectedCarId } from '../game/carSelection'

function short(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}

function parseWinnerPicked(contract, receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log)
      if (parsed && parsed.name === 'WinnerPicked') return parsed.args
    } catch {
      // not one of our events — ignore
    }
  }
  return null
}

export default function RaceArena() {
  const { contract, account, connect, refreshBalance } = useWeb3()
  const [players, setPlayers] = useState([])
  const [entryFee, setEntryFee] = useState(0n)
  const [maxPlayers, setMaxPlayers] = useState(0)
  const [minPlayers, setMinPlayers] = useState(0)
  const [raceId, setRaceId] = useState(0)
  const [inRace, setInRace] = useState(false)
  const [cars, setCars] = useState([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [lastWinner, setLastWinner] = useState(null)

  const [screen, setScreen] = useState('lobby') // lobby | race | results
  const [launching, setLaunching] = useState(false)
  const [raceSnapshot, setRaceSnapshot] = useState(null)
  const [raceOutcome, setRaceOutcome] = useState(null)
  const [chainResult, setChainResult] = useState(null)
  const [chainError, setChainError] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [claimStatus, setClaimStatus] = useState(null)
  const [claimed, setClaimed] = useState(false)

  const load = useCallback(async () => {
    if (!contract) return
    const [p, fee, maxP, minP, rid, allCars] = await Promise.all([
      contract.getCurrentPlayers(),
      contract.entryFee(),
      contract.maxPlayers(),
      contract.minPlayers(),
      contract.currentRaceId(),
      contract.getAllCars(),
    ])
    setPlayers(p)
    setEntryFee(fee)
    setMaxPlayers(Number(maxP))
    setMinPlayers(Number(minP))
    setRaceId(Number(rid))
    setCars(allCars)
    if (account) setInRace(p.map((a) => a.toLowerCase()).includes(account.toLowerCase()))
  }, [contract, account])

  useEffect(() => {
    load()
    if (!contract) return
    const onJoined = () => load()
    const onWinner = (rId, winner, prize) => {
      setLastWinner({ winner, prize: formatEther(prize) })
    }
    contract.on('PlayerJoined', onJoined)
    contract.on('WinnerPicked', onWinner)
    return () => {
      contract.off('PlayerJoined', onJoined)
      contract.off('WinnerPicked', onWinner)
    }
  }, [contract, load])

  async function join() {
    if (!contract) return
    setBusy(true)
    setStatus(null)
    try {
      const tx = await contract.joinRace({ value: entryFee })
      setStatus('Confirming your entry on-chain…')
      await tx.wait()
      setStatus('You are on the grid! 🏁')
      await load()
      await refreshBalance()
    } catch (e) {
      setStatus(e?.shortMessage || e?.message || 'Transaction failed')
    } finally {
      setBusy(false)
    }
  }

  async function startEngines() {
    if (!contract || !account || !cars.length || launching) return
    setLaunching(true)
    setStatus(null)
    setChainError(null)
    setChainResult(null)
    setRaceOutcome(null)
    setClaimed(false)
    setClaimStatus(null)

    const roster = players
      .filter((p) => p.toLowerCase() !== account.toLowerCase())
      .map((address, i) => ({ address, colorIndex: i + 1 }))

    const carId = getSelectedCarId()
    let activeCarId = carId
    if (carId !== 0) {
      const owns = await contract.unlockedCars(account, carId).catch(() => false)
      if (!owns) activeCarId = 0
    }
    const statsSrc = cars[activeCarId] || cars[0]

    setRaceSnapshot({
      playerStats: {
        topSpeed: statsSrc.topSpeed,
        acceleration: statsSrc.acceleration,
        handling: statsSrc.handling,
        brake: statsSrc.brake,
      },
      playerCarIndex: activeCarId,
      playerVariant: activeCarId % 2,
      roster,
    })
    setScreen('race')

    try {
      const tx = await contract.startRace()
      const receipt = await tx.wait()
      const args = parseWinnerPicked(contract, receipt)
      if (args) {
        setChainResult({ winner: args.winner, prizeFormatted: formatEther(args.prize) })
      } else {
        setChainError('No WinnerPicked event found in the confirmed transaction.')
      }
    } catch (e) {
      setChainError(e?.shortMessage || e?.message || 'Transaction failed')
    } finally {
      setLaunching(false)
    }
  }

  function handleRaceFinish(result) {
    setRaceOutcome(result)
    setScreen('results')
  }

  async function backToGrid() {
    setScreen('lobby')
    setRaceSnapshot(null)
    await load()
    await refreshBalance()
  }

  async function claim() {
    if (!contract) return
    setClaiming(true)
    setClaimStatus(null)
    try {
      const tx = await contract.claimRewards()
      setClaimStatus('Confirming claim…')
      await tx.wait()
      setClaimStatus('Rewards sent to your wallet! 💸')
      setClaimed(true)
      await refreshBalance()
    } catch (e) {
      setClaimStatus(e?.shortMessage || e?.message || 'Transaction failed')
    } finally {
      setClaiming(false)
    }
  }

  const pot = entryFee && players.length ? formatEther(entryFee * BigInt(players.length)) : '0'
  const fillPct = maxPlayers ? Math.round((players.length / maxPlayers) * 100) : 0
  const canStart = !!account && !busy && !launching && inRace && players.length >= minPlayers

  return (
    <div className="page race">
      {screen === 'race' && raceSnapshot && createPortal(
        <div className="race-fullscreen">
          <RaceCanvas
            playerStats={raceSnapshot.playerStats}
            playerCarIndex={raceSnapshot.playerCarIndex}
            playerVariant={raceSnapshot.playerVariant}
            roster={raceSnapshot.roster}
            onFinish={handleRaceFinish}
          />
        </div>,
        document.body
      )}

      {screen === 'results' && raceOutcome && (
        <>
          <div className="page-head">
            <div>
              <div className="eyebrow">RACE #{raceId}</div>
              <h1>Results</h1>
            </div>
          </div>
          <ResultsPodium
            standings={raceOutcome.standings}
            playerPosition={raceOutcome.playerPosition}
            chainResult={chainResult}
            chainError={chainError}
            account={account}
            onClaim={claim}
            claiming={claiming}
            claimStatus={claimStatus}
            claimed={claimed}
            onBackToLobby={backToGrid}
          />
        </>
      )}

      {screen === 'lobby' && (
        <>
          <div className="page-head">
            <div>
              <div className="eyebrow">RACE #{raceId}</div>
              <h1>Race Arena</h1>
            </div>
            {!account && <button className="glow-btn" onClick={connect}>Connect Wallet</button>}
          </div>

          <div className="arena-grid">
            <div className="glass-card pool-card">
              <div className="pool-top">
                <div>
                  <div className="eyebrow">ENTRY FEE</div>
                  <div className="pool-fee">{entryFee ? formatEther(entryFee) : '—'} AVAX</div>
                </div>
                <div>
                  <div className="eyebrow">PRIZE POOL</div>
                  <div className="pool-fee gold">{pot} AVAX</div>
                </div>
              </div>

              <div className="fill-track">
                <div className="fill-bar" style={{ width: `${fillPct}%` }} />
              </div>
              <div className="fill-label">{players.length} / {maxPlayers} racers on the grid</div>

              <div className="grid-actions">
                <button className="glow-btn" disabled={!account || busy || inRace} onClick={join}>
                  {inRace ? 'Already in race' : busy ? 'Processing…' : 'Join Race'}
                </button>
                <button className="glow-btn cyan" disabled={!canStart} onClick={startEngines}>
                  {launching ? 'Starting…' : `Start Engines (${minPlayers}+ needed)`}
                </button>
              </div>
              {!inRace && account && (
                <p className="hint-text">Join the grid first, then start engines to drive the race yourself.</p>
              )}

              {status && <div className="status-line">{status}</div>}
              {lastWinner && (
                <div className="winner-line">
                  🏆 Last winner: <span className="mono">{short(lastWinner.winner)}</span> won {lastWinner.prize} AVAX
                </div>
              )}
            </div>

            <div className="glass-card players-card">
              <div className="eyebrow">ON THE GRID</div>
              {players.length === 0 && <p className="empty">No racers yet — be the first to join.</p>}
              <ul className="players-list">
                {players.map((p, i) => (
                  <li key={p + i} className="player-row">
                    <span className="pos">P{i + 1}</span>
                    <span className="mono">{short(p)}</span>
                    {account && p.toLowerCase() === account.toLowerCase() && <span className="you-tag">YOU</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      <style>{`
        .page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .arena-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
        @media (max-width: 800px) { .arena-grid { grid-template-columns: 1fr; } }
        .pool-card, .players-card { padding: 26px; }
        .pool-top { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
        .pool-fee { font-family: var(--font-display); font-size: 22px; margin-top: 6px; }
        .pool-fee.gold { color: var(--gold); }
        .fill-track { height: 10px; border-radius: 6px; background: rgba(255,255,255,0.07); overflow: hidden; }
        .fill-bar { height: 100%; background: linear-gradient(90deg, var(--cyan), var(--magenta)); transition: width 0.4s ease; }
        .fill-label { font-family: var(--font-mono); font-size: 12px; color: var(--text-mid); margin-top: 8px; }
        .grid-actions { display: flex; gap: 12px; margin-top: 22px; flex-wrap: wrap; }
        .hint-text { margin-top: 12px; font-size: 12px; color: var(--text-low); }
        .status-line { margin-top: 16px; color: var(--cyan); font-size: 13.5px; font-family: var(--font-mono); }
        .winner-line { margin-top: 12px; font-size: 13.5px; color: var(--gold); }
        .mono { font-family: var(--font-mono); }
        .players-list { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
        .player-row { display: flex; gap: 10px; align-items: center; font-size: 13px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); }
        .pos { font-family: var(--font-mono); color: var(--cyan); width: 26px; }
        .you-tag { margin-left: auto; font-family: var(--font-mono); font-size: 10px; color: var(--magenta); }
        .empty { color: var(--text-low); font-size: 13.5px; margin-top: 14px; }
        .race-fullscreen {
          position: fixed; inset: 0; z-index: 1000; background: #050310;
        }
      `}</style>
    </div>
  )
}
