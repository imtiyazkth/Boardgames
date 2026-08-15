/**
 * Chess Studio — Complete offline chess learning + playing system
 * Modes: Play, Learn, Practice (Tactics/Openings/Endgames), Puzzles, Analysis
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { ChessEngine, ChessAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import { SaveSystem } from '../../core/SaveSystem.js'
import { COURSES, OPENINGS, ENDGAME_LESSONS } from './data/lessons.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const FILES = ['a','b','c','d','e','f','g','h']
const RANKS = ['8','7','6','5','4','3','2','1']
const SYM = {6:'♔',5:'♕',4:'♖',3:'♗',2:'♘',1:'♙','-6':'♚','-5':'♛','-4':'♜','-3':'♝','-2':'♞','-1':'♟'}
const PIECE_NAMES_SHORT = {1:'',2:'N',3:'B',4:'R',5:'Q',6:'K','-1':'','-2':'N','-3':'B','-4':'R','-5':'Q','-6':'K'}

function pieceOf(v) { return SYM[String(v)] || '' }
function isWhite(v) { return v > 0 }
function sqName(i) { return FILES[i%8] + RANKS[Math.floor(i/8)] }

// ─── Board Component ──────────────────────────────────────────────────────────
function ChessBoard({
  board, sel, legalTo, lastMove, check,
  currentPlayer, gameOver, onSquare,
  flipped=false, interactive=true, size='normal'
}) {
  const indices = flipped
    ? Array.from({length:64},(_,i)=>63-i)
    : Array.from({length:64},(_,i)=>i)

  return (
    <div style={{
      display:'grid', gridTemplateColumns:'repeat(8,1fr)',
      aspectRatio:'1', border:'2px solid rgba(255,255,255,0.15)',
      borderRadius:8, overflow:'hidden',
      boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
      width:'100%', maxWidth: size==='small' ? 260 : 420,
    }}>
      {indices.map(idx => {
        const row=Math.floor(idx/8), col=idx%8
        const isDark=(row+col)%2===1
        const piece=board[idx]
        const isSel=sel===idx
        const isTo=legalTo?.includes(idx)
        const isFrom=lastMove?.from===idx
        const isToLast=lastMove?.to===idx
        const hasEnemy=isTo&&piece!==0
        const pWhite=piece!==0&&isWhite(piece)
        const isKingCheck=check&&!gameOver&&((currentPlayer==='w'&&piece===6)||(currentPlayer==='b'&&piece===-6))
        const displayRow = flipped ? 7-row : row
        const displayCol = flipped ? 7-col : col

        const bg = isSel ? 'rgba(255,215,0,0.55)'
          : isKingCheck ? 'rgba(233,69,96,0.65)'
          : (isFrom||isToLast) ? (isDark?'rgba(103,178,139,0.65)':'rgba(186,214,177,0.8)')
          : isDark ? '#769656' : '#eeeed2'

        return (
          <div key={idx}
            onClick={() => interactive && onSquare?.(idx)}
            style={{
              aspectRatio:'1', display:'flex', alignItems:'center',
              justifyContent:'center', background:bg,
              cursor: interactive ? 'pointer' : 'default',
              position:'relative', transition:'background 0.08s',
            }}>
            {isTo && !hasEnemy && (
              <div style={{width:'34%',height:'34%',borderRadius:'50%',
                background:'rgba(0,0,0,0.22)',pointerEvents:'none'}}/>
            )}
            {hasEnemy && (
              <div style={{position:'absolute',inset:0,border:'3px solid rgba(0,0,0,0.3)',
                borderRadius:2,pointerEvents:'none',boxSizing:'border-box'}}/>
            )}
            {piece!==0 && (
              <span style={{
                fontSize:'clamp(16px,5vw,34px)', lineHeight:1,
                userSelect:'none', position:'relative', zIndex:1,
                color: pWhite?'#fff':'#111',
                textShadow: pWhite
                  ?'0 1px 4px rgba(0,0,0,0.95),0 0 8px rgba(0,0,0,0.5)'
                  :'0 1px 2px rgba(255,255,255,0.2)',
                transform: isSel ? 'scale(1.15)' : 'scale(1)',
                transition:'transform 0.1s',
              }}>{pieceOf(piece)}</span>
            )}
            {row===7 && (
              <span style={{position:'absolute',bottom:1,right:2,fontSize:7,
                color:isDark?'#eeeed2':'#769656',lineHeight:1,fontWeight:600,
                fontFamily:'monospace'}}>{FILES[displayCol]}</span>
            )}
            {col===0 && (
              <span style={{position:'absolute',top:1,left:2,fontSize:7,
                color:isDark?'#eeeed2':'#769656',lineHeight:1,fontWeight:600,
                fontFamily:'monospace'}}>{RANKS[displayRow]}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Promotion Dialog ─────────────────────────────────────────────────────────
function PromotionDialog({ color, onChoose }) {
  const pieces = color==='w'
    ? [{v:5,s:'♕',n:'Queen'},{v:4,s:'♖',n:'Rook'},{v:3,s:'♗',n:'Bishop'},{v:2,s:'♘',n:'Knight'}]
    : [{v:-5,s:'♛',n:'Queen'},{v:-4,s:'♜',n:'Rook'},{v:-3,s:'♝',n:'Bishop'},{v:-2,s:'♞',n:'Knight'}]
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:30}}>
      <div style={{background:'#1a1e2e',borderRadius:18,padding:20,textAlign:'center',
        border:'2px solid rgba(255,215,0,0.4)',boxShadow:'0 0 40px rgba(255,215,0,0.2)',
        animation:'popIn 0.3s ease'}}>
        <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginBottom:12,letterSpacing:1}}>
          PROMOTE PAWN
        </div>
        <div style={{display:'flex',gap:10}}>
          {pieces.map(p=>(
            <button key={p.v} onClick={()=>onChoose(p.v)} style={{
              width:56,height:60,borderRadius:12,fontSize:30,
              background:'rgba(255,255,255,0.1)',border:'2px solid rgba(255,255,255,0.2)',
              color:'#fff',cursor:'pointer',display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:2,transition:'all 0.15s',
            }}>
              <span>{p.s}</span>
              <span style={{fontSize:8,opacity:0.5}}>{p.n}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Game Over Modal ──────────────────────────────────────────────────────────
function GameOverModal({ state, p1, p2, scores, onRestart, onExit, onAnalyze }) {
  const { checkmate, stalemate, gameOver, winner, drawReason } = state
  const isDraw = !winner && gameOver
  const winName = winner==='w' ? p1 : p2
  const color = isDraw ? '#a0a8c0' : winner==='w' ? '#fff' : '#90caf9'
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:20}}>
      <div style={{
        background:'linear-gradient(160deg,#1a1e30,#0f1220)',
        borderRadius:24,padding:'26px 22px',width:'100%',maxWidth:320,textAlign:'center',
        border:`2px solid ${isDraw?'rgba(255,255,255,0.12)':'rgba(255,215,0,0.5)'}`,
        boxShadow:`0 20px 60px ${isDraw?'rgba(0,0,0,0.7)':'rgba(255,215,0,0.15)'}`,
        animation:'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{fontSize:48,marginBottom:10}}>{isDraw?'🤝':'🏆'}</div>
        <div style={{color:'#fff',fontWeight:900,fontSize:20,marginBottom:4}}>
          {isDraw ? "It's a Draw!" : `${winName} Wins!`}
        </div>
        <div style={{color:'rgba(255,255,255,0.4)',fontSize:12,marginBottom:14}}>
          {checkmate ? 'by Checkmate ♟' : stalemate ? 'Stalemate' : drawReason||''}
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'center',marginBottom:14}}>
          {[{n:p1,s:scores.w,c:'#fff'},{n:p2,s:scores.b,c:'#90caf9'}].map((p,i)=>(
            <div key={i} style={{flex:1,padding:'8px 6px',borderRadius:10,
              background:`${p.c}12`,border:`1px solid ${p.c}25`}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontWeight:700,marginBottom:2,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.n}</div>
              <div style={{fontSize:20,fontWeight:900,color:p.c}}>{p.s}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
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
        <button onClick={onAnalyze} style={{width:'100%',padding:'9px 0',borderRadius:11,
          border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',
          color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          🔍 Analyze Game
        </button>
      </div>
    </div>
  )
}

// ─── Move Log ─────────────────────────────────────────────────────────────────
function MoveLog({ history, maxRows=3 }) {
  const ref = useRef(null)
  useEffect(()=>{ if(ref.current) ref.current.scrollLeft=ref.current.scrollWidth },[history])
  if (!history.length) return null
  const pairs = []
  for (let i=0; i<history.length; i+=2)
    pairs.push({ n:Math.floor(i/2)+1, w:history[i], b:history[i+1]||'' })
  return (
    <div ref={ref} style={{overflowX:'auto',scrollbarWidth:'none',padding:'2px 10px',flexShrink:0}}>
      <div style={{display:'flex',gap:4,alignItems:'center'}}>
        {pairs.slice(-10).map((p,i)=>(
          <span key={i} style={{fontSize:10,fontFamily:'monospace',whiteSpace:'nowrap',
            color:i===pairs.slice(-10).length-1?'#ffd700':'rgba(255,255,255,0.35)'}}>
            <span style={{color:'rgba(255,255,255,0.2)',marginRight:1}}>{p.n}.</span>
            {p.w}{p.b?' '+p.b:''}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Lesson Screen ────────────────────────────────────────────────────────────
function LessonScreen({ onBack }) {
  const [view, setView] = useState('courses')  // courses | lessons | lesson
  const [course, setCourse] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [lessonIdx, setLessonIdx] = useState(0)
  const [answered, setAnswered] = useState(null)
  const [progress, setProgress] = useState(() =>
    SaveSystem.load('chess_learn', {}) || {}
  )

  function markComplete(lid) {
    const np = { ...progress, [lid]: { done:true, ts:Date.now() } }
    setProgress(np); SaveSystem.save('chess_learn', np)
  }

  function startLesson(c, li=0) {
    setCourse(c); setLesson(c.lessons[li]); setLessonIdx(li)
    setAnswered(null); setView('lesson')
  }

  function nextLesson() {
    if (lessonIdx + 1 < course.lessons.length) {
      startLesson(course, lessonIdx + 1)
    } else { setView('courses'); setCourse(null) }
  }

  const levelNames = { 0:'🌱 New to Chess', 1:'🌿 Beginner', 2:'🌳 Intermediate', 3:'⚡ Advanced' }
  const levelColors = { 0:'#4caf50', 1:'#8bc34a', 2:'#ff9800', 3:'#f44336' }

  if (view === 'lesson' && lesson) {
    const isDone = progress[lesson.id]?.done
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
          borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <button onClick={()=>setView('lessons')} style={backBtn}>←</button>
          <div style={{flex:1}}>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:10,letterSpacing:1}}>{course.title.toUpperCase()}</div>
            <div style={{color:'#fff',fontWeight:800,fontSize:15}}>{lesson.title}</div>
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:600}}>
            {lessonIdx+1}/{course.lessons.length}
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:14}}>
          {/* Explanation */}
          <div style={{background:'rgba(255,255,255,0.05)',borderRadius:14,padding:16,
            border:'1px solid rgba(255,255,255,0.08)'}}>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontWeight:700,
              letterSpacing:1,marginBottom:8}}>📖 EXPLANATION</div>
            <div style={{color:'rgba(255,255,255,0.78)',fontSize:14,lineHeight:1.6}}>
              {lesson.explanation}
            </div>
          </div>

          {/* Question */}
          {lesson.question && (
            <div style={{background:'rgba(99,102,241,0.1)',borderRadius:14,padding:16,
              border:'1px solid rgba(99,102,241,0.2)'}}>
              <div style={{fontSize:11,color:'rgba(99,102,241,0.8)',fontWeight:700,
                letterSpacing:1,marginBottom:10}}>❓ QUESTION</div>
              <div style={{color:'#fff',fontWeight:700,fontSize:14,marginBottom:12,lineHeight:1.4}}>
                {lesson.question}
              </div>
              {lesson.choices && (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {lesson.choices.map((c,i) => {
                    const isCorrect = i === lesson.correct
                    const isSelected = answered === i
                    const showResult = answered !== null
                    return (
                      <button key={i} onClick={() => {
                        if (answered !== null) return
                        setAnswered(i)
                        if (i === lesson.correct) markComplete(lesson.id)
                      }} style={{
                        padding:'10px 14px', borderRadius:10, border:'none',
                        textAlign:'left', fontSize:13, fontWeight:600,
                        cursor:answered===null?'pointer':'default', fontFamily:'inherit',
                        background: !showResult ? 'rgba(255,255,255,0.08)'
                          : isCorrect ? 'rgba(76,175,80,0.3)'
                          : isSelected ? 'rgba(233,69,96,0.3)'
                          : 'rgba(255,255,255,0.04)',
                        color: !showResult ? '#fff'
                          : isCorrect ? '#a5d6a7'
                          : isSelected ? '#ef9a9a'
                          : 'rgba(255,255,255,0.3)',
                        border:`1px solid ${!showResult?'rgba(255,255,255,0.1)':isCorrect?'rgba(76,175,80,0.4)':isSelected?'rgba(233,69,96,0.4)':'rgba(255,255,255,0.05)'}`,
                        transition:'all 0.2s',
                      }}>
                        {showResult && isCorrect ? '✓ ' : showResult && isSelected ? '✗ ' : `${String.fromCharCode(65+i)}. `}
                        {c}
                      </button>
                    )
                  })}
                </div>
              )}
              {answered !== null && (
                <div style={{marginTop:12,padding:12,borderRadius:10,
                  background: answered===lesson.correct ? 'rgba(76,175,80,0.12)' : 'rgba(233,69,96,0.12)',
                  border:`1px solid ${answered===lesson.correct?'rgba(76,175,80,0.3)':'rgba(233,69,96,0.3)'}`}}>
                  <div style={{color: answered===lesson.correct?'#a5d6a7':'#ef9a9a',
                    fontSize:13,fontWeight:700,marginBottom:4}}>
                    {answered===lesson.correct ? '✓ Correct!' : '✗ Not quite.'}
                  </div>
                  {lesson.hint && (
                    <div style={{color:'rgba(255,255,255,0.55)',fontSize:12,lineHeight:1.5}}>
                      {lesson.hint}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Next button */}
        <div style={{padding:'10px 14px 16px',flexShrink:0,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          {answered !== null ? (
            <button onClick={nextLesson} style={{
              width:'100%',padding:'13px 0',borderRadius:12,border:'none',
              background:'linear-gradient(135deg,#4caf50,#388e3c)',
              color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
            }}>
              {lessonIdx+1<course.lessons.length ? 'Next Lesson →' : '✓ Course Complete!'}
            </button>
          ) : (
            <button onClick={()=>setView('lessons')} style={{
              width:'100%',padding:'13px 0',borderRadius:12,
              border:'1px solid rgba(255,255,255,0.1)',
              background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',
              fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
            }}>Skip →</button>
          )}
        </div>
      </div>
    )
  }

  if (view === 'lessons' && course) {
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
          borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <button onClick={()=>setView('courses')} style={backBtn}>←</button>
          <span style={{fontSize:24}}>{course.emoji}</span>
          <div style={{flex:1}}>
            <div style={{color:'#fff',fontWeight:800,fontSize:16}}>{course.title}</div>
            <div style={{color:'rgba(255,255,255,0.35)',fontSize:12}}>{course.description}</div>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'12px 12px'}}>
          {course.lessons.map((l,i)=>{
            const done = progress[l.id]?.done
            return (
              <button key={l.id} onClick={()=>startLesson(course,i)} style={{
                width:'100%',display:'flex',alignItems:'center',gap:12,
                padding:'13px 14px',marginBottom:8,borderRadius:14,
                background: done?'rgba(76,175,80,0.1)':'rgba(255,255,255,0.05)',
                border:`1px solid ${done?'rgba(76,175,80,0.3)':'rgba(255,255,255,0.08)'}`,
                cursor:'pointer',textAlign:'left',fontFamily:'inherit',
              }}>
                <div style={{
                  width:32,height:32,borderRadius:'50%',flexShrink:0,
                  background:done?'rgba(76,175,80,0.25)':'rgba(255,255,255,0.08)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:16,color:done?'#a5d6a7':'rgba(255,255,255,0.4)',fontWeight:800,
                }}>{done?'✓':i+1}</div>
                <div>
                  <div style={{color:'#fff',fontWeight:700,fontSize:14}}>{l.title}</div>
                  <div style={{color:'rgba(255,255,255,0.35)',fontSize:11,marginTop:2}}>
                    {done?'Completed':'Tap to start'}
                  </div>
                </div>
                <div style={{marginLeft:'auto',color:'rgba(255,255,255,0.2)',fontSize:16}}>›</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Course list
  const byLevel = {}
  COURSES.forEach(c => { if(!byLevel[c.level]) byLevel[c.level]=[]; byLevel[c.level].push(c) })
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <button onClick={onBack} style={backBtn}>←</button>
        <span style={{fontSize:20}}>📚</span>
        <span style={{color:'#fff',fontWeight:800,fontSize:17}}>Learn Chess</span>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 12px'}}>
        {[0,1,2,3].map(level => (
          <div key={level}>
            <div style={{
              fontSize:11,fontWeight:800,letterSpacing:1.5,
              color:levelColors[level], padding:'10px 4px 6px',
            }}>{levelNames[level]}</div>
            {(byLevel[level]||[]).map(c => {
              const total = c.lessons.length
              const done = c.lessons.filter(l=>progress[l.id]?.done).length
              return (
                <button key={c.id} onClick={()=>{setCourse(c);setView('lessons')}} style={{
                  width:'100%',display:'flex',alignItems:'center',gap:12,
                  padding:'13px 14px',marginBottom:8,borderRadius:14,
                  background:'rgba(255,255,255,0.05)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  cursor:'pointer',textAlign:'left',fontFamily:'inherit',
                }}>
                  <span style={{fontSize:28}}>{c.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{color:'#fff',fontWeight:700,fontSize:14}}>{c.title}</div>
                    <div style={{color:'rgba(255,255,255,0.35)',fontSize:11,marginTop:2}}>
                      {done}/{total} lessons
                    </div>
                    {/* Progress bar */}
                    <div style={{height:3,background:'rgba(255,255,255,0.08)',borderRadius:2,marginTop:5}}>
                      <div style={{height:'100%',background:levelColors[level],borderRadius:2,
                        width:`${total>0?(done/total)*100:0}%`,transition:'width 0.3s'}}/>
                    </div>
                  </div>
                  <div style={{color:'rgba(255,255,255,0.2)',fontSize:16}}>›</div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Opening Trainer ──────────────────────────────────────────────────────────
function OpeningTrainer({ onBack }) {
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [engine] = useState(() => new ChessEngine())
  const [boardState, setBoardState] = useState(null)
  const [sel, setSel] = useState(null)
  const [legalTo, setLegalTo] = useState([])

  function startOpening(op) {
    setSelected(op); setStep(0); setFeedback(null)
    engine.initializeGame(); setBoardState(engine.cloneState()); setSel(null); setLegalTo([])
  }

  function handleSquare(idx) {
    if (!boardState || !selected) return
    const { board, currentPlayer } = boardState
    const piece = board[idx]
    const sign = currentPlayer==='w'?1:-1
    const owned = piece && Math.sign(piece)===sign

    if (legalTo.includes(idx) && sel !== null) {
      // Try move
      const move = engine.getLegalMoves().find(m=>m.from===sel&&m.to===idx)
      if (!move) { setSel(null); setLegalTo([]); return }
      engine.applyMove(move)
      const ns = engine.cloneState()
      setBoardState(ns); setSel(null); setLegalTo([])
      setStep(s => s+1)
      setFeedback({ correct:true, msg:'Good move! Keep going.' })
      setTimeout(()=>setFeedback(null),1500)
    } else if (owned) {
      setSel(idx)
      setLegalTo(engine.getLegalMoves().filter(m=>m.from===idx).map(m=>m.to))
    } else {
      setSel(null); setLegalTo([])
    }
  }

  if (!selected) {
    const white = OPENINGS.filter(o=>o.side==='w')
    const black = OPENINGS.filter(o=>o.side==='b')
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
          borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <button onClick={onBack} style={backBtn}>←</button>
          <span style={{fontSize:20}}>📖</span>
          <span style={{color:'#fff',fontWeight:800,fontSize:17}}>Opening Trainer</span>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'12px'}}>
          {[['White Openings',white,'#fff'],['Black Defenses',black,'#90caf9']].map(([title,list,col])=>(
            <div key={title}>
              <div style={{fontSize:11,fontWeight:800,letterSpacing:1.5,color:col,padding:'10px 4px 6px'}}>{title.toUpperCase()}</div>
              {list.map(op=>(
                <button key={op.id} onClick={()=>startOpening(op)} style={{
                  width:'100%',padding:'13px 14px',marginBottom:8,borderRadius:14,
                  background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',
                  cursor:'pointer',textAlign:'left',fontFamily:'inherit',
                }}>
                  <div style={{color:'#fff',fontWeight:700,fontSize:14}}>{op.name}</div>
                  <div style={{color:'rgba(255,255,255,0.35)',fontSize:11,marginTop:2}}>
                    {op.eco} · {op.moves.slice(0,3).join(' ')}…
                  </div>
                  <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:5,lineHeight:1.4}}>
                    {op.idea}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <button onClick={()=>setSelected(null)} style={backBtn}>←</button>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:800,fontSize:15}}>{selected.name}</div>
          <div style={{color:'rgba(255,255,255,0.35)',fontSize:11}}>{selected.eco} · Step {step+1}/{selected.moves.length}</div>
        </div>
      </div>
      <div style={{padding:'8px 10px',flexShrink:0,background:'rgba(255,255,255,0.04)',
        borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,lineHeight:1.5}}>{selected.idea}</div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'8px',minHeight:0}}>
        {boardState && (
          <ChessBoard
            board={boardState.board} sel={sel} legalTo={legalTo}
            currentPlayer={boardState.currentPlayer}
            check={boardState.check} gameOver={boardState.gameOver}
            onSquare={handleSquare} flipped={selected.side==='b'}
          />
        )}
      </div>
      {feedback && (
        <div style={{padding:'8px 14px',textAlign:'center',
          color: feedback.correct ? '#a5d6a7' : '#ef9a9a',fontSize:13,fontWeight:700}}>
          {feedback.correct ? '✓ ' : '✗ '}{feedback.msg}
        </div>
      )}
      <div style={{padding:'10px 14px 14px',flexShrink:0,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{color:'rgba(255,255,255,0.35)',fontSize:12,marginBottom:6}}>
          Next move: <span style={{color:'#ffd700',fontWeight:700}}>{selected.moves[step] || '✓ Complete!'}</span>
        </div>
        {step >= selected.moves.length && (
          <div style={{color:'#a5d6a7',fontWeight:700,fontSize:13,marginBottom:8}}>
            ✓ Opening complete! {selected.goal}
          </div>
        )}
        <button onClick={()=>startOpening(selected)} style={{
          width:'100%',padding:'11px 0',borderRadius:12,border:'none',
          background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',
          fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
          ↺ Restart Opening
        </button>
      </div>
    </div>
  )
}

// ─── Chess Home ───────────────────────────────────────────────────────────────
function ChessHome({ onMode, onLearn, onOpenings, onEndgames, onAnalysis, onBack }) {
  const stats = SaveSystem.load('chess_stats', {played:0,wins:0,losses:0,draws:0})
  const menuItems = [
    { icon:'🎮', label:'Play vs AI',       sub:'Challenge the computer',     action:()=>onMode('solo') },
    { icon:'👥', label:'Local 2 Player',    sub:'Same device multiplayer',    action:()=>onMode('local2p') },
    { icon:'🔁', label:'AI vs AI',          sub:'Watch AI battle itself',     action:()=>onMode('aiVsAi') },
    { icon:'📚', label:'Learn Chess',       sub:'Progressive lessons',        action:onLearn },
    { icon:'📖', label:'Opening Trainer',   sub:'Study opening lines',        action:onOpenings },
    { icon:'♟', label:'Endgame Practice',  sub:'Master key endgames',        action:onEndgames },
    { icon:'🔍', label:'Analysis Board',    sub:'Explore any position',       action:onAnalysis },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',
      background:'linear-gradient(160deg,#1a1f35 0%,#0a0b14 50%)',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <button onClick={onBack} style={backBtn}>←</button>
        <span style={{fontSize:22,filter:'drop-shadow(0 0 8px rgba(255,215,0,0.5))'}}>♟</span>
        <span style={{color:'#fff',fontWeight:800,fontSize:18}}>Chess Studio</span>
      </div>
      {/* Stats row */}
      {stats.played > 0 && (
        <div style={{display:'flex',gap:0,padding:'8px 14px',flexShrink:0,
          borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
          {[['W',stats.wins,'#a5d6a7'],['L',stats.losses,'#ef9a9a'],['D',stats.draws,'#fff176'],['P',stats.played,'rgba(255,255,255,0.4)']].map(([l,v,c])=>(
            <div key={l} style={{flex:1,textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:700}}>{l}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{flex:1,overflowY:'auto',padding:'10px 12px'}}>
        {menuItems.map((item,i)=>(
          <button key={i} onClick={item.action} style={{
            width:'100%',display:'flex',alignItems:'center',gap:12,
            padding:'13px 14px',marginBottom:8,borderRadius:14,
            background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',
            cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s',
          }}>
            <span style={{fontSize:26,flexShrink:0}}>{item.icon}</span>
            <div style={{flex:1}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:14}}>{item.label}</div>
              <div style={{color:'rgba(255,255,255,0.35)',fontSize:11,marginTop:1}}>{item.sub}</div>
            </div>
            <span style={{color:'rgba(255,255,255,0.2)',fontSize:18}}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Endgame Screen ───────────────────────────────────────────────────────────
function EndgameScreen({ onBack }) {
  const [selected, setSelected] = useState(null)
  if (!selected) {
    return (
      <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
          borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <button onClick={onBack} style={backBtn}>←</button>
          <span style={{fontSize:20}}>♟</span>
          <span style={{color:'#fff',fontWeight:800,fontSize:17}}>Endgame Practice</span>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'12px'}}>
          {ENDGAME_LESSONS.map(eg=>(
            <button key={eg.id} onClick={()=>setSelected(eg)} style={{
              width:'100%',padding:'14px',marginBottom:10,borderRadius:14,
              background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',
              cursor:'pointer',textAlign:'left',fontFamily:'inherit',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <div style={{color:'#fff',fontWeight:700,fontSize:14}}>{eg.title}</div>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,
                  background:'rgba(255,165,0,0.2)',color:'#ffa726',fontWeight:700}}>
                  {eg.difficulty}
                </span>
              </div>
              <div style={{color:'rgba(255,255,255,0.45)',fontSize:12,lineHeight:1.5}}>
                {eg.explanation.slice(0,100)}…
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <button onClick={()=>setSelected(null)} style={backBtn}>←</button>
        <span style={{color:'#fff',fontWeight:800,fontSize:16}}>{selected.title}</span>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px'}}>
        <div style={{color:'rgba(255,255,255,0.7)',fontSize:13,lineHeight:1.7,marginBottom:16}}>
          {selected.explanation}
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',letterSpacing:1,fontWeight:700,marginBottom:10}}>
          KEY STEPS
        </div>
        {selected.steps.map((s,i)=>(
          <div key={i} style={{display:'flex',gap:10,marginBottom:10}}>
            <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,215,0,0.2)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:11,fontWeight:800,color:'#ffd700',flexShrink:0}}>{i+1}</div>
            <div style={{color:'rgba(255,255,255,0.65)',fontSize:13,lineHeight:1.5,paddingTop:2}}>{s}</div>
          </div>
        ))}
        <div style={{marginTop:16,padding:14,borderRadius:12,
          background:'rgba(255,193,7,0.1)',border:'1px solid rgba(255,193,7,0.2)'}}>
          <div style={{color:'#ffd700',fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:6}}>💡 TIP</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:13,lineHeight:1.5}}>{selected.tips}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Analysis Board ───────────────────────────────────────────────────────────
function AnalysisBoard({ onBack }) {
  const [engine] = useState(() => new ChessEngine())
  const [state, setState] = useState(null)
  const [sel, setSel] = useState(null)
  const [legalTo, setLegalTo] = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(()=>{ engine.initializeGame(); setState(engine.cloneState()) },[])

  function handleSquare(idx) {
    if (!state) return
    const { board, currentPlayer } = state
    const piece = board[idx]
    const sign = currentPlayer==='w'?1:-1
    const owned = piece && Math.sign(piece)===sign

    if (legalTo.includes(idx) && sel!==null) {
      const move = engine.getLegalMoves().find(m=>m.from===sel&&m.to===idx)
      if (!move) { setSel(null); setLegalTo([]); return }
      engine.applyMove(move)
      const ns = engine.cloneState()
      setState(ns); setSel(null); setLegalTo([])
      setLastMove(move)
      const p = board[move.from], cap=board[move.to]
      const notation = (PIECE_NAMES_SHORT[String(p)]||'') + (cap?sqName(move.from)+'×':'') + sqName(move.to)
      setHistory(h=>[...h,notation])
    } else if (owned) {
      setSel(idx)
      setLegalTo(engine.getLegalMoves().filter(m=>m.from===idx).map(m=>m.to))
    } else {
      setSel(null); setLegalTo([])
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0a0b14',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
        borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <button onClick={onBack} style={backBtn}>←</button>
        <span style={{fontSize:20}}>🔍</span>
        <span style={{color:'#fff',fontWeight:800,fontSize:17}}>Analysis Board</span>
        <span style={{marginLeft:'auto',fontSize:11,color:'rgba(255,255,255,0.3)'}}>
          {state?.currentPlayer==='w'?'White':'Black'} to move
        </span>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'8px',minHeight:0}}>
        {state && (
          <ChessBoard
            board={state.board} sel={sel} legalTo={legalTo} lastMove={lastMove}
            currentPlayer={state.currentPlayer} check={state.check} gameOver={state.gameOver}
            onSquare={handleSquare}
          />
        )}
      </div>
      <MoveLog history={history}/>
      <div style={{display:'flex',gap:8,padding:'8px 14px 14px',flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <button onClick={()=>{ engine.undoMove(); setState(engine.cloneState()); setLastMove(null); setHistory(h=>h.slice(0,-1)) }} style={{
          flex:1,padding:'11px 0',borderRadius:12,border:'1px solid rgba(255,255,255,0.1)',
          background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.7)',
          fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>↩ Undo</button>
        <button onClick={()=>{ engine.initializeGame(); setState(engine.cloneState()); setLastMove(null); setSel(null); setLegalTo([]); setHistory([]) }} style={{
          flex:1,padding:'11px 0',borderRadius:12,border:'none',
          background:'rgba(255,255,255,0.1)',color:'#fff',
          fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>↺ Reset</button>
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const backBtn = {
  background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,
  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
  fontFamily:'inherit',
}

// ─── Main Chess Game ──────────────────────────────────────────────────────────
export default function ChessGame({ mode:initMode='home', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [screen, setScreen] = useState(initMode==='home'?'home':initMode)
  const [playMode, setPlayMode] = useState(initMode==='home'?'solo':initMode)

  const [engine] = useState(() => new ChessEngine())
  const [ai]     = useState(() => new ChessAI(difficulty))
  const [state,  setState]    = useState(null)
  const [sel,    setSel]      = useState(null)
  const [legalTo,setLegalTo]  = useState([])
  const [lastMove,setLastMove]= useState(null)
  const [history,setHistory]  = useState([])
  const [captured,setCaptured]= useState([])
  const [thinking,setThinking]= useState(false)
  const [scores, setScores]   = useState({w:0,b:0})
  const [elapsed,setElapsed]  = useState(0)
  const [promoPending,setPromoPending] = useState(null)
  const timerRef = useRef(null)
  const aiBusy   = useRef(false)

  const p1 = playerNames[0] || 'White'
  const p2 = playMode==='solo' ? `AI (${difficulty})` : (playerNames[1] || 'Black')

  const isAITurn = useCallback(st => {
    if (!st || st.gameOver) return false
    if (playMode==='local2p') return false
    if (playMode==='aiVsAi')  return true
    return st.currentPlayer === 'b'
  }, [playMode])

  function startPlay(mode) {
    setPlayMode(mode)
    engine.initializeGame()
    setState(engine.cloneState())
    setSel(null); setLegalTo([]); setLastMove(null)
    setHistory([]); setCaptured([]); setThinking(false)
    setElapsed(0); aiBusy.current = false
    clearInterval(timerRef.current)
    timerRef.current = setInterval(()=>setElapsed(e=>e+1),1000)
    play('game_start')
    setScreen('play')
  }

  useEffect(()=>{
    if (initMode !== 'home') startPlay(initMode)
    return ()=>clearInterval(timerRef.current)
  },[])

  useEffect(()=>{ if(state?.gameOver) clearInterval(timerRef.current) },[state?.gameOver])

  // AI
  useEffect(()=>{
    if (!state||!isAITurn(state)||aiBusy.current||screen!=='play') return
    aiBusy.current=true; setThinking(true)
    const t = setTimeout(()=>{
      const move = ai.getBestMove(engine)
      if (move) applyMove(move)
      setThinking(false); aiBusy.current=false
    }, playMode==='aiVsAi'?300:500)
    return ()=>clearTimeout(t)
  },[state,screen])

  function applyMove(move, fromAI=false) {
    const prevBoard = [...engine.state.board]
    const res = engine.applyMove(move)
    if (!res.success) return false
    const ns = engine.cloneState()
    const capturedPiece = prevBoard[move.to]
    const movedPiece    = prevBoard[move.from]

    // Notation
    const p = PIECE_NAMES_SHORT[String(movedPiece)]||''
    const cap = capturedPiece ? sqName(move.from)+'×' : ''
    const to  = sqName(move.to)
    const suf = ns.checkmate?'#':ns.check?'+':''
    let notation
    if (move.castling==='K') notation='O-O'+suf
    else if (move.castling==='Q') notation='O-O-O'+suf
    else if (move.promotion) notation=to+'='+(PIECE_NAMES_SHORT[String(move.promotion)]||'Q')+suf
    else notation=p+cap+to+suf

    setState(ns); setLastMove({from:move.from,to:move.to})
    setHistory(h=>[...h,notation])
    if (capturedPiece) setCaptured(c=>[...c,capturedPiece])

    if (ns.checkmate)       { play('chess_checkmate'); vibrate([60,30,80]); setScores(s=>({...s,[ns.winner]:s[ns.winner]+1})) }
    else if (ns.gameOver)   { play('game_draw') }
    else if (ns.check)      { play('chess_check'); vibrate([20]) }
    else if (move.castling) { play('chess_castle') }
    else if (move.promotion){ play('chess_promote'); vibrate([15]) }
    else if (capturedPiece) { play('chess_capture'); vibrate([12]) }
    else                    { play('chess_move'); vibrate([5]) }

    // Save stats
    if (ns.gameOver) {
      const old = SaveSystem.load('chess_stats',{played:0,wins:0,losses:0,draws:0})
      const np = { ...old, played:old.played+1,
        wins: ns.winner==='w' ? old.wins+1 : old.wins,
        losses: ns.winner==='b' ? old.losses+1 : old.losses,
        draws: !ns.winner ? old.draws+1 : old.draws,
      }
      SaveSystem.save('chess_stats', np)
    }
    return true
  }

  function handleSquare(idx) {
    if (!state||state.gameOver||isAITurn(state)||thinking||promoPending) return
    const { board, currentPlayer } = state
    const piece = board[idx]
    const sign  = currentPlayer==='w'?1:-1
    const owned = piece && Math.sign(piece)===sign
    const allMoves = engine.getLegalMoves()

    if (legalTo.includes(idx)) {
      const move = allMoves.find(m=>m.from===sel&&m.to===idx)
      if (!move) { deselect(); return }
      const isPawn = Math.abs(board[sel])===1
      const isPromRow = (currentPlayer==='w'&&Math.floor(idx/8)===0)||(currentPlayer==='b'&&Math.floor(idx/8)===7)
      if (isPawn && isPromRow) { setPromoPending(move); return }
      play('chess_move'); vibrate([6])
      applyMove(move)
    } else if (owned) {
      if (sel===idx) { deselect(); return }
      play('chess_select')
      setSel(idx)
      setLegalTo(allMoves.filter(m=>m.from===idx).map(m=>m.to))
    } else { deselect() }
  }

  function deselect() { setSel(null); setLegalTo([]) }
  function handlePromotion(v) { if(promoPending){applyMove({...promoPending,promotion:v});setPromoPending(null)} }
  function handleUndo() {
    if(thinking)return; play('ui_back')
    engine.undoMove(); if(playMode==='solo') engine.undoMove()
    setState(engine.cloneState()); setSel(null); setLegalTo([]); setLastMove(null)
    setHistory(h=>h.slice(0,Math.max(0,h.length-(playMode==='solo'?2:1))))
  }

  const mm=String(Math.floor(elapsed/60)).padStart(2,'0')
  const ss=String(elapsed%60).padStart(2,'0')

  // ── Routing ────────────────────────────────────────────────────────────────
  if (screen==='home') return (
    <ChessHome
      onMode={m=>startPlay(m)}
      onLearn={()=>setScreen('learn')}
      onOpenings={()=>setScreen('openings')}
      onEndgames={()=>setScreen('endgames')}
      onAnalysis={()=>setScreen('analysis')}
      onBack={onExit}
    />
  )
  if (screen==='learn')    return <LessonScreen onBack={()=>setScreen('home')}/>
  if (screen==='openings') return <OpeningTrainer onBack={()=>setScreen('home')}/>
  if (screen==='endgames') return <EndgameScreen onBack={()=>setScreen('home')}/>
  if (screen==='analysis') return <AnalysisBoard onBack={()=>setScreen('home')}/>

  // ── Play screen ────────────────────────────────────────────────────────────
  if (!state) return null
  const { board, currentPlayer, gameOver, check } = state

  let statusText='', statusColor='#fff'
  if (gameOver) {
    statusText = state.checkmate ? `Checkmate — ${state.winner==='w'?p1:p2} wins!`
      : state.stalemate ? 'Stalemate — Draw'
      : `Draw — ${state.drawReason||''}`
    statusColor='#ffd700'
  } else if (check) { statusText=`⚠️ ${currentPlayer==='w'?p1:p2} in Check!`; statusColor='#e94560' }
  else if (thinking) { statusText='🤖 AI thinking…'; statusColor='rgba(255,255,255,0.35)' }
  else { statusText=`${currentPlayer==='w'?p1:p2}'s turn`; statusColor=currentPlayer==='w'?'#fff':'#90caf9' }

  const captW = captured.filter(p=>p<0)
  const captB = captured.filter(p=>p>0)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',
      background:'linear-gradient(160deg,#1a1f35 0%,#0a0b14 40%)',
      userSelect:'none',overflow:'hidden',position:'relative'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px 6px',flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.25)'}}>
        <button onClick={()=>setScreen('home')} style={backBtn}>←</button>
        <span style={{fontSize:20,filter:'drop-shadow(0 0 8px rgba(255,215,0,0.5))'}}>♟</span>
        <span style={{color:'#fff',fontWeight:800,fontSize:16,flex:1}}>Chess</span>
        <div style={{fontFamily:'monospace',fontSize:13,fontWeight:700,
          color:elapsed>300?'#e94560':'rgba(255,255,255,0.4)',
          padding:'3px 9px',borderRadius:8,background:'rgba(0,0,0,0.3)',
          border:'1px solid rgba(255,255,255,0.06)'}}>{mm}:{ss}</div>
        <span style={{fontSize:9,color:'rgba(255,255,255,0.2)',fontWeight:700,letterSpacing:0.5}}>
          {playMode==='solo'?`AI·${difficulty}`:playMode==='aiVsAi'?'AI vs AI':'2P'}
        </span>
      </div>

      {/* Black player */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px 4px',flexShrink:0,
        background:currentPlayer==='b'&&!gameOver?'rgba(144,202,249,0.06)':'transparent',
        borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.3s'}}>
        <div style={{width:28,height:28,borderRadius:8,flexShrink:0,
          background:currentPlayer==='b'&&!gameOver?'rgba(144,202,249,0.2)':'rgba(255,255,255,0.06)',
          border:`1.5px solid ${currentPlayer==='b'&&!gameOver?'#90caf9':'rgba(255,255,255,0.1)'}`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
          boxShadow:currentPlayer==='b'&&!gameOver?'0 0 12px rgba(144,202,249,0.4)':'none'}}>♚</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:currentPlayer==='b'&&!gameOver?'#90caf9':'rgba(255,255,255,0.5)',
            fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {playMode==='solo'||playMode==='aiVsAi'?'🤖 ':''}{p2}
            {currentPlayer==='b'&&!gameOver&&<span style={{width:6,height:6,borderRadius:'50%',
              background:'#90caf9',display:'inline-block',marginLeft:6,
              animation:'glowPulse 0.8s ease-in-out infinite'}}/>}
          </div>
          <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
            {captB.map((p,i)=><span key={i} style={{fontSize:11,opacity:0.6}}>{pieceOf(p)}</span>)}
          </div>
        </div>
        <div style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,0.3)'}}>{scores.b}</div>
      </div>

      {/* Status */}
      <div style={{height:26,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <div style={{fontSize:12,fontWeight:700,color:statusColor,padding:'2px 10px',
          borderRadius:20,background:check&&!gameOver?'rgba(233,69,96,0.1)':'transparent',
          animation:'slideDown 0.2s ease'}}>{statusText}</div>
      </div>

      {/* Board */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        padding:'4px 8px',minHeight:0,position:'relative'}}>
        <div style={{position:'relative',width:'min(88vw,400px)'}}>
          <ChessBoard
            board={board} sel={sel} legalTo={legalTo} lastMove={lastMove}
            check={check} currentPlayer={currentPlayer} gameOver={gameOver}
            onSquare={handleSquare}
            flipped={playMode==='local2p'&&currentPlayer==='b'}
          />
          {promoPending && (
            <PromotionDialog color={state.currentPlayer} onChoose={handlePromotion}/>
          )}
        </div>
      </div>

      {/* Move log */}
      <MoveLog history={history}/>

      {/* White player */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 14px 6px',flexShrink:0,
        background:currentPlayer==='w'&&!gameOver?'rgba(255,255,255,0.05)':'transparent',
        borderTop:'1px solid rgba(255,255,255,0.04)',transition:'background 0.3s'}}>
        <div style={{width:28,height:28,borderRadius:8,flexShrink:0,
          background:currentPlayer==='w'&&!gameOver?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.06)',
          border:`1.5px solid ${currentPlayer==='w'&&!gameOver?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.1)'}`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
          boxShadow:currentPlayer==='w'&&!gameOver?'0 0 12px rgba(255,255,255,0.25)':'none'}}>♔</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:currentPlayer==='w'&&!gameOver?'#fff':'rgba(255,255,255,0.5)',
            fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {p1}
            {currentPlayer==='w'&&!gameOver&&<span style={{width:6,height:6,borderRadius:'50%',
              background:'#fff',display:'inline-block',marginLeft:6,
              animation:'glowPulse 0.8s ease-in-out infinite'}}/>}
          </div>
          <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
            {captW.map((p,i)=><span key={i} style={{fontSize:11,opacity:0.6}}>{pieceOf(p)}</span>)}
          </div>
        </div>
        <div style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,0.3)'}}>{scores.w}</div>
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:8,padding:'6px 14px 12px',flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)',background:'rgba(0,0,0,0.2)'}}>
        <button onClick={handleUndo} disabled={!engine.history?.length||thinking} style={{
          flex:1,padding:'11px 0',borderRadius:12,
          border:'1px solid rgba(255,255,255,0.1)',
          background:engine.history?.length&&!thinking?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.03)',
          color:engine.history?.length&&!thinking?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.2)',
          fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>↩ Undo</button>
        <button onClick={()=>startPlay(playMode)} style={{
          flex:2,padding:'11px 0',borderRadius:12,border:'none',
          background:'linear-gradient(135deg,#607d8b,#455a64)',
          color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
          boxShadow:'0 3px 16px rgba(96,125,139,0.4)',
        }}>↺ New Game</button>
        <button onClick={()=>setScreen('home')} style={{
          flex:1,padding:'11px 0',borderRadius:12,
          border:'1px solid rgba(255,255,255,0.1)',
          background:'rgba(255,255,255,0.06)',
          color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>🏠</button>
      </div>

      {/* Game over modal */}
      {gameOver && (
        <GameOverModal
          state={state} p1={p1} p2={p2} scores={scores}
          onRestart={()=>startPlay(playMode)}
          onExit={()=>setScreen('home')}
          onAnalyze={()=>setScreen('analysis')}
        />
      )}

      <style>{`
        @keyframes glowPulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}
