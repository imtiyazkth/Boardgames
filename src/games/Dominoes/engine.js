import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

/**
 * Dominoes Engine — Block Dominoes (standard [6:6] set, 2 players).
 * 28 tiles: [0:0] through [6:6].
 * Draw 7 tiles each. Highest double starts.
 * Players match one end of the chain. Cannot play → draw. Cannot draw → pass.
 * Win: empty hand, OR blocked (lowest pip count wins).
 */

function makeTiles() {
  const tiles = []
  for (let a = 0; a <= 6; a++)
    for (let b = a; b <= 6; b++)
      tiles.push([a, b])
  return tiles
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class DominoesEngine extends BaseGameEngine {
  initializeGame({ playerNames = ['Player 1', 'Player 2'] } = {}) {
    this.history = []
    const all = shuffle(makeTiles())
    const hand1 = all.slice(0, 7)
    const hand2 = all.slice(7, 14)
    const boneyard = all.slice(14)

    // Find who has highest double (they go first)
    let first = 0
    let highDouble = -1
    for (let t of hand1) if (t[0] === t[1] && t[0] > highDouble) { highDouble = t[0]; first = 0 }
    for (let t of hand2) if (t[0] === t[1] && t[0] > highDouble) { highDouble = t[0]; first = 1 }

    this.state = {
      hands: [hand1, hand2],
      boneyard,
      chain: [],           // placed tiles in order: [{tile, flipped}]
      leftEnd: null,       // open left pip value
      rightEnd: null,      // open right pip value
      currentPlayer: first,
      playerNames,
      consecutivePasses: 0,
      gameOver: false,
      winner: null,
      scores: [0, 0],
      moveCount: 0
    }
    return this.state
  }

  getLegalMoves() {
    if (this.state.gameOver) return []
    const { hands, currentPlayer, chain, leftEnd, rightEnd, boneyard } = this.state
    const hand = hands[currentPlayer]
    const moves = []

    if (chain.length === 0) {
      // First move: any tile
      for (let i = 0; i < hand.length; i++)
        moves.push({ action: 'play', tileIdx: i, end: 'right' })
      return moves
    }

    for (let i = 0; i < hand.length; i++) {
      const [a, b] = hand[i]
      if (a === leftEnd || b === leftEnd) moves.push({ action: 'play', tileIdx: i, end: 'left' })
      if (a === rightEnd || b === rightEnd) moves.push({ action: 'play', tileIdx: i, end: 'right' })
    }

    if (moves.length === 0 && boneyard.length > 0) {
      moves.push({ action: 'draw' })
    } else if (moves.length === 0) {
      moves.push({ action: 'pass' })
    }
    return moves
  }

  applyMove({ action, tileIdx, end }) {
    this.history.push(this.cloneState())
    const state = this.cloneState()
    const { hands, chain } = state

    if (action === 'draw') {
      const tile = state.boneyard.pop()
      hands[state.currentPlayer].push(tile)
      state.consecutivePasses = 0
      // After drawing, check if playable
      state.currentPlayer = state.currentPlayer // same player tries again
      this.state = state
      return { success: true, newState: this.cloneState() }
    }

    if (action === 'pass') {
      state.consecutivePasses++
      state.currentPlayer = 1 - state.currentPlayer
      if (state.consecutivePasses >= 2) {
        state.gameOver = true
        const pip0 = hands[0].reduce((s, [a, b]) => s + a + b, 0)
        const pip1 = hands[1].reduce((s, [a, b]) => s + a + b, 0)
        state.winner = pip0 < pip1 ? 0 : pip1 < pip0 ? 1 : 'draw'
      }
      this.state = state
      return { success: true, newState: this.cloneState() }
    }

    if (action === 'play') {
      const [a, b] = hands[state.currentPlayer][tileIdx]
      hands[state.currentPlayer].splice(tileIdx, 1)

      if (chain.length === 0) {
        chain.push({ tile: [a, b], flipped: false })
        state.leftEnd = a
        state.rightEnd = b
      } else if (end === 'left') {
        const flip = b === state.leftEnd
        chain.unshift({ tile: [a, b], flipped: !flip })
        state.leftEnd = flip ? a : b
      } else {
        const flip = a === state.rightEnd
        chain.push({ tile: [a, b], flipped: flip })
        state.rightEnd = flip ? b : a
      }

      state.consecutivePasses = 0
      if (hands[state.currentPlayer].length === 0) {
        state.gameOver = true
        state.winner = state.currentPlayer
      } else {
        state.currentPlayer = 1 - state.currentPlayer
      }
      state.moveCount++
      this.state = state
      return { success: true, newState: this.cloneState() }
    }
    return { success: false }
  }

  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: this.cloneState() }
  }

  isGameOver() { return this.state.gameOver }
  getResult() {
    if (!this.state.gameOver) return { winner: null }
    return { winner: this.state.winner, reason: this.state.winner === 'draw' ? 'Blocked game — tie' : 'Hand emptied' }
  }
}

export class DominoesAI extends BaseAIEngine {
  getBestMove(engine) {
    const moves = engine.getLegalMoves().filter(m => m.action === 'play')
    if (!moves.length) return engine.getLegalMoves()[0]
    if (this.level === 0) return this.randomMove(engine)
    // Heuristic: play highest pip tile that fits
    const hand = engine.state.hands[engine.state.currentPlayer]
    let best = null, bestPip = -1
    for (const m of moves) {
      const [a, b] = hand[m.tileIdx]
      if (a + b > bestPip) { bestPip = a + b; best = m }
    }
    return best || this.randomMove(engine)
  }
}
