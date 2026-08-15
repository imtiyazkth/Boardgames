/**
 * Chess Engine v3 — Complete FIDE-compliant implementation
 * Fixes: castling-through-check, threefold repetition, 50-move rule,
 *        insufficient material, en-passant edge cases, promotion choices,
 *        king safety (never allow illegal king move)
 */

import { BaseGameEngine, BaseAIEngine } from '../../core/GameEngine.js'

const PAWN=1, KNIGHT=2, BISHOP=3, ROOK=4, QUEEN=5, KING=6

// ─── Piece-Square Tables (for positional evaluation) ──────────────────────────
const PST = {
  1: [ // Pawn
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ],
  2: [ // Knight
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50
  ],
  3: [ // Bishop
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5, 10, 10,  5,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20
  ],
  4: [ // Rook
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
  ],
  5: [ // Queen
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20
  ],
  6: [ // King (middlegame)
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
  ]
}

const PIECE_VALUES = [0, 100, 320, 330, 500, 900, 20000]

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

function cloneState(s) {
  return {
    ...s,
    board: [...s.board],
    castling: { ...s.castling },
    moveHistory: [...s.moveHistory],
    positionHistory: s.positionHistory ? [...s.positionHistory] : [],
  }
}

function boardKey(state) {
  return state.board.join(',') + '|' + state.currentPlayer + '|' +
    `${state.castling.wK?1:0}${state.castling.wQ?1:0}${state.castling.bK?1:0}${state.castling.bQ?1:0}` +
    '|' + (state.enPassant ?? '-')
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
      check: false, checkmate: false, stalemate: false,
      gameOver: false, winner: null,
      moveHistory: [],
      positionHistory: [],
      drawReason: null,
    }
    this.state.positionHistory.push(boardKey(this.state))
    return this.state
  }

  getLegalMoves() {
    if (this.state.gameOver) return []
    return this._generateLegalMoves(this.state)
  }

  applyMove(move) {
    if (this.state.gameOver) return { success: false, error: 'Game over' }
    const legal = this.getLegalMoves()
    const ok = legal.some(m =>
      m.from === move.from && m.to === move.to &&
      (m.promotion === move.promotion || (!m.promotion && !move.promotion))
    )
    if (!ok) return { success: false, error: 'Illegal move' }
    this.history.push(cloneState(this.state))
    this.state = this._applyMoveToState(this.state, move)
    return { success: true, newState: cloneState(this.state) }
  }

  undoMove() {
    if (!this.history.length) return { success: false }
    this.state = this.history.pop()
    return { success: true, newState: cloneState(this.state) }
  }

  cloneState() { return cloneState(this.state) }
  isGameOver() { return this.state.gameOver }

  getResult() {
    if (!this.state.gameOver) return { winner: null }
    if (this.state.winner) return { winner: this.state.winner }
    return { winner: 'draw', reason: this.state.drawReason || 'stalemate' }
  }

  // ─── Move Generation ──────────────────────────────────────────────────────
  _generateLegalMoves(state) {
    const pseudo = this._generatePseudoLegal(state)
    return pseudo.filter(move => {
      const ns = this._applyMoveToState(state, move)
      return !this._isInCheck(ns, state.currentPlayer)
    })
  }

  _generatePseudoLegal(state) {
    const { board, currentPlayer, enPassant, castling } = state
    const sign = currentPlayer === 'w' ? 1 : -1
    const moves = []

    for (let from = 0; from < 64; from++) {
      const piece = board[from]
      if (!piece || Math.sign(piece) !== sign) continue
      const abs = Math.abs(piece)
      const row = Math.floor(from / 8), col = from % 8

      if (abs === PAWN) {
        const dir = -sign  // white moves up (decreasing index)
        const startRow = sign === 1 ? 6 : 1
        const promRow  = sign === 1 ? 0 : 7

        // Forward 1
        const fwd = from + dir * 8
        if (fwd >= 0 && fwd < 64 && !board[fwd]) {
          if (Math.floor(fwd/8) === promRow) {
            for (const p of [QUEEN, ROOK, BISHOP, KNIGHT])
              moves.push({ from, to: fwd, promotion: p * sign })
          } else {
            moves.push({ from, to: fwd })
            // Forward 2
            if (row === startRow) {
              const fwd2 = from + dir * 16
              if (!board[fwd2]) moves.push({ from, to: fwd2 })
            }
          }
        }
        // Captures
        for (const dc of [-1, 1]) {
          const tc = col + dc
          if (tc < 0 || tc > 7) continue
          const to = fwd - (col - tc)  // same row as fwd, col offset
          const toRow = Math.floor(to / 8)
          if (to < 0 || to >= 64) continue
          const target = board[to]
          const isCapture = target && Math.sign(target) !== sign
          const isEP = to === enPassant
          if (isCapture || isEP) {
            if (toRow === promRow) {
              for (const p of [QUEEN, ROOK, BISHOP, KNIGHT])
                moves.push({ from, to, promotion: p * sign, enPassant: isEP })
            } else {
              moves.push({ from, to, enPassant: isEP || undefined })
            }
          }
        }
      }

      else if (abs === KNIGHT) {
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          const nr = row + dr, nc = col + dc
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue
          const to = nr * 8 + nc
          if (Math.sign(board[to]) !== sign) moves.push({ from, to })
        }
      }

      else if (abs === BISHOP || abs === QUEEN) {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
          let nr = row + dr, nc = col + dc
          while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
            const to = nr * 8 + nc
            if (Math.sign(board[to]) === sign) break
            moves.push({ from, to })
            if (board[to]) break
            nr += dr; nc += dc
          }
        }
      }

      if (abs === ROOK || abs === QUEEN) {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          let nr = row + dr, nc = col + dc
          while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
            const to = nr * 8 + nc
            if (Math.sign(board[to]) === sign) break
            moves.push({ from, to })
            if (board[to]) break
            nr += dr; nc += dc
          }
        }
      }

      if (abs === KING) {
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
          const nr = row + dr, nc = col + dc
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue
          const to = nr * 8 + nc
          if (Math.sign(board[to]) !== sign) moves.push({ from, to })
        }

        // Castling — FIDE rules:
        // King must not be in check, must not pass through check, must not land in check
        if (!this._isInCheck(state, currentPlayer)) {
          if (currentPlayer === 'w') {
            if (castling.wK && !board[61] && !board[62] && board[63] === ROOK) {
              // King-side: must not pass through e1(60) already checked, f1(61), g1(62)
              if (!this._squareAttacked(state, 61, 'b') && !this._squareAttacked(state, 62, 'b'))
                moves.push({ from:60, to:62, castling:'K' })
            }
            if (castling.wQ && !board[59] && !board[58] && !board[57] && board[56] === ROOK) {
              if (!this._squareAttacked(state, 59, 'b') && !this._squareAttacked(state, 58, 'b'))
                moves.push({ from:60, to:58, castling:'Q' })
            }
          } else {
            if (castling.bK && !board[5] && !board[6] && board[7] === -ROOK) {
              if (!this._squareAttacked(state, 5, 'w') && !this._squareAttacked(state, 6, 'w'))
                moves.push({ from:4, to:6, castling:'K' })
            }
            if (castling.bQ && !board[3] && !board[2] && !board[1] && board[0] === -ROOK) {
              if (!this._squareAttacked(state, 3, 'w') && !this._squareAttacked(state, 2, 'w'))
                moves.push({ from:4, to:2, castling:'Q' })
            }
          }
        }
      }
    }

    return moves
  }

  _squareAttacked(state, sq, byPlayer) {
    const opp = { ...state, board: [...state.board], currentPlayer: byPlayer,
      castling: { wK:false, wQ:false, bK:false, bQ:false } }
    return this._generatePseudoLegal(opp).some(m => m.to === sq)
  }

  _isInCheck(state, player) {
    const sign = player === 'w' ? 1 : -1
    const kingIdx = state.board.findIndex(p => p === KING * sign)
    if (kingIdx === -1) return true
    return this._squareAttacked(state, kingIdx, player === 'w' ? 'b' : 'w')
  }

  _applyMoveToState(state, move) {
    const ns = cloneState(state)
    const { board } = ns
    const piece = board[move.from]
    const abs = Math.abs(piece)
    const sign = Math.sign(piece)

    // Reset halfmove clock on pawn move or capture
    if (abs === PAWN || board[move.to]) ns.halfMoveClock = 0
    else ns.halfMoveClock++

    // Update castling rights
    if (abs === KING) {
      if (sign === 1) { ns.castling.wK = false; ns.castling.wQ = false }
      else            { ns.castling.bK = false; ns.castling.bQ = false }
    }
    if (abs === ROOK) {
      if (move.from === 63) ns.castling.wK = false
      if (move.from === 56) ns.castling.wQ = false
      if (move.from === 7)  ns.castling.bK = false
      if (move.from === 0)  ns.castling.bQ = false
    }
    // Rook captured — lose castling right
    if (move.to === 63) ns.castling.wK = false
    if (move.to === 56) ns.castling.wQ = false
    if (move.to === 7)  ns.castling.bK = false
    if (move.to === 0)  ns.castling.bQ = false

    // En passant capture
    if (move.enPassant) {
      const epCaptureIdx = move.to + (sign === 1 ? 8 : -8)
      board[epCaptureIdx] = 0
    }

    // Move piece
    board[move.to] = move.promotion ?? piece
    board[move.from] = 0

    // Castling — move rook
    if (move.castling === 'K') {
      if (sign === 1) { board[61] = ROOK;  board[63] = 0 }
      else            { board[5]  = -ROOK; board[7]  = 0 }
    }
    if (move.castling === 'Q') {
      if (sign === 1) { board[59] = ROOK;  board[56] = 0 }
      else            { board[3]  = -ROOK; board[0]  = 0 }
    }

    // En passant square
    ns.enPassant = null
    if (abs === PAWN && Math.abs(move.to - move.from) === 16) {
      ns.enPassant = (move.from + move.to) >> 1
    }

    // Switch player
    ns.currentPlayer = state.currentPlayer === 'w' ? 'b' : 'w'
    if (ns.currentPlayer === 'w') ns.fullMoveNumber++

    ns.moveHistory = [...state.moveHistory, move]

    // Position history for threefold repetition
    const key = boardKey(ns)
    ns.positionHistory = [...(state.positionHistory || []), key]

    // Check/checkmate/stalemate
    const inCheck  = this._isInCheck(ns, ns.currentPlayer)
    const legal    = this._generateLegalMoves(ns)
    ns.check       = inCheck
    ns.checkmate   = inCheck  && legal.length === 0
    ns.stalemate   = !inCheck && legal.length === 0
    ns.drawReason  = null

    // Draw conditions
    if (ns.stalemate) {
      ns.gameOver = true; ns.winner = null; ns.drawReason = 'stalemate'
    } else if (ns.checkmate) {
      ns.gameOver = true; ns.winner = state.currentPlayer
    } else if (ns.halfMoveClock >= 100) {
      ns.gameOver = true; ns.winner = null; ns.drawReason = '50-move rule'
    } else if (this._isThreefoldRepetition(ns)) {
      ns.gameOver = true; ns.winner = null; ns.drawReason = 'threefold repetition'
    } else if (this._isInsufficientMaterial(ns.board)) {
      ns.gameOver = true; ns.winner = null; ns.drawReason = 'insufficient material'
    } else {
      ns.gameOver = false; ns.winner = null
    }

    return ns
  }

  _isThreefoldRepetition(state) {
    const key = boardKey(state)
    const hist = state.positionHistory || []
    return hist.filter(k => k === key).length >= 3
  }

  _isInsufficientMaterial(board) {
    const pieces = board.filter(p => p !== 0)
    if (pieces.length === 2) return true  // K vs K
    if (pieces.length === 3) {
      const types = pieces.map(p => Math.abs(p))
      if (types.includes(BISHOP) || types.includes(KNIGHT)) return true
    }
    // K+B vs K+B same color
    if (pieces.length === 4) {
      const whites = board.map((p,i)=>p>0?{p,i}:null).filter(Boolean)
      const blacks = board.map((p,i)=>p<0?{p,i}:null).filter(Boolean)
      if (whites.length===2 && blacks.length===2) {
        const wb = whites.find(x=>Math.abs(x.p)===BISHOP)
        const bb = blacks.find(x=>Math.abs(x.p)===BISHOP)
        if (wb && bb && (wb.i+Math.floor(wb.i/8))%2 === (bb.i+Math.floor(bb.i/8))%2) return true
      }
    }
    return false
  }

  static symbolFor(piece) {
    const S = {1:'♙',2:'♘',3:'♗',4:'♖',5:'♕',6:'♔',
               '-1':'♟','-2':'♞','-3':'♝','-4':'♜','-5':'♛','-6':'♚'}
    return S[String(piece)] || ''
  }
}

