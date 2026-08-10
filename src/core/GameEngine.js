/**
 * BaseGameEngine — abstract contract every game engine must satisfy.
 * Rules are ALWAYS separate from rendering.
 * Engines are pure JS with no React/DOM dependencies.
 */

export class BaseGameEngine {
  constructor(config = {}) {
    this.config = config
    this.state = null
  }

  /** Initialize a fresh game. Must set this.state. */
  initializeGame(options = {}) { throw new Error('Not implemented: initializeGame') }

  /** Return array of legal moves for the current player. */
  getLegalMoves() { throw new Error('Not implemented: getLegalMoves') }

  /**
   * Apply a move. Returns { success, newState, error }.
   * Never mutates state directly — return a new state.
   */
  applyMove(move) { throw new Error('Not implemented: applyMove') }

  /** Undo the last move. Returns { success, newState }. */
  undoMove() { return { success: false, reason: 'Undo not supported' } }

  /** Returns true/false */
  isGameOver() { throw new Error('Not implemented: isGameOver') }

  /**
   * Returns { winner: playerId|'draw'|null, reason: string }
   * winner is null if game is not over.
   */
  getResult() { throw new Error('Not implemented: getResult') }

  /** Return a plain JS object (safe to JSON.stringify). */
  serializeState() {
    return JSON.parse(JSON.stringify(this.state))
  }

  /** Restore state from serialized object. */
  deserializeState(serialized) {
    this.state = JSON.parse(JSON.stringify(serialized))
  }

  /** Return hint moves (subset of legal moves, ranked). */
  getHints() { return this.getLegalMoves().slice(0, 3) }

  /** Validate a move without applying it. Returns { valid, reason }. */
  validateMove(move) {
    const legal = this.getLegalMoves()
    const isLegal = legal.some(m => JSON.stringify(m) === JSON.stringify(move))
    return { valid: isLegal, reason: isLegal ? 'OK' : 'Illegal move' }
  }

  /** Returns current turn player id */
  getCurrentPlayer() { return this.state?.currentPlayer ?? null }

  /** Returns game score object */
  getScore() { return this.state?.score ?? {} }

  /** Deep clone state safely */
  cloneState(state = this.state) {
    return JSON.parse(JSON.stringify(state))
  }
}

/**
 * BaseAIEngine — abstract contract for AI per game.
 */
export class BaseAIEngine {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty
    this.difficultyMap = { beginner: 0, easy: 1, normal: 2, hard: 3, expert: 4 }
    this.level = this.difficultyMap[difficulty] ?? 2
  }

  /** Returns the best move for the given engine state. Async-safe. */
  getBestMove(engine) { throw new Error('Not implemented: getBestMove') }

  /** Returns a numeric evaluation of the position for a player. */
  evaluatePosition(state, playerId) { return 0 }

  /** Returns hint move for the current player (non-AI context). */
  suggestHint(engine) {
    const moves = engine.getLegalMoves()
    return moves[Math.floor(Math.random() * moves.length)] || null
  }

  /** Adjust thinking depth based on difficulty */
  getDepth() {
    return [1, 2, 3, 5, 7][this.level] ?? 2
  }

  /** Random move fallback */
  randomMove(engine) {
    const moves = engine.getLegalMoves()
    return moves[Math.floor(Math.random() * moves.length)] || null
  }
}
