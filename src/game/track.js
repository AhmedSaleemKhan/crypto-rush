import * as THREE from 'three'
import {
  skyGradientTexture,
  glowSpriteTexture,
  gridFloorTexture,
  asphaltTexture,
  dashLineTexture,
  checkerTexture,
  windowTexture,
} from './textures'

const HALF_WIDTH = 7.2
const SAMPLES = 420

function buildLoopPoints() {
  const A = 95 // half-length of the straights, along Z
  const B = 60 // half-width of the straights, along X
  const R = 36 // corner radius
  const steps = 16
  const cornerSegs = 12
  const pts = []
  const push = (x, z) => pts.push(new THREE.Vector3(x, 0, z))

  for (let i = 0; i <= steps; i++) push(B, -(A - R) + (2 * (A - R)) * (i / steps))
  for (let i = 1; i <= cornerSegs; i++) {
    const a = (Math.PI / 2) * (i / cornerSegs)
    push(B - R + Math.cos(a) * R, A - R + Math.sin(a) * R)
  }
  for (let i = 1; i <= steps; i++) push((B - R) - (2 * (B - R)) * (i / steps), A)
  for (let i = 1; i <= cornerSegs; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (i / cornerSegs)
    push(-(B - R) + Math.cos(a) * R, A - R + Math.sin(a) * R)
  }
  for (let i = 1; i <= steps; i++) push(-B, (A - R) - (2 * (A - R)) * (i / steps))
  for (let i = 1; i <= cornerSegs; i++) {
    const a = Math.PI + (Math.PI / 2) * (i / cornerSegs)
    push(-(B - R) + Math.cos(a) * R, -(A - R) + Math.sin(a) * R)
  }
  for (let i = 1; i <= steps; i++) push(-(B - R) + (2 * (B - R)) * (i / steps), -A)
  for (let i = 1; i < cornerSegs; i++) {
    const a = (3 * Math.PI) / 2 + (Math.PI / 2) * (i / cornerSegs)
    push(B - R + Math.cos(a) * R, -(A - R) + Math.sin(a) * R)
  }

  // Gentle S-chicane worked into the right-hand straight (first `steps+1`
  // points) so the lap isn't just four rounded corners.
  const chicaneDepth = 12
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const win = Math.sin(Math.PI * u)
    const s = Math.sin(u * Math.PI * 2)
    pts[i].x += s * win * chicaneDepth
  }

  return pts
}

function buildSamples(curve) {
  const pts = curve.getSpacedPoints(SAMPLES)
  const samples = []
  for (let i = 0; i < SAMPLES; i++) {
    const p = pts[i]
    const next = pts[(i + 1) % SAMPLES]
    const prev = pts[(i - 1 + SAMPLES) % SAMPLES]
    const tangent = next.clone().sub(prev).normalize()
    const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize()
    samples.push({ p, tangent, right })
  }
  return samples
}

function ribbon(samples, offsetFn, opts = {}) {
  const n = samples.length
  const positions = []
  const uvs = []
  const vRepeat = opts.vRepeat ?? n / 20
  for (let i = 0; i <= n; i++) {
    const s = samples[i % n]
    const [lo, hi] = offsetFn(s)
    positions.push(lo.x, lo.y, lo.z, hi.x, hi.y, hi.z)
    const v = (i / n) * vRepeat
    uvs.push(0, v, 1, v)
  }
  const index = []
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3
    index.push(a, c, b, b, c, d)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
}

function buildSkyline(radius) {
  const group = new THREE.Group()
  const winTex = windowTexture('#ffce6b')
  const winTex2 = windowTexture('#7fe8ff')
  const buildingCount = 46
  for (let i = 0; i < buildingCount; i++) {
    const a = (i / buildingCount) * Math.PI * 2 + Math.random() * 0.05
    const dist = radius + Math.random() * 120
    const h = 20 + Math.random() * 90
    const w = 10 + Math.random() * 16
    const mat = new THREE.MeshBasicMaterial({
      map: Math.random() > 0.5 ? winTex : winTex2,
      color: '#0d0a1c',
      fog: true,
    })
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat)
    box.position.set(Math.cos(a) * dist, h / 2 - 1, Math.sin(a) * dist)
    box.rotation.y = Math.random() * Math.PI
    group.add(box)
  }
  return group
}

