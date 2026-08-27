/**
 * AudioEngine — Procedural Web Audio API sound system.
 *
 * All sounds are synthesized at runtime:
 *   • Zero external audio files — 100 % offline
 *   • No licensing concerns
 *   • Sub-millisecond latency
 *   • Automatic iOS/Android unlock on first gesture
 *   • Safe: audio failures never crash the game
 *
 * Usage:
 *   import { audioEngine } from './AudioEngine.js'
 *   audioEngine.play('piece_place')
 *   audioEngine.play('game_win')
 */

// ─── Low-level synthesis helpers ─────────────────────────────────────────────

function tone(ctx, dest, freq, dur, vol, wave = 'sine', slideEnd = null) {
  try {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = wave
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    if (slideEnd !== null)
      osc.frequency.exponentialRampToValueAtTime(Math.max(slideEnd, 1), ctx.currentTime + dur)
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.connect(gain); gain.connect(dest)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur + 0.01)
  } catch {}
}

function toneAt(ctx, dest, freq, start, dur, vol, wave = 'sine') {
  try {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = wave
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(vol, start + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain); gain.connect(dest)
    osc.start(start); osc.stop(start + dur + 0.01)
  } catch {}
}

function noise(ctx, dest, dur, vol, filterFreq = 500, filterQ = 1, filterType = 'bandpass') {
  try {
    const size   = Math.ceil(ctx.sampleRate * dur)
    const buf    = ctx.createBuffer(1, size, ctx.sampleRate)
    const data   = buf.getChannelData(0)
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1

    const src    = ctx.createBufferSource()
    src.buffer   = buf
    const filt   = ctx.createBiquadFilter()
    filt.type    = filterType
    filt.frequency.value = filterFreq
    filt.Q.value = filterQ

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    src.connect(filt); filt.connect(gain); gain.connect(dest)
    src.start(); src.stop(ctx.currentTime + dur)
  } catch {}
}

/** Percussive impact — sine sweep + noise burst (the "tok/thud" family) */
function impact(ctx, dest, freq, dur, vol) {
  try {
    // Pitched transient
    const osc  = ctx.createOscillator()
    const oGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * 2, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.3, 20), ctx.currentTime + dur)
    oGain.gain.setValueAtTime(vol * 0.7, ctx.currentTime)
    oGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.connect(oGain); oGain.connect(dest)
    osc.start(); osc.stop(ctx.currentTime + dur + 0.01)
    // Noise body
    noise(ctx, dest, dur * 0.4, vol * 0.35, freq * 3, 1.5)
  } catch {}
}

/** Play several tones in sequence (arpeggio / fanfare) */
function sequence(ctx, dest, notes, noteDur, gap, vol, wave = 'sine') {
  notes.forEach((freq, i) => {
    toneAt(ctx, dest, freq, ctx.currentTime + i * (noteDur + gap), noteDur, vol, wave)
  })
}

/** Play several tones simultaneously (chord) */
function chord(ctx, dest, notes, dur, vol) {
  const perNote = vol / notes.length
  notes.forEach(freq => toneAt(ctx, dest, freq, ctx.currentTime, dur, perNote))
}

/** Dice: 5-8 random rapid impacts */
function dice(ctx, dest, vol) {
  const count = 5 + Math.floor(Math.random() * 4)
  for (let i = 0; i < count; i++) {
    const delay = i * (0.035 + Math.random() * 0.025)
    const freq  = 80 + Math.random() * 180
    const v     = vol * (0.5 + Math.random() * 0.5)
    const t = ctx.currentTime + delay
    try {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type   = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(v, t + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
      osc.connect(gain); gain.connect(dest)
      osc.start(t); osc.stop(t + 0.1)
    } catch {}
  }
}

/** FM synthesis — carrier modulated by modulator */
function fm(ctx, dest, carrierFreq, modFreq, modDepth, dur, vol) {
  try {
    const mod     = ctx.createOscillator()
    const modGain = ctx.createGain()
    const carrier = ctx.createOscillator()
    const outGain = ctx.createGain()

    mod.frequency.value = modFreq
    modGain.gain.value  = modDepth
    carrier.frequency.setValueAtTime(carrierFreq, ctx.currentTime)

    mod.connect(modGain); modGain.connect(carrier.frequency)
    carrier.connect(outGain); outGain.connect(dest)

    outGain.gain.setValueAtTime(vol, ctx.currentTime)
    outGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)

    mod.start(); carrier.start()
    mod.stop(ctx.currentTime + dur + 0.01)
    carrier.stop(ctx.currentTime + dur + 0.01)
  } catch {}
}

