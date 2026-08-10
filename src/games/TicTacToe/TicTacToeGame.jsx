import { useState, useEffect, useCallback } from 'react'
import { TicTacToeEngine, TicTacToeAI } from './engine.js'
import { SaveSystem } from '../../core/SaveSystem.js'

const COLORS = { X: '#e94560', O: '#4fc3f7' }

export default function TicTacToeGame({ mode, difficulty, playerNames, onExit }) {
  const [engine] = useState(() => new TicTacToeEngine())
  const [state, setState] = useState(null)
  const [ai] = useState(() => new TicTacToeAI(difficulty))
  const [thinking, setThinking] = useState(false)
  const [msg, setMsg] = useState('')
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 })

  const isAITurn = useCallback((st) => {
    if (!st || st.gameOver) return false
    if (mode === 'local2p') return false
    if (mode === 'aiVsAi') return true
    return st.currentPlayer === 'O'
  }, [mode])

  const startGame = useCallback(() => {
    engine.initializeGame()
    setState(engine.cloneState())
    setMsg('')
    setThinking(false)
  }, [engine])

  useEffect(() => { startGame() }, [startGame])

  useEffect(() => {
    if (!state || !isAITurn(state)) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          setState(engine.cloneState())
          handleGameEnd(engine.state)
        }
      }
      setThinking(false)
    }, 300)
    return () => clearTimeout(t)
  }, [state, isAITurn])

  function handleGameEnd(st) {
    if (!st.gameOver) return
    if (st.winner === 'draw') {
      setMsg("It's a draw! 🤝")
      setScores(s => ({ ...s, draw: s.draw + 1 }))
    } else {
      const name = st.winner === 'X'
        ? (playerNames?.[0] || 'Player 1')
        : (mode === 'solo' ? 'AI' : (playerNames?.[1] || 'Player 2'))
      setMsg(`${name} wins! 🎉`)
      setScores(s => ({ ...s, [st.winner]: s[st.winner] + 1 }))
    }
  }

  function handleCellClick(i) {
    if (!state || state.gameOver || isAITurn(state) || thinking) return
    const res = engine.applyMove({ index: i })
    if (res.success) {
      setState(engine.cloneState())
      handleGameEnd(engine.state)
    }
  }

  function handleUndo() {
    const res = engine.undoMove()
    // If AI moved last, undo again
    if (res.success && mode === 'solo') {
      const res2 = engine.undoMove()
      if (res2.success) setState(engine.cloneState())
      else setState(engine.cloneState())
    } else if (res.success) {
      setState(engine.cloneState())
    }
    setMsg('')
  }

  if (!state) return null

  const { board, winLine, gameOver, currentPlayer } = state

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onExit} style={styles.backBtn}>←</button>
        <span style={styles.title}>Tic Tac Toe</span>
        <div style={styles.scoreBox}>
          <span style={{ color: COLORS.X }}>X {scores.X}</span>
          <span style={{ color: '#888' }}> | </span>
          <span style={{ color: '#888' }}>{scores.draw}</span>
          <span style={{ color: '#888' }}> | </span>
          <span style={{ color: COLORS.O }}>O {scores.O}</span>
        </div>
      </div>

      {/* Turn Indicator */}
      <div style={styles.turnBox}>
        {gameOver ? (
          <span style={styles.msgText}>{msg}</span>
        ) : (
          <span style={{ color: COLORS[currentPlayer], fontWeight: 700, fontSize: 18 }}>
            {thinking ? '🤔 AI thinking…'
              : currentPlayer === 'X'
                ? `${playerNames?.[0] || 'Player 1'}'s turn (X)`
                : mode === 'solo' ? 'AI\'s turn (O)'
                : `${playerNames?.[1] || 'Player 2'}'s turn (O)`}
          </span>
        )}
      </div>

      {/* Board */}
      <div style={styles.board}>
        {board.map((cell, i) => {
          const isWin = winLine?.includes(i)
          return (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              style={{
                ...styles.cell,
                background: isWin ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                border: isWin ? '2px solid rgba(255,255,255,0.4)' : '2px solid rgba(255,255,255,0.1)',
                cursor: cell || gameOver || isAITurn(state) ? 'default' : 'pointer',
                transform: cell ? 'scale(1)' : 'scale(1)',
                transition: 'all 0.15s'
              }}
            >
              {cell && (
                <span style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: COLORS[cell],
                  textShadow: `0 0 20px ${COLORS[cell]}80`,
                  lineHeight: 1,
                  userSelect: 'none'
                }}>
                  {cell}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button onClick={handleUndo} style={styles.btn} disabled={thinking}>↩ Undo</button>
        <button onClick={startGame} style={{ ...styles.btn, ...styles.primaryBtn }}>
          {gameOver ? '▶ Play Again' : '↺ Restart'}
        </button>
      </div>

      {/* Mode Badge */}
      <div style={styles.modeBadge}>
        {mode === 'solo' ? '🤖 vs AI' : mode === 'aiVsAi' ? '🤖 vs 🤖' : '👥 Local 2P'} · {difficulty}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    height: '100%', background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
    padding: '16px', gap: 16, userSelect: 'none'
  },
  header: {
    display: 'flex', alignItems: 'center', width: '100%', maxWidth: 400, gap: 8
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
    fontSize: 20, padding: '6px 14px', borderRadius: 10, cursor: 'pointer'
  },
  title: { flex: 1, color: '#fff', fontSize: 20, fontWeight: 700, textAlign: 'center' },
  scoreBox: { fontSize: 14, fontWeight: 700 },
  turnBox: {
    height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  msgText: { color: '#ffd700', fontWeight: 700, fontSize: 20 },
  board: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8, width: '100%', maxWidth: 320, aspectRatio: '1'
  },
  cell: {
    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer',
    transition: 'all 0.15s'
  },
  controls: { display: 'flex', gap: 12, width: '100%', maxWidth: 320 },
  btn: {
    flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
    background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 15,
    fontWeight: 600, cursor: 'pointer'
  },
  primaryBtn: { background: '#e94560' },
  modeBadge: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
    letterSpacing: 1
  }
}
