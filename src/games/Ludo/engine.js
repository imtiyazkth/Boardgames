// ─── Ludo King-spec Engine ────────────────────────────────────────────────────
// 52-cell global track + step_count (0-56) as source of truth
// Safe zones: 0,8,13,21,26,34,39,47
// Entry indices: Red=0, Blue=13, Green=26, Yellow=39

export const SAFE_ZONES = new Set([0,8,13,21,26,34,39,47])
export const PLAYER_ENTRY  = [0,13,26,39]   // Red,Blue,Green,Yellow
export const PLAYER_EXIT   = [50,11,24,37]  // step_count at which player turns into home path
export const PLAYER_COLORS = ['red','blue','green','yellow']

// 52 global track cells [col,row] on 15×15 grid
export const TRACK = [
  [6,13],[6,12],[6,11],[6,10],[6,9],[6,8],  // 0-5
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],       // 6-11
  [0,7],[0,6],                               // 12-13
  [1,6],[2,6],[3,6],[4,6],[5,6],             // 14-18
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],       // 19-24
  [7,0],[8,0],                               // 25-26
  [8,1],[8,2],[8,3],[8,4],[8,5],             // 27-31
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],  // 32-37
  [14,7],[14,8],                             // 38-39
  [13,8],[12,8],[11,8],[10,8],[9,8],         // 40-44
  [8,9],[8,10],[8,11],[8,12],[8,13],         // 45-49
  [8,14],[7,14],                             // 50-51
]

// Home path per player (5 steps toward center)
export const HOME_PATH = [
  [[7,13],[7,12],[7,11],[7,10],[7,9]],   // Red
  [[1,7],[2,7],[3,7],[4,7],[5,7]],        // Blue
  [[7,1],[7,2],[7,3],[7,4],[7,5]],        // Green
  [[13,7],[12,7],[11,7],[10,7],[9,7]],    // Yellow
]

// Yard slot positions per player
export const YARD_SLOTS = [
  [[2,11],[3,11],[2,12],[3,12]],    // Red   (bottom-left)
  [[11,2],[12,2],[11,3],[12,3]],    // Blue  (top-right)
  [[2,2],[3,2],[2,3],[3,3]],        // Green (top-left)
  [[11,11],[12,11],[11,12],[12,12]],// Yellow(bottom-right)
]

export function getTokenCoord(player, stepCount, tokenSlot) {
  if (stepCount < 0) {
    const [c,r] = YARD_SLOTS[player][tokenSlot]
    return { c, r }
  }
  if (stepCount === 57) return { c:7, r:7 }  // center goal
  if (stepCount >= 52) {
    const [c,r] = HOME_PATH[player][stepCount-52]
    return { c, r }
  }
  const trackIdx = (PLAYER_ENTRY[player] + stepCount) % 52
  const [c,r] = TRACK[trackIdx]
  return { c, r }
}

export function getAbsoluteTrackPos(player, stepCount) {
  if (stepCount < 0 || stepCount >= 52) return -1
  return (PLAYER_ENTRY[player] + stepCount) % 52
}

// ─── Token state ──────────────────────────────────────────────────────────────
function makeToken(player, slot) {
  return { player, slot, stepCount: -1, status: 'BASE' }
  // status: 'BASE' | 'TRACK' | 'HOME_PATH' | 'GOAL'
}

// ─── Main Engine ──────────────────────────────────────────────────────────────
export class LudoEngine {
  initializeGame({ playerCount=4, playerNames=[], humanPlayers=[0] }={}) {
    this.playerCount   = playerCount
    this.playerNames   = playerNames.length ? playerNames : ['Red','Blue','Green','Yellow'].slice(0,playerCount)
    this.humanPlayers  = humanPlayers  // array of player indices that are human
    this.tokens        = Array.from({length:playerCount}, (_, p) =>
      [0,1,2,3].map(s => makeToken(p,s))
    )
    this.currentPlayer = 0
    this.dice          = null
    this.consecutiveSixes = 0
    this.hasCaptured   = false
    this.hasReachedGoal = false
    this.rankings      = []  // players in finish order
    this.gameOver      = false
    this.winner        = null
    this.event         = null
    return this
  }

  cloneState() {
    return {
      tokens:        this.tokens.map(pt => pt.map(t => ({...t}))),
      currentPlayer: this.currentPlayer,
      dice:          this.dice,
      consecutiveSixes: this.consecutiveSixes,
      hasCaptured:   this.hasCaptured,
      hasReachedGoal: this.hasReachedGoal,
      gameOver:      this.gameOver,
      winner:        this.winner,
      playerCount:   this.playerCount,
      playerNames:   [...this.playerNames],
      humanPlayers:  [...this.humanPlayers],
      rankings:      [...this.rankings],
      event:         this.event,
    }
  }

  rollDice() {
    const val = Math.floor(Math.random()*6) + 1
    this.dice = val

    if (val === 6) {
      this.consecutiveSixes++
      if (this.consecutiveSixes >= 3) {
        this.consecutiveSixes = 0
        this.dice = null
        this.event = 'three_sixes'
        this._nextTurn()
        return { dice: val, event: 'three_sixes' }
      }
    } else {
      this.consecutiveSixes = 0
    }

    // Check valid moves
    const moves = this.getValidMoves()
    if (moves.length === 0) {
      this.event = 'no_moves'
      // auto-pass after delay (caller handles)
      return { dice: val, event: 'no_moves' }
    }

    // Auto-move if only 1 option
    if (moves.length === 1) {
      this.event = 'auto_move'
      return { dice: val, event: 'auto_move', autoMove: moves[0] }
    }

    this.event = null
    return { dice: val, event: null }
  }

