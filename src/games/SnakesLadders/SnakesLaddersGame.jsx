import { useState, useCallback } from 'react'
import { SnakesLaddersEngine } from './engine.js'

const SNAKES = { 99:37, 95:75, 92:88, 89:68, 74:53, 64:60, 62:19, 49:11, 46:25, 16:6 }
const LADDERS = { 2:38, 7:14, 8:31, 15:26, 21:42, 28:84, 36:44, 51:67, 71:91, 78:98, 87:94 }
const PLAYER_COLORS = ['#e94560', '#4fc3f7', '#81c784', '#f5a623']
const EMOJIS = ['🔴', '🔵', '🟢', '🟡']

export default function SnakesLaddersGame({ playerCount = 2, playerNames, onExit }) {
  const [engine] = useState(() => new SnakesLaddersEngine())
  const [state, setState] = useState(() => {
    const e = new SnakesLaddersEngine()
    return e.initializeGame({ playerCount, playerNames: playerNames || Array.from({length:playerCount},(_,i)=>`Player ${i+1}`) })
  })
  const [rolling, setRolling] = useState(false)

  function handleRoll() {
    if (rolling || state.gameOver) return
    setRolling(true)
    setTimeout(() => {
      const res = engine.applyMove({ action: 'roll' })
      if (res.success) setState(engine.cloneState())
      setRolling(false)
    }, 400)
  }

  function restart() {
    const s = engine.initializeGame({ playerCount, playerNames: playerNames || Array.from({length:playerCount},(_,i)=>`Player ${i+1}`) })
    setState(s)
  }

  // Build 10×10 grid cells (100 squares)
  const cells = []
  for (let n = 100; n >= 1; n--) {
    const { row, col } = SnakesLaddersEngine.cellPosition(n)
    cells.push({ n, row, col })
  }

  const { positions, currentPlayer, dice, lastEvent, gameOver, winner, playerNames: names, playerCount: pc } = state

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onExit} style={styles.backBtn}>←</button>
        <span style={styles.title}>Snakes & Ladders</span>
        <span style={{ fontSize: 20 }}>🎲</span>
      </div>

      {/* Players strip */}
      <div style={styles.players}>
        {Array.from({ length: pc }).map((_, i) => (
          <div key={i} style={{
            ...styles.playerChip,
            background: i === currentPlayer && !gameOver ? PLAYER_COLORS[i] + '33' : 'transparent',
            border: `2px solid ${i === currentPlayer && !gameOver ? PLAYER_COLORS[i] : 'rgba(255,255,255,0.15)'}`,
          }}>
            <span>{EMOJIS[i]}</span>
            <span style={{ color: PLAYER_COLORS[i], fontWeight: 700, fontSize: 13 }}>
              {(names[i] || `P${i+1}`).slice(0,8)} — sq {positions[i] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={styles.board}>
        {Array.from({ length: 100 }, (_, idx) => {
          const row = Math.floor(idx / 10)
          const col = row % 2 === 0 ? idx % 10 : 9 - (idx % 10)
          const n = 100 - idx
          const isSnakeHead = SNAKES[n] !== undefined
          const isLadderBottom = LADDERS[n] !== undefined
          const playersHere = positions.map((p, i) => p === n ? i : -1).filter(i => i >= 0)

          return (
            <div key={n} style={{
              ...styles.cell,
              background: isSnakeHead ? 'rgba(233,69,96,0.25)'
                : isLadderBottom ? 'rgba(76,175,80,0.25)'
                : n % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
              border: isSnakeHead ? '1px solid rgba(233,69,96,0.5)'
                : isLadderBottom ? '1px solid rgba(76,175,80,0.5)'
                : '1px solid rgba(255,255,255,0.07)',
              position: 'relative'
            }}>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{n}</span>
              {isSnakeHead && <span style={{ fontSize: 9 }}>🐍</span>}
              {isLadderBottom && <span style={{ fontSize: 9 }}>🪜</span>}
              {playersHere.map(i => (
                <span key={i} style={{ fontSize: 10, position: 'absolute', bottom: 0, right: i * 7 }}>
                  {EMOJIS[i]}
                </span>
              ))}
            </div>
          )
        })}
      </div>

      {/* Event message */}
      {lastEvent && (
        <div style={styles.event}>
          {lastEvent === 'snake' && '🐍 Slid down a snake!'}
          {lastEvent === 'ladder' && '🪜 Climbed a ladder!'}
          {lastEvent === 'win' && `🎉 ${names[winner]} wins!`}
          {dice && ` (rolled ${dice})`}
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        {gameOver ? (
          <button onClick={restart} style={{ ...styles.btn, ...styles.primaryBtn, flex: 1 }}>
            ▶ Play Again
          </button>
        ) : (
          <button
            onClick={handleRoll}
            disabled={rolling}
            style={{
              ...styles.btn, ...styles.primaryBtn, flex: 1,
              opacity: rolling ? 0.7 : 1
            }}
          >
            {rolling ? `Rolling…` : `🎲 Roll Dice (${names[currentPlayer]?.slice(0,8)})`}
          </button>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    height: '100%', background: 'linear-gradient(160deg, #0d2137 0%, #1a3a1a 100%)',
    padding: 12, gap: 10, overflow: 'hidden', userSelect: 'none'
  },
  header: { display: 'flex', alignItems: 'center', width: '100%', gap: 8 },
  backBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
    fontSize: 20, padding: '6px 14px', borderRadius: 10, cursor: 'pointer'
  },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center' },
  players: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
  playerChip: {
    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
    borderRadius: 20, fontSize: 13
  },
  board: {
    display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)',
    gap: 1, width: '100%', maxWidth: 380, aspectRatio: '1',
    background: 'rgba(255,255,255,0.05)', borderRadius: 8, overflow: 'hidden'
  },
  cell: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', aspectRatio: '1', fontSize: 8, gap: 0
  },
  event: {
    color: '#ffd700', fontWeight: 700, fontSize: 15,
    background: 'rgba(255,215,0,0.1)', padding: '8px 16px', borderRadius: 10,
    border: '1px solid rgba(255,215,0,0.2)'
  },
  controls: { display: 'flex', gap: 10, width: '100%', maxWidth: 380 },
  btn: {
    padding: '13px 0', borderRadius: 12, border: 'none',
    background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 15,
    fontWeight: 600, cursor: 'pointer'
  },
  primaryBtn: { background: '#4caf50', color: '#fff' }
}
