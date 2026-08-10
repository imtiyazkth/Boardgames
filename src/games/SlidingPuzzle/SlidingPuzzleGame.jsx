import { useState, useEffect, useCallback } from 'react'
import { SlidingPuzzleEngine } from './engine.js'

const SIZE = 4

export default function SlidingPuzzleGame({ difficulty, onExit }) {
  const [engine] = useState(() => new SlidingPuzzleEngine())
  const [state, setState] = useState(null)
  const [hint, setHint] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [celebrating, setCelebrating] = useState(false)

  const startGame = useCallback(() => {
    engine.initializeGame({ difficulty })
    setState(engine.cloneState())
    setHint(null)
    setCelebrating(false)
    setElapsed(0)
  }, [engine, difficulty])

  useEffect(() => { startGame() }, [startGame])

  // Timer
  useEffect(() => {
    if (!state || state.solved) return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [state?.solved])

  function handleTileClick(i) {
    if (!state || state.solved) return
    const blankIdx = state.board.indexOf(0)
    const legal = engine.getLegalMoves()
    const move = legal.find(m => m.tileIndex === i)
    if (!move) return
    const res = engine.applyMove(move)
    if (res.success) {
      setState(engine.cloneState())
      setHint(null)
      if (engine.state.solved) setCelebrating(true)
    }
  }

  function showHint() {
    const h = engine.getHint()
    setHint(h ? h.tileIndex : null)
    // Auto-clear hint
    setTimeout(() => setHint(null), 1500)
  }

  function handleUndo() {
    const res = engine.undoMove()
    if (res.success) { setState(engine.cloneState()); setHint(null) }
  }

  function fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  if (!state) return null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onExit} style={styles.backBtn}>←</button>
        <span style={styles.title}>Sliding Puzzle</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#f5a623', fontWeight: 700 }}>{fmt(elapsed)}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{state.moves} moves</div>
        </div>
      </div>

      {celebrating && (
        <div style={styles.celebration}>
          🎉 Solved in {state.moves} moves! 🎉
        </div>
      )}

      <div style={styles.board}>
        {state.board.map((val, i) => {
          const isBlank = val === 0
          const isHint = hint === i
          const isCorrect = val !== 0 && val === (i < SIZE * SIZE - 1 ? i + 1 : 0)
          return (
            <button
              key={i}
              onClick={() => !isBlank && handleTileClick(i)}
              style={{
                ...styles.tile,
                opacity: isBlank ? 0 : 1,
                background: isHint
                  ? 'rgba(245,166,35,0.6)'
                  : isCorrect
                    ? 'rgba(76,175,80,0.4)'
                    : 'rgba(255,255,255,0.1)',
                border: isHint
                  ? '2px solid #f5a623'
                  : isCorrect
                    ? '2px solid rgba(76,175,80,0.6)'
                    : '2px solid rgba(255,255,255,0.12)',
                cursor: isBlank ? 'default' : 'pointer',
                transform: isHint ? 'scale(1.08)' : 'scale(1)',
                transition: 'all 0.12s'
              }}
            >
              {!isBlank && (
                <span style={{
                  fontSize: 22, fontWeight: 700,
                  color: isCorrect ? '#81c784' : '#fff'
                }}>{val}</span>
              )}
            </button>
          )
        })}
      </div>

      <div style={styles.controls}>
        <button onClick={handleUndo} style={styles.btn} disabled={state.solved}>↩ Undo</button>
        <button onClick={showHint} style={{ ...styles.btn, color: '#f5a623' }} disabled={state.solved}>💡 Hint</button>
        <button onClick={startGame} style={{ ...styles.btn, ...styles.primaryBtn }}>
          {state.solved ? '▶ New Game' : '↺ Reset'}
        </button>
      </div>

      <div style={styles.legend}>
        <span style={{ color: 'rgba(76,175,80,0.8)' }}>■ Correct position</span>
        <span style={{ color: '#f5a623', marginLeft: 12 }}>■ Hint</span>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    height: '100%', background: 'linear-gradient(160deg, #1a1a2e 0%, #1a2744 100%)',
    padding: 16, gap: 16, userSelect: 'none'
  },
  header: {
    display: 'flex', alignItems: 'center', width: '100%', maxWidth: 380, gap: 8
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
    fontSize: 20, padding: '6px 14px', borderRadius: 10, cursor: 'pointer'
  },
  title: { flex: 1, color: '#fff', fontSize: 20, fontWeight: 700, textAlign: 'center' },
  celebration: {
    color: '#ffd700', fontWeight: 700, fontSize: 18,
    background: 'rgba(255,215,0,0.1)', padding: '10px 20px', borderRadius: 12,
    border: '1px solid rgba(255,215,0,0.3)'
  },
  board: {
    display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
    gap: 6, width: '100%', maxWidth: 360, aspectRatio: '1'
  },
  tile: {
    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, border: 'none', transition: 'all 0.12s'
  },
  controls: { display: 'flex', gap: 10, width: '100%', maxWidth: 360 },
  btn: {
    flex: 1, padding: '11px 0', borderRadius: 12, border: 'none',
    background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14,
    fontWeight: 600, cursor: 'pointer'
  },
  primaryBtn: { background: '#f5a623', color: '#1a1a2e' },
  legend: { fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex' }
}
