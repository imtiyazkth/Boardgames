import { useState, useEffect, useRef, useCallback } from 'react'
import { LudoEngine, LudoAI, SAFE_ZONES, TRACK, HOME_PATH, YARD_SLOTS,
         getTokenCoord, getAbsoluteTrackPos, PLAYER_ENTRY } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

const PC  = ['#e53935','#1565c0','#2e7d32','#f9a825']  // Red Blue Green Yellow
const PCL = ['#ef9a9a','#90caf9','#a5d6a7','#fff176']  // Light
const PE  = ['🔴','🔵','🟢','🟡']
const DICE_FACE = ['','⚀','⚁','⚂','⚃','⚄','⚅']
const GRID = 15

// ─── SVG Board ────────────────────────────────────────────────────────────────
function LudoBoard({ state, legalTokens, onTokenClick }) {
  if (!state) return null
  const G = 38

  const YARD_BG = [
    { x:0,   y:9*G,  w:6*G, h:6*G, fill:'#e53935', p:0 },  // Red
    { x:9*G, y:0,    w:6*G, h:6*G, fill:'#1565c0', p:1 },  // Blue
    { x:0,   y:0,    w:6*G, h:6*G, fill:'#2e7d32', p:2 },  // Green
    { x:9*G, y:9*G,  w:6*G, h:6*G, fill:'#f9a825', p:3 },  // Yellow
  ]

  const STRIPS = [
    { x:6*G, y:9*G,  w:3*G, h:6*G, fill:'#ef9a9a' },  // Red home strip
    { x:9*G, y:6*G,  w:6*G, h:3*G, fill:'#90caf9' },  // Blue home strip
    { x:6*G, y:0,    w:3*G, h:6*G, fill:'#a5d6a7' },  // Green home strip
    { x:0,   y:6*G,  w:6*G, h:3*G, fill:'#fff176' },  // Yellow home strip
  ]

  const S = GRID * G

  // Build token map: coord -> [{player,token,stepCount}]
  const tokenMap = {}
  state.tokens.forEach((playerTokens, p) => {
    playerTokens.forEach((tok, t) => {
      const coord = getTokenCoord(p, tok.stepCount, t)
      const key = `${coord.c},${coord.r}`
      if (!tokenMap[key]) tokenMap[key] = []
      tokenMap[key].push({ p, t, tok })
    })
  })

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth:440, display:'block' }}>
      <rect width={S} height={S} fill="#f0f0f0" rx={8}/>

      {/* Yard quadrants */}
      {YARD_BG.map((z,i) => (
        <g key={i}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.fill} rx={G*0.25}/>
          <rect x={z.x+G*0.5} y={z.y+G*0.5} width={z.w-G} height={z.h-G}
            fill="rgba(255,255,255,0.25)" rx={G*0.15}/>
        </g>
      ))}

      {/* Home color strips */}
      {STRIPS.map((s,i) => (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} opacity={0.7}/>
      ))}

      {/* Track grid cells */}
      {Array.from({length:GRID}, (_,r) => Array.from({length:GRID}, (_,c) => {
        const inYard = (c<6&&r<6)||(c>8&&r<6)||(c<6&&r>8)||(c>8&&r>8)
        const isCenter = c>=6&&c<=8&&r>=6&&r<=8
        if (inYard || isCenter) return null
        // Find if this cell is a safe zone
        const trackIdx = TRACK.findIndex(([tc,tr]) => tc===c&&tr===r)
        const isSafe = trackIdx>=0 && SAFE_ZONES.has(trackIdx)
        return (
          <rect key={`${r}${c}`} x={c*G} y={r*G} width={G} height={G}
            fill={isSafe ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'}
            stroke="rgba(0,0,0,0.06)" strokeWidth={0.5}/>
        )
      }))}

      {/* Star markers on safe zones */}
      {[...SAFE_ZONES].filter(s => s<52).map(s => {
        const [c,r] = TRACK[s]
        return (
          <text key={s} x={c*G+G/2} y={r*G+G*0.68}
            textAnchor="middle" fontSize={G*0.5} opacity={0.6}>★</text>
        )
      })}

      {/* Center diamond */}
      <polygon
        points={`${7.5*G},${6.3*G} ${8.7*G},${7.5*G} ${7.5*G},${8.7*G} ${6.3*G},${7.5*G}`}
        fill="#ffd700" stroke="rgba(0,0,0,0.2)" strokeWidth={1}/>
      <text x={7.5*G} y={7.5*G+5} textAnchor="middle"
        fontSize={G*0.65} fontWeight="bold" fill="#fff">★</text>

      {/* Tokens */}
      {Object.entries(tokenMap).map(([key, tokens]) => {
        const [c,r] = key.split(',').map(Number)
        const cx = (c+0.5)*G, cy = (r+0.5)*G
        const count = tokens.length
        return tokens.map(({ p, t, tok }, idx) => {
          const isLegal = legalTokens.some(l => l.p===p&&l.t===t)
          const radius = count > 1 ? G*0.22 : G*0.32

          // Offset for stacking
          let ox=0, oy=0
          if (count===2) { ox=(idx===0?-1:1)*G*0.18; }
          if (count===3) { ox=(idx-1)*G*0.18; oy=idx===1?-G*0.15:G*0.1 }
          if (count===4) {
            ox=(idx%2===0?-1:1)*G*0.16
            oy=(idx<2?-1:1)*G*0.16
          }

          return (
            <g key={`${p}${t}`}
              onClick={() => isLegal && onTokenClick(p,t)}
              style={{ cursor: isLegal?'pointer':'default' }}>
              {/* Bounce ring for selectable */}
              {isLegal && (
                <circle cx={cx+ox} cy={cy+oy} r={radius*1.6}
                  fill="none" stroke={PC[p]} strokeWidth={2} opacity={0.5}
                  style={{ animation:'ludoPulse 0.8s ease-in-out infinite' }}/>
              )}
              {/* Shadow */}
              <circle cx={cx+ox+1} cy={cy+oy+2} r={radius} fill="rgba(0,0,0,0.25)"/>
              {/* Body */}
              <circle cx={cx+ox} cy={cy+oy} r={radius}
                fill={PC[p]} stroke="#fff" strokeWidth={count>1?1:1.5}/>
              {/* Inner */}
              <circle cx={cx+ox} cy={cy+oy} r={radius*0.45}
                fill="rgba(255,255,255,0.55)"/>
              {/* Bounce overlay */}
              {isLegal && (
                <circle cx={cx+ox} cy={cy+oy} r={radius}
                  fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}
                  style={{ animation:'ludoBounce 0.5s ease-in-out infinite alternate' }}/>
              )}
            </g>
          )
        })
      })}

      <style>{`
        @keyframes ludoPulse {
          0%,100%{r:${38*0.32*1.6};opacity:0.6}
          50%{r:${38*0.32*2.0};opacity:0.2}
        }
        @keyframes ludoBounce {
          from{transform:translateY(0)}
          to{transform:translateY(-3px)}
        }
      `}</style>
    </svg>
  )
}