  getValidMoves() {
    if (this.dice === null) return []
    const p = this.currentPlayer
    const d = this.dice
    const moves = []

    this.tokens[p].forEach((tok, t) => {
      if (tok.status === 'GOAL') return

      if (tok.status === 'BASE') {
        if (d === 6) moves.push({ player:p, token:t, action:'enter' })
        return
      }

      const newStep = tok.stepCount + d
      if (newStep > 57) return  // overflow

      // HOME_PATH overflow check
      if (tok.stepCount >= 52 && newStep > 57) return

      moves.push({ player:p, token:t, action:'move', newStep })
    })

    return moves
  }

  applyMove(move) {
    const { player, token, action, newStep } = move
    const tok = this.tokens[player][token]
    let event = null

    if (action === 'enter') {
      tok.stepCount = 0
      tok.status = 'TRACK'
      event = 'entered'
    } else if (action === 'move') {
      tok.stepCount = newStep

      if (newStep === 57) {
        tok.status = 'GOAL'
        this.hasReachedGoal = true
        event = 'goal'
        // Check if player finished
        const allGoal = this.tokens[player].every(t => t.status === 'GOAL')
        if (allGoal) {
          this.rankings.push(player)
          if (this.rankings.length === 1) {
            this.gameOver = true
            this.winner = player
          }
        }
      } else if (newStep >= 52) {
        tok.status = 'HOME_PATH'
      } else {
        tok.status = 'TRACK'
        // Collision check
        const absPos = getAbsoluteTrackPos(player, newStep)
        if (!SAFE_ZONES.has(absPos)) {
          // Check other players
          for (let p2=0; p2<this.playerCount; p2++) {
            if (p2 === player) continue
            this.tokens[p2].forEach(t2 => {
              if (t2.status !== 'TRACK') return
              const t2Abs = getAbsoluteTrackPos(p2, t2.stepCount)
              if (t2Abs === absPos) {
                // Blockade check (2 same-color tokens = blockade, cannot be captured)
                const sameColorOnSq = this.tokens[p2].filter(x =>
                  x.status==='TRACK' && getAbsoluteTrackPos(p2,x.stepCount)===absPos
                ).length
                if (sameColorOnSq <= 1) {
                  t2.stepCount = -1
                  t2.status = 'BASE'
                  this.hasCaptured = true
                  event = 'capture'
                }
              }
            })
          }
        }
      }
    }

    this.dice = null
    this._evaluateTurn(event)
    return { success:true, event }
  }

  _evaluateTurn(event) {
    const bonusRoll = this.dice===null && (
      event==='capture' || event==='goal' || this.hasCaptured || this.hasReachedGoal ||
      this.consecutiveSixes > 0
    )

    if (bonusRoll) {
      // Player keeps turn
      this.hasCaptured = false
      this.hasReachedGoal = false
    } else {
      this._nextTurn()
    }
  }

  _nextTurn() {
    this.hasCaptured = false
    this.hasReachedGoal = false
    let next = (this.currentPlayer + 1) % this.playerCount
    // Skip finished players
    let guard = 0
    while (this.rankings.includes(next) && guard < this.playerCount) {
      next = (next + 1) % this.playerCount
      guard++
    }
    this.currentPlayer = next
    this.dice = null
  }

  autoPass() {
    this.dice = null
    this._nextTurn()
  }
}

// ─── AI Decision Engine ───────────────────────────────────────────────────────
export class LudoAI {
  constructor(profile='classic') {
    this.profile = profile  // 'classic' | 'rush'
  }

  getBestMove(engine) {
    const moves = engine.getValidMoves()
    if (!moves.length) return null
    if (moves.length === 1) return moves[0]

    if (this.profile === 'rush') return this._rushMove(moves, engine)
    return this._classicMove(moves, engine)
  }

  _classicMove(moves, engine) {
    // Priority: capture > enter > advance furthest > block
    const captures = moves.filter(m => this._wouldCapture(m, engine))
    if (captures.length) return captures[0]

    const enters = moves.filter(m => m.action==='enter')
    if (enters.length && engine.dice===6) return enters[0]

    // Advance token closest to goal
    const tracked = moves.filter(m => m.action==='move')
    if (tracked.length) {
      tracked.sort((a,b) => {
        const ta = engine.tokens[a.player][a.token].stepCount
        const tb = engine.tokens[b.player][b.token].stepCount
        return tb - ta  // furthest ahead first
      })
      return tracked[0]
    }
    return moves[0]
  }

  _rushMove(moves, engine) {
    const captures = moves.filter(m => this._wouldCapture(m, engine))
    if (captures.length) return captures[0]
    // Most aggressive: move token closest to any enemy
    return moves[Math.floor(Math.random() * moves.length)]
  }

  _wouldCapture(move, engine) {
    if (move.action !== 'move' || !move.newStep) return false
    const absPos = getAbsoluteTrackPos(move.player, move.newStep)
    if (SAFE_ZONES.has(absPos)) return false
    for (let p2=0; p2<engine.playerCount; p2++) {
      if (p2===move.player) continue
      for (const t2 of engine.tokens[p2]) {
        if (t2.status!=='TRACK') continue
        if (getAbsoluteTrackPos(p2,t2.stepCount)===absPos) return true
      }
    }
    return false
  }
}
