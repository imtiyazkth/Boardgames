import { useState, useEffect, useRef, useCallback } from 'react'
import { ChessEngine, ChessAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import { SaveSystem } from '../../core/SaveSystem.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const FILES = ['a','b','c','d','e','f','g','h']
const RANKS = ['8','7','6','5','4','3','2','1']
const SYM   = {6:'♔',5:'♕',4:'♖',3:'♗',2:'♘',1:'♙','-6':'♚','-5':'♛','-4':'♜','-3':'♝','-2':'♞','-1':'♟'}
const SHORT  = {1:'',2:'N',3:'B',4:'R',5:'Q',6:'K','-1':'','-2':'N','-3':'B','-4':'R','-5':'Q','-6':'K'}

const pOf   = v => SYM[String(v)] || ''
const isW   = v => v > 0
const sqN   = i => FILES[i%8] + RANKS[Math.floor(i/8)]

// ─── Mini Learn data ──────────────────────────────────────────────────────────
const LESSONS = [
  { id:'board',    title:'The Board',       text:'64 squares, 8×8. White goes bottom-right. Ranks are rows (1-8), files are columns (a-h). White always moves first.' },
  { id:'pawn',     title:'Pawn',            text:'Moves 1 square forward (2 on first move). Captures diagonally. Reaches last rank → promote to any piece. Cannot move backward.' },
  { id:'knight',   title:'Knight',          text:'Moves in an L-shape: 2+1 squares. The ONLY piece that jumps over others. Two Knights of the same side on f3/c3 control the center.' },
  { id:'bishop',   title:'Bishop',          text:'Moves diagonally any number of squares. Stays on starting color forever. Two bishops = bishop pair bonus.' },
  { id:'rook',     title:'Rook',            text:'Moves horizontally/vertically any number of squares. Very powerful on open files and 7th rank. Part of castling.' },
  { id:'queen',    title:'Queen',           text:'Most powerful piece. Moves like Rook + Bishop combined. Worth ~9 pawns. Develop it late — it gets chased easily.' },
  { id:'king',     title:'King',            text:'Moves 1 square any direction. Must never be in check. Castling = move 2 squares toward Rook, Rook jumps over. Castle early!' },
  { id:'check',    title:'Check & Mate',    text:'CHECK = King is attacked, must escape. 3 ways out: move King, block, capture attacker. CHECKMATE = no escape → game over.' },
  { id:'stalemate',title:'Stalemate',       text:'No legal moves but NOT in check = draw. Used as a defensive trick when losing. Watch out — stalemate loses the win!' },
  { id:'castle',   title:'Castling Rules',  text:'Cannot castle if: King is in check, King passes through attacked square, King lands in check, King/Rook already moved, pieces between them.' },
  { id:'enpassant',title:'En Passant',      text:'If opponent moves pawn 2 squares beside yours, you can capture it diagonally as if it moved 1 square. Must do it immediately next move only.' },
  { id:'promotion',title:'Promotion',       text:'Pawn reaches last rank → MUST promote. Almost always choose Queen. But sometimes Knight is better (fork threat) — called underpromotion.' },
  { id:'fork',     title:'Fork Tactic',     text:'One piece attacks two pieces at once. Knight forks are hardest to see. Always check for forks before moving — scan for dual attacks.' },
  { id:'pin',      title:'Pin Tactic',      text:'Piece cannot move because it would expose a more valuable piece. Absolute pin (against King) = cannot move at all legally.' },
  { id:'skewer',   title:'Skewer Tactic',   text:'Opposite of pin. Attack valuable piece, it moves, capture the piece behind. Common with Bishops/Rooks against King.' },
  { id:'opening',  title:'Opening Principles', text:'3 key ideas: 1) Control center (e4,d4,e5,d5). 2) Develop pieces (Knights before Bishops). 3) Castle early. Never move same piece twice in opening.' },
]

const OPENINGS = [
  { id:'italian',  name:'Italian Game',       moves:['e4','e5','Nf3','Nc6','Bc4'], idea:'Control center, aim at f7 weakness. Development focused.' },
  { id:'ruylopez', name:'Ruy López',           moves:['e4','e5','Nf3','Nc6','Bb5'], idea:'Long-term pressure on e5. Strategic masterpiece of White.' },
  { id:'qgambit',  name:"Queen's Gambit",      moves:['d4','d5','c4'],             idea:'Offer c4 pawn for center control. Accept or decline.' },
  { id:'sicilian', name:'Sicilian Defense',    moves:['e4','c5'],                  idea:'Black fights for center asymmetrically. Most combative defense.' },
  { id:'french',   name:'French Defense',      moves:['e4','e6'],                  idea:'Solid. Black plays d5 next, creates pawn chain, attacks later.' },
  { id:'caro',     name:'Caro-Kann',           moves:['e4','c6'],                  idea:'Very solid for Black. d5 next. Less cramped than French.' },
]

// ─── Sub-screens ──────────────────────────────────────────────────────────────
function LearnScreen({ onBack }) {
  const [idx, setIdx] = useState(0)
  const done = SaveSystem.load('chess_lessons', []) || []
  const l = LESSONS[idx]

  function markDone() {
    if (!done.includes(l.id)) {
      const nd = [...done, l.id]
      SaveSystem.save('chess_lessons', nd)
    }
    if (idx < LESSONS.length-1) setIdx(idx+1)
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <span style={{color:'#fff',fontWeight:800,fontSize:16,flex:1}}>📚 Learn Chess</span>
        <span style={{color:'rgba(255,255,255,0.3)',fontSize:11}}>{idx+1}/{LESSONS.length}</span>
      </div>
      {/* Progress */}
      <div style={{height:3,background:'rgba(255,255,255,0.08)',flexShrink:0}}>
        <div style={{height:'100%',background:'#4caf50',width:`${((idx+1)/LESSONS.length)*100}%`,transition:'width 0.3s'}}/>
      </div>
      {/* Lesson list on left, content on right - but mobile: list then content */}
      <div style={{display:'flex',gap:0,flex:1,overflow:'hidden'}}>
        {/* Lesson list */}
        <div style={{width:110,borderRight:'1px solid rgba(255,255,255,0.06)',overflowY:'auto',flexShrink:0}}>
          {LESSONS.map((lesson,i)=>(
            <button key={lesson.id} onClick={()=>setIdx(i)} style={{
              width:'100%',padding:'9px 8px',border:'none',textAlign:'left',
              background: i===idx?'rgba(99,102,241,0.2)':done.includes(lesson.id)?'rgba(76,175,80,0.08)':'transparent',
              borderLeft:`3px solid ${i===idx?'#6366f1':done.includes(lesson.id)?'#4caf50':'transparent'}`,
              color:i===idx?'#fff':done.includes(lesson.id)?'#a5d6a7':'rgba(255,255,255,0.45)',
              fontSize:10,fontWeight:i===idx?700:500,cursor:'pointer',fontFamily:'inherit',lineHeight:1.3,
            }}>
              {done.includes(lesson.id)&&'✓ '}{lesson.title}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:14}}>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>{l.title}</div>
          <div style={{
            background:'rgba(255,255,255,0.05)',borderRadius:14,padding:16,
            border:'1px solid rgba(255,255,255,0.08)',
            color:'rgba(255,255,255,0.78)',fontSize:14,lineHeight:1.7,
          }}>{l.text}</div>
          <button onClick={markDone} style={{
            padding:'13px 0',borderRadius:12,border:'none',
            background:'linear-gradient(135deg,#4caf50,#388e3c)',
            color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
          }}>
            {idx<LESSONS.length-1 ? '✓ Got it — Next →' : '🎉 All lessons complete!'}
          </button>
        </div>
      </div>
    </div>
  )
}

function OpeningScreen({ onBack }) {
  const [sel, setSel] = useState(null)
  const [engine] = useState(()=>new ChessEngine())
  const [bState, setBState] = useState(null)
  const [step, setStep] = useState(0)
  const [sqSel, setSqSel] = useState(null)
  const [legal, setLegal] = useState([])
  const [msg, setMsg] = useState('')

  function startOpening(op) {
    setSel(op); engine.initializeGame(); setBState(engine.cloneState())
    setStep(0); setSqSel(null); setLegal([]); setMsg('Play: '+op.moves[0])
  }

  function handleSq(idx) {
    if (!bState||!sel||step>=sel.moves.length) return
    const {board,currentPlayer}=bState
    const piece=board[idx], sign=currentPlayer==='w'?1:-1
    const owned=piece&&Math.sign(piece)===sign

    if (legal.includes(idx)&&sqSel!==null) {
      const move=engine.getLegalMoves().find(m=>m.from===sqSel&&m.to===idx)
      if (!move){setSqSel(null);setLegal([]);return}
      engine.applyMove(move)
      const ns=engine.cloneState()
      setBState(ns);setSqSel(null);setLegal([])
      const ns2=step+1
      setStep(ns2)
      if(ns2>=sel.moves.length) setMsg('✓ Opening complete! '+sel.idea)
      else setMsg('Play: '+sel.moves[ns2])
    } else if (owned) {
      setSqSel(idx)
      setLegal(engine.getLegalMoves().filter(m=>m.from===idx).map(m=>m.to))
    } else { setSqSel(null);setLegal([]) }
  }

  if (!sel) return (
    <div style={S.screen}>
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <span style={{color:'#fff',fontWeight:800,fontSize:16}}>📖 Openings</span>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:12}}>
        {OPENINGS.map(op=>(
          <button key={op.id} onClick={()=>startOpening(op)} style={{
            width:'100%',padding:'13px 14px',marginBottom:8,borderRadius:14,
            background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',
            cursor:'pointer',textAlign:'left',fontFamily:'inherit',
          }}>
            <div style={{color:'#fff',fontWeight:700,fontSize:14,marginBottom:3}}>{op.name}</div>
            <div style={{color:'rgba(255,255,255,0.35)',fontSize:11,marginBottom:5}}>
              {op.moves.join(' ')}
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>{op.idea}</div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button onClick={()=>setSel(null)} style={S.backBtn}>←</button>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:800,fontSize:15}}>{sel.name}</div>
          <div style={{color:'rgba(255,255,255,0.35)',fontSize:11}}>Step {step+1}/{sel.moves.length+1}</div>
        </div>
        <button onClick={()=>startOpening(sel)} style={{
          padding:'6px 12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.15)',
          background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.6)',
          fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>↺ Restart</button>
      </div>
      <div style={{padding:'6px 12px',background:'rgba(255,215,0,0.08)',
        borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
        <div style={{color:'#ffd700',fontSize:13,fontWeight:700}}>{msg}</div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:8,minHeight:0}}>
        {bState && <BoardGrid board={bState.board} sel={sqSel} legalTo={legal}
          currentPlayer={bState.currentPlayer} check={false} gameOver={false}
          onSquare={handleSq} lastMove={null}/>}
      </div>
    </div>
  )
}

// ─── Board Grid (pure component, no hooks) ────────────────────────────────────
function BoardGrid({ board, sel, legalTo, lastMove, check, currentPlayer, gameOver, onSquare }) {
  return (
    <div style={{
      display:'grid',gridTemplateColumns:'repeat(8,1fr)',
      aspectRatio:'1',width:'min(88vw,390px)',
      border:'2px solid rgba(255,255,255,0.15)',borderRadius:8,overflow:'hidden',
      boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
    }}>
      {Array.from({length:64},(_,idx)=>{
        const row=Math.floor(idx/8),col=idx%8
        const dark=(row+col)%2===1
        const piece=board[idx]
        const isSel=sel===idx
        const isTo=(legalTo||[]).includes(idx)
        const isFrom=lastMove?.from===idx
        const isToL=lastMove?.to===idx
        const hasEnemy=isTo&&piece!==0
        const pW=piece!==0&&isW(piece)
        const isChk=check&&!gameOver&&((currentPlayer==='w'&&piece===6)||(currentPlayer==='b'&&piece===-6))

        const bg=isSel?'rgba(255,215,0,0.55)':isChk?'rgba(233,69,96,0.65)'
          :(isFrom||isToL)?(dark?'rgba(103,178,139,0.65)':'rgba(186,214,177,0.8)')
          :dark?'#769656':'#eeeed2'

        return (
          <div key={idx} onClick={()=>onSquare?.(idx)} style={{
            aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',
            background:bg,cursor:'pointer',position:'relative',transition:'background 0.08s',
          }}>
            {isTo&&!hasEnemy&&<div style={{width:'34%',height:'34%',borderRadius:'50%',
              background:'rgba(0,0,0,0.22)',pointerEvents:'none'}}/>}
            {hasEnemy&&<div style={{position:'absolute',inset:0,border:'3px solid rgba(0,0,0,0.3)',
              borderRadius:2,pointerEvents:'none',boxSizing:'border-box'}}/>}
            {piece!==0&&<span style={{
              fontSize:'clamp(18px,5vw,34px)',lineHeight:1,userSelect:'none',
              color:pW?'#fff':'#111',
              textShadow:pW?'0 1px 4px rgba(0,0,0,0.95)':'0 1px 2px rgba(255,255,255,0.2)',
              transform:isSel?'scale(1.18)':'scale(1)',transition:'transform 0.1s',
            }}>{pOf(piece)}</span>}
            {row===7&&<span style={{position:'absolute',bottom:1,right:2,fontSize:7,
              color:dark?'#eeeed2':'#769656',lineHeight:1,fontWeight:600,fontFamily:'monospace'}}>
              {FILES[col]}</span>}
            {col===0&&<span style={{position:'absolute',top:1,left:2,fontSize:7,
              color:dark?'#eeeed2':'#769656',lineHeight:1,fontWeight:600,fontFamily:'monospace'}}>
              {RANKS[row]}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Promotion Dialog ─────────────────────────────────────────────────────────
function PromoDlg({ color, onChoose }) {
  const opts=color==='w'
    ?[{v:5,s:'♕'},{v:4,s:'♖'},{v:3,s:'♗'},{v:2,s:'♘'}]
    :[{v:-5,s:'♛'},{v:-4,s:'♜'},{v:-3,s:'♝'},{v:-2,s:'♞'}]
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.9)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:30}}>
      <div style={{background:'#1a1e2e',borderRadius:18,padding:20,textAlign:'center',
        border:'2px solid rgba(255,215,0,0.5)',animation:'popIn 0.3s ease'}}>
        <div style={{color:'rgba(255,255,255,0.5)',fontSize:11,letterSpacing:1,marginBottom:12}}>
          PROMOTE PAWN — CHOOSE A PIECE
        </div>
        <div style={{display:'flex',gap:10}}>
          {opts.map(p=>(
            <button key={p.v} onClick={()=>onChoose(p.v)} style={{
              width:56,height:56,borderRadius:12,fontSize:32,
              background:'rgba(255,255,255,0.1)',border:'2px solid rgba(255,255,255,0.25)',
              color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',
              justifyContent:'center',transition:'all 0.12s',
            }}>{p.s}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Game Over Banner ─────────────────────────────────────────────────────────
function GameOverBanner({ state, p1, p2, scores, onRestart, onExit }) {
  const {checkmate,stalemate,winner,drawReason}=state
  const isDraw=!winner
  const winName=winner==='w'?p1:p2
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
      <div style={{
        background:'linear-gradient(160deg,#1a1e30,#0f1220)',
        borderRadius:22,padding:'24px 20px',width:'100%',maxWidth:300,textAlign:'center',
        border:`2px solid ${isDraw?'rgba(255,255,255,0.12)':'rgba(255,215,0,0.5)'}`,
        animation:'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{fontSize:44,marginBottom:8}}>{isDraw?'🤝':'🏆'}</div>
        <div style={{color:'#fff',fontWeight:900,fontSize:20,marginBottom:4}}>
          {isDraw?'Draw!':winName+' Wins!'}
        </div>
        <div style={{color:'rgba(255,255,255,0.4)',fontSize:12,marginBottom:14}}>
          {checkmate?'by Checkmate ♟':stalemate?'Stalemate':drawReason||''}
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:14}}>
          {[{n:p1,s:scores.w,c:'#fff'},{n:p2,s:scores.b,c:'#90caf9'}].map((p,i)=>(
            <div key={i} style={{flex:1,padding:'7px 4px',borderRadius:10,
              background:`${p.c}10`,border:`1px solid ${p.c}20`}}>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:700,marginBottom:2,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.n}</div>
              <div style={{fontSize:20,fontWeight:900,color:p.c}}>{p.s}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onExit} style={{flex:1,padding:'11px 0',borderRadius:11,
            border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',
            color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
            🏠 Home
          </button>
          <button onClick={onRestart} style={{flex:2,padding:'11px 0',borderRadius:11,border:'none',
            background:'linear-gradient(135deg,#ffd700,#e8860a)',
            color:'#000',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
            ▶ Play Again
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
  screen: {display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'},
  header: {display:'flex',alignItems:'center',gap:10,padding:'11px 14px',
    borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(0,0,0,0.2)'},
  backBtn: {background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
    color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,cursor:'pointer',
    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:'inherit'},
}

// ─── MAIN ChessGame ───────────────────────────────────────────────────────────
export default function ChessGame({ mode='solo', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('play')   // 'play' | 'learn' | 'openings'

  // ── Game state ────────────────────────────────────────────────────────────
  const [playMode,  setPlayMode]  = useState(mode)
  const [engine]  = useState(() => new ChessEngine())
  const [ai]      = useState(() => new ChessAI(difficulty))
  const [gstate,  setGstate]   = useState(null)   // game state
  const [sel,     setSel]      = useState(null)
  const [legalTo, setLegalTo]  = useState([])
  const [lastMove,setLastMove] = useState(null)
  const [history, setHistory]  = useState([])
  const [captured,setCaptured] = useState([])
  const [thinking,setThinking] = useState(false)
  const [scores,  setScores]   = useState({w:0,b:0})
  const [elapsed, setElapsed]  = useState(0)
  const [promo,   setPromo]    = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const timerRef = useRef(null)
  const aiBusy   = useRef(false)

  const p1 = playerNames[0] || 'White'
  const p2 = playMode==='solo' ? `AI·${difficulty}` : (playerNames[1] || 'Black')

  const isAI = useCallback(st => {
    if (!st || st.gameOver) return false
    if (playMode==='local2p') return false
    if (playMode==='aiVsAi')  return true
    return st.currentPlayer === 'b'
  }, [playMode])

  // ── Init ──────────────────────────────────────────────────────────────────
  function newGame(pm) {
    pm = pm || playMode
    setPlayMode(pm)
    engine.initializeGame()
    const ns = engine.cloneState()
    setGstate(ns)
    setSel(null); setLegalTo([]); setLastMove(null)
    setHistory([]); setCaptured([])
    setThinking(false); aiBusy.current = false
    setElapsed(0); setPromo(null); setStatusMsg('')
    clearInterval(timerRef.current)
    timerRef.current = setInterval(()=>setElapsed(e=>e+1), 1000)
    play('game_start')
  }

  useEffect(() => {
    newGame(mode)
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => { if (gstate?.gameOver) clearInterval(timerRef.current) }, [gstate?.gameOver])

  // ── AI turn ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gstate || !isAI(gstate) || aiBusy.current || tab!=='play') return
    aiBusy.current = true
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) doApply(move)
      setThinking(false)
      aiBusy.current = false
    }, playMode==='aiVsAi' ? 300 : 500)
    return () => clearTimeout(t)
  }, [gstate, tab])

  // ── Apply move ────────────────────────────────────────────────────────────
  function doApply(move) {
    const prevBoard = [...engine.state.board]
    const res = engine.applyMove(move)
    if (!res.success) return
    const ns = engine.cloneState()
    const cap = prevBoard[move.to]
    const piec = prevBoard[move.from]

    // Build notation
    const ps = SHORT[String(piec)]||''
    const cx = cap ? sqN(move.from)+'×' : ''
    const to = sqN(move.to)
    const sf = ns.checkmate?'#':ns.check?'+':''
    let note
    if (move.castling==='K')      note='O-O'+sf
    else if (move.castling==='Q') note='O-O-O'+sf
    else if (move.promotion)      note=to+'='+(SHORT[String(move.promotion)]||'Q')+sf
    else                          note=ps+cx+to+sf

    setGstate(ns)
    setLastMove({from:move.from,to:move.to})
    setHistory(h=>[...h,note])
    if (cap) setCaptured(c=>[...c,cap])

    // Sound + vibration
    if (ns.checkmate)       { play('chess_checkmate'); vibrate([60,30,80]); setScores(s=>({...s,[ns.winner]:s[ns.winner]+1})) }
    else if (ns.gameOver)   { play('game_draw') }
    else if (ns.check)      { play('chess_check'); vibrate([20]) }
    else if (move.castling) { play('chess_castle') }
    else if (move.promotion){ play('chess_promote'); vibrate([15]) }
    else if (cap)           { play('chess_capture'); vibrate([12]) }
    else                    { play('chess_move'); vibrate([5]) }

    // Save stats
    if (ns.gameOver) {
      const old = SaveSystem.load('chess_stats', {played:0,wins:0,losses:0,draws:0})
      SaveSystem.save('chess_stats', {
        ...old, played:old.played+1,
        wins:   ns.winner==='w' ? old.wins+1   : old.wins,
        losses: ns.winner==='b' ? old.losses+1 : old.losses,
        draws:  !ns.winner      ? old.draws+1  : old.draws,
      })
    }
  }

  // ── Square click ──────────────────────────────────────────────────────────
  function handleSquare(idx) {
    if (!gstate) return
    if (gstate.gameOver) return
    if (isAI(gstate)) return
    if (thinking) return
    if (promo) return

    const { board, currentPlayer } = gstate
    const piece = board[idx]
    const sign  = currentPlayer === 'w' ? 1 : -1
    const owned = piece !== 0 && Math.sign(piece) === sign
    const moves = engine.getLegalMoves()

    if (legalTo.includes(idx)) {
      // Execute move
      const mv = moves.find(m => m.from===sel && m.to===idx)
      if (!mv) { setSel(null); setLegalTo([]); return }

      // Check promotion
      const isPawn   = Math.abs(board[sel]) === 1
      const promRank = currentPlayer==='w' ? 0 : 7
      if (isPawn && Math.floor(idx/8) === promRank) {
        setPromo(mv); return
      }

      play('chess_move'); vibrate([6])
      doApply(mv)
      setSel(null); setLegalTo([])

    } else if (owned) {
      // Select piece
      if (sel === idx) { setSel(null); setLegalTo([]); return }
      play('chess_select')
      setSel(idx)
      setLegalTo(moves.filter(m => m.from === idx).map(m => m.to))

    } else {
      setSel(null); setLegalTo([])
    }
  }

  function handlePromo(v) {
    if (!promo) return
    doApply({ ...promo, promotion: v })
    setPromo(null); setSel(null); setLegalTo([])
  }

  function handleUndo() {
    if (thinking) return
    play('ui_back')
    engine.undoMove()
    if (playMode==='solo') engine.undoMove()
    setGstate(engine.cloneState())
    setSel(null); setLegalTo([]); setLastMove(null)
    setHistory(h => h.slice(0, Math.max(0, h.length-(playMode==='solo'?2:1))))
  }

  // ── Timer display ─────────────────────────────────────────────────────────
  const mm = String(Math.floor(elapsed/60)).padStart(2,'0')
  const ss = String(elapsed%60).padStart(2,'0')

  // ── Sub-screen routing ────────────────────────────────────────────────────
  if (tab==='learn')    return <LearnScreen    onBack={()=>setTab('play')}/>
  if (tab==='openings') return <OpeningScreen  onBack={()=>setTab('play')}/>

  // ── Play screen ───────────────────────────────────────────────────────────
  if (!gstate) return (
    <div style={{...S.screen,alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>Loading…</div>
    </div>
  )

  const { board, currentPlayer, gameOver, check } = gstate
  const captW = captured.filter(p=>p<0)
  const captB = captured.filter(p=>p>0)

  let statusTxt='', statusClr='#fff'
  if (gameOver) {
    statusTxt = gstate.checkmate ? `Checkmate — ${gstate.winner==='w'?p1:p2} wins!`
      : gstate.stalemate ? 'Stalemate — Draw'
      : `Draw — ${gstate.drawReason||''}`
    statusClr = '#ffd700'
  } else if (check) {
    statusTxt = `⚠️ ${currentPlayer==='w'?p1:p2} in Check!`
    statusClr = '#e94560'
  } else if (thinking) {
    statusTxt = '🤖 AI thinking…'
    statusClr = 'rgba(255,255,255,0.35)'
  } else {
    statusTxt = `${currentPlayer==='w'?p1:p2}'s turn`
    statusClr = currentPlayer==='w' ? '#fff' : '#90caf9'
  }

  return (
    <div style={{...S.screen,background:'linear-gradient(160deg,#1a1f35 0%,#0a0b14 40%)'}}>

      {/* ── Header ── */}
      <div style={S.header}>
        <button onClick={onExit} style={S.backBtn}>←</button>
        <span style={{fontSize:20,filter:'drop-shadow(0 0 8px rgba(255,215,0,0.5))'}}>♟</span>
        <span style={{color:'#fff',fontWeight:800,fontSize:16,flex:1}}>Chess</span>
        <div style={{fontFamily:'monospace',fontSize:13,fontWeight:700,
          color:elapsed>300?'#e94560':'rgba(255,255,255,0.4)',
          padding:'3px 9px',borderRadius:8,background:'rgba(0,0,0,0.3)',
          border:'1px solid rgba(255,255,255,0.06)'}}>{mm}:{ss}</div>
        <span style={{fontSize:9,color:'rgba(255,255,255,0.2)',fontWeight:700,marginLeft:4}}>
          {playMode==='solo'?'vs AI':playMode==='aiVsAi'?'AI/AI':'2P'}
        </span>
      </div>

      {/* ── Black player row ── */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px 4px',flexShrink:0,
        background:currentPlayer==='b'&&!gameOver?'rgba(144,202,249,0.06)':'transparent',
        borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.3s'}}>
        <div style={{width:26,height:26,borderRadius:8,flexShrink:0,fontSize:14,
          background:currentPlayer==='b'&&!gameOver?'rgba(144,202,249,0.18)':'rgba(255,255,255,0.06)',
          border:`1.5px solid ${currentPlayer==='b'&&!gameOver?'#90caf9':'rgba(255,255,255,0.1)'}`,
          display:'flex',alignItems:'center',justifyContent:'center'}}>♚</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:currentPlayer==='b'&&!gameOver?'#90caf9':'rgba(255,255,255,0.5)',
            fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {(playMode==='solo'||playMode==='aiVsAi')&&currentPlayer==='b'?'🤖 ':''}{p2}
            {currentPlayer==='b'&&!gameOver&&<span style={{
              width:6,height:6,borderRadius:'50%',background:'#90caf9',
              display:'inline-block',marginLeft:6,animation:'gp 0.8s ease-in-out infinite'}}/>}
          </div>
          <div style={{display:'flex',gap:1}}>{captB.map((p,i)=><span key={i} style={{fontSize:10,opacity:0.6}}>{pOf(p)}</span>)}</div>
        </div>
        <div style={{fontSize:15,fontWeight:800,color:'rgba(255,255,255,0.3)'}}>{scores.b}</div>
      </div>

      {/* ── Status ── */}
      <div style={{height:24,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <div style={{fontSize:12,fontWeight:700,color:statusClr,padding:'1px 10px',
          borderRadius:20,background:check&&!gameOver?'rgba(233,69,96,0.1)':'transparent'}}>
          {statusTxt}
        </div>
      </div>

      {/* ── Board ── */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        padding:'2px 8px',minHeight:0,position:'relative'}}>
        <div style={{position:'relative'}}>
          <BoardGrid
            board={board} sel={sel} legalTo={legalTo} lastMove={lastMove}
            check={check} currentPlayer={currentPlayer} gameOver={gameOver}
            onSquare={handleSquare}
          />
          {promo && <PromoDlg color={gstate.currentPlayer} onChoose={handlePromo}/>}
        </div>
      </div>

      {/* ── Move log ── */}
      <div style={{overflowX:'auto',scrollbarWidth:'none',padding:'2px 10px',flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.04)'}}>
        <div style={{display:'flex',gap:4,minWidth:'max-content'}}>
          {history.slice(-18).map((m,i,a)=>{
            const pos=history.length-a.length+i
            const isWhiteMove=pos%2===0
            return <span key={i} style={{fontSize:10,fontFamily:'monospace',whiteSpace:'nowrap',
              color:i===a.length-1?'#ffd700':'rgba(255,255,255,0.35)'}}>
              {isWhiteMove&&<span style={{color:'rgba(255,255,255,0.2)',marginRight:1}}>{Math.floor(pos/2)+1}.</span>}
              {m}{' '}
            </span>
          })}
        </div>
      </div>

      {/* ── White player row ── */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 14px 4px',flexShrink:0,
        background:currentPlayer==='w'&&!gameOver?'rgba(255,255,255,0.05)':'transparent',
        borderTop:'1px solid rgba(255,255,255,0.04)',transition:'background 0.3s'}}>
        <div style={{width:26,height:26,borderRadius:8,flexShrink:0,fontSize:14,
          background:currentPlayer==='w'&&!gameOver?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.06)',
          border:`1.5px solid ${currentPlayer==='w'&&!gameOver?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.1)'}`,
          display:'flex',alignItems:'center',justifyContent:'center'}}>♔</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:currentPlayer==='w'&&!gameOver?'#fff':'rgba(255,255,255,0.5)',
            fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {p1}
            {currentPlayer==='w'&&!gameOver&&<span style={{
              width:6,height:6,borderRadius:'50%',background:'#fff',
              display:'inline-block',marginLeft:6,animation:'gp 0.8s ease-in-out infinite'}}/>}
          </div>
          <div style={{display:'flex',gap:1}}>{captW.map((p,i)=><span key={i} style={{fontSize:10,opacity:0.6}}>{pOf(p)}</span>)}</div>
        </div>
        <div style={{fontSize:15,fontWeight:800,color:'rgba(255,255,255,0.3)'}}>{scores.w}</div>
      </div>

      {/* ── Bottom controls ── */}
      <div style={{display:'flex',gap:6,padding:'6px 12px 10px',flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)',background:'rgba(0,0,0,0.2)'}}>
        <button onClick={handleUndo} disabled={!engine.history?.length||thinking} style={{
          flex:1,padding:'10px 0',borderRadius:11,
          border:'1px solid rgba(255,255,255,0.1)',
          background:engine.history?.length&&!thinking?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.03)',
          color:engine.history?.length&&!thinking?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.2)',
          fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>↩ Undo</button>
        <button onClick={()=>newGame()} style={{
          flex:2,padding:'10px 0',borderRadius:11,border:'none',
          background:'linear-gradient(135deg,#607d8b,#455a64)',
          color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
        }}>↺ New Game</button>
        <button onClick={()=>setTab('learn')} style={{
          flex:1,padding:'10px 0',borderRadius:11,
          border:'1px solid rgba(255,255,255,0.1)',
          background:'rgba(76,175,80,0.1)',color:'#a5d6a7',
          fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>📚 Learn</button>
        <button onClick={()=>setTab('openings')} style={{
          flex:1,padding:'10px 0',borderRadius:11,
          border:'1px solid rgba(255,255,255,0.1)',
          background:'rgba(255,165,0,0.1)',color:'#ffcc80',
          fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>📖 Open.</button>
      </div>

      {/* ── Game Over ── */}
      {gameOver && <GameOverBanner state={gstate} p1={p1} p2={p2} scores={scores}
        onRestart={()=>newGame()} onExit={onExit}/>}

      <style>{`
        @keyframes gp{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}
