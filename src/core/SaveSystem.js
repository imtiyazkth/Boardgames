/**
 * SaveSystem — serializes/deserializes game state safely.
 * Handles corrupted saves gracefully.
 */

const PREFIX = 'bgapp_'

export const SaveSystem = {
  save(key, data) {
    try {
      const payload = { v: 1, ts: Date.now(), data }
      localStorage.setItem(PREFIX + key, JSON.stringify(payload))
      return true
    } catch { return false }
  },

  load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return fallback
      const payload = JSON.parse(raw)
      if (!payload || payload.v !== 1) return fallback
      return payload.data
    } catch { return fallback }
  },

  delete(key) {
    try { localStorage.removeItem(PREFIX + key) } catch {}
  },

  listSessions() {
    try {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX + 'session_'))
        .map(k => {
          try { return JSON.parse(localStorage.getItem(k))?.data } catch { return null }
        })
        .filter(Boolean)
    } catch { return [] }
  },

  saveSession(gameId, state, meta = {}) {
    const key = `session_${gameId}`
    return this.save(key, { gameId, state, meta, savedAt: Date.now() })
  },

  loadSession(gameId) {
    return this.load(`session_${gameId}`, null)
  },

  clearSession(gameId) {
    this.delete(`session_${gameId}`)
  },

  saveSettings(settings) {
    return this.save('settings', settings)
  },

  loadSettings() {
    return this.load('settings', {
      sound: true,
      vibration: true,
      theme: 'dark',
      animSpeed: 'normal',
      defaultDifficulty: 'normal',
      language: 'en'
    })
  },

  saveProfile(profile) {
    return this.save('profile', profile)
  },

  loadProfile() {
    return this.load('profile', {
      name: 'Player 1',
      gamesPlayed: 0,
      gamesWon: 0,
      achievements: []
    })
  },

  saveStats(gameId, stats) {
    const all = this.load('stats', {})
    all[gameId] = { ...(all[gameId] || {}), ...stats }
    return this.save('stats', all)
  },

  loadStats(gameId) {
    const all = this.load('stats', {})
    return all[gameId] || { played: 0, won: 0, lost: 0, drawn: 0, bestTime: null }
  }
}
