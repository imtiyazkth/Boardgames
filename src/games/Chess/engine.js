import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

/**
 * Chess Engine — Phase 2
 *
 * Piece encoding: positive = white, negative = black
 * 1=pawn, 2=knight, 3=bishop, 4=rook, 5=queen, 6=king
 *
 * Board: 64-element array, index 0=a8 (top-left), 63=h1 (bottom-right).
 */

export const PIECES = {
  PAWN: 1, KNIGHT: 2, BISHOP: 3, ROOK: 4, QUEEN: 5, KING: 6
}

const INIT_BOARD = [
  -4,-2,-3,-5,-6,-3,-2,-4,
  -1,-1,-1,-1,-1,-1,-1,-1,
   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 0, 0, 0,
   1, 1, 1, 1, 1, 1, 1, 1,
   4, 2, 3, 5, 6, 3, 2, 4
]

const SYMBOL = {
  1:'♙', 2:'♘', 3:'♗', 4:'♖', 5:'♕', 6:'♔',
  '-1':'♟', '-2':'♞', '-3':'♝', '-4':'♜', '-5':'♛', '-6':'♚'
}

export class ChessEngine extends BaseGameEngine {
  initializeGame() {
    this.history = []
    this.state = {
      board: [...INIT_BOARD],
      currentPlayer: 'w',         // 'w' | 'b'
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,             // target square index or null
      halfMoveClock: 0,
      fullMoveNumber: 1,
      check: false,
      checkmate: false,
      stalemate: false,
      gameOver: false,
      winner: null,
      moveHistory: []
    }
    return this.state
  }

  getLegalMoves() {
    if (this.state.gameOver) return []
    return this._generateLegalMoves(this.state)
  }

  applyMove(move) {
    if (this.state.gameOver) return { success: false, error: 'Game over' }
    const legal = this.getLegalMoves()
    const isLegal = legal.some(m => m.from === move.from && m.to === move.to && m.promotion === move.promotion)
    if (!isLegal) return { success: false, error: 'Illegal move' }

    this.history.push(this.cloneState())
    const newState = this._applyMoveToState(this.state, move)
    this.state = newState
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
    if (this.state.stalemate) return { winner: 'draw', reason: 'Stalemate' }
    if (this.state.checkmate) return { winner: this.state.winner, reason: 'Checkmate' }
    return { winner: 'draw', reason: 'Draw' }
  }

  _generateLegalMoves(state) {
    const pseudo = this._generatePseudoLegal(state)
    return pseudo.filter(move => {
      const after = this._applyMoveToState(state, move)
      return !this._isInCheck(after, state.currentPlayer)
    })
  }

  _generatePseudoLegal(state) {
    const { board, currentPlayer, enPassant, castling } = state
    const moves = []
    const sign = currentPlayer === 'w' ? 1 : -1

    for (let from = 0; from < 64; from++) {
      const piece = board[from]
      if (piece === 0 || Math.sign(piece) !== sign) continue
      const abs = Math.abs(piece)
      const row = Math.floor(from / 8), col = from % 8

      if (abs === 1) this._pawnMoves(from, row, col, sign, board, enPassant, moves)
      if (abs === 2) this._knightMoves(from, row, col, sign, board, moves)
      if (abs === 3 || abs === 5) this._slidingMoves(from, row, col, sign, board, moves, [[1,1],[1,-1],[-1,1],[-1,-1]])
      if (abs === 4 || abs === 5) this._slidingMoves(from, row, col, sign, board, moves, [[1,0],[-1,0],[0,1],[0,-1]])
      if (abs === 6) this._kingMoves(from, row, col, sign, board, castling, currentPlayer, moves)
    }
    return moves
  }

  _pawnMoves(from, row, col, sign, board, enPassant, moves) {
    const dir = -sign // white moves up (neg index), black moves down (pos)
    const startRow = sign === 1 ? 6 : 1
    const promRow = sign === 1 ? 0 : 7

    // Forward
    const fwd = from + dir * 8
    if (fwd >= 0 && fwd < 64 && board[fwd] === 0) {
      const toRow = Math.floor(fwd / 8)
      if (toRow === promRow) {
        for (const p of [2,3,4,5]) moves.push({ from, to: fwd, promotion: p * sign })
      } else {
        moves.push({ from, to: fwd })
        // Double push
        if (row === startRow) {
          const fwd2 = from + dir * 16
          if (board[fwd2] === 0) moves.push({ from, to: fwd2, doublePush: true })
        }
      }
    }
    // Captures
    for (const dc of [-1, 1]) {
      const tc = col + dc
      if (tc < 0 || tc > 7) continue
      const to = from + dir * 8 + dc
      if (to < 0 || to >= 64) continue
      if (Math.sign(board[to]) === -sign) {
        const toRow = Math.floor(to / 8)
        if (toRow === promRow) {
          for (const p of [2,3,4,5]) moves.push({ from, to, promotion: p * sign })
        } else moves.push({ from, to })
      }
      if (to === enPassant) moves.push({ from, to, enPassantCapture: true })
    }
  }

