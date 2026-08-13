import { useState, useEffect, useCallback } from 'react'
import { SholoGutiEngine, SholoGutiAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'
import GameShell from '../../components/GameShell.jsx'

// 5×5 grid — 25 points (index = row*5 + col)
// Adjacency includes diagonals on even-sum squares
const GRID = 5
const POINTS = Array.from({ length: 25 }, (_, i) => ({
  x: (i % GRID) / (GRID - 1),
  y: Math.floor(i / GRID) / (GRID - 1)
}))

// All lines between adjacent points for SVG rendering
function buildLines() {
  const lines = []
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const i = r * GRID + c
      if (c + 1 < GRID) lines.push([i, i + 1])          // horizontal
      if (r + 1 < GRID) lines.push([i, i + GRID])        // vertical
      if ((r + c) % 2 === 0) {                            // diagonals on even-sum
        if (r + 1 < GRID && c + 1 < GRID) lines.push([i, i + GRID + 1])
        if (r + 1 < GRID && c - 1 >= 0)   lines.push([i, i + GRID - 1])
      }
    }
  }
  return lines
}
const LINES = buildLines()

function buildAdj() {
  const adj = Array.from({ length: 25 }, () => [])
  LINES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a) })
  return adj
}
const ADJ = buildAdj()

function getJumpLanding(from, over) {
  const fr = Math.floor(from / GRID), fc = from % GRID
  const or = Math.floor(over / GRID), oc = over % GRID
  const lr = or + (or - fr), lc = oc + (oc - fc)
  if (lr < 0 || lr >= GRID || lc < 0 || lc >= GRID) return -1
  return lr * GRID + lc
}

