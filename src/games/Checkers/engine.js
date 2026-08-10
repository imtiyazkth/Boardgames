import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

// Board: 8×8, pieces on dark squares only. Player 1 = 'r' (red, starts bottom), Player 2 = 'b' (black, starts top)
// Cell representation: null | 'r' | 'R' (king) | 'b' | 'B' (king)

function initBoard() {
  const board = Array(64).fill(null)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row * 8 + col] = 'b'
    }
  }
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row * 8 + col] = 'r'
    }
  }
  return board
}

function playerOf(piece) {
  if (!piece) return null
  return piece.toLowerCase() === 'r' ? 'r' : 'b'
}

function isKing(piece) { return piece === 'R' || piece === 'B' }

function getMoves(board, player) {
  const moves = []
  const captures = []

  for (let i = 0; i < 64; i++) {
    const piece = board[i]
    if (!piece || playerOf(piece) !== player) continue
    const row = Math.floor(i / 8), col = i % 8

    // Directions
    const dirs = []
    if (player === 'r' || isKing(piece)) dirs.push([-1, -1], [-1, 1]) // up
    if (player === 'b' || isKing(piece)) dirs.push([1, -1], [1, 1])   // down

    for (const [dr, dc] of dirs) {
      const nr = row + dr, nc = col + dc
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue
      const nIdx = nr * 8 + nc

      if (board[nIdx] === null) {
        moves.push({ from: i, to: nIdx, captures: [] })
      } else if (playerOf(board[nIdx]) !== player) {
        // Possible capture
        const jr = row + dr * 2, jc = col + dc * 2
        if (jr >= 0 && jr <= 7 && jc >= 0 && jc <= 7 && board[jr * 8 + jc] === null) {
          captures.push({ from: i, to: jr * 8 + jc, captures: [nIdx] })
        }
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
      scores: { r: 0, b: 0 },
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
    const { from, to, captures } = move
    if (this.state.gameOver) return { success: false, error: 'Game over' }

    const legal = this.getLegalMoves()
    const isLegal = legal.some(m => m.from === from && m.to === to)
    if (!isLegal) return { success: false, error: 'Illegal move' }

    this.history.push(this.cloneState())
    const board = [...this.state.board]
    const piece = board[from]
    board[to] = piece
    board[from] = null

    // Remove captured pieces
    for (const ci of (captures || [])) board[ci] = null

    // Promote to king
    const toRow = Math.floor(to / 8)
    if (piece === 'r' && toRow === 0) board[to] = 'R'
    if (piece === 'b' && toRow === 7) board[to] = 'B'

    const next = this.state.currentPlayer === 'r' ? 'b' : 'r'
    const nextMoves = getMoves(board, next)
    const gameOver = nextMoves.length === 0
    const winner = gameOver ? this.state.currentPlayer : null

    this.state = {
      ...this.state,
      board,
      currentPlayer: gameOver ? this.state.currentPlayer : next,
      moveCount: this.state.moveCount + 1,
      gameOver,
      winner
    }
    return { success: true, newState: this.cloneState() }
  }

  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: this.cloneState() }
  }

  isGameOver() { return this.state.gameOver }

  getResult() {
    if (!this.state.gameOver) return { winner: null }
    return { winner: this.state.winner, reason: 'No moves left for opponent' }
  }
}

// ─── Checkers AI ───────────────────────────────────────────────────────────

export class CheckersAI extends BaseAIEngine {
  getBestMove(engine) {
    if (this.level === 0) return this.randomMove(engine)

    const state = engine.state
    const depth = this.getDepth()
    const result = this._minimax(state, depth, -Infinity, Infinity, true, state.currentPlayer)
    return result.move || this.randomMove(engine)
  }

  _minimax(state, depth, alpha, beta, isMax, aiPlayer) {
    if (depth === 0 || state.gameOver) {
      return { score: this._evaluate(state, aiPlayer) }
    }

    const moves = getMoves(state.board, state.currentPlayer)
    if (moves.length === 0) {
      return { score: isMax ? -1000 : 1000 }
    }

    let best = { score: isMax ? -Infinity : Infinity, move: null }

    for (const move of moves) {
      // Apply move to cloned state
      const nextState = this._applyMoveToState(state, move)
      const result = this._minimax(nextState, depth - 1, alpha, beta, !isMax, aiPlayer)

      if (isMax ? result.score > best.score : result.score < best.score) {
        best = { score: result.score, move }
      }
      if (isMax) alpha = Math.max(alpha, best.score)
      else beta = Math.min(beta, best.score)
      if (beta <= alpha) break
    }
    return best
  }

  _applyMoveToState(state, { from, to, captures }) {
    const board = [...state.board]
    board[to] = board[from]
    board[from] = null
    for (const ci of (captures || [])) board[ci] = null
    const toRow = Math.floor(to / 8)
    if (board[to] === 'r' && toRow === 0) board[to] = 'R'
    if (board[to] === 'b' && toRow === 7) board[to] = 'B'
    const next = state.currentPlayer === 'r' ? 'b' : 'r'
    return { ...state, board, currentPlayer: next, moveCount: state.moveCount + 1 }
  }

  _evaluate(state, aiPlayer) {
    const opp = aiPlayer === 'r' ? 'b' : 'r'
    let score = 0
    for (const piece of state.board) {
      if (!piece) continue
      const p = playerOf(piece)
      const v = isKing(piece) ? 3 : 1
      if (p === aiPlayer) score += v
      else score -= v
    }
    return score
  }
}


