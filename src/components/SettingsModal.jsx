import { useState, useEffect } from 'react'
import { audioEngine } from '../core/AudioEngine.js'
import { FULL_VERSION, BUILD_STAMP } from '../core/Version.js'

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState(() => audioEngine.getSettings())

  function update(partial) {
    const next = { ...settings, ...partial }
    setSettings(next)
    audioEngine.setSettings(next)
    audioEngine.play('ui_toggle')
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) { audioEngine.play('ui_close'); onClose() } }}>
      <div style={modal}>
        <div style={modalHeader}>
          <span style={{ color:'#fff', fontSize:18, fontWeight:700 }}>⚙️ Settings</span>
          <button onClick={() => { audioEngine.play('ui_close'); onClose() }} style={closeBtn}>✕</button>
        </div>

        <Section label="🔊 Sound Effects">
          <Row label="Sound Effects" right={
            <Toggle on={settings.sfxEnabled} onToggle={() => update({ sfxEnabled: !settings.sfxEnabled })} />
          } />
          <Row label={`Master Volume — ${Math.round(settings.masterVolume * 100)}%`} right={
            <input type="range" min={0} max={100} value={Math.round(settings.masterVolume * 100)}
              onChange={e => update({ masterVolume: Number(e.target.value) / 100 })}
              style={slider} />
          } />
          <Row label={`SFX Volume — ${Math.round(settings.sfxVolume * 100)}%`} right={
            <input type="range" min={0} max={100} value={Math.round(settings.sfxVolume * 100)}
              onChange={e => update({ sfxVolume: Number(e.target.value) / 100 })}
              style={slider} />
          } />
        </Section>

        <Section label="📳 Haptics">
          <Row label="Vibration Feedback" right={
            <Toggle on={settings.vibration} onToggle={() => update({ vibration: !settings.vibration })} />
          } />
        </Section>

        <Section label="🧪 Test Sounds">
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              ['Move',    'piece_move'],
              ['Capture', 'piece_capture'],
              ['Win',     'game_win'],
              ['Dice',    'dice_roll'],
              ['Mill',    'morris_mill'],
              ['Pocket',  'carrom_pocket'],
            ].map(([label, id]) => (
              <button key={id} onClick={() => audioEngine.play(id)} style={testBtn}>
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section label="ℹ️ About">
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, lineHeight:1.7 }}>
            <div>Classic Board Games</div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontWeight:600 }}>{FULL_VERSION}</div>
            <div style={{ fontSize:11, marginTop:4 }}>Build {BUILD_STAMP}</div>
            <div style={{ marginTop:6 }}>100% offline · No accounts · No ads</div>
            <div style={{ marginTop:2 }}>Audio: Web Audio API (procedural synthesis)</div>
          </div>
        </Section>

        <button onClick={() => { audioEngine.play('ui_confirm'); onClose() }} style={doneBtn}>
          Done
        </button>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, textTransform:'uppercase',
        letterSpacing:1, marginBottom:8, fontWeight:600 }}>{label}</div>
      {children}
    </div>
  )
}

function Row({ label, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      marginBottom:10, gap:12 }}>
      <span style={{ color:'rgba(255,255,255,0.75)', fontSize:14 }}>{label}</span>
      <div style={{ flexShrink:0 }}>{right}</div>
    </div>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', position:'relative',
      background: on ? '#4caf50' : 'rgba(255,255,255,0.15)', transition:'background 0.2s'
    }}>
      <div style={{
        position:'absolute', top:3, left: on ? 23 : 3, width:18, height:18, borderRadius:'50%',
        background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)'
      }} />
    </button>
  )
}

const overlay = {
  position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
  display:'flex', alignItems:'flex-end', justifyContent:'center',
  zIndex:200, padding:16
}
const modal = {
  background:'#1e2a3a', borderRadius:'20px 20px 16px 16px', padding:20,
  width:'100%', maxWidth:420, maxHeight:'88vh', overflowY:'auto',
  border:'1px solid rgba(255,255,255,0.1)',
  boxShadow:'0 -8px 40px rgba(0,0,0,0.5)'
}
const modalHeader = {
  display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20
}
const closeBtn = {
  background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
  width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:14
}
const slider = { width:130, accentColor:'#4caf50' }
const testBtn = {
  padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.15)',
  background:'rgba(255,255,255,0.07)', color:'#fff', fontSize:12, cursor:'pointer'
}
const doneBtn = {
  width:'100%', padding:'13px 0', borderRadius:12, border:'none',
  background:'#4caf50', color:'#fff', fontSize:16, fontWeight:700, cursor:'pointer', marginTop:4
}
