import { useState } from 'react'
import { audioEngine } from '../core/AudioEngine.js'

const MODE_INFO = {
  solo:    { label:'vs AI',       icon:'🤖', desc:'Play against the computer' },
  local2p: { label:'2 Players',   icon:'👥', desc:'Pass & play on one device'  },
  local3p: { label:'3 Players',   icon:'👨‍👩‍👦', desc:'3 players on one device'   },
  local4p: { label:'4 Players',   icon:'👨‍👩‍👧‍👦', desc:'4 players on one device'   },
  aiVsAi:  { label:'AI vs AI',    icon:'🔁', desc:'Watch two AIs battle'        },
}

const DIFF_INFO = {
  beginner:{ label:'Beginner', icon:'🌱', desc:'Very easy — learn the game', color:'#4caf50' },
  easy:    { label:'Easy',     icon:'😊', desc:'Good for warm-up',           color:'#8bc34a' },
  normal:  { label:'Normal',   icon:'🤔', desc:'Balanced challenge',         color:'#ff9800' },
  hard:    { label:'Hard',     icon:'😤', desc:'Tough opponent',             color:'#f44336' },
  expert:  { label:'Expert',   icon:'💀', desc:'Near-perfect play',          color:'#9c27b0' },
}

const PLAYER_COLORS = ['#e53935','#1565c0','#2e7d32','#f9a825']

