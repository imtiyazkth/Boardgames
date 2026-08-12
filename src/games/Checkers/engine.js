import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

/**
 * Checkers (Draughts) engine.
 * Red ('r') starts bottom, Black ('b') starts top.
 * Kings: 'R' and 'B'.
 * Captures mandatory. Multi-jump supported.
 */

function playerOf(piece) { return piece ? piece.toLowerCase() : null }
function isKing(piece)   { return piece === 'R' || piece === 'B' }

function initBoard() {
  const board = Array(64).fill(null)
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 8; col++)
      if ((row + col) % 2 === 1) board[row * 8 + col] = 'b'
  for (let row = 5; row < 8; row++)
    for (let col = 0; col < 8; col++)
      if ((row + col) % 2 === 1) board[row * 8 + col] = 'r'
  return board
}

/** Generate all moves (simple + capture) for `player` on `board`. */
function getMoves(board, player) {
  const moves    = []
  const captures = []
  const sign     = player === 'r' ? 1 : -1

  for (let i = 0; i < 64; i++) {
    const piece = board[i]
    if (!piece || playerOf(piece) !== player) continue
    const row = Math.floor(i / 8), col = i % 8

    const dirs = []
    if (player === 'r' || isKing(piece)) dirs.push([-1, -1], [-1, 1])
    if (player === 'b' || isKing(piece)) dirs.push([1, -1],  [1, 1])

    for (const [dr, dc] of dirs) {
      const nr = row + dr, nc = col + dc
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue
      const nIdx = nr * 8 + nc

      if (board[nIdx] === null) {
        moves.push({ from: i, to: nIdx, captures: [] })
      } else if (playerOf(board[nIdx]) !== player) {
        const jr = row + dr * 2, jc = col + dc * 2
        if (jr >= 0 && jr <= 7 && jc >= 0 && jc <= 7 && board[jr * 8 + jc] === null)
          captures.push({ from: i, to: jr * 8 + jc, captures: [nIdx] })
      }
    }
  }
  // Captures are mandatory
  return captures.length > 0 ? captures : moves
}

export class CheckersEngine extends BaseGameEngine {
  initializeGame() {
    this.history = []
    this.state = {
      board: initBoard(),
      currentPlayer: 'r',
      counts: { r: 12, b: 12 },
      moveCount: 0,
      gameOver: false,
      winner: null
    }
    return this.state
  }

  getLegalMoves() {
    if (this.state.gameOver) return []
    return getMoves(this.state.board, this.state.currentPlayer)
  }

  applyMove(move) {
    if (this.state.gameOver) return { success: false, error: 'Game over' }
    const legal = getMoves(this.state.board, this.state.currentPlayer)
    if (!legal.some(m => m.from === move.from && m.to === move.to))
      return { success: false, error: 'Illegal move' }

    this.history.push(this.cloneState())
    const board  = [...this.state.board]
    const piece  = board[move.from]
    board[move.to]   = piece
    board[move.from] = null

    let wasCapture = false
    for (const ci of (move.captures || [])) {
      const opp = playerOf(board[ci])
      board[ci] = null
      if (opp) this.state.counts = { ...this.state.counts, [opp]: (this.state.counts[opp] || 0) - 1 }
      wasCapture = true
    }

    // King promotion
    const toRow = Math.floor(move.to / 8)
    let promoted = false
    if (piece === 'r' && toRow === 0) { board[move.to] = 'R'; promoted = true }
    if (piece === 'b' && toRow === 7) { board[move.to] = 'B'; promoted = true }

    const next      = this.state.currentPlayer === 'r' ? 'b' : 'r'
    const nextMoves = getMoves(board, next)
    const gameOver  = nextMoves.length === 0

    this.state = {
      ...this.state,
      board,
      currentPlayer: gameOver ? this.state.currentPlayer : next,
      moveCount: this.state.moveCount + 1,
      gameOver,
      winner: gameOver ? this.state.currentPlayer : null,
      lastMove: { ...move, wasCapture, promoted }
    }
    return { success: true, newState: this.cloneState(), wasCapture, promoted }
  }

  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: this.cloneState() }
  }

  isGameOver() { return this.state.gameOver }
  getResult() {
    if (!this.state.gameOver) return { winner: null }
    return { winner: this.state.winner, reason: 'No legal moves for opponent' }
  }
}

// ─── Checkers AI (alpha-beta) ────────────────────────────────────────────────
export class CheckersAI extends BaseAIEngine {
  getBestMove(engine) {
    if (this.level === 0) return this.randomMove(engine)
    const result = this._minimax(engine.state, this.getDepth(), -Infinity, Infinity, true, engine.state.currentPlayer, engine)
    return result.move || this.randomMove(engine)
  }

  _minimax(state, depth, alpha, beta, isMax, aiPlayer, eng) {
    if (depth === 0 || state.gameOver) return { score: this._eval(state, aiPlayer) }
    const moves = getMoves(state.board, state.currentPlayer)
    if (!moves.length) return { score: isMax ? -Infinity : Infinity }
    let best = { score: isMax ? -Infinity : Infinity, move: null }
    for (const move of moves) {
      const ns = this._applyFast(state, move)
      const r  = this._minimax(ns, depth - 1, alpha, beta, !isMax, aiPlayer, eng)
      if (isMax ? r.score > best.score : r.score < best.score) best = { score: r.score, move }
      if (isMax) alpha = Math.max(alpha, best.score)
      else       beta  = Math.min(beta,  best.score)
      if (beta <= alpha) break
    }
    return best
  }

  _applyFast(state, move) {
    const board = [...state.board]
    board[move.to]   = board[move.from]
    board[move.from] = null
    for (const ci of (move.captures || [])) board[ci] = null
    const toRow = Math.floor(move.to / 8)
    if (board[move.to] === 'r' && toRow === 0) board[move.to] = 'R'
    if (board[move.to] === 'b' && toRow === 7) board[move.to] = 'B'
    const next      = state.currentPlayer === 'r' ? 'b' : 'r'
    const nextMoves = getMoves(board, next)
    return {
      ...state,
      board,
      currentPlayer: next,
      gameOver: nextMoves.length === 0,
      winner: nextMoves.length === 0 ? state.currentPlayer : null
    }
  }

  _eval(state, player) {
    const opp = player === 'r' ? 'b' : 'r'
    let score = 0
    for (const p of state.board) {
      if (!p) continue
      const owner = playerOf(p)
      const val   = isKing(p) ? 3 : 1
      if (owner === player) score += val
      else if (owner === opp) score -= val
    }
    if (state.winner === player) score += 1000
    if (state.winner === opp)    score -= 1000
    return score
  }
}

export { getMoves, playerOf, isKing }
