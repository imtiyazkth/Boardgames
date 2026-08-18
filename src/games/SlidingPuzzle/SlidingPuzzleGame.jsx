import { useState, useEffect, useCallback, useRef } from 'react'
import { SlidingPuzzleEngine } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import { SaveSystem } from '../../core/SaveSystem.js'

const SIZE = 4

// Colorful tile colors like competitor app — each number gets its own color
const TILE_COLORS = [
  null,
  '#e53935','#1e88e5','#43a047','#fb8c00',  // 1-4
  '#8e24aa','#00acc1','#f4511e','#00897b',  // 5-8
  '#3949ab','#7cb342','#6d4c41','#039be5',  // 9-12
  '#e91e63','#ff6f00','#00695c','#5e35b1',  // 13-15 (+blank)
]

const TILE_LIGHT = [
  null,
  '#ef9a9a','#90caf9','#a5d6a7','#ffcc80',
  '#ce93d8','#80deea','#ffab91','#80cbc4',
  '#9fa8da','#c5e1a5','#bcaaa4','#81d4fa',
  '#f48fb1','#ffcc80','#80cbc4','#b39ddb',
]

const NUM_WORDS = ['','one','two','three','four','five','six','seven','eight',
  'nine','ten','eleven','twelve','thirteen','fourteen','fifteen']

const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅']

