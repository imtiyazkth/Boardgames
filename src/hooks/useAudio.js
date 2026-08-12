import { useEffect, useCallback } from 'react'
import { audioEngine } from '../core/AudioEngine.js'

/**
 * useAudio — React hook that:
 *   1. Unlocks the Web Audio context on first user interaction
 *   2. Returns a stable `play(id)` and `vibrate(pattern)` function
 *
 * Usage:
 *   const { play, vibrate } = useAudio()
 *   <button onClick={() => { play('ui_click'); doSomething() }}>
 */
export function useAudio() {
  useEffect(() => {
    const unlock = () => audioEngine.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('touchstart',  unlock, { once: true, passive: true })
    window.addEventListener('keydown',     unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart',  unlock)
      window.removeEventListener('keydown',     unlock)
    }
  }, [])

  const play    = useCallback((id)      => audioEngine.play(id),     [])
  const vibrate = useCallback((pattern) => audioEngine.vibrate(pattern), [])
  const playHaptic = useCallback((id, pattern) => audioEngine.playWithHaptic(id, pattern), [])

  return { play, vibrate, playHaptic, engine: audioEngine }
}
