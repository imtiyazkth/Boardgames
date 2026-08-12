import { useState, useEffect, useCallback, useRef } from 'react'
import { SlidingPuzzleEngine } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

const SIZE = 4

export default function SlidingPuzzleGame({ difficulty = 'normal', onExit }) {
  const { play, vibrate } = useAudio()
  const [engine]          = useState(() => new SlidingPuzzleEngine())
  const [state, setState] = useState(null)
  const [hint, setHint]   = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [celebrating, setCelebrating] = useState(false)
  const timerRef = useRef(null)

  const startGame = useCallback(() => {
    engine.initializeGame({ difficulty })
    setState(engine.cloneState())
    setHint(null); setCelebrating(false); setElapsed(0)
    play('puzzle_shuffle')
  }, [engine, difficulty, play])

  useEffect(() => { startGame() }, [startGame])

  // Timer
  useEffect(() => {
    clearInterval(timerRef.current)
    if (!state?.solved)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [state?.solved])

  function handleTile(i) {
    if (!state || state.solved) return
    const legal = engine.getLegalMoves()
    if (!legal.some(m => m.tileIndex === i)) {
      play('puzzle_invalid'); return
    }
    engine.applyMove({ tileIndex: i })
    play('puzzle_slide'); vibrate([8])
    const ns = engine.cloneState()
    setState(ns)
    setHint(null)
    if (ns.solved) { setCelebrating(true); play('puzzle_complete'); vibrate([40,30,60,30,80]) }
  }

  function showHint() {
    const h = engine.getHint()
    play('puzzle_hint')
    setHint(h ? h.tileIndex : null)
    setTimeout(() => setHint(null), 1800)
  }

  function handleUndo() {
    play('ui_back')
    const r = engine.undoMove()
    if (r.success) { setState(engine.cloneState()); setHint(null) }
  }

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  if (!state) return null

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Sliding Puzzle</span>
        <div style={{ textAlign:'right' }}>
          <div style={{ color:'#f5a623', fontWeight:700 }}>{fmt(elapsed)}</div>
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{state.moves} moves</div>
        </div>
      </div>

      {celebrating && (
        <div style={S.celebrate}>🎉 Solved in {state.moves} moves!</div>
      )}

      <div style={S.board}>
        {state.board.map((val, i) => {
          const blank   = val === 0
          const isHint  = hint === i
          const correct = val !== 0 && val === (i < SIZE*SIZE - 1 ? i+1 : 0)
          return (
            <button key={i} onClick={() => !blank && handleTile(i)} style={{
              ...S.tile,
              opacity: blank ? 0 : 1,
              background: isHint   ? 'rgba(245,166,35,0.55)'
                : correct          ? 'rgba(76,175,80,0.35)'
                : 'rgba(255,255,255,0.09)',
              border: isHint ? '2px solid #f5a623'
                : correct   ? '2px solid rgba(76,175,80,0.6)'
                : '2px solid rgba(255,255,255,0.1)',
              transform: isHint ? 'scale(1.07)' : 'scale(1)',
              cursor: blank ? 'default' : 'pointer',
              transition: 'all 0.1s'
            }}>
              {!blank && (
                <span style={{ fontSize:22, fontWeight:700,
                  color: correct ? '#81c784' : isHint ? '#f5a623' : '#fff' }}>
                  {val}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={S.controls}>
        <button onClick={handleUndo} style={S.btn} disabled={state.solved}>↩ Undo</button>
        <button onClick={showHint}   style={{ ...S.btn, color:'#f5a623' }} disabled={state.solved}>💡 Hint</button>
        <button onClick={startGame}  style={{ ...S.btn, ...S.primary }}>
          {state.solved ? '▶ New' : '↺ Reset'}
        </button>
      </div>

      <div style={S.legend}>
        <span style={{ color:'rgba(76,175,80,0.8)' }}>■ correct</span>
        <span style={{ color:'#f5a623', marginLeft:10 }}>■ hint</span>
        <span style={{ color:'rgba(255,255,255,0.3)', marginLeft:10 }}>· {difficulty}</span>
      </div>
    </div>
  )
}

const S = {
  container: { display:'flex', flexDirection:'column', alignItems:'center',
    height:'100%', background:'linear-gradient(160deg,#1a1a2e 0%,#1a2744 100%)',
    padding:14, gap:14, userSelect:'none' },
  header: { display:'flex', alignItems:'center', width:'100%', maxWidth:380, gap:8 },
  backBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 14px', borderRadius:10, cursor:'pointer' },
  title: { flex:1, color:'#fff', fontSize:20, fontWeight:700, textAlign:'center' },
  celebrate: { color:'#ffd700', fontWeight:700, fontSize:17, padding:'9px 18px',
    borderRadius:12, background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.25)' },
  board: { display:'grid', gridTemplateColumns:`repeat(${SIZE},1fr)`,
    gap:6, width:'100%', maxWidth:340, aspectRatio:'1' },
  tile: { aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius:10, border:'none' },
  controls: { display:'flex', gap:8, width:'100%', maxWidth:340 },
  btn: { flex:1, padding:'11px 0', borderRadius:12, border:'none',
    background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' },
  primary: { background:'#f5a623', color:'#1a1a2e' },
  legend: { fontSize:11, color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center' }
}
