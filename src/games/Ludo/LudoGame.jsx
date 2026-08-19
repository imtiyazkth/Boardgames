import { useState, useEffect, useRef, useCallback } from 'react'
import { LudoEngine, LudoAI, SAFE_ZONES, TRACK, HOME_PATH,
         YARD_SLOTS, getTokenCoord, PLAYER_ENTRY } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

/**
 * Ludo King exact replica:
 * - Red: top-left (row 1-9, col 1-6)
 * - Green: top-right (row 1-9, col 10-15)
 * - Blue: bottom-left (row 10-15, col 1-6)  [actually bottom-left in LK = You]
 * - Yellow: bottom-right (row 10-15, col 10-15)
 *
 * From screenshot: top-left=Red(Computer1), top-right=Green(Computer2),
 *                  bottom-left=Blue(You), bottom-right=Yellow(Computer3)
 *
 * Token: concentric circle design (not pin)
 * Track arrows: colored strips with arrows
 */

// ── Ludo King exact colors ──────────────────────────────────────────────────
const LUDO = {
  red:    { bg:'#e53935', mid:'#ef5350', light:'#ffcdd2', dark:'#b71c1c' },
  green:  { bg:'#43a047', mid:'#66bb6a', light:'#c8e6c9', dark:'#1b5e20' },
  blue:   { bg:'#1e88e5', mid:'#42a5f5', light:'#bbdefb', dark:'#0d47a1' },
  yellow: { bg:'#ffb300', mid:'#ffd54f', light:'#fff9c4', dark:'#ff6f00' },
}

// Player order: 0=Red(top-left), 1=Green(top-right), 2=Blue(bottom-left), 3=Yellow(bottom-right)
const PC   = [LUDO.red.bg,   LUDO.green.bg,  LUDO.blue.bg,   LUDO.yellow.bg  ]
const PCM  = [LUDO.red.mid,  LUDO.green.mid, LUDO.blue.mid,  LUDO.yellow.mid ]
const PCL  = [LUDO.red.light,LUDO.green.light,LUDO.blue.light,LUDO.yellow.light]
const PCD  = [LUDO.red.dark, LUDO.green.dark,LUDO.blue.dark, LUDO.yellow.dark ]
const PN   = ['Red','Green','Blue','Yellow']
const G    = 15

const DICE_DOTS = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]],
}

function delay(ms){ return new Promise(r=>setTimeout(r,ms)) }

// ── Token: Ludo King concentric circle style ─────────────────────────────────
function LudoToken({ cx, cy, r, color, colorMid, colorLight, colorDark,
                     selectable, idx, total }) {
  const scale = selectable ? 1.15 : 1
  return (
    <g style={{cursor:selectable?'pointer':'default'}}
      transform={`translate(${cx},${cy}) scale(${scale})`}>
      {/* Outer shadow ring */}
      <circle r={r} fill="rgba(0,0,0,0.25)" transform="translate(1,2)"/>
      {/* Outer colored ring */}
      <circle r={r} fill={colorDark}/>
      {/* Mid ring */}
      <circle r={r*0.82} fill={color}/>
      {/* White ring */}
      <circle r={r*0.65} fill="rgba(255,255,255,0.9)"/>
      {/* Inner colored circle */}
      <circle r={r*0.48} fill={colorMid}/>
      {/* Inner shine */}
      <circle r={r*0.22} cx={-r*0.15} cy={-r*0.15}
        fill="rgba(255,255,255,0.55)"/>
      {/* Pulse ring when selectable */}
      {selectable && (
        <circle r={r*1.35} fill="none" stroke={color}
          strokeWidth={2} opacity={0.6}
          style={{animation:'lkPulse 0.7s ease-in-out infinite'}}/>
      )}
    </g>
  )
}

// ── Dice SVG (Ludo King style - white with dots) ─────────────────────────────
function DiceFace({ value, size=54 }) {
  const dots = DICE_DOTS[value] || []
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {/* White rounded square */}
      <rect x={4} y={4} width={92} height={92} rx={18}
        fill="#fff" stroke="rgba(0,0,0,0.15)" strokeWidth={2}/>
      {/* Inner shadow */}
      <rect x={4} y={4} width={92} height={92} rx={18}
        fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={6}/>
      {dots.map(([dx,dy],i)=>(
        <circle key={i} cx={dx} cy={dy} r={9} fill="#1a1a2e"/>
      ))}
      {/* Red pip on 1 */}
      {value===1 && <circle cx={50} cy={50} r={9} fill="#e53935"/>}
    </svg>
  )
}

