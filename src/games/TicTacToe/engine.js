import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

// ─── Win patterns (index pairs on 3×3 board) ───────────────────────────────
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],   // rows
  [0,3,6],[1,4,7],[2,5,8],   // cols
  [0,4,8],[2,4,6]             // diags
]

export class TicTacToeEngine extends BaseGameEngine {
  initializeGame({ player1 = 'X', player2 = 'O' } = {}) {
    this.history = []
    this.state = {
      board: Array(9).fill(null),        // null | 'X' | 'O'
      currentPlayer: 'X',
      players: { X: player1, O: player2 },
      moveCount: 0,
      winLine: null,
      gameOver: false,
      winner: null
    }
    return this.state
  }

  getLegalMoves() {
    if (this.state.gameOver) return []
    return this.state.board
      .map((cell, i) => (cell === null ? { index: i } : null))
      .filter(Boolean)
  }

  applyMove({ index }) {
    if (this.state.gameOver) return { success: false, error: 'Game is over' }
    if (this.state.board[index] !== null) return { success: false, error: 'Cell occupied' }

    const prev = this.cloneState()
    this.history.push(prev)

    const board = [...this.state.board]
    board[index] = this.state.currentPlayer
    const winLine = this._checkWin(board, this.state.currentPlayer)
    const isDraw = !winLine && board.every(c => c !== null)

    this.state = {
      ...this.state,
      board,
      moveCount: this.state.moveCount + 1,
      winLine: winLine || null,
      gameOver: !!winLine || isDraw,
      winner: winLine ? this.state.currentPlayer : isDraw ? 'draw' : null,
      currentPlayer: this.state.currentPlayer === 'X' ? 'O' : 'X'
    }
    return { success: true, newState: this.cloneState() }
  }

  undoMove() {
    if (this.history.length === 0) return { success: false, reason: 'No moves to undo' }
    this.state = this.history.pop()
    return { success: true, newState: this.cloneState() }
  }

  isGameOver() { return this.state.gameOver }

  getResult() {
    if (!this.state.gameOver) return { winner: null, reason: 'In progress' }
    if (this.state.winner === 'draw') return { winner: 'draw', reason: 'Board full' }
    return { winner: this.state.winner, reason: 'Three in a row' }
  }

  getCurrentPlayer() { return this.state.currentPlayer }

  _checkWin(board, player) {
    for (const line of WIN_LINES) {
      if (line.every(i => board[i] === player)) return line
    }
    return null
  }
}

// ─── Perfect Minimax AI ─────────────────────────────────────────────────────

export class TicTacToeAI extends BaseAIEngine {
  getBestMove(engine) {
    const state = engine.state
    if (engine.isGameOver()) return null

    // Beginner: random
    if (this.level === 0) return this.randomMove(engine)

    // Easy: 50% random
    if (this.level === 1 && Math.random() < 0.5) return this.randomMove(engine)

    // Normal: 80% optimal
    const best = this._minimax(state, state.currentPlayer, true)

    if (this.level === 2 && Math.random() < 0.2) return this.randomMove(engine)

    return best.move ? { index: best.move } : this.randomMove(engine)
  }

  _minimax(state, aiPlayer, isMaximizing, depth = 0) {
    const winner = this._evalWinner(state)
    if (winner === aiPlayer) return { score: 10 - depth }
    if (winner !== null && winner !== aiPlayer) return { score: depth - 10 }
    const empty = state.board.map((c, i) => c === null ? i : -1).filter(i => i >= 0)
    if (empty.length === 0) return { score: 0 }

    let best = isMaximizing ? { score: -Infinity, move: null } : { score: Infinity, move: null }

    for (const i of empty) {
      const newBoard = [...state.board]
      newBoard[i] = state.currentPlayer
      const newState = {
        ...state,
        board: newBoard,
        currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X'
      }
      const result = this._minimax(newState, aiPlayer, !isMaximizing, depth + 1)
      if (isMaximizing ? result.score > best.score : result.score < best.score) {
        best = { score: result.score, move: i }
      }
    }
    return best
  }

  _evalWinner(state) {
    const WIN_LINES = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ]
    for (const line of WIN_LINES) {
      const [a, b, c] = line
      if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
        return state.board[a]
      }
    }
    return null
  }
}
