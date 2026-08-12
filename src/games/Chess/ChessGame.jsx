import { useState, useEffect, useCallback } from 'react'
import { ChessEngine, ChessAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

// Unicode piece symbols
const SYM = {
  6:'♔', 5:'♕', 4:'♖', 3:'♗', 2:'♘', 1:'♙',
  '-6':'♚', '-5':'♛', '-4':'♜', '-3':'♝', '-2':'♞', '-1':'♟'
}

function pieceOf(val) { return SYM[String(val)] || '' }
function isWhite(val) { return val > 0 }
function isEmpty(val) { return val === 0 }

// col letter + row number for notation
const FILES = 'abcdefgh'
function notation(idx) { return FILES[idx % 8] + (8 - Math.floor(idx / 8)) }

export default function ChessGame({ mode='solo', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine]  = useState(() => new ChessEngine())
  const [state, setState]     = useState(null)
  const [ai]      = useState(() => new ChessAI(difficulty))
  const [sel, setSel]         = useState(null)
  const [legalTo, setLegalTo] = useState([])
  const [thinking, setThinking] = useState(false)
  const [msg, setMsg]           = useState('')
  const [history, setHistory]   = useState([])   // move notation log
  const [lastMove, setLastMove] = useState(null)

  const isAITurn = useCallback(st => {
    if (!st || st.gameOver || mode === 'local2p') return false
    return st.currentPlayer === 'b'
  }, [mode])

  useEffect(() => {
    engine.initializeGame()
    setState(engine.cloneState())
    setHistory([]); setLastMove(null); setSel(null); setLegalTo([])
    play('game_start')
  }, [])

  // AI turn
  useEffect(() => {
    if (!state || !isAITurn(state)) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (!move) { setThinking(false); return }
      const isCapture = engine.state.board[move.to] !== 0
      const res = engine.applyMove(move)
      if (res.success) {
        const ns = engine.cloneState()
        setState(ns)
        setLastMove(move)
        recordMove(move, ns, isCapture)
        if (ns.check)       { play('chess_check');     vibrate([30]) }
        else if (isCapture) { play('chess_capture');   vibrate([15]) }
        else if (move.castling) play('chess_castle')
        else                play('chess_move')
        if (ns.checkmate)   { setMsg(winMsg(ns)); play('chess_checkmate'); vibrate([60,30,80]) }
        else if (ns.stalemate) { setMsg("Stalemate — draw!"); play('game_draw') }
      }
      setThinking(false)
    }, 500)
    return () => clearTimeout(t)
  }, [state])

  function winMsg(st) {
    const w = st.winner === 'w' ? (playerNames[0]||'White') : (mode==='solo'?'AI':(playerNames[1]||'Black'))
    return `${w} wins by checkmate! 🎉`
  }

  function recordMove(move, ns, isCapture) {
    const piece = SYM[String(isWhite(engine.state?.board?.[move.from]||0) ? Math.abs(engine.state?.board?.[move.from]||0) : -Math.abs(engine.state?.board?.[move.from]||0))] || ''
    const n = `${notation(move.from)}→${notation(move.to)}${isCapture?'×':''}${ns.check?'+':''}`
    setHistory(h => [...h.slice(-19), n])
  }

  function handleSquare(idx) {
    if (!state || state.gameOver || isAITurn(state) || thinking) return
    const piece  = state.board[idx]
    const player = state.currentPlayer
    const owned  = (player==='w' && isWhite(piece)) || (player==='b' && !isWhite(piece) && piece!==0)

    if (sel === null) {
      if (!owned) { play('piece_invalid'); return }
      play('chess_select')
      setSel(idx)
      const moves = engine.getLegalMoves().filter(m => m.from === idx)
      setLegalTo(moves.map(m => m.to))
    } else {
      if (idx === sel) { setSel(null); setLegalTo([]); return }

      if (legalTo.includes(idx)) {
        // Check for pawn promotion
        const movePiece = state.board[sel]
        const needPromo = Math.abs(movePiece) === 1 &&
          ((player==='w' && Math.floor(idx/8)===0) || (player==='b' && Math.floor(idx/8)===7))

        const move = engine.getLegalMoves().find(m => m.from===sel && m.to===idx &&
          (!needPromo || m.promotion))
        if (!move) { play('piece_invalid'); return }

        const isCapture = state.board[idx] !== 0
        const res = engine.applyMove(move)
        if (res.success) {
          const ns = engine.cloneState()
          setState(ns); setSel(null); setLegalTo([])
          setLastMove(move)
          recordMove(move, ns, isCapture)
          if (ns.checkmate)      { setMsg(winMsg(ns)); play('chess_checkmate'); vibrate([60,30,80]) }
          else if (ns.stalemate) { setMsg("Stalemate — draw!"); play('game_draw') }
          else if (ns.check)     { play('chess_check'); vibrate([30]) }
          else if (move.castling)  play('chess_castle')
          else if (move.promotion) { play('chess_promote'); vibrate([20]) }
          else if (isCapture)    { play('chess_capture'); vibrate([15]) }
          else                   { play('chess_move'); vibrate([6]) }
        }
      } else if (owned) {
        play('chess_select'); setSel(idx)
        setLegalTo(engine.getLegalMoves().filter(m=>m.from===idx).map(m=>m.to))
      } else {
        play('piece_invalid'); setSel(null); setLegalTo([])
      }
    }
  }

  function handleUndo() {
    play('ui_back')
    engine.undoMove(); if(mode==='solo') engine.undoMove()
    const ns = engine.cloneState()
    setState(ns); setSel(null); setLegalTo([]); setMsg('')
    setHistory(h => h.slice(0, Math.max(0, h.length-2)))
    setLastMove(null)
  }

  function restart() {
    engine.initializeGame(); play('game_start')
    setState(engine.cloneState())
    setSel(null); setLegalTo([]); setMsg(''); setHistory([]); setLastMove(null)
  }

  if (!state) return null
  const { board, currentPlayer, gameOver, check } = state
  // Flip board for black perspective in solo mode
  const flip = (mode==='solo' && false) // keep white-at-bottom always for now

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Chess</span>
        <div style={{ fontSize:12, textAlign:'right', lineHeight:1.6 }}>
          {check && !gameOver && <div style={{ color:'#e94560', fontWeight:700 }}>⚠️ Check!</div>}
          {!gameOver && <div style={{ color:'rgba(255,255,255,0.5)' }}>
            {currentPlayer==='w' ? '⬜ White' : '⬛ Black'}
          </div>}
        </div>
      </div>

      {/* Status */}
      <div style={S.status}>
        {gameOver     ? <span style={{ color:'#ffd700', fontWeight:700 }}>{msg}</span>
        : thinking    ? <span style={{ color:'rgba(255,255,255,0.45)' }}>🤔 AI thinking…</span>
        : <span style={{ color: currentPlayer==='w'?'#fff':'#90caf9' }}>
            {currentPlayer==='w' ? (playerNames[0]||'White') : (mode==='solo'?'AI':(playerNames[1]||'Black'))}'s turn
          </span>}
      </div>

      <div style={S.boardWrap}>
        {/* Rank labels */}
        <div style={S.rankLabels}>
          {[8,7,6,5,4,3,2,1].map(r => <div key={r} style={S.rankLabel}>{r}</div>)}
        </div>

        <div style={S.board}>
          {Array.from({ length: 64 }, (_, i) => {
            const row = Math.floor(i / 8), col = i % 8
            const isDark  = (row + col) % 2 === 1
            const piece   = board[i]
            const isSel   = sel === i
            const isTo    = legalTo.includes(i)
            const isLast  = lastMove && (lastMove.from===i || lastMove.to===i)
            const pWhite  = piece !== 0 && isWhite(piece)
            const pBlack  = piece !== 0 && !isWhite(piece)

            return (
              <div key={i} onClick={() => handleSquare(i)} style={{
                aspectRatio:'1',
                background: isSel  ? 'rgba(255,215,0,0.5)'
                  : isLast         ? (isDark ? 'rgba(103,178,139,0.6)' : 'rgba(186,214,177,0.7)')
                  : isDark          ? '#769656' : '#eeeed2',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor: 'pointer', position:'relative', transition:'background 0.08s'
              }}>
                {/* Legal move indicator */}
                {isTo && !piece && (
                  <div style={{ width:'32%', height:'32%', borderRadius:'50%',
                    background:'rgba(0,0,0,0.22)', pointerEvents:'none' }} />
                )}
                {isTo && piece !== 0 && (
                  <div style={{ position:'absolute', inset:0, border:'3px solid rgba(0,0,0,0.3)',
                    borderRadius:2, pointerEvents:'none', boxSizing:'border-box' }} />
                )}
                {/* Piece */}
                {piece !== 0 && (
                  <span style={{
                    fontSize: 'clamp(18px, 5vw, 36px)',
                    lineHeight: 1,
                    userSelect: 'none',
                    color: pWhite ? '#fff' : '#1a1a1a',
                    textShadow: pWhite
                      ? '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.5)'
                      : '0 1px 3px rgba(255,255,255,0.3)',
                    zIndex: 1
                  }}>
                    {pieceOf(piece)}
                  </span>
                )}
                {/* File label on bottom row */}
                {row === 7 && (
                  <span style={{ position:'absolute', bottom:1, right:2, fontSize:8,
                    color: isDark ? '#eeeed2' : '#769656', lineHeight:1, fontWeight:600 }}>
                    {FILES[col]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* File labels */}
      <div style={S.fileLabels}>
        {FILES.split('').map(f => <div key={f} style={S.fileLabel}>{f}</div>)}
      </div>

      {/* Move history */}
      {history.length > 0 && (
        <div style={S.historyBox}>
          {history.slice(-8).join('  ·  ')}
        </div>
      )}

      {/* Controls */}
      <div style={S.controls}>
        <button onClick={handleUndo} style={S.btn} disabled={thinking}>↩ Undo</button>
        <button onClick={restart} style={{ ...S.btn, ...S.primary }}>
          {gameOver ? '▶ New Game' : '↺ Restart'}
        </button>
      </div>
    </div>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', alignItems:'center',
    height:'100%', background:'linear-gradient(160deg,#1a1a2e 0%,#263238 100%)',
    padding:'10px 8px', gap:6, userSelect:'none', overflow:'hidden' },
  header:  { display:'flex', alignItems:'center', width:'100%', maxWidth:400, gap:8 },
  backBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 12px', borderRadius:10, cursor:'pointer' },
  title:   { flex:1, color:'#fff', fontSize:19, fontWeight:700, textAlign:'center' },
  status:  { height:24, display:'flex', alignItems:'center', fontSize:13 },
  boardWrap:{ display:'flex', gap:4, alignItems:'flex-start', maxWidth:400, width:'100%' },
  rankLabels:{ display:'flex', flexDirection:'column', justifyContent:'space-around',
    height:'100%', paddingTop:2 },
  rankLabel:{ fontSize:10, color:'rgba(255,255,255,0.4)', textAlign:'right',
    height:'calc(100% / 8)', display:'flex', alignItems:'center', justifyContent:'flex-end',
    paddingRight:3 },
  board:   { display:'grid', gridTemplateColumns:'repeat(8,1fr)', flex:1, aspectRatio:'1',
    border:'2px solid rgba(255,255,255,0.2)', borderRadius:4, overflow:'hidden' },
  fileLabels:{ display:'flex', width:'100%', maxWidth:400, paddingLeft:20 },
  fileLabel:{ flex:1, textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.4)' },
  historyBox:{ fontSize:11, color:'rgba(255,255,255,0.4)', fontFamily:'monospace',
    textAlign:'center', maxWidth:400, lineHeight:1.8, padding:'0 8px' },
  controls:{ display:'flex', gap:8, width:'100%', maxWidth:400 },
  btn:     { flex:1, padding:'10px 0', borderRadius:12, border:'none',
    background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' },
  primary: { background:'#607d8b' }
}
