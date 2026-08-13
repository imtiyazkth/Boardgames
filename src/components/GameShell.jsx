/**
 * GameShell — Universal premium in-game wrapper
 * Drop this around any game's board area to get:
 *   • Premium header (back, title, score/turn, timer)
 *   • Animated turn banner
 *   • Victory / draw modal with confetti
 *   • Bottom controls row (undo, restart, hint toggle)
 *   • Consistent dark gradient background
 *
 * Usage:
 *   <GameShell
 *     title="Chess"
 *     emoji="♟"
 *     color="#607d8b"
 *     players={[{name:'You',score:2,color:'#fff'},{name:'AI',score:1,color:'#90caf9'}]}
 *     currentPlayerIdx={0}
 *     status="check"          // 'check'|'thinking'|'your-turn'|'opponent-turn'|null
 *     gameOver={false}
 *     winner={null}           // {name, emoji} or null for draw
 *     onExit={fn}
 *     onRestart={fn}
 *     onUndo={fn}             // omit to hide undo
 *     canUndo={true}
 *     showTimer={true}
 *     elapsed={42}            // seconds
 *     extraBadge="🤖 vs AI · hard"
 *   >
 *     {board JSX}
 *   </GameShell>
 */
import { useState, useEffect, useRef } from 'react'

// ── tiny confetti ──────────────────────────────────────────────────────────
function Confetti({ active }) {
  const pieces = useRef([...Array(28)].map((_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.2 + Math.random() * 1.0,
    size: 6 + Math.random() * 8,
    color: ['#f5c842','#e94560','#4fc3f7','#81c784','#ce93d8','#ffb74d'][i%6],
    rot: Math.random() * 360,
  }))).current

  if (!active) return null
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:10 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position:'absolute',
          left: `${p.x}%`, top: '-10px',
          width: p.size, height: p.size * 0.5,
          background: p.color,
          borderRadius: 2,
          transform: `rotate(${p.rot}deg)`,
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
      <style>{`
        @keyframes confettiFall {
          to { top: 110%; transform: rotate(${Math.random()*720}deg); opacity:0; }
        }
        @keyframes popIn {
          from { transform: scale(0.7); opacity:0; }
          to   { transform: scale(1);   opacity:1; }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 12px currentColor; }
          50%      { box-shadow: 0 0 28px currentColor; }
        }
        @keyframes slideDown {
          from { transform: translateY(-8px); opacity:0; }
          to   { transform: translateY(0);    opacity:1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>
    </div>
  )
}

// ── Player chip ────────────────────────────────────────────────────────────
function PlayerChip({ name, score, color, active, isAI }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
      padding:'6px 10px', borderRadius:12, transition:'all 0.2s',
      background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
      boxShadow: active ? `0 0 14px ${color}40` : 'none',
      minWidth: 64,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: active ? color : 'rgba(255,255,255,0.4)',
        letterSpacing: 0.3, maxWidth: 70, overflow:'hidden',
        textOverflow:'ellipsis', whiteSpace:'nowrap'
      }}>
        {isAI ? '🤖 ' : ''}{name}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 900, color: active ? '#fff' : 'rgba(255,255,255,0.25)',
        lineHeight: 1,
      }}>{score ?? ''}</div>
      {active && (
        <div style={{
          width: 6, height: 6, borderRadius:'50%', background: color,
          animation:'pulseGlow 1.2s ease-in-out infinite',
          color: color,
        }}/>
      )}
    </div>
  )
}

// ── Timer display ──────────────────────────────────────────────────────────
function Timer({ elapsed, color }) {
  const m = String(Math.floor(elapsed / 60)).padStart(2,'0')
  const s = String(elapsed % 60).padStart(2,'0')
  return (
    <div style={{
      fontFamily:'monospace', fontSize:13, fontWeight:700,
      color: elapsed > 300 ? '#e94560' : 'rgba(255,255,255,0.45)',
      letterSpacing:1, padding:'2px 8px', borderRadius:8,
      background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.06)',
    }}>{m}:{s}</div>
  )
}

// ── Status banner ──────────────────────────────────────────────────────────
function StatusBanner({ status, currentPlayer, gameColor, thinking }) {
  const map = {
    'your-turn':       { text: `${currentPlayer}'s Turn`, color: gameColor,     icon:'🎯' },
    'opponent-turn':   { text: `${currentPlayer}'s Turn`, color:'rgba(255,255,255,0.5)', icon:'⏳' },
    'thinking':        { text: 'AI thinking…',            color:'rgba(255,255,255,0.4)', icon:'🤔' },
    'check':           { text: '⚠️ Check!',               color:'#e94560',      icon:''  },
    'roll':            { text: 'Tap dice to roll',        color: gameColor,     icon:'🎲' },
  }
  const info = map[status] || { text:'', color:'transparent', icon:'' }

  return (
    <div style={{
      height: 32, display:'flex', alignItems:'center', justifyContent:'center',
      animation: 'slideDown 0.25s ease',
    }}>
      {info.text && (
        <div style={{
          display:'flex', alignItems:'center', gap:5,
          fontSize:13, fontWeight:700, color: info.color,
        }}>
          {info.icon && <span>{info.icon}</span>}
          <span>{info.text}</span>
          {thinking && <span style={{ opacity:0.5 }}>···</span>}
        </div>
      )}
    </div>
  )
}

