// Shared car cosmetics + the tiny bit of cross-page state (which car the
// player has equipped) that doesn't live on-chain. The contract only tracks
// ownership (unlockedCars), not an "active" car, so we keep that choice in
// localStorage and let Garage/RaceArena both read it.

export const PALETTE = [
  { name: 'Magenta Bolt', body: '#ff2ea6', accent: '#ffe1f3', glow: '#ff2ea6' },
  { name: 'Cyan Surge', body: '#17e8d5', accent: '#eafffd', glow: '#17e8d5' },
  { name: 'Violet Storm', body: '#8b5cf6', accent: '#ece3ff', glow: '#8b5cf6' },
  { name: 'Gold Rush', body: '#ffc857', accent: '#fff6df', glow: '#ffc857' },
  { name: 'Ember Red', body: '#ff5470', accent: '#ffe3e8', glow: '#ff5470' },
  { name: 'Toxic Lime', body: '#8bff57', accent: '#eafff0', glow: '#8bff57' },
  { name: 'Ice White', body: '#e9edff', accent: '#141225', glow: '#9fd8ff' },
  { name: 'Void Black', body: '#1a1726', accent: '#ff2ea6', glow: '#8b5cf6' },
]

export function paletteFor(index) {
  return PALETTE[index % PALETTE.length]
}

const KEY = 'cryptoRush.selectedCarId'

export function getSelectedCarId() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === null ? 0 : Number(raw)
  } catch {
    return 0
  }
}

export function setSelectedCarId(id) {
  try {
    localStorage.setItem(KEY, String(id))
  } catch {
    // storage unavailable (private mode etc.) — selection just won't persist
  }
}

/** Deterministic 0..1 float from a string, used to give each wallet address
 * a stable (but varied) AI driving pace/personality without any server. */
export function hash01(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h = (h ^ (h >>> 15)) >>> 0
  return (h % 10000) / 10000
}
