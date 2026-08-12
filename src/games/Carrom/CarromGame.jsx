import { useState, useEffect, useRef, useCallback } from 'react'
import { CarromEngine, BOARD, PLAY_MIN, PLAY_MAX, POCKET_POS, POCKET_R, R_COIN, R_STRIKER } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

const COLORS = {
  board: '#c8a96e', border: '#8b6914', line: '#a07830',
  white: '#f0ead6', black: '#1a1a1a', queen: '#cc2222',
  striker: '#4a90d9', pocket: '#3a2a0a'
}

export default function CarromGame({ mode = 'solo', difficulty = 'normal', playerNames = [], onExit }) {
  const { play, vibrate } = useAudio()
  const canvasRef  = useRef(null)
  const engineRef  = useRef(null)
  const [gs, setGs] = useState(null)         // game state snapshot for React UI
  const [aiming, setAiming] = useState({ x: BOARD / 2, angle: -Math.PI / 2, power: 0.6 })
  const dragRef = useRef(null)

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const eng = new CarromEngine()
    engineRef.current = eng
    eng.onUpdate = (state) => {
      setGs({ ...state })
      draw(eng, { ...state, power: aiming.power })
      // Sound on events
      if (state.lastEvent) {
        if (state.lastEvent.includes('pocket')) {
          if (state.lastEvent === 'queen_pocket' || state.lastEvent === 'queen_covered')
            { play('carrom_queen'); vibrate([25, 10, 25]) }
          else { play('carrom_pocket'); vibrate([20]) }
        }
        if (state.lastEvent === 'foul') { play('carrom_foul'); vibrate([15, 10, 15]) }
      }
    }
    const s = eng.initializeGame({
      player1Name: playerNames[0] || 'Player',
      aiName: playerNames[1] || 'AI',
      aiMode: mode === 'solo'
    })
    setGs(s)
    play('game_start')
    return () => { eng.stop() }
  }, [])

  // ── Draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback((eng, state) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const scale = canvas.width / BOARD

    ctx.save()
    ctx.scale(scale, scale)

    // Board background
    ctx.fillStyle = COLORS.board
    ctx.fillRect(0, 0, BOARD, BOARD)

    // Border
    ctx.strokeStyle = COLORS.border
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, BOARD - 6, BOARD - 6)

    // Inner play area
    ctx.strokeStyle = COLORS.line
    ctx.lineWidth = 2
    ctx.strokeRect(PLAY_MIN, PLAY_MIN, PLAY_MAX - PLAY_MIN, PLAY_MAX - PLAY_MIN)

    // Center circle
    ctx.beginPath()
    ctx.arc(BOARD / 2, BOARD / 2, 42, 0, Math.PI * 2)
    ctx.strokeStyle = COLORS.line; ctx.lineWidth = 1.5; ctx.stroke()

    // Diagonal lines (decorative)
    ctx.strokeStyle = COLORS.line + '80'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PLAY_MIN + 20, PLAY_MIN + 20); ctx.lineTo(BOARD / 2 - 42, BOARD / 2 - 42)
    ctx.moveTo(PLAY_MAX - 20, PLAY_MIN + 20); ctx.lineTo(BOARD / 2 + 42, BOARD / 2 - 42)
    ctx.moveTo(PLAY_MIN + 20, PLAY_MAX - 20); ctx.lineTo(BOARD / 2 - 42, BOARD / 2 + 42)
    ctx.moveTo(PLAY_MAX - 20, PLAY_MAX - 20); ctx.lineTo(BOARD / 2 + 42, BOARD / 2 + 42)
    ctx.stroke()

    // Pockets
    for (const p of POCKET_POS) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.pocket; ctx.fill()
      ctx.strokeStyle = '#5a3a0a'; ctx.lineWidth = 2; ctx.stroke()
    }

    // Striker aim line — draw for BOTH players during aim phase
    if (state.phase === 'aim') {
      const isAI = state.currentPlayer === 1
      const sx = state.strikerX
      const sy = isAI ? PLAY_MIN + R_STRIKER + 2 : PLAY_MAX - R_STRIKER - 2
      const angle = state.aimAngle
      const len = 180

      // Aim line
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len)
      ctx.setLineDash([7, 5])
      ctx.strokeStyle = isAI ? 'rgba(233,69,96,0.7)' : 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1.8; ctx.stroke()
      ctx.setLineDash([])

      // Striker ghost (shows where striker will fire from)
      ctx.beginPath()
      ctx.arc(sx, sy, R_STRIKER, 0, Math.PI * 2)
      ctx.fillStyle = isAI ? 'rgba(233,69,96,0.35)' : 'rgba(255,255,255,0.18)'
      ctx.fill()
      ctx.strokeStyle = isAI ? 'rgba(233,69,96,0.9)' : 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2; ctx.stroke()

      // Power arc indicator
      const pr = R_STRIKER + 8 + state.power * 20
      ctx.beginPath()
      ctx.arc(sx, sy, pr, angle - 0.4, angle + 0.4)
      ctx.strokeStyle = isAI ? 'rgba(233,69,96,0.5)' : 'rgba(245,166,35,0.6)'
      ctx.lineWidth = 2; ctx.stroke()

      // Baseline stripe
      ctx.beginPath()
      ctx.moveTo(PLAY_MIN + 20, sy); ctx.lineTo(PLAY_MAX - 20, sy)
      ctx.strokeStyle = isAI ? 'rgba(233,69,96,0.25)' : 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1; ctx.stroke()

      // AI label tag
      if (isAI) {
        ctx.fillStyle = 'rgba(233,69,96,0.85)'
        ctx.fillRect(sx - 28, sy - 38, 56, 20)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText('AI', sx, sy - 24)
      }
    }

    // Pieces
    const dd = eng.getDrawData()
    for (const piece of dd.pieces) {
      ctx.beginPath()
      ctx.arc(piece.x, piece.y, piece.r, 0, Math.PI * 2)
      if (piece.type === 'white')   ctx.fillStyle = COLORS.white
      else if (piece.type === 'black') ctx.fillStyle = COLORS.black
      else if (piece.type === 'queen') ctx.fillStyle = COLORS.queen
      else                             ctx.fillStyle = COLORS.striker
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth   = 1.5; ctx.stroke()

      // Inner dot for coins
      if (piece.type !== 'striker') {
        ctx.beginPath()
        ctx.arc(piece.x, piece.y, piece.r * 0.35, 0, Math.PI * 2)
        ctx.fillStyle = piece.type === 'black' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
        ctx.fill()
      }
    }

    ctx.restore()
  }, [])

  // Redraw when aiming state changes
  useEffect(() => {
    if (!gs || !engineRef.current) return
    engineRef.current.setAimAngle(aiming.angle)
    engineRef.current.setPower(aiming.power)
    engineRef.current.setStrikerX(aiming.x)
    if (gs.phase === 'aim') draw(engineRef.current, { ...gs, aimAngle: aiming.angle, strikerX: aiming.x, power: aiming.power })
  }, [aiming, gs?.phase])

  // AI turn
  useEffect(() => {
    if (!gs || gs.currentPlayer !== 1 || gs.phase !== 'aim' || !gs.aiMode || gs.gameOver) return
    const t = setTimeout(() => {
      engineRef.current?.aiShot()
      play('carrom_strike')
    }, 900)
    return () => clearTimeout(t)
  }, [gs?.currentPlayer, gs?.phase])

  // ── Touch/mouse controls ──────────────────────────────────────────────────
  function canvasCoord(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const scl  = BOARD / canvasRef.current.width
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scl,
      y: (clientY - rect.top)  * scl
    }
  }

  function handlePointerDown(e) {
    if (!gs || gs.phase !== 'aim' || gs.currentPlayer !== 0) return
    dragRef.current = { startX: canvasCoord(e).x }
    e.preventDefault()
  }

  function handlePointerMove(e) {
    if (!dragRef.current || !gs || gs.phase !== 'aim') return
    const { x, y } = canvasCoord(e)
    const sy = PLAY_MAX - R_STRIKER - 2
    const angle = Math.atan2(y - sy, x - aiming.x)
    // Only allow angles pointing upward (striker fires toward the board)
    const clampedAngle = Math.max(-Math.PI + 0.15, Math.min(-0.15, angle))
    setAiming(a => ({ ...a, angle: clampedAngle }))
    e.preventDefault()
  }

  function handlePointerUp() { dragRef.current = null }

  function handleFire() {
    if (!gs || gs.phase !== 'aim' || gs.currentPlayer !== 0) return
    play('carrom_strike'); vibrate([20])
    engineRef.current?.fire()
  }

  function handleSlider(e) {
    const pct   = Number(e.target.value) / 100
    const range = (PLAY_MAX - PLAY_MIN - R_STRIKER * 2 - 40)
    const x     = PLAY_MIN + R_STRIKER + 20 + pct * range
    setAiming(a => ({ ...a, x }))
    engineRef.current?.setStrikerX(x)
  }

  function handlePower(e) {
    const p = Number(e.target.value) / 100
    setAiming(a => ({ ...a, power: p }))
    engineRef.current?.setPower(p)
  }

  function restart() {
    engineRef.current?.stop()
    play('game_start')
    const s = engineRef.current?.initializeGame({
      player1Name: playerNames[0] || 'Player',
      aiName: playerNames[1] || 'AI',
      aiMode: mode === 'solo'
    })
    setGs(s)
    draw(engineRef.current, s)
  }

  // Canvas size — fill available width
  const canvasSize = Math.min(window.innerWidth - 24, window.innerHeight - 220, 400)

  if (!gs) return null

  const myWhite = gs.pocketedWhite
  const myBlack = gs.pocketedBlack
  const isMeTurn = gs.currentPlayer === 0 && gs.phase === 'aim'

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Carrom</span>
        <div style={{ textAlign:'right', fontSize:12, lineHeight:1.7 }}>
          <div style={{ color:'#f0ead6' }}>⬜ {myWhite} pocketed</div>
          <div style={{ color:'#888' }}>⬛ {myBlack} pocketed</div>
        </div>
      </div>

      {/* Status */}
      <div style={S.status}>
        {gs.gameOver
          ? <span style={{ color:'#ffd700', fontWeight:700 }}>
              {gs.winner === 0 ? `${playerNames[0]||'Player'} wins! 🎉` : 'AI wins!'}
            </span>
          : gs.phase === 'moving'
            ? <span style={{ color:'rgba(255,255,255,0.5)' }}>In motion…</span>
            : gs.currentPlayer === 0
              ? <span style={{ color:'#4a90d9' }}>🎯 Your turn (White)</span>
              : <span style={{ color:'rgba(255,255,255,0.45)' }}>🤖 AI is aiming…</span>}
        {gs.lastEvent === 'foul' && <span style={{ color:'#e94560', marginLeft:8 }}>⚠️ Foul!</span>}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize} height={canvasSize}
        style={{ borderRadius:12, border:'3px solid #8b6914', touchAction:'none', cursor: isMeTurn ? 'crosshair' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {/* Controls — only show during player's aim turn */}
      {isMeTurn && !gs.gameOver && (
        <div style={S.controlPanel}>
          <div style={S.sliderRow}>
            <span style={S.sliderLabel}>◀ Position ▶</span>
            <input type="range" min={0} max={100} defaultValue={50}
              onInput={handleSlider} style={S.slider} />
          </div>
          <div style={S.sliderRow}>
            <span style={S.sliderLabel}>Power: {Math.round(aiming.power * 100)}%</span>
            <input type="range" min={15} max={100} defaultValue={60}
              onInput={handlePower} style={S.slider} />
          </div>
          <div style={S.aimHint}>Drag canvas to aim · Slide to position · Tap to fire</div>
          <button onClick={handleFire} style={S.fireBtn}>🎯 Strike!</button>
        </div>
      )}

      {gs.gameOver && (
        <div style={S.controls}>
          <button onClick={restart} style={{ ...S.btn, ...S.primary, flex:1 }}>▶ Play Again</button>
        </div>
      )}

      {/* Scoreboard */}
      <div style={S.scores}>
        <span style={{ color:'#f0ead6' }}>⬜ You: {myWhite}</span>
        {gs.queenCovered && <span style={{ color:'#cc2222', margin:'0 8px' }}>👑 Queen covered</span>}
        <span style={{ color:'#888' }}>⬛ AI: {myBlack}</span>
      </div>
    </div>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', alignItems:'center',
    height:'100%', background:'linear-gradient(160deg,#2a1a08 0%,#1a1a2e 100%)',
    padding:12, gap:8, overflow:'hidden', userSelect:'none' },
  header: { display:'flex', alignItems:'center', width:'100%', maxWidth:420, gap:8 },
  backBtn:{ background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 14px', borderRadius:10, cursor:'pointer' },
  title:  { flex:1, color:'#fff', fontSize:18, fontWeight:700, textAlign:'center' },
  status: { height:28, display:'flex', alignItems:'center', gap:4, fontSize:13 },
  controlPanel:{ width:'100%', maxWidth:420, display:'flex', flexDirection:'column', gap:6 },
  sliderRow:{ display:'flex', flexDirection:'column', gap:2 },
  sliderLabel:{ color:'rgba(255,255,255,0.5)', fontSize:11 },
  slider: { width:'100%', accentColor:'#f5a623' },
  aimHint:{ color:'rgba(255,255,255,0.3)', fontSize:10, textAlign:'center' },
  fireBtn:{ padding:'13px 0', borderRadius:12, border:'none', background:'#f5a623',
    color:'#1a1a2e', fontSize:16, fontWeight:700, cursor:'pointer', width:'100%' },
  controls:{ display:'flex', gap:10, width:'100%', maxWidth:420 },
  btn:    { padding:'12px 0', borderRadius:12, border:'none', background:'rgba(255,255,255,0.1)',
    color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' },
  primary:{ background:'#f5a623', color:'#1a1a2e' },
  scores: { display:'flex', alignItems:'center', fontSize:12, color:'rgba(255,255,255,0.5)' }
}