// ── Victory Modal ──────────────────────────────────────────────────────────
function VictoryModal({ winner, gameColor, onRestart, onExit, players }) {
  const isDraw = !winner
  return (
    <div style={{
      position:'absolute', inset:0, background:'rgba(0,0,0,0.82)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:50, padding:20,
    }}>
      <Confetti active={!isDraw}/>
      <div style={{
        background:'linear-gradient(160deg,#1a1e30 0%,#0f1220 100%)',
        borderRadius:24, padding:'28px 24px', width:'100%', maxWidth:320,
        border:`2px solid ${isDraw?'rgba(255,255,255,0.1)':gameColor}`,
        boxShadow:`0 20px 60px ${isDraw?'rgba(0,0,0,0.7)':`${gameColor}40`}`,
        animation:'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        position:'relative', textAlign:'center',
      }}>
        <div style={{ fontSize:56, lineHeight:1, marginBottom:12 }}>
          {isDraw ? '🤝' : '🏆'}
        </div>
        <div style={{
          fontSize:22, fontWeight:900, color:'#fff',
          marginBottom:6, letterSpacing:-0.5,
        }}>
          {isDraw ? "It's a Draw!" : `${winner.name} Wins!`}
        </div>
        {!isDraw && (
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>
            {winner.detail || ''}
          </div>
        )}

        {/* Score recap */}
        {players && (
          <div style={{
            display:'flex', gap:8, justifyContent:'center', margin:'14px 0',
          }}>
            {players.map((p,i) => (
              <div key={i} style={{
                flex:1, padding:'8px 6px', borderRadius:12,
                background:`${p.color}15`,
                border:`1px solid ${p.color}30`,
              }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:700, marginBottom:2 }}>{p.name}</div>
                <div style={{ fontSize:22, fontWeight:900, color: p.color }}>{p.score}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={onExit} style={{
            flex:1, padding:'12px 0', borderRadius:12,
            border:'1px solid rgba(255,255,255,0.12)',
            background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)',
            fontSize:14, fontWeight:700, cursor:'pointer',
          }}>🏠 Home</button>
          <button onClick={onRestart} style={{
            flex:2, padding:'12px 0', borderRadius:12, border:'none',
            background:`linear-gradient(135deg,${gameColor},${gameColor}cc)`,
            color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer',
            boxShadow:`0 4px 20px ${gameColor}50`,
          }}>▶ Play Again</button>
        </div>
      </div>
    </div>
  )
}

// ── Main GameShell ─────────────────────────────────────────────────────────
export default function GameShell({
  title, emoji = '🎮', color = '#6366f1',
  players = [],           // [{name, score, color, isAI}]
  currentPlayerIdx = 0,
  status = null,          // 'your-turn'|'opponent-turn'|'thinking'|'check'|'roll'
  gameOver = false,
  winner = null,          // {name, detail} or null for draw
  onExit, onRestart, onUndo,
  canUndo = false,
  showTimer = false,
  elapsed = 0,
  extraBadge = '',
  children,
}) {
  const currentPlayer = players[currentPlayerIdx]?.name || ''

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%', position:'relative',
      background:`linear-gradient(160deg, ${color}18 0%, #0a0b14 35%, #0d1020 100%)`,
      userSelect:'none', overflow:'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'10px 14px 8px', flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(0,0,0,0.2)',
      }}>
        <button onClick={onExit} style={{
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)',
          color:'#fff', fontSize:18, width:36, height:36, borderRadius:10,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>←</button>

        <div style={{ flex:1, display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ fontSize:20, lineHeight:1, filter:`drop-shadow(0 0 8px ${color}80)` }}>{emoji}</span>
          <span style={{ color:'#fff', fontWeight:800, fontSize:17, letterSpacing:-0.3 }}>{title}</span>
        </div>

        {showTimer && <Timer elapsed={elapsed} color={color}/>}
      </div>

      {/* ── Player scoreboard ── */}
      {players.length > 0 && (
        <div style={{
          display:'flex', gap:8, padding:'8px 14px 4px',
          justifyContent: players.length===2 ? 'space-between' : 'center',
          flexShrink:0, alignItems:'center',
        }}>
          {players.length === 2 ? (
            <>
              <PlayerChip {...players[0]} active={currentPlayerIdx===0 && !gameOver}/>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <div style={{ color:'rgba(255,255,255,0.15)', fontSize:11, fontWeight:700 }}>VS</div>
                {extraBadge && (
                  <div style={{
                    fontSize:9, color:'rgba(255,255,255,0.25)', fontWeight:600,
                    letterSpacing:0.5, textTransform:'uppercase', textAlign:'center',
                    maxWidth:70, lineHeight:1.4,
                  }}>{extraBadge}</div>
                )}
              </div>
              <PlayerChip {...players[1]} active={currentPlayerIdx===1 && !gameOver}/>
            </>
          ) : (
            <div style={{ display:'flex', gap:6 }}>
              {players.map((p,i)=>(
                <PlayerChip key={i} {...p} active={currentPlayerIdx===i && !gameOver}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Status banner ── */}
      {!gameOver && (
        <StatusBanner
          status={status}
          currentPlayer={currentPlayer}
          gameColor={color}
          thinking={status==='thinking'}
        />
      )}

      {/* ── Board / game content ── */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        overflow:'hidden', position:'relative', minHeight:0 }}>
        {children}
      </div>

      {/* ── Bottom controls ── */}
      <div style={{
        display:'flex', gap:8, padding:'8px 14px 12px',
        flexShrink:0, borderTop:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(0,0,0,0.15)',
      }}>
        {onUndo && (
          <button onClick={onUndo} disabled={!canUndo} style={{
            flex:1, padding:'11px 0', borderRadius:12,
            border:'1px solid rgba(255,255,255,0.1)',
            background: canUndo ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
            color: canUndo ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)',
            fontSize:13, fontWeight:700, cursor: canUndo ? 'pointer' : 'default',
          }}>↩ Undo</button>
        )}
        <button onClick={onRestart} style={{
          flex:2, padding:'11px 0', borderRadius:12, border:'none',
          background:`linear-gradient(135deg,${color},${color}cc)`,
          color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer',
          boxShadow:`0 3px 16px ${color}40`,
        }}>
          {gameOver ? '▶ Play Again' : '↺ New Game'}
        </button>
      </div>

      {/* ── Victory modal ── */}
      {gameOver && (
        <VictoryModal
          winner={winner}
          gameColor={color}
          onRestart={onRestart}
          onExit={onExit}
          players={players}
        />
      )}
    </div>
  )
}
