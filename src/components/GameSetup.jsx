import { useState } from 'react'

export default function GameSetup({ game, onStart, onCancel }) {
  const [mode, setMode] = useState(game.modes[0])
  const [difficulty, setDifficulty] = useState('normal')
  const [p1, setP1] = useState('Player 1')
  const [p2, setP2] = useState('Player 2')

  const availModes = game.modes
  const availDiff = game.difficulties || ['normal']

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <div style={{ fontSize: 40, textAlign: 'center' }}>{game.emoji}</div>
        <h2 style={{ color: '#fff', textAlign: 'center', fontSize: 22, margin: '8px 0 4px' }}>
          {game.name}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 13, marginBottom: 20 }}>
          {game.description}
        </p>

        {/* Mode */}
        <label style={label}>Game Mode</label>
        <div style={row}>
          {availModes.map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ ...chip, background: mode === m ? game.color : 'rgba(255,255,255,0.08)',
                border: `1px solid ${mode === m ? game.color : 'rgba(255,255,255,0.15)'}` }}>
              {m === 'solo' ? '🤖 vs AI' : m === 'local2p' ? '👥 Local 2P' : '🤖 vs 🤖'}
            </button>
          ))}
        </div>

        {/* Difficulty */}
        {mode !== 'local2p' && availDiff.length > 1 && (
          <>
            <label style={label}>AI Difficulty</label>
            <div style={row}>
              {availDiff.map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  style={{ ...chip, background: difficulty === d ? game.color : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${difficulty === d ? game.color : 'rgba(255,255,255,0.15)'}` }}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Player Names */}
        <label style={label}>Player Names</label>
        <input value={p1} onChange={e => setP1(e.target.value)}
          placeholder="Player 1" style={input} />
        {mode === 'local2p' && (
          <input value={p2} onChange={e => setP2(e.target.value)}
            placeholder="Player 2" style={{ ...input, marginTop: 8 }} />
        )}

        {/* Tutorial snippets */}
        {game.tutorialSteps && (
          <div style={tutBox}>
            <div style={{ color: '#ffd700', fontSize: 12, marginBottom: 6 }}>📖 How to play</div>
            {game.tutorialSteps.slice(0, 2).map((s, i) => (
              <div key={i} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 3 }}>
                {i + 1}. {s}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} style={{ ...btn, flex: 1 }}>Cancel</button>
          <button
            onClick={() => onStart({ mode, difficulty, playerNames: [p1, p2] })}
            style={{ ...btn, flex: 2, background: game.color, color: '#fff' }}
          >
            ▶ Start Game
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100, padding: 16
}
const modal = {
  background: '#1e2a3a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380,
  border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  maxHeight: '90vh', overflowY: 'auto'
}
const label = { display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 12 }
const row = { display: 'flex', gap: 8, flexWrap: 'wrap' }
const chip = {
  padding: '8px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s'
}
const input = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box'
}
const btn = {
  padding: '13px 0', borderRadius: 12, border: 'none', fontSize: 15,
  fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff'
}
const tutBox = {
  background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)',
  borderRadius: 10, padding: 12, marginTop: 14
}
