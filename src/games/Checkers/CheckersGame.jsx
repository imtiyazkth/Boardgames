import { useState, useEffect, useCallback } from 'react'
import { CheckersEngine, CheckersAI } from './engine.js'

export default function CheckersGame({ mode, difficulty, playerNames, onExit }) {
  const [engine] = useState(() => new CheckersEngine())
  const [state, setState] = useState(null)
  const [ai] = useState(() => new CheckersAI(difficulty))
  const [selected, setSelected] = useState(null)
  const [legalFrom, setLegalFrom] = useState([])
  const [legalTo, setLegalTo] = useState([])
  const [thinking, setThinking] = useState(false)
  const [msg, setMsg] = useState('')

  const isAITurn = useCallback((st) => {
    if (!st || st.gameOver) return false
    if (mode === 'local2p') return false
    return st.currentPlayer === 'b'
  }, [mode])

  useEffect(() => {
    engine.initializeGame()
    const s = engine.cloneState()
    setState(s)
    computeLegal(s)
  }, [])

  function computeLegal(st) {
    if (!st || st.gameOver || isAITurn(st)) { setLegalFrom([]); setLegalTo([]); return }
    const moves = engine.getLegalMoves()
    setLegalFrom([...new Set(moves.map(m => m.from))])
    setLegalTo([])
    setSelected(null)
  }

  useEffect(() => {
    if (!state || !isAITurn(state)) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          const ns = engine.cloneState()
          setState(ns)
          if (ns.gameOver) setMsg(getWinMsg(ns))
          else computeLegal(ns)
        }
      }
      setThinking(false)
    }, 500)
    return () => clearTimeout(t)
  }, [state])

  function getWinMsg(st) {
    const name = st.winner === 'r'
      ? (playerNames?.[0] || 'Red')
      : (mode === 'solo' ? 'AI' : (playerNames?.[1] || 'Black'))
    return `${name} wins! 🎉`
  }

  function handleCellClick(i) {
    if (!state || state.gameOver || isAITurn(state) || thinking) return
    const piece = state.board[i]
    const player = state.currentPlayer

    if (selected === null) {
      if (legalFrom.includes(i)) {
        setSelected(i)
        const moves = engine.getLegalMoves().filter(m => m.from === i)
        setLegalTo(moves.map(m => m.to))
      }
    } else {
      if (i === selected) {
        setSelected(null); setLegalTo([])
      } else if (legalTo.includes(i)) {
        const moves = engine.getLegalMoves().filter(m => m.from === selected && m.to === i)
        if (moves.length) {
          const res = engine.applyMove(moves[0])
          if (res.success) {
            const ns = engine.cloneState()
            setState(ns)
            setSelected(null); setLegalTo([])
            if (ns.gameOver) setMsg(getWinMsg(ns))
            else computeLegal(ns)
          }
        }
      } else if (legalFrom.includes(i)) {
        setSelected(i)
        const moves2 = engine.getLegalMoves().filter(m => m.from === i)
        setLegalTo(moves2.map(m => m.to))
      }
    }
  }

  function restart() {
    engine.initializeGame()
    const s = engine.cloneState()
    setState(s)
    computeLegal(s)
    setMsg('')
  }

  function handleUndo() {
    // Undo twice in solo mode
    engine.undoMove()
    if (mode === 'solo') engine.undoMove()
    const s = engine.cloneState()
    setState(s)
    computeLegal(s)
    setMsg('')
  }

  if (!state) return null
  const { board, currentPlayer, gameOver } = state
  const PIECE_COLORS = { r: '#e94560', R: '#e94560', b: '#bbb', B: '#bbb' }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onExit} style={styles.backBtn}>←</button>
        <span style={styles.title}>Checkers</span>
        <span style={{ color: currentPlayer === 'r' ? '#e94560' : '#bbb', fontWeight: 700 }}>
          {gameOver ? '' : currentPlayer === 'r' ? '🔴 Red' : '⬛ Black'}
        </span>
      </div>

      <div style={styles.statusBar}>
        {gameOver ? (
          <span style={{ color: '#ffd700', fontWeight: 700 }}>{msg}</span>
        ) : thinking ? (
          <span style={{ color: '#bbb' }}>🤔 AI thinking…</span>
        ) : (
          <span style={{ color: currentPlayer === 'r' ? '#e94560' : '#bbb' }}>
            {currentPlayer === 'r'
              ? `${playerNames?.[0] || 'Red Player'}'s turn`
              : mode === 'solo' ? 'AI\'s turn' : `${playerNames?.[1] || 'Black Player'}'s turn`}
          </span>
        )}
      </div>

      <div style={styles.board}>
        {Array.from({ length: 64 }, (_, i) => {
          const row = Math.floor(i / 8), col = i % 8
          const isDark = (row + col) % 2 === 1
          const piece = board[i]
          const isSelected = selected === i
          const isLegalFrom2 = legalFrom.includes(i) && !gameOver
          const isLegalTo2 = legalTo.includes(i)

          return (
            <div
              key={i}
              onClick={() => isDark && handleCellClick(i)}
              style={{
                aspectRatio: '1',
                background: isDark
                  ? isSelected ? 'rgba(245,166,35,0.5)'
                    : isLegalFrom2 ? 'rgba(255,255,255,0.2)'
                    : isLegalTo2 ? 'rgba(76,175,80,0.4)'
                    : 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isDark ? 'pointer' : 'default',
                border: isLegalTo2 ? '2px solid rgba(76,175,80,0.8)' : 'none',
                transition: 'background 0.1s',
                position: 'relative'
              }}
            >
              {piece && (
                <div style={{
                  width: '72%', height: '72%', borderRadius: '50%',
                  background: PIECE_COLORS[piece],
                  boxShadow: `0 3px 8px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.3)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: isSelected ? '2px solid #ffd700' : '2px solid rgba(255,255,255,0.2)'
                }}>
                  {(piece === 'R' || piece === 'B') && (
                    <span style={{ fontSize: 14 }}>♛</span>
                  )}
                </div>
              )}
              {isLegalTo2 && !piece && (
                <div style={{
                  width: '35%', height: '35%', borderRadius: '50%',
                  background: 'rgba(76,175,80,0.6)'
                }} />
              )}
            </div>
          )
        })}
      </div>

      <div style={styles.controls}>
        <button onClick={handleUndo} style={styles.btn} disabled={thinking}>↩ Undo</button>
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
    height: '100%', background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1b3a 100%)',
    padding: 14, gap: 12, userSelect: 'none'
  },
  header: { display: 'flex', alignItems: 'center', width: '100%', maxWidth: 380, gap: 8 },
  backBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
    fontSize: 20, padding: '6px 14px', borderRadius: 10, cursor: 'pointer'
  },
  title: { flex: 1, color: '#fff', fontSize: 20, fontWeight: 700, textAlign: 'center' },
  statusBar: { height: 32, display: 'flex', alignItems: 'center' },
  board: {
    display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
    width: '100%', maxWidth: 380, aspectRatio: '1',
    border: '2px solid rgba(255,255,255,0.15)', borderRadius: 6, overflow: 'hidden'
  },
  controls: { display: 'flex', gap: 10, width: '100%', maxWidth: 380 },
  btn: {
    flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
    background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14,
    fontWeight: 600, cursor: 'pointer'
  },
  primaryBtn: { background: '#9c27b0' }
}