export default function SholoGutiGame({ mode='solo', difficulty='normal', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine]  = useState(() => new SholoGutiEngine())
  const [state, setState]     = useState(null)
  const [ai]      = useState(() => new SholoGutiAI(difficulty))
  const [sel, setSel]         = useState(null)
  const [thinking, setThinking] = useState(false)
  const [msg, setMsg]           = useState('')
  const [legalMoves, setLegalMoves] = useState([])

  const isAITurn = useCallback(st =>
    !(!st || st.gameOver || mode==='local2p' || st.currentPlayer!=='b'), [mode])

  useEffect(() => {
    engine.initializeGame()
    const s = engine.cloneState()
    setState(s)
    setLegalMoves(engine.getLegalMoves())
    play('game_start')
  }, [])

  // AI turn
  useEffect(() => {
    if (!state || !isAITurn(state)) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          const ns = engine.cloneState()
          setState(ns)
          setLegalMoves(engine.getLegalMoves())
          setSel(null)
          if (move.captures?.length) { play('sholo_capture'); vibrate([20]) }
          else play('sholo_move')
          if (ns.gameOver) { endMsg(ns); play('game_lose'); vibrate([40, 20, 40]) }
        }
      }
      setThinking(false)
    }, 450)
    return () => clearTimeout(t)
  }, [state])

  function endMsg(ns) {
    const w = ns.winner === 'w'
      ? (playerNames[0] || 'White')
      : (mode === 'solo' ? 'AI' : (playerNames[1] || 'Black'))
    setMsg(`${w} wins! 🎉`)
  }

  function handlePoint(idx) {
    if (!state || state.gameOver || isAITurn(state) || thinking) return
    const { board, currentPlayer } = state

    // Capturing moves are mandatory — check if any exist
    const hasCaps = legalMoves.some(m => m.captures?.length > 0)
    const validMoves = hasCaps ? legalMoves.filter(m => m.captures?.length > 0) : legalMoves

    if (sel === null) {
      // Select a piece
      if (board[idx] !== currentPlayer) { play('piece_invalid'); return }
      const myMoves = validMoves.filter(m => m.from === idx)
      if (!myMoves.length) { play('piece_invalid'); return }
      play('sholo_move')
      setSel(idx)
    } else {
      if (idx === sel) { setSel(null); return }

      // Try to apply move
      const move = legalMoves.find(m => m.from === sel && m.to === idx)
      if (move) {
        if (hasCaps && !move.captures?.length) { play('piece_invalid'); return }
        const res = engine.applyMove(move)
        if (res.success) {
          const ns = engine.cloneState()
          setState(ns)
          setLegalMoves(engine.getLegalMoves())
          setSel(null)
          if (move.captures?.length) { play('sholo_capture'); vibrate([20]) }
          else { play('sholo_move'); vibrate([8]) }
          if (ns.gameOver) { endMsg(ns); play('game_win'); vibrate([60, 30, 60]) }
        } else play('piece_invalid')
      } else if (board[idx] === currentPlayer) {
        // Re-select another piece
        play('piece_invalid')
        setSel(idx)
      } else {
        play('piece_invalid')
        setSel(null)
      }
    }
  }

  function restart() {
    engine.initializeGame(); play('game_start')
    const s = engine.cloneState()
    setState(s); setLegalMoves(engine.getLegalMoves())
    setSel(null); setMsg('')
  }

  if (!state) return null
  const { board, currentPlayer, count, gameOver } = state

  // Legal targets from selected piece
  const selMoves    = sel !== null ? legalMoves.filter(m => m.from === sel) : []
  const validTargets = new Set(selMoves.map(m => m.to))
  const hasCaps = legalMoves.some(m => m.captures?.length > 0)
  // Movable pieces for current player
  const movable = new Set(
    legalMoves
      .filter(m => hasCaps ? m.captures?.length > 0 : true)
      .map(m => m.from)
  )
  // Pieces that are jump-over candidates (being captured)
  const capturable = new Set(
    sel !== null ? selMoves.flatMap(m => m.captures || []) : []
  )

  const PAD = 14   // px padding inside SVG container
  const SZ  = Math.min(window.innerWidth - 32, window.innerHeight - 260, 360)
  const inner = SZ - PAD * 2

  function px(norm) { return PAD + norm * inner }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>16 Goti</span>
        <div style={{ fontSize:12, lineHeight:1.7, textAlign:'right' }}>
          <div style={{ color:'#fff9c4' }}>⬜ {count.w} pieces</div>
          <div style={{ color:'#4fc3f7' }}>🔵 {count.b} pieces</div>
        </div>
      </div>

      <div style={S.status}>
        {gameOver     ? <span style={{ color:'#ffd700', fontWeight:700 }}>{msg}</span>
        : thinking    ? <span style={{ color:'rgba(255,255,255,0.45)' }}>🤔 AI thinking…</span>
        : hasCaps     ? <span style={{ color:'#e94560', fontWeight:600 }}>⚡ Capture is mandatory!</span>
        : <span style={{ color: currentPlayer==='w' ? '#fff9c4' : '#4fc3f7', fontWeight:600 }}>
            {currentPlayer==='w'
              ? `${playerNames[0]||'White'}'s turn`
              : mode==='solo' ? "AI's turn" : `${playerNames[1]||'Blue'}'s turn`}
          </span>}
      </div>

      {/* SVG board */}
      <div style={{ width:SZ, height:SZ, flexShrink:0 }}>
        <svg width={SZ} height={SZ} style={{ overflow:'visible' }}>
          {/* Board background */}
          <rect x={PAD-6} y={PAD-6} width={inner+12} height={inner+12}
            rx={8} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

          {/* Lines */}
          {LINES.map(([a, b], li) => (
            <line key={li}
              x1={px(POINTS[a].x)} y1={px(POINTS[a].y)}
              x2={px(POINTS[b].x)} y2={px(POINTS[b].y)}
              stroke="rgba(255,255,255,0.2)" strokeWidth={1.2} />
          ))}

          {/* Points */}
          {POINTS.map(({ x, y }, i) => {
            const piece   = board[i]
            const isSel   = sel === i
            const isTarget = validTargets.has(i)
            const isCap   = capturable.has(i)
            const isMovable = !piece && false  // only pieces are movable
            const canMove = movable.has(i) && !gameOver && !isAITurn(state) && !thinking

            const cx = px(x), cy = px(y)
            const r  = piece ? 14 : 6

            return (
              <g key={i} onClick={() => handlePoint(i)} style={{ cursor:'pointer' }}>
                {/* Glow ring for selectable pieces */}
                {canMove && !sel && (
                  <circle cx={cx} cy={cy} r={18} fill="rgba(255,215,0,0.12)"
                    stroke="rgba(255,215,0,0.4)" strokeWidth={1.5} />
                )}

                {/* Main circle */}
                <circle cx={cx} cy={cy}
                  r={isSel ? 16 : piece ? 13 : isTarget ? 9 : 5}
                  fill={
                    isCap   ? 'rgba(233,69,96,0.35)'
                    : isSel ? 'rgba(255,215,0,0.5)'
                    : piece==='w' ? '#fff9c4'
                    : piece==='b' ? '#4fc3f7'
                    : isTarget ? 'rgba(76,175,80,0.45)'
                    : 'rgba(255,255,255,0.1)'
                  }
                  stroke={
                    isCap   ? '#e94560'
                    : isSel ? '#ffd700'
                    : piece==='w' ? 'rgba(200,180,80,0.8)'
                    : piece==='b' ? 'rgba(30,130,200,0.9)'
                    : isTarget ? 'rgba(76,175,80,0.9)'
                    : 'rgba(255,255,255,0.2)'
                  }
                  strokeWidth={isSel || isTarget || isCap ? 2 : 1}
                />

                {/* X mark on capturable pieces */}
                {isCap && (
                  <>
                    <line x1={cx-6} y1={cy-6} x2={cx+6} y2={cy+6} stroke="#e94560" strokeWidth={2} />
                    <line x1={cx+6} y1={cy-6} x2={cx-6} y2={cy+6} stroke="#e94560" strokeWidth={2} />
                  </>
                )}

                {/* Green dot for valid move target */}
                {isTarget && !board[i] && (
                  <circle cx={cx} cy={cy} r={4} fill="rgba(76,175,80,0.9)" />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={S.legend}>
        <span style={{ color:'#fff9c4' }}>⬜ White</span>
        <span style={{ color:'rgba(255,255,255,0.2)', margin:'0 6px' }}>|</span>
        <span style={{ color:'#4fc3f7' }}>🔵 Blue</span>
        <span style={{ color:'rgba(255,255,255,0.2)', margin:'0 6px' }}>|</span>
        <span style={{ color:'#4caf50', fontSize:10 }}>● move target</span>
        <span style={{ color:'rgba(255,255,255,0.2)', margin:'0 6px' }}>|</span>
        <span style={{ color:'#e94560', fontSize:10 }}>× capture</span>
      </div>

      <div style={S.controls}>
        <button onClick={() => {
          play('ui_back')
          engine.undoMove()
          if (mode==='solo') engine.undoMove()
          const s = engine.cloneState()
          setState(s); setLegalMoves(engine.getLegalMoves()); setSel(null); setMsg('')
        }} style={S.btn} disabled={thinking}>↩ Undo</button>
        <button onClick={restart} style={{ ...S.btn, ...S.primary }}>
          {gameOver ? '▶ New Game' : '↺ Restart'}
        </button>
      </div>
    </div>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', alignItems:'center',
    height:'100%', background:'linear-gradient(160deg,#0a1929 0%,#1a1a2e 100%)',
    padding:'10px 12px', gap:8, userSelect:'none', overflow:'hidden' },
  header:{ display:'flex', alignItems:'center', width:'100%', maxWidth:400, gap:8 },
  backBtn:{ background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 12px', borderRadius:10, cursor:'pointer' },
  title:{ flex:1, color:'#fff', fontSize:18, fontWeight:700, textAlign:'center' },
  status:{ height:28, display:'flex', alignItems:'center', fontSize:13 },
  legend:{ fontSize:10, color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center',
    flexWrap:'wrap', justifyContent:'center', gap:2 },
  controls:{ display:'flex', gap:10, width:'100%', maxWidth:400 },
  btn:{ flex:1, padding:'11px 0', borderRadius:12, border:'none',
    background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' },
  primary:{ background:'#ffc107', color:'#1a1a1a' }
}