// ── Full Ludo King Board ─────────────────────────────────────────────────────
function LudoKingBoard({ state, legalTokens, onTokenClick }) {
  if (!state) return null

  const CS = 32  // cell size in px for SVG
  const S  = G * CS

  // Build token position map
  const tokenMap = {}
  state.tokens.forEach((playerTokens, p) => {
    playerTokens.forEach((tok, t) => {
      const coord = getTokenCoord(p, tok.stepCount, t)
      const key = `${coord.c},${coord.r}`
      if (!tokenMap[key]) tokenMap[key] = []
      tokenMap[key].push({ p, t, tok, stepCount: tok.stepCount })
    })
  })

  // Yard 4-slot positions (fixed 2x2 inside each colored quadrant)
  // Player 0 (Red):    top-left quadrant    (cols 0-5, rows 0-8) - inner box rows 1-7 cols 0.8-5.2
  // Player 1 (Green):  top-right quadrant   (cols 9-14, rows 0-8)
  // Player 2 (Blue):   bottom-left quadrant (cols 0-5, rows 9-14)
  // Player 3 (Yellow): bottom-right quadrant(cols 9-14, rows 9-14)
  const YARD_POS = [
    // Red (top-left): tokens at grid positions inside 6x9 quadrant
    [[1.5,1.5],[3.5,1.5],[1.5,3.5],[3.5,3.5]],
    // Green (top-right)
    [[9.5,1.5],[11.5,1.5],[9.5,3.5],[11.5,3.5]],
    // Blue (bottom-left)
    [[1.5,10.5],[3.5,10.5],[1.5,12.5],[3.5,12.5]],
    // Yellow (bottom-right)
    [[9.5,10.5],[11.5,10.5],[9.5,12.5],[11.5,12.5]],
  ]

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%"
      style={{display:'block',maxWidth:440}}>

      {/* ── Base board ── */}
      <rect width={S} height={S} fill="#f0f0f0" rx={6}/>

      {/* ── 4 Large colored quadrants ── */}
      {/* Red - top-left: rows 0-8, cols 0-5 */}
      <rect x={0}    y={0}    width={6*CS} height={9*CS} fill={PC[0]} rx={0}/>
      {/* Green - top-right: rows 0-8, cols 9-14 */}
      <rect x={9*CS} y={0}    width={6*CS} height={9*CS} fill={PC[1]} rx={0}/>
      {/* Blue - bottom-left: rows 9-14, cols 0-5 */}
      <rect x={0}    y={9*CS} width={6*CS} height={6*CS} fill={PC[2]} rx={0}/>
      {/* Yellow - bottom-right: rows 9-14, cols 9-14 */}
      <rect x={9*CS} y={9*CS} width={6*CS} height={6*CS} fill={PC[3]} rx={0}/>

      {/* ── Inner white yards ── */}
      {/* Red inner */}
      <rect x={CS*0.6} y={CS*0.6} width={4.8*CS} height={7.8*CS}
        fill="rgba(255,255,255,0.85)" rx={4}/>
      {/* Green inner */}
      <rect x={9.6*CS} y={CS*0.6} width={4.8*CS} height={7.8*CS}
        fill="rgba(255,255,255,0.85)" rx={4}/>
      {/* Blue inner */}
      <rect x={CS*0.6} y={9.6*CS} width={4.8*CS} height={4.8*CS}
        fill="rgba(255,255,255,0.85)" rx={4}/>
      {/* Yellow inner */}
      <rect x={9.6*CS} y={9.6*CS} width={4.8*CS} height={4.8*CS}
        fill="rgba(255,255,255,0.85)" rx={4}/>

      {/* ── Colored home-path strips ── */}
      {/* Red home strip (bottom center col 7, rows 9-14) */}
      <rect x={6*CS} y={9*CS} width={3*CS} height={6*CS} fill={PCL[0]}/>
      {/* Red arrow strip rows 9-14 center col */}
      <polygon points={`${7.5*CS},${9.2*CS} ${8.8*CS},${12*CS} ${7.5*CS},${14.5*CS} ${6.2*CS},${12*CS}`}
        fill={PC[0]} opacity={0.7}/>

      {/* Green home strip (top center col 7, rows 0-6) */}
      <rect x={6*CS} y={0} width={3*CS} height={6*CS} fill={PCL[1]}/>
      <polygon points={`${7.5*CS},${0.5*CS} ${8.8*CS},${3*CS} ${7.5*CS},${5.5*CS} ${6.2*CS},${3*CS}`}
        fill={PC[1]} opacity={0.7}/>

      {/* Blue home strip (left center row 7, cols 0-6) */}
      <rect x={0} y={6*CS} width={6*CS} height={3*CS} fill={PCL[2]}/>
      <polygon points={`${0.5*CS},${7.5*CS} ${3*CS},${6.2*CS} ${5.5*CS},${7.5*CS} ${3*CS},${8.8*CS}`}
        fill={PC[2]} opacity={0.7}/>

      {/* Yellow home strip (right center row 7, cols 9-15) */}
      <rect x={9*CS} y={6*CS} width={6*CS} height={3*CS} fill={PCL[3]}/>
      <polygon points={`${14.5*CS},${7.5*CS} ${12*CS},${6.2*CS} ${9.5*CS},${7.5*CS} ${12*CS},${8.8*CS}`}
        fill={PC[3]} opacity={0.7}/>

      {/* ── Track cells (white grid on track) ── */}
      {Array.from({length:G},(_,r)=>Array.from({length:G},(_,c)=>{
        const inQuad = (c<6&&r<9)||(c>8&&r<9)||(c<6&&r>8)||(c>8&&r>8)
        const isCenter = c>=6&&c<=8&&r>=6&&r<=8
        if (inQuad || isCenter) return null
        const trackIdx = TRACK.findIndex(([tc,tr])=>tc===c&&tr===r)
        const isSafe = trackIdx>=0 && SAFE_ZONES.has(trackIdx)
        return (
          <rect key={`${r}-${c}`}
            x={c*CS} y={r*CS} width={CS} height={CS}
            fill={isSafe?'rgba(255,255,255,0.95)':'rgba(255,255,255,0.7)'}
            stroke="rgba(0,0,0,0.1)" strokeWidth={0.5}/>
        )
      }))}

      {/* ── Safe zone star markers ── */}
      {[...SAFE_ZONES].filter(s=>s<52).map(s=>{
        const [c,r]=TRACK[s]
        return <text key={s} x={(c+0.5)*CS} y={(r+0.5)*CS+5}
          textAnchor="middle" fontSize={CS*0.55} opacity={0.4}>☆</text>
      })}

      {/* ── Direction arrows on track entry ── */}
      {/* Green entry arrow (col 7, row 1 - points down) */}
      <text x={7.5*CS} y={1.7*CS} textAnchor="middle" fontSize={CS*0.65}
        fill={PC[1]} fontWeight="900">↓</text>
      {/* Red entry arrow (col 7, row 13 - points up) */}
      <text x={7.5*CS} y={13.7*CS} textAnchor="middle" fontSize={CS*0.65}
        fill={PC[0]} fontWeight="900">↑</text>
      {/* Blue entry arrow (col 1, row 7 - points right) */}
      <text x={1.5*CS} y={7.7*CS} textAnchor="middle" fontSize={CS*0.65}
        fill={PC[2]} fontWeight="900">→</text>
      {/* Yellow entry arrow (col 13, row 7 - points left) */}
      <text x={13.5*CS} y={7.7*CS} textAnchor="middle" fontSize={CS*0.65}
        fill={PC[3]} fontWeight="900">←</text>

      {/* ── Center star diamond ── */}
      <polygon
        points={`${7.5*CS},${6.1*CS} ${8.9*CS},${7.5*CS} ${7.5*CS},${8.9*CS} ${6.1*CS},${7.5*CS}`}
        fill="#ffd700" stroke="rgba(0,0,0,0.15)" strokeWidth={1}/>
      <text x={7.5*CS} y={7.5*CS+6} textAnchor="middle"
        fontSize={CS*0.75} fill="white" fontWeight="bold">★</text>

      {/* ── Yard tokens (BASE status) ── */}
      {state.tokens.map((playerTokens, p) =>
        playerTokens.map((tok, t) => {
          if (tok.status !== 'BASE') return null
          const [gx, gy] = YARD_POS[p][t]
          const isLegal = legalTokens.some(l=>l.p===p&&l.t===t)
          return (
            <g key={`yard-${p}-${t}`}
              onClick={()=>isLegal&&onTokenClick(p,t)}>
              <LudoToken
                cx={gx*CS} cy={gy*CS} r={CS*0.36}
                color={PC[p]} colorMid={PCM[p]}
                colorLight={PCL[p]} colorDark={PCD[p]}
                selectable={isLegal}
              />
            </g>
          )
        })
      )}

      {/* ── Track/HomePath tokens ── */}
      {Object.entries(tokenMap).map(([key,tokens])=>{
        const [c,r]=key.split(',').map(Number)
        if (c<0||c>14||r<0||r>14) return null
        // Skip yard coords (handled above)
        const isYardCoord = tokens.every(({tok})=>tok.status==='BASE')
        if (isYardCoord) return null

        const cx=(c+0.5)*CS, cy=(r+0.5)*CS
        const count=tokens.length
        const baseR = count>1 ? CS*0.27 : CS*0.35

        return tokens.map(({p,t,tok},idx)=>{
          const isLegal=legalTokens.some(l=>l.p===p&&l.t===t)
          // Offset for stacking
          let ox=0,oy=0
          if(count===2){ox=(idx===0?-1:1)*CS*0.22}
          if(count===3){
            const ang=(idx/3)*Math.PI*2-Math.PI/2
            ox=Math.cos(ang)*CS*0.2;oy=Math.sin(ang)*CS*0.2
          }
          if(count>=4){
            ox=((idx%2)*2-1)*CS*0.18
            oy=(idx<2?-1:1)*CS*0.18
          }
          return (
            <g key={`${p}-${t}`}
              onClick={()=>isLegal&&onTokenClick(p,t)}>
              <LudoToken
                cx={cx+ox} cy={cy+oy} r={baseR}
                color={PC[p]} colorMid={PCM[p]}
                colorLight={PCL[p]} colorDark={PCD[p]}
                selectable={isLegal}
              />
            </g>
          )
        })
      })}

      <style>{`
        @keyframes lkPulse{
          0%,100%{opacity:0.7;transform:scale(1)}
          50%{opacity:0.3;transform:scale(1.15)}
        }
      `}</style>
    </svg>
  )
}

