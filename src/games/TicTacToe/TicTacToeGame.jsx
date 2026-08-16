import { useState, useEffect, useRef, useCallback } from 'react'
import { TicTacToeEngine, TicTacToeAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import { SaveSystem } from '../../core/SaveSystem.js'

const CX = '#e94560'  // X color — neon red
const CO = '#4fc3f7'  // O color — electric blue

export default function TicTacToeGame({ mode='solo', difficulty='normal', playerNames=[], onExit, onGameOver }) {
  const { play, vibrate } = useAudio()
  const [engine] = useState(() => new TicTacToeEngine())
  const [ai]     = useState(() => new TicTacToeAI(difficulty))
  const [state,  setState]   = useState(null)
  const [thinking,setThinking] = useState(false)
  const [scores, setScores]  = useState({ X:0, O:0, draw:0 })
  const [elapsed,setElapsed] = useState(0)
  const [lastCell,setLastCell] = useState(null)
  const timerRef = useRef(null)
  const aiBusy   = useRef(false)

  const p1 = playerNames[0] || 'Player'
  const p2 = mode==='solo' ? `AI·${difficulty}` : (playerNames[1]||'Player 2')

  const isAI = useCallback(st => {
    if (!st||st.gameOver||mode==='local2p') return false
    if (mode==='aiVsAi') return true
    return st.currentPlayer==='O'
  },[mode])

  function newGame() {
    engine.initializeGame()
    setState(engine.cloneState())
    setThinking(false); aiBusy.current=false
    setLastCell(null)
    setElapsed(0)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(()=>setElapsed(e=>e+1),1000)
    play('game_start')
  }

  useEffect(()=>{ newGame(); return()=>clearInterval(timerRef.current) },[])
  useEffect(()=>{ if(state?.gameOver) clearInterval(timerRef.current) },[state?.gameOver])

  useEffect(()=>{
    if (!state||!isAI(state)||aiBusy.current) return
    aiBusy.current=true; setThinking(true)
    const t=setTimeout(()=>{
      const move=ai.getBestMove(engine)
      if (move) { handleMove(move.index); }
      setThinking(false); aiBusy.current=false
    }, mode==='aiVsAi'?400:500)
    return()=>clearTimeout(t)
  },[state])

  function handleMove(idx) {
    if (!state||state.gameOver||state.board[idx]!==null) return
    const res=engine.applyMove({index:idx})
    if (!res.success) return
    const ns=engine.cloneState()
    setState(ns); setLastCell(idx)
    play(ns.currentPlayer==='O'?'ttt_x':'ttt_o'); vibrate([8])
    if (ns.gameOver) {
      clearInterval(timerRef.current)
      if (ns.winner==='draw') { play('ttt_draw'); vibrate([30,20,30]) }
      else { play('ttt_win'); vibrate([50,30,80]) }
      const winner = ns.winner==='draw'?null:ns.winner
      const w = winner==='X'?'X':'O'
      setScores(s=>({...s, [ns.winner==='draw'?'draw':w]:s[ns.winner==='draw'?'draw':w]+1}))
      SaveSystem.recordResult(
        'tictactoe',
        winner ? (winner==='X'?'win':'loss') : 'draw'
      )
      onGameOver?.({ winner: winner?p1:null, draw: ns.winner==='draw' })
    }
  }

  function handleCellClick(i) {
    if (!state||state.gameOver||isAI(state)||thinking) return
    if (state.board[i]!==null) { play('piece_invalid'); return }
    handleMove(i)
  }

  if (!state) return null
  const { board, winLine, gameOver, currentPlayer } = state
  const curIdx = currentPlayer==='X'?0:1

  let statusText='', statusColor='#fff'
  if (gameOver) {
    statusText = state.winner==='draw'?'Draw!':`${state.winner==='X'?p1:p2} Wins!`
    statusColor='#ffd700'
  } else if (thinking) { statusText='🤖 Thinking…'; statusColor='rgba(255,255,255,0.35)' }
  else { statusText=`${currentPlayer==='X'?p1:p2}'s turn (${currentPlayer})`; statusColor=currentPlayer==='X'?CX:CO }

  const mm=String(Math.floor(elapsed/60)).padStart(2,'0')
  const ss=String(elapsed%60).padStart(2,'0')

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background:'linear-gradient(160deg,#1a0a14 0%,#0a0b14 50%)',
      userSelect:'none',overflow:'hidden',position:'relative',
    }}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px 8px',
        flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.25)'}}>
        <button onClick={onExit} style={BTN_BACK}>←</button>
        <span style={{fontSize:20,filter:'drop-shadow(0 0 10px #e9456080)'}}>⭕</span>
        <span style={{color:'#fff',fontWeight:900,fontSize:17,flex:1}}>Tic Tac Toe</span>
        <div style={{fontFamily:'monospace',fontSize:12,color:'rgba(255,255,255,0.35)',
          padding:'2px 8px',borderRadius:7,background:'rgba(0,0,0,0.3)',
          border:'1px solid rgba(255,255,255,0.06)'}}>{mm}:{ss}</div>
      </div>

      {/* Score row */}
      <div style={{display:'flex',gap:0,padding:'8px 12px',flexShrink:0,alignItems:'center'}}>
        {/* X player */}
        <div style={{flex:1,padding:'8px 10px',borderRadius:13,
          background:currentPlayer==='X'&&!gameOver?'rgba(233,69,96,0.15)':'rgba(255,255,255,0.04)',
          border:`1.5px solid ${currentPlayer==='X'&&!gameOver?CX:'rgba(255,255,255,0.08)'}`,
          boxShadow:currentPlayer==='X'&&!gameOver?`0 0 16px ${CX}30`:'none',
          transition:'all 0.2s',}}>
          <div style={{color:currentPlayer==='X'&&!gameOver?CX:'rgba(255,255,255,0.5)',
            fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            ✕ {p1}</div>
          <div style={{color:'#fff',fontWeight:900,fontSize:22}}>{scores.X}</div>
        </div>
        <div style={{padding:'0 12px',textAlign:'center'}}>
          <div style={{color:'rgba(255,255,255,0.15)',fontSize:11,fontWeight:700}}>DRAW</div>
          <div style={{color:'rgba(255,255,255,0.4)',fontWeight:800,fontSize:18}}>{scores.draw}</div>
        </div>
        {/* O player */}
        <div style={{flex:1,padding:'8px 10px',borderRadius:13,
          background:currentPlayer==='O'&&!gameOver?'rgba(79,195,247,0.15)':'rgba(255,255,255,0.04)',
          border:`1.5px solid ${currentPlayer==='O'&&!gameOver?CO:'rgba(255,255,255,0.08)'}`,
          boxShadow:currentPlayer==='O'&&!gameOver?`0 0 16px ${CO}30`:'none',
          transition:'all 0.2s',textAlign:'right'}}>
          <div style={{color:currentPlayer==='O'&&!gameOver?CO:'rgba(255,255,255,0.5)',
            fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {mode==='solo'?'🤖 ':''}{p2} ○</div>
          <div style={{color:'#fff',fontWeight:900,fontSize:22}}>{scores.O}</div>
        </div>
      </div>

      {/* Status */}
      <div style={{height:26,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <div style={{fontSize:12,fontWeight:700,color:statusColor,padding:'1px 10px',borderRadius:20}}>{statusText}</div>
      </div>

      {/* Board */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'8px',minHeight:0}}>
        <div style={{
          display:'grid',gridTemplateColumns:'repeat(3,1fr)',
          gap:8,width:'min(78vw,280px)',aspectRatio:'1',
        }}>
          {board.map((cell,i)=>{
            const isWin=winLine?.includes(i)
            const isLast=lastCell===i
            return (
              <button key={i} onClick={()=>handleCellClick(i)} style={{
                aspectRatio:'1',borderRadius:18,border:'none',cursor:'pointer',
                background:isWin?'rgba(255,215,0,0.18)':cell?`${cell==='X'?CX:CO}12`:'rgba(255,255,255,0.04)',
                outline:`2px solid ${isWin?'rgba(255,215,0,0.55)':cell?`${cell==='X'?CX:CO}40`:'rgba(255,255,255,0.08)'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                transition:'all 0.15s',
                boxShadow:isWin?`0 0 20px rgba(255,215,0,0.3)`:isLast?`0 0 14px ${cell==='X'?CX:CO}50`:'none',
                transform:isLast?'scale(1.05)':'scale(1)',
              }}>
                {cell&&(
                  <span style={{
                    fontSize:'clamp(28px,14vw,56px)',fontWeight:900,lineHeight:1,
                    color:cell==='X'?CX:CO,
                    textShadow:`0 0 20px ${cell==='X'?CX:CO}80`,
                    animation:isLast?'tttPop 0.2s cubic-bezier(0.34,1.56,0.64,1)':'none',
                  }}>{cell}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Win line overlay (visual) */}
      {winLine&&(
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:5,
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          {/* Simple glow on winning cells — handled by cell styling above */}
        </div>
      )}

      {/* Controls */}
      <div style={{display:'flex',gap:8,padding:'8px 12px 14px',flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)',background:'rgba(0,0,0,0.2)'}}>
        <button onClick={newGame} style={{
          flex:1,padding:'13px 0',borderRadius:13,border:'none',
          background:'linear-gradient(135deg,#e94560,#c62a47)',
          color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
          boxShadow:'0 3px 16px rgba(233,69,96,0.4)',
        }}>↺ New Game</button>
      </div>

      {/* Game over modal */}
      {gameOver&&(
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{
            background:'linear-gradient(160deg,#1a1020,#0a0814)',
            borderRadius:22,padding:'26px 20px',width:'100%',maxWidth:300,textAlign:'center',
            border:`2px solid ${state.winner==='draw'?'rgba(255,255,255,0.12)':state.winner==='X'?CX:CO}`,
            animation:'tttPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{fontSize:48,marginBottom:8}}>{state.winner==='draw'?'🤝':'🏆'}</div>
            <div style={{color:'#fff',fontWeight:900,fontSize:22,marginBottom:14}}>
              {state.winner==='draw'?'Draw!':`${state.winner==='X'?p1:p2} Wins!`}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={onExit} style={{
                flex:1,padding:'12px 0',borderRadius:12,
                border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.07)',
                color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                🏠 Home</button>
              <button onClick={newGame} style={{
                flex:2,padding:'12px 0',borderRadius:12,border:'none',
                background:`linear-gradient(135deg,#e94560,#c62a47)`,
                color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 3px 16px rgba(233,69,96,0.4)'}}>
                ▶ Play Again</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tttPop{from{transform:scale(0.4);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes tttPopIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}

const BTN_BACK = {
  background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,cursor:'pointer',
  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:'inherit',
}
