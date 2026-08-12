/**
 * Carrom Physics Engine
 * Simplified but genuinely playable physics simulation.
 *
 * Board: 700 × 700 virtual units
 * Pocket radius: 28 at each corner (inner edge at 30 from border)
 * Playable area: x [60, 640], y [60, 640]
 * Friction: 0.984 per frame
 * Restitution: 0.82 (coin-coin), 0.75 (wall)
 */

const BOARD   = 700
const BORDER  = 60
const PLAY_MIN = BORDER
const PLAY_MAX = BOARD - BORDER
const R_COIN    = 14   // carrom man radius
const R_STRIKER = 20   // striker radius
const R_QUEEN   = 14   // queen radius (same size, different color)
const POCKET_R  = 28
const FRICTION  = 0.984
const REST_CC   = 0.82  // coin-coin restitution
const REST_WALL = 0.75

const POCKET_POS = [
  { x: BORDER - 2, y: BORDER - 2 },
  { x: BOARD - BORDER + 2, y: BORDER - 2 },
  { x: BORDER - 2, y: BOARD - BORDER + 2 },
  { x: BOARD - BORDER + 2, y: BOARD - BORDER + 2 },
]

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function initPieces() {
  const cx = BOARD / 2, cy = BOARD / 2
  // Queen at center
  const queen = { id: 'q', x: cx, y: cy, vx: 0, vy: 0, r: R_QUEEN, type: 'queen', pocketed: false }
  const coins  = []
  // Inner ring: 6 coins alternating
  const inner = R_COIN * 2.4
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    const type  = i % 2 === 0 ? 'white' : 'black'
    coins.push({ id: `c${i}`, x: cx + Math.cos(angle) * inner, y: cy + Math.sin(angle) * inner,
      vx: 0, vy: 0, r: R_COIN, type, pocketed: false })
  }
  // Outer ring: 12 coins
  const outer = R_COIN * 4.6
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 6) * i + Math.PI / 12
    const type  = i < 6 ? 'white' : 'black'
    coins.push({ id: `c${i+6}`, x: cx + Math.cos(angle) * outer, y: cy + Math.sin(angle) * outer,
      vx: 0, vy: 0, r: R_COIN, type, pocketed: false })
  }
  // One extra coin
  coins.push({ id:'c18', x: cx, y: cy - R_COIN * 6.2, vx:0, vy:0, r:R_COIN, type:'white', pocketed:false })
  return { queen, coins }
}

function collideCircles(a, b, e = REST_CC) {
  const dx = b.x - a.x, dy = b.y - a.y
  const d  = Math.sqrt(dx * dx + dy * dy)
  const minD = a.r + b.r
  if (d >= minD || d < 0.001) return

  const nx = dx / d, ny = dy / d
  const rvx = b.vx - a.vx, rvy = b.vy - a.vy
  const rv  = rvx * nx + rvy * ny
  if (rv > 0) return  // already separating

  const j = -(1 + e) * rv / 2  // equal mass assumed
  a.vx -= j * nx; a.vy -= j * ny
  b.vx += j * nx; b.vy += j * ny

  // Positional correction
  const overlap = (minD - d) / 2 + 0.5
  a.x -= nx * overlap; a.y -= ny * overlap
  b.x += nx * overlap; b.y += ny * overlap
}

function bounceWall(piece) {
  const mn = PLAY_MIN + piece.r, mx = PLAY_MAX - piece.r
  if (piece.x < mn) { piece.x = mn; piece.vx =  Math.abs(piece.vx) * REST_WALL }
  if (piece.x > mx) { piece.x = mx; piece.vx = -Math.abs(piece.vx) * REST_WALL }
  if (piece.y < mn) { piece.y = mn; piece.vy =  Math.abs(piece.vy) * REST_WALL }
  if (piece.y > mx) { piece.y = mx; piece.vy = -Math.abs(piece.vy) * REST_WALL }
}

function inPocket(piece) {
  return POCKET_POS.some(p => dist(piece, p) < POCKET_R)
}

function speed(p) { return Math.sqrt(p.vx * p.vx + p.vy * p.vy) }

export class CarromEngine {
  constructor() {
    this.state = null
    this.animFrame = null
    this.onUpdate  = null   // callback(state) each physics tick
  }

