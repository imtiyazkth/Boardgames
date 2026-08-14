import { useState, useEffect, useRef, useCallback } from 'react'
import { ChessEngine, ChessAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const FILES = ['a','b','c','d','e','f','g','h']
const RANKS = ['8','7','6','5','4','3','2','1']

const SYM = {
  6:'♔', 5:'♕', 4:'♖', 3:'♗', 2:'♘', 1:'♙',
  '-6':'♚','-5':'♛','-4':'♜','-3':'♝','-2':'♞','-1':'♟'
}

const PIECE_NAMES = {
  1:'Pawn',2:'Knight',3:'Bishop',4:'Rook',5:'Queen',6:'King',
  '-1':'Pawn','-2':'Knight','-3':'Bishop','-4':'Rook','-5':'Queen','-6':'King'
}

function pieceOf(v) { return SYM[String(v)] || '' }
function isWhite(v) { return v > 0 }
function sqName(i) { return FILES[i%8] + RANKS[Math.floor(i/8)] }

// ─── Promotion Dialog ─────────────────────────────────────────────────────────
function PromotionDialog({ color, onChoose }) {
  const pieces = color === 'w'
    ? [{v:5,s:'♕'},{v:4,s:'♖'},{v:3,s:'♗'},{v:2,s:'♘'}]
    : [{v:-5,s:'♛'},{v:-4,s:'♜'},{v:-3,s:'♝'},{v:-2,s:'♞'}]
  return (
    <div style={{
      position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:20,
    }}>
      <div style={{
        background:'#1a1e2e',borderRadius:18,padding:20,textAlign:'center',
        border:'2px solid rgba(255,215,0,0.4)',boxShadow:'0 0 40px rgba(255,215,0,0.2)',
      }}>
        <div style={{color:'#fff',fontWeight:800,fontSize:15,marginBottom:14}}>
          👑 Promote Pawn
        </div>
        <div style={{display:'flex',gap:10}}>
          {pieces.map(p=>(
            <button key={p.v} onClick={()=>onChoose(p.v)} style={{
              width:56,height:56,borderRadius:12,fontSize:32,
              background:'rgba(255,255,255,0.1)',border:'2px solid rgba(255,255,255,0.2)',
              color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',
              justifyContent:'center',transition:'all 0.15s',
            }}>{p.s}</button>
          ))}
        </div>
        <div style={{color:'rgba(255,255,255,0.35)',fontSize:10,marginTop:10}}>
          Tap a piece to promote
        </div>
      </div>
    </div>
  )
}

// ─── Victory Modal ────────────────────────────────────────────────────────────
function VictoryModal({ state, p1, p2, scores, onRestart, onExit }) {
  const { checkmate, stalemate, gameOver, winner } = state
  const isDraw = stalemate || (!winner && gameOver)
  const winName = winner === 'w' ? p1 : p2
  return (
    <div style={{
      position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,
    }}>
      <div style={{
        background:'linear-gradient(160deg,#1a1e30,#0f1220)',
        borderRadius:24,padding:'28px 24px',width:290,textAlign:'center',
        border:`2px solid ${isDraw?'rgba(255,255,255,0.15)':'rgba(255,215,0,0.5)'}`,
        boxShadow:`0 20px 60px ${isDraw?'rgba(0,0,0,0.7)':'rgba(255,215,0,0.2)'}`,
        animation:'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{fontSize:52,marginBottom:10}}>{isDraw?'🤝':'🏆'}</div>
        <div style={{color:'#fff',fontWeight:900,fontSize:22,marginBottom:6}}>
          {isDraw ? "It's a Draw!" : `${winName} Wins!`}
        </div>
        <div style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:6}}>
          {checkmate ? 'by Checkmate ♟' : stalemate ? 'by Stalemate' : ''}
        </div>
        {/* Score row */}
        <div style={{display:'flex',gap:8,justifyContent:'center',margin:'14px 0'}}>
          {[{n:p1,s:scores.w,c:'#fff'},{n:p2,s:scores.b,c:'#90caf9'}].map((p,i)=>(
            <div key={i} style={{flex:1,padding:'8px 6px',borderRadius:12,
              background:`${p.c}15`,border:`1px solid ${p.c}30`}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,marginBottom:2}}>{p.n}</div>
              <div style={{fontSize:22,fontWeight:900,color:p.c}}>{p.s}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onExit} style={{
            flex:1,padding:'12px 0',borderRadius:12,
            border:'1px solid rgba(255,255,255,0.12)',
            background:'rgba(255,255,255,0.06)',
            color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,cursor:'pointer',
          }}>🏠 Home</button>
          <button onClick={onRestart} style={{
            flex:2,padding:'12px 0',borderRadius:12,border:'none',
            background:'linear-gradient(135deg,#ffd700,#e8860a)',
            color:'#000',fontSize:15,fontWeight:800,cursor:'pointer',
          }}>▶ Play Again</button>
        </div>
      </div>
    </div>
  )
}

// ─── Move Log ─────────────────────────────────────────────────────────────────
function MoveLog({ history }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
  }, [history])
  if (!history.length) return null
  return (
    <div ref={ref} style={{
      display:'flex',gap:4,padding:'4px 12px',overflowX:'auto',
      scrollbarWidth:'none',flexShrink:0,
    }}>
      {history.slice(-20).map((m,i,a) => {
        const moveNum = Math.floor((history.length - a.length + i) / 2) + 1
        const isWhiteMove = (history.length - a.length + i) % 2 === 0
        return (
          <span key={i} style={{
            fontSize:10,fontFamily:'monospace',whiteSpace:'nowrap',
            color: i===a.length-1 ? '#ffd700' : 'rgba(255,255,255,0.4)',
            background: i===a.length-1 ? 'rgba(255,215,0,0.1)' : 'transparent',
            padding:'2px 5px',borderRadius:5,
          }}>
            {isWhiteMove && <span style={{color:'rgba(255,255,255,0.2)',marginRight:2}}>{moveNum}.</span>}
            {m}
          </span>
        )
      })}
    </div>
  )
}

