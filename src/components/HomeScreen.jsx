import { useState } from 'react'
import { GAMES } from '../core/GameRegistry.js'
import { SaveSystem } from '../core/SaveSystem.js'
import { VERSION_LABEL } from '../core/Version.js'
import { audioEngine } from '../core/AudioEngine.js'

export default function HomeScreen({ onSelectGame, onOpenSettings }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const tags = ['all','quick','strategy','puzzle','dice','family','physics']

  const filtered = GAMES.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
                        g.tags.some(t => t.includes(search.toLowerCase()))
    const matchTag = filter === 'all' || g.tags.includes(filter)
    return matchSearch && matchTag
  })

  return (
    <div style={S.container}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroRow}>
          <div>
            <div style={S.heroIcon}>🎮</div>
            <h1 style={S.heroTitle}>Board Games</h1>
            <p style={S.heroSub}>Offline · AI-powered · All ages</p>
          </div>
          <button onClick={() => { audioEngine.play('ui_open'); onOpenSettings() }} style={S.settingsBtn}>
            ⚙️
          </button>
        </div>
        <div style={S.versionBadge}>{VERSION_LABEL}</div>
      </div>

      {/* Search */}
      <div style={S.searchRow}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search games…" style={S.searchInput} />
      </div>

      {/* Tag filters */}
      <div style={S.tagRow}>
        {tags.map(t => (
          <button key={t} onClick={() => { audioEngine.play('ui_click'); setFilter(t) }} style={{
            ...S.tag,
            background: filter===t ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${filter===t ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: filter===t ? '#fff' : 'rgba(255,255,255,0.5)'
          }}>{t}</button>
        ))}
      </div>

      {/* Game grid */}
      <div style={S.grid}>
        {filtered.map(game => (
          <GameCard key={game.id} game={game}
            onClick={() => { audioEngine.play('ui_confirm'); onSelectGame(game) }} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center',
            color:'rgba(255,255,255,0.3)', padding:48, fontSize:15 }}>
            No games found for "{search}"
          </div>
        )}
      </div>

      <div style={S.footer}>
        {GAMES.filter(g=>g.available).length} games ready · {GAMES.filter(g=>g.comingSoon).length} coming soon
      </div>
    </div>
  )
}

function GameCard({ game, onClick }) {
  const stats = SaveSystem.loadStats(game.id)
  return (
    <button disabled={!game.available && !game.comingSoon} onClick={onClick} style={{
      ...S.card,
      opacity: game.available ? 1 : 0.5,
      background: `linear-gradient(135deg,${game.color}1a 0%,rgba(255,255,255,0.03) 100%)`,
      border: `1px solid ${game.color}35`,
      cursor: game.available ? 'pointer' : 'default'
    }}>
      {game.comingSoon && (
        <div style={S.soonBadge}>SOON</div>
      )}
      <div style={{ fontSize:32, lineHeight:1 }}>{game.emoji}</div>
      <div style={S.cardName}>{game.name}</div>
      <div style={S.cardDesc}>{game.description.slice(0,42)}…</div>
      <div style={S.tagRow2}>
        {game.tags.slice(0,2).map(t => (
          <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:10,
            background:`${game.color}30`, color:game.color }}>{t}</span>
        ))}
      </div>
      {stats.played > 0 && (
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10, marginTop:4 }}>
          {stats.won}W / {stats.played}P
        </div>
      )}
    </button>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', height:'100%',
    background:'linear-gradient(180deg,#0d0d1a 0%,#1a1a2e 100%)', overflow:'hidden' },
  hero:{ padding:'16px 16px 10px', background:'linear-gradient(180deg,rgba(233,69,96,0.1) 0%,transparent 100%)' },
  heroRow:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  heroIcon:{ fontSize:30, lineHeight:1 },
  heroTitle:{ color:'#fff', fontSize:24, fontWeight:900, margin:'4px 0 2px', letterSpacing:-0.5 },
  heroSub:{ color:'rgba(255,255,255,0.38)', fontSize:12 },
  settingsBtn:{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
    color:'#fff', fontSize:20, width:42, height:42, borderRadius:12, cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'center' },
  versionBadge:{ display:'inline-block', fontSize:10, color:'rgba(255,255,255,0.25)',
    background:'rgba(255,255,255,0.06)', padding:'2px 8px', borderRadius:8,
    border:'1px solid rgba(255,255,255,0.1)', marginTop:6 },
  searchRow:{ padding:'8px 14px' },
  searchInput:{ width:'100%', padding:'9px 14px', borderRadius:12,
    background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)',
    color:'#fff', fontSize:15, outline:'none', boxSizing:'border-box' },
  tagRow:{ display:'flex', gap:6, padding:'0 14px 10px', overflowX:'auto' },
  tag:{ padding:'5px 12px', borderRadius:16, fontSize:11, cursor:'pointer',
    whiteSpace:'nowrap', fontWeight:600, transition:'all 0.12s' },
  grid:{ flex:1, display:'grid', gridTemplateColumns:'repeat(2,1fr)',
    gap:10, padding:'0 12px 12px', overflowY:'auto', alignContent:'start' },
  card:{ display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 10px',
    borderRadius:16, border:'1px solid rgba(255,255,255,0.08)', position:'relative',
    textAlign:'center', transition:'all 0.12s', userSelect:'none' },
  cardName:{ color:'#fff', fontWeight:700, fontSize:14, marginTop:6 },
  cardDesc:{ color:'rgba(255,255,255,0.4)', fontSize:11, marginTop:2, lineHeight:1.3 },
  tagRow2:{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap', justifyContent:'center' },
  soonBadge:{ position:'absolute', top:7, right:7, fontSize:9, fontWeight:700,
    background:'rgba(255,165,0,0.3)', color:'#ffa500', padding:'2px 6px', borderRadius:6 },
  footer:{ textAlign:'center', color:'rgba(255,255,255,0.18)', fontSize:11,
    padding:'7px 0 10px', borderTop:'1px solid rgba(255,255,255,0.06)' }
}