  initializeGame({ player1Name = 'Player', aiName = 'AI', aiMode = true } = {}) {
    const { queen, coins } = initPieces()
    this.state = {
      queen,
      coins,
      striker: { x: BOARD / 2, y: PLAY_MAX - R_STRIKER - 2, vx: 0, vy: 0, r: R_STRIKER, type:'striker', pocketed: false },
      currentPlayer: 0,        // 0 = human (white), 1 = AI (black)
      playerNames:   [player1Name, aiName],
      score:         { white: 0, black: 0, queen: 0 },
      pocketedWhite: 0,
      pocketedBlack: 0,
      queenPocketed: false,
      queenCovered:  false,    // queen pocketed + covered by next pocket
      pendingQueenCover: false,
      phase:         'aim',    // 'aim' | 'moving' | 'result'
      aiMode,
      strikerX:      BOARD / 2,
      aimAngle:      -Math.PI / 2,
      power:         0.6,
      lastEvent:     null,
      gameOver:      false,
      winner:        null,
      turnCount:     0,
      foul:          false
    }
    return this.state
  }

  /** Set striker horizontal position (clamped to valid range) */
  setStrikerX(x) {
    const min = PLAY_MIN + R_STRIKER + 20
    const max = PLAY_MAX - R_STRIKER - 20
    this.state.strikerX = Math.min(max, Math.max(min, x))
    this.state.striker.x = this.state.strikerX
  }

  setAimAngle(angle) { this.state.aimAngle = angle }
  setPower(p)        { this.state.power = Math.min(1, Math.max(0.15, p)) }

  /** Fire the striker */
  fire() {
    if (this.state.phase !== 'aim' || this.state.gameOver) return
    const { aimAngle, power, striker } = this.state
    const speed = power * 22   // max speed = 22 units/frame
    striker.x  = this.state.strikerX
    striker.y  = PLAY_MAX - R_STRIKER - 2
    striker.vx = Math.cos(aimAngle) * speed
    striker.vy = Math.sin(aimAngle) * speed
    striker.pocketed = false
    this.state.phase     = 'moving'
    this.state.foul      = false
    this.state.lastEvent = null
    this._simulate()
  }

  /** AI fires automatically */
  aiShot() {
    if (this.state.phase !== 'aim' || !this.state.aiMode) return
    const target = this._findBestTarget()
    if (!target) { this._endTurn(true); return }

    // Flip board for AI (plays from top)
    const cx = BOARD / 2
    const tx = target.x, ty = target.y
    const angle = Math.atan2(ty - (PLAY_MIN + R_STRIKER), tx - cx) + Math.PI
    this.state.aimAngle   = angle
    this.state.power      = 0.55 + Math.random() * 0.3
    this.state.strikerX   = Math.min(PLAY_MAX - R_STRIKER - 20,
      Math.max(PLAY_MIN + R_STRIKER + 20, cx + (Math.random() - 0.5) * 40))
    this.state.striker.x  = this.state.strikerX
    this.state.striker.y  = PLAY_MIN + R_STRIKER + 2  // AI plays from top
    setTimeout(() => this.fire(), 600)
  }

  _findBestTarget() {
    const myType = 'black'
    const targets = this.state.coins.filter(c => !c.pocketed && c.type === myType)
    if (!targets.length) return this.state.queen.pocketed ? null : this.state.queen
    // Pick the nearest one to a pocket
    let best = null, bestScore = Infinity
    for (const t of targets) {
      const minPocketDist = Math.min(...POCKET_POS.map(p => dist(t, p)))
      if (minPocketDist < bestScore) { bestScore = minPocketDist; best = t }
    }
    return best
  }

  _simulate() {
    const STEPS_PER_FRAME = 3
    let frames = 0
    const loop = () => {
      for (let s = 0; s < STEPS_PER_FRAME; s++) this._step()
      frames++
      if (this.onUpdate) this.onUpdate({ ...this.state })
      const allStopped = this._allStopped()
      if (!allStopped && frames < 600) {
        this.animFrame = requestAnimationFrame(loop)
      } else {
        this._resolveResult()
      }
    }
    this.animFrame = requestAnimationFrame(loop)
  }

