import { useState, useEffect, useRef, useCallback } from 'react'
import { LudoEngine, LudoAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

// ── Board geometry ────────────────────────────────────────────────────────────
const CELL = 44          // px per cell in a 15×15 grid
const BOARD = CELL * 15  // 660

// 52-square main track coordinates (col, row) 0-indexed on 15×15 grid
const TRACK = [
  // Red side going up (col 6)
  {c:6,r:13},{c:6,r:12},{c:6,r:11},{c:6,r:10},{c:6,r:9},{c:6,r:8},
  // Left arm going left (row 8)
  {c:5,r:8},{c:4,r:8},{c:3,r:8},{c:2,r:8},{c:1,r:8},{c:0,r:8},
  // Up left edge
  {c:0,r:7},{c:0,r:6},
  // Top arm going right (row 6)
  {c:1,r:6},{c:2,r:6},{c:3,r:6},{c:4,r:6},{c:5,r:6},
  // Up to top
  {c:6,r:5},{c:6,r:4},{c:6,r:3},{c:6,r:2},{c:6,r:1},{c:6,r:0},
  // Right along top (row 0)
  {c:7,r:0},{c:8,r:0},
  // Down right side (col 8)
  {c:8,r:1},{c:8,r:2},{c:8,r:3},{c:8,r:4},{c:8,r:5},
  // Right arm going right (row 6)
  {c:9,r:6},{c:10,r:6},{c:11,r:6},{c:12,r:6},{c:13,r:6},{c:14,r:6},
  // Down right edge
  {c:14,r:7},{c:14,r:8},
  // Bottom arm going left (row 8)
  {c:13,r:8},{c:12,r:8},{c:11,r:8},{c:10,r:8},{c:9,r:8},
  // Down col 8
  {c:8,r:9},{c:8,r:10},{c:8,r:11},{c:8,r:12},{c:8,r:13},
  // Bottom row going left
  {c:8,r:14},{c:7,r:14}
]  // 52 total

const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47])

// Home yard positions for each player (4 tokens each)
const HOME_YARD = [
  [{c:2,r:11},{c:3,r:11},{c:2,r:12},{c:3,r:12}],  // Red  (bottom-left)
  [{c:11,r:2},{c:12,r:2},{c:11,r:3},{c:12,r:3}],  // Green (top-right)
  [{c:2,r:2}, {c:3,r:2}, {c:2,r:3}, {c:3,r:3}],  // Yellow (top-left)
  [{c:11,r:11},{c:12,r:11},{c:11,r:12},{c:12,r:12}] // Blue (bottom-right)
]

// Home columns (5 squares → center)
const HOME_COLS = [
  [{c:7,r:13},{c:7,r:12},{c:7,r:11},{c:7,r:10},{c:7,r:9}],  // Red
  [{c:1,r:7}, {c:2,r:7}, {c:3,r:7}, {c:4,r:7}, {c:5,r:7}],  // Green
  [{c:7,r:1}, {c:7,r:2}, {c:7,r:3}, {c:7,r:4}, {c:7,r:5}],  // Yellow
  [{c:13,r:7},{c:12,r:7},{c:11,r:7},{c:10,r:7},{c:9,r:7}]   // Blue
]

const P_COLORS    = ['#e94560','#4caf50','#ffc107','#2196f3']
const P_NAMES_DEF = ['Red','Green','Yellow','Blue']
const HOME_COLORS = ['#ffcdd2','#c8e6c9','#fff9c4','#bbdefb']
const SAFE_COLOR  = '#e8f5e9'