// ─── Sound Definitions ───────────────────────────────────────────────────────
// Each entry is a function(ctx, sfxGain) — called when that sound fires.

const DEF = {
  // ── UI ────────────────────────────────────────────────────────────────────
  ui_click:    (c, d) => tone(c, d, 700, 0.06, 0.14, 'sine'),
  ui_confirm:  (c, d) => sequence(c, d, [660, 880], 0.07, 0.03, 0.18),
  ui_cancel:   (c, d) => tone(c, d, 420, 0.12, 0.14, 'sine', 280),
  ui_back:     (c, d) => tone(c, d, 500, 0.09, 0.13, 'sine', 380),
  ui_error:    (c, d) => { tone(c, d, 200, 0.18, 0.18, 'square'); noise(c, d, 0.12, 0.08, 180, 1) },
  ui_success:  (c, d) => sequence(c, d, [440, 554, 659, 880], 0.07, 0.04, 0.18),
  ui_open:     (c, d) => tone(c, d, 500, 0.08, 0.13, 'sine', 700),
  ui_close:    (c, d) => tone(c, d, 700, 0.08, 0.13, 'sine', 400),
  ui_warning:  (c, d) => sequence(c, d, [600, 500], 0.09, 0.05, 0.18),
  ui_toggle:   (c, d) => tone(c, d, 550, 0.05, 0.12, 'sine'),

  // ── Generic game events ────────────────────────────────────────────────────
  game_start:  (c, d) => sequence(c, d, [261, 329, 392, 523], 0.1, 0.04, 0.2),
  game_win:    (c, d) => sequence(c, d, [523, 659, 784, 1047, 1319], 0.11, 0.06, 0.22),
  game_lose:   (c, d) => sequence(c, d, [392, 330, 262], 0.18, 0.08, 0.2),
  game_draw:   (c, d) => sequence(c, d, [440, 392], 0.15, 0.08, 0.18),
  game_turn:   (c, d) => tone(c, d, 330, 0.05, 0.1, 'sine'),

  // ── Generic piece events ───────────────────────────────────────────────────
  piece_select:    (c, d) => tone(c, d, 460, 0.07, 0.13, 'sine'),
  piece_move:      (c, d) => impact(c, d, 220, 0.09, 0.22),
  piece_place:     (c, d) => impact(c, d, 160, 0.12, 0.26),
  piece_capture:   (c, d) => impact(c, d, 100, 0.2,  0.32),
  piece_invalid:   (c, d) => { tone(c, d, 180, 0.12, 0.14, 'square'); noise(c, d, 0.08, 0.07, 120, 1) },
  piece_drop:      (c, d) => impact(c, d, 180, 0.14, 0.24),

  // ── Dice ──────────────────────────────────────────────────────────────────
  dice_roll:  (c, d) => dice(c, d, 0.28),
  dice_land:  (c, d) => impact(c, d, 110, 0.22, 0.3),

  // ── Tic Tac Toe ───────────────────────────────────────────────────────────
  ttt_x:      (c, d) => fm(c, d, 480, 240, 120, 0.12, 0.2),
  ttt_o:      (c, d) => tone(c, d, 660, 0.12, 0.2,  'sine'),
  ttt_win:    (c, d) => sequence(c, d, [523, 659, 784, 1047], 0.1, 0.06, 0.22),
  ttt_draw:   (c, d) => sequence(c, d, [440, 415], 0.15, 0.08, 0.18),

  // ── Sliding Puzzle ────────────────────────────────────────────────────────
  puzzle_slide:    (c, d) => { impact(c, d, 260, 0.07, 0.16); },
  puzzle_complete: (c, d) => sequence(c, d, [523, 659, 784, 1047, 1319], 0.1, 0.06, 0.22),
  puzzle_invalid:  (c, d) => noise(c, d, 0.09, 0.14, 140, 1),
  puzzle_hint:     (c, d) => sequence(c, d, [550, 660], 0.09, 0.05, 0.16),
  puzzle_shuffle:  (c, d) => { for(let i=0;i<6;i++) setTimeout(()=>impact(c,d,180+i*30,0.07,0.14),i*55) },

  // ── Snakes & Ladders ──────────────────────────────────────────────────────
  snakes_dice:     (c, d) => dice(c, d, 0.28),
  snake_down:      (c, d) => tone(c, d, 550, 0.55, 0.22, 'sine', 160),
  ladder_up:       (c, d) => tone(c, d, 160, 0.45, 0.22, 'sine', 660),
  player_move:     (c, d) => tone(c, d, 430, 0.055, 0.13, 'sine'),
  snakes_win:      (c, d) => sequence(c, d, [523, 659, 784, 1047], 0.1, 0.06, 0.22),

  // ── Checkers ──────────────────────────────────────────────────────────────
  checkers_select:  (c, d) => tone(c, d, 460, 0.07, 0.14, 'sine'),
  checkers_move:    (c, d) => impact(c, d, 210, 0.1,  0.22),
  checkers_capture: (c, d) => impact(c, d, 110, 0.22, 0.34),
  checkers_king:    (c, d) => sequence(c, d, [523, 659, 784], 0.1, 0.06, 0.24),
  checkers_win:     (c, d) => sequence(c, d, [523, 659, 784, 1047], 0.1, 0.06, 0.22),
  checkers_invalid: (c, d) => noise(c, d, 0.09, 0.14, 140, 1),

  // ── Nine Men's Morris ─────────────────────────────────────────────────────
  morris_place:   (c, d) => impact(c, d, 190, 0.11, 0.24),
  morris_move:    (c, d) => impact(c, d, 230, 0.09, 0.2),
  morris_mill:    (c, d) => { chord(c, d, [392, 523, 659], 0.5, 0.22); tone(c, d, 1047, 0.4, 0.1, 'sine') },
  morris_capture: (c, d) => impact(c, d, 100, 0.2,  0.32),
  morris_win:     (c, d) => sequence(c, d, [523, 659, 784, 1047], 0.1, 0.06, 0.22),
  morris_flying:  (c, d) => fm(c, d, 300, 80, 200, 0.25, 0.18),

  // ── Chess ─────────────────────────────────────────────────────────────────
  chess_select:    (c, d) => tone(c, d, 440, 0.06, 0.13, 'sine'),
  chess_move:      (c, d) => impact(c, d, 300, 0.09, 0.2),
  chess_capture:   (c, d) => impact(c, d, 130, 0.22, 0.32),
  chess_check:     (c, d) => sequence(c, d, [880, 880], 0.08, 0.05, 0.26),
  chess_checkmate: (c, d) => sequence(c, d, [523, 415, 311], 0.25, 0.1, 0.3),
  chess_castle:    (c, d) => { impact(c, d, 280, 0.09, 0.2); setTimeout(()=>impact(c,d,250,0.08,0.16), 120) },
  chess_promote:   (c, d) => sequence(c, d, [523, 659, 784, 1047, 1319], 0.1, 0.06, 0.28),
  chess_illegal:   (c, d) => noise(c, d, 0.1, 0.14, 140, 1),
  chess_draw:      (c, d) => sequence(c, d, [440, 392], 0.15, 0.08, 0.2),

  // ── Ludo ─────────────────────────────────────────────────────────────────
  ludo_dice:    (c, d) => dice(c, d, 0.3),
  ludo_select:  (c, d) => tone(c, d, 480, 0.07, 0.14, 'sine'),
  ludo_move:    (c, d) => tone(c, d, 430, 0.055, 0.13, 'sine'),
  ludo_enter:   (c, d) => sequence(c, d, [440, 660], 0.07, 0.04, 0.2),
  ludo_cut:     (c, d) => impact(c, d, 110, 0.22, 0.34),
  ludo_safe:    (c, d) => tone(c, d, 660, 0.12, 0.18, 'sine'),
  ludo_home:    (c, d) => sequence(c, d, [784, 988, 1319], 0.1, 0.06, 0.24),
  ludo_win:     (c, d) => sequence(c, d, [523, 659, 784, 1047, 1319], 0.1, 0.06, 0.26),

  // ── Sholo Guti ───────────────────────────────────────────────────────────
  sholo_select:  (c, d) => tone(c, d, 460, 0.07, 0.13, 'sine'),
  sholo_move:    (c, d) => impact(c, d, 210, 0.09, 0.22),
  sholo_jump:    (c, d) => { impact(c, d, 260, 0.09, 0.22); setTimeout(()=>impact(c,d,200,0.08,0.2), 100) },
  sholo_capture: (c, d) => impact(c, d, 100, 0.22, 0.34),
  sholo_win:     (c, d) => sequence(c, d, [523, 659, 784, 1047], 0.1, 0.06, 0.24),

  // ── Dominoes ─────────────────────────────────────────────────────────────
  domino_place:   (c, d) => impact(c, d, 310, 0.12, 0.22),
  domino_match:   (c, d) => sequence(c, d, [550, 660], 0.08, 0.04, 0.18),
  domino_invalid: (c, d) => noise(c, d, 0.09, 0.14, 140, 1),
  domino_draw:    (c, d) => tone(c, d, 380, 0.09, 0.14, 'sine'),
  domino_block:   (c, d) => sequence(c, d, [330, 280], 0.15, 0.07, 0.2),
  domino_win:     (c, d) => sequence(c, d, [523, 659, 784, 1047], 0.1, 0.06, 0.22),

  // ── Carrom ───────────────────────────────────────────────────────────────
  carrom_strike:    (c, d) => { impact(c, d, 280, 0.15, 0.38); noise(c, d, 0.08, 0.18, 900, 2) },
  carrom_collision: (c, d) => { impact(c, d, 420, 0.09, 0.24) },
  carrom_pocket:    (c, d) => { impact(c, d, 55,  0.38, 0.35); noise(c, d, 0.2, 0.18, 120, 0.8) },
  carrom_queen:     (c, d) => { sequence(c, d, [659, 784, 880], 0.09, 0.05, 0.28); impact(c, d, 55, 0.35, 0.3) },
  carrom_foul:      (c, d) => { tone(c, d, 200, 0.2, 0.18, 'square'); noise(c, d, 0.15, 0.1, 200, 1) },
  carrom_win:       (c, d) => sequence(c, d, [523, 659, 784, 1047, 1319], 0.1, 0.06, 0.28),
  carrom_rebound:   (c, d) => impact(c, d, 350, 0.08, 0.18),
}