// ─── Player Panel ─────────────────────────────────────────────────────────────
function PlayerPanel({ name, color, emoji, isActive, isAI, tokensDone, isHuman }) {
  return (
    <div style={{
      flex:1, minWidth:0, padding:'7px 8px', borderRadius:12,
      background: isActive ? `${color}28` : 'rgba(255,255,255,0.04)',
      border:`2px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`,
      boxShadow: isActive ? `0 0 18px ${color}40` : 'none',
      transition:'all 0.25s', position:'relative', overflow:'hidden',
    }}>
      {/* Top bar when active */}
      {isActive && (
        <div style={{
          position:'absolute',top:0,left:0,right:0,height:2.5,
          background:`linear-gradient(90deg,${color},${color}50)`,
        }}/>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
        <div style={{
          width:20, height:20, borderRadius:'50%',
          background: color, flexShrink:0,
          boxShadow: isActive ? `0 0 8px ${color}` : 'none',
          border:'1.5px solid rgba(255,255,255,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10,
        }}>
          {isAI && !isHuman ? '🤖' : ''}
        </div>
        <div style={{
          color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
          fontWeight:700, fontSize:11,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1,
        }}>{name}</div>
        {isActive && (
          <div style={{
            width:6, height:6, borderRadius:'50%', background:color,
            flexShrink:0, animation:'glowPulse 0.9s ease-in-out infinite',
          }}/>
        )}
      </div>
      {/* Token progress dots */}
      <div style={{ display:'flex', gap:3 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width:6, height:6, borderRadius:'50%',
            background: i<tokensDone ? color : 'rgba(255,255,255,0.12)',
            boxShadow: i<tokensDone ? `0 0 5px ${color}` : 'none',
          }}/>
        ))}
      </div>
    </div>
  )
}

