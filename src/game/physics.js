import * as THREE from 'three'

const GEAR_THRESHOLDS = [0, 0.15, 0.32, 0.5, 0.67, 0.84, 1.01]
const IDLE_RPM = 1000
const REDLINE_RPM = 8000

/** Maps a 0..100-ish contract stat to a tuned gameplay range. */
function scaleStat(stat, min, max) {
  const t = Math.max(0, Math.min(100, Number(stat))) / 100
  return min + t * (max - min)
}

export function statsToTuning(stats) {
  return {
    maxSpeed: scaleStat(stats.topSpeed, 24, 46),
    accel: scaleStat(stats.acceleration, 9, 19),
    brake: scaleStat(stats.brake, 16, 30),
    turnRate: scaleStat(stats.handling, 1.7, 3.0),
  }
}

/** Speed (world units/s) + gear/RPM figures for the HUD, from a 0..1 speed fraction. */
export function rpmForSpeedFraction(frac) {
  const f = Math.max(0, Math.min(1, frac))
  let gear = 1
  for (let g = 1; g <= 6; g++) {
    if (f >= GEAR_THRESHOLDS[g - 1] && f < GEAR_THRESHOLDS[g]) { gear = g; break }
    if (g === 6) gear = 6
  }
  const lo = GEAR_THRESHOLDS[gear - 1]
  const hi = GEAR_THRESHOLDS[gear]
  const within = hi > lo ? (f - lo) / (hi - lo) : 0
  const rpm = IDLE_RPM + within * (REDLINE_RPM - IDLE_RPM)
  return { gear, rpm }
}

export class PlayerCar {
  constructor(track, tuning, startSlot = 0) {
    this.track = track
    this.tuning = tuning
    const pose = track.startGridPose(startSlot)
    this.position = pose.position.clone()
    this.heading = pose.heading
    this.speed = 0
    this.sampleIndex = 0
    this.lateral = 0
    this.lap = 0
    this._lapGuardHigh = false
    this.distance = 0
    this.offTrack = false
    this.finished = false
  }

  update(dt, input, assist = 1) {
    const { maxSpeed, accel, brake, turnRate } = this.tuning
    const grip = this.offTrack ? 0.55 : 1
    const effMax = (this.offTrack ? maxSpeed * 0.62 : maxSpeed) * assist

    if (input.throttle && !input.brake) {
      this.speed += accel * assist * dt
    } else if (input.brake) {
      if (this.speed > 0.4) this.speed -= brake * dt
      else this.speed -= accel * 0.55 * dt
    } else {
      const drag = 6.5
      if (this.speed > 0) this.speed = Math.max(0, this.speed - drag * dt)
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + drag * dt)
    }
    this.speed = Math.max(-effMax * 0.35, Math.min(effMax, this.speed))

    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    if (steer !== 0 && Math.abs(this.speed) > 0.3) {
      const speedFactor = Math.max(0.25, Math.min(1, Math.abs(this.speed) / maxSpeed))
      const highSpeedDamp = 1 / (1 + (Math.abs(this.speed) / maxSpeed) * 0.9)
      const dir = Math.sign(this.speed)
      this.heading += steer * turnRate * grip * speedFactor * highSpeedDamp * dir * dt
    }

    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading))
    this.position.addScaledVector(forward, this.speed * dt)

    const { index, lateral } = this.track.closestSample(this.position, this.sampleIndex)
    this.lateral = lateral
    this.offTrack = Math.abs(lateral) > this.track.halfWidth + 0.4

    // Soft wall: gently push back onto the track past the shoulder so
    // players can't wander off into the skyline.
    const maxLateral = this.track.halfWidth + 3.2
    if (Math.abs(lateral) > maxLateral) {
      const s = this.track.samples[index]
      const clamped = Math.sign(lateral) * maxLateral
      this.position.copy(s.p).addScaledVector(s.right, clamped)
      this.speed *= 0.85
    }

    this._trackProgress(index)
    this.sampleIndex = index

    const speedFrac = Math.abs(this.speed) / maxSpeed
    const { gear, rpm } = rpmForSpeedFraction(speedFrac)
    this.gear = this.speed < -0.3 ? 'R' : gear
    this.rpm = this.speed < 0.3 && this.speed > -0.3 ? IDLE_RPM : rpm
  }

  _trackProgress(newIndex) {
    const n = this.track.samples.length
    const prev = this.sampleIndex
    // Only count a lap when we cross start/finish moving forward (wrap from
    // the high end back to the low end), guarded against edge jitter.
    if (prev > n * 0.75 && newIndex < n * 0.25) {
      this.lap += 1
    } else if (prev < n * 0.25 && newIndex > n * 0.75) {
      this.lap = Math.max(0, this.lap - 1)
    }
    this.distance = this.lap * this.track.length + (newIndex / n) * this.track.length
  }

  get totalProgress() {
    return this.distance
  }
}

export class AIRacer {
  constructor(track, address, colorIndex, paceSeed) {
    this.track = track
    this.address = address
    this.colorIndex = colorIndex
    this.basePace = 0.82 + paceSeed * 0.34 // fraction of a reference speed
    this.phase = paceSeed * Math.PI * 2
    this.distance = paceSeed * 6 // tiny stagger so they don't all overlap at t=0
    this.lateralWander = 1.1 + paceSeed * 1.6
    this.lap = 0
  }

  update(dt, referenceSpeed, assist = 1) {
    const noise = 0.9 + 0.22 * Math.sin(this.phase + this.distance * 0.02)
    this.distance += referenceSpeed * this.basePace * noise * assist * dt
    this.lap = Math.floor(this.distance / this.track.length)
    const s = this.track.sampleAt(this.distance)
    const wander = Math.sin(this.distance * 0.05 + this.phase) * this.lateralWander
    this.position = s.p.clone().addScaledVector(s.right, wander)
    this.heading = Math.atan2(s.tangent.x, s.tangent.z)
    this.speedFrac = 0.55 + 0.35 * noise
  }

  get totalProgress() {
    return this.distance
  }
}
