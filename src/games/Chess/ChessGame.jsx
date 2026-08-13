import { useState, useEffect, useRef, useCallback } from 'react'
import { ChessEngine, ChessAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import GameShell from '../../components/GameShell.jsx'

const SYM = { 6:'♔',5:'♕',4:'♖',3:'♗',2:'♘',1:'♙','-6':'♚','-5':'♛','-4':'♜','-3':'♝','-2':'♞','-1':'♟' }
const FILES = 'abcdefgh'
function pieceOf(v){ return SYM[String(v)]||'' }
function isWhite(v){ return v>0 }
function notation(i){ return FILES[i%8]+(8-Math.floor(i/8)) }

export default function ChessGame({ mode='solo', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine] = useState(()=>new ChessEngine())
  const [state, setState]       = useState(null)
  const [ai]    = useState(()=>new ChessAI(difficulty))
  const [sel, setSel]           = useState(null)
  const [legalTo, setLegalTo]   = useState([])
  const [thinking, setThinking] = useState(false)
  const [history, setHistory]   = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [scores, setScores]     = useState({ w:0, b:0 })
  const [elapsed, setElapsed]   = useState(0)
  const timerRef = useRef(null)

  const p1 = playerNames[0]||'White'
  const p2 = mode==='solo'?'AI':(playerNames[1]||'Black')

  const isAITurn = useCallback(st=>{
    if (!st||st.gameOver||mode==='local2p') return false
    return st.currentPlayer==='b'
  },[mode])

  function startGame() {
    engine.initializeGame()
    setState(engine.cloneState())
    setSel(null); setLegalTo([]); setHistory([]); setLastMove(null)
    setElapsed(0)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(()=>setElapsed(e=>e+1),1000)
    play('game_start')
  }

  useEffect(()=>{ startGame(); return ()=>clearInterval(timerRef.current) },[])
  useEffect(()=>{ if(state?.gameOver) clearInterval(timerRef.current) },[state?.gameOver])

  useEffect(()=>{
    if (!state||!isAITurn(state)) return
    setThinking(true)
    const t=setTimeout(()=>{
      const move=ai.getBestMove(engine)
      if (!move){ setThinking(false); return }
      const isCapture=engine.state.board[move.to]!==0
      const res=engine.applyMove(move)
      if (res.success){
        const ns=engine.cloneState()
        setState(ns); setLastMove(move)
        setHistory(h=>[...h.slice(-23), `${notation(move.from)}→${notation(move.to)}${isCapture?'×':''}${ns.check?'+':''}`])
        if (ns.checkmate){ play('chess_checkmate'); vibrate([60,30,80]); setScores(s=>({...s,b:s.b+1})) }
        else if (ns.check){ play('chess_check'); vibrate([30]) }
        else if (isCapture){ play('chess_capture'); vibrate([15]) }
        else if (move.castling) play('chess_castle')
        else play('chess_move')
      }
      setThinking(false)
    },500)
    return ()=>clearTimeout(t)
  },[state])

  function handleSquare(idx){
    if (!state||state.gameOver||isAITurn(state)||thinking) return
    const piece=state.board[idx], player=state.currentPlayer
    const owned=(player==='w'&&isWhite(piece))||(player==='b'&&!isWhite(piece)&&piece!==0)
    if (sel===null){
      if (!owned){ play('piece_invalid'); return }
      play('chess_select'); setSel(idx)
      setLegalTo(engine.getLegalMoves().filter(m=>m.from===idx).map(m=>m.to))
    } else {
      if (idx===sel){ setSel(null); setLegalTo([]); return }
      if (legalTo.includes(idx)){
        const isCapture=state.board[idx]!==0
        const move=engine.getLegalMoves().find(m=>m.from===sel&&m.to===idx)
        if (!move){ play('piece_invalid'); return }
        const res=engine.applyMove(move)
        if (res.success){
          const ns=engine.cloneState()
          setState(ns); setSel(null); setLegalTo([]); setLastMove(move)
          setHistory(h=>[...h.slice(-23),`${notation(move.from)}→${notation(move.to)}${isCapture?'×':''}${ns.check?'+':''}`])
          if (ns.checkmate){ play('chess_checkmate'); vibrate([60,30,80]); setScores(s=>({...s,w:s.w+1})) }
          else if (ns.stalemate){ play('game_draw') }
          else if (ns.check){ play('chess_check'); vibrate([30]) }
          else if (move.castling) play('chess_castle')
          else if (move.promotion){ play('chess_promote'); vibrate([20]) }
          else if (isCapture){ play('chess_capture'); vibrate([15]) }
          else{ play('chess_move'); vibrate([6]) }
        }
      } else if (owned){
        play('chess_select'); setSel(idx)
        setLegalTo(engine.getLegalMoves().filter(m=>m.from===idx).map(m=>m.to))
      } else { play('piece_invalid'); setSel(null); setLegalTo([]) }
    }
  }

  function handleUndo(){
    play('ui_back')
    engine.undoMove(); if(mode==='solo') engine.undoMove()
    setState(engine.cloneState()); setSel(null); setLegalTo([]); setLastMove(null)
    setHistory(h=>h.slice(0,Math.max(0,h.length-2)))
  }

  if (!state) return null
  const { board, currentPlayer, gameOver, check, checkmate, stalemate } = state
  const curIdx = currentPlayer==='w'?0:1

  let status=null
  if (!gameOver){
    if (check) status='check'
    else if (thinking) status='thinking'
    else if (curIdx===0) status='your-turn'
    else status=mode==='solo'?'opponent-turn':'your-turn'
  }

  const winner=gameOver&&!stalemate
    ? { name:state.winner==='w'?p1:p2, detail:state.winner==='w'?'White wins':'Black wins' }
    : null

  return (
    <GameShell
      title="Chess" emoji="♟" color="#607d8b"
      players={[
        {name:p1, score:scores.w, color:'#fff',   isAI:false},
        {name:p2, score:scores.b, color:'#90caf9', isAI:mode==='solo'},
      ]}
      currentPlayerIdx={curIdx}
      status={status} gameOver={gameOver} winner={winner}
      onExit={onExit} onRestart={startGame}
      onUndo={handleUndo} canUndo={!thinking&&(engine.history?.length??0)>0}
      showTimer={true} elapsed={elapsed}
      extraBadge={`${mode==='solo'?'🤖 vs AI':'👥 2P'} · ${difficulty}`}
    >
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:'100%', gap:2, padding:'0 4px' }}>
        {/* Board */}
        <div style={{ display:'flex', gap:3, width:'100%', maxWidth:380 }}>
          {/* Rank labels */}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-around', paddingTop:1 }}>
            {[8,7,6,5,4,3,2,1].map(r=>(
              <div key={r} style={{ height:'calc(100%/8)', fontSize:9, color:'rgba(255,255,255,0.3)',
                display:'flex', alignItems:'center', width:12, justifyContent:'center' }}>{r}</div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', flex:1, aspectRatio:'1',
            border:'2px solid rgba(255,255,255,0.15)', borderRadius:6, overflow:'hidden' }}>
            {Array.from({length:64},(_,i)=>{
              const row=Math.floor(i/8), col=i%8
              const isDark=(row+col)%2===1
              const piece=board[i]
              const isSel=sel===i
              const isTo=legalTo.includes(i)
              const isLast=lastMove&&(lastMove.from===i||lastMove.to===i)
              const pWhite=piece!==0&&isWhite(piece)
              return (
                <div key={i} onClick={()=>handleSquare(i)} style={{
                  aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
                  background: isSel ? 'rgba(255,215,0,0.55)'
                    : isLast ? (isDark?'rgba(103,178,139,0.65)':'rgba(186,214,177,0.75)')
                    : isDark ? '#769656' : '#eeeed2',
                  cursor:'pointer', position:'relative', transition:'background 0.08s',
                }}>
                  {isTo&&!piece&&(
                    <div style={{ width:'32%', height:'32%', borderRadius:'50%',
                      background:'rgba(0,0,0,0.22)', pointerEvents:'none' }}/>
                  )}
                  {isTo&&piece!==0&&(
                    <div style={{ position:'absolute', inset:0, border:'3px solid rgba(0,0,0,0.28)',
                      borderRadius:2, pointerEvents:'none', boxSizing:'border-box' }}/>
                  )}
                  {piece!==0&&(
                    <span style={{
                      fontSize:'clamp(16px,4.5vw,32px)', lineHeight:1, userSelect:'none',
                      color:pWhite?'#fff':'#111',
                      textShadow:pWhite
                        ?'0 1px 3px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.4)'
                        :'0 1px 2px rgba(255,255,255,0.25)',
                      zIndex:1,
                    }}>{pieceOf(piece)}</span>
                  )}
                  {row===7&&(
                    <span style={{ position:'absolute', bottom:1, right:2, fontSize:7,
                      color:isDark?'#eeeed2':'#769656', lineHeight:1, fontWeight:600 }}>
                      {FILES[col]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {/* File labels */}
        <div style={{ display:'flex', width:'100%', maxWidth:380, paddingLeft:16 }}>
          {FILES.split('').map(f=>(
            <div key={f} style={{ flex:1, textAlign:'center', fontSize:9, color:'rgba(255,255,255,0.3)' }}>{f}</div>
          ))}
        </div>
        {/* Move log */}
        {history.length>0&&(
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontFamily:'monospace',
            textAlign:'center', maxWidth:380, padding:'0 4px', lineHeight:1.8 }}>
            {history.slice(-6).join('  ·  ')}
          </div>
        )}
      </div>
    </GameShell>
  )
}
