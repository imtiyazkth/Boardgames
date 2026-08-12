/**
 * BaseGameEngine — contract every game engine must implement.
 * Engines are pure JS with zero React / DOM dependency.
 * Rules are always separate from rendering.
 */
export const MODE = { solo:'solo', local2p:'local2p', aiVsAi:'aiVsAi' }

export class BaseGameEngine {
  constructor(config = {}) { this.config = config; this.state = null }

  initializeGame(options = {}) { throw new Error('initializeGame not implemented') }
  getLegalMoves()              { throw new Error('getLegalMoves not implemented') }
  applyMove(move)              { throw new Error('applyMove not implemented') }
  isGameOver()                 { throw new Error('isGameOver not implemented') }
  getResult()                  { throw new Error('getResult not implemented') }

  undoMove()       { return { success: false, reason: 'Undo not supported' } }
  getCurrentPlayer() { return this.state?.currentPlayer ?? null }
  getScore()         { return this.state?.score ?? {} }

  /** Deep clone any state object — pure utility, does not touch `this.state`. */
  cloneState(state = this.state) {
    return JSON.parse(JSON.stringify(state))
  }

  serializeState()      { return this.cloneState(this.state) }
  deserializeState(obj) { this.state = this.cloneState(obj) }

  getHints() {
    const moves = this.getLegalMoves()
    return moves.slice(0, 3)
  }

  validateMove(move) {
    const legal  = this.getLegalMoves()
    const moveStr = JSON.stringify(move)
    const valid  = legal.some(m => JSON.stringify(m) === moveStr)
    return { valid, reason: valid ? 'OK' : 'Illegal move' }
  }
}

export class BaseAIEngine {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty
    this._map = { beginner:0, easy:1, normal:2, hard:3, expert:4 }
    this.level = this._map[difficulty] ?? 2
  }

  getBestMove(engine)              { throw new Error('getBestMove not implemented') }
  evaluatePosition(state, player)  { return 0 }

  suggestHint(engine) {
    return this.randomMove(engine)
  }

  getDepth() { return [1, 2, 3, 5, 7][this.level] ?? 2 }

  randomMove(engine) {
    const moves = engine.getLegalMoves()
    return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null
  }
}
