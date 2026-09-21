import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { buildCarModel } from '../../game/carModel'
import { studioFloorTexture, glowSpriteTexture } from '../../game/textures'
import { paletteFor } from '../../game/carSelection'

/**
 * Self-contained 3D showroom: drag to spin the car, auto-rotates when idle.
 * Rebuilds the car mesh whenever carIndex/variant changes.
 */
export default function GarageViewer({ carIndex = 0, variant = 0, spinning = true, height = 360 }) {
  const mountRef = useRef(null)
  const stateRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#0a0714', 14, 30)
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 2.1, 6.6)
    camera.lookAt(0, 0.85, 0)

    const hemi = new THREE.HemisphereLight('#8a6bff', '#0a0714', 1.0)
    scene.add(hemi)
    const key = new THREE.DirectionalLight('#fff3e0', 1.5)
    key.position.set(4, 6, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight('#17e8d5', 0.9)
    rim.position.set(-5, 3, -4)
    scene.add(rim)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(6.2, 64),
      new THREE.MeshBasicMaterial({ map: studioFloorTexture('#ff2ea6'), transparent: true })
    )
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 48),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35 })
    )
    contactShadow.rotation.x = -Math.PI / 2
    contactShadow.position.y = 0.012
    scene.add(contactShadow)

    const haze = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSpriteTexture('#8b5cf6'), transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    haze.scale.set(10, 6, 1)
    haze.position.set(0, 1.5, -3)
    scene.add(haze)

    const carGroup = new THREE.Group()
    scene.add(carGroup)

    let currentCar = null
    function rebuildCar(idx, vIdx) {
      if (currentCar) {
        carGroup.remove(currentCar.group)
      }
      currentCar = buildCarModel(paletteFor(idx), { variant: vIdx })
      carGroup.add(currentCar.group)
    }

    const drag = { active: false, lastX: 0 }
    let rotY = 0.5
    let autoSpin = spinning

    function onDown(e) {
      drag.active = true
      autoSpin = false
      drag.lastX = (e.touches ? e.touches[0].clientX : e.clientX)
    }
    function onMove(e) {
      if (!drag.active) return
      const x = e.touches ? e.touches[0].clientX : e.clientX
      const dx = x - drag.lastX
      drag.lastX = x
      rotY += dx * 0.008
    }
    function onUp() { drag.active = false }

    const dom = renderer.domElement
    dom.style.touchAction = 'none'
    dom.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    function resize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    resize()

    let raf
    const clock = new THREE.Clock()
    function tick() {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(clock.getDelta(), 0.05)
      if (autoSpin) rotY += dt * 0.35
      carGroup.rotation.y += (rotY - carGroup.rotation.y) * Math.min(1, dt * 8)
      if (currentCar) {
        currentCar.underGlow.material.opacity = 0.5 + Math.sin(clock.elapsedTime * 1.6) * 0.12
      }
      renderer.render(scene, camera)
    }
    tick()

    stateRef.current = { rebuildCar, dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      dom.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      renderer.dispose()
      mount.removeChild(dom)
    } }
    rebuildCar(carIndex, variant)

    return () => stateRef.current?.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    stateRef.current?.rebuildCar(carIndex, variant)
  }, [carIndex, variant])

  return <div ref={mountRef} style={{ width: '100%', height, cursor: 'grab' }} />
}