export default function GameSetup({ game, onStart, onCancel }) {
  const hasMultiPlayer = game.players && game.players.length > 1
  const maxPlayers     = game.players ? Math.max(...game.players) : 2
  const minPlayers     = game.players ? Math.min(...game.players) : 2

  // Build available modes
  const availModes = []
  if (game.modes.includes('solo'))   availModes.push('solo')
  if (maxPlayers >= 2 && game.modes.includes('local2p')) availModes.push('local2p')
  if (maxPlayers >= 3)               availModes.push('local3p')
  if (maxPlayers >= 4)               availModes.push('local4p')
  if (game.modes.includes('aiVsAi')) availModes.push('aiVsAi')

  const [mode,    setMode]    = useState(availModes[0])
  const [diff,    setDiff]    = useState('normal')
  const [showTip, setShowTip] = useState(false)

  // Dynamic player count from mode
  const playerCount = mode==='local3p' ? 3 : mode==='local4p' ? 4 : 2
  const isMultiLocal = mode.startsWith('local')

  const [names, setNames] = useState(['Player 1','Player 2','Player 3','Player 4'])
  const setName = (i, v) => setNames(n => { const a=[...n]; a[i]=v; return a })

  const availDiff = game.difficulties || ['normal']

  function handleStart() {
    audioEngine.play('game_start')
    onStart({
      mode,
      difficulty: diff,
      playerCount,
      playerNames: isMultiLocal
        ? names.slice(0, playerCount)
        : [names[0], 'AI'],
    })
  }

  const diffInfo = DIFF_INFO[diff] || DIFF_INFO.normal

  return (
    <div onClick={e => e.target===e.currentTarget && onCancel()}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',
        display:'flex',alignItems:'center',justifyContent:'center',
        zIndex:100,padding:16 }}>
      <div style={{
        background:'linear-gradient(180deg,#141826 0%,#0f1320 100%)',
        borderRadius:20,padding:20,width:'100%',maxWidth:400,
        border:'1px solid rgba(255,255,255,0.1)',
        boxShadow:'0 32px 80px rgba(0,0,0,0.7)',
        maxHeight:'92vh',overflowY:'auto',
      }}>

        {/* Header */}
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ fontSize:40,lineHeight:1,filter:`drop-shadow(0 0 12px ${game.color}80)` }}>
              {game.emoji}
            </div>
            <div>
              <div style={{ color:'#fff',fontWeight:900,fontSize:20,lineHeight:1.1,marginBottom:3 }}>
                {game.name}
              </div>
              <div style={{ color:'rgba(255,255,255,0.38)',fontSize:12,lineHeight:1.4 }}>
                {game.description}
              </div>
            </div>
          </div>
          <button onClick={() => { audioEngine.play('ui_cancel'); onCancel() }} style={{
            background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
            color:'#fff',width:30,height:30,borderRadius:'50%',
            cursor:'pointer',fontSize:13,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
          }}>✕</button>
        </div>

        {/* Divider */}
        <div style={{ height:1,background:`linear-gradient(90deg,${game.color}40,transparent)`,marginBottom:18 }}/>

        {/* Mode selection */}
        <Label>Game Mode</Label>
        <div style={{ display:'grid',gridTemplateColumns:`repeat(${Math.min(availModes.length,3)},1fr)`,gap:8,marginBottom:4 }}>
          {availModes.map(m => {
            const info = MODE_INFO[m] || {}
            const active = mode === m
            return (
              <button key={m} onClick={() => { audioEngine.play('ui_click'); setMode(m) }} style={{
                display:'flex',flexDirection:'column',alignItems:'center',
                padding:'11px 6px',borderRadius:12,cursor:'pointer',
                transition:'all 0.15s',position:'relative',border:'none',
                background: active ? `${game.color}25` : 'rgba(255,255,255,0.04)',
                outline: `1px solid ${active ? game.color : 'rgba(255,255,255,0.1)'}`,
                boxShadow: active ? `0 0 16px ${game.color}30` : 'none',
              }}>
                <div style={{ fontSize:22,marginBottom:3 }}>{info.icon}</div>
                <div style={{ color:'#fff',fontWeight:700,fontSize:11,textAlign:'center',lineHeight:1.2 }}>
                  {info.label}
                </div>
                {active && (
                  <div style={{ position:'absolute',top:6,right:6,width:7,height:7,
                    borderRadius:'50%',background:game.color,
                    boxShadow:`0 0 8px ${game.color}` }}/>
                )}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize:11,color:'rgba(255,255,255,0.3)',textAlign:'center',marginBottom:4,padding:'4px 0' }}>
          {MODE_INFO[mode]?.desc}
        </div>

        {/* Difficulty — only for AI modes */}
        {mode !== 'local2p' && mode !== 'local3p' && mode !== 'local4p' && availDiff.length > 1 && (
          <>
            <Label>AI Difficulty</Label>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:8 }}>
              {availDiff.map(d => {
                const info = DIFF_INFO[d] || {}
                const active = diff === d
                return (
                  <button key={d} onClick={() => { audioEngine.play('ui_click'); setDiff(d) }} style={{
                    padding:'6px 12px',borderRadius:20,fontSize:12,cursor:'pointer',
                    transition:'all 0.15s',fontWeight:active?700:500,
                    background: active ? `${info.color}30` : 'rgba(255,255,255,0.06)',
                    border:`1px solid ${active ? info.color : 'rgba(255,255,255,0.1)'}`,
                    color: active ? info.color : 'rgba(255,255,255,0.5)',
                  }}>
                    {info.icon} {info.label}
                  </button>
                )
              })}
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4,
              background:'rgba(255,255,255,0.04)',borderRadius:10,padding:'6px 10px' }}>
              <span style={{ color:diffInfo.color }}>{diffInfo.icon}</span>
              <span style={{ color:'rgba(255,255,255,0.55)',fontSize:12 }}>{diffInfo.desc}</span>
            </div>
          </>
        )}

        {/* Player names */}
        <Label>
          {isMultiLocal
            ? `Player Names (${playerCount} players)`
            : 'Your Name'}
        </Label>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {Array.from({ length: isMultiLocal ? playerCount : 1 }, (_, i) => (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:8 }}>
              <div style={{
                width:28,height:28,borderRadius:8,flexShrink:0,
                background:`${PLAYER_COLORS[i]}30`,
                border:`1px solid ${PLAYER_COLORS[i]}60`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:10,fontWeight:800,color:PLAYER_COLORS[i],
              }}>P{i+1}</div>
              <input
                value={names[i]}
                onChange={e => setName(i, e.target.value)}
                placeholder={`Player ${i+1}`}
                style={{
                  flex:1,padding:'9px 12px',borderRadius:10,
                  background:'rgba(255,255,255,0.07)',
                  border:'1px solid rgba(255,255,255,0.12)',
                  color:'#fff',fontSize:14,outline:'none',
                  fontFamily:'inherit',
                }}
              />
            </div>
          ))}
          {/* AI slot label */}
          {mode === 'solo' && (
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <div style={{ width:28,height:28,borderRadius:8,flexShrink:0,
                background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:14 }}>🤖</div>
              <div style={{ flex:1,padding:'9px 12px',borderRadius:10,
                background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',
                color:'rgba(255,255,255,0.3)',fontSize:14 }}>
                AI Opponent · {diffInfo.label}
              </div>
            </div>
          )}
        </div>

        {/* How to play toggle */}
        {game.tutorialSteps?.length > 0 && (
          <div style={{ marginTop:14 }}>
            <button onClick={() => setShowTip(!showTip)} style={{
              width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'9px 12px',borderRadius:10,
              background:'rgba(255,215,0,0.07)',
              border:'1px solid rgba(255,215,0,0.18)',
              color:'rgba(255,215,0,0.9)',fontSize:13,fontWeight:600,cursor:'pointer',
              fontFamily:'inherit',
            }}>
              <span>📖 How to Play</span>
              <span style={{ opacity:0.5 }}>{showTip?'▲':'▼'}</span>
            </button>
            {showTip && (
              <div style={{ padding:'10px 12px',
                background:'rgba(255,215,0,0.04)',
                border:'1px solid rgba(255,215,0,0.1)',
                borderRadius:'0 0 10px 10px',borderTop:'none' }}>
                {game.tutorialSteps.map((s,i)=>(
                  <div key={i} style={{ display:'flex',gap:8,marginBottom:6 }}>
                    <span style={{ color:game.color,fontWeight:700,minWidth:18,fontSize:12 }}>{i+1}.</span>
                    <span style={{ color:'rgba(255,255,255,0.6)',fontSize:12,lineHeight:1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:'flex',gap:10,marginTop:18 }}>
          <button onClick={() => { audioEngine.play('ui_cancel'); onCancel() }} style={{
            flex:1,padding:'13px 0',borderRadius:12,
            border:'1px solid rgba(255,255,255,0.12)',
            background:'rgba(255,255,255,0.06)',
            color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,cursor:'pointer',
            fontFamily:'inherit',
          }}>← Back</button>
          <button onClick={handleStart} style={{
            flex:2,padding:'13px 0',borderRadius:12,border:'none',
            background:`linear-gradient(135deg,${game.color} 0%,${game.color}cc 100%)`,
            color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',
            boxShadow:`0 4px 20px ${game.color}50`,fontFamily:'inherit',
            letterSpacing:0.3,
          }}>▶ Start Game</button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return (
    <div style={{ color:'rgba(255,255,255,0.38)',fontSize:10,textTransform:'uppercase',
      letterSpacing:1.5,marginBottom:8,marginTop:14,fontWeight:700 }}>{children}</div>
  )
}