  _knightMoves(from, row, col, sign, board, moves) {
    for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) {
      const nr = row + dr, nc = col + dc
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue
      const to = nr * 8 + nc
      if (Math.sign(board[to]) !== sign) moves.push({ from, to })
    }
  }

  _slidingMoves(from, row, col, sign, board, moves, dirs) {
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const to = r * 8 + c
        if (board[to] === 0) { moves.push({ from, to }); r += dr; c += dc }
        else { if (Math.sign(board[to]) !== sign) moves.push({ from, to }); break }
      }
    }
  }

  _kingMoves(from, row, col, sign, board, castling, player, moves) {
    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]) {
      const nr = row + dr, nc = col + dc
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue
      const to = nr * 8 + nc
      if (Math.sign(board[to]) !== sign) moves.push({ from, to })
    }
    // Castling (simplified: just check squares empty, not attack checks here)
    if (player === 'w' && from === 60) {
      if (castling.wK && board[61] === 0 && board[62] === 0 && board[63] === 4)
        moves.push({ from, to: 62, castling: 'wK' })
      if (castling.wQ && board[59] === 0 && board[58] === 0 && board[57] === 0 && board[56] === 4)
        moves.push({ from, to: 58, castling: 'wQ' })
    }
    if (player === 'b' && from === 4) {
      if (castling.bK && board[5] === 0 && board[6] === 0 && board[7] === -4)
        moves.push({ from, to: 6, castling: 'bK' })
      if (castling.bQ && board[3] === 0 && board[2] === 0 && board[1] === 0 && board[0] === -4)
        moves.push({ from, to: 2, castling: 'bQ' })
    }
  }

  _applyMoveToState(state, move) {
    const ns = this.cloneState.call({ state })
    const { board } = ns.state
    board[move.to] = move.promotion || board[move.from]
    board[move.from] = 0
    if (move.enPassantCapture) board[move.to + (state.currentPlayer === 'w' ? 8 : -8)] = 0
    if (move.castling === 'wK') { board[61] = 4; board[63] = 0 }
    if (move.castling === 'wQ') { board[59] = 4; board[56] = 0 }
    if (move.castling === 'bK') { board[5] = -4; board[7] = 0 }
    if (move.castling === 'bQ') { board[3] = -4; board[0] = 0 }
    ns.state.enPassant = move.doublePush ? (move.to + (state.currentPlayer === 'w' ? 8 : -8)) : null
    if (move.castling) {
      if (move.castling.startsWith('w')) { ns.state.castling.wK = false; ns.state.castling.wQ = false }
      else { ns.state.castling.bK = false; ns.state.castling.bQ = false }
    }
    ns.state.currentPlayer = state.currentPlayer === 'w' ? 'b' : 'w'
    const inCheck = this._isInCheck(ns.state, ns.state.currentPlayer)
    const legalNext = this._generateLegalMoves(ns.state)
    ns.state.check = inCheck
    ns.state.checkmate = inCheck && legalNext.length === 0
    ns.state.stalemate = !inCheck && legalNext.length === 0
    ns.state.gameOver = ns.state.checkmate || ns.state.stalemate
    ns.state.winner = ns.state.checkmate ? state.currentPlayer : null
    ns.state.moveHistory = [...state.moveHistory, move]
    return ns.state
  }

  _isInCheck(state, player) {
    const sign = player === 'w' ? 1 : -1
    // Find king
    const kingIdx = state.board.findIndex(p => p === 6 * sign)
    if (kingIdx === -1) return true
    // Check if any enemy can reach king
    const opp = { ...state, currentPlayer: player === 'w' ? 'b' : 'w' }
    const oppMoves = this._generatePseudoLegal(opp)
    return oppMoves.some(m => m.to === kingIdx)
  }

  static symbolFor(piece) { return SYMBOL[String(piece)] || '' }
}

export class ChessAI extends BaseAIEngine {
  getBestMove(engine) {
    if (this.level === 0) return this.randomMove(engine)
    const depth = this.getDepth()
    const result = this._minimax(engine.state, depth, -Infinity, Infinity, true, engine.state.currentPlayer, engine)
    return result.move || this.randomMove(engine)
  }

  _minimax(state, depth, alpha, beta, isMax, aiPlayer, eng) {
    if (depth === 0 || state.gameOver) return { score: this._evaluate(state, aiPlayer) }
    const moves = eng._generateLegalMoves(state)
    if (!moves.length) return { score: isMax ? -9999 : 9999 }
    let best = { score: isMax ? -Infinity : Infinity, move: null }
    for (const move of moves) {
      const ns = eng._applyMoveToState(state, move)
      const r = this._minimax(ns, depth - 1, alpha, beta, !isMax, aiPlayer, eng)
      if (isMax ? r.score > best.score : r.score < best.score) best = { score: r.score, move }
      if (isMax) alpha = Math.max(alpha, best.score)
      else beta = Math.min(beta, best.score)
      if (beta <= alpha) break
    }
    return best
  }

  _evaluate(state, player) {
    const sign = player === 'w' ? 1 : -1
    const VALUES = [0, 100, 320, 330, 500, 900, 20000]
    let score = 0
    for (const p of state.board) {
      if (p === 0) continue
      score += Math.sign(p) * sign * VALUES[Math.abs(p)]
    }
    if (state.checkmate && state.winner !== player) score -= 9999
    if (state.checkmate && state.winner === player) score += 9999
    return score
  }
}