function tokenCoord(playerIdx, pos, tokenIdx) {
  if (pos === -1) {
    const y = HOME_YARD[playerIdx][tokenIdx]
    return { cx: (y.c + 0.5) * CELL, cy: (y.r + 0.5) * CELL }
  }
  if (pos >= 52 && pos <= 56) {
    const h = HOME_COLS[playerIdx][pos - 52]
    return { cx: (h.c + 0.5) * CELL, cy: (h.r + 0.5) * CELL }
  }
  if (pos === 57) return { cx: 7.5 * CELL, cy: 7.5 * CELL }
  const t = TRACK[pos % 52]
  return { cx: (t.c + 0.5) * CELL, cy: (t.r + 0.5) * CELL }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function LudoGame({ mode='solo', playerCount=4, playerNames, onExit }) {
  const { play, vibrate } = useAudio()
  const pc     = Math.min(4, Math.max(2, playerCount))
  const names  = playerNames || P_NAMES_DEF.slice(0, pc)
  const canvasRef = useRef(null)
  const [engine]  = useState(() => new LudoEngine())
  const [state, setState] = useState(null)
  const [ai]      = useState(() => new LudoAI('normal'))
  const [rolling, setRolling] = useState(false)
  const [diceAnim, setDiceAnim] = useState(null)
  const [msg, setMsg] = useState('')
  const animRef = useRef(false)

  const isAITurn = useCallback(st =>
    !(!st || st.gameOver || mode==='local2p' || st.currentPlayer===0 || st.dice!==null), [mode])

  useEffect(() => {
    engine.initializeGame({ playerCount: pc, playerNames: names })
    setState(engine.cloneState())
    play('game_start')
  }, [])

  // Draw board whenever state changes
  useEffect(() => {
    if (state) drawBoard(state)
  }, [state])

  // AI auto-play
  useEffect(() => {
    if (!state || mode==='local2p' || state.gameOver) return
    const p = state.currentPlayer
    if (p === 0) return  // human's turn

    const t = setTimeout(async () => {
      if (state.dice === null) {
        // AI needs to roll
        const rollRes = engine.applyMove({ action:'roll' })
        if (rollRes.success) setState(engine.cloneState())
      } else {
        // AI selects a move
        const move = ai.getBestMove(engine)
        if (move) {
          await delay(400)
          const res = engine.applyMove(move)
          if (res.success) {
            const ns = engine.cloneState()
            setState(ns)
            if (ns.gameOver) { setMsg(`${names[p]} wins! 🎉`); play('game_win') }
            if (res.event === 'capture') { play('ludo_cut'); vibrate([25]) }
          }
        }
      }
    }, 600)
    return () => clearTimeout(t)
  }, [state?.currentPlayer, state?.dice, mode])

  function drawBoard(st) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, BOARD, BOARD)

    // Background
    ctx.fillStyle = '#f5f5f0'
    ctx.fillRect(0, 0, BOARD, BOARD)

    // Home areas (corners)
    const corners = [
      { x:0,   y:CELL*9, w:CELL*6, h:CELL*6, c:HOME_COLORS[0] }, // Red BL
      { x:CELL*9, y:0,   w:CELL*6, h:CELL*6, c:HOME_COLORS[1] }, // Green TR
      { x:0,   y:0,      w:CELL*6, h:CELL*6, c:HOME_COLORS[2] }, // Yellow TL
      { x:CELL*9, y:CELL*9, w:CELL*6, h:CELL*6, c:HOME_COLORS[3] }, // Blue BR
    ]
    corners.forEach(({ x, y, w, h, c }) => {
      ctx.fillStyle = c; ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, w, h)
    })

    // Yard circles
    for (let p = 0; p < pc; p++) {
      HOME_YARD[p].forEach(({ c, r }) => {
        ctx.beginPath()
        ctx.arc((c + 0.5) * CELL, (r + 0.5) * CELL, CELL * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill()
        ctx.strokeStyle = P_COLORS[p]; ctx.lineWidth = 2; ctx.stroke()
      })
    }

    // Track squares
    TRACK.forEach(({ c, r }, idx) => {
      const isSafe = SAFE.has(idx)
      const x = c * CELL, y = r * CELL
      ctx.fillStyle = isSafe ? SAFE_COLOR : '#fff'
      ctx.fillRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1)
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1)
      if (isSafe) {
        ctx.fillStyle = '#4caf50'
        ctx.font = `bold ${CELL * 0.35}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('★', (c + 0.5) * CELL, (r + 0.5) * CELL)
      }
    })

    // Starting squares coloured
    ;[0,13,26,39].slice(0, pc).forEach((start, p) => {
      const { c, r } = TRACK[start]
      ctx.fillStyle = P_COLORS[p] + '55'
      ctx.fillRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1)
    })

    // Home columns
    for (let p = 0; p < pc; p++) {
      HOME_COLS[p].forEach(({ c, r }) => {
        ctx.fillStyle = P_COLORS[p] + '40'
        ctx.fillRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1)
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.5
        ctx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1)
      })
    }

    // Center diamond
    ctx.fillStyle = '#fff9c4'
    ctx.beginPath()
    ctx.moveTo(6.5 * CELL, 7.5 * CELL)
    ctx.lineTo(7.5 * CELL, 6.5 * CELL)
    ctx.lineTo(8.5 * CELL, 7.5 * CELL)
    ctx.lineTo(7.5 * CELL, 8.5 * CELL)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke()

    // Draw tokens
    const tokens = st.tokens
    for (let p = 0; p < pc; p++) {
      tokens[p].forEach((pos, ti) => {
        const { cx, cy } = tokenCoord(p, pos, ti)
        ctx.beginPath()
        ctx.arc(cx, cy, CELL * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = P_COLORS[p]; ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
        // Token number
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${CELL * 0.22}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(ti + 1, cx, cy)
      })
    }
  }

  async function handleRoll() {
    if (!state || rolling || state.gameOver || state.currentPlayer !== 0 || animRef.current) return
    setRolling(true); animRef.current = true
    // Dice spin animation
    for (let i = 0; i < 7; i++) {
      setDiceAnim(Math.floor(Math.random() * 6) + 1)
      await delay(70)
    }
    play('ludo_dice'); vibrate([15])
    const res = engine.applyMove({ action: 'roll' })
    if (res.success) {
      const ns = engine.cloneState()
      setDiceAnim(ns.dice)
      setState(ns)
    }
    setRolling(false); animRef.current = false
  }

  async function handleTokenClick(playerIdx, tokenIdx) {
    if (!state || state.gameOver || state.currentPlayer !== 0 || state.currentPlayer !== playerIdx) return
    const moves = engine.getLegalMoves().filter(m => m.action==='move' && m.token===tokenIdx)
    if (!moves.length) { play('piece_invalid'); return }
    play('ludo_select'); vibrate([8])
    const res = engine.applyMove(moves[0])
    if (res.success) {
      const ns = engine.cloneState()
      setState(ns)
      if (ns.gameOver) { setMsg(`${names[0]} wins! 🎉`); play('ludo_win'); vibrate([50,30,70]) }
      else if (res.event==='capture') { play('ludo_cut'); vibrate([25]) }
      else if (moves[0].to===57) play('ludo_home')
      else play('ludo_move')
    }
  }

  function restart() {
    engine.initializeGame({ playerCount: pc, playerNames: names }); play('game_start')
    setState(engine.cloneState()); setDiceAnim(null); setMsg('')
  }

  if (!state) return null
  const { currentPlayer, gameOver, dice } = state
  const legal = state.currentPlayer===0 && dice!==null
    ? engine.getLegalMoves().filter(m=>m.action==='move') : []
  const movableTokens = new Set(legal.map(m=>m.token))

  const canvasSize = Math.min(window.innerWidth - 16, window.innerHeight - 200, 420)

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Ludo</span>
        <div style={S.diceArea}>
          {diceAnim ? (
            <div style={S.dice}>{['','⚀','⚁','⚂','⚃','⚄','⚅'][diceAnim]}</div>
          ) : <div style={S.dice}>🎲</div>}
        </div>
      </div>

      <div style={S.players}>
        {Array.from({ length: pc }, (_, i) => (
          <div key={i} style={{
            ...S.chip,
            border:`2px solid ${i===currentPlayer && !gameOver ? P_COLORS[i] : 'rgba(255,255,255,0.1)'}`,
            background: i===currentPlayer && !gameOver ? P_COLORS[i]+'22' : 'transparent'
          }}>
            <span style={{ fontSize:10, color:P_COLORS[i], fontWeight:700 }}>
              {names[i].slice(0,6)} {state.tokens[i].filter(p=>p===57).length}/4 🏠
            </span>
          </div>
        ))}
      </div>

      <div style={{ position:'relative', width:canvasSize, height:canvasSize }}>
        <canvas ref={canvasRef} width={BOARD} height={BOARD}
          style={{ width:canvasSize, height:canvasSize, borderRadius:8,
            border:'2px solid rgba(255,255,255,0.15)' }} />
        {/* Clickable token overlays for human player */}
        {state.tokens[0].map((pos, ti) => {
          if (state.currentPlayer !== 0 || !movableTokens.has(ti)) return null
          const { cx, cy } = tokenCoord(0, pos, ti)
          const px = (cx / BOARD) * canvasSize - 18
          const py = (cy / BOARD) * canvasSize - 18
          return (
            <button key={ti} onClick={() => handleTokenClick(0, ti)} style={{
              position:'absolute', left:px, top:py, width:36, height:36,
              borderRadius:'50%', background:'transparent',
              border:'3px solid #ffd700', cursor:'pointer',
              animation:'pulse 1s infinite', boxShadow:'0 0 8px #ffd700'
            }} />
          )
        })}
      </div>

      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 8px #ffd700}50%{box-shadow:0 0 16px #ffd700}}`}</style>

      {msg && <div style={S.msgBox}>{msg}</div>}

      <div style={S.controls}>
        {gameOver ? (
          <button onClick={restart} style={{ ...S.btn, ...S.primary, flex:1 }}>▶ Play Again</button>
        ) : state.currentPlayer===0 && dice===null ? (
          <button onClick={handleRoll} disabled={rolling} style={{ ...S.btn, ...S.primary, flex:1, opacity:rolling?0.6:1 }}>
            {rolling ? 'Rolling…' : '🎲 Roll Dice'}
          </button>
        ) : state.currentPlayer===0 && dice!==null ? (
          <div style={{ ...S.btn, textAlign:'center', flex:1, background:'rgba(255,255,255,0.08)',
            color:'rgba(255,255,255,0.7)', fontSize:13 }}>
            Rolled {dice} — tap a glowing token to move
          </div>
        ) : (
          <div style={{ ...S.btn, textAlign:'center', flex:1, background:'rgba(255,255,255,0.06)',
            color:'rgba(255,255,255,0.45)', fontSize:13 }}>
            🤖 {names[currentPlayer]}'s turn…
          </div>
        )}
        <button onClick={restart} style={{ ...S.btn, width:60 }}>↺</button>
      </div>
    </div>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', alignItems:'center',
    height:'100%', background:'linear-gradient(160deg,#1a0a2e 0%,#1a1a2e 100%)',
    padding:10, gap:8, userSelect:'none', overflow:'hidden' },
  header:{ display:'flex', alignItems:'center', width:'100%', gap:8 },
  backBtn:{ background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 12px', borderRadius:10, cursor:'pointer' },
  title:{ flex:1, color:'#fff', fontSize:18, fontWeight:700, textAlign:'center' },
  diceArea:{ minWidth:44, textAlign:'center' },
  dice:{ fontSize:30, lineHeight:1, padding:'3px 6px', borderRadius:8,
    background:'rgba(255,255,255,0.1)' },
  players:{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', width:'100%' },
  chip:{ padding:'3px 10px', borderRadius:20, fontSize:11 },
  msgBox:{ color:'#ffd700', fontWeight:700, fontSize:14, padding:'7px 16px',
    borderRadius:10, background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.2)' },
  controls:{ display:'flex', gap:8, width:'100%', maxWidth:440 },
  btn:{ padding:'11px 0', borderRadius:12, border:'none',
    background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' },
  primary:{ background:'#ff5722', color:'#fff' }
}