// ─── Dice ─────────────────────────────────────────────────────────────────────
function Dice({ value, rolling, canRoll, onRoll, color }) {
  return (
    <button onClick={onRoll} disabled={!canRoll || rolling} style={{
      width:58, height:58, borderRadius:14, flexShrink:0,
      background: canRoll ? '#fff' : 'rgba(255,255,255,0.08)',
      border:`3px solid ${canRoll ? color : 'rgba(255,255,255,0.12)'}`,
      fontSize:34, cursor: canRoll?'pointer':'default',
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow: canRoll ? `0 4px 20px ${color}60` : 'none',
      transition:'all 0.15s',
      transform: rolling ? 'rotate(15deg) scale(0.9)' : canRoll ? 'scale(1.04)' : 'scale(1)',
      animation: rolling ? 'diceRoll 0.12s ease-in-out infinite alternate' : 'none',
    }}>
      {value ? DICE_FACE[value] : canRoll ? '🎲' : '⬜'}
      <style>{`@keyframes diceRoll{from{transform:rotate(-12deg)scale(0.88)}to{transform:rotate(12deg)scale(1.05)}}`}</style>
    </button>
  )
}

// ─── Victory Modal ────────────────────────────────────────────────────────────
function VictoryModal({ winner, names, colors, onRestart, onExit }) {
  return (
    <div style={{
      position:'absolute', inset:0, background:'rgba(0,0,0,0.88)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:50,
    }}>
      <div style={{
        background:'linear-gradient(160deg,#1a1e30,#0f1220)',
        borderRadius:24, padding:'28px 24px', textAlign:'center', width:280,
        border:`2px solid ${colors[winner]}`,
        boxShadow:`0 20px 60px ${colors[winner]}50`,
        animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{fontSize:56,marginBottom:8}}>🏆</div>
        <div style={{fontSize:26,fontWeight:900,color:'#fff',marginBottom:4}}>
          {names[winner]} Wins!
        </div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:18}}>
          {PE[winner]} All tokens home!
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onExit} style={{
            flex:1,padding:'12px 0',borderRadius:12,
            border:'1px solid rgba(255,255,255,0.12)',
            background:'rgba(255,255,255,0.06)',
            color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,cursor:'pointer',
          }}>🏠 Home</button>
          <button onClick={onRestart} style={{
            flex:2,padding:'12px 0',borderRadius:12,border:'none',
            background:`linear-gradient(135deg,${colors[winner]},${colors[winner]}cc)`,
            color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',
          }}>▶ Play Again</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Game ────────────────────────────────────────────────────────────────