// ─── Chess AI — multi-level alpha-beta + PST evaluation ──────────────────────
const DIFFICULTY = {
  beginner: { depth:1, random:0.7, usePST:false },
  easy:     { depth:2, random:0.3, usePST:false },
  normal:   { depth:3, random:0.1, usePST:true  },
  hard:     { depth:4, random:0,   usePST:true  },
  expert:   { depth:5, random:0,   usePST:true  },
  master:   { depth:6, random:0,   usePST:true  },
}

export class ChessAI extends BaseAIEngine {
  constructor(difficulty='normal') {
    super(difficulty)
    this.cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal
  }

  getBestMove(engine) {
    const moves = engine.getLegalMoves()
    if (!moves.length) return null

    // Beginner: mostly random
    if (this.cfg.random > 0 && Math.random() < this.cfg.random)
      return moves[Math.floor(Math.random() * moves.length)]

    const ordered = this._orderMoves(moves, engine.state)
    let best = null, bestScore = -Infinity
    const aiPlayer = engine.state.currentPlayer

    for (const move of ordered) {
      const ns = engine._applyMoveToState(engine.state, move)
      const score = this._minimax(engine, ns, this.cfg.depth - 1, -Infinity, Infinity, false, aiPlayer)
      if (score > bestScore) { bestScore = score; best = move }
    }
    return best || moves[0]
  }

