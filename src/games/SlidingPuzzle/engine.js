import { BaseGameEngine } from '../../core/GameEngine.js'

const SIZE = 4 // 4×4 = 15-puzzle

function goal() {
  const g = []
  for (let i = 1; i < SIZE * SIZE; i++) g.push(i)
  g.push(0) // 0 = empty
  return g
}

function manhattanDistance(board) {
  let dist = 0
  for (let i = 0; i < board.length; i++) {
    const val = board[i]
    if (val === 0) continue
    const targetRow = Math.floor((val - 1) / SIZE)
    const targetCol = (val - 1) % SIZE
    const curRow = Math.floor(i / SIZE)
    const curCol = i % SIZE
    dist += Math.abs(curRow - targetRow) + Math.abs(curCol - targetCol)
  }
  return dist
}

function isSolvable(board) {
  const tiles = board.filter(n => n !== 0)
  let inv = 0
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      if (tiles[i] > tiles[j]) inv++
  const blankRow = Math.floor(board.indexOf(0) / SIZE)
  // For 4×4: solvable if (inv even AND blank on odd row from bottom) OR (inv odd AND blank on even row from bottom)
  const blankRowFromBottom = SIZE - blankRow
  if (blankRowFromBottom % 2 === 0) return inv % 2 === 1
  return inv % 2 === 0
}

function shuffle(arr) {
  // Keep shuffling until we get a solvable position
  let attempt = 0
  while (attempt < 100) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    if (isSolvable(a) && manhattanDistance(a) > 10) return a
    attempt++
  }
  return arr // fallback
}

export class SlidingPuzzleEngine extends BaseGameEngine {
  initializeGame({ difficulty = 'normal' } = {}) {
    this.history = []
    const base = goal()
    let board
    if (difficulty === 'easy') {
      // Only shuffle last few moves
      board = this._easyBoard()
    } else {
      board = shuffle(base)
    }
    this.state = {
      board,
      moves: 0,
      startTime: Date.now(),
      solved: false,
      difficulty
    }
    return this.state
  }

  _easyBoard() {
    const g = goal()
    // Apply 20 random valid moves from goal
    let blankIdx = g.indexOf(0)
    for (let i = 0; i < 20; i++) {
      const neighbors = this._neighbors(blankIdx)
      const swapIdx = neighbors[Math.floor(Math.random() * neighbors.length)]
      ;[g[blankIdx], g[swapIdx]] = [g[swapIdx], g[blankIdx]]
      blankIdx = swapIdx
    }
    return g
  }

  _neighbors(blankIdx) {
    const row = Math.floor(blankIdx / SIZE)
    const col = blankIdx % SIZE
    const n = []
    if (row > 0) n.push(blankIdx - SIZE)
    if (row < SIZE - 1) n.push(blankIdx + SIZE)
    if (col > 0) n.push(blankIdx - 1)
    if (col < SIZE - 1) n.push(blankIdx + 1)
    return n
  }

  getLegalMoves() {
    const blankIdx = this.state.board.indexOf(0)
    return this._neighbors(blankIdx).map(i => ({ tileIndex: i, blankIndex: blankIdx }))
  }

  applyMove({ tileIndex }) {
    const blankIdx = this.state.board.indexOf(0)
    const legal = this._neighbors(blankIdx)
    if (!legal.includes(tileIndex)) return { success: false, error: 'Invalid move' }

    this.history.push(this.cloneState())
    const board = [...this.state.board]
    ;[board[blankIdx], board[tileIndex]] = [board[tileIndex], board[blankIdx]]
    const solved = board.every((v, i) => v === (i < SIZE * SIZE - 1 ? i + 1 : 0))

    this.state = { ...this.state, board, moves: this.state.moves + 1, solved }
    return { success: true, newState: this.cloneState() }
  }

  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: this.cloneState() }
  }

  isGameOver() { return this.state.solved }

  getResult() {
    if (!this.state.solved) return { winner: null }
    return { winner: 'player', reason: `Solved in ${this.state.moves} moves` }
  }

  /** A* hint: returns next tile index to move */
  getHint() {
    const path = this._astar(this.state.board)
    if (!path || path.length < 2) return null
    const nextBoard = path[1]
    const blankNow = this.state.board.indexOf(0)
    const blankNext = nextBoard.indexOf(0)
    return { tileIndex: blankNext, blankIndex: blankNow }
  }

  _astar(startBoard) {
    const goalStr = goal().join(',')
    const start = startBoard.join(',')
    if (start === goalStr) return [startBoard]

    const open = new Map()
    const closed = new Set()
    const h = manhattanDistance(startBoard)
    open.set(start, { board: startBoard, g: 0, h, f: h, parent: null, parentStr: null })

    let iterations = 0
    while (open.size > 0 && iterations < 5000) {
      iterations++
      // Get lowest f
      let bestKey = null, bestF = Infinity
      for (const [k, v] of open) {
        if (v.f < bestF) { bestF = v.f; bestKey = k }
      }
      const current = open.get(bestKey)
      open.delete(bestKey)
      if (bestKey === goalStr) return this._reconstructPath(current, open, closed)
      closed.add(bestKey)

      const blankIdx = current.board.indexOf(0)
      for (const neighbor of this._neighbors(blankIdx)) {
        const newBoard = [...current.board]
        ;[newBoard[blankIdx], newBoard[neighbor]] = [newBoard[neighbor], newBoard[blankIdx]]
        const key = newBoard.join(',')
        if (closed.has(key)) continue
        const g = current.g + 1
        const h2 = manhattanDistance(newBoard)
        const existing = open.get(key)
        if (!existing || g < existing.g) {
          open.set(key, { board: newBoard, g, h: h2, f: g + h2, parent: current, parentStr: bestKey })
        }
      }
    }
    return null // unsolvable or too deep
  }

  _reconstructPath(node) {
    const path = []
    let cur = node
    while (cur) { path.unshift(cur.board); cur = cur.parent }
    return path
  }
}
