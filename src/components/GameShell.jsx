/**
 * GameShell v3 — Universal game wrapper
 * Each game gets its own color identity, consistent controls
 * Supports: header, player panels, status, board area, controls, victory modal
 */
import { useState, useEffect, useRef } from 'react'

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const pieces = useRef(Array.from({length:30},(_,i)=>({
    x:Math.random()*100,delay:Math.random()*0.8,dur:1.2+Math.random()*1,
    size:5+Math.random()*8,rot:Math.random()*360,
    color:['#f5c842','#e94560','#4fc3f7','#81c784','#ce93d8','#ffb74d'][i%6],
  }))).current
  if (!active) return null
  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:10}}>
      {pieces.map((p,i)=>(
        <div key={i} style={{
          position:'absolute',left:`${p.x}%`,top:'-12px',
          width:p.size,height:p.size*0.5,background:p.color,
          borderRadius:2,transform:`rotate(${p.rot}deg)`,
          animation:`confFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
      <style>{`@keyframes confFall{to{top:110%;opacity:0;transform:rotate(720deg)}}`}</style>
    </div>
  )
}

// ── Player Chip ───────────────────────────────────────────────────────────────
function PlayerChip({ name, score, color, active, isAI, symbol }) {
  return (
    <div style={{
      flex:1,minWidth:0,padding:'7px 10px',borderRadius:13,
      background:active?`${color}22`:'rgba(255,255,255,0.04)',
      border:`1.5px solid ${active?color:'rgba(255,255,255,0.08)'}`,
      boxShadow:active?`0 0 16px ${color}38`:'none',
      transition:'all 0.2s',position:'relative',overflow:'hidden',
    }}>
      {active&&<div style={{position:'absolute',top:0,left:0,right:0,height:2.5,
        background:`linear-gradient(90deg,${color},${color}60)`}}/>}
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
        {symbol && <span style={{fontSize:16,lineHeight:1}}>{symbol}</span>}
        {isAI && <span style={{fontSize:10}}>🤖</span>}
        <div style={{
          color:active?'#fff':'rgba(255,255,255,0.45)',fontWeight:700,fontSize:12,
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,
        }}>{name}</div>
        {active&&<div style={{width:6,height:6,borderRadius:'50%',background:color,flexShrink:0,
          boxShadow:`0 0 8px ${color}`,animation:'shellPulse 0.9s ease-in-out infinite'}}/>}
      </div>
      <div style={{color:active?'#fff':'rgba(255,255,255,0.25)',fontWeight:900,fontSize:20,lineHeight:1}}>
        {score ?? ''}
      </div>
    </div>
  )
}

// ── Status Banner ─────────────────────────────────────────────────────────────
function StatusBanner({ status, color, name, thinking }) {
  const configs = {
    'your-turn':     { text:`${name}'s turn`,   col:color,                   icon:'🎯' },
    'opponent-turn': { text:`${name}'s turn`,   col:'rgba(255,255,255,0.4)', icon:'⏳' },
    'thinking':      { text:'AI thinking…',     col:'rgba(255,255,255,0.35)',icon:'🤔' },
    'check':         { text:'⚠️ Check!',         col:'#e94560',              icon:''   },
    'roll':          { text:'Tap dice to roll',  col:color,                  icon:'🎲' },
    'place':         { text:'Place a piece',     col:color,                  icon:'👆' },
    'remove':        { text:'Remove enemy piece',col:'#e94560',              icon:'💥' },
  }
  const cfg = configs[status] || { text:'', col:'transparent', icon:'' }
  if (!cfg.text) return <div style={{height:26}}/>
  return (
    <div style={{height:26,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <div style={{fontSize:12,fontWeight:700,color:cfg.col,
        padding:'1px 10px',borderRadius:20,
        background:status==='check'?'rgba(233,69,96,0.1)':'transparent',
        display:'flex',alignItems:'center',gap:4}}>
        {cfg.icon&&<span style={{fontSize:12}}>{cfg.icon}</span>}
        <span>{cfg.text}</span>
        {thinking&&<span style={{opacity:0.5}}>···</span>}
      </div>
    </div>
  )
}

// ── Victory Modal ─────────────────────────────────────────────────────────────
function VictoryModal({ winner, isDraw, gameColor, players, onRestart, onExit, extraInfo }) {
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:20}}>
      <Confetti active={!isDraw}/>
      <div style={{
        background:'linear-gradient(160deg,#1a1e30,#0f1220)',
        borderRadius:24,padding:'26px 22px',width:'100%',maxWidth:320,textAlign:'center',
        border:`2px solid ${isDraw?'rgba(255,255,255,0.1)':gameColor}`,
        boxShadow:`0 20px 60px ${isDraw?'rgba(0,0,0,0.7)':`${gameColor}35`}`,
        animation:'shellPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        position:'relative',
      }}>
        <div style={{fontSize:52,marginBottom:10}}>{isDraw?'🤝':'🏆'}</div>
        <div style={{color:'#fff',fontWeight:900,fontSize:22,marginBottom:4,letterSpacing:-0.5}}>
          {isDraw?"It's a Draw!":`${winner} Wins!`}
        </div>
        {extraInfo&&<div style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:10}}>{extraInfo}</div>}

        {players&&players.length>0&&(
          <div style={{display:'flex',gap:8,justifyContent:'center',margin:'12px 0'}}>
            {players.map((p,i)=>(
              <div key={i} style={{flex:1,padding:'8px 6px',borderRadius:11,
                background:`${p.color}12`,border:`1px solid ${p.color}25`}}>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',fontWeight:700,marginBottom:2,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                <div style={{fontSize:20,fontWeight:900,color:p.color}}>{p.score}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:'flex',gap:10,marginTop:10}}>
          <button onClick={onExit} style={{
            flex:1,padding:'12px 0',borderRadius:12,
            border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.07)',
            color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
          }}>🏠 Home</button>
          <button onClick={onRestart} style={{
            flex:2,padding:'12px 0',borderRadius:12,border:'none',
            background:`linear-gradient(135deg,${gameColor},${gameColor}cc)`,
            color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
            boxShadow:`0 4px 20px ${gameColor}45`,
          }}>▶ Play Again</button>
        </div>
      </div>
    </div>
  )
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function Timer({ elapsed, color }) {
  const m = String(Math.floor(elapsed/60)).padStart(2,'0')
  const s = String(elapsed%60).padStart(2,'0')
  return (
    <div style={{fontFamily:'monospace',fontSize:13,fontWeight:700,
      color:elapsed>300?'#e94560':'rgba(255,255,255,0.4)',
      padding:'3px 9px',borderRadius:8,background:'rgba(0,0,0,0.3)',
      border:'1px solid rgba(255,255,255,0.06)'}}>
      {m}:{s}
    </div>
  )
}

// ── Main GameShell ────────────────────────────────────────────────────────────
export default function GameShell({
  // Identity
  title, emoji='🎮', color='#6366f1', gradientBg=true,

  // Players (array of {name, score, color, isAI, symbol})
  players=[], currentPlayerIdx=0,

  // State
  status=null, gameOver=false, winner=null, winnerIsDraw=false, winnerExtraInfo='',

  // Controls
  onExit, onRestart,
  onUndo=null, canUndo=false,
  extraControls=null,  // additional JSX for bottom controls

  // Timer
  showTimer=false, elapsed=0,

  // Extra header info
  modeBadge='',

  children,
}) {
  const curPlayer = players[currentPlayerIdx]

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background: gradientBg
        ? `linear-gradient(160deg,${color}18 0%,#0a0b14 40%,#0d1020 100%)`
        : '#0a0b14',
      userSelect:'none',overflow:'hidden',position:'relative',
    }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex',alignItems:'center',gap:10,
        padding:'10px 14px 8px',flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(0,0,0,0.2)',
      }}>
        <button onClick={onExit} style={{
          background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
          color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:'inherit',
        }}>←</button>
        <span style={{fontSize:20,filter:`drop-shadow(0 0 8px ${color}80)`,lineHeight:1}}>{emoji}</span>
        <span style={{color:'#fff',fontWeight:800,fontSize:17,flex:1,letterSpacing:-0.3}}>{title}</span>
        {showTimer && <Timer elapsed={elapsed} color={color}/>}
        {modeBadge && (
          <span style={{fontSize:9,color:'rgba(255,255,255,0.2)',fontWeight:700,
            letterSpacing:0.5,textTransform:'uppercase'}}>{modeBadge}</span>
        )}
      </div>

      {/* ── Player scoreboard ── */}
      {players.length > 0 && (
        <div style={{
          display:'flex',gap:8,padding:'8px 12px 4px',
          justifyContent:'stretch',flexShrink:0,alignItems:'center',
        }}>
          {players.length===2 ? (
            <>
              <PlayerChip {...players[0]} active={currentPlayerIdx===0&&!gameOver}/>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flexShrink:0}}>
                <div style={{color:'rgba(255,255,255,0.15)',fontSize:10,fontWeight:700}}>VS</div>
                {modeBadge&&<div style={{fontSize:8,color:'rgba(255,255,255,0.2)',textAlign:'center',maxWidth:50}}>{modeBadge}</div>}
              </div>
              <PlayerChip {...players[1]} active={currentPlayerIdx===1&&!gameOver}/>
            </>
          ) : (
            <div style={{display:'flex',gap:6,width:'100%'}}>
              {players.map((p,i)=>(
                <PlayerChip key={i} {...p} active={currentPlayerIdx===i&&!gameOver}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Status ── */}
      {!gameOver && (
        <StatusBanner
          status={status}
          color={curPlayer?.color||color}
          name={curPlayer?.name||''}
          thinking={status==='thinking'}
        />
      )}

      {/* ── Board area ── */}
      <div style={{
        flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        overflow:'hidden',position:'relative',minHeight:0,
      }}>
        {children}
      </div>

      {/* ── Bottom controls ── */}
      <div style={{
        display:'flex',gap:8,padding:'8px 12px 12px',flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(0,0,0,0.15)',
      }}>
        {onUndo&&(
          <button onClick={onUndo} disabled={!canUndo} style={{
            flex:1,padding:'11px 0',borderRadius:12,
            border:'1px solid rgba(255,255,255,0.1)',
            background:canUndo?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.03)',
            color:canUndo?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.2)',
            fontSize:13,fontWeight:700,cursor:canUndo?'pointer':'default',fontFamily:'inherit',
          }}>↩ Undo</button>
        )}
        {extraControls}
        <button onClick={onRestart} style={{
          flex:2,padding:'11px 0',borderRadius:12,border:'none',
          background:`linear-gradient(135deg,${color},${color}cc)`,
          color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
          boxShadow:`0 3px 16px ${color}35`,
        }}>
          {gameOver?'▶ Play Again':'↺ New Game'}
        </button>
      </div>

      {/* ── Victory Modal ── */}
      {gameOver&&(
        <VictoryModal
          winner={winner} isDraw={winnerIsDraw} gameColor={color}
          players={players.map(p=>({name:p.name,score:p.score,color:p.color||color}))}
          onRestart={onRestart} onExit={onExit}
          extraInfo={winnerExtraInfo}
        />
      )}

      <style>{`
        @keyframes shellPulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes shellPopIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}

// Named exports for sub-components
export { PlayerChip, StatusBanner, VictoryModal, Timer, Confetti }
