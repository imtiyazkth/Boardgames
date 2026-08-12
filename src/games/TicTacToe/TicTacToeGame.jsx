import { useState, useEffect, useCallback } from 'react'
import { TicTacToeEngine, TicTacToeAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

const COLORS = { X: '#e94560', O: '#4fc3f7' }

export default function TicTacToeGame({ mode = 'solo', difficulty = 'normal', playerNames = [], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine]          = useState(() => new TicTacToeEngine())
  const [state, setState] = useState(null)
  const [ai]              = useState(() => new TicTacToeAI(difficulty))
  const [thinking, setThinking] = useState(false)
  const [msg, setMsg]     = useState('')
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 })

  const isAITurn = useCallback((st) => {
    if (!st || st.gameOver) return false
    if (mode === 'local2p') return false
    if (mode === 'aiVsAi')  return true
    return st.currentPlayer === 'O'
  }, [mode])

  const startGame = useCallback(() => {
    engine.initializeGame()
    setState(engine.cloneState())
    setMsg('')
    setThinking(false)
    play('game_start')
  }, [engine, play])

  useEffect(() => { startGame() }, [startGame])

  useEffect(() => {
    if (!state || !isAITurn(state)) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          play(state.currentPlayer === 'X' ? 'ttt_x' : 'ttt_o')
          const ns = engine.cloneState()
          setState(ns)
          processEnd(ns)
        }
      }
      setThinking(false)
    }, mode === 'aiVsAi' ? 500 : 320)
    return () => clearTimeout(t)
  }, [state, isAITurn])

  function processEnd(st) {
    if (!st.gameOver) return
    if (st.winner === 'draw') {
      setMsg("It's a draw! 🤝"); play('ttt_draw'); vibrate([40, 30, 40])
      setScores(s => ({ ...s, draw: s.draw + 1 }))
    } else {
      const name = st.winner === 'X'
        ? (playerNames[0] || 'Player 1')
        : mode === 'solo' ? 'AI' : (playerNames[1] || 'Player 2')
      setMsg(`${name} wins! 🎉`)
      play('ttt_win'); vibrate([60, 40, 60, 40, 80])
      setScores(s => ({ ...s, [st.winner]: s[st.winner] + 1 }))
    }
  }

  function handleCellClick(i) {
    if (!state || state.gameOver || isAITurn(state) || thinking) {
      if (state?.board[i] !== null || state?.gameOver) play('piece_invalid')
      return
    }
    play('ui_click')
    const res = engine.applyMove({ index: i })
    if (!res.success) { play('piece_invalid'); return }
    play(engine.state.currentPlayer === 'X' ? 'ttt_o' : 'ttt_x')  // sound for piece just placed
    vibrate([10])
    const ns = engine.cloneState()
    setState(ns)
    processEnd(ns)
  }

  function handleUndo() {
    play('ui_back')
    const res = engine.undoMove()
    if (res.success && mode === 'solo') engine.undoMove()
    setState(engine.cloneState())
    setMsg('')
  }

  if (!state) return null
  const { board, winLine, gameOver, currentPlayer } = state

  return (
    <div style={S.container} onPointerDown={() => {}}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Tic Tac Toe</span>
        <div style={S.scoreBox}>
          <span style={{ color: COLORS.X }}>X {scores.X}</span>
          <span style={{ color: '#555' }}> · </span>
          <span style={{ color: '#888' }}>{scores.draw}</span>
          <span style={{ color: '#555' }}> · </span>
          <span style={{ color: COLORS.O }}>O {scores.O}</span>
        </div>
      </div>

      <div style={S.turnBox}>
        {gameOver ? (
          <span style={{ color: '#ffd700', fontWeight: 700, fontSize: 18 }}>{msg}</span>
        ) : (
          <span style={{ color: COLORS[currentPlayer], fontWeight: 700, fontSize: 16 }}>
            {thinking ? '🤔 AI thinking…'
              : currentPlayer === 'X'
                ? `${playerNames[0] || 'Player 1'}'s turn (X)`
                : mode === 'solo' ? "AI's turn (O)"
                : `${playerNames[1] || 'Player 2'}'s turn (O)`}
          </span>
        )}
      </div>

      <div style={S.board}>
        {board.map((cell, i) => {
          const isWin = winLine?.includes(i)
          return (
            <button key={i} onClick={() => handleCellClick(i)} style={{
              ...S.cell,
              background: isWin ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
              border: isWin ? '2px solid rgba(255,215,0,0.5)' : '2px solid rgba(255,255,255,0.1)',
              cursor: (!cell && !gameOver && !isAITurn(state)) ? 'pointer' : 'default',
            }}>
              {cell && (
                <span style={{
                  fontSize: 52, fontWeight: 900, color: COLORS[cell],
                  textShadow: `0 0 24px ${COLORS[cell]}90`,
                  lineHeight: 1, userSelect: 'none', display: 'block'
                }}>{cell}</span>
              )}
            </button>
          )
        })}
      </div>

      <div style={S.controls}>
        <button onClick={handleUndo} style={S.btn} disabled={thinking || !engine.history?.length}>↩ Undo</button>
        <button onClick={startGame} style={{ ...S.btn, ...S.primaryBtn }}>
          {gameOver ? '▶ Play Again' : '↺ Restart'}
        </button>
      </div>

      <div style={S.badge}>
        {mode === 'solo' ? '🤖 vs AI' : mode === 'aiVsAi' ? '🤖 vs 🤖' : '👥 Local 2P'}
        {' · '}{difficulty}
      </div>
    </div>
  )
}

const S = {
  container: { display:'flex', flexDirection:'column', alignItems:'center', height:'100%',
    background:'linear-gradient(160deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)',
    padding:16, gap:14, userSelect:'none' },
  header: { display:'flex', alignItems:'center', width:'100%', maxWidth:380, gap:8 },
  backBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 14px', borderRadius:10, cursor:'pointer' },
  title: { flex:1, color:'#fff', fontSize:20, fontWeight:700, textAlign:'center' },
  scoreBox: { fontSize:13, fontWeight:700, minWidth:80, textAlign:'right' },
  turnBox: { height:38, display:'flex', alignItems:'center', justifyContent:'center' },
  board: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8,
    width:'100%', maxWidth:300, aspectRatio:'1' },
  cell: { aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius:16, transition:'all 0.12s' },
  controls: { display:'flex', gap:12, width:'100%', maxWidth:300 },
  btn: { flex:1, padding:'12px 0', borderRadius:12, border:'none',
    background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer' },
  primaryBtn: { background:'#e94560' },
  badge: { fontSize:11, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1 }
}
