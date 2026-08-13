import { useState, useEffect, useRef, useCallback } from 'react'
import { LudoEngine, LudoAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const PC = ['#e53935','#1565c0','#2e7d32','#f9a825']   // Red Blue Green Yellow
const PL = ['#ef9a9a','#90caf9','#a5d6a7','#fff176']   // Light tints
const PN = ['Red','Blue','Green','Yellow']
const PE = ['🔴','🔵','🟢','🟡']
const SAFE = new Set([0,8,13,21,26,34,39,47])
const PLAYER_START = [0,13,26,39]

// 52-cell main track: [col, row] on 15×15 grid (same as Ludo King layout)
const TRACK = [
  // Red entry (bottom-left going up col 6)
  [6,13],[6,12],[6,11],[6,10],[6,9],[6,8],
  // left arm →
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  [0,7],[0,6],
  // top-left arm →
  [1,6],[2,6],[3,6],[4,6],[5,6],
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  [7,0],[8,0],
  // right side ↓
  [8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  [14,7],[14,8],
  // bottom-right arm ←
  [13,8],[12,8],[11,8],[10,8],[9,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],
  [8,14],[7,14],
]

// Home columns per player (5 steps into centre)
const HOME_PATH = [
  [[7,13],[7,12],[7,11],[7,10],[7,9]],  // Red   → center
  [[1,7],[2,7],[3,7],[4,7],[5,7]],       // Blue  → center
  [[7,1],[7,2],[7,3],[7,4],[7,5]],       // Green → center
  [[13,7],[12,7],[11,7],[10,7],[9,7]],   // Yellow→ center
]

// Home yard 4-slot positions per player
const YARD = [
  [[2,11],[3,11],[2,12],[3,12]],  // Red   bottom-left
  [[11,2],[12,2],[11,3],[12,3]],  // Blue  top-right
  [[2,2],[3,2],[2,3],[3,3]],      // Green top-left
  [[11,11],[12,11],[11,12],[12,12]], // Yellow bottom-right
]

const GRID = 15   // cells per side
const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅']

function tokenCoord(player, pos, tokenIdx) {
  if (pos === -1) {
    const [c,r] = YARD[player][tokenIdx]
    return { cx: c, cy: r }
  }
  if (pos >= 52 && pos <= 56) {
    const [c,r] = HOME_PATH[player][pos-52]
    return { cx: c, cy: r }
  }
  if (pos === 57) return { cx: 7, cy: 7 }  // center
  const [c,r] = TRACK[pos % 52]
  return { cx: c, cy: r }
}

// ─── Board SVG renderer ───────────────────────────────────────────────────────
function LudoBoard({ state, onTokenClick, legalTokens }) {
  const G = 40   // px per grid cell in SVG (15×15 = 600)
  const S = GRID * G

  // Colour zones for 3×3 home yard quadrants
  const ZONES = [
    { x:0,   y:6*G, w:6*G, h:3*G, fill:'#c8e6c9', label:'🟢', lx:3*G, ly:7.5*G },  // Green left strip
    { x:9*G, y:6*G, w:6*G, h:3*G, fill:'#fff9c4', label:'🟡', lx:12*G,ly:7.5*G }, // Yellow right strip
    { x:6*G, y:0,   w:3*G, h:6*G, fill:'#ef9a9a', label:'🔴', lx:7.5*G,ly:3*G }, // Red top strip
    { x:6*G, y:9*G, w:3*G, h:6*G, fill:'#bbdefb', label:'🔵', lx:7.5*G,ly:12*G}, // Blue bottom strip
  ]

  // Home yard quadrant fills
  const YARDS = [
    { x:0,   y:9*G,  w:6*G, h:6*G, fill:'#e53935' },  // Red yard   (bottom-left)
    { x:9*G, y:0,    w:6*G, h:6*G, fill:'#1565c0' },  // Blue yard  (top-right)
    { x:0,   y:0,    w:6*G, h:6*G, fill:'#2e7d32' },  // Green yard (top-left)
    { x:9*G, y:9*G,  w:6*G, h:6*G, fill:'#f9a825' },  // Yellow yard(bottom-right)
  ]

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth:420, display:'block' }}>
      {/* Background */}
      <rect width={S} height={S} fill="#f5f5f5"/>

      {/* Yard quadrants */}
      {YARDS.map((z,i)=>(
        <g key={`yard${i}`}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.fill} rx={G*0.3}/>
          {/* Inner white box */}
          <rect x={z.x+G*0.5} y={z.y+G*0.5} width={z.w-G} height={z.h-G}
            fill="rgba(255,255,255,0.25)" rx={G*0.2}/>
        </g>
      ))}

      {/* Track strips (coloured) */}
      {ZONES.map((z,i)=>(
        <rect key={`zone${i}`} x={z.x} y={z.y} width={z.w} height={z.h} fill={z.fill} opacity={0.7}/>
      ))}

      {/* Grid cells */}
      {Array.from({length:GRID},(_,r)=>Array.from({length:GRID},(_,c)=>{
        const isSafe = SAFE.has(TRACK.findIndex(([tc,tr])=>tc===c&&tr===r))
        const isCenter = c>=6&&c<=8&&r>=6&&r<=8
        if (isCenter) return null
        // Skip yard areas
        if ((c<6&&r<6)||(c>8&&r<6)||(c<6&&r>8)||(c>8&&r>8)) return null
        return (
          <rect key={`${r}-${c}`} x={c*G} y={r*G} width={G} height={G}
            fill={isSafe?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.15)'}
            stroke="rgba(0,0,0,0.08)" strokeWidth={0.5}/>
        )
      }))}

      {/* Safe zone stars */}
      {SAFE.forEach(si => {
        if (si < 52) {
          const [c,r] = TRACK[si]
          return <text key={`star${si}`} x={c*G+G/2} y={r*G+G/2+4} textAnchor="middle" fontSize={G*0.5}>⭐</text>
        }
      })}
      {[...SAFE].filter(s=>s<52).map(s=>{
        const [c,r]=TRACK[s]
        return <text key={`st${s}`} x={c*G+G/2} y={r*G+G*0.65} textAnchor="middle" fontSize={G*0.55} opacity={0.8}>★</text>
      })}

      {/* Center star */}
      <polygon
        points={`${7.5*G},${6.2*G} ${8*G},${7.5*G} ${7.5*G},${8.8*G} ${7*G},${7.5*G}`}
        fill="gold" stroke="rgba(0,0,0,0.2)" strokeWidth={1}/>
      <text x={7.5*G} y={7.5*G+5} textAnchor="middle" fontSize={G*0.7} fontWeight="bold" fill="#fff">★</text>

      {/* Tokens */}
      {state && state.tokens.map((playerTokens, p) =>
        playerTokens.map((pos, t) => {
          const { cx, cy } = tokenCoord(p, pos, t)
          const isLegal = legalTokens.includes(`${p}-${t}`)
          const r = G * 0.34
          return (
            <g key={`p${p}t${t}`}
              onClick={() => isLegal && onTokenClick(p, t)}
              style={{ cursor: isLegal ? 'pointer' : 'default' }}>
              {/* Pulse ring for selectable tokens */}
              {isLegal && (
                <circle cx={(cx+0.5)*G} cy={(cy+0.5)*G} r={r*1.5}
                  fill="none" stroke={PC[p]} strokeWidth={2} opacity={0.5}
                  style={{ animation:'pulse 0.9s ease-in-out infinite' }}/>
              )}
              {/* Token shadow */}
              <circle cx={(cx+0.5)*G+1} cy={(cy+0.5)*G+2} r={r} fill="rgba(0,0,0,0.3)"/>
              {/* Token body */}
              <circle cx={(cx+0.5)*G} cy={(cy+0.5)*G} r={r}
                fill={PC[p]} stroke="#fff" strokeWidth={1.5}/>
              {/* Inner dot */}
              <circle cx={(cx+0.5)*G} cy={(cy+0.5)*G} r={r*0.4}
                fill="rgba(255,255,255,0.6)"/>
              {/* Bounce when selectable */}
              {isLegal && (
                <circle cx={(cx+0.5)*G} cy={(cy+0.5)*G} r={r}
                  fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.4}
                  style={{ animation:`tokenBounce 0.6s ease-in-out infinite alternate` }}/>
              )}
            </g>
          )
        })
      )}

      <style>{`
        @keyframes pulse {
          0%,100% { r:${40*0.34*1.4}; opacity:0.6 }
          50%      { r:${40*0.34*1.8}; opacity:0.2 }
        }
        @keyframes tokenBounce {
          from { transform: translateY(0); }
          to   { transform: translateY(-3px); }
        }
      `}</style>
    </svg>
  )
}

