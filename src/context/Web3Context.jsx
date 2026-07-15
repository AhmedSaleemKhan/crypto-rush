import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { BrowserProvider, Contract, formatEther } from 'ethers'
import abi from '../contract/abi.json'

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS
const CHAIN_ID_HEX = import.meta.env.VITE_CHAIN_ID_HEX || '0xa869' // 43113 Fuji
const FUJI_RPC = import.meta.env.VITE_FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || 'https://testnet.snowtrace.io'

const Web3Context = createContext(null)

const FUJI_PARAMS = {
  chainId: CHAIN_ID_HEX,
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrls: [FUJI_RPC],
  blockExplorerUrls: [EXPLORER_URL],
}

// If more than one wallet extension is installed (Brave Wallet, Coinbase
// Wallet, etc.), `window.ethereum` may point at whichever one loaded last,
// and the real providers live in `window.ethereum.providers`. This picks
// the MetaMask one specifically so "Connect Wallet" doesn't silently talk
// to the wrong extension.
function getMetaMaskProvider() {
  if (typeof window === 'undefined' || !window.ethereum) return null
  if (Array.isArray(window.ethereum.providers)) {
    const mm = window.ethereum.providers.find((p) => p.isMetaMask)
    if (mm) return mm
  }
  return window.ethereum
}

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contract, setContract] = useState(null)
  const [balance, setBalance] = useState('0')
  const [chainOk, setChainOk] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [hasMetaMask, setHasMetaMask] = useState(
    typeof window !== 'undefined' && !!window.ethereum
  )

  // MetaMask (and other wallets) sometimes inject `window.ethereum` a moment
  // AFTER the page's own scripts have already run — especially with more
  // than one wallet extension installed. A single synchronous check at
  // module-load time can miss it and permanently show "not found" even
  // though the extension is present. Poll briefly, and also listen for the
  // provider's own ready event.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.ethereum) {
      setHasMetaMask(true)
      return
    }

    const onInitialized = () => setHasMetaMask(!!window.ethereum)
    window.addEventListener('ethereum#initialized', onInitialized, { once: true })

    let attempts = 0
    const interval = setInterval(() => {
      attempts += 1
      if (window.ethereum) {
        setHasMetaMask(true)
        clearInterval(interval)
      } else if (attempts >= 10) {
        clearInterval(interval) // stop after ~3s, genuinely not installed / blocked
      }
    }, 300)

    return () => {
      clearInterval(interval)
      window.removeEventListener('ethereum#initialized', onInitialized)
    }
  }, [])

  const refreshBalance = useCallback(async (prov, addr) => {
    if (!prov || !addr) return
    try {
      const bal = await prov.getBalance(addr)
      setBalance(formatEther(bal))
    } catch (e) {
      // ignore transient errors
    }
  }, [])

  const switchToFuji = useCallback(async (mm) => {
    try {
      await mm.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID_HEX }],
      })
    } catch (switchError) {
      if (switchError.code === 4902) {
        await mm.request({
          method: 'wallet_addEthereumChain',
          params: [FUJI_PARAMS],
        })
      } else {
        throw switchError
      }
    }
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    const mm = getMetaMaskProvider()
    if (!hasMetaMask || !mm) {
      if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
        setError(
          'MetaMask can\'t inject into a file:// page. Run "npm run dev" and open the ' +
          'http://localhost URL instead of double-clicking index.html.'
        )
      } else {
        setError(
          'MetaMask not detected. Make sure the extension is unlocked, refresh this page, ' +
          'and check chrome://extensions → MetaMask → "Site access" is not set to a page ' +
          'other than this one.'
        )
      }
      return
    }
    setConnecting(true)
    try {
      await mm.request({ method: 'eth_requestAccounts' })
      await switchToFuji(mm)

      const browserProvider = new BrowserProvider(mm)
      const network = await browserProvider.getNetwork()
      const isFuji = Number(network.chainId) === 43113
      setChainOk(isFuji)

      const signerObj = await browserProvider.getSigner()
      const addr = await signerObj.getAddress()

      let contractObj = null
      if (CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith('0x') && CONTRACT_ADDRESS.length === 42) {
        contractObj = new Contract(CONTRACT_ADDRESS, abi, signerObj)
      } else {
        setError('Set VITE_CONTRACT_ADDRESS in your .env file to the deployed contract address.')
      }

      setProvider(browserProvider)
      setSigner(signerObj)
      setAccount(addr)
      setContract(contractObj)
      await refreshBalance(browserProvider, addr)
    } catch (e) {
      setError(e?.message || 'Failed to connect wallet.')
    } finally {
      setConnecting(false)
    }
  }, [hasMetaMask, switchToFuji, refreshBalance])

  const disconnect = useCallback(() => {
    setAccount(null)
    setSigner(null)
    setContract(null)
    setBalance('0')
  }, [])

  useEffect(() => {
    const mm = getMetaMaskProvider()
    if (!hasMetaMask || !mm) return
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) disconnect()
      else connect()
    }
    const handleChainChanged = () => connect()
    mm.on?.('accountsChanged', handleAccountsChanged)
    mm.on?.('chainChanged', handleChainChanged)
    return () => {
      mm.removeListener?.('accountsChanged', handleAccountsChanged)
      mm.removeListener?.('chainChanged', handleChainChanged)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMetaMask])

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        contract,
        balance,
        chainOk,
        connecting,
        error,
        hasMetaMask,
        connect,
        disconnect,
        refreshBalance: () => refreshBalance(provider, account),
        explorerUrl: EXPLORER_URL,
        contractAddress: CONTRACT_ADDRESS,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const ctx = useContext(Web3Context)
  if (!ctx) throw new Error('useWeb3 must be used inside Web3Provider')
  return ctx
}
