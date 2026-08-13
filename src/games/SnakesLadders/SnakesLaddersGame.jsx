import { useState, useCallback, useRef } from 'react'
import { SnakesLaddersEngine } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import GameShell from '../../components/GameShell.jsx'

const SNAKES  = { 99:37,95:75,92:88,89:68,74:53,64:60,62:19,49:11,46:25,16:6 }
const LADDERS = { 2:38,7:14,8:31,15:26,21:42,28:84,36:44,51:67,71:91,78:98,87:94 }
const P_COLORS = ['#e94560','#4fc3f7','#81c784','#f5a623']
const P_EMOJI  = ['🔴','🔵','🟢','🟡']

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function SnakesLaddersGame({ playerCount = 2, playerNames, onExit }) {
  const { play, vibrate } = useAudio()
  const names  = playerNames || Array.from({ length: playerCount }, (_, i) => `Player ${i+1}`)
  const [engine]  = useState(() => {
    const e = new SnakesLaddersEngine()
    e.initializeGame({ playerCount, playerNames: names })
    return e
  })
  const [state, setState] = useState(() => engine.cloneState())
  // displayPositions: what's actually shown on board (animated)
  const [displayPos, setDisplayPos] = useState(() => Array(playerCount).fill(0))
  const [rolling, setRolling] = useState(false)
  const [diceDisplay, setDiceDisplay] = useState(null)
  const [eventMsg, setEventMsg] = useState('')
  const animRef = useRef(false)

  async function handleRoll() {
    if (rolling || state.gameOver || animRef.current) return
    setRolling(true)
    animRef.current = true
    setEventMsg('')

    // Animate dice rolling
    play('snakes_dice'); vibrate([15])
    for (let i = 0; i < 6; i++) {
      setDiceDisplay(Math.floor(Math.random() * 6) + 1)
      await delay(80)
    }

    // Save current player and position before applying move
    const prevPlayer = state.currentPlayer
    const prevPos    = state.positions[prevPlayer]

    // Apply move to engine
    const res = engine.applyMove({ action: 'roll' })
    if (!res.success) { setRolling(false); animRef.current = false; return }
    const ns = engine.cloneState()
    const dice   = ns.dice
    const finalPos = ns.positions[prevPlayer]

    setDiceDisplay(dice)

    // Compute pre-snake/ladder position
    let rawNext = prevPos + dice
    if (rawNext > 100) rawNext = 100 - (rawNext - 100)  // bounce
    rawNext = Math.min(100, rawNext)

    // Animate step-by-step from prevPos → rawNext
    const cur = [...displayPos]
    for (let step = prevPos + 1; step <= rawNext; step++) {
      cur[prevPlayer] = step
      setDisplayPos([...cur])
      play('player_move')
      await delay(step === rawNext ? 100 : 160)
    }

    // If snake or ladder, animate the teleport with a pause
    if (ns.lastEvent === 'snake') {
      await delay(400)
      play('snake_down'); vibrate([30, 20, 30])
      setEventMsg(`🐍 Snake! ${names[prevPlayer]} slides from ${rawNext} → ${finalPos}`)
      cur[prevPlayer] = finalPos
      setDisplayPos([...cur])
    } else if (ns.lastEvent === 'ladder') {
      await delay(400)
      play('ladder_up'); vibrate([20, 10, 40])
      setEventMsg(`🪜 Ladder! ${names[prevPlayer]} climbs from ${rawNext} → ${finalPos}`)
      cur[prevPlayer] = finalPos
      setDisplayPos([...cur])
    } else if (ns.lastEvent === 'win') {
      play('snakes_win'); vibrate([50, 30, 70, 30, 80])
      setEventMsg(`🎉 ${names[prevPlayer]} wins!`)
    }

    setState(ns)
    setRolling(false)
    animRef.current = false
  }

  function restart() {
    play('game_start')
    engine.initializeGame({ playerCount, playerNames: names })
    setState(engine.cloneState())
    setDisplayPos(Array(playerCount).fill(0))
    setDiceDisplay(null); setEventMsg('')
  }

  const { currentPlayer, gameOver, winner } = state

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Snakes & Ladders</span>
        {/* Dice display */}
        <div style={S.diceBox}>
          {diceDisplay ? (
            <div style={{ ...S.dice, background: rolling && !animRef.current ? 'rgba(245,166,35,0.3)' : 'rgba(255,255,255,0.12)' }}>
              {['','⚀','⚁','⚂','⚃','⚄','⚅'][diceDisplay]}
            </div>
          ) : (
            <div style={S.dice}>🎲</div>
          )}
        </div>
      </div>

      {/* Player chips */}
      <div style={S.players}>
        {Array.from({ length: playerCount }, (_, i) => (
          <div key={i} style={{
            ...S.chip,
            background: i === currentPlayer && !gameOver ? P_COLORS[i]+'28' : 'transparent',
            border: `2px solid ${i === currentPlayer && !gameOver ? P_COLORS[i] : 'rgba(255,255,255,0.12)'}`,
          }}>
            <span>{P_EMOJI[i]}</span>
            <span style={{ color: P_COLORS[i], fontWeight: 700, fontSize: 12 }}>
              {names[i].slice(0, 8)} — {displayPos[i] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={S.board}>
        {Array.from({ length: 100 }, (_, idx) => {
          const row = Math.floor(idx / 10)
          // Odd rows go right-to-left (standard snake board)
          const col = row % 2 === 0 ? idx % 10 : 9 - idx % 10
          const n   = 100 - idx
          const isSnake  = SNAKES[n]  !== undefined
          const isLadder = LADDERS[n] !== undefined
          const here = displayPos.map((p, i) => p === n ? i : -1).filter(x => x >= 0)

          return (
            <div key={n} style={{
              ...S.cell,
              background: n === 100 ? 'rgba(255,215,0,0.3)'
                : isSnake  ? 'rgba(233,69,96,0.22)'
                : isLadder ? 'rgba(76,175,80,0.22)'
                : (n % 2 === 0) ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
              border: isSnake  ? '1px solid rgba(233,69,96,0.45)'
                : isLadder ? '1px solid rgba(76,175,80,0.45)'
                : n === 100 ? '1px solid rgba(255,215,0,0.5)'
                : '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>{n}</span>
              {isSnake  && <span style={{ fontSize: 9 }}>🐍</span>}
              {isLadder && <span style={{ fontSize: 9 }}>🪜</span>}
              {n === 100 && <span style={{ fontSize: 9 }}>🏆</span>}
              <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center' }}>
                {here.map(i => (
                  <span key={i} style={{
                    fontSize: 10,
                    filter: rolling && i === currentPlayer ? 'drop-shadow(0 0 3px white)' : 'none',
                    transition: 'filter 0.1s'
                  }}>{P_EMOJI[i]}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Event message */}
      {eventMsg ? (
        <div style={S.event}>{eventMsg}</div>
      ) : diceDisplay && !rolling ? (
        <div style={S.event}>Rolled {diceDisplay}</div>
      ) : null}

      {/* Controls */}
      <div style={S.controls}>
        {gameOver ? (
          <button onClick={restart} style={{ ...S.btn, ...S.primary, flex: 1 }}>▶ Play Again</button>
        ) : (
          <button onClick={handleRoll} disabled={rolling} style={{
            ...S.btn, ...S.primary, flex: 1,
            opacity: rolling ? 0.65 : 1
          }}>
            {rolling ? 'Moving…' : `🎲 Roll — ${names[currentPlayer]?.slice(0, 9)}`}
          </button>
        )}
      </div>
    </div>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', alignItems:'center',
    height:'100%', background:'linear-gradient(160deg,#0d2137 0%,#1a3a1a 100%)',
    padding:10, gap:7, overflow:'hidden', userSelect:'none' },
  header:  { display:'flex', alignItems:'center', width:'100%', gap:8 },
  backBtn: { background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 14px', borderRadius:10, cursor:'pointer' },
  title:   { flex:1, color:'#fff', fontSize:17, fontWeight:700, textAlign:'center' },
  diceBox: { minWidth:44, textAlign:'center' },
  dice:    { fontSize:28, lineHeight:1, padding:'4px 6px', borderRadius:8,
    background:'rgba(255,255,255,0.1)', transition:'background 0.1s' },
  players: { display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', width:'100%' },
  chip:    { display:'flex', alignItems:'center', gap:4, padding:'3px 10px',
    borderRadius:20, fontSize:12, transition:'all 0.15s' },
  board:   { display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:1, width:'100%',
    maxWidth:390, aspectRatio:'1', background:'rgba(255,255,255,0.04)',
    borderRadius:6, overflow:'hidden' },
  cell:    { display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', aspectRatio:'1', gap:0, transition:'background 0.15s' },
  event:   { color:'#ffd700', fontWeight:700, fontSize:13, padding:'6px 14px',
    borderRadius:10, background:'rgba(255,215,0,0.1)',
    border:'1px solid rgba(255,215,0,0.2)', textAlign:'center', minHeight:34,
    display:'flex', alignItems:'center' },
  controls:{ display:'flex', gap:8, width:'100%', maxWidth:390 },
  btn:     { padding:'12px 0', borderRadius:12, border:'none',
    background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:14,
    fontWeight:600, cursor:'pointer' },
  primary: { background:'#4caf50' }
}