// ─── Dice Component ───────────────────────────────────────────────────────────
function DiceButton({ value, rolling, onRoll, canRoll, color }) {
  return (
    <button onClick={onRoll} disabled={!canRoll || rolling} style={{
      width: 60, height: 60, borderRadius: 14,
      background: canRoll ? `linear-gradient(135deg,#fff,#f0f0f0)` : 'rgba(255,255,255,0.1)',
      border: `3px solid ${canRoll ? color : 'rgba(255,255,255,0.15)'}`,
      fontSize: 36, cursor: canRoll ? 'pointer' : 'default',
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow: canRoll ? `0 4px 20px ${color}60, 0 2px 8px rgba(0,0,0,0.3)` : 'none',
      transition:'all 0.2s',
      transform: rolling ? 'rotate(20deg) scale(0.9)' : canRoll ? 'scale(1.05)' : 'scale(1)',
      animation: rolling ? 'diceRoll 0.15s ease-in-out infinite alternate' : 'none',
      flexShrink:0,
    }}>
      {value ? DICE_FACES[value] : canRoll ? '🎲' : '⬜'}
    </button>
  )
}

// ─── Player Panel ─────────────────────────────────────────────────────────────
function PlayerPanel({ name, color, tint, emoji, score, isActive, isAI, tokensDone, timer }) {
  return (
    <div style={{
      flex:1, padding:'8px 10px', borderRadius:14, transition:'all 0.25s',
      background: isActive ? `linear-gradient(135deg,${color}30,${color}15)` : 'rgba(255,255,255,0.04)',
      border:`2px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`,
      boxShadow: isActive ? `0 0 20px ${color}40` : 'none',
      position:'relative', overflow:'hidden',
    }}>
      {isActive && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:3,
          background:`linear-gradient(90deg,${color},${color}80)`,
          animation:'timerBar 15s linear forwards',
        }}/>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
        <span style={{ fontSize:18 }}>{emoji}</span>
        <div>
          <div style={{ color: isActive?'#fff':'rgba(255,255,255,0.45)', fontWeight:800, fontSize:12,
            maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {isAI?'🤖 ':''}{name}
          </div>
          <div style={{ display:'flex', gap:2, marginTop:2 }}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{ width:7, height:7, borderRadius:'50%',
                background: i<tokensDone ? color : 'rgba(255,255,255,0.15)',
                border:`1px solid ${i<tokensDone?color:'rgba(255,255,255,0.1)'}`,
                boxShadow: i<tokensDone?`0 0 6px ${color}`:'none',
              }}/>
            ))}
          </div>
        </div>
      </div>
      {isActive && (
        <div style={{ width:6, height:6, borderRadius:'50%', background:color,
          position:'absolute', bottom:8, right:8,
          boxShadow:`0 0 10px ${color}`, animation:'glowPulse 1s ease-in-out infinite' }}/>
      )}
    </div>
  )
}