function buildBollards(samples, halfWidth) {
  const geo = new THREE.CylinderGeometry(0.14, 0.16, 0.9, 6)
  const matA = new THREE.MeshStandardMaterial({ color: '#0e0c16', emissive: '#ff2ea6', emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.5 })
  const matB = new THREE.MeshStandardMaterial({ color: '#0e0c16', emissive: '#17e8d5', emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.5 })
  const step = 6
  const count = Math.floor(samples.length / step) * 2
  const instA = new THREE.InstancedMesh(geo, matA, Math.ceil(count / 2) + 2)
  const instB = new THREE.InstancedMesh(geo, matB, Math.ceil(count / 2) + 2)
  const m = new THREE.Matrix4()
  let ia = 0, ib = 0
  for (let i = 0; i < samples.length; i += step) {
    const s = samples[i]
    for (const side of [-1, 1]) {
      const off = halfWidth + 1.1
      const pos = s.p.clone().addScaledVector(s.right, side * off)
      m.makeTranslation(pos.x, 0.45, pos.z)
      if (side < 0) instA.setMatrixAt(ia++, m)
      else instB.setMatrixAt(ib++, m)
    }
  }
  instA.count = ia
  instB.count = ib
  instA.instanceMatrix.needsUpdate = true
  instB.instanceMatrix.needsUpdate = true
  const group = new THREE.Group()
  group.add(instA, instB)
  return group
}

function buildGantry(sample, halfWidth) {
  const group = new THREE.Group()
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1a1826', metalness: 0.6, roughness: 0.4 })
  const beamMat = new THREE.MeshStandardMaterial({ map: checkerTexture(10, 2), metalness: 0.2, roughness: 0.6 })
  const span = halfWidth * 2 + 2
  ;[-1, 1].forEach((side) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7, 10), poleMat)
    pole.position.set(side * (halfWidth + 1), 3.5, 0)
    group.add(pole)
  })
  const beam = new THREE.Mesh(new THREE.BoxGeometry(span, 1.1, 1.1), beamMat)
  beam.position.y = 7
  group.add(beam)

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSpriteTexture('#f4f2ff'), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }))
  glow.scale.set(span * 0.9, 3, 1)
  glow.position.y = 7
  group.add(glow)

  group.position.copy(sample.p)
  const angle = Math.atan2(sample.tangent.x, sample.tangent.z)
  group.rotation.y = angle
  return group
}

/**
 * Builds the full race environment (road, curbs, barriers, start gantry,
 * skyline, ground, sky, lights) and returns everything the game engine
 * needs to drive cars along it.
 */
