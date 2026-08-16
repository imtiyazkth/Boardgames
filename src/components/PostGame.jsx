/**
 * PostGame — shown after every game ends
 * Shows result, suggests next game, offers play again
 */
import { useState, useEffect } from 'react'
import { GAMES } from '../core/GameRegistry.js'
import { SaveSystem } from '../core/SaveSystem.js'

// Game suggestions based on tags/category
function getSuggestions(currentGame, count=3) {
  const related = GAMES.filter(g =>
    g.available && g.id !== currentGame.id &&
    g.tags.some(t => currentGame.tags.includes(t))
  ).slice(0, count)

  const rest = GAMES.filter(g =>
    g.available && g.id !== currentGame.id &&
    !related.find(r => r.id === g.id)
  ).slice(0, count - related.length)

  return [...related, ...rest].slice(0, count)
}

function Confetti({ active }) {
  if (!active) return null
  const pieces = Array.from({length:24},(_,i)=>({
    x:Math.random()*100,
    delay:Math.random()*0.6,
    dur:1.2+Math.random()*0.8,
    size:5+Math.random()*7,
    color:['#f5c842','#e94560','#4fc3f7','#81c784','#ce93d8','#ffb74d'][i%6],
  }))
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:5}}>
      {pieces.map((p,i)=>(
        <div key={i} style={{
          position:'absolute',left:`${p.x}%`,top:'-10px',
          width:p.size,height:p.size*0.5,background:p.color,borderRadius:2,
          animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
      <style>{`@keyframes confettiFall{to{top:110%;opacity:0;transform:rotate(720deg)}}`}</style>
    </div>
  )
}

export default function PostGame({ game, result, config, onPlayAgain, onChangeGame, onHome }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(()=>setMounted(true),100) }, [])

  const suggestions = getSuggestions(game)
  const isWin  = result?.winner && result.winner !== 'draw'
  const isDraw = result?.winner === 'draw'
  const isLoss = !isWin && !isDraw && result?.winner !== undefined

  const resultEmoji = isWin ? '🏆' : isDraw ? '🤝' : isLoss ? '💪' : '🎮'
  const resultText  = isWin ? 'You Won!' : isDraw ? "It's a Draw!" : isLoss ? 'Good Game!' : 'Game Over!'
  const resultSub   = isWin ? 'Excellent play!'
    : isDraw ? 'Well matched!'
    : isLoss ? 'Keep practicing, you\'ll get there!'
    : ''

  // Stats from SaveSystem
  const stats = SaveSystem.loadStats(game.id)

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background:`linear-gradient(160deg,${game.color}20 0%,#0a0b14 50%)`,
      overflow:'hidden',position:'relative',
    }}>
      <Confetti active={isWin}/>

      {/* Result card */}
      <div style={{
        padding:'32px 20px 20px',textAlign:'center',flexShrink:0,
        opacity:mounted?1:0,transform:mounted?'translateY(0)':'translateY(-20px)',
        transition:'all 0.4s cubic-bezier(0.34,1.3,0.64,1)',
      }}>
        <div style={{fontSize:56,marginBottom:10,
          filter:`drop-shadow(0 0 20px ${game.color}80)`,
          animation:isWin?'celebrateBounce 0.6s ease 0.2s both':'none',
        }}>{resultEmoji}</div>

        <div style={{color:'#fff',fontWeight:900,fontSize:26,marginBottom:4,letterSpacing:-0.5}}>
          {resultText}
        </div>
        <div style={{color:'rgba(255,255,255,0.45)',fontSize:14,marginBottom:16}}>
          {resultSub}
        </div>

        {/* Quick stats row */}
        <div style={{
          display:'flex',gap:10,justifyContent:'center',
          maxWidth:300,margin:'0 auto',
        }}>
          {[
            {label:'Wins',   value:stats.won,    color:game.color},
            {label:'Played', value:stats.played, color:'rgba(255,255,255,0.5)'},
            {label:'Win %',  value:stats.played>0?Math.round(stats.won/stats.played*100)+'%':'—', color:'rgba(255,255,255,0.5)'},
          ].map((s,i)=>(
            <div key={i} style={{
              flex:1,padding:'10px 6px',borderRadius:12,
              background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        padding:'0 16px',flexShrink:0,display:'flex',gap:10,
        opacity:mounted?1:0,transition:'opacity 0.4s 0.2s',
      }}>
        <button onClick={onPlayAgain} style={{
          flex:2,padding:'14px 0',borderRadius:14,border:'none',
          background:`linear-gradient(135deg,${game.color},${game.color}cc)`,
          color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
          boxShadow:`0 4px 24px ${game.color}50`,
        }}>▶ Play Again</button>
        <button onClick={onHome} style={{
          flex:1,padding:'14px 0',borderRadius:14,
          border:'1px solid rgba(255,255,255,0.12)',
          background:'rgba(255,255,255,0.07)',
          color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
        }}>🏠 Home</button>
      </div>

      {/* Suggestions */}
      <div style={{
        flex:1,overflowY:'auto',padding:'16px 14px',
        opacity:mounted?1:0,transition:'opacity 0.4s 0.35s',
      }}>
        <div style={{
          fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.3)',
          letterSpacing:1.5,textTransform:'uppercase',marginBottom:10,
        }}>You Might Also Like</div>

        {suggestions.map((sg,i)=>(
          <button key={sg.id} onClick={()=>onChangeGame(sg)} style={{
            width:'100%',display:'flex',alignItems:'center',gap:12,
            padding:'13px 14px',marginBottom:8,borderRadius:14,
            background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.08)',
            cursor:'pointer',textAlign:'left',fontFamily:'inherit',
            opacity:mounted?1:0,
            transform:mounted?'translateX(0)':'translateX(30px)',
            transition:`all 0.3s ${0.4+i*0.08}s ease`,
          }}>
            <div style={{
              width:44,height:44,borderRadius:12,flexShrink:0,
              background:`${sg.color}20`,border:`1px solid ${sg.color}40`,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
            }}>{sg.emoji}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:14}}>{sg.name}</div>
              <div style={{color:'rgba(255,255,255,0.35)',fontSize:11,marginTop:2,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {sg.description}
              </div>
              <div style={{display:'flex',gap:4,marginTop:4}}>
                {sg.tags.slice(0,2).map(t=>(
                  <span key={t} style={{
                    fontSize:9,padding:'1px 6px',borderRadius:8,fontWeight:700,
                    background:`${sg.color}20`,color:sg.color,
                    border:`1px solid ${sg.color}30`,textTransform:'uppercase',letterSpacing:0.3,
                  }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{color:sg.color,fontSize:18}}>›</div>
          </button>
        ))}

        {/* Trending note */}
        <div style={{
          marginTop:8,padding:'12px 14px',borderRadius:14,
          background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
          display:'flex',alignItems:'center',gap:10,
        }}>
          <span style={{fontSize:18}}>🔥</span>
          <div style={{flex:1}}>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,lineHeight:1.5}}>
              <strong style={{color:'rgba(255,255,255,0.7)'}}>{game.name}</strong> players also love{' '}
              <strong style={{color:suggestions[0]?.color}}>{suggestions[0]?.name}</strong> and{' '}
              <strong style={{color:suggestions[1]?.color}}>{suggestions[1]?.name}</strong>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes celebrateBounce{0%{transform:scale(0.5)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
    </div>
  )
}
