/**
 * Keyboard + touch input for driving. Touch buttons call the same setters
 * the keyboard handlers use, so RaceEngine only ever reads `state`.
 */
export class InputManager {
  constructor({ onPause } = {}) {
    this.state = { throttle: false, brake: false, left: false, right: false }
    this.onPause = onPause
    this._keydown = (e) => this._handleKey(e, true)
    this._keyup = (e) => this._handleKey(e, false)
    window.addEventListener('keydown', this._keydown)
    window.addEventListener('keyup', this._keyup)
  }

  _handleKey(e, down) {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.state.throttle = down
        e.preventDefault()
        break
      case 'ArrowDown':
      case 'KeyS':
        this.state.brake = down
        e.preventDefault()
        break
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = down
        e.preventDefault()
        break
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = down
        e.preventDefault()
        break
      case 'KeyP':
      case 'Escape':
        if (down) this.onPause?.()
        break
      default:
        break
    }
  }

  set(key, value) {
    this.state[key] = value
  }

  dispose() {
    window.removeEventListener('keydown', this._keydown)
    window.removeEventListener('keyup', this._keyup)
  }
}