export function buildTrack() {
  const points = buildLoopPoints()
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5)
  const samples = buildSamples(curve)
  const length = curve.getLength()

  const world = new THREE.Group()

  // Sky + fog
  const bg = skyGradientTexture()
  const fogColor = new THREE.Color('#170b2e')

  // Sun
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSpriteTexture('#ff9d5c'), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))
  sun.scale.set(260, 260, 1)
  sun.position.set(-180, 60, -520)
  world.add(sun)

  // Ground grid stretching to the horizon
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(3600, 3600),
    new THREE.MeshBasicMaterial({ map: gridFloorTexture(), fog: true })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.03
  world.add(ground)

  // Skyline silhouette ring
  world.add(buildSkyline(340))

  // Road ribbon
  const asphalt = asphaltTexture()
  const roadGeo = ribbon(samples, (s) => [
    s.p.clone().addScaledVector(s.right, -HALF_WIDTH),
    s.p.clone().addScaledVector(s.right, HALF_WIDTH),
  ], { vRepeat: length / 12 })
  const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95, metalness: 0.05 }))
  road.position.y = 0
  world.add(road)

  // Neon edge lines (just inside the curbs)
  const edgeGlowMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, fog: true })
  const leftEdge = new THREE.Mesh(
    ribbon(samples, (s) => [
      s.p.clone().addScaledVector(s.right, -HALF_WIDTH + 0.05).setY(0.015),
      s.p.clone().addScaledVector(s.right, -HALF_WIDTH + 0.35).setY(0.015),
    ]),
    edgeGlowMat('#ff2ea6')
  )
  world.add(leftEdge)
  const rightEdge = new THREE.Mesh(
    ribbon(samples, (s) => [
      s.p.clone().addScaledVector(s.right, HALF_WIDTH - 0.35).setY(0.015),
      s.p.clone().addScaledVector(s.right, HALF_WIDTH - 0.05).setY(0.015),
    ]),
    edgeGlowMat('#17e8d5')
  )
  world.add(rightEdge)

  // Checker curb strips just outside the road
  const curbTex = checkerTexture()
  const curbMat = new THREE.MeshBasicMaterial({ map: curbTex, fog: true })
  const leftCurb = new THREE.Mesh(
    ribbon(samples, (s) => [
      s.p.clone().addScaledVector(s.right, -HALF_WIDTH - 0.7).setY(0.01),
      s.p.clone().addScaledVector(s.right, -HALF_WIDTH).setY(0.01),
    ], { vRepeat: Math.round(length / 4) }),
    curbMat
  )
  world.add(leftCurb)
  const rightCurb = new THREE.Mesh(
    ribbon(samples, (s) => [
      s.p.clone().addScaledVector(s.right, HALF_WIDTH).setY(0.01),
      s.p.clone().addScaledVector(s.right, HALF_WIDTH + 0.7).setY(0.01),
    ], { vRepeat: Math.round(length / 4) }),
    curbMat
  )
  world.add(rightCurb)

  // Dashed centerline
  const dashMat = new THREE.MeshBasicMaterial({ map: dashLineTexture(), transparent: true, fog: true })
  const centerline = new THREE.Mesh(
    ribbon(samples, (s) => [
      s.p.clone().addScaledVector(s.right, -0.18).setY(0.02),
      s.p.clone().addScaledVector(s.right, 0.18).setY(0.02),
    ], { vRepeat: length / 4 }),
    dashMat
  )
  world.add(centerline)

  // Barrier bollards
  world.add(buildBollards(samples, HALF_WIDTH))

  // Start/finish checkered line + gantry
  const startSample = samples[0]
  const checkerGeo = new THREE.PlaneGeometry(HALF_WIDTH * 2, 3)
  checkerGeo.rotateX(-Math.PI / 2) // bake flat orientation: local X=width, local Z=forward
  const checker = new THREE.Mesh(checkerGeo, new THREE.MeshBasicMaterial({ map: checkerTexture(8, 2), fog: true }))
  checker.position.copy(startSample.p).setY(0.03)
  checker.rotation.y = Math.atan2(startSample.tangent.x, startSample.tangent.z)
  world.add(checker)
  world.add(buildGantry(startSample, HALF_WIDTH))

  // Lights — soft ambient fill + a cool "moon" key light, no shadow maps
  // (keeps this fast on mobile GPUs while the emissive/neon materials carry
  // the look).
  const hemi = new THREE.HemisphereLight('#8f7bff', '#1c1033', 1.7)
  world.add(hemi)
  const key = new THREE.DirectionalLight('#e4ecff', 1.5)
  key.position.set(-120, 140, -80)
  world.add(key)
  const rim = new THREE.DirectionalLight('#ff6a9d', 0.55)
  rim.position.set(100, 60, 120)
  world.add(rim)
  const fill = new THREE.AmbientLight('#5a4a8f', 0.5)
  world.add(fill)

  function closestSample(position, hintIndex) {
    const n = samples.length
    let bestI = -1
    let bestD = Infinity
    const scan = (from, to) => {
      for (let i = from; i <= to; i++) {
        const idx = ((i % n) + n) % n
        const dx = position.x - samples[idx].p.x
        const dz = position.z - samples[idx].p.z
        const d = dx * dx + dz * dz
        if (d < bestD) { bestD = d; bestI = idx }
      }
    }
    if (hintIndex == null) scan(0, n - 1)
    else scan(hintIndex - 18, hintIndex + 18)
    const s = samples[bestI]
    const rel = new THREE.Vector2(position.x - s.p.x, position.z - s.p.z)
    const lateral = rel.x * s.right.x + rel.y * s.right.z
    return { index: bestI, lateral }
  }

  function startGridPose(slot) {
    const s = samples[0]
    const col = slot % 2 === 0 ? -1 : 1
    const row = Math.floor(slot / 2)
    const back = 6 + row * 5.5
    const side = col * 2.6
    const pos = s.p.clone().addScaledVector(s.tangent, -back).addScaledVector(s.right, side)
    const heading = Math.atan2(s.tangent.x, s.tangent.z)
    return { position: pos, heading }
  }

  return {
    group: world,
    curve,
    samples,
    length,
    halfWidth: HALF_WIDTH,
    closestSample,
    startGridPose,
    fogColor,
    sampleAt(distance) {
      const n = samples.length
      const idx = (((Math.floor((distance / length) * n)) % n) + n) % n
      return samples[idx]
    },
  }
}
