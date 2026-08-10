import { useState, useEffect, useCallback } from 'react'
import { NineMensMorrisEngine, MorrisAI } from './engine.js'

// Point coordinates for SVG layout (0–23 positions on the board)
const POINTS = [
  // Outer
  [0,0],[3,0],[6,0],[6,3],[6,6],[3,6],[0,6],[0,3],
  // Middle
  [1,1],[3,1],[5,1],[5,3],[5,5],[3,5],[1,5],[1,3],
  // Inner
  [2,2],[3,2],[4,2],[4,3],[4,4],[3,4],[2,4],[2,3]
]

const LINES = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],
  [8,9],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,8],
  [16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,16],
  [1,9],[9,17],[3,11],[11,19],[5,13],[13,21],[7,15],[15,23]
]

const COLORS = { w: '#fffde7', b: '#37474f', null: 'transparent' }

export default function NineMensMorrisGame({ mode, difficulty, playerNames, onExit }) {
  const [engine] = useState(() => new NineMensMorrisEngine())
  const [state, setState] = useState(null)
  const [ai] = useState(() => new MorrisAI(difficulty))
  const [selected, setSelected] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [msg, setMsg] = useState('')

  const isAITurn = useCallback((st) => {
    if (!st || st.gameOver) return false
    if (mode === 'local2p') return false
    return st.currentPlayer === 'b'
  }, [mode])

  useEffect(() => {
    engine.initializeGame()
    setState(engine.cloneState())
  }, [])

  useEffect(() => {
    if (!state || !isAITurn(state) || state.gameOver) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          const ns = engine.cloneState()
          setState(ns)
          if (ns.gameOver) setMsg(`${ns.winner === 'w' ? (playerNames?.[0]||'White') : 'AI'} wins!`)
        }
      }
      setThinking(false)
    }, 400)
    return () => clearTimeout(t)
  }, [state])

  function handlePointClick(i) {
    if (!state || state.gameOver || isAITurn(state) || thinking) return
    const { phase, currentPlayer, pendingCapture } = state

    if (pendingCapture) {
      const res = engine.applyMove({ type: 'capture', point: i })
      if (res.success) { setState(engine.cloneState()); setSelected(null) }
      return
    }

    if (phase === 1) {
      const res = engine.applyMove({ type: 'place', point: i })
      if (res.success) {
        const ns = engine.cloneState()
        setState(ns)
        if (ns.gameOver) setMsg(`${ns.winner === 'w' ? (playerNames?.[0]||'White') : (mode==='solo'?'AI':(playerNames?.[1]||'Black'))} wins!`)
      }
      return
    }

    // Phase 2: select then move
    if (selected === null) {
      if (state.board[i] === currentPlayer) setSelected(i)
    } else {
      if (i === selected) { setSelected(null); return }
      const res = engine.applyMove({ type: 'move', from: selected, to: i })
      if (res.success) {
        const ns = engine.cloneState()
        setState(ns)
        setSelected(null)
        if (ns.gameOver) setMsg(`${ns.winner === 'w' ? (playerNames?.[0]||'White') : (mode==='solo'?'AI':(playerNames?.[1]||'Black'))} wins!`)
      } else {
        if (state.board[i] === currentPlayer) setSelected(i)
        else setSelected(null)
      }
    }
  }

  function restart() {
    engine.initializeGame()
    setState(engine.cloneState())
    setSelected(null)
    setMsg('')
  }

  if (!state) return null
  const { board, phase, currentPlayer, hand, pendingCapture, gameOver } = state
  const W = 300

  // Compute legal targets for visual hints
  const legalMoves = !gameOver && !isAITurn(state) ? engine.getLegalMoves() : []
  const legalTargets = new Set(
    pendingCapture ? legalMoves.map(m => m.point)
    : phase === 1 ? legalMoves.map(m => m.point)
    : selected !== null ? legalMoves.filter(m => m.from === selected).map(m => m.to)
    : []
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onExit} style={styles.backBtn}>←</button>
        <span style={styles.title}>Nine Men's Morris</span>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          <div style={{ color: '#fffde7' }}>⬜ {hand.w} hand</div>
          <div style={{ color: '#90a4ae' }}>⬛ {hand.b} hand</div>
        </div>
      </div>

      <div style={styles.status}>
        {gameOver ? (
          <span style={{ color: '#ffd700', fontWeight: 700 }}>{msg}</span>
        ) : pendingCapture ? (
          <span style={{ color: '#e94560' }}>💥 Remove an opponent piece!</span>
        ) : thinking ? (
          <span style={{ color: '#bbb' }}>🤔 AI thinking…</span>
        ) : (
          <span style={{ color: currentPlayer === 'w' ? '#fffde7' : '#90a4ae', fontWeight: 600 }}>
            {phase === 1 ? '📌 Place piece' : '↔ Move piece'} —{' '}
            {currentPlayer === 'w' ? (playerNames?.[0]||'White') : mode==='solo'?'AI':(playerNames?.[1]||'Black')}
          </span>
        )}
      </div>

      {/* Board SVG */}
      <div style={{ width: '100%', maxWidth: W, aspectRatio: '1' }}>
        <svg viewBox="0 0 7 7" width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Lines */}
          {LINES.map(([a, b], li) => (
            <line key={li}
              x1={POINTS[a][0] + 0.5} y1={POINTS[a][1] + 0.5}
              x2={POINTS[b][0] + 0.5} y2={POINTS[b][1] + 0.5}
              stroke="rgba(255,255,255,0.25)" strokeWidth="0.05"
            />
          ))}
          {/* Points */}
          {POINTS.map(([px, py], i) => {
            const piece = board[i]
            const isTarget = legalTargets.has(i)
            const isSel = selected === i
            return (
              <g key={i} onClick={() => handlePointClick(i)} style={{ cursor: 'pointer' }}>
                <circle cx={px + 0.5} cy={py + 0.5} r={0.35}
                  fill={isSel ? '#ffd700'
                    : isTarget && !piece ? 'rgba(76,175,80,0.5)'
                    : piece === 'w' ? '#fffde7'
                    : piece === 'b' ? '#455a64'
                    : 'rgba(255,255,255,0.1)'}
                  stroke={isSel ? '#ffd700'
                    : isTarget ? 'rgba(76,175,80,0.9)'
                    : piece ? 'rgba(255,255,255,0.4)'
                    : 'rgba(255,255,255,0.2)'}
                  strokeWidth={isSel || isTarget ? 0.07 : 0.04}
                />
                {/* Cross for empty interactive */}
                {!piece && isTarget && (
                  <circle cx={px + 0.5} cy={py + 0.5} r={0.12}
                    fill="rgba(76,175,80,0.7)"
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={styles.legend}>
        <span style={{ color: '#fffde7' }}>⬜ White</span>
        <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.3)' }}>|</span>
        <span style={{ color: '#90a4ae' }}>⬛ Black</span>
        <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.3)' }}>|</span>
        <span style={{ color: '#4caf50' }}>● = valid target</span>
      </div>

      <div style={styles.controls}>
        <button onClick={() => { engine.undoMove(); if(mode==='solo') engine.undoMove(); setState(engine.cloneState()); setSelected(null); setMsg('') }}
          style={styles.btn} disabled={thinking}>↩ Undo</button>
        <button onClick={restart} style={{ ...styles.btn, ...styles.primaryBtn }}>
          {gameOver ? '▶ New Game' : '↺ Restart'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    height: '100%', background: 'linear-gradient(160deg, #1a1507 0%, #1a1a2e 100%)',
    padding: 14, gap: 10, userSelect: 'none', overflow: 'hidden'
  },
  header: { display: 'flex', alignItems: 'center', width: '100%', maxWidth: 360, gap: 8 },
  backBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
    fontSize: 20, padding: '6px 14px', borderRadius: 10, cursor: 'pointer'
  },
  title: { flex: 1, color: '#fff', fontSize: 17, fontWeight: 700, textAlign: 'center' },
  status: { height: 30, display: 'flex', alignItems: 'center', fontSize: 14 },
  legend: { fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' },
  controls: { display: 'flex', gap: 10, width: '100%', maxWidth: 360 },
  btn: {
    flex: 1, padding: '11px 0', borderRadius: 12, border: 'none',
    background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14,
    fontWeight: 600, cursor: 'pointer'
  },
  primaryBtn: { background: '#795548' }
}
