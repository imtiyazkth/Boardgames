import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

/**
 * Nine Men's Morris engine.
 * FIX: Win-check logic was reading the wrong player variable.
 *      After switching currentPlayer, opp2 was pointing at the player
 *      who just moved, not the one about to move — reversed the check.
 */

const ADJACENCY = {
  0:[1,7],   1:[0,2,9],   2:[1,3],   3:[2,4,11],
  4:[3,5],   5:[4,6,13],  6:[5,7],   7:[6,0,15],
  8:[9,15],  9:[8,10,17], 10:[9,11], 11:[10,12,19],
  12:[11,13],13:[12,14,21],14:[13,15],15:[14,8,23],
  16:[17,23],17:[16,18,9],18:[17,19],19:[18,20,11],
  20:[19,21],21:[20,22,13],22:[21,23],23:[22,16,15]
}

const MILLS = [
  [0,1,2],[2,3,4],[4,5,6],[6,7,0],
  [8,9,10],[10,11,12],[12,13,14],[14,15,8],
  [16,17,18],[18,19,20],[20,21,22],[22,23,16],
  [1,9,17],[3,11,19],[5,13,21],[7,15,23]
]

function checkMill(board, point, player) {
  return MILLS.some(mill => mill.includes(point) && mill.every(p => board[p] === player))
}

export class NineMensMorrisEngine extends BaseGameEngine {
  initializeGame() {
    this.history = []
    this.state = {
      board: Array(24).fill(null),
      phase: 1,
      currentPlayer: 'w',
      hand:  { w: 9, b: 9 },
      count: { w: 9, b: 9 },
      pendingCapture: false,
      lastMove: null,
      moveCount: 0,
      gameOver: false,
      winner: null
    }
    return this.state
  }

  getLegalMoves() {
    const { board, phase, currentPlayer, hand, pendingCapture, gameOver } = this.state
    if (gameOver) return []

    if (pendingCapture) {
      const opp = currentPlayer === 'w' ? 'b' : 'w'
      const pieces = board.map((v, i) => v === opp ? i : -1).filter(i => i >= 0)
      const notInMill = pieces.filter(i => !checkMill(board, i, opp))
      const targets = notInMill.length > 0 ? notInMill : pieces
      return targets.map(i => ({ type: 'capture', point: i }))
    }

    if (phase === 1) {
      return board.map((v, i) => v === null ? { type: 'place', point: i } : null).filter(Boolean)
    }

    const flying = this.state.count[currentPlayer] === 3
    const pieces = board.map((v, i) => v === currentPlayer ? i : -1).filter(i => i >= 0)
    const moves  = []
    for (const from of pieces) {
      const targets = flying
        ? board.map((v, i) => v === null ? i : -1).filter(i => i >= 0)
        : ADJACENCY[from].filter(i => board[i] === null)
      for (const to of targets) moves.push({ type: 'move', from, to })
    }
    return moves
  }

  applyMove(move) {
    if (this.state.gameOver) return { success: false, error: 'Game over' }
    this.history.push(this.cloneState())
    const state = this.cloneState()
    const { board, currentPlayer } = state

    if (move.type === 'capture') {
      if (board[move.point] === null || board[move.point] === currentPlayer)
        return { success: false, error: 'Invalid capture target' }
      board[move.point] = null
      const opp = currentPlayer === 'w' ? 'b' : 'w'
      state.count[opp]--
      state.pendingCapture  = false
      state.currentPlayer   = opp            // it's opponent's turn after capture

    } else if (move.type === 'place') {
      if (board[move.point] !== null) return { success: false, error: 'Occupied' }
      board[move.point] = currentPlayer
      state.hand[currentPlayer]--
      if (checkMill(board, move.point, currentPlayer)) {
        state.pendingCapture = true           // same player captures before switching
      } else {
        state.currentPlayer = currentPlayer === 'w' ? 'b' : 'w'
      }
      if (state.hand.w === 0 && state.hand.b === 0 && state.phase === 1) state.phase = 2

    } else if (move.type === 'move') {
      if (board[move.from] !== currentPlayer || board[move.to] !== null)
        return { success: false, error: 'Illegal move' }
      board[move.to]   = board[move.from]
      board[move.from] = null
      if (checkMill(board, move.to, currentPlayer)) {
        state.pendingCapture = true
      } else {
        state.currentPlayer = currentPlayer === 'w' ? 'b' : 'w'
      }
    } else {
      return { success: false, error: 'Unknown move type' }
    }

    state.board     = board
    state.moveCount++
    state.lastMove  = move

    // ── Win check ─────────────────────────────────────────────────────────
    // Only check when it's not a pending-capture turn (mid-mill resolution)
    // and we're in movement phase.
    // `state.currentPlayer` has already been updated to the NEXT player.
    // Check if the NEXT player is stuck (wins for the one who just moved).
    if (!state.pendingCapture && state.phase >= 2) {
      const nextPlayer  = state.currentPlayer                  // FIX: was reading wrong var
      const nextCount   = state.count[nextPlayer]
      const nextMoves   = this._countMovesForPlayer(state, nextPlayer)
      if (nextCount < 3 || nextMoves === 0) {
        state.gameOver = true
        state.winner   = currentPlayer                         // the one who JUST moved wins
      }
    }

    this.state = state
    return { success: true, newState: this.cloneState() }
  }

  _countMovesForPlayer(state, player) {
    const { board } = state
    let count = 0
    for (let i = 0; i < 24; i++) {
      if (board[i] === player) {
        for (const n of ADJACENCY[i]) { if (board[n] === null) count++ }
      }
    }
    return count
  }

  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: this.cloneState() }
  }

  isGameOver() { return this.state.gameOver }
  getResult() {
    if (!this.state.gameOver) return { winner: null }
    return { winner: this.state.winner, reason: 'Opponent has < 3 pieces or no legal moves' }
  }
}

// ─── Morris AI ────────────────────────────────────────────────────────────────
export class MorrisAI extends BaseAIEngine {
  getBestMove(engine) {
    if (this.level === 0) return this.randomMove(engine)
    const moves     = engine.getLegalMoves()
    if (!moves.length) return null
    let best = null, bestScore = -Infinity
    const ai = engine.state.currentPlayer
    for (const move of moves) {
      const sim = new NineMensMorrisEngine()
      sim.deserializeState(engine.serializeState())
      sim.applyMove(move)
      const score = this._evaluate(sim.state, ai)
      if (score > bestScore) { bestScore = score; best = move }
    }
    return best || this.randomMove(engine)
  }

  _evaluate(state, player) {
    const opp = player === 'w' ? 'b' : 'w'
    let score = (state.count[player] - state.count[opp]) * 10
    for (const mill of MILLS) {
      if (mill.every(p => state.board[p] === player)) score += 6
      if (mill.every(p => state.board[p] === opp))    score -= 6
    }
    if (state.winner === player) score += 1000
    if (state.winner === opp)    score -= 1000
    return score
  }
}

// Export point layout for the UI SVG renderer
export const MORRIS_POINTS = [
  [0,0],[3,0],[6,0],[6,3],[6,6],[3,6],[0,6],[0,3],
  [1,1],[3,1],[5,1],[5,3],[5,5],[3,5],[1,5],[1,3],
  [2,2],[3,2],[4,2],[4,3],[4,4],[3,4],[2,4],[2,3]
]

export const MORRIS_LINES = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],
  [8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,8],
  [16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,16],
  [1,9],[9,17],[3,11],[11,19],[5,13],[13,21],[7,15],[15,23]
]

export { checkMill, ADJACENCY, MILLS }
