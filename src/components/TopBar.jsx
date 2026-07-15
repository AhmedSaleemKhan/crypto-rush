import { useWeb3 } from '../context/Web3Context'

function short(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}

export default function TopBar() {
  const { account, balance, connect, connecting, chainOk, hasMetaMask, error } = useWeb3()

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className={'badge' + (chainOk && account ? ' live' : '')}>
          {account ? (chainOk ? 'FUJI TESTNET · CONNECTED' : 'WRONG NETWORK') : 'NOT CONNECTED'}
        </span>
      </div>

      <div className="topbar-right">
        {account && (
          <div className="balance-pill">
            <span className="balance-amt">{Number(balance).toFixed(4)}</span>
            <span className="balance-unit">AVAX</span>
          </div>
        )}
        <button className="glow-btn" onClick={connect} disabled={connecting}>
          {connecting ? 'Connecting…' : account ? short(account) : hasMetaMask ? 'Connect Wallet' : 'Install MetaMask'}
        </button>
      </div>

      {error && <div className="topbar-error">{error}</div>}

      <style>{`
        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px clamp(16px, 4vw, 48px) 0;
          position: relative;
          flex-wrap: wrap;
          gap: 12px;
        }
        .topbar-right { display: flex; align-items: center; gap: 12px; }
        .balance-pill {
          font-family: var(--font-mono);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 9px 16px;
          display: flex; gap: 6px; align-items: baseline;
          background: rgba(255,255,255,0.03);
        }
        .balance-amt { color: var(--gold); font-weight: 600; }
        .balance-unit { color: var(--text-low); font-size: 12px; }
        .topbar-error {
          position: absolute;
          top: 62px; right: clamp(16px, 4vw, 48px);
          max-width: 320px;
          font-size: 12.5px;
          color: var(--danger);
          background: rgba(255, 84, 112, 0.08);
          border: 1px solid rgba(255,84,112,0.3);
          padding: 8px 12px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}
