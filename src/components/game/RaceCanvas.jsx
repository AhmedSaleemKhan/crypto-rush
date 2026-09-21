import { useEffect, useRef, useState, useCallback } from 'react'
import { RaceEngine } from '../../game/RaceEngine'
import RaceHUD from './RaceHUD'
import CountdownOverlay from './CountdownOverlay'
import PauseMenu from './PauseMenu'

export default function RaceCanvas({ playerStats, playerCarIndex, playerVariant, roster, onFinish, onExit }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const minimapRef = useRef(null)
  const engineRef = useRef(null)

  const [phase, setPhase] = useState('loading')
  const [countdown, setCountdown] = useState(null)
  const [telemetry, setTelemetry] = useState(null)

  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = new RaceEngine(canvas, {
      onPhase: setPhase,
      onCountdown: (n) => setCountdown(n > 0 ? n : 0),
      onTelemetry: setTelemetry,
      onFinish: (result) => onFinishRef.current?.(result),
    })
    engineRef.current = engine
    engine.setupRace({ playerStats, playerCarIndex, playerVariant, roster })
    if (minimapRef.current) engine.attachMinimap(minimapRef.current)

    const resize = () => {
      const el = containerRef.current
      if (el) engine.resize(el.clientWidth, el.clientHeight)
    }
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    resize()

    engine.start()

    return () => {
      ro.disconnect()
      engine.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePause = useCallback(() => engineRef.current?.pause(), [])
  const handleResume = useCallback(() => engineRef.current?.resume(), [])
  const handleStop = useCallback(() => engineRef.current?.stop(), [])
  const handleTouch = useCallback((partial) => engineRef.current?.setTouchInput(partial), [])

  useEffect(() => {
    if (countdown === 0) {
      const id = setTimeout(() => setCountdown(null), 500)
      return () => clearTimeout(id)
    }
  }, [countdown])

  return (
    <div ref={containerRef} className="race-canvas-wrap">
      <canvas ref={canvasRef} className="race-canvas" />
      {phase !== 'finished' && (
        <RaceHUD telemetry={telemetry} minimapRef={minimapRef} onPause={handlePause} onStop={handleStop} onTouch={handleTouch} />
      )}
      <CountdownOverlay count={phase === 'countdown' || countdown === 0 ? countdown : null} />
      {phase === 'paused' && <PauseMenu onResume={handleResume} onStop={handleStop} />}

      <style>{`
        .race-canvas-wrap {
          position: relative; width: 100%; height: 100%;
          border-radius: var(--radius); overflow: hidden;
          background: #050310;
        }
        .race-canvas { width: 100%; height: 100%; display: block; touch-action: none; }
      `}</style>
    </div>
  )
}
