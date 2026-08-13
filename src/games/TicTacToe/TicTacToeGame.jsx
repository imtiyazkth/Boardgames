import { useState, useEffect, useRef, useCallback } from 'react'
import { TicTacToeEngine, TicTacToeAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import GameShell from '../../components/GameShell.jsx'

const COLORS = { X: '#e94560', O: '#4fc3f7' }

export default function TicTacToeGame({ mode='solo', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine] = useState(() => new TicTacToeEngine())
  const [state, setState]     = useState(null)
  const [ai]    = useState(() => new TicTacToeAI(difficulty))
  const [thinking, setThinking] = useState(false)
  const [scores, setScores]   = useState({ X:0, O:0, draw:0 })
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  const p1 = playerNames[0] || 'Player 1'
  const p2 = mode==='solo' ? 'AI' : (playerNames[1] || 'Player 2')

  const isAITurn = useCallback(st => {
    if (!st || st.gameOver) return false
    if (mode==='local2p') return false
    if (mode==='aiVsAi')  return true
    return st.currentPlayer === 'O'
  }, [mode])

  const startGame = useCallback(() => {
    engine.initializeGame()
    setState(engine.cloneState())
    setThinking(false)
    setElapsed(0)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(e => e+1), 1000)
    play('game_start')
  }, [engine, play])

  useEffect(() => { startGame(); return () => clearInterval(timerRef.current) }, [startGame])

  // Stop timer on game over
  useEffect(() => {
    if (state?.gameOver) clearInterval(timerRef.current)
  }, [state?.gameOver])

  // AI turn
  useEffect(() => {
    if (!state || !isAITurn(state)) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          play(state.currentPlayer==='X' ? 'ttt_x' : 'ttt_o')
          const ns = engine.cloneState()
          setState(ns)
          processEnd(ns)
        }
      }
      setThinking(false)
    }, mode==='aiVsAi' ? 600 : 380)
    return () => clearTimeout(t)
  }, [state, isAITurn])

  function processEnd(st) {
    if (!st.gameOver) return
    clearInterval(timerRef.current)
    if (st.winner==='draw') {
      play('ttt_draw'); vibrate([40,30,40])
      setScores(s=>({...s, draw:s.draw+1}))
    } else {
      play('ttt_win'); vibrate([60,40,60,40,80])
      setScores(s=>({...s, [st.winner]:s[st.winner]+1}))
    }
  }

  function handleCellClick(i) {
    if (!state || state.gameOver || isAITurn(state) || thinking) return
    if (state.board[i] !== null) { play('piece_invalid'); return }
    play('ui_click'); vibrate([10])
    const res = engine.applyMove({ index: i })
    if (!res.success) { play('piece_invalid'); return }
    play(engine.state.currentPlayer==='X' ? 'ttt_o' : 'ttt_x')
    const ns = engine.cloneState()
    setState(ns)
    processEnd(ns)
  }

  function handleUndo() {
    play('ui_back')
    engine.undoMove()
    if (mode==='solo') engine.undoMove()
    setState(engine.cloneState())
  }

  if (!state) return null
  const { board, winLine, gameOver, currentPlayer } = state
  const curIdx = currentPlayer==='X' ? 0 : 1

  const winner = gameOver
    ? (state.winner==='draw' ? null : {
        name: state.winner==='X' ? p1 : p2,
        detail: state.winner==='X' ? 'Plays X' : 'Plays O',
      })
    : null

  let status = null
  if (!gameOver) {
    if (thinking) status = 'thinking'
    else if (curIdx===0) status = 'your-turn'
    else status = mode==='solo' ? 'opponent-turn' : 'your-turn'
  }

  return (
    <GameShell
      title="Tic Tac Toe" emoji="⭕" color="#e94560"
      players={[
        { name:p1, score:scores.X, color:COLORS.X, isAI:false },
        { name:p2, score:scores.O, color:COLORS.O, isAI:mode==='solo' },
      ]}
      currentPlayerIdx={curIdx}
      status={status}
      gameOver={gameOver}
      winner={winner}
      onExit={onExit}
      onRestart={startGame}
      onUndo={handleUndo}
      canUndo={!thinking && (engine.history?.length??0)>0}
      showTimer={true}
      elapsed={elapsed}
      extraBadge={`${mode==='solo'?'🤖 vs AI':mode==='aiVsAi'?'🤖 vs 🤖':'👥 2P'} · ${difficulty}`}
    >
      {/* Board */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(3,1fr)',
        gap:6, width:'min(80vw,300px)', aspectRatio:'1',
        padding:6,
      }}>
        {board.map((cell, i) => {
          const isWin = winLine?.includes(i)
          return (
            <button key={i} onClick={() => handleCellClick(i)} style={{
              aspectRatio:'1',
              display:'flex', alignItems:'center', justifyContent:'center',
              borderRadius:18,
              background: isWin
                ? 'rgba(255,215,0,0.18)'
                : cell ? `${COLORS[cell]}12` : 'rgba(255,255,255,0.05)',
              border: isWin
                ? '2px solid rgba(255,215,0,0.6)'
                : cell ? `2px solid ${COLORS[cell]}40` : '2px solid rgba(255,255,255,0.08)',
              cursor: !cell&&!gameOver&&!isAITurn(state) ? 'pointer' : 'default',
              transition:'all 0.12s',
              boxShadow: isWin ? `0 0 20px rgba(255,215,0,0.3)` : 'none',
            }}>
              {cell && (
                <span style={{
                  fontSize:'clamp(32px,12vw,56px)', fontWeight:900,
                  color:COLORS[cell],
                  textShadow:`0 0 20px ${COLORS[cell]}80`,
                  lineHeight:1, userSelect:'none', display:'block',
                  animation:'popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                }}>{cell}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Draw score in center */}
      <div style={{
        position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
        background:'rgba(0,0,0,0.4)', borderRadius:20, padding:'3px 10px',
        fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:700,
        border:'1px solid rgba(255,255,255,0.08)', whiteSpace:'nowrap',
      }}>
        🤝 {scores.draw} draw{scores.draw!==1?'s':''}
      </div>
    </GameShell>
  )
}