export default function LudoGame({ mode='solo', playerCount=4, playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const pc = Math.min(4, Math.max(2, playerCount || 4))

  // Determine human players based on mode
  const humanPlayers = mode==='local2p' ? [0,1]
    : mode==='local3p' ? [0,1,2]
    : mode==='local4p' ? [0,1,2,3]
    : [0]  // solo: only player 0 is human

  const names = playerNames.slice(0,pc).concat(
    ['Red','Blue','Green','Yellow'].slice(playerNames.length,pc)
  )

  const [engine]  = useState(() => new LudoEngine())
  const [ai]      = useState(() => new LudoAI('classic'))
  const [state,   setState]    = useState(null)
  const [rolling, setRolling]  = useState(false)
  const [diceVal, setDiceVal]  = useState(null)
  const [legalTokens, setLegal] = useState([])
  const [msg,     setMsg]      = useState('')
  const [msgTimer,setMsgTimer] = useState(null)
  const aiBusy = useRef(false)

  const isHuman = useCallback(p => humanPlayers.includes(p), [humanPlayers])

  function showMsg(text, ms=2000) {
    setMsg(text)
    clearTimeout(msgTimer)
    setMsgTimer(setTimeout(() => setMsg(''), ms))
  }

  // ── Start game ──────────────────────────────────────────────────────────────
  function startGame() {
    engine.initializeGame({ playerCount:pc, playerNames:names, humanPlayers })
    setState(engine.cloneState())
    setDiceVal(null); setLegal([]); setMsg('')
    aiBusy.current = false
    play('game_start')
  }

  useEffect(() => { startGame() }, [])

  // Rebuild legal tokens when state changes
  useEffect(() => {
    if (!state || state.dice===null || state.gameOver) { setLegal([]); return }
    const moves = engine.getValidMoves()
    setLegal(moves.map(m => ({p:m.player,t:m.token})))
  }, [state])

  // ── AI auto-play ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state || state.gameOver || aiBusy.current) return
    const p = state.currentPlayer
    if (isHuman(p)) return

    aiBusy.current = true

    if (state.dice === null) {
      // AI rolls
      const t = setTimeout(() => {
        doRoll()
        aiBusy.current = false
      }, 600)
      return () => clearTimeout(t)
    }

    // AI moves
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) doApplyMove(move)
      else { engine.autoPass(); setState(engine.cloneState()); setDiceVal(null) }
      aiBusy.current = false
    }, 700)
    return () => clearTimeout(t)
  }, [state])

  // ── Roll dice ───────────────────────────────────────────────────────────────
  async function doRoll() {
    if (!state || state.dice!==null || rolling) return
    setRolling(true)

    // Animate dice
    let frame=0
    const anim = setInterval(() => {
      setDiceVal(Math.ceil(Math.random()*6))
      if (++frame>=8) clearInterval(anim)
    }, 75)
    await new Promise(r => setTimeout(r, 650))
    setRolling(false)

    const res = engine.rollDice()
    setDiceVal(res.dice)
    play('ludo_dice'); vibrate([10])

    const ns = engine.cloneState()
    setState(ns)

    if (res.event==='three_sixes') {
      showMsg('🚫 Three 6s! Turn skipped.')
      setDiceVal(null)
    } else if (res.event==='no_moves') {
      showMsg('😔 No moves available')
      setTimeout(() => {
        engine.autoPass()
        setState(engine.cloneState())
        setDiceVal(null)
      }, 1500)
    } else if (res.event==='auto_move' && res.autoMove) {
      setTimeout(() => {
        doApplyMove(res.autoMove)
      }, 400)
    }
  }

  function handleRoll() {
    const p = state?.currentPlayer
    if (!isHuman(p)) return
    doRoll()
  }

  // ── Apply move ──────────────────────────────────────────────────────────────
  function doApplyMove(move) {
    const res = engine.applyMove(move)
    const ns  = engine.cloneState()
    setState(ns)
    setDiceVal(null); setLegal([])

    if (res.event==='capture') {
      play('ludo_capture'); vibrate([20,10,20])
      showMsg(`💥 ${names[move.player]} cut a token!`)
    } else if (res.event==='goal') {
      play('ludo_finish'); vibrate([30,20,40])
      showMsg(`🏠 Token home!`)
    } else if (res.event==='entered') {
      play('ludo_enter')
      showMsg(`${names[move.player]} entered a token!`, 1000)
    } else {
      play('ludo_move')
    }

    if (ns.gameOver) {
      play('ttt_win'); vibrate([50,30,50,30,80])
    }
  }

  function handleTokenClick(p, t) {
    if (!state || state.gameOver || !isHuman(p)) return
    if (state.currentPlayer !== p) return
    const move = engine.getValidMoves().find(m => m.player===p && m.token===t)
    if (!move) return
    doApplyMove(move)
  }

  if (!state) return null
  const { currentPlayer, dice, gameOver, winner } = state
  const canRoll = !gameOver && dice===null && isHuman(currentPlayer) && !rolling
  const tokensDone = p => state.tokens[p].filter(t=>t.status==='GOAL').length

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      background:`linear-gradient(160deg,${PC[currentPlayer]}18 0%,#0a0b14 40%,#0d1020 100%)`,
      userSelect:'none', overflow:'hidden', position:'relative',
    }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 14px 6px', flexShrink:0,
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        background:'rgba(0,0,0,0.2)',
      }}>
        <button onClick={() => { play('ui_back'); onExit() }} style={{
          background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)',
          color:'#fff', fontSize:18, width:36, height:36, borderRadius:10,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>←</button>
        <span style={{fontSize:22}}>🎲</span>
        <span style={{color:'#fff',fontWeight:800,fontSize:18,flex:1}}>Ludo</span>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontWeight:600,letterSpacing:0.5}}>
          {mode==='solo' ? `${pc}P vs AI`
            : mode==='local2p' ? 'Local 2P'
            : mode==='local3p' ? 'Local 3P'
            : 'Local 4P'}
        </span>
      </div>

      {/* ── Player panels ── */}
      <div style={{
        display:'flex', gap:5, padding:'8px 12px 4px', flexShrink:0,
        overflowX: pc>3 ? 'auto' : 'visible',
      }}>
        {Array.from({length:pc},(_,i)=>(
          <PlayerPanel key={i}
            name={names[i]} color={PC[i]} emoji={PE[i]}
            isActive={currentPlayer===i&&!gameOver}
            isAI={!isHuman(i)} isHuman={isHuman(i)}
            tokensDone={tokensDone(i)}
          />
        ))}
      </div>

      {/* ── Status ── */}
      <div style={{height:26,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {msg ? (
          <div style={{
            fontSize:12,fontWeight:700,color:'#ffd700',padding:'2px 12px',
            background:'rgba(255,215,0,0.1)',borderRadius:20,
            animation:'slideDown 0.2s ease',
          }}>{msg}</div>
        ) : !gameOver && (
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:PC[currentPlayer]}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:PC[currentPlayer],
              animation:'glowPulse 0.9s infinite'}}/>
            {names[currentPlayer]}'s turn
            {!isHuman(currentPlayer) && <span style={{opacity:0.5}}> · AI thinking…</span>}
          </div>
        )}
      </div>

      {/* ── Board ── */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        padding:'0 6px',minHeight:0,overflow:'hidden'}}>
        <LudoBoard
          state={state}
          legalTokens={legalTokens}
          onTokenClick={(p,t) => isHuman(p)&&!gameOver&&handleTokenClick(p,t)}
        />
      </div>

      {/* ── Controls ── */}
      <div style={{
        padding:'8px 14px 14px', flexShrink:0,
        borderTop:'1px solid rgba(255,255,255,0.05)',
        background:'rgba(0,0,0,0.2)',
      }}>
        {!gameOver ? (
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Dice
              value={diceVal} rolling={rolling}
              canRoll={canRoll} onRoll={handleRoll}
              color={PC[currentPlayer]}
            />
            <div style={{flex:1}}>
              {diceVal && (
                <div style={{color:'#fff',fontSize:13,fontWeight:800,marginBottom:3}}>
                  Rolled: <span style={{color:PC[currentPlayer],fontSize:18}}>{diceVal}</span>
                  {diceVal===6&&<span style={{color:'#ffd700',fontSize:11,marginLeft:6}}>+1 bonus!</span>}
                </div>
              )}
              <div style={{color:'rgba(255,255,255,0.35)',fontSize:11}}>
                {canRoll ? '👆 Tap dice to roll'
                  : legalTokens.length>0 ? '👆 Tap a glowing token'
                  : !isHuman(currentPlayer) ? '🤖 AI is playing…'
                  : ''}
              </div>
            </div>
            <button onClick={startGame} style={{
              padding:'10px 14px',borderRadius:12,border:'none',
              background:'rgba(255,255,255,0.1)',color:'#fff',
              fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0,
              fontFamily:'inherit',
            }}>↺ New</button>
          </div>
        ) : (
          <div style={{display:'flex',gap:10}}>
            <button onClick={onExit} style={{flex:1,padding:'13px 0',borderRadius:12,
              border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',
              color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              🏠 Home
            </button>
            <button onClick={startGame} style={{flex:2,padding:'13px 0',borderRadius:12,border:'none',
              background:`linear-gradient(135deg,${PC[0]},${PC[1]})`,
              color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
              boxShadow:'0 4px 20px rgba(229,57,53,0.4)'}}>
              ▶ Play Again
            </button>
          </div>
        )}
      </div>

      {/* Victory */}
      {gameOver && winner!==null && (
        <VictoryModal
          winner={winner} names={names} colors={PC}
          onRestart={startGame} onExit={onExit}
        />
      )}

      <style>{`
        @keyframes glowPulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}