  _minimax(eng, state, depth, alpha, beta, isMax, aiPlayer) {
    if (depth === 0 || state.gameOver) return this._eval(state, aiPlayer, this.cfg.usePST)
    const moves = eng._generateLegalMoves(state)
    if (!moves.length) return this._eval(state, aiPlayer, this.cfg.usePST)

    const ordered = this._orderMoves(moves, state)
    let best = isMax ? -Infinity : Infinity

    for (const move of ordered) {
      const ns = eng._applyMoveToState(state, move)
      const score = this._minimax(eng, ns, depth-1, alpha, beta, !isMax, aiPlayer)
      if (isMax) { best = Math.max(best, score); alpha = Math.max(alpha, best) }
      else       { best = Math.min(best, score); beta  = Math.min(beta,  best) }
      if (beta <= alpha) break
    }
    return best
  }

  _orderMoves(moves, state) {
    // MVV-LVA: captures first, checks next, quiet moves last
    return [...moves].sort((a,b) => {
      const captureA = state.board[a.to] ? PIECE_VALUES[Math.abs(state.board[a.to])] - PIECE_VALUES[Math.abs(state.board[a.from])]/10 : 0
      const captureB = state.board[b.to] ? PIECE_VALUES[Math.abs(state.board[b.to])] - PIECE_VALUES[Math.abs(state.board[b.from])]/10 : 0
      const promoA = a.promotion ? 800 : 0
      const promoB = b.promotion ? 800 : 0
      return (captureB + promoB) - (captureA + promoA)
    })
  }

  _eval(state, player, usePST) {
    if (state.checkmate) return state.winner === player ? 99999 : -99999
    if (state.gameOver) return 0  // draw
    const sign = player === 'w' ? 1 : -1
    let score = 0
    for (let i=0; i<64; i++) {
      const p = state.board[i]
      if (!p) continue
      const abs = Math.abs(p)
      const ps = Math.sign(p)
      let val = PIECE_VALUES[abs]
      if (usePST && PST[abs]) {
        const tableIdx = ps === 1 ? i : 63 - i
        val += PST[abs][tableIdx]
      }
      score += ps * sign * val
    }
    return score
  }
}
