import { useState } from 'react'
import { GAMES } from '../core/GameRegistry.js'
import { SaveSystem } from '../core/SaveSystem.js'

export default function HomeScreen({ onSelectGame }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const profile = SaveSystem.loadProfile()

  const tags = ['all', 'quick', 'strategy', 'puzzle', 'dice', 'family']

  const filtered = GAMES.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase())
    const matchTag = filter === 'all' || g.tags.includes(filter)
    return matchSearch && matchTag
  })

  return (
    <div style={styles.container}>
      {/* Hero header */}
      <div style={styles.hero}>
        <div style={styles.heroIcon}>🎮</div>
        <h1 style={styles.heroTitle}>Classic Board Games</h1>
        <p style={styles.heroSub}>Play offline · No internet needed · All ages</p>
        <div style={styles.profileBar}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            👤 {profile.name}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 8 }}>
            {profile.gamesWon}/{profile.gamesPlayed} wins
          </span>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchRow}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search games…"
          style={styles.searchInput}
        />
      </div>

      {/* Tag filters */}
      <div style={styles.tagRow}>
        {tags.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            ...styles.tag,
            background: filter === t ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${filter === t ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: filter === t ? '#fff' : 'rgba(255,255,255,0.5)'
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Game Grid */}
      <div style={styles.grid}>
        {filtered.map(game => (
          <GameCard key={game.id} game={game} onClick={() => onSelectGame(game)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>
            No games found
          </div>
        )}
      </div>

      <div style={styles.footer}>
        Fully offline · AI-powered · {GAMES.filter(g => g.available).length} games ready
      </div>
    </div>
  )
}

function GameCard({ game, onClick }) {
  const stats = SaveSystem.loadStats(game.id)
  return (
    <button onClick={onClick} style={{
      ...styles.card,
      opacity: game.available ? 1 : 0.55,
      border: `1px solid ${game.color}30`,
      background: `linear-gradient(135deg, ${game.color}18 0%, rgba(255,255,255,0.04) 100%)`
    }}>
      <div style={{ fontSize: 32 }}>{game.emoji}</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 6 }}>{game.name}</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>
        {game.description.slice(0, 40)}…
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {game.tags.slice(0, 2).map(t => (
          <span key={t} style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
            background: `${game.color}30`, color: game.color
          }}>{t}</span>
        ))}
      </div>
      {stats.played > 0 && (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 6 }}>
          {stats.won}W / {stats.played}P
        </div>
      )}
      {game.comingSoon && (
        <div style={{
          position: 'absolute', top: 8, right: 8, fontSize: 9,
          background: 'rgba(255,165,0,0.3)', color: '#ffa500',
          padding: '2px 6px', borderRadius: 6, fontWeight: 700
        }}>SOON</div>
      )}
      {!game.available && !game.comingSoon && (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4 }}>Coming soon</div>
      )}
    </button>
  )
}

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 100%)',
    overflow: 'hidden'
  },
  hero: {
    padding: '20px 20px 16px', textAlign: 'center',
    background: 'linear-gradient(180deg, rgba(233,69,96,0.12) 0%, transparent 100%)'
  },
  heroIcon: { fontSize: 36 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: 900, margin: '6px 0 4px', letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  profileBar: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  searchRow: { padding: '0 16px 8px' },
  searchInput: {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box'
  },
  tagRow: { display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto' },
  tag: {
    padding: '6px 12px', borderRadius: 16, border: 'none',
    fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600, transition: 'all 0.15s'
  },
  grid: {
    flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10, padding: '0 14px 14px', overflowY: 'auto',
    alignContent: 'start'
  },
  card: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '14px 10px', borderRadius: 16, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.08)', position: 'relative',
    transition: 'all 0.15s', textAlign: 'center'
  },
  footer: {
    textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11,
    padding: '8px 0 10px', borderTop: '1px solid rgba(255,255,255,0.06)'
  }
}
