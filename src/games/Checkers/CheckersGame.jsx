import { useState, useEffect, useCallback } from 'react'
import { CheckersEngine, CheckersAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import GameShell from '../../components/GameShell.jsx'

export default function CheckersGame({ mode='solo', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine]  = useState(() => new CheckersEngine())
  const [state, setState] = useState(null)
  const [ai]      = useState(() => new CheckersAI(difficulty))
  const [sel, setSel]   = useState(null)
  const [legalFrom, setLegalFrom] = useState([])
  const [legalTo,   setLegalTo]   = useState([])
  const [thinking, setThinking]   = useState(false)
  const [msg, setMsg]             = useState('')

  const isAITurn = useCallback(st =>
    !(!st || st.gameOver || mode === 'local2p' || st.currentPlayer !== 'b'), [mode])

  function computeLegal(st) {
    if (!st || st.gameOver || isAITurn(st)) { setLegalFrom([]); setLegalTo([]); setSel(null); return }
    const moves = engine.getLegalMoves()
    setLegalFrom([...new Set(moves.map(m => m.from))])
    setLegalTo([]); setSel(null)
  }

  useEffect(() => {
    engine.initializeGame()
    const s = engine.cloneState()
    setState(s); computeLegal(s)
    play('game_start')
  }, [])

  useEffect(() => {
    if (!state || !isAITurn(state)) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          if (res.wasCapture) { play('checkers_capture'); vibrate([25]) }
          else                { play('checkers_move') }
          if (res.promoted)   setTimeout(() => play('checkers_king'), 150)
          const ns = engine.cloneState()
          setState(ns)
          if (ns.gameOver) { setMsg(winMsg(ns)); play('game_lose'); vibrate([40,20,40]) }
          else computeLegal(ns)
        }
      }
      setThinking(false)
    }, 500)
    return () => clearTimeout(t)
  }, [state])

  function winMsg(st) {
    const name = st.winner === 'r'
      ? (playerNames[0] || 'Red') : mode === 'solo' ? 'AI' : (playerNames[1] || 'Black')
    return `${name} wins! 🎉`
  }

  function handleCell(i) {
    if (!state || state.gameOver || isAITurn(state) || thinking) return
    const piece  = state.board[i]
    const player = state.currentPlayer

    if (sel === null) {
      if (legalFrom.includes(i)) {
        play('checkers_select'); setSel(i)
        setLegalTo(engine.getLegalMoves().filter(m => m.from === i).map(m => m.to))
      } else play('piece_invalid')
    } else {
      if (i === sel) { setSel(null); setLegalTo([]); return }
      if (legalTo.includes(i)) {
        const move = engine.getLegalMoves().find(m => m.from === sel && m.to === i)
        if (!move) { play('piece_invalid'); return }
        const res = engine.applyMove(move)
        if (res.success) {
          if (res.wasCapture) { play('checkers_capture'); vibrate([25]) }
          else                { play('checkers_move');    vibrate([8]) }
          if (res.promoted)   setTimeout(() => { play('checkers_king'); vibrate([15,10,25]) }, 150)
          setSel(null); setLegalTo([])
          const ns = engine.cloneState()
          setState(ns)
          if (ns.gameOver) { setMsg(winMsg(ns)); play('game_win'); vibrate([60,30,60]) }
          else computeLegal(ns)
        }
      } else if (legalFrom.includes(i)) {
        play('checkers_select'); setSel(i)
        setLegalTo(engine.getLegalMoves().filter(m => m.from === i).map(m => m.to))
      } else {
        play('piece_invalid'); setSel(null); setLegalTo([])
      }
    }
  }

  function restart() {
    engine.initializeGame(); play('game_start')
    const s = engine.cloneState()
    setState(s); computeLegal(s); setMsg('')
  }

  if (!state) return null
  const { board, currentPlayer, gameOver } = state
  const PC = { r:'#e94560', R:'#e94560', b:'#ccc', B:'#ccc' }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Checkers</span>
        <span style={{ color: currentPlayer==='r' ? '#e94560' : '#ccc', fontWeight:700, fontSize:13 }}>
          {gameOver ? '' : currentPlayer==='r' ? '🔴 Red' : '⬛ Black'}
        </span>
      </div>

      <div style={S.status}>
        {gameOver     ? <span style={{ color:'#ffd700', fontWeight:700 }}>{msg}</span>
        : thinking    ? <span style={{ color:'rgba(255,255,255,0.5)' }}>🤔 AI thinking…</span>
        : <span style={{ color: currentPlayer==='r' ? '#e94560' : '#ccc' }}>
            {currentPlayer==='r' ? `${playerNames[0]||'Red'}'s turn`
              : mode==='solo' ? "AI's turn" : `${playerNames[1]||'Black'}'s turn`}
          </span>}
      </div>

      <div style={S.board}>
        {Array.from({ length:64 }, (_,i) => {
          const row = Math.floor(i/8), col = i%8
          const dark  = (row+col)%2===1
          const piece = board[i]
          const isSel = sel===i
          const isFrom = legalFrom.includes(i) && !gameOver && !thinking
          const isTo   = legalTo.includes(i)
          return (
            <div key={i} onClick={() => dark && handleCell(i)} style={{
              aspectRatio:'1',
              background: dark
                ? isSel   ? 'rgba(255,215,0,0.45)'
                : isTo    ? 'rgba(76,175,80,0.4)'
                : isFrom  ? 'rgba(255,255,255,0.18)'
                : 'rgba(255,255,255,0.07)'
                : 'rgba(0,0,0,0.28)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor: dark ? 'pointer' : 'default', position:'relative',
              border: isTo ? '2px solid rgba(76,175,80,0.8)' : 'none', transition:'background 0.1s'
            }}>
              {piece && (
                <div style={{
                  width:'72%', height:'72%', borderRadius:'50%',
                  background: PC[piece],
                  boxShadow:`0 3px 10px rgba(0,0,0,0.5),inset 0 1px 4px rgba(255,255,255,0.25)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  border: isSel ? '2px solid #ffd700' : '2px solid rgba(255,255,255,0.2)'
                }}>
                  {(piece==='R'||piece==='B') && <span style={{ fontSize:14 }}>♛</span>}
                </div>
              )}
              {isTo && !piece && (
                <div style={{ width:'32%', height:'32%', borderRadius:'50%',
                  background:'rgba(76,175,80,0.65)' }} />
              )}
            </div>
          )
        })}
      </div>

      <div style={S.controls}>
        <button onClick={() => { play('ui_back'); engine.undoMove(); if(mode==='solo')engine.undoMove();
          const s=engine.cloneState(); setState(s); computeLegal(s); setMsg('') }}
          style={S.btn} disabled={thinking}>↩ Undo</button>
        <button onClick={restart} style={{ ...S.btn, ...S.primary }}>
          {gameOver ? '▶ New Game' : '↺ Restart'}
        </button>
      </div>
    </div>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', alignItems:'center', height:'100%',
    background:'linear-gradient(160deg,#1a1a2e 0%,#2d1b3a 100%)', padding:12, gap:10, userSelect:'none' },
  header:  { display:'flex', alignItems:'center', width:'100%', maxWidth:380, gap:8 },
  backBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 14px', borderRadius:10, cursor:'pointer' },
  title:   { flex:1, color:'#fff', fontSize:20, fontWeight:700, textAlign:'center' },
  status:  { height:30, display:'flex', alignItems:'center', fontSize:14 },
  board:   { display:'grid', gridTemplateColumns:'repeat(8,1fr)', width:'100%', maxWidth:380,
    aspectRatio:'1', border:'2px solid rgba(255,255,255,0.12)', borderRadius:6, overflow:'hidden' },
  controls:{ display:'flex', gap:10, width:'100%', maxWidth:380 },
  btn:     { flex:1, padding:'11px 0', borderRadius:12, border:'none', background:'rgba(255,255,255,0.1)',
    color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' },
  primary: { background:'#9c27b0' }
}
