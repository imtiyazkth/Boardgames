import { useState } from 'react'
import { audioEngine } from '../core/AudioEngine.js'

export default function GameSetup({ game, onStart, onCancel }) {
  const [mode, setMode]   = useState(game.modes[0])
  const [diff, setDiff]   = useState('normal')
  const [p1, setP1]       = useState('Player 1')
  const [p2, setP2]       = useState('Player 2')

  const availDiff = game.difficulties || ['normal']

  function handleStart() {
    audioEngine.play('game_start')
    onStart({ mode, difficulty: diff, playerNames: [p1, p2] })
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ fontSize:44, textAlign:'center', lineHeight:1 }}>{game.emoji}</div>
        <h2 style={{ color:'#fff', textAlign:'center', fontSize:21, margin:'8px 0 4px', fontWeight:800 }}>
          {game.name}
        </h2>
        <p style={{ color:'rgba(255,255,255,0.45)', textAlign:'center', fontSize:13, marginBottom:18 }}>
          {game.description}
        </p>

        {/* Mode */}
        <Label>Game Mode</Label>
        <div style={row}>
          {game.modes.map(m => (
            <Chip key={m} active={mode===m} color={game.color}
              onClick={() => { audioEngine.play('ui_click'); setMode(m) }}>
              {m==='solo'?'🤖 vs AI':m==='local2p'?'👥 Local 2P':'🤖 vs 🤖'}
            </Chip>
          ))}
        </div>

        {/* Difficulty */}
        {mode !== 'local2p' && availDiff.length > 1 && (
          <>
            <Label>AI Difficulty</Label>
            <div style={row}>
              {availDiff.map(d => (
                <Chip key={d} active={diff===d} color={game.color}
                  onClick={() => { audioEngine.play('ui_click'); setDiff(d) }}>
                  {d[0].toUpperCase()+d.slice(1)}
                </Chip>
              ))}
            </div>
          </>
        )}

        {/* Player Names */}
        <Label>Player Name{mode==='local2p'?'s':''}</Label>
        <input value={p1} onChange={e=>setP1(e.target.value)}
          placeholder="Player 1" style={input} />
        {mode==='local2p' && (
          <input value={p2} onChange={e=>setP2(e.target.value)}
            placeholder="Player 2" style={{ ...input, marginTop:8 }} />
        )}

        {/* Tutorial */}
        {game.tutorialSteps?.length > 0 && (
          <div style={tutBox}>
            <div style={{ color:'#ffd700', fontSize:11, marginBottom:5, fontWeight:600 }}>📖 How to play</div>
            {game.tutorialSteps.slice(0,2).map((s,i) => (
              <div key={i} style={{ color:'rgba(255,255,255,0.55)', fontSize:12, marginBottom:3 }}>
                {i+1}. {s}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button onClick={() => { audioEngine.play('ui_cancel'); onCancel() }}
            style={{ ...btn, flex:1, background:'rgba(255,255,255,0.08)' }}>Cancel</button>
          <button onClick={handleStart}
            style={{ ...btn, flex:2, background:game.color, color:'#fff' }}>
            ▶ Start Game
          </button>
        </div>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, textTransform:'uppercase',
    letterSpacing:1, marginBottom:7, marginTop:13, fontWeight:600 }}>{children}</div>
}

function Chip({ children, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'7px 13px', borderRadius:20,
      background: active ? color+'55' : 'rgba(255,255,255,0.07)',
      border: `1px solid ${active ? color : 'rgba(255,255,255,0.14)'}`,
      color:'#fff', fontSize:13, cursor:'pointer', fontWeight:600, transition:'all 0.12s'
    }}>{children}</button>
  )
}

const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.82)',
  display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }
const modal = { background:'#1e2a3a', borderRadius:20, padding:22,
  width:'100%', maxWidth:390, border:'1px solid rgba(255,255,255,0.1)',
  boxShadow:'0 24px 60px rgba(0,0,0,0.6)', maxHeight:'92vh', overflowY:'auto' }
const row   = { display:'flex', gap:7, flexWrap:'wrap' }
const input = { width:'100%', padding:'10px 14px', borderRadius:10,
  background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)',
  color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box' }
const tutBox = { background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.14)',
  borderRadius:10, padding:12, marginTop:12 }
const btn   = { padding:'13px 0', borderRadius:12, border:'none',
  fontSize:15, fontWeight:700, cursor:'pointer', color:'rgba(255,255,255,0.85)' }
