import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

/**
 * Chess Engine — full legal move generation.
 * FIX: _applyMoveToState used broken `this.cloneState.call({state})`
 *      — replaced with a direct deep-clone helper that does not touch `this`.
 */

const PAWN=1, KNIGHT=2, BISHOP=3, ROOK=4, QUEEN=5, KING=6

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

const SYM = {
  1:'♙', 2:'♘', 3:'♗', 4:'♖', 5:'♕', 6:'♔',
  '-1':'♟','-2':'♞','-3':'♝','-4':'♜','-5':'♛','-6':'♚'
}

/** Pure function — deep-clone a state object. No `this` involved. */
function cloneChessState(state) {
  return {
    ...state,
    board: [...state.board],
    castling: { ...state.castling },
    moveHistory: [...state.moveHistory]
  }
}

export class ChessEngine extends BaseGameEngine {
  initializeGame() {
    this.history = []
    this.state = {
      board: [...INIT_BOARD],
      currentPlayer: 'w',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
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
    const ok = legal.some(m => m.from === move.from && m.to === move.to && m.promotion === move.promotion)
    if (!ok) return { success: false, error: 'Illegal move' }
    this.history.push(cloneChessState(this.state))
    this.state = this._applyMoveToState(this.state, move)
    return { success: true, newState: cloneChessState(this.state) }
  }

  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: cloneChessState(this.state) }
  }

  isGameOver() { return this.state.gameOver }
  getResult() {
    if (!this.state.gameOver) return { winner: null }
    if (this.state.stalemate) return { winner: 'draw', reason: 'Stalemate' }
    if (this.state.checkmate) return { winner: this.state.winner, reason: 'Checkmate' }
    return { winner: 'draw', reason: 'Draw' }
  }

  serializeState()          { return cloneChessState(this.state) }
  deserializeState(s)       { this.state = cloneChessState(s) }

  _generateLegalMoves(state) {
    return this._generatePseudoLegal(state).filter(m => {
      const after = this._applyMoveToState(state, m)
      return !this._isInCheck(after, state.currentPlayer)
    })
  }

  _generatePseudoLegal(state) {
    const { board, currentPlayer, enPassant, castling } = state
    const moves = []
    const sign = currentPlayer === 'w' ? 1 : -1
    for (let from = 0; from < 64; from++) {
      const piece = board[from]
      if (!piece || Math.sign(piece) !== sign) continue
      const abs = Math.abs(piece)
      const row = Math.floor(from / 8), col = from % 8
      if (abs === PAWN)                          this._pawnMoves(from, row, col, sign, board, enPassant, moves)
      if (abs === KNIGHT)                        this._knightMoves(from, row, col, sign, board, moves)
      if (abs === BISHOP || abs === QUEEN)       this._slidingMoves(from, row, col, sign, board, moves, [[1,1],[1,-1],[-1,1],[-1,-1]])
      if (abs === ROOK   || abs === QUEEN)       this._slidingMoves(from, row, col, sign, board, moves, [[1,0],[-1,0],[0,1],[0,-1]])
      if (abs === KING)                          this._kingMoves(from, row, col, sign, board, castling, currentPlayer, moves)
    }
    return moves
  }

  _pawnMoves(from, row, col, sign, board, enPassant, moves) {
    const dir = -sign
    const startRow = sign === 1 ? 6 : 1
    const promRow  = sign === 1 ? 0 : 7
    const fwd = from + dir * 8
    if (fwd >= 0 && fwd < 64 && board[fwd] === 0) {
      if (Math.floor(fwd / 8) === promRow) {
        for (const p of [2,3,4,5]) moves.push({ from, to: fwd, promotion: p * sign })
      } else {
        moves.push({ from, to: fwd })
        if (row === startRow && board[from + dir * 16] === 0)
          moves.push({ from, to: from + dir * 16, doublePush: true })
      }
    }
    for (const dc of [-1, 1]) {
      if (col + dc < 0 || col + dc > 7) continue
      const to = from + dir * 8 + dc
      if (to < 0 || to >= 64) continue
      if (Math.sign(board[to]) === -sign) {
        if (Math.floor(to / 8) === promRow) {
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
    if (player === 'w' && from === 60) {
      if (castling.wK && !board[61] && !board[62] && board[63] === 4) moves.push({ from, to: 62, castling: 'wK' })
      if (castling.wQ && !board[59] && !board[58] && !board[57] && board[56] === 4) moves.push({ from, to: 58, castling: 'wQ' })
    }
    if (player === 'b' && from === 4) {
      if (castling.bK && !board[5] && !board[6] && board[7] === -4) moves.push({ from, to: 6, castling: 'bK' })
      if (castling.bQ && !board[3] && !board[2] && !board[1] && board[0] === -4) moves.push({ from, to: 2, castling: 'bQ' })
    }
  }

  /** FIXED: uses cloneChessState(), not the broken this.cloneState.call() */
  _applyMoveToState(state, move) {
    const ns    = cloneChessState(state)
    const board = ns.board

    board[move.to]   = move.promotion || board[move.from]
    board[move.from] = 0

    if (move.enPassantCapture) board[move.to + (state.currentPlayer === 'w' ? 8 : -8)] = 0
    if (move.castling === 'wK') { board[61] = 4;  board[63] = 0 }
    if (move.castling === 'wQ') { board[59] = 4;  board[56] = 0 }
    if (move.castling === 'bK') { board[5]  = -4; board[7]  = 0 }
    if (move.castling === 'bQ') { board[3]  = -4; board[0]  = 0 }

    ns.enPassant = move.doublePush
      ? (move.to + (state.currentPlayer === 'w' ? 8 : -8))
      : null

    if (move.castling) {
      if (move.castling.startsWith('w')) { ns.castling.wK = false; ns.castling.wQ = false }
      else                               { ns.castling.bK = false; ns.castling.bQ = false }
    }
    // Invalidate castling if king or rook moved
    const abs = Math.abs(state.board[move.from])
    if (abs === KING) {
      if (state.currentPlayer === 'w') { ns.castling.wK = false; ns.castling.wQ = false }
      else                             { ns.castling.bK = false; ns.castling.bQ = false }
    }
    if (abs === ROOK) {
      if (move.from === 63) ns.castling.wK = false
      if (move.from === 56) ns.castling.wQ = false
      if (move.from === 7)  ns.castling.bK = false
      if (move.from === 0)  ns.castling.bQ = false
    }

    ns.currentPlayer  = state.currentPlayer === 'w' ? 'b' : 'w'
    ns.moveHistory    = [...state.moveHistory, move]

    const inCheck   = this._isInCheck(ns, ns.currentPlayer)
    const legalNext = this._generateLegalMoves(ns)
    ns.check        = inCheck
    ns.checkmate    = inCheck  && legalNext.length === 0
    ns.stalemate    = !inCheck && legalNext.length === 0
    ns.gameOver     = ns.checkmate || ns.stalemate
    ns.winner       = ns.checkmate ? state.currentPlayer : null

    return ns
  }

  _isInCheck(state, player) {
    const sign = player === 'w' ? 1 : -1
    const kingIdx = state.board.findIndex(p => p === KING * sign)
    if (kingIdx === -1) return true
    const opp = { ...state, currentPlayer: player === 'w' ? 'b' : 'w' }
    return this._generatePseudoLegal(opp).some(m => m.to === kingIdx)
  }

  static symbolFor(piece) { return SYM[String(piece)] || '' }
}

// ─── Chess AI (alpha-beta, depth 1-5) ────────────────────────────────────────
const VALUES = [0, 100, 320, 330, 500, 900, 20000]

export class ChessAI extends BaseAIEngine {
  getBestMove(engine) {
    if (this.level === 0) return this.randomMove(engine)
    const result = this._minimax(engine, engine.state, this.getDepth(), -Infinity, Infinity, true, engine.state.currentPlayer)
    return result.move || this.randomMove(engine)
  }

  _minimax(eng, state, depth, alpha, beta, isMax, aiPlayer) {
    if (depth === 0 || state.gameOver) return { score: this._eval(state, aiPlayer) }
    const moves = eng._generateLegalMoves(state)
    if (!moves.length) return { score: isMax ? -9999 : 9999 }
    let best = { score: isMax ? -Infinity : Infinity, move: null }
    for (const move of moves) {
      const ns = eng._applyMoveToState(state, move)
      const r  = this._minimax(eng, ns, depth - 1, alpha, beta, !isMax, aiPlayer)
      if (isMax ? r.score > best.score : r.score < best.score) best = { score: r.score, move }
      if (isMax) alpha = Math.max(alpha, best.score)
      else       beta  = Math.min(beta,  best.score)
      if (beta <= alpha) break
    }
    return best
  }

  _eval(state, player) {
    const sign = player === 'w' ? 1 : -1
    let score = 0
    for (const p of state.board) {
      if (!p) continue
      score += Math.sign(p) * sign * VALUES[Math.abs(p)]
    }
    if (state.checkmate) score += state.winner === player ? 9999 : -9999
    return score
  }
}
