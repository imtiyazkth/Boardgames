import { useState } from 'react'
import { audioEngine } from '../core/AudioEngine.js'

const DIFFICULTY_INFO = {
  beginner: { label:'Beginner', icon:'🌱', desc:'Learns as you play', color:'#4caf50' },
  easy:     { label:'Easy',     icon:'😊', desc:'Good for warm-up',   color:'#8bc34a' },
  normal:   { label:'Normal',   icon:'🤔', desc:'Balanced challenge', color:'#ff9800' },
  hard:     { label:'Hard',     icon:'😤', desc:'Tough opponent',     color:'#f44336' },
  expert:   { label:'Expert',   icon:'💀', desc:'Near-perfect play',  color:'#9c27b0' },
}

const MODE_INFO = {
  solo:    { label:'vs AI',     icon:'🤖', desc:'Play against the computer' },
  local2p: { label:'2 Players', icon:'👥', desc:'Play on one device' },
  aiVsAi:  { label:'AI vs AI',  icon:'🔁', desc:'Watch two AIs battle' },
}

export default function GameSetup({ game, onStart, onCancel }) {
  const [mode, setMode]   = useState(game.modes[0])
  const [diff, setDiff]   = useState('normal')
  const [p1, setP1]       = useState('Player 1')
  const [p2, setP2]       = useState('Player 2')
  const [showTips, setShowTips] = useState(false)

  const availDiff = game.difficulties || ['normal']

  function handleStart() {
    audioEngine.play('game_start')
    onStart({ mode, difficulty: diff, playerNames: [p1, p2] })
  }

  const diffInfo = DIFFICULTY_INFO[diff] || DIFFICULTY_INFO.normal

  return (
    <div style={overlay} onClick={e => e.target===e.currentTarget && onCancel()}>
      <div style={modal}>

        {/* Header */}
        <div style={header}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:40, lineHeight:1,
              filter:`drop-shadow(0 0 12px ${game.color}80)` }}>{game.emoji}</div>
            <div>
              <div style={gameTitle}>{game.name}</div>
              <div style={gameDesc}>{game.description}</div>
            </div>
          </div>
          <button onClick={() => { audioEngine.play('ui_cancel'); onCancel() }} style={closeBtn}>✕</button>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:`linear-gradient(90deg,${game.color}40,transparent)`, marginBottom:18 }} />

        {/* Mode selection */}
        <SectionLabel>Game Mode</SectionLabel>
        <div style={modeGrid}>
          {game.modes.map(m => {
            const info = MODE_INFO[m] || {}
            const active = mode === m
            return (
              <button key={m} onClick={() => { audioEngine.play('ui_click'); setMode(m) }}
                style={{
                  ...modeCard,
                  background: active ? `${game.color}25` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? game.color : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: active ? `0 0 16px ${game.color}30` : 'none',
                }}>
                <div style={{ fontSize:22 }}>{info.icon}</div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:12, marginTop:4 }}>{info.label}</div>
                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginTop:2 }}>{info.desc}</div>
                {active && <div style={{ position:'absolute', top:6, right:6, width:8, height:8,
                  borderRadius:'50%', background: game.color }} />}
              </button>
            )
          })}
        </div>

        {/* Difficulty */}
        {mode !== 'local2p' && availDiff.length > 1 && (
          <>
            <SectionLabel>AI Difficulty</SectionLabel>
            <div style={diffRow}>
              {availDiff.map(d => {
                const info = DIFFICULTY_INFO[d] || {}
                const active = diff === d
                return (
                  <button key={d} onClick={() => { audioEngine.play('ui_click'); setDiff(d) }}
                    style={{
                      ...diffChip,
                      background: active ? `${info.color}30` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${active ? info.color : 'rgba(255,255,255,0.1)'}`,
                      color: active ? info.color : 'rgba(255,255,255,0.5)',
                      fontWeight: active ? 700 : 500,
                    }}>
                    {info.icon} {info.label}
                  </button>
                )
              })}
            </div>
            {/* Difficulty desc pill */}
            <div style={diffDescPill}>
              <span style={{ color: diffInfo.color }}>{diffInfo.icon}</span>
              <span style={{ color:'rgba(255,255,255,0.55)', fontSize:12 }}>{diffInfo.desc}</span>
            </div>
          </>
        )}

        {/* Player names */}
        <SectionLabel>
          {mode === 'local2p' ? 'Player Names' : 'Your Name'}
        </SectionLabel>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <PlayerInput value={p1} onChange={setP1} placeholder="Player 1" color={game.color} prefix="P1" />
          {mode === 'local2p' && (
            <PlayerInput value={p2} onChange={setP2} placeholder="Player 2" color="#607d8b" prefix="P2" />
          )}
        </div>

        {/* Tutorial accordion */}
        {game.tutorialSteps?.length > 0 && (
          <div style={{ marginTop:14 }}>
            <button onClick={() => setShowTips(!showTips)} style={tutToggle}>
              <span>📖 How to Play</span>
              <span style={{ opacity:0.5 }}>{showTips ? '▲' : '▼'}</span>
            </button>
            {showTips && (
              <div style={tutBody}>
                {game.tutorialSteps.map((s,i) => (
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
                    <span style={{ color: game.color, fontWeight:700, minWidth:18 }}>{i+1}.</span>
                    <span style={{ color:'rgba(255,255,255,0.6)', fontSize:12, lineHeight:1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:'flex', gap:10, marginTop:18 }}>
          <button onClick={() => { audioEngine.play('ui_cancel'); onCancel() }}
            style={cancelBtn}>← Back</button>
          <button onClick={handleStart} style={{
            ...startBtn,
            background:`linear-gradient(135deg, ${game.color} 0%, ${game.color}cc 100%)`,
            boxShadow:`0 4px 20px ${game.color}50`,
          }}>
            ▶ Start Game
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ color:'rgba(255,255,255,0.38)', fontSize:10, textTransform:'uppercase',
      letterSpacing:1.5, marginBottom:8, marginTop:14, fontWeight:700 }}>{children}</div>
  )
}

function PlayerInput({ value, onChange, placeholder, color, prefix }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:`${color}30`,
        border:`1px solid ${color}50`, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:10, fontWeight:800, color, flexShrink:0 }}>
        {prefix}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{
          flex:1, padding:'9px 12px', borderRadius:10,
          background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
          color:'#fff', fontSize:14, outline:'none',
        }} />
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const overlay = {
  position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
  display:'flex', alignItems:'center', justifyContent:'center',
  zIndex:100, padding:16,
}
const modal = {
  background:'linear-gradient(180deg,#141826 0%,#0f1320 100%)',
  borderRadius:20, padding:20, width:'100%', maxWidth:400,
  border:'1px solid rgba(255,255,255,0.1)',
  boxShadow:'0 32px 80px rgba(0,0,0,0.7)',
  maxHeight:'92vh', overflowY:'auto',
}
const header = {
  display:'flex', justifyContent:'space-between',
  alignItems:'flex-start', marginBottom:14, gap:8,
}
const gameTitle = {
  color:'#fff', fontWeight:900, fontSize:20, lineHeight:1.1, marginBottom:3,
}
const gameDesc = {
  color:'rgba(255,255,255,0.38)', fontSize:12, lineHeight:1.4,
}
const closeBtn = {
  background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff', width:30, height:30, borderRadius:'50%',
  cursor:'pointer', fontSize:13, flexShrink:0,
  display:'flex', alignItems:'center', justifyContent:'center',
}
const modeGrid = {
  display:'grid', gridTemplateColumns:`repeat(auto-fit,minmax(90px,1fr))`, gap:8,
}
const modeCard = {
  display:'flex', flexDirection:'column', alignItems:'center',
  padding:'12px 8px', borderRadius:12, cursor:'pointer',
  transition:'all 0.15s', position:'relative',
}
const diffRow = {
  display:'flex', gap:6, flexWrap:'wrap',
}
const diffChip = {
  padding:'6px 12px', borderRadius:20, fontSize:12,
  cursor:'pointer', transition:'all 0.15s', fontWeight:600,
}
const diffDescPill = {
  display:'flex', alignItems:'center', gap:6, marginTop:8,
  background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'6px 10px',
}
const tutToggle = {
  width:'100%', display:'flex', justifyContent:'space-between',
  padding:'9px 12px', borderRadius:10, background:'rgba(255,215,0,0.07)',
  border:'1px solid rgba(255,215,0,0.18)', color:'rgba(255,215,0,0.9)',
  fontSize:13, fontWeight:600, cursor:'pointer',
}
const tutBody = {
  padding:'10px 12px', background:'rgba(255,215,0,0.04)',
  border:'1px solid rgba(255,215,0,0.1)', borderRadius:'0 0 10px 10px',
  borderTop:'none', marginTop:0,
}
const cancelBtn = {
  flex:1, padding:'13px 0', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)',
  background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)',
  fontSize:14, fontWeight:700, cursor:'pointer',
}
const startBtn = {
  flex:2, padding:'13px 0', borderRadius:12, border:'none',
  color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer',
  letterSpacing:0.3,
}