// ─── Engine ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  sfxEnabled:    true,
  masterVolume:  0.85,
  sfxVolume:     0.85,
  vibration:     true,
  musicEnabled:  false,
  musicVolume:   0.35,
}

// Gentle ambient loop notes, reused across games — minor-key arpeggio so it
// stays unobtrusive under fast SFX rather than competing with them.
const MUSIC_LOOP = [220.00, 261.63, 329.63, 392.00, 329.63, 261.63, 293.66, 246.94]
const MUSIC_STEP_MS = 620

class AudioEngine {
  constructor() {
    this._ctx       = null
    this._master    = null   // GainNode (master volume)
    this._sfx       = null   // GainNode (sfx bus)
    this._music     = null   // GainNode (music bus)
    this._unlocked  = false
    this._settings  = { ...DEFAULT_SETTINGS }
    this._activeCount = 0
    this._MAX_CONCURRENT = 6
    this._musicTimer = null
    this._musicStepIdx = 0
    this._loadSettings()
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Must be called inside a user gesture handler (click/touchstart).
   * Safe to call multiple times — only acts on the first call.
   */
  unlock() {
    if (this._unlocked) {
      // Resume if suspended (iOS lock-screen)
      if (this._ctx?.state === 'suspended') this._ctx.resume().catch(() => {})
      return
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return

      this._ctx    = new Ctx()
      this._master = this._ctx.createGain()
      this._sfx    = this._ctx.createGain()
      this._music  = this._ctx.createGain()

      const comp = this._ctx.createDynamicsCompressor()
      comp.threshold.value = -12
      comp.knee.value      = 6
      comp.ratio.value     = 4

      this._sfx.connect(comp)
      this._music.connect(comp)
      comp.connect(this._master)
      this._master.connect(this._ctx.destination)

      this._applyVolume()
      this._unlocked = true
      if (this._settings.musicEnabled) this._startMusicLoop()
    } catch (e) {
      // Audio unavailable — silent mode; gameplay continues normally
    }
  }

  /** Play a sound by ID. Fails silently if audio is not available. */
  play(id) {
    if (!this._settings.sfxEnabled) return
    if (!this._unlocked || !this._ctx || !this._sfx) return
    if (this._activeCount >= this._MAX_CONCURRENT) return
    if (this._ctx.state === 'suspended') { this._ctx.resume().catch(() => {}); return }

    const fn = DEF[id]
    if (!fn) return

    this._activeCount++
    try {
      fn(this._ctx, this._sfx)
    } catch {}
    // Decrement after longest plausible sound (1.5 s)
    setTimeout(() => { this._activeCount = Math.max(0, this._activeCount - 1) }, 1500)
  }

  /** Haptic feedback — respects vibration setting. */
  vibrate(pattern = [20]) {
    if (!this._settings.vibration) return
    try { navigator.vibrate?.(pattern) } catch {}
  }

  /** Convenience: play sound + vibrate together */
  playWithHaptic(id, pattern = [15]) {
    this.play(id)
    this.vibrate(pattern)
  }

  // ── Settings ────────────────────────────────────────────────────────────

  setSettings(partial) {
    this._settings = { ...this._settings, ...partial }
    this._applyVolume()
    this._saveSettings()
  }

  getSettings() { return { ...this._settings } }

  toggleSFX()       { this.setSettings({ sfxEnabled:  !this._settings.sfxEnabled }) }
  toggleVibration() { this.setSettings({ vibration:   !this._settings.vibration }) }

  /** Toggle the ambient background music loop. Call after unlock() (needs a user gesture). */
  toggleMusic() {
    const next = !this._settings.musicEnabled
    this.setSettings({ musicEnabled: next })
    if (next) this._startMusicLoop(); else this._stopMusicLoop()
  }

  setMusicVolume(v) { this.setSettings({ musicVolume: Math.min(1, Math.max(0, v)) }) }

  setMasterVolume(v) { this.setSettings({ masterVolume: Math.min(1, Math.max(0, v)) }) }
  setSFXVolume(v)    { this.setSettings({ sfxVolume:    Math.min(1, Math.max(0, v)) }) }

  // ── Private ─────────────────────────────────────────────────────────────

  _applyVolume() {
    if (!this._master || !this._sfx) return
    this._master.gain.value = this._settings.masterVolume
    this._sfx.gain.value    = this._settings.sfxEnabled ? this._settings.sfxVolume : 0
    if (this._music) this._music.gain.value = this._settings.musicEnabled ? this._settings.musicVolume : 0
  }

  _startMusicLoop() {
    if (this._musicTimer || !this._ctx || !this._music) return
    this._musicTimer = setInterval(() => {
      if (!this._settings.musicEnabled || this._ctx.state === 'suspended') return
      const freq = MUSIC_LOOP[this._musicStepIdx % MUSIC_LOOP.length]
      toneAt(this._ctx, this._music, freq, this._ctx.currentTime, 0.55, 0.9, 'sine')
      this._musicStepIdx++
    }, MUSIC_STEP_MS)
  }

  _stopMusicLoop() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null }
  }

  _saveSettings() {
    try { localStorage.setItem('bgapp_audio', JSON.stringify(this._settings)) } catch {}
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem('bgapp_audio')
      if (raw) this._settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    } catch {}
  }
}

/** Singleton — import this everywhere */
export const audioEngine = new AudioEngine()

/** All valid sound IDs (for autocomplete / documentation) */
export const SOUNDS = Object.fromEntries(Object.keys(DEF).map(k => [k, k]))
