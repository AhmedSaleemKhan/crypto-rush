import * as THREE from 'three'

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Synthwave dusk sky gradient, used as scene.background. */
export function skyGradientTexture() {
  const c = canvas(8, 256)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#050310')
  g.addColorStop(0.32, '#140a2e')
  g.addColorStop(0.55, '#3a1259')
  g.addColorStop(0.74, '#9c2168')
  g.addColorStop(0.89, '#ff6a3d')
  g.addColorStop(1, '#ffce6b')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 8, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Soft radial glow sprite texture — used for sun, underglow, light halos. */
export function glowSpriteTexture(hex = '#ff2ea6') {
  const c = canvas(128, 128)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, hex)
  g.addColorStop(0.35, hex)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Neon grid floor, tiled far into the distance. */
export function gridFloorTexture() {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0b0620'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(140, 90, 255, 0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 0); ctx.lineTo(0, 256); ctx.moveTo(256, 0); ctx.lineTo(256, 256)
  ctx.moveTo(0, 0); ctx.lineTo(256, 0); ctx.moveTo(0, 256); ctx.lineTo(256, 256)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(140, 140)
  tex.anisotropy = 4
  return tex
}

/** Dark speckled asphalt for the road ribbon. */
export function asphaltTexture() {
  const c = canvas(128, 128)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#17151f'
  ctx.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 128
    const y = Math.random() * 128
    const v = Math.random() * 30
    ctx.fillStyle = `rgba(${210 + v},${210 + v},${225 + v},${0.03 + Math.random() * 0.05})`
    ctx.fillRect(x, y, 1.4, 1.4)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Dashed centerline strip with alpha transparency. */
export function dashLineTexture() {
  const c = canvas(16, 128)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 16, 128)
  ctx.fillStyle = 'rgba(244,242,255,0.9)'
  ctx.fillRect(2, 8, 12, 56)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Red/white checker rumble strip for curbs and the start/finish line. */
export function checkerTexture(cols = 2, rows = 16, c1 = '#ff3b5c', c2 = '#f4f2ff') {
  const size = 64
  const c = canvas(size * cols, size * rows)
  const ctx = c.getContext('2d')
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? c1 : c2
      ctx.fillRect(x * size, y * size, size, size)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Circular studio floor with a soft spotlight pool + a thin neon ring. */
export function studioFloorTexture(accentHex = '#ff2ea6') {
  const c = canvas(512, 512)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0a0714'
  ctx.fillRect(0, 0, 512, 512)
  const pool = ctx.createRadialGradient(256, 256, 20, 256, 256, 260)
  pool.addColorStop(0, 'rgba(255,255,255,0.10)')
  pool.addColorStop(0.5, 'rgba(255,255,255,0.035)')
  pool.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = pool
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = accentHex
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(256, 256, 200, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 0.22
  ctx.lineWidth = 1
  for (let r = 40; r < 512; r += 40) {
    ctx.beginPath()
    ctx.arc(256, 256, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Lit-window texture for distant skyline silhouettes. */
export function windowTexture(hex = '#ffce6b') {
  const c = canvas(32, 64)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0a0714'
  ctx.fillRect(0, 0, 32, 64)
  ctx.fillStyle = hex
  for (let y = 4; y < 64; y += 8) {
    for (let x = 3; x < 32; x += 7) {
      if (Math.random() > 0.4) ctx.fillRect(x, y, 3, 4)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
