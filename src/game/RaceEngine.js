import * as THREE from 'three'
import { buildTrack } from './track'
import { buildCarModel } from './carModel'
import { PlayerCar, AIRacer, statsToTuning } from './physics'
import { InputManager } from './input'
import { paletteFor, hash01 } from './carSelection'
import { skyGradientTexture } from './textures'

const TOTAL_LAPS = 3
const MAX_RACE_SECONDS = 150
const COUNTDOWN_FROM = 3

export class RaceEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas
    this.callbacks = callbacks
    this.phase = 'idle'
    this.disposed = false

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2400)
    this.baseFov = 62

    this.track = buildTrack()
    this.scene.add(this.track.group)
    this.scene.background = skyGradientTexture()
    this.scene.fog = new THREE.FogExp2(this.track.fogColor.getHex(), 0.0018)

    this.clock = new THREE.Clock()
    this.input = new InputManager({ onPause: () => this._onPauseKey() })
    this.touch = { throttle: false, brake: false, left: false, right: false }

    this.playerModel = null
    this.player = null
    this.aiList = []
    this._telemetryAccum = 0
    this._countdownT = 0
    this._raceClock = 0
    this._camPos = new THREE.Vector3()
    this._camLook = new THREE.Vector3()
    this._camReady = false

    this._loop = this._loop.bind(this)
  }

  setupRace({ playerStats, playerCarIndex = 0, playerVariant = 0, roster = [] }) {
    // Clear any previous race's cars (re-entering the arena).
    if (this.playerModel) this.scene.remove(this.playerModel.group)
    this.aiList.forEach((a) => this.scene.remove(a.model.group))
    this.aiList = []

    const tuning = statsToTuning(playerStats)
    this.player = new PlayerCar(this.track, tuning, 0)
    this.playerModel = buildCarModel(paletteFor(playerCarIndex), { variant: playerVariant })
    this.scene.add(this.playerModel.group)
    this.playerTopSpeed = tuning.maxSpeed

    roster.forEach((entry, i) => {
      const seed = hash01(entry.address || String(i))
      const ai = new AIRacer(this.track, entry.address, entry.colorIndex ?? i + 1, seed)
      const model = buildCarModel(paletteFor(entry.colorIndex ?? i + 1), { variant: (i + 1) % 2 })
      this.scene.add(model.group)
      this.aiList.push({ ai, model })
    })

    // Snap camera behind the grid immediately so there's no swoop-in pop.
    this._placeCameraInstant()
    this.phase = 'ready'
    this.callbacks.onPhase?.('ready')
  }

  _placeCameraInstant() {
    if (!this.player) return
    const forward = new THREE.Vector3(Math.sin(this.player.heading), 0, Math.cos(this.player.heading))
    const behind = this.player.position.clone().addScaledVector(forward, -8.5)
    behind.y += 3.4
    this.camera.position.copy(behind)
    this._camPos.copy(behind)
    const look = this.player.position.clone().addScaledVector(forward, 8)
    look.y += 1
    this._camLook.copy(look)
    this.camera.lookAt(look)
  }

  start() {
    if (this.phase !== 'ready' && this.phase !== 'finished') return
    this._countdownT = COUNTDOWN_FROM
    this._raceClock = 0
    this.phase = 'countdown'
    this.callbacks.onPhase?.('countdown')
    this.callbacks.onCountdown?.(Math.ceil(this._countdownT))
    if (!this._running) {
      this._running = true
      this.clock.start()
      requestAnimationFrame(this._loop)
    }
  }

  pause() {
    if (this.phase !== 'racing') return
    this.phase = 'paused'
    this.callbacks.onPhase?.('paused')
  }

  resume() {
    if (this.phase !== 'paused') return
    this.phase = 'racing'
    this.clock.getDelta() // discard time spent paused
    this.callbacks.onPhase?.('racing')
  }

  stop() {
    if (this.phase === 'racing' || this.phase === 'paused' || this.phase === 'countdown') {
      this._finishRace()
    }
  }

  _onPauseKey() {
    if (this.phase === 'racing') this.pause()
    else if (this.phase === 'paused') this.resume()
  }

  setTouchInput(partial) {
    Object.assign(this.touch, partial)
  }

  _combinedInput() {
    return {
      throttle: this.input.state.throttle || this.touch.throttle,
      brake: this.input.state.brake || this.touch.brake,
      left: this.input.state.left || this.touch.left,
      right: this.input.state.right || this.touch.right,
    }
  }

  resize(width, height) {
    if (!width || !height) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  _loop() {
    if (this.disposed) return
    requestAnimationFrame(this._loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)

    if (this.phase === 'countdown') {
      this._countdownT -= dt
      const shown = Math.max(0, Math.ceil(this._countdownT))
      if (shown !== this._lastShown) {
        this._lastShown = shown
        this.callbacks.onCountdown?.(shown)
      }
      if (this._countdownT <= 0) {
        this.phase = 'racing'
        this.callbacks.onPhase?.('racing')
        this.callbacks.onCountdown?.(0)
      }
      this._updateAI(dt, 0) // hold the grid until green light
      this._updateCamera(dt)
      this._syncModels()
      this._drawMinimap()
    } else if (this.phase === 'racing') {
      this._raceClock += dt
      const input = this._combinedInput()
      this.player.update(dt, input, this._playerAssist())
      this._updateAI(dt, 1)
      this._updateCamera(dt)
      this._syncModels()
      this._drawMinimap()
      this._emitTelemetry(dt)

      if (this.player.lap >= TOTAL_LAPS || this._raceClock >= MAX_RACE_SECONDS) {
        this._finishRace()
      }
    } else if (this.phase === 'paused' || this.phase === 'ready') {
      // Keep rendering (for the pause overlay backdrop / initial frame) but
      // freeze simulation.
    }

    this.renderer.render(this.scene, this.camera)
  }

  _playerAssist() {
    if (!this.aiList.length) return 1
    const leaderProgress = Math.max(...this.aiList.map((a) => a.ai.totalProgress))
    const gap = leaderProgress - this.player.totalProgress
    if (gap > 40) return 1.12 // light catch-up help when well behind the pack
    if (gap < -60) return 0.94 // ease off a big lead so it stays a race
    return 1
  }

  _updateAI(dt, throttleFactor) {
    const ref = (this.playerTopSpeed || 30) * throttleFactor
    for (const { ai } of this.aiList) ai.update(dt, ref, 1)
  }

  _syncModels() {
    if (this.playerModel && this.player) {
      this.playerModel.group.position.copy(this.player.position)
      this.playerModel.group.rotation.y = this.player.heading
      const steerAngle = ((this.input.state.right || this.touch.right) ? 1 : 0) - ((this.input.state.left || this.touch.left) ? 1 : 0)
      this.playerModel.steerPivots.forEach((p) => { p.rotation.y = steerAngle * 0.38 })
      const wheelSpin = (this.player.speed / this.playerModel.wheelRadius) * 0.12
      this.playerModel.wheels.forEach((w) => { w.rotation.x += wheelSpin })
      const braking = this.input.state.brake || this.touch.brake
      this.playerModel.brakeLights.forEach((m) => { m.material.emissiveIntensity = braking ? 2.4 : 0.15 })
      this.playerModel.underGlow.material.opacity = 0.35 + Math.min(0.5, Math.abs(this.player.speed) / (this.playerTopSpeed || 30) * 0.5)
    }
    for (const { ai, model } of this.aiList) {
      model.group.position.copy(ai.position)
      model.group.rotation.y = ai.heading
      const spin = (ai.speedFrac || 0.6) * 0.9
      model.wheels.forEach((w) => { w.rotation.x += spin })
      model.underGlow.material.opacity = 0.45
    }
  }

  _updateCamera(dt) {
    if (!this.player) return
    const forward = new THREE.Vector3(Math.sin(this.player.heading), 0, Math.cos(this.player.heading))
    const speedT = Math.min(1, Math.abs(this.player.speed) / (this.playerTopSpeed || 30))
    const dist = 8.2 + speedT * 2.4
    const height = 3.3 + speedT * 0.4
    const desiredPos = this.player.position.clone().addScaledVector(forward, -dist)
    desiredPos.y += height
    const desiredLook = this.player.position.clone().addScaledVector(forward, 9 + speedT * 4)
    desiredLook.y += 1.1

    const posLerp = 1 - Math.exp(-dt * 6)
    const lookLerp = 1 - Math.exp(-dt * 8)
    this._camPos.lerp(desiredPos, posLerp)
    this._camLook.lerp(desiredLook, lookLerp)
    this.camera.position.copy(this._camPos)
    this.camera.lookAt(this._camLook)

    const targetFov = this.baseFov + speedT * 8
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4)
    this.camera.updateProjectionMatrix()
  }

  _emitTelemetry(dt) {
    this._telemetryAccum += dt
    if (this._telemetryAccum < 1 / 20) return
    this._telemetryAccum = 0
    const p = this.player
    const standings = this._standings()
    const position = standings.findIndex((s) => s.isPlayer) + 1
    this.callbacks.onTelemetry?.({
      speedKmh: Math.max(0, p.speed) * 11.5,
      reverse: p.speed < -0.2,
      rpm: p.rpm,
      gear: p.gear,
      lap: Math.min(p.lap + 1, TOTAL_LAPS),
      totalLaps: TOTAL_LAPS,
      offTrack: p.offTrack,
      position,
      fieldSize: standings.length,
      raceTime: this._raceClock,
    })
  }

  _standings() {
    const rows = [{ id: 'player', label: 'YOU', isPlayer: true, progress: this.player.totalProgress }]
    for (const { ai } of this.aiList) {
      rows.push({ id: ai.address, label: ai.address, isPlayer: false, progress: ai.totalProgress })
    }
    rows.sort((a, b) => b.progress - a.progress)
    rows.forEach((r, i) => { r.position = i + 1 })
    return rows
  }

  _finishRace() {
    if (this.phase === 'finished') return
    this.phase = 'finished'
    this.callbacks.onPhase?.('finished')
    const standings = this._standings()
    this.callbacks.onFinish?.({
      standings,
      raceTime: this._raceClock,
      playerPosition: standings.find((s) => s.isPlayer)?.position ?? standings.length,
    })
  }

  attachMinimap(canvas) {
    this.minimapCtx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = 160
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = size + 'px'
    canvas.style.height = size + 'px'
    this.minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.minimapSize = size

    const pts = this.track.samples
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const s of pts) {
      minX = Math.min(minX, s.p.x); maxX = Math.max(maxX, s.p.x)
      minZ = Math.min(minZ, s.p.z); maxZ = Math.max(maxZ, s.p.z)
    }
    const pad = 26
    const w = maxX - minX + pad * 2
    const h = maxZ - minZ + pad * 2
    const scale = Math.min(size / w, size / h)
    this._mmScale = scale
    this._mmOffX = -(minX - pad) * scale
    this._mmOffZ = -(minZ - pad) * scale
    this._mmPath = pts.map((s) => this._worldToMap(s.p.x, s.p.z))
  }

  _worldToMap(x, z) {
    return [x * this._mmScale + this._mmOffX, z * this._mmScale + this._mmOffZ]
  }

  _drawMinimap() {
    if (!this.minimapCtx || !this.player) return
    const ctx = this.minimapCtx
    const size = this.minimapSize
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(10,7,20,0.5)'
    ctx.fillRect(0, 0, size, size)
    ctx.beginPath()
    this._mmPath.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.closePath()
    ctx.strokeStyle = 'rgba(190,182,255,0.6)'
    ctx.lineWidth = 3
    ctx.stroke()
    for (const { ai } of this.aiList) {
      const [x, y] = this._worldToMap(ai.position.x, ai.position.z)
      ctx.fillStyle = '#8f8ac0'
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill()
    }
    const [px, py] = this._worldToMap(this.player.position.x, this.player.position.z)
    ctx.fillStyle = '#ff2ea6'
    ctx.beginPath(); ctx.arc(px, py, 4.2, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  dispose() {
    this.disposed = true
    this.input.dispose()
    this.renderer.dispose()
  }
}
