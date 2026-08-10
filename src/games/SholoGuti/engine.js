import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

/**
 * Sholo Guti (16 Goti / Bagh-Chal variant) — Bengali strategy game.
 *
 * Board: 5×5 grid of intersections = 25 points (0–24).
 * Each player starts with 16 pieces packed on their half.
 * Move: slide one step along a line to an adjacent empty point.
 * Capture: jump over an adjacent enemy piece to an empty point beyond (like checkers).
 * Multiple captures in one turn are allowed.
 * Win: opponent cannot move OR has no pieces left.
 *
 * Board layout (row×col, 0-indexed):
 *   Points 0–4: row 0 (top)
 *   Points 5–9: row 1
 *   ...
 *   Points 20–24: row 4 (bottom)
 *
 * Diagonals only exist on specific squares (checkerboard pattern on this board).
 */

// All adjacencies (horizontal, vertical, diagonal where allowed)
function buildAdj() {
  const adj = Array.from({ length: 25 }, () => [])
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c
      // Horizontal/vertical
      if (c + 1 < 5) { adj[i].push(i + 1); adj[i + 1].push(i) }
      if (r + 1 < 5) { adj[i].push(i + 5); adj[i + 5].push(i) }
      // Diagonals on even sum squares
      if ((r + c) % 2 === 0) {
        if (r + 1 < 5 && c + 1 < 5) { adj[i].push(i + 6); adj[i + 6].push(i) }
        if (r + 1 < 5 && c - 1 >= 0) { adj[i].push(i + 4); adj[i + 4].push(i) }
      }
    }
  }
  // Deduplicate
  return adj.map(a => [...new Set(a)])
}

const ADJ = buildAdj()

function initBoard() {
  // White occupies rows 0-2 (top 13 + 3 middle), Black occupies rows 2-4
  // Standard start: each player fills their side
  const board = Array(25).fill(null)
  // Player 'w' (white) on indices 0–12 (rows 0,1, half of 2)
  for (let i = 0; i < 12; i++) board[i] = 'w'
  board[12] = null // center empty
  for (let i = 13; i < 25; i++) board[i] = 'b'
  // Flip so each player has 12 pieces initially for balance
  // Actually standard: white rows 0-1 (10 pieces), black rows 3-4 (10 pieces)
  for (let i = 0; i < 25; i++) board[i] = null
  for (let i = 0; i < 10; i++) board[i] = 'w'
  for (let i = 15; i < 25; i++) board[i] = 'b'
  return board
}

function getMoves(board, player) {
  const moves = []
  for (let from = 0; from < 25; from++) {
    if (board[from] !== player) continue
    for (const to of ADJ[from]) {
      if (board[to] === null) {
        moves.push({ from, to, captures: [] })
      } else if (board[to] !== player) {
        // Jump over (capture)
        const jumps = findJumps(board, player, from, to, [])
        moves.push(...jumps)
      }
    }
  }
  return moves
}

function findJumps(board, player, from, over, captured) {
  // Over must be opponent, landing must be empty and in line
  const dr = Math.floor(over / 5) - Math.floor(from / 5)
  const dc = (over % 5) - (from % 5)
  const landing = over + dr * 5 + dc
  if (landing < 0 || landing >= 25) return []
  if (Math.floor(landing / 5) !== Math.floor(over / 5) + dr) return []
  if (board[landing] !== null) return []
  const newCaptured = [...captured, over]
  const result = [{ from, to: landing, captures: newCaptured }]

  // Look for further jumps (multi-capture)
  const tempBoard = [...board]
  tempBoard[from] = null
  tempBoard[over] = null
  tempBoard[landing] = player
  for (const next of ADJ[landing]) {
    if (tempBoard[next] !== null && tempBoard[next] !== player && !newCaptured.includes(next)) {
      result.push(...findJumps(tempBoard, player, landing, next, newCaptured))
    }
  }
  return result
}

export class SholoGutiEngine extends BaseGameEngine {
  initializeGame() {
    this.history = []
    this.state = {
      board: initBoard(),
      currentPlayer: 'w',
      count: { w: 10, b: 10 },
      lastMove: null,
      gameOver: false,
      winner: null,
      moveCount: 0
    }
    return this.state
  }

  getLegalMoves() {
    if (this.state.gameOver) return []
    const all = getMoves(this.state.board, this.state.currentPlayer)
    // Captures are mandatory if available
    const caps = all.filter(m => m.captures.length > 0)
    return caps.length > 0 ? caps : all
  }

  applyMove({ from, to, captures }) {
    if (this.state.gameOver) return { success: false, error: 'Game over' }
    const legal = this.getLegalMoves()
    const ok = legal.some(m => m.from === from && m.to === to)
    if (!ok) return { success: false, error: 'Illegal move' }

    this.history.push(this.cloneState())
    const board = [...this.state.board]
    board[to] = board[from]
    board[from] = null
    const opp = this.state.currentPlayer === 'w' ? 'b' : 'w'
    for (const c of (captures || [])) board[c] = null

    const count = { ...this.state.count }
    count[opp] -= (captures || []).length

    const next = opp
    const nextMoves = getMoves(board, next)
    const gameOver = nextMoves.length === 0 || count[next] === 0
    const winner = gameOver ? this.state.currentPlayer : null

    this.state = {
      board, count, currentPlayer: gameOver ? this.state.currentPlayer : next,
      lastMove: { from, to, captures }, gameOver, winner,
      moveCount: this.state.moveCount + 1
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
    return { winner: this.state.winner, reason: 'Opponent has no moves or pieces' }
  }
}

export class SholoGutiAI extends BaseAIEngine {
  getBestMove(engine) {
    if (this.level === 0) return this.randomMove(engine)
    const moves = engine.getLegalMoves()
    let best = null, bestScore = -Infinity
    const aiPlayer = engine.state.currentPlayer
    for (const move of moves) {
      const sim = new SholoGutiEngine()
      sim.deserializeState(engine.serializeState())
      sim.applyMove(move)
      const score = (sim.state.count[aiPlayer] - sim.state.count[aiPlayer === 'w' ? 'b' : 'w']) * 10
        + (move.captures.length * 50)
        + (sim.state.winner === aiPlayer ? 10000 : 0)
      if (score > bestScore) { bestScore = score; best = move }
    }
    return best || this.randomMove(engine)
  }
}
