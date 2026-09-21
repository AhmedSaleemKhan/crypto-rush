import { Link } from 'react-router-dom'
import { useWeb3 } from '../context/Web3Context'

const steps = [
  { n: '01', t: 'Connect Wallet', d: 'Link MetaMask and switch to Avalanche Fuji automatically.' },
  { n: '02', t: 'Pick Your Car', d: 'Spin a real 3D car in the garage — stats set your acceleration, top speed, and handling.' },
  { n: '03', t: 'Join the Grid', d: 'Pay the entry fee on-chain to enter the current pool.' },
  { n: '04', t: 'Drive the Race', d: 'Full 3D track, throttle/brake/steer, speed + RPM gauges, pause and stop whenever you like.' },
  { n: '05', t: 'On-Chain Draw', d: 'The instant you start engines, the contract draws the real winner — no backend, fully verifiable.' },
  { n: '06', t: 'Win & Cash Out', d: 'Winner’s prize lands in claimable rewards, ready to withdraw or spend on new cars.' },
]

export default function Home() {
  const { account, connect } = useWeb3()

  return (
    <div className="page home">
      <section className="hero glass-card">
        <div className="hero-copy">
          <div className="eyebrow">ON-CHAIN 3D ARCADE RACING · AVALANCHE FUJI</div>
          <h1>Actually drive the race.<br />Actually win on-chain.</h1>
          <p className="hero-sub">
            Crypto Rush is a full 3D racing game backed by a real on-chain prize pool.
            Pick your car in the garage, join the grid, then drive it yourself — throttle,
            brake, steering, speed and RPM gauges, pause and stop whenever you want. The
            moment the race starts, the contract draws the real winner. No backend,
            no custodian — just your wallet and the Fuji testnet.
          </p>
          <div className="hero-actions">
            {!account && <button className="glow-btn" onClick={connect}>Connect &amp; Play</button>}
            <Link to="/race"><button className="glow-btn cyan">Enter Race Arena</button></Link>
            <Link to="/garage"><button className="glow-btn ghost">Browse Garage</button></Link>
          </div>
        </div>
        <div className="hero-track" aria-hidden="true">
          <svg viewBox="0 0 320 220" width="100%" height="100%">
            <defs>
              <linearGradient id="trackGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff2ea6" />
                <stop offset="100%" stopColor="#17e8d5" />
              </linearGradient>
            </defs>
            <path d="M20 180 C 60 40, 140 40, 160 110 S 280 200, 300 60" fill="none" stroke="url(#trackGlow)" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
            <path d="M20 180 C 60 40, 140 40, 160 110 S 280 200, 300 60" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 10" opacity="0.5" />
            <circle cx="20" cy="180" r="5" fill="#17e8d5" />
            <circle cx="300" cy="60" r="5" fill="#ff2ea6" />
          </svg>
        </div>
      </section>

      <section className="flow-section">
        <h2>How a race resolves</h2>
        <div className="flow-grid">
          {steps.map((s) => (
            <div className="flow-card glass-card" key={s.n}>
              <span className="flow-n">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .hero {
          display: grid; grid-template-columns: 1.3fr 1fr;
          gap: 24px; align-items: center;
          padding: 42px clamp(20px,4vw,48px);
          margin-top: 6px;
          overflow: hidden;
          position: relative;
        }
        @media (max-width: 760px) { .hero { grid-template-columns: 1fr; } }
        .hero h1 {
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.15;
          margin: 14px 0 16px;
        }
        .hero-sub { color: var(--text-mid); max-width: 46ch; line-height: 1.55; }
        .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
        .hero-track { opacity: 0.9; }
        .flow-section { margin-top: 54px; }
        .flow-section h2 { font-size: 20px; margin-bottom: 18px; }
        .flow-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        }
        @media (max-width: 760px) { .flow-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px) { .flow-grid { grid-template-columns: 1fr; } }
        .flow-card { padding: 20px; }
        .flow-n {
          font-family: var(--font-mono); color: var(--magenta);
          font-size: 13px; letter-spacing: 0.08em;
        }
        .flow-card h3 { font-size: 15px; margin: 10px 0 6px; }
        .flow-card p { color: var(--text-mid); font-size: 13.5px; line-height: 1.5; margin: 0; }
      `}</style>
    </div>
  )
}
