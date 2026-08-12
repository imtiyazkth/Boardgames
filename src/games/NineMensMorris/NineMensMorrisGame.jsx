import { useState, useEffect, useCallback } from 'react'
import { NineMensMorrisEngine, MorrisAI, MORRIS_POINTS, MORRIS_LINES } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

export default function NineMensMorrisGame({ mode='solo', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine]   = useState(() => new NineMensMorrisEngine())
  const [state, setState]   = useState(null)
  const [ai]       = useState(() => new MorrisAI(difficulty))
  const [sel, setSel]       = useState(null)
  const [thinking, setThinking] = useState(false)
  const [msg, setMsg]           = useState('')

  const isAITurn = useCallback(st =>
    !(!st || st.gameOver || mode === 'local2p' || st.currentPlayer !== 'b'), [mode])

  useEffect(() => {
    engine.initializeGame()
    setState(engine.cloneState())
    play('game_start')
  }, [])

  useEffect(() => {
    if (!state || !isAITurn(state) || state.gameOver) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          soundForMove(move, engine.state)
          const ns = engine.cloneState()
          setState(ns)
          if (ns.gameOver) { setMsg(winMsg(ns)); play('game_lose'); vibrate([40,20,40]) }
        }
      }
      setThinking(false)
    }, 420)
    return () => clearTimeout(t)
  }, [state])

  function soundForMove(move, afterState) {
    if (move.type === 'capture')  { play('morris_capture'); vibrate([20]) }
    else if (move.type === 'place') {
      play('morris_place'); vibrate([8])
      if (afterState.pendingCapture) setTimeout(() => play('morris_mill'), 160)
    } else { play('morris_move'); vibrate([6]) }
  }

  function winMsg(st) {
    const w = st.winner === 'w' ? (playerNames[0]||'White') : (mode==='solo' ? 'AI' : (playerNames[1]||'Black'))
    return `${w} wins! 🎉`
  }

  function handlePoint(i) {
    if (!state || state.gameOver || isAITurn(state) || thinking) return
    const { phase, currentPlayer, pendingCapture } = state

    if (pendingCapture) {
      const legal = engine.getLegalMoves()
      if (!legal.some(m => m.point === i)) { play('piece_invalid'); return }
      play('ui_click')
      const res = engine.applyMove({ type:'capture', point:i })
      if (res.success) {
        play('morris_capture'); vibrate([20])
        const ns = engine.cloneState()
        setState(ns)
        if (ns.gameOver) { setMsg(winMsg(ns)); play('game_win'); vibrate([60,30,60]) }
      }
      return
    }

    if (phase === 1) {
      if (state.board[i] !== null) { play('piece_invalid'); return }
      play('ui_click')
      const res = engine.applyMove({ type:'place', point:i })
      if (res.success) {
        play('morris_place'); vibrate([8])
        const ns = engine.cloneState()
        setState(ns)
        if (ns.pendingCapture) setTimeout(() => play('morris_mill'), 160)
        if (ns.gameOver) { setMsg(winMsg(ns)); play('game_win'); vibrate([60,30,60]) }
      }
      return
    }

    // Phase 2 movement
    if (sel === null) {
      if (state.board[i] === currentPlayer) { play('morris_place'); setSel(i) }
      else play('piece_invalid')
    } else {
      if (i === sel) { setSel(null); return }
      const res = engine.applyMove({ type:'move', from:sel, to:i })
      if (res.success) {
        play('morris_move'); vibrate([8])
        setSel(null)
        const ns = engine.cloneState()
        setState(ns)
        if (ns.pendingCapture) setTimeout(() => play('morris_mill'), 160)
        if (ns.gameOver) { setMsg(winMsg(ns)); play('game_win'); vibrate([60,30,60]) }
      } else {
        if (state.board[i] === currentPlayer) { setSel(i); play('morris_place') }
        else { play('piece_invalid'); setSel(null) }
      }
    }
  }

  function restart() {
    engine.initializeGame(); play('game_start')
    setState(engine.cloneState()); setSel(null); setMsg('')
  }

  if (!state) return null
  const { board, phase, currentPlayer, hand, pendingCapture, gameOver } = state
  const legal = !gameOver && !isAITurn(state) ? engine.getLegalMoves() : []

  const validTargets = new Set(
    pendingCapture ? legal.map(m => m.point)
    : phase === 1  ? legal.map(m => m.point)
    : sel !== null ? legal.filter(m => m.from === sel).map(m => m.to)
    : []
  )
  const movablePieces = phase >= 2 && sel === null && !pendingCapture
    ? new Set(legal.filter(m => m.type==='move').map(m => m.from)) : new Set()

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Nine Men's Morris</span>
        <div style={{ textAlign:'right', fontSize:11, lineHeight:1.6 }}>
          <div style={{ color:'#fffde7' }}>⬜ {hand.w}</div>
          <div style={{ color:'#90a4ae' }}>⬛ {hand.b}</div>
        </div>
      </div>

      <div style={S.status}>
        {gameOver        ? <span style={{ color:'#ffd700', fontWeight:700 }}>{msg}</span>
        : pendingCapture ? <span style={{ color:'#e94560', fontWeight:600 }}>💥 Remove a piece</span>
        : thinking       ? <span style={{ color:'rgba(255,255,255,0.45)' }}>🤔 AI thinking…</span>
        : <span style={{ color: currentPlayer==='w' ? '#fffde7' : '#90a4ae', fontWeight:600 }}>
            {phase===1 ? '📌 Place' : '↔ Move'} —{' '}
            {currentPlayer==='w' ? (playerNames[0]||'White') : mode==='solo' ? 'AI' : (playerNames[1]||'Black')}
          </span>}
      </div>

      <div style={{ width:'100%', maxWidth:300, aspectRatio:'1' }}>
        <svg viewBox="0 0 7 7" width="100%" height="100%">
          {MORRIS_LINES.map(([a,b], li) => (
            <line key={li}
              x1={MORRIS_POINTS[a][0]+.5} y1={MORRIS_POINTS[a][1]+.5}
              x2={MORRIS_POINTS[b][0]+.5} y2={MORRIS_POINTS[b][1]+.5}
              stroke="rgba(255,255,255,0.22)" strokeWidth="0.055" />
          ))}
          {MORRIS_POINTS.map(([px,py], i) => {
            const p      = board[i]
            const isTarget  = validTargets.has(i)
            const isMovable = movablePieces.has(i)
            const isSel  = sel === i
            return (
              <g key={i} onClick={() => handlePoint(i)} style={{ cursor:'pointer' }}>
                <circle cx={px+.5} cy={py+.5} r={.38}
                  fill={
                    isSel    ? '#ffd700'
                    : isTarget && !p ? 'rgba(76,175,80,0.45)'
                    : p==='w' ? '#fff9c4'
                    : p==='b' ? '#4fc3f7'
                    : 'rgba(255,255,255,0.08)'
                  }
                  stroke={
                    isSel       ? '#ffd700'
                    : isTarget  ? 'rgba(76,175,80,0.9)'
                    : isMovable ? 'rgba(255,215,0,0.6)'
                    : p         ? 'rgba(255,255,255,0.35)'
                    : 'rgba(255,255,255,0.18)'
                  }
                  strokeWidth={isSel||isTarget||isMovable ? .08 : .04}
                />
                {!p && isTarget && (
                  <circle cx={px+.5} cy={py+.5} r={.13} fill="rgba(76,175,80,0.75)" />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={S.legend}>
        <span style={{ color:'#fffde7' }}>⬜ White</span>
        <span style={{ color:'rgba(255,255,255,0.25)', margin:'0 6px' }}>|</span>
        <span style={{ color:'#90a4ae' }}>⬛ Black</span>
        <span style={{ color:'rgba(255,255,255,0.25)', margin:'0 6px' }}>|</span>
        <span style={{ color:'#4caf50', fontSize:10 }}>● move target</span>
      </div>

      <div style={S.controls}>
        <button onClick={() => {
          play('ui_back'); engine.undoMove(); if(mode==='solo')engine.undoMove()
          setState(engine.cloneState()); setSel(null); setMsg('') }}
          style={S.btn} disabled={thinking}>↩ Undo</button>
        <button onClick={restart} style={{ ...S.btn, ...S.primary }}>
          {gameOver ? '▶ New Game' : '↺ Restart'}
        </button>
      </div>
    </div>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', alignItems:'center',
    height:'100%', background:'linear-gradient(160deg,#1a1507 0%,#1a1a2e 100%)',
    padding:12, gap:8, userSelect:'none', overflow:'hidden' },
  header:  { display:'flex', alignItems:'center', width:'100%', maxWidth:340, gap:8 },
  backBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 14px', borderRadius:10, cursor:'pointer' },
  title:   { flex:1, color:'#fff', fontSize:17, fontWeight:700, textAlign:'center' },
  status:  { height:30, display:'flex', alignItems:'center', fontSize:13 },
  legend:  { fontSize:10, color:'rgba(255,255,255,0.38)', display:'flex', alignItems:'center' },
  controls:{ display:'flex', gap:10, width:'100%', maxWidth:340 },
  btn:     { flex:1, padding:'11px 0', borderRadius:12, border:'none', background:'rgba(255,255,255,0.1)',
    color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' },
  primary: { background:'#795548' }
}