// ── Player info box (top/bottom like Ludo King) ──────────────────────────────
function PlayerBox({ p, name, isActive, isAI, tokensDone, color, light, dark, side }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',gap:6,
      padding:'6px 8px',borderRadius:10,
      background:isActive?`${color}30`:'rgba(255,255,255,0.06)',
      border:`2px solid ${isActive?color:'rgba(255,255,255,0.12)'}`,
      boxShadow:isActive?`0 0 18px ${color}50`:'none',
      transition:'all 0.2s',flex:1,minWidth:0,
    }}>
      {/* Token icon */}
      <svg width={24} height={24} viewBox="0 0 100 100">
        <circle r={45} cx={50} cy={50} fill={dark}/>
        <circle r={37} cx={50} cy={50} fill={color}/>
        <circle r={28} cx={50} cy={50} fill="rgba(255,255,255,0.9)"/>
        <circle r={20} cx={50} cy={50} fill={color}/>
        <circle cx={42} cy={42} r={8} fill="rgba(255,255,255,0.5)"/>
      </svg>
      <div style={{flex:1,minWidth:0}}>
        <div style={{
          color:isActive?'#fff':'rgba(255,255,255,0.5)',
          fontWeight:700,fontSize:11,
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
        }}>{isAI?'🤖 ':''}{name}</div>
        {/* Token progress */}
        <div style={{display:'flex',gap:2,marginTop:2}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{
              width:6,height:6,borderRadius:'50%',
              background:i<tokensDone?color:'rgba(255,255,255,0.15)',
              boxShadow:i<tokensDone?`0 0 4px ${color}`:'none',
            }}/>
          ))}
        </div>
      </div>
      {isActive&&<div style={{
        width:7,height:7,borderRadius:'50%',background:color,
        animation:'lkGlow 0.8s ease-in-out infinite',flexShrink:0,
      }}/>}
    </div>
  )
}