// ─── Captured Pieces bar ──────────────────────────────────────────────────────
function CapturedPieces({ captured, color }) {
  const vals = { 1:1,2:3,3:3,4:5,5:9 }
  const pieces = captured.filter(p => color==='w' ? p>0 : p<0)
  const score = pieces.reduce((s,p) => s + (vals[Math.abs(p)]||0), 0)
  if (!pieces.length) return null
  return (
    <div style={{display:'flex',alignItems:'center',gap:2,flexWrap:'wrap',maxWidth:160}}>
      {pieces.sort((a,b)=>Math.abs(b)-Math.abs(a)).map((p,i)=>(
        <span key={i} style={{fontSize:13,opacity:0.7}}>{pieceOf(p)}</span>
      ))}
      {score > 0 && <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginLeft:2}}>+{score}</span>}
    </div>
  )
}

// ─── Main Chess Game ──────────────────────────────────────────────────────────
export default function ChessGame({ mode='solo', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine]  = useState(() => new ChessEngine())
  const [ai]      = useState(() => new ChessAI(difficulty))
  const [state,   setState]    = useState(null)
  const [sel,     setSel]      = useState(null)       // selected square index
  const [legalTo, setLegalTo]  = useState([])         // legal destination indices
  const [lastMove,setLastMove] = useState(null)       // {from,to}
  const [history, setHistory]  = useState([])         // move notation strings
  const [captured,setCaptured] = useState([])         // captured piece values
  const [thinking,setThinking] = useState(false)
  const [scores,  setScores]   = useState({w:0,b:0})
  const [elapsed, setElapsed]  = useState(0)
  const [promoPending, setPromoPending] = useState(null) // pending promotion move
  const timerRef  = useRef(null)
  const aiRef     = useRef(false)

  const p1 = playerNames[0] || 'White'
  const p2 = mode==='solo' ? 'AI' : (playerNames[1] || 'Black')

  const isAITurn = useCallback(st => {
    if (!st || st.gameOver) return false
    if (mode === 'local2p') return false
    return st.currentPlayer === 'b'
  }, [mode])

  // ── Start game ──────────────────────────────────────────────────────────────
  function startGame() {
    engine.initializeGame()
    setState(engine.cloneState())
    setSel(null); setLegalTo([]); setLastMove(null)
    setHistory([]); setCaptured([]); setThinking(false)
    setElapsed(0)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(e => e+1), 1000)
    play('game_start')
  }

  useEffect(() => { startGame(); return () => clearInterval(timerRef.current) }, [])
  useEffect(() => { if (state?.gameOver) clearInterval(timerRef.current) }, [state?.gameOver])

  // ── AI turn ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state || !isAITurn(state) || aiRef.current) return
    aiRef.current = true
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) applyMove(move, true)
      setThinking(false)
      aiRef.current = false
    }, 450)
    return () => clearTimeout(t)
  }, [state])

  // ── Apply move ──────────────────────────────────────────────────────────────
  function applyMove(move, fromAI=false) {
    const prevBoard = [...engine.state.board]
    const res = engine.applyMove(move)
    if (!res.success) return false

    const ns = engine.cloneState()
    const capturedPiece = prevBoard[move.to]
    const movedPiece    = prevBoard[move.from]
    const notation = buildNotation(move, movedPiece, capturedPiece, ns)

    setState(ns)
    setSel(null); setLegalTo([])
    setLastMove({ from: move.from, to: move.to })
    setHistory(h => [...h, notation])
    if (capturedPiece !== 0) setCaptured(c => [...c, capturedPiece])

    // sounds & vibration
    if (ns.checkmate)        { play('chess_checkmate'); vibrate([60,30,80]) }
    else if (ns.stalemate)   { play('game_draw') }
    else if (ns.check)       { play('chess_check'); vibrate([20]) }
    else if (move.castling)  { play('chess_castle') }
    else if (move.promotion) { play('chess_promote'); vibrate([15]) }
    else if (capturedPiece)  { play('chess_capture'); vibrate([12]) }
    else                     { play('chess_move'); vibrate([5]) }

    if (ns.gameOver) {
      const winner = ns.winner
      if (winner) setScores(s => ({ ...s, [winner]: s[winner]+1 }))
    }
    return true
  }

  function buildNotation(move, piece, captured, ns) {
    const pieceSyms = {1:'',2:'N',3:'B',4:'R',5:'Q',6:'K',
                      '-1':'','-2':'N','-3':'B','-4':'R','-5':'Q','-6':'K'}
    const p = pieceSyms[String(piece)] || ''
    const cap = captured ? '×' : ''
    const to  = sqName(move.to)
    const suf = ns.checkmate ? '#' : ns.check ? '+' : ''
    if (move.castling === 'K') return 'O-O' + suf
    if (move.castling === 'Q') return 'O-O-O' + suf
    if (move.promotion) return to + '=' + ({5:'Q',4:'R',3:'B',2:'N'}[Math.abs(move.promotion)]||'Q') + suf
    return p + sqName(move.from) + cap + to + suf
  }

  // ── Square click ────────────────────────────────────────────────────────────
  function handleSquare(idx) {
    if (!state || state.gameOver || isAITurn(state) || thinking || promoPending) return

    const piece   = state.board[idx]
    const player  = state.currentPlayer
    const owned   = (player==='w' && piece>0) || (player==='b' && piece<0 && piece!==0)
    const allMoves = engine.getLegalMoves()

    if (legalTo.includes(idx)) {
      // Execute move
      const move = allMoves.find(m => m.from===sel && m.to===idx)
      if (!move) { deselect(); return }

      // Check if promotion needed
      const isPawn = Math.abs(state.board[sel]) === 1
      const isPromRow = (player==='w' && Math.floor(idx/8)===0) || (player==='b' && Math.floor(idx/8)===7)
      if (isPawn && isPromRow) {
        setPromoPending(move)
        return
      }

      play('chess_move'); vibrate([6])
      applyMove(move)
    } else if (owned) {
      // Select piece
      if (sel === idx) { deselect(); return }
      play('chess_select')
      setSel(idx)
      setLegalTo(allMoves.filter(m => m.from===idx).map(m => m.to))
    } else {
      deselect()
    }
  }

  function deselect() { setSel(null); setLegalTo([]) }

  function handlePromotion(pieceVal) {
    if (!promoPending) return
    const move = { ...promoPending, promotion: pieceVal }
    applyMove(move)
    setPromoPending(null)
  }

  function handleUndo() {
    if (thinking) return
    play('ui_back')
    engine.undoMove()
    if (mode==='solo') engine.undoMove()
    const ns = engine.cloneState()
    setState(ns)
    setSel(null); setLegalTo([]); setLastMove(null)
    setHistory(h => h.slice(0, Math.max(0, h.length-(mode==='solo'?2:1))))
  }

  // ─── Timer ─────────────────────────────────────────────────────────────────
  const mm = String(Math.floor(elapsed/60)).padStart(2,'0')
  const ss = String(elapsed%60).padStart(2,'0')

  if (!state) return null
  const { board, currentPlayer, gameOver, check, checkmate, stalemate } = state
  const canUndo = !thinking && (engine.history?.length ?? 0) > 0

  // Status label
  let statusText = '', statusColor = '#fff'
  if (gameOver) {
    statusText = checkmate ? `Checkmate — ${currentPlayer==='w'?p2:p1} wins!`
               : stalemate ? 'Stalemate — Draw'
               : 'Game over'
    statusColor = '#ffd700'
  } else if (check) {
    statusText = `⚠️ ${currentPlayer==='w'?p1:p2} is in Check!`
    statusColor = '#e94560'
  } else if (thinking) {
    statusText = '🤖 AI thinking…'
    statusColor = 'rgba(255,255,255,0.4)'
  } else {
    statusText = `${currentPlayer==='w'?p1:p2}'s turn`
    statusColor = currentPlayer==='w' ? '#fff' : '#90caf9'
  }

  // Captured pieces split by side
  const captW = captured.filter(p => p < 0)  // black pieces captured by white
  const captB = captured.filter(p => p > 0)  // white pieces captured by black

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background:'linear-gradient(160deg,#1a1f35 0%,#0a0b14 40%,#0d1020 100%)',
      userSelect:'none',overflow:'hidden',position:'relative',
    }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex',alignItems:'center',gap:10,
        padding:'10px 14px 6px',flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(0,0,0,0.25)',
      }}>
        <button onClick={() => { play('ui_back'); onExit() }} style={{
          background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
          color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
        }}>←</button>
        <span style={{fontSize:22,filter:'drop-shadow(0 0 8px rgba(255,215,0,0.5))'}}>♟</span>
        <span style={{color:'#fff',fontWeight:800,fontSize:17,flex:1}}>Chess</span>
        {/* Timer */}
        <div style={{
          fontFamily:'monospace',fontSize:13,fontWeight:700,
          color: elapsed>300 ? '#e94560' : 'rgba(255,255,255,0.45)',
          padding:'3px 9px',borderRadius:8,
          background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.06)',
        }}>{mm}:{ss}</div>
        {/* Mode badge */}
        <div style={{
          fontSize:9,color:'rgba(255,255,255,0.25)',fontWeight:700,
          letterSpacing:0.5,textTransform:'uppercase',
        }}>{mode==='solo'?`vs AI·${difficulty}`:'2P'}</div>
      </div>

      {/* ── Player rows ── */}
      {/* Black player (top) */}
      <div style={{
        display:'flex',alignItems:'center',gap:8,
        padding:'6px 14px 4px',flexShrink:0,
        background: currentPlayer==='b'&&!gameOver ? 'rgba(144,202,249,0.06)' : 'transparent',
        borderBottom:'1px solid rgba(255,255,255,0.04)',
        transition:'background 0.3s',
      }}>
        <div style={{
          width:28,height:28,borderRadius:8,
          background: currentPlayer==='b'&&!gameOver ? 'rgba(144,202,249,0.2)' : 'rgba(255,255,255,0.06)',
          border:`1.5px solid ${currentPlayer==='b'&&!gameOver?'#90caf9':'rgba(255,255,255,0.1)'}`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,
          boxShadow: currentPlayer==='b'&&!gameOver ? '0 0 12px rgba(144,202,249,0.4)' : 'none',
        }}>♚</div>
        <div style={{flex:1}}>
          <div style={{color:currentPlayer==='b'&&!gameOver?'#90caf9':'rgba(255,255,255,0.5)',
            fontWeight:700,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {mode==='solo'?'🤖 ':''}{p2}
            {currentPlayer==='b'&&!gameOver&&<span style={{
              width:6,height:6,borderRadius:'50%',background:'#90caf9',
              display:'inline-block',marginLeft:6,
              animation:'glowPulse 0.8s ease-in-out infinite',
            }}/>}
          </div>
          <CapturedPieces captured={captB} color='b'/>
        </div>
        <div style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,0.3)'}}>
          {scores.b}
        </div>
      </div>

      {/* ── Status banner ── */}
      <div style={{
        height:28,display:'flex',alignItems:'center',justifyContent:'center',
        flexShrink:0,
      }}>
        <div style={{
          fontSize:12,fontWeight:700,color:statusColor,
          animation:'slideDown 0.2s ease',
          padding:'2px 10px',borderRadius:20,
          background: check&&!gameOver ? 'rgba(233,69,96,0.12)' : 'transparent',
        }}>{statusText}</div>
      </div>

      {/* ── Chess Board ── */}
      <div style={{
        flex:1,display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        padding:'4px 8px',minHeight:0,position:'relative',
      }}>
        <div style={{position:'relative',width:'min(90vw,420px)'}}>
          {/* Rank labels left */}
          <div style={{
            position:'absolute',left:-14,top:0,bottom:0,
            display:'flex',flexDirection:'column',justifyContent:'space-around',
          }}>
            {RANKS.map(r=>(
              <div key={r} style={{fontSize:9,color:'rgba(255,255,255,0.3)',
                fontFamily:'monospace',lineHeight:1,width:12,textAlign:'center'}}>{r}</div>
            ))}
          </div>

          {/* Board grid */}
          <div style={{
            display:'grid',gridTemplateColumns:'repeat(8,1fr)',
            aspectRatio:'1',border:'2px solid rgba(255,255,255,0.12)',
            borderRadius:8,overflow:'hidden',boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
          }}>
            {Array.from({length:64},(_,idx)=>{
              const row=Math.floor(idx/8), col=idx%8
              const isDark=(row+col)%2===1
              const piece=board[idx]
              const isSel=sel===idx
              const isTo=legalTo.includes(idx)
              const isFrom=lastMove?.from===idx
              const isToLast=lastMove?.to===idx
              const hasEnemy=isTo&&piece!==0
              const pWhite=piece!==0&&isWhite(piece)
              const isKingCheck=check&&!gameOver&&((currentPlayer==='w'&&piece===6)||(currentPlayer==='b'&&piece===-6))

              const bg = isSel
                ? 'rgba(255,215,0,0.55)'
                : isKingCheck
                ? 'rgba(233,69,96,0.65)'
                : (isFrom||isToLast)
                ? (isDark ? 'rgba(103,178,139,0.65)' : 'rgba(186,214,177,0.8)')
                : isDark ? '#769656' : '#eeeed2'

              return (
                <div key={idx} onClick={()=>handleSquare(idx)} style={{
                  aspectRatio:'1',display:'flex',alignItems:'center',
                  justifyContent:'center',background:bg,
                  cursor:'pointer',position:'relative',transition:'background 0.08s',
                }}>
                  {/* Legal move dot */}
                  {isTo && !hasEnemy && (
                    <div style={{
                      width:'34%',height:'34%',borderRadius:'50%',
                      background:'rgba(0,0,0,0.22)',pointerEvents:'none',
                    }}/>
                  )}
                  {/* Capture ring */}
                  {hasEnemy && (
                    <div style={{
                      position:'absolute',inset:0,
                      border:'3px solid rgba(0,0,0,0.3)',
                      borderRadius:2,pointerEvents:'none',boxSizing:'border-box',
                    }}/>
                  )}
                  {/* Piece */}
                  {piece!==0 && (
                    <span style={{
                      fontSize:'clamp(18px,5vw,36px)',lineHeight:1,
                      userSelect:'none',position:'relative',zIndex:1,
                      color:pWhite?'#fff':'#111',
                      textShadow:pWhite
                        ?'0 1px 4px rgba(0,0,0,0.95),0 0 8px rgba(0,0,0,0.5)'
                        :'0 1px 2px rgba(255,255,255,0.2)',
                      animation: isSel ? 'none' : undefined,
                      transform: isSel ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.1s',
                    }}>{pieceOf(piece)}</span>
                  )}
                  {/* File label bottom row */}
                  {row===7&&(
                    <span style={{
                      position:'absolute',bottom:1,right:2,fontSize:7,
                      color:isDark?'#eeeed2':'#769656',lineHeight:1,fontWeight:600,
                      fontFamily:'monospace',
                    }}>{FILES[col]}</span>
                  )}
                  {/* Rank label left col */}
                  {col===0&&(
                    <span style={{
                      position:'absolute',top:1,left:2,fontSize:7,
                      color:isDark?'#eeeed2':'#769656',lineHeight:1,fontWeight:600,
                      fontFamily:'monospace',
                    }}>{RANKS[row]}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Promotion dialog overlay */}
          {promoPending && (
            <PromotionDialog
              color={state.currentPlayer}
              onChoose={handlePromotion}
            />
          )}
        </div>
      </div>

      {/* ── Move log ── */}
      <MoveLog history={history}/>

      {/* ── White player row ── */}
      <div style={{
        display:'flex',alignItems:'center',gap:8,
        padding:'4px 14px 6px',flexShrink:0,
        background: currentPlayer==='w'&&!gameOver ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderTop:'1px solid rgba(255,255,255,0.04)',
        transition:'background 0.3s',
      }}>
        <div style={{
          width:28,height:28,borderRadius:8,
          background: currentPlayer==='w'&&!gameOver ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
          border:`1.5px solid ${currentPlayer==='w'&&!gameOver?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.1)'}`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,
          boxShadow: currentPlayer==='w'&&!gameOver ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
        }}>♔</div>
        <div style={{flex:1}}>
          <div style={{color:currentPlayer==='w'&&!gameOver?'#fff':'rgba(255,255,255,0.5)',
            fontWeight:700,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {p1}
            {currentPlayer==='w'&&!gameOver&&<span style={{
              width:6,height:6,borderRadius:'50%',background:'#fff',
              display:'inline-block',marginLeft:6,
              animation:'glowPulse 0.8s ease-in-out infinite',
            }}/>}
          </div>
          <CapturedPieces captured={captW} color='w'/>
        </div>
        <div style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,0.3)'}}>
          {scores.w}
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div style={{
        display:'flex',gap:8,padding:'8px 14px 12px',
        flexShrink:0,borderTop:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(0,0,0,0.2)',
      }}>
        <button onClick={handleUndo} disabled={!canUndo} style={{
          flex:1,padding:'11px 0',borderRadius:12,
          border:'1px solid rgba(255,255,255,0.1)',
          background:canUndo?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.03)',
          color:canUndo?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.2)',
          fontSize:13,fontWeight:700,cursor:canUndo?'pointer':'default',
          fontFamily:'inherit',
        }}>↩ Undo</button>
        <button onClick={startGame} style={{
          flex:2,padding:'11px 0',borderRadius:12,border:'none',
          background:'linear-gradient(135deg,#607d8b,#455a64)',
          color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',
          boxShadow:'0 3px 16px rgba(96,125,139,0.4)',fontFamily:'inherit',
        }}>↺ New Game</button>
      </div>

      {/* ── Victory Modal ── */}
      {gameOver && (
        <VictoryModal
          state={state} p1={p1} p2={p2} scores={scores}
          onRestart={startGame} onExit={onExit}
        />
      )}

      <style>{`
        @keyframes glowPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}
