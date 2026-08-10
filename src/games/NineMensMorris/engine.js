import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

/**
 * Nine Men's Morris (Mill) — 24-point board.
 * Points 0-23 numbered in 3 concentric squares.
 *
 * Outer square: 0-7, Middle: 8-15, Inner: 16-23
 *
 *  0 ─────── 1 ─────── 2
 *  │  8 ──── 9 ──── 10  │
 *  │  │ 16─17─18   │  │
 *  7  15  23  19  11  3
 *  │  │ 22─21─20   │  │
 *  │  14──13───12  │  │
 *  6 ─────── 5 ─────── 4
 */

// Adjacency: which points are connected by lines
const ADJACENCY = {
  0:[1,7], 1:[0,2,9], 2:[1,3], 3:[2,4,11], 4:[3,5], 5:[4,6,13], 6:[5,7], 7:[6,0,15],
  8:[9,15], 9:[8,10,17], 10:[9,11], 11:[10,12,19], 12:[11,13], 13:[12,14,21], 14:[13,15], 15:[14,8,23],
  16:[17,23], 17:[16,18,9], 18:[17,19], 19:[18,20,11], 20:[19,21], 21:[20,22,13], 22:[21,23], 23:[22,16,15]
}

// All mill patterns (3 in a row)
const MILLS = [
  [0,1,2],[2,3,4],[4,5,6],[6,7,0],      // outer
  [8,9,10],[10,11,12],[12,13,14],[14,15,8], // middle
  [16,17,18],[18,19,20],[20,21,22],[22,23,16], // inner
  [1,9,17],[3,11,19],[5,13,21],[7,15,23]   // connectors
]

function checkMill(board, point, player) {
  return MILLS.some(mill => mill.includes(point) && mill.every(p => board[p] === player))
}

export class NineMensMorrisEngine extends BaseGameEngine {
  initializeGame({ player1 = 'w', player2 = 'b' } = {}) {
    this.history = []
    this.state = {
      board: Array(24).fill(null),
      phase: 1,           // 1=placement, 2=movement, 3=flying
      currentPlayer: 'w',
      hand: { w: 9, b: 9 },       // pieces yet to place
      count: { w: 9, b: 9 },      // pieces on board or in hand
      pendingCapture: false,       // must capture after forming mill
      lastMove: null,
      moveCount: 0,
      gameOver: false,
      winner: null
    }
    return this.state
  }

  getLegalMoves() {
    const { board, phase, currentPlayer, hand, pendingCapture } = this.state
    if (this.state.gameOver) return []

    if (pendingCapture) {
      // Must remove an opponent piece (not in a mill if possible)
      const opp = currentPlayer === 'w' ? 'b' : 'w'
      const oppPieces = board.map((v, i) => v === opp ? i : -1).filter(i => i >= 0)
      const notInMill = oppPieces.filter(i => !checkMill(board, i, opp))
      const targets = notInMill.length > 0 ? notInMill : oppPieces
      return targets.map(i => ({ type: 'capture', point: i }))
    }

    if (phase === 1) {
      // Placement phase
      return board.map((v, i) => v === null ? { type: 'place', point: i } : null).filter(Boolean)
    }

    // Movement/Flying phase
    const flying = this.state.count[currentPlayer] === 3
    const pieces = board.map((v, i) => v === currentPlayer ? i : -1).filter(i => i >= 0)
    const moves = []
    for (const from of pieces) {
      const targets = flying
        ? board.map((v, i) => v === null ? i : -1).filter(i => i >= 0)
        : ADJACENCY[from].filter(i => board[i] === null)
      for (const to of targets) {
        moves.push({ type: 'move', from, to })
      }
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
        return { success: false, error: 'Invalid capture' }
      board[move.point] = null
      const opp = currentPlayer === 'w' ? 'b' : 'w'
      state.count[opp]--
      state.pendingCapture = false
      state.currentPlayer = opp
    } else if (move.type === 'place') {
      if (board[move.point] !== null) return { success: false, error: 'Occupied' }
      board[move.point] = currentPlayer
      state.hand[currentPlayer]--
      if (checkMill(board, move.point, currentPlayer)) {
        state.pendingCapture = true
      } else {
        state.currentPlayer = currentPlayer === 'w' ? 'b' : 'w'
      }
      // Transition to phase 2
      if (state.hand.w === 0 && state.hand.b === 0 && state.phase === 1) state.phase = 2
    } else if (move.type === 'move') {
      if (board[move.from] !== currentPlayer || board[move.to] !== null)
        return { success: false, error: 'Illegal move' }
      board[move.to] = board[move.from]
      board[move.from] = null
      if (checkMill(board, move.to, currentPlayer)) {
        state.pendingCapture = true
      } else {
        state.currentPlayer = currentPlayer === 'w' ? 'b' : 'w'
      }
    }

    state.board = board
    state.moveCount++
    state.lastMove = move

    // Check win: opponent has < 3 pieces or no moves
    const opp2 = state.currentPlayer === 'w' ? 'b' : 'w'
    if (!state.pendingCapture && state.phase >= 2) {
      const oppCount = state.count[opp2]
      const oppMoves = this._countMovesForPlayer(state, opp2)
      if (oppCount < 3 || oppMoves === 0) {
        state.gameOver = true
        state.winner = state.currentPlayer === 'w' ? 'b' : 'w'
        // winner = the one who just moved (before switching)
        state.winner = currentPlayer
      }
    }

    this.state = state
    return { success: true, newState: this.cloneState() }
  }

  _countMovesForPlayer(state, player) {
    const { board } = state
    let c = 0
    for (let i = 0; i < 24; i++) {
      if (board[i] === player) {
        for (const n of ADJACENCY[i]) { if (board[n] === null) c++ }
      }
    }
    return c
  }

  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: this.cloneState() }
  }

  isGameOver() { return this.state.gameOver }
  getResult() {
    if (!this.state.gameOver) return { winner: null }
    return { winner: this.state.winner, reason: 'Opponent has fewer than 3 pieces or no moves' }
  }
}

// ─── Morris AI ─────────────────────────────────────────────────────────────

export class MorrisAI extends BaseAIEngine {
  getBestMove(engine) {
    if (this.level === 0) return this.randomMove(engine)
    const moves = engine.getLegalMoves()
    if (!moves.length) return null

    let best = null, bestScore = -Infinity
    const aiPlayer = engine.state.currentPlayer

    for (const move of moves) {
      const sim = new NineMensMorrisEngine()
      sim.deserializeState(engine.serializeState())
      sim.applyMove(move)
      const score = this._evaluate(sim.state, aiPlayer)
      if (score > bestScore) { bestScore = score; best = move }
    }
    return best || this.randomMove(engine)
  }

  _evaluate(state, player) {
    const opp = player === 'w' ? 'b' : 'w'
    let score = (state.count[player] - state.count[opp]) * 10
    // Count mills
    for (const mill of MILLS) {
      if (mill.every(p => state.board[p] === player)) score += 5
      if (mill.every(p => state.board[p] === opp)) score -= 5
    }
    return score + (state.winner === player ? 1000 : 0)
  }
}
