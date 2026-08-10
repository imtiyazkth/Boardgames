import { BaseGameEngine } from '../../core/GameEngine.js'

// Classic board: snakes (head→tail) and ladders (bottom→top)
const SNAKES = { 99:37, 95:75, 92:88, 89:68, 74:53, 64:60, 62:19, 49:11, 46:25, 16:6 }
const LADDERS = { 2:38, 7:14, 8:31, 15:26, 21:42, 28:84, 36:44, 51:67, 71:91, 78:98, 87:94 }

export class SnakesLaddersEngine extends BaseGameEngine {
  initializeGame({ playerCount = 2, playerNames = ['Player 1', 'Player 2'] } = {}) {
    this.state = {
      positions: Array(playerCount).fill(0),
      currentPlayer: 0,
      playerCount,
      playerNames,
      dice: null,
      lastEvent: null, // 'snake' | 'ladder' | 'win' | null
      winner: null,
      gameOver: false,
      moveCount: 0
    }
    return this.state
  }

  getLegalMoves() {
    if (this.state.gameOver) return []
    return [{ action: 'roll' }]
  }

  applyMove({ action }) {
    if (action !== 'roll' || this.state.gameOver) return { success: false, error: 'Invalid' }

    const dice = Math.floor(Math.random() * 6) + 1
    const p = this.state.currentPlayer
    let pos = this.state.positions[p] + dice
    let event = null

    if (pos > 100) {
      // Bounce back
      pos = 100 - (pos - 100)
    }

    if (pos === 100) {
      event = 'win'
    } else if (SNAKES[pos]) {
      event = 'snake'
      pos = SNAKES[pos]
    } else if (LADDERS[pos]) {
      event = 'ladder'
      pos = LADDERS[pos]
    }

    const positions = [...this.state.positions]
    positions[p] = pos
    const winner = event === 'win' ? p : null
    const nextPlayer = (p + 1) % this.state.playerCount

    this.state = {
      ...this.state,
      positions,
      dice,
      lastEvent: event,
      winner,
      gameOver: winner !== null,
      currentPlayer: winner !== null ? p : nextPlayer,
      moveCount: this.state.moveCount + 1
    }
    return { success: true, newState: this.cloneState() }
  }

  isGameOver() { return this.state.gameOver }

  getResult() {
    if (!this.state.gameOver) return { winner: null }
    return { winner: this.state.winner, reason: `${this.state.playerNames[this.state.winner]} reached 100!` }
  }

  /** Get the cell at 1-100 position in standard board layout */
  static cellPosition(num) {
    // Row from bottom (0-indexed)
    const row = Math.floor((num - 1) / 10)
    const col = row % 2 === 0
      ? (num - 1) % 10         // left to right on even rows
      : 9 - (num - 1) % 10    // right to left on odd rows
    return { row: 9 - row, col }
  }
}
