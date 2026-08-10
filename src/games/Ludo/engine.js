import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

/**
 * Ludo Engine — supports 2–4 players.
 *
 * Each player has 4 tokens.
 * Token states: -1 = home base, 0–51 = main track, 52–56 = home column, 57 = finished.
 *
 * Track mapping per player (offset into 52-square main track):
 *   Red=0, Blue=13, Green=26, Yellow=39
 *
 * Safe squares on main track: 0,8,13,21,26,34,39,47
 */

const PLAYER_START = [0, 13, 26, 39]    // Main track entry point per player
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47])
const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow']

export class LudoEngine extends BaseGameEngine {
  initializeGame({ playerCount = 4, playerNames = [] } = {}) {
    this.history = []
    this.state = {
      playerCount,
      playerNames: Array.from({ length: playerCount }, (_, i) => playerNames[i] || `Player ${i + 1}`),
      // tokens[p][t] = position: -1 home, 0-51 track, 52-56 home col, 57 finished
      tokens: Array.from({ length: playerCount }, () => [-1, -1, -1, -1]),
      currentPlayer: 0,
      dice: null,
      rolledSix: false,
      mustRollAgain: false,
      consecutiveSixes: 0,
      winner: null,
      gameOver: false,
      moveCount: 0
    }
    return this.state
  }

  getLegalMoves() {
    if (this.state.gameOver || this.state.dice === null) return [{ action: 'roll' }]
    const { tokens, currentPlayer, dice } = this.state
    const moves = []
    const myTokens = tokens[currentPlayer]
    const start = PLAYER_START[currentPlayer]

    for (let t = 0; t < 4; t++) {
      const pos = myTokens[t]
      if (pos === 57) continue // already finished

      if (pos === -1) {
        // Can only enter on 6
        if (dice === 6) moves.push({ action: 'move', token: t, from: -1, to: start })
      } else {
        const newPos = this._computeNewPos(currentPlayer, pos, dice)
        if (newPos !== null) moves.push({ action: 'move', token: t, from: pos, to: newPos })
      }
    }

    // If no legal token moves, must pass
    if (moves.length === 0) moves.push({ action: 'pass' })
    return moves
  }

  applyMove({ action, token, from, to }) {
    if (action === 'roll') {
      if (this.state.dice !== null) return { success: false, error: 'Already rolled' }
      const dice = Math.floor(Math.random() * 6) + 1
      const consec = dice === 6 ? this.state.consecutiveSixes + 1 : 0

      // 3 sixes in a row: forfeit turn
      if (consec >= 3) {
        this.state = { ...this.state, dice: null, consecutiveSixes: 0,
          currentPlayer: (this.state.currentPlayer + 1) % this.state.playerCount }
        return { success: true, newState: this.cloneState(), event: 'three_sixes' }
      }
      this.state = { ...this.state, dice, rolledSix: dice === 6, consecutiveSixes: consec }
      return { success: true, newState: this.cloneState() }
    }

    if (action === 'pass') {
      this.state = { ...this.state, dice: null, currentPlayer: (this.state.currentPlayer + 1) % this.state.playerCount }
      return { success: true, newState: this.cloneState() }
    }

    if (action === 'move') {
      this.history.push(this.cloneState())
      const tokens = this.state.tokens.map(row => [...row])
      const p = this.state.currentPlayer
      tokens[p][token] = to

      let event = null
      // Check capture (only on main track, not safe squares)
      if (to >= 0 && to < 52 && !SAFE_SQUARES.has(to)) {
        for (let op = 0; op < this.state.playerCount; op++) {
          if (op === p) continue
          for (let t2 = 0; t2 < 4; t2++) {
            // Convert opponent position to absolute track
            const opAbsPos = this._toAbsolute(op, tokens[op][t2])
            const myAbsPos = this._toAbsolute(p, to)
            if (opAbsPos !== null && myAbsPos !== null && opAbsPos === myAbsPos) {
              tokens[op][t2] = -1 // send home
              event = 'capture'
            }
          }
        }
      }

      // Check win
      const allDone = tokens[p].every(t2 => t2 === 57)
      const dice = this.state.rolledSix || event === 'capture' ? null : null
      const nextPlayer = this.state.rolledSix || event === 'capture'
        ? p : (p + 1) % this.state.playerCount
      const rollAgain = this.state.rolledSix || event === 'capture'

      this.state = {
        ...this.state, tokens, dice: null, rolledSix: false,
        mustRollAgain: rollAgain, consecutiveSixes: 0,
        currentPlayer: allDone ? p : nextPlayer,
        winner: allDone ? p : null, gameOver: allDone,
        moveCount: this.state.moveCount + 1
      }
      return { success: true, newState: this.cloneState(), event }
    }
    return { success: false, error: 'Unknown action' }
  }

  _computeNewPos(player, pos, dice) {
    if (pos === -1) return dice === 6 ? PLAYER_START[player] : null

    // Convert to relative position (steps from start)
    const start = PLAYER_START[player]
    const rel = ((pos - start) + 52) % 52
    const newRel = rel + dice

    if (newRel < 52) {
      // Still on main track
      return (start + newRel) % 52
    } else if (newRel <= 56) {
      // In home column (52–56)
      return newRel
    } else if (newRel === 57) {
      return 57 // finished!
    }
    return null // overshoot
  }

  _toAbsolute(player, pos) {
    if (pos < 0 || pos >= 52) return null
    return pos
  }

  isGameOver() { return this.state.gameOver }
  getResult() {
    if (!this.state.gameOver) return { winner: null }
    return { winner: this.state.winner, reason: `${this.state.playerNames[this.state.winner]} finished all tokens!` }
  }
  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: this.cloneState() }
  }
}

export class LudoAI extends BaseAIEngine {
  getBestMove(engine) {
    const moves = engine.getLegalMoves().filter(m => m.action === 'move')
    if (!moves.length) return engine.getLegalMoves()[0] || null

    // Heuristic: prefer captures > finishing > advancing > entering
    let best = null, bestScore = -Infinity
    const p = engine.state.currentPlayer

    for (const move of moves) {
      let score = 0
      if (move.to === 57) score += 1000        // finishing a token
      else if (move.to >= 52) score += 200      // entering home column
      else if (!SAFE_SQUARES.has(move.to)) score += this._captureValue(engine, p, move.to)
      score += move.to >= 0 ? engine.state.dice : 0
      if (score > bestScore) { bestScore = score; best = move }
    }
    return best
  }

  _captureValue(engine, player, to) {
    const { tokens, playerCount } = engine.state
    for (let op = 0; op < playerCount; op++) {
      if (op === player) continue
      if (tokens[op].some(t => t === to)) return 500
    }
    return 0
  }
}
