import * as THREE from 'three'
import { glowSpriteTexture } from './textures'

/**
 * Builds a stylised low-poly arcade car entirely from primitives (no
 * external model files to fetch/bundle). Local +Z is "forward".
 *
 * Returns the root group plus handles the engine needs every frame:
 * steerable front-wheel pivots, all wheels (for rolling spin), brake
 * lights (to flare on braking) and an underglow sprite (intensity tied
 * to speed) so the car reads well against the neon track.
 */
export function buildCarModel(scheme, { variant = 0 } = {}) {
  const root = new THREE.Group()

  const bodyMat = new THREE.MeshStandardMaterial({
    color: scheme.body,
    metalness: 0.55,
    roughness: 0.35,
  })
  const accentMat = new THREE.MeshStandardMaterial({
    color: scheme.accent,
    metalness: 0.2,
    roughness: 0.5,
  })
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#0c0f1a',
    metalness: 0.2,
    roughness: 0.15,
    transparent: true,
    opacity: 0.82,
  })
  const darkMat = new THREE.MeshStandardMaterial({ color: '#111018', metalness: 0.4, roughness: 0.6 })

  const wide = variant % 2 === 1
  const bodyW = wide ? 2.02 : 1.86
  const bodyLen = 4.3

  // Lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(bodyW, 0.5, bodyLen), bodyMat)
  chassis.position.y = 0.56
  root.add(chassis)

  // Cabin (tapered via scale on top)
  const cabinGeo = new THREE.BoxGeometry(bodyW * 0.86, 0.5, bodyLen * 0.48)
  const cabin = new THREE.Mesh(cabinGeo, glassMat)
  cabin.position.set(0, 0.98, -0.15)
  cabin.scale.set(0.92, 1, 1)
  root.add(cabin)

  // Hood + trunk wedge panels for a sportier silhouette
  const hood = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.96, 0.22, bodyLen * 0.3), bodyMat)
  hood.position.set(0, 0.78, 1.45)
  root.add(hood)
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.96, 0.2, bodyLen * 0.22), bodyMat)
  trunk.position.set(0, 0.78, -1.7)
  root.add(trunk)

  // Front splitter + rear spoiler
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 1.05, 0.08, 0.3), accentMat)
  splitter.position.set(0, 0.33, 2.05)
  root.add(splitter)

  const spoiler = new THREE.Group()
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.9, 0.07, 0.32), accentMat)
  spoilerWing.position.y = 1.02
  spoiler.add(spoilerWing)
  ;[-1, 1].forEach((s) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.1), darkMat)
    strut.position.set(s * bodyW * 0.36, 0.86, 0)
    spoiler.add(strut)
  })
  spoiler.position.z = -2.05
  root.add(spoiler)

  // Lights
  const headMat = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff6cf', emissiveIntensity: 1.4 })
  const brakeMat = new THREE.MeshStandardMaterial({ color: '#3a0810', emissive: '#ff1f3d', emissiveIntensity: 0.15 })
  const brakeLights = []
  ;[-1, 1].forEach((s) => {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headMat)
    head.position.set(s * bodyW * 0.32, 0.62, 2.13)
    root.add(head)

    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.06), brakeMat)
    brake.position.set(s * bodyW * 0.32, 0.66, -2.13)
    root.add(brake)
    brakeLights.push(brake)
  })

  // Wheels: bake the axis rotation into geometry so only .rotation.x needs
  // to change at runtime (rolling), independent of the pivot's steering yaw.
  const wheelR = 0.46
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.36, 18)
  wheelGeo.rotateZ(Math.PI / 2)
  const tireMat = new THREE.MeshStandardMaterial({ color: '#0c0b10', roughness: 0.9 })
  const rimMat = new THREE.MeshStandardMaterial({ color: scheme.accent, metalness: 0.8, roughness: 0.25, emissive: scheme.glow, emissiveIntensity: 0.25 })
  const rimGeo = new THREE.TorusGeometry(wheelR * 0.55, 0.06, 8, 16)

  const wheelSpecs = [
    { x: -bodyW / 2 - 0.05, z: 1.42, steer: true },
    { x: bodyW / 2 + 0.05, z: 1.42, steer: true },
    { x: -bodyW / 2 - 0.05, z: -1.42, steer: false },
    { x: bodyW / 2 + 0.05, z: -1.42, steer: false },
  ]
  const wheels = []
  const steerPivots = []
  for (const spec of wheelSpecs) {
    const pivot = new THREE.Group()
    pivot.position.set(spec.x, wheelR, spec.z)
    const mesh = new THREE.Mesh(wheelGeo, tireMat)
    const rim = new THREE.Mesh(rimGeo, rimMat)
    rim.rotation.y = Math.PI / 2
    mesh.add(rim)
    pivot.add(mesh)
    root.add(pivot)
    wheels.push(mesh)
    if (spec.steer) steerPivots.push(pivot)
  }

  // Underglow — a soft additive sprite beneath the car, brighter with speed.
  const underGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowSpriteTexture(scheme.glow),
      color: scheme.glow,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  underGlow.scale.set(4.6, 1.8, 1)
  underGlow.position.y = 0.05
  underGlow.renderOrder = 1
  root.add(underGlow)

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false
      o.receiveShadow = false
    }
  })

  return { group: root, wheels, steerPivots, brakeLights, brakeMat, underGlow, wheelRadius: wheelR }
}