// ─── Main Game ────────────────────────────────────────────────────────────────
export default function LudoGame({ mode='solo', playerCount=4, playerNames, onExit }) {
  const { play, vibrate } = useAudio()
  const pc = Math.min(4, Math.max(2, playerCount))
  const names = playerNames || PN.slice(0, pc)
  const [engine] = useState(() => new LudoEngine())
  const [state, setState] = useState(null)
  const [ai] = useState(() => new LudoAI('normal'))
  const [rolling, setRolling] = useState(false)
  const [diceVal, setDiceVal] = useState(null)
  const [legalTokens, setLegalTokens] = useState([])
  const [msg, setMsg] = useState('')
  const [scores, setScores] = useState(Array(pc).fill(0))
  const animRef = useRef(false)

  const isHuman = useCallback(p => mode==='local2p' || p===0, [mode])

  function startGame() {
    engine.initializeGame({ playerCount:pc, playerNames:names })
    const s = engine.cloneState()
    setState(s); setDiceVal(null); setLegalTokens([]); setMsg('')
    play('game_start')
  }

  useEffect(() => { startGame() }, [])

  // Compute legal tokens after dice roll
  useEffect(() => {
    if (!state || state.dice===null || state.gameOver) { setLegalTokens([]); return }
    const moves = engine.getLegalMoves().filter(m=>m.action==='move')
    setLegalTokens(moves.map(m=>`${state.currentPlayer}-${m.token}`))
  }, [state])

  // AI auto-play
  useEffect(() => {
    if (!state || state.gameOver || animRef.current) return
    const p = state.currentPlayer
    if (isHuman(p)) return

    // AI needs to roll
    if (state.dice===null) {
      const t = setTimeout(() => {
        handleRoll()
      }, 700)
      return ()=>clearTimeout(t)
    }

    // AI picks a move
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move && move.action==='move') handleTokenClick(p, move.token)
      else if (move) {
        const res = engine.applyMove(move)
        if (res.success) { setState(engine.cloneState()); setDiceVal(null) }
      }
    }, 600)
    return ()=>clearTimeout(t)
  }, [state])

  async function handleRoll() {
    if (!state || state.dice!==null || rolling || animRef.current) return
    setRolling(true)

    // Dice animation — 6 quick random frames
    let frame = 0
    const frames = 8
    const anim = setInterval(()=>{
      setDiceVal(Math.ceil(Math.random()*6))
      if (++frame>=frames) clearInterval(anim)
    }, 80)

    await new Promise(r=>setTimeout(r, frames*80+100))
    setRolling(false)

    const res = engine.applyMove({ action:'roll' })
    if (res.success) {
      const ns = engine.cloneState()
      const d = ns.dice ?? res.newState?.dice
      setDiceVal(ns.dice)
      setState(ns)
      play('ludo_dice'); vibrate([10])

      if (res.event==='three_sixes') {
        setMsg('🚫 Three 6s! Turn skipped.')
        setTimeout(()=>setMsg(''),2000)
        setDiceVal(null)
      }

      // Auto-pass if no moves
      const moves = engine.getLegalMoves()
      if (moves.length===1 && moves[0].action==='pass') {
        setTimeout(()=>{
          engine.applyMove({ action:'pass' })
          setState(engine.cloneState())
          setDiceVal(null); setMsg('')
        }, 800)
      }
    }
  }

  async function handleTokenClick(player, tokenIdx) {
    if (!state || state.currentPlayer!==player) return
    const move = engine.getLegalMoves().find(m=>m.action==='move'&&m.token===tokenIdx)
    if (!move) return

    animRef.current = true
    play('ludo_move'); vibrate([8])

    const res = engine.applyMove(move)
    if (res.success) {
      const ns = engine.cloneState()
      setState(ns); setDiceVal(null); setLegalTokens([])

      if (res.event==='capture') {
        play('ludo_capture'); vibrate([20,10,20])
        setMsg(`💥 ${names[player]} cut a token!`)
        setTimeout(()=>setMsg(''),2000)
      }
      if (res.event==='finish') {
        play('ludo_finish'); vibrate([30,20,30,20,40])
        setMsg(`🏠 Token home!`)
        setTimeout(()=>setMsg(''),1500)
      }
      if (ns.gameOver) {
        play('ttt_win'); vibrate([50,30,50,30,80])
        setScores(s=>{ const n=[...s]; n[ns.winner]=(n[ns.winner]||0)+1; return n })
        setMsg(`🏆 ${names[ns.winner]} wins!`)
      }
    }
    animRef.current = false
  }

  if (!state) return null
  const { currentPlayer, dice, gameOver, tokens } = state
  const canRoll = !gameOver && dice===null && isHuman(currentPlayer) && !animRef.current

  const tokensDone = (p) => tokens[p].filter(t=>t===57).length

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      background:`linear-gradient(160deg, ${PC[currentPlayer]}18 0%, #0a0b14 40%, #0d1020 100%)`,
      userSelect:'none', overflow:'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px 6px',
        borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.2)', flexShrink:0 }}>
        <button onClick={()=>{play('ui_back');onExit()}} style={{
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)',
          color:'#fff', fontSize:18, width:36, height:36, borderRadius:10, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>←</button>
        <span style={{ fontSize:22 }}>🎲</span>
        <span style={{ color:'#fff', fontWeight:800, fontSize:18, flex:1 }}>Ludo</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontWeight:600, letterSpacing:0.5 }}>
          {mode==='solo'?`${pc}P vs AI`:'Local '+pc+'P'}
        </span>
      </div>

      {/* ── Player panels (2 top, 2 bottom or all 4) ── */}
      <div style={{ display:'flex', gap:6, padding:'8px 12px 4px', flexShrink:0 }}>
        {Array.from({length:Math.min(pc,4)},(_,i)=>(
          <PlayerPanel key={i}
            name={names[i]} color={PC[i]} tint={PL[i]} emoji={PE[i]}
            score={scores[i]} isActive={currentPlayer===i&&!gameOver}
            isAI={!isHuman(i)} tokensDone={tokensDone(i)}
          />
        ))}
      </div>

      {/* ── Status message ── */}
      <div style={{ height:28, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {msg ? (
          <div style={{ fontSize:13, fontWeight:700, color:'#ffd700',
            animation:'slideDown 0.2s ease', padding:'2px 12px',
            background:'rgba(255,215,0,0.1)', borderRadius:20 }}>{msg}</div>
        ) : !gameOver ? (
          <div style={{ fontSize:12, fontWeight:600, color: PC[currentPlayer],
            display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:PC[currentPlayer],
              boxShadow:`0 0 8px ${PC[currentPlayer]}`, animation:'glowPulse 1s infinite' }}/>
            {names[currentPlayer]}'s turn
            {!isHuman(currentPlayer) && <span style={{ opacity:0.6 }}> · AI thinking…</span>}
          </div>
        ) : null}
      </div>

      {/* ── Board ── */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'0 8px', minHeight:0, overflow:'hidden' }}>
        <LudoBoard
          state={state}
          legalTokens={legalTokens}
          onTokenClick={(p,t) => isHuman(p) && !gameOver && handleTokenClick(p,t)}
        />
      </div>

      {/* ── Dice + controls ── */}
      <div style={{ padding:'8px 14px 14px', flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.2)' }}>

        {!gameOver ? (
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {/* Dice */}
            <DiceButton
              value={diceVal} rolling={rolling}
              onRoll={handleRoll} canRoll={canRoll}
              color={PC[currentPlayer]}
            />

            <div style={{ flex:1 }}>
              {/* Dice value display */}
              {diceVal && (
                <div style={{ color:'#fff', fontSize:13, fontWeight:800, marginBottom:4 }}>
                  Rolled: <span style={{ color:PC[currentPlayer], fontSize:18 }}>{diceVal}</span>
                  {diceVal===6&&<span style={{ color:'#ffd700', fontSize:11, marginLeft:6 }}>+1 bonus roll!</span>}
                </div>
              )}
              {/* Instruction */}
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>
                {canRoll ? '👆 Tap dice to roll'
                  : legalTokens.length>0 ? '👆 Tap a token to move'
                  : !isHuman(currentPlayer) ? '🤖 AI is playing…'
                  : dice===null ? 'Waiting…' : ''}
              </div>
            </div>

            {/* New game */}
            <button onClick={startGame} style={{
              padding:'10px 14px', borderRadius:12, border:'none',
              background:'rgba(255,255,255,0.1)', color:'#fff',
              fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0,
            }}>↺ New</button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onExit} style={{ flex:1, padding:'13px 0', borderRadius:12,
              border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
              color:'rgba(255,255,255,0.7)', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              🏠 Home
            </button>
            <button onClick={startGame} style={{ flex:2, padding:'13px 0', borderRadius:12,
              border:'none', background:`linear-gradient(135deg,${PC[0]},${PC[1]})`,
              color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer',
              boxShadow:'0 4px 20px rgba(229,57,53,0.4)' }}>
              ▶ Play Again
            </button>
          </div>
        )}
      </div>

      {/* Victory overlay */}
      {gameOver && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.8)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}>
          <div style={{
            background:'linear-gradient(160deg,#1a1e30,#0f1220)',
            borderRadius:24, padding:'28px 24px', textAlign:'center', width:280,
            border:`2px solid ${PC[state.winner]}`,
            boxShadow:`0 20px 60px ${PC[state.winner]}50`,
            animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ fontSize:56, marginBottom:8 }}>🏆</div>
            <div style={{ fontSize:26, fontWeight:900, color:'#fff', marginBottom:4 }}>
              {names[state.winner]} Wins!
            </div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.4)', marginBottom:18 }}>
              {PE[state.winner]} All tokens home!
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onExit} style={{ flex:1, padding:'12px 0', borderRadius:12,
                border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
                color:'rgba(255,255,255,0.7)', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                🏠 Home
              </button>
              <button onClick={startGame} style={{ flex:2, padding:'12px 0', borderRadius:12,
                border:'none', background:`linear-gradient(135deg,${PC[state.winner]},${PC[state.winner]}cc)`,
                color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer' }}>
                ▶ Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes glowPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideDown { from{transform:translateY(-6px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes popIn { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes timerBar { from{width:100%} to{width:0%} }
        @keyframes diceRoll { from{transform:rotate(-15deg)scale(0.85)} to{transform:rotate(15deg)scale(1.1)} }
      `}</style>
    </div>
  )
}