  _step() {
    const { coins, queen, striker } = this.state
    const active = [...coins.filter(c => !c.pocketed), striker, queen.pocketed ? null : queen].filter(Boolean)

    // Apply friction
    for (const p of active) {
      p.vx *= FRICTION; p.vy *= FRICTION
      p.x  += p.vx;    p.y  += p.vy
    }

    // Wall bounce
    for (const p of active) bounceWall(p)

    // Circle collisions (O(n²) — small n, fine)
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++)
        collideCircles(active[i], active[j],
          (active[i].type==='striker'||active[j].type==='striker') ? 0.88 : REST_CC)

    // Pocket detection
    for (const coin of coins) {
      if (!coin.pocketed && inPocket(coin)) {
        coin.pocketed = true; coin.vx = 0; coin.vy = 0
        if (coin.type === 'white') { this.state.pocketedWhite++ }
        else                       { this.state.pocketedBlack++ }
        this.state.lastEvent = `${coin.type}_pocket`
      }
    }
    if (!queen.pocketed && inPocket(queen)) {
      queen.pocketed = true; queen.vx = 0; queen.vy = 0
      this.state.pendingQueenCover = true
      this.state.lastEvent = 'queen_pocket'
    }
    // Striker pocketed = foul
    if (!striker.pocketed && inPocket(striker)) {
      striker.pocketed = true; striker.vx = 0; striker.vy = 0
      this.state.foul = true
      this.state.lastEvent = 'foul'
    }
  }

  _allStopped() {
    const active = [...this.state.coins.filter(c => !c.pocketed), this.state.striker]
    if (!this.state.queen.pocketed) active.push(this.state.queen)
    return active.every(p => speed(p) < 0.15)
  }

  _resolveResult() {
    const { foul, pendingQueenCover, currentPlayer } = this.state
    const myType = currentPlayer === 0 ? 'white' : 'black'

    if (foul) {
      // Queen goes back if pocketed this turn
      if (pendingQueenCover) {
        this._respawnQueen()
        this.state.pendingQueenCover = false
      }
      this.state.lastEvent = 'foul'
    } else if (pendingQueenCover) {
      // Check if player pocketed any of their own coins this turn
      this.state.queenCovered = true
      this.state.pendingQueenCover = false
      this.state.score.queen = 5
      this.state.lastEvent = 'queen_covered'
    }

    // Check win
    const white = this.state.coins.filter(c => c.type==='white' && !c.pocketed).length
    const black = this.state.coins.filter(c => c.type==='black' && !c.pocketed).length
    if (white === 0 || black === 0) {
      this.state.gameOver = true
      this.state.winner   = white === 0 ? 0 : 1
      this.state.phase    = 'result'
      if (this.onUpdate) this.onUpdate({ ...this.state })
      return
    }

    this._endTurn(foul)
  }

  _endTurn(skipTurn = false) {
    this.state.striker.pocketed = false
    this.state.striker.vx = 0; this.state.striker.vy = 0
    if (!skipTurn) this.state.currentPlayer = 1 - this.state.currentPlayer
    this.state.phase = 'aim'
    this.state.turnCount++
    this.state.foul  = false
    this.state.striker.x = this.state.strikerX
    this.state.striker.y = this.state.currentPlayer === 0
      ? PLAY_MAX - R_STRIKER - 2
      : PLAY_MIN + R_STRIKER + 2
    if (this.onUpdate) this.onUpdate({ ...this.state })
  }

  _respawnQueen() {
    this.state.queen.x = BOARD / 2; this.state.queen.y = BOARD / 2
    this.state.queen.vx = 0; this.state.queen.vy = 0
    this.state.queen.pocketed = false
  }

  stop() {
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null }
  }

  getDrawData() {
    return {
      boardSize: BOARD, border: BORDER, playMin: PLAY_MIN, playMax: PLAY_MAX,
      pockets: POCKET_POS, pocketR: POCKET_R,
      pieces: [
        ...this.state.coins.filter(c => !c.pocketed),
        this.state.queen.pocketed ? null : this.state.queen,
        this.state.striker.pocketed ? null : this.state.striker
      ].filter(Boolean)
    }
  }
}

export { BOARD, BORDER, PLAY_MIN, PLAY_MAX, POCKET_POS, POCKET_R, R_COIN, R_STRIKER }