export default function SlidingPuzzleGame({ difficulty='normal', onExit, onGameOver }) {
  const { play, vibrate } = useAudio()
  const [engine]   = useState(() => new SlidingPuzzleEngine())
  const [state,    setState]   = useState(null)
  const [hint,     setHint]    = useState(null)
  const [elapsed,  setElapsed] = useState(0)
  const [solved,   setSolved]  = useState(false)
  const [moves,    setMoves]   = useState(0)
  const [lastMoved,setLastMoved] = useState(null)
  const [bestScore,setBestScore] = useState(null)
  const timerRef = useRef(null)

  function startGame() {
    engine.initializeGame({ difficulty })
    setState(engine.cloneState())
    setHint(null); setSolved(false); setMoves(0)
    setLastMoved(null); setElapsed(0)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(()=>setElapsed(e=>e+1), 1000)
    play('puzzle_shuffle')
    // Load best
    const stats = SaveSystem.load('sliding_best', null)
    setBestScore(stats)
  }

  useEffect(()=>{ startGame(); return()=>clearInterval(timerRef.current) }, [])

  useEffect(()=>{
    if (!state?.solved) return
    clearInterval(timerRef.current)
    setSolved(true)
    play('puzzle_complete'); vibrate([40,30,60,30,80])
    // Save best
    const score = moves * 10 + elapsed
    const old = SaveSystem.load('sliding_best', null)
    if (!old || score < old.score) {
      SaveSystem.save('sliding_best', { score, moves, time:elapsed })
      setBestScore({ score, moves, time:elapsed })
    }
    onGameOver?.({ winner:'You', moves, time:elapsed })
  }, [state?.solved])

  function handleTile(i) {
    if (!state || state.solved) return
    const legal = engine.getLegalMoves()
    if (!legal.some(m=>m.tileIndex===i)) { play('puzzle_invalid'); return }
    engine.applyMove({ tileIndex:i })
    const ns = engine.cloneState()
    setState(ns)
    setLastMoved(i)
    setMoves(m=>m+1)
    setHint(null)
    play('puzzle_slide'); vibrate([6])
  }

  function handleHint() {
    if (!state||state.solved) return
    const h = engine.getHint?.()
    if (h) { setHint(h.tileIndex); play('ui_click') }
  }

  const mm = String(Math.floor(elapsed/60)).padStart(2,'0')
  const ss = String(elapsed%60).padStart(2,'0')

  if (!state) return null
  const { board } = state

  // Count correct tiles
  const correct = board.filter((v,i) => v !== 0 && v === i+1).length

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background:'linear-gradient(160deg,#1a1428 0%,#0a0b14 50%)',
      userSelect:'none',overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px 8px',
        flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.25)'}}>
        <button onClick={onExit} style={BTN}>←</button>
        <span style={{fontSize:20,filter:'drop-shadow(0 0 10px #f5a62380)'}}>🔢</span>
        <span style={{color:'#fff',fontWeight:900,fontSize:17,flex:1}}>Sliding Puzzle</span>
        <div style={{fontFamily:'monospace',fontSize:14,fontWeight:800,
          color:elapsed>120?'#e94560':'#f5a623',
          padding:'3px 10px',borderRadius:8,background:'rgba(0,0,0,0.4)',
          border:'1px solid rgba(245,166,35,0.3)'}}>{mm}:{ss}</div>
      </div>

      {/* Stats row */}
      <div style={{display:'flex',gap:0,padding:'8px 12px',flexShrink:0,alignItems:'stretch'}}>
        {[
          {label:'Moves',value:moves,color:'#f5a623'},
          {label:'Correct',value:`${correct}/15`,color:'#4caf50'},
          {label:'Best',value:bestScore?`${bestScore.moves}m`:'-',color:'rgba(255,255,255,0.4)'},
        ].map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:'center',padding:'8px 4px',
            background:i===1?'rgba(76,175,80,0.1)':'rgba(255,255,255,0.04)',
            borderRadius:10,margin:'0 3px',
            border:`1px solid ${i===1?'rgba(76,175,80,0.3)':'rgba(255,255,255,0.07)'}`,
          }}>
            <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        padding:'8px 16px',minHeight:0}}>
        {/* Wooden frame */}
        <div style={{
          background:'linear-gradient(135deg,#a0652a,#8b5523,#a0652a)',
          borderRadius:22,padding:12,
          boxShadow:'0 8px 40px rgba(0,0,0,0.6),inset 0 2px 8px rgba(255,255,255,0.15),inset 0 -2px 8px rgba(0,0,0,0.3)',
          width:'min(90vw,380px)',
        }}>
          <div style={{
            display:'grid',gridTemplateColumns:`repeat(${SIZE},1fr)`,
            gap:6,
            background:'rgba(0,0,0,0.3)',
            borderRadius:14,padding:6,
          }}>
            {board.map((val,i)=>{
              const isEmpty = val===0
              const isCorrect = !isEmpty && val===i+1
              const isHint = hint===i
              const isLast = lastMoved===i
              const color = isEmpty ? null : TILE_COLORS[val]
              const light = isEmpty ? null : TILE_LIGHT[val]

              return (
                <button key={i} onClick={()=>handleTile(i)} style={{
                  aspectRatio:'1',borderRadius:12,border:'none',
                  background: isEmpty
                    ? 'rgba(0,0,0,0.35)'
                    : `linear-gradient(145deg,${light},${color})`,
                  cursor: isEmpty?'default':'pointer',
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  boxShadow: isEmpty ? 'inset 0 2px 8px rgba(0,0,0,0.5)'
                    : isHint ? `0 0 0 3px #fff,0 4px 16px ${color}80`
                    : isCorrect ? `0 4px 12px ${color}60,inset 0 1px 4px rgba(255,255,255,0.4)`
                    : `0 4px 10px rgba(0,0,0,0.4),inset 0 1px 3px rgba(255,255,255,0.3)`,
                  transform: isLast?'scale(0.95)':isEmpty?'none':'scale(1)',
                  transition:'all 0.12s cubic-bezier(0.34,1.3,0.64,1)',
                  position:'relative',overflow:'hidden',
                }}>
                  {!isEmpty&&(
                    <>
                      {/* Shine effect */}
                      <div style={{position:'absolute',top:0,left:0,right:0,height:'40%',
                        background:'rgba(255,255,255,0.25)',borderRadius:'12px 12px 50% 50%',
                        pointerEvents:'none'}}/>
                      <div style={{
                        fontSize:'clamp(18px,7vw,30px)',fontWeight:900,color:'#fff',
                        textShadow:'0 2px 4px rgba(0,0,0,0.5)',lineHeight:1,zIndex:1,
                      }}>{val}</div>
                      <div style={{
                        fontSize:'clamp(7px,2vw,10px)',color:'rgba(255,255,255,0.7)',
                        fontWeight:600,marginTop:1,zIndex:1,letterSpacing:0.2,
                      }}>{NUM_WORDS[val]}</div>
                      {isCorrect&&<div style={{
                        position:'absolute',bottom:2,right:4,fontSize:8,
                        color:'rgba(255,255,255,0.5)',fontWeight:700,
                      }}>✓</div>}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:8,padding:'8px 14px 14px',flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)',background:'rgba(0,0,0,0.2)'}}>
        <button onClick={handleHint} style={{
          flex:1,padding:'12px 0',borderRadius:13,
          border:'1px solid rgba(245,166,35,0.3)',
          background:'rgba(245,166,35,0.1)',color:'#f5a623',
          fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>💡 Hint</button>
        <button onClick={startGame} style={{
          flex:2,padding:'12px 0',borderRadius:13,border:'none',
          background:'linear-gradient(135deg,#f5a623,#e8860a)',
          color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
          boxShadow:'0 3px 16px rgba(245,166,35,0.4)',
        }}>↺ New Puzzle</button>
      </div>

      {/* Solved overlay */}
      {solved&&(
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{
            background:'linear-gradient(160deg,#1a1e30,#0f1220)',
            borderRadius:24,padding:'28px 22px',width:'100%',maxWidth:310,textAlign:'center',
            border:'2px solid rgba(245,166,35,0.6)',
            boxShadow:'0 20px 60px rgba(245,166,35,0.2)',
            animation:'slidePopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{fontSize:52,marginBottom:10}}>🎉</div>
            <div style={{color:'#ffd700',fontWeight:900,fontSize:22,marginBottom:4}}>
              Puzzle Solved!
            </div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:13,marginBottom:16}}>
              {moves} moves · {mm}:{ss}
            </div>
            {bestScore?.moves===moves&&(
              <div style={{color:'#ffd700',fontSize:12,fontWeight:700,marginBottom:12}}>
                🏆 New Best Score!
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button onClick={onExit} style={{flex:1,padding:'12px 0',borderRadius:12,
                border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.07)',
                color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                🏠 Home</button>
              <button onClick={startGame} style={{flex:2,padding:'12px 0',borderRadius:12,border:'none',
                background:'linear-gradient(135deg,#f5a623,#e8860a)',
                color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 3px 16px rgba(245,166,35,0.4)'}}>
                ▶ Play Again</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes slidePopIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}
const BTN={background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,cursor:'pointer',
  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:'inherit'}
