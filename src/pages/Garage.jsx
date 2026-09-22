import { useEffect, useState, useCallback } from 'react'
import { formatEther } from 'ethers'
import { useWeb3 } from '../context/Web3Context'
import GarageViewer from '../components/game/GarageViewer'
import { getSelectedCarId, setSelectedCarId } from '../game/carSelection'

export default function Garage() {
  const { contract, account, connect, refreshBalance, contractAddress } = useWeb3()
  const [cars, setCars] = useState([])
  const [owned, setOwned] = useState({})
  const [selected, setSelected] = useState(() => getSelectedCarId())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  const load = useCallback(async () => {
    if (!contract) return
    const list = await contract.getAllCars()
    setCars(list)

    if (account) {
      const ownedMap = {}
      for (let i = 0; i < list.length; i++) {
        ownedMap[i] = await contract.unlockedCars(account, i)
      }
      setOwned(ownedMap)
    }
  }, [contract, account])

  useEffect(() => { load() }, [load])

  // Keep the selection valid once ownership data arrives — fall back to the
  // free starter car if whatever was saved locally isn't actually owned.
  useEffect(() => {
    if (!cars.length || !account) return
    const isOwned = selected === 0 || owned[selected]
    if (!isOwned) selectCar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cars, owned, account])

  function selectCar(i) {
    setSelected(i)
    setSelectedCarId(i)
  }

  async function buyCar(carId, price) {
    if (!contract) return
    setBusy(true)
    setStatus(null)
    try {
      const tx = await contract.buyCar(carId, { value: price })
      setStatus('Confirming transaction…')
      await tx.wait()
      setStatus('Car unlocked! 🎉')
      await load()
      await refreshBalance()
    } catch (e) {
      setStatus(e?.shortMessage || e?.message || 'Transaction failed')
    } finally {
      setBusy(false)
    }
  }

  async function unlockWithRewards(carId) {
    if (!contract) return
    setBusy(true)
    setStatus(null)
    try {
      const tx = await contract.unlockCarWithRewards(carId)
      setStatus('Confirming transaction…')
      await tx.wait()
      setStatus('Unlocked using your race winnings! 🏆')
      await load()
    } catch (e) {
      setStatus(e?.shortMessage || e?.message || 'Transaction failed')
    } finally {
      setBusy(false)
    }
  }

  const car = cars[selected]
  const isEquipped = (i) => i === selected

  return (
    <div className="page garage">
      <div className="page-head">
        <div>
          <div className="eyebrow">P1 CAR</div>
          <h1>Garage</h1>
        </div>
        {!account && <button className="glow-btn" onClick={connect}>Connect Wallet</button>}
      </div>

      <div className="showcase glass-card">
        <div className="stats-col">
          {car ? (
            <>
              <StatBar label="Top Speed" value={car.topSpeed} />
              <StatBar label="Acceleration" value={car.acceleration} />
              <StatBar label="Handling" value={car.handling} />
              <StatBar label="Brake" value={car.brake} />
            </>
          ) : (
            <p className="stats-placeholder">Connect your wallet to load live car stats from the contract.</p>
          )}
        </div>

        <div className="car-hero">
          <div className="car-name">{car ? car.name : 'Starter Car'}</div>
          <GarageViewer carIndex={selected} variant={selected % 2} height={280} />
          <div className="drag-hint">drag to spin</div>
        </div>

        <div className="buy-col">
          {!account ? (
            <button className="glow-btn" onClick={connect}>Connect Wallet</button>
          ) : !contractAddress ? (
            <div className="badge warn">NO CONTRACT CONFIGURED</div>
          ) : !car ? (
            <div className="badge">Loading…</div>
          ) : Number(car.price) === 0 ? (
            <div className="badge live">STARTER — FREE</div>
          ) : owned[selected] ? (
            <div className="badge live">OWNED</div>
          ) : (
            <>
              <div className="price-tag">{formatEther(car.price)} AVAX</div>
              <button
                className="glow-btn"
                disabled={busy}
                onClick={() => buyCar(selected, car.price)}
              >
                {busy ? 'Processing…' : `Buy ${formatEther(car.price)} AVAX`}
              </button>
              <button
                className="glow-btn cyan"
                disabled={busy}
                onClick={() => unlockWithRewards(selected)}
              >
                Unlock with winnings
              </button>
            </>
          )}

          {car && (Number(car.price) === 0 || owned[selected]) && (
            <button className="glow-btn ghost equip-btn" disabled>
              ✓ Equipped for racing
            </button>
          )}
        </div>
      </div>

      {status && <div className="status-line">{status}</div>}

      <div className="car-strip">
        {cars.map((c, i) => {
          const isOwned = i === 0 || owned[i]
          return (
            <button
              key={i}
              className={'car-chip' + (i === selected ? ' active' : '')}
              onClick={() => isOwned && selectCar(i)}
              disabled={!isOwned}
            >
              <span className="chip-emoji" style={{ background: chipColor(i) }} />
              <span className="chip-name">{c.name}</span>
              {isEquipped(i) && isOwned && <span className="chip-equipped">EQUIPPED</span>}
              {!isOwned && <span className="chip-lock">🔒 LOCKED</span>}
            </button>
          )
        })}
      </div>

      <style>{`
        .page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .showcase {
          display: grid; grid-template-columns: 200px 1fr 220px;
          align-items: center; gap: 20px;
          padding: 28px; min-height: 260px;
        }
        @media (max-width: 760px) { .showcase { grid-template-columns: 1fr; text-align: center; } }
        .stats-col { display: flex; flex-direction: column; gap: 16px; }
        .stat-row { display: flex; flex-direction: column; gap: 6px; }
        .stat-label { font-family: var(--font-mono); font-size: 11px; color: var(--text-mid); letter-spacing: 0.06em; }
        .car-hero { position: relative; display: flex; flex-direction: column; align-items: center; min-height: 200px; }
        .car-name {
          font-family: var(--font-display);
          font-size: 18px; letter-spacing: 0.04em; color: var(--text-hi);
          margin-bottom: 4px;
        }
        .drag-hint {
          font-family: var(--font-mono); font-size: 10.5px; color: var(--text-low);
          letter-spacing: 0.08em; text-transform: uppercase; margin-top: -6px;
        }
        .stats-placeholder { color: var(--text-low); font-size: 12.5px; line-height: 1.6; max-width: 22ch; }
        .buy-col { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
        @media (max-width: 760px) { .buy-col { align-items: center; } }
        .price-tag { font-family: var(--font-mono); color: var(--gold); font-size: 15px; }
        .equip-btn { opacity: 0.8; cursor: default; }
        .status-line { margin-top: 14px; color: var(--cyan); font-size: 13.5px; font-family: var(--font-mono); }
        .car-strip {
          margin-top: 26px; display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px;
        }
        .car-chip {
          flex-shrink: 0; width: 128px; padding: 14px 10px;
          border-radius: var(--radius-sm); border: 1px solid var(--line);
          background: rgba(255,255,255,0.03);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          color: var(--text-mid);
        }
        .car-chip:disabled { cursor: not-allowed; opacity: 0.7; }
        .car-chip.active { border-color: var(--magenta); box-shadow: 0 0 0 1px var(--magenta) inset, 0 8px 20px var(--magenta-soft); color: var(--text-hi); }
        .chip-emoji { width: 26px; height: 26px; border-radius: 50%; box-shadow: 0 0 12px currentColor; }
        .chip-name { font-size: 12px; font-weight: 600; text-align: center; }
        .chip-equipped { font-family: var(--font-mono); font-size: 9px; color: var(--cyan); letter-spacing: 0.06em; }
        .chip-lock { font-family: var(--font-mono); font-size: 9.5px; color: var(--text-low); }
      `}</style>
    </div>
  )
}

const PALETTE_HEX = ['#ff2ea6', '#17e8d5', '#8b5cf6', '#ffc857', '#ff5470', '#8bff57', '#e9edff', '#1a1726']
function chipColor(i) {
  return PALETTE_HEX[i % PALETTE_HEX.length]
}

function StatBar({ label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${Math.min(Number(value), 100)}%` }} />
      </div>
    </div>
  )
}
