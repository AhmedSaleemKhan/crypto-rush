import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', icon: '⌁' },
  { to: '/garage', label: 'Garage', icon: '🏎' },
  { to: '/race', label: 'Race Arena', icon: '🏁' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/rewards', label: 'Rewards', icon: '◈' },
  { to: '/stats', label: 'Statistics', icon: '≣' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar glass-card">
      <div className="brand">
        <span className="brand-mark">CR</span>
        <div>
          <div className="brand-name">CRYPTO RUSH</div>
          <div className="brand-sub eyebrow">FUJI TESTNET</div>
        </div>
      </div>

      <nav className="nav-links">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <span className="nav-icon">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="eyebrow">Powered by</div>
        <div className="mono-small">Avalanche C-Chain</div>
      </div>

      <style>{`
        .sidebar {
          margin: 18px 0 18px 18px;
          padding: 22px 16px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          position: sticky;
          top: 18px;
          height: calc(100vh - 36px);
        }
        @media (max-width: 860px) {
          .sidebar {
            position: static;
            height: auto;
            margin: 12px;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            overflow-x: auto;
          }
          .sidebar-footer { display: none; }
        }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-mark {
          width: 38px; height: 38px; border-radius: 10px;
          display: grid; place-items: center;
          font-family: var(--font-display); font-weight: 900;
          background: linear-gradient(140deg, var(--magenta), var(--violet));
          box-shadow: 0 0 22px var(--magenta-soft);
          flex-shrink: 0;
        }
        .brand-name { font-family: var(--font-display); font-size: 14px; letter-spacing: 0.05em; }
        .brand-sub { margin-top: 2px; }
        .nav-links { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        @media (max-width: 860px) { .nav-links { flex-direction: row; } }
        .nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px;
          color: var(--text-mid); font-weight: 600; font-size: 14.5px;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .nav-link:hover { background: rgba(255,255,255,0.05); color: var(--text-hi); }
        .nav-link.active {
          color: var(--text-hi);
          background: linear-gradient(90deg, var(--magenta-soft), transparent);
          box-shadow: inset 2px 0 0 var(--magenta);
        }
        .nav-icon { font-size: 15px; width: 18px; text-align: center; }
        .mono-small { font-family: var(--font-mono); font-size: 12px; color: var(--text-mid); margin-top: 4px; }
      `}</style>
    </aside>
  )
}