// ── Main Ludo Game ────────────────────────────────────────────────────────────
export default function LudoGame({ mode='solo', playerCount=4, playerNames=[], onExit, onGameOver }) {
  const { play, vibrate } = useAudio()
  const pc = Math.min(4, Math.max(2, playerCount||4))

  const humanPlayers = mode==='local2p'?[0,1]:mode==='local3p'?[0,1,2]:mode==='local4p'?[0,1,2,3]:[0]
  const names = Array.from({length:pc},(_,i)=>
    playerNames[i] || (humanPlayers.includes(i)
      ? (i===0&&mode==='solo'?'You':`Player ${i+1}`)
      : `Computer ${i}`)
  )

  const [engine]  = useState(()=>new LudoEngine())
  const [ai]      = useState(()=>new LudoAI('classic'))
  const [state,   setState]   = useState(null)
  const [rolling, setRolling] = useState(false)
  const [diceVal, setDiceVal] = useState(null)
  const [legal,   setLegal]   = useState([])
  const [msg,     setMsg]     = useState('')
  const [msgClr,  setMsgClr]  = useState('#fff')
  const aiBusy = useRef(false)

  const isHuman = useCallback(p=>humanPlayers.includes(p),[humanPlayers])

  function showMsg(text,color='#ffd700',ms=2000){
    setMsg(text);setMsgClr(color)
    setTimeout(()=>setMsg(''),ms)
  }

  function startGame(){
    engine.initializeGame({playerCount:pc,playerNames:names,humanPlayers})
    setState(engine.cloneState())
    setDiceVal(null);setLegal([]);setMsg('')
    aiBusy.current=false;setRolling(false)
    play('game_start')
  }

  useEffect(()=>{startGame()},[])

  useEffect(()=>{
    if(!state||state.dice===null||state.gameOver){setLegal([]);return}
    const moves=engine.getValidMoves()
    setLegal(moves.map(m=>({p:m.player,t:m.token})))
  },[state])

  // AI auto-play
  useEffect(()=>{
    if(!state||state.gameOver||aiBusy.current) return
    const p=state.currentPlayer
    if(isHuman(p)) return
    aiBusy.current=true
    if(state.dice===null){
      setTimeout(()=>{doRoll();aiBusy.current=false},800)
    } else {
      setTimeout(()=>{
        const move=ai.getBestMove(engine)
        if(move) doApplyMove(move)
        else{engine.autoPass();setState(engine.cloneState());setDiceVal(null)}
        aiBusy.current=false
      },900)
    }
  },[state])

  async function doRoll(){
    if(!state||state.dice!==null||rolling) return
    setRolling(true)
    play('ludo_dice');vibrate([15])
    // Dice roll animation
    for(let i=0;i<8;i++){
      setDiceVal(Math.ceil(Math.random()*6))
      await delay(65)
    }
    setRolling(false)

    const res=engine.rollDice()
    setDiceVal(res.dice)
    const ns=engine.cloneState()
    setState(ns)

    if(res.event==='three_sixes'){
      showMsg('🚫 Three 6s! Turn skipped.','#e94560')
      setDiceVal(null)
    } else if(res.event==='no_moves'){
      showMsg('No moves — passing turn','rgba(255,255,255,0.5)')
      setTimeout(()=>{engine.autoPass();setState(engine.cloneState());setDiceVal(null)},1500)
    } else if(res.event==='auto_move'&&res.autoMove){
      setTimeout(()=>doApplyMove(res.autoMove),400)
    }
    if(res.dice===6&&res.event!=='three_sixes') showMsg('🎲 Roll again!',PC[state.currentPlayer],1200)
  }

  function handleRoll(){
    if(!state||state.dice!==null||!isHuman(state.currentPlayer)||rolling) return
    doRoll()
  }

  function doApplyMove(move){
    const res=engine.applyMove(move)
    const ns=engine.cloneState()
    setState(ns);setDiceVal(null);setLegal([])
    if(res.event==='capture'){
      play('ludo_capture');vibrate([25,15,25])
      showMsg(`💥 ${names[move.player]} cut a token!`,PC[move.player])
    } else if(res.event==='goal'){
      play('ludo_finish');vibrate([30,20,40])
      showMsg('🏠 Token home!','#4caf50')
    } else if(res.event==='entered'){
      play('ludo_enter')
    } else {
      play('ludo_move');vibrate([6])
    }
    if(ns.gameOver){
      play('ttt_win');vibrate([60,30,80])
      onGameOver?.({winner:names[ns.winner]})
    }
  }

  function handleTokenClick(p,t){
    if(!state||state.gameOver||!isHuman(p)||state.currentPlayer!==p) return
    const move=engine.getValidMoves().find(m=>m.player===p&&m.token===t)
    if(!move) return
    doApplyMove(move)
  }

  if(!state) return null
  const {currentPlayer,gameOver,winner,tokens}=state
  const canRoll=!gameOver&&state.dice===null&&isHuman(currentPlayer)&&!rolling
  const tokensDone=p=>tokens[p].filter(t=>t.status==='GOAL').length

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background:`linear-gradient(160deg,${PC[currentPlayer]}12 0%,#0d0d1a 40%)`,
      userSelect:'none',overflow:'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex',alignItems:'center',gap:10,
        padding:'10px 14px 6px',flexShrink:0,
        background:'rgba(0,0,0,0.3)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <button onClick={onExit} style={BTN}>←</button>
        <span style={{fontSize:22,filter:`drop-shadow(0 0 10px ${PC[currentPlayer]}80)`}}>🎲</span>
        <span style={{color:'#fff',fontWeight:900,fontSize:18,flex:1}}>Ludo</span>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontWeight:600,
          background:'rgba(255,255,255,0.08)',padding:'3px 8px',borderRadius:8}}>
          {mode==='solo'?`${pc}P vs AI`:mode==='local2p'?'2P':mode==='local3p'?'3P':'4P'}
        </span>
      </div>

      {/* ── Player panels ── */}
      <div style={{display:'flex',gap:6,padding:'6px 10px 3px',flexShrink:0}}>
        {Array.from({length:pc},(_,i)=>(
          <PlayerBox key={i} p={i} name={names[i]}
            isActive={currentPlayer===i&&!gameOver}
            isAI={!isHuman(i)} tokensDone={tokensDone(i)}
            color={PC[i]} light={PCL[i]} dark={PCD[i]}/>
        ))}
      </div>

      {/* ── Turn / message ── */}
      <div style={{height:24,display:'flex',alignItems:'center',
        justifyContent:'center',flexShrink:0}}>
        {msg?(
          <div style={{fontSize:12,fontWeight:700,color:msgClr,
            padding:'1px 12px',borderRadius:20,background:'rgba(0,0,0,0.4)',
            animation:'lkMsgIn 0.25s ease'}}>
            {msg}
          </div>
        ):(
          <div style={{display:'flex',alignItems:'center',gap:5,
            fontSize:12,fontWeight:700,color:PC[currentPlayer]}}>
            <div style={{width:7,height:7,borderRadius:'50%',
              background:PC[currentPlayer],
              animation:'lkGlow 0.9s infinite'}}/>
            {names[currentPlayer]}'s turn
            {!isHuman(currentPlayer)&&<span style={{opacity:0.5}}> · AI…</span>}
          </div>
        )}
      </div>

      {/* ── Board ── */}
      <div style={{flex:1,display:'flex',alignItems:'center',
        justifyContent:'center',padding:'2px 6px',minHeight:0,overflow:'hidden'}}>
        <LudoKingBoard
          state={state}
          legalTokens={legal}
          onTokenClick={(p,t)=>isHuman(p)&&!gameOver&&handleTokenClick(p,t)}
        />
      </div>

      {/* ── Bottom: Dice + controls ── */}
      <div style={{
        padding:'8px 14px 14px',flexShrink:0,
        background:'rgba(0,0,0,0.3)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
      }}>
        {!gameOver?(
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {/* Ludo King dice button */}
            <button onClick={handleRoll} disabled={!canRoll||rolling}
              style={{
                width:66,height:66,borderRadius:16,flexShrink:0,
                background:canRoll?'#fff':'rgba(255,255,255,0.08)',
                border:`3px solid ${canRoll?PC[currentPlayer]:'rgba(255,255,255,0.15)'}`,
                padding:0,cursor:canRoll?'pointer':'default',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:canRoll?`0 6px 24px ${PC[currentPlayer]}70`:'none',
                transform:rolling?'rotate(25deg) scale(0.85)':canRoll?'scale(1.05)':'scale(1)',
                transition:'all 0.15s',
                animation:canRoll&&!rolling?'lkDiceWiggle 2s ease-in-out infinite':'none',
              }}>
              {diceVal&&!rolling
                ? <DiceFace value={diceVal} size={54}/>
                : canRoll
                ? <span style={{fontSize:38}}>🎲</span>
                : <span style={{fontSize:34,opacity:0.3}}>⬜</span>
              }
            </button>

            <div style={{flex:1}}>
              {diceVal&&!rolling&&(
                <div style={{color:'#fff',fontSize:14,fontWeight:900,marginBottom:3}}>
                  Rolled: <span style={{color:PC[currentPlayer],fontSize:20}}>{diceVal}</span>
                  {diceVal===6&&<span style={{color:'#ffd700',fontSize:11,marginLeft:6}}>+1 bonus!</span>}
                </div>
              )}
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:11}}>
                {canRoll?'👆 Tap dice to roll'
                  :legal.length>0?'👆 Tap your token to move'
                  :!isHuman(currentPlayer)?'🤖 Computer is playing…'
                  :''}
              </div>
            </div>

            <button onClick={startGame} style={{
              padding:'10px 14px',borderRadius:12,border:'none',
              background:'rgba(255,255,255,0.1)',color:'#fff',
              fontSize:12,fontWeight:700,cursor:'pointer',
              flexShrink:0,fontFamily:'inherit',
            }}>↺ New</button>
          </div>
        ):(
          <div style={{display:'flex',gap:10}}>
            <button onClick={onExit} style={{flex:1,padding:'13px 0',borderRadius:13,
              border:'1px solid rgba(255,255,255,0.12)',
              background:'rgba(255,255,255,0.07)',
              color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,
              cursor:'pointer',fontFamily:'inherit'}}>🏠 Home</button>
            <button onClick={startGame} style={{flex:2,padding:'13px 0',borderRadius:13,
              border:'none',
              background:`linear-gradient(135deg,${PC[0]},${PC[1]})`,
              color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
              boxShadow:'0 4px 20px rgba(229,57,53,0.5)'}}>▶ Play Again</button>
          </div>
        )}
      </div>

      {/* ── Victory Modal ── */}
      {gameOver&&winner!==null&&(
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div style={{
            background:'linear-gradient(160deg,#1a1e30,#0f1220)',
            borderRadius:24,padding:'28px 24px',textAlign:'center',width:290,
            border:`2px solid ${PC[winner]}`,
            boxShadow:`0 20px 60px ${PC[winner]}50`,
            animation:'lkPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{fontSize:56,marginBottom:10}}>🏆</div>
            {/* Big token */}
            <svg width={60} height={60} viewBox="0 0 100 100"
              style={{margin:'0 auto 8px',display:'block',
                filter:`drop-shadow(0 0 12px ${PC[winner]})`}}>
              <circle r={45} cx={50} cy={50} fill={PCD[winner]}/>
              <circle r={37} cx={50} cy={50} fill={PC[winner]}/>
              <circle r={28} cx={50} cy={50} fill="rgba(255,255,255,0.9)"/>
              <circle r={20} cx={50} cy={50} fill={PCM[winner]}/>
            </svg>
            <div style={{color:'#fff',fontWeight:900,fontSize:24,marginBottom:4}}>
              {names[winner]} Wins!
            </div>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:18}}>
              {PN[winner]} player — All tokens home!
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={onExit} style={{flex:1,padding:'12px 0',borderRadius:12,
                border:'1px solid rgba(255,255,255,0.12)',
                background:'rgba(255,255,255,0.07)',
                color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,
                cursor:'pointer',fontFamily:'inherit'}}>🏠 Home</button>
              <button onClick={startGame} style={{flex:2,padding:'12px 0',borderRadius:12,
                border:'none',
                background:`linear-gradient(135deg,${PC[winner]},${PC[winner]}cc)`,
                color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                ▶ Play Again</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lkGlow{0%,100%{opacity:1;box-shadow:0 0 8px currentColor}50%{opacity:0.3}}
        @keyframes lkMsgIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lkPopIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes lkDiceWiggle{0%,100%{transform:scale(1.05) rotate(0deg)}
          25%{transform:scale(1.08) rotate(-6deg)}75%{transform:scale(1.08) rotate(6deg)}}
      `}</style>
    </div>
  )
}

const BTN={background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,cursor:'pointer',
  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:'inherit'}
