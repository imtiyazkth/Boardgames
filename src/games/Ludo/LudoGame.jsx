/**
 * Ludo Nova — ported from standalone HTML engine (index.html v1.6)
 * Engine logic 100% preserved: OUTER_PATH, HOME_LANE, calculateLegalMoves,
 * applyMove, AI scoring, safe cells, blockade, 3-sixes penalty, exact finish.
 * Rendering: SVG board (Ludo King layout) + existing audio system.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAudio } from '../../hooks/useAudio.js'
import { audioEngine } from '../../core/AudioEngine.js'

/* ============================================================
   ENGINE — exact port from index.html
   ============================================================ */
const COLORS = ['red','green','yellow','blue']
const COLOR_HEX = { red:'#e8434f', green:'#2fae63', yellow:'#e0b230', blue:'#2f7fd8' }
const COLOR_LIGHT = { red:'#ffcdd2', green:'#c8e6c9', yellow:'#fff9c4', blue:'#bbdefb' }
const COLOR_DARK  = { red:'#b71c1c', green:'#1b5e20', yellow:'#e65100', blue:'#0d47a1' }

const RuleSet = {
  tokensPerPlayer: 4,
  rollSixExtraTurn: true,
  threeSixPenalty: true,
  captureExtraTurn: true,
  exactFinish: true,
  tokenExitValue: 6,
  homeLaneLength: 6,
  outerTrackLength: 52,
}

const START_OFFSET = { red:0, green:13, yellow:26, blue:39 }

function buildSafeCells() {
  const s = new Set()
  COLORS.forEach(c => { [0,8].forEach(o => s.add((START_OFFSET[c]+o)%52)) })
  return s
}
const SAFE_CELLS = buildSafeCells()

// Exact 52-cell track from index.html (row,col 0-14)
const OUTER_PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],
  [6,0]
]

const HOME_LANE = {
  red:   [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow:[[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue:  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
}

// Base pocket positions — MUST match the pocket-ring formula in LudoBoard exactly
// ((c_home+1.2+pj*2.5), (r_home+1.2+pi*2.5)) or tokens render off-center in their ring.
const BASE_POCKETS = {
  red:   [[1.2,1.2],[1.2,3.7],[3.7,1.2],[3.7,3.7]],
  green: [[1.2,10.2],[1.2,12.7],[3.7,10.2],[3.7,12.7]],
  yellow:[[10.2,10.2],[10.2,12.7],[12.7,10.2],[12.7,12.7]],
  blue:  [[10.2,1.2],[10.2,3.7],[12.7,1.2],[12.7,3.7]],
}

function newToken(color, idx) {
  return { color, id:`${color}-${idx}`, state:'BASE', progress:-1, isFinished:false }
}
function createState(players) {
  return {
    players,
    tokens: players.flatMap(p=>[0,1,2,3].map(i=>newToken(p.color,i))),
    turnIndex: 0,
    diceValue: null,
    consecSixes: 0,
    phase: 'TURN_START',
    winners: [],
  }
}
function currentPlayerOf(state) { return state.players[state.turnIndex] }
function tokensOf(state, color) { return state.tokens.filter(t=>t.color===color) }

function absoluteCell(color, progress) {
  if (progress<0 || progress>=52) return null
  return (START_OFFSET[color]+progress)%52
}
function isSafeProgress(color, progress) {
  if (progress<0||progress>=52) return true
  return SAFE_CELLS.has(absoluteCell(color,progress))
}

function calculateLegalMoves(state, color, dice) {
  const moves = []
  tokensOf(state,color).forEach(t => {
    if (t.isFinished) return
    if (t.state==='BASE') {
      if (dice===RuleSet.tokenExitValue) moves.push({tokenId:t.id,actionType:'ENTER',from:-1,to:0})
      return
    }
    const newP = t.progress+dice
    const maxP = 51+RuleSet.homeLaneLength  // 57
    if (newP>maxP) return
    if (newP===maxP) { moves.push({tokenId:t.id,actionType:'FINISH',from:t.progress,to:newP}); return }
    let capture=null
    if (newP<52) {
      const abs = absoluteCell(color,newP)
      const occ = state.tokens.filter(o=>o.color!==color&&!o.isFinished&&o.state!=='BASE'&&o.progress<52&&absoluteCell(o.color,o.progress)===abs)
      if (occ.length && !SAFE_CELLS.has(abs)) {
        const byCol={}; occ.forEach(o=>{byCol[o.color]=(byCol[o.color]||0)+1})
        if (Object.values(byCol).some(n=>n>=2)) return // blockade
        capture = occ.map(o=>o.id)
      }
    }
    moves.push({tokenId:t.id,actionType:'MOVE',from:t.progress,to:newP,capture})
  })
  return moves
}

function applyMoveToState(state, move) {
  const ns = JSON.parse(JSON.stringify(state))
  const t = ns.tokens.find(x=>x.id===move.tokenId)
  let extraTurn=false, event=null
  if (move.actionType==='ENTER') {
    t.state='ACTIVE'; t.progress=0; event='entered'
  } else if (move.actionType==='MOVE') {
    t.progress=move.to; t.state='ACTIVE'
    if (move.capture?.length) {
      move.capture.forEach(id=>{const c=ns.tokens.find(x=>x.id===id);c.state='BASE';c.progress=-1})
      if(RuleSet.captureExtraTurn) extraTurn=true
      event='capture'
    } else { event='move' }
  } else if (move.actionType==='FINISH') {
    t.progress=move.to; t.isFinished=true; t.state='FINISHED'
    extraTurn=true; event='finish'
  }
  ns.extraTurn=extraTurn; ns.event=event
  return ns
}

function checkVictory(state, color) {
  return tokensOf(state,color).every(t=>t.isFinished)
}

function scoreMove(state, move, color, difficulty) {
  let score=0
  if (move.actionType==='FINISH') score+=100
  if (move.actionType==='ENTER') score+=20
  if (move.capture?.length) score+=60*move.capture.length
  if (move.actionType==='MOVE') {
    if (isSafeProgress(color,move.to)) score+=15
    if (move.to<52) {
      const abs=absoluteCell(color,move.to)
      let danger=0
      state.tokens.forEach(o=>{
        if(o.color===color||o.isFinished||o.state==='BASE'||o.progress>=52) return
        const oA=absoluteCell(o.color,o.progress)
        for(let d=1;d<=6;d++){if((oA+d)%52===abs){danger++;break}}
      })
      score-=danger*25
    }
    score+=move.to*0.5
  }
  if(difficulty==='EASY') score+=(Math.random()*40-20)
  else if(difficulty==='NORMAL') score+=(Math.random()*15-7)
  else score+=(Math.random()*4-2)
  return score
}

function aiChooseMove(state, moves, color, difficulty) {
  let best=moves[0], bestScore=-Infinity
  moves.forEach(m=>{ const s=scoreMove(state,m,color,difficulty); if(s>bestScore){bestScore=s;best=m} })
  return best
}

/* ============================================================
   SVG BOARD RENDERER — Ludo King exact layout
   Layout: Red=top-left, Green=top-right, Blue=bottom-left, Yellow=bottom-right
   (Matching the screenshot provided)
   ============================================================ */
const LANE_ARROW = { red:'→', green:'↓', yellow:'←', blue:'↑' }

// Build lookup: which cells are home lane cells
function buildGridInfo() {
  const grid = {}
  OUTER_PATH.forEach(([r,c],i) => {
    grid[`${r},${c}`] = { type:'path', idx:i }
  })
  Object.keys(HOME_LANE).forEach(color => {
    HOME_LANE[color].forEach(([r,c],li) => {
      grid[`${r},${c}`] = { type:'lane', color, laneIdx:li }
    })
  })
  return grid
}
const GRID_INFO = buildGridInfo()

function TokenSVG({ cx, cy, r, color, selectable }) {
  const hex  = COLOR_HEX[color]
  const dark = COLOR_DARK[color]
  const lite = COLOR_LIGHT[color]
  return (
    <g style={{cursor:selectable?'pointer':'default'}}>
      {/* Shadow */}
      <ellipse cx={cx+1} cy={cy+r*0.7} rx={r*0.75} ry={r*0.3} fill="rgba(0,0,0,0.3)"/>
      {/* Pin head outer */}
      <circle cx={cx} cy={cy-r*0.3} r={r*0.72} fill={dark}/>
      <circle cx={cx} cy={cy-r*0.3} r={r*0.58} fill={hex}/>
      <circle cx={cx} cy={cy-r*0.3} r={r*0.42} fill="rgba(255,255,255,0.88)"/>
      <circle cx={cx} cy={cy-r*0.3} r={r*0.28} fill={hex}/>
      {/* Shine */}
      <circle cx={cx-r*0.14} cy={cy-r*0.5} r={r*0.12} fill="rgba(255,255,255,0.55)"/>
      {/* Pin body / tail */}
      <path d={`M${cx-r*0.38},${cy+r*0.3} L${cx},${cy+r*1.0} L${cx+r*0.38},${cy+r*0.3} Z`}
        fill={hex} opacity={0.9}/>
      {/* Selectable pulse ring */}
      {selectable && (
        <circle cx={cx} cy={cy-r*0.3} r={r*0.85}
          fill="none" stroke="white" strokeWidth={2} opacity={0.7}
          style={{animation:'lnPulse 0.7s ease-in-out infinite'}}/>
      )}
    </g>
  )
}

function LudoBoard({ state, legalTokenIds, onTokenClick }) {
  if (!state) return null
  const CS = 30  // cell size px (15*30=450)
  const S  = 15*CS

  // Group tokens by cell
  const tokenMap = {}
  state.tokens.forEach(tok => {
    let r,c
    if (tok.state==='BASE') {
      const idx=parseInt(tok.id.split('-')[1])
      ;[r,c]=BASE_POCKETS[tok.color][idx]
    } else if (tok.isFinished||tok.state==='FINISHED') {
      const lane=HOME_LANE[tok.color];[r,c]=lane[lane.length-1]
    } else if (tok.progress<52) {
      const abs=absoluteCell(tok.color,tok.progress)
      ;[r,c]=OUTER_PATH[abs]
    } else {
      const li=tok.progress-52
      ;[r,c]=HOME_LANE[tok.color][Math.min(li,5)]
    }
    const key=`${r},${c}`
    if (!tokenMap[key]) tokenMap[key]=[]
    tokenMap[key].push({...tok, gr:r, gc:c})
  })

  // Home zone colors per quadrant (matching screenshot: Red TL, Green TR, Blue BL, Yellow BR)
  const HOME_ZONES = [
    {color:'red',   r:0,  c:0  },
    {color:'green', r:0,  c:9  },
    {color:'blue',  r:9,  c:0  },
    {color:'yellow',r:9,  c:9  },
  ]

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%"
      style={{display:'block', maxWidth:420, touchAction:'manipulation'}}>

      {/* Board base */}
      <rect width={S} height={S} fill="#f0f2f8" rx={8}/>

      {/* Home quadrants */}
      {HOME_ZONES.map(({color,r,c})=>(
        <g key={color}>
          <rect x={c*CS} y={r*CS} width={6*CS} height={6*CS}
            fill={COLOR_HEX[color]} rx={color==='red'&&r===0?'8 0 0 0':color==='green'?'0 8 0 0':color==='blue'?'0 0 0 8':'0 0 8 0'}/>
          {/* Inner white box */}
          <rect x={c*CS+CS*0.45} y={r*CS+CS*0.45} width={5.1*CS} height={5.1*CS}
            fill="rgba(255,255,255,0.88)" rx={10}/>
          {/* 4 pocket circles */}
          {[0,1].map(pi=>[0,1].map(pj=>{
            const px=(c+1.2+pj*2.5)*CS, py=(r+1.2+pi*2.5)*CS
            return (
              <g key={`${pi}-${pj}`}>
                <circle cx={px} cy={py} r={CS*0.46}
                  fill={COLOR_LIGHT[color]} stroke={COLOR_HEX[color]} strokeWidth={2}/>
              </g>
            )
          }))}
        </g>
      ))}

      {/* Colored home-lane strips */}
      {/* Red: bottom center (rows 9-14, cols 6-8) */}
      <rect x={6*CS} y={9*CS} width={3*CS} height={6*CS} fill={COLOR_LIGHT.red}/>
      {/* Green: top center (rows 0-5, cols 6-8) */}
      <rect x={6*CS} y={0}    width={3*CS} height={6*CS} fill={COLOR_LIGHT.green}/>
      {/* Blue: left center (rows 6-8, cols 0-5) */}
      <rect x={0}    y={6*CS} width={6*CS} height={3*CS} fill={COLOR_LIGHT.blue}/>
      {/* Yellow: right center (rows 6-8, cols 9-14) */}
      <rect x={9*CS} y={6*CS} width={6*CS} height={3*CS} fill={COLOR_LIGHT.yellow}/>

      {/* Track grid cells */}
      {Array.from({length:15},(_,r)=>Array.from({length:15},(_,c)=>{
        const inHome=(c<6&&r<6)||(c>8&&r<6)||(c<6&&r>8)||(c>8&&r>8)
        const isCenter=c>=6&&c<=8&&r>=6&&r<=8
        if (inHome||isCenter) return null
        const key=`${r},${c}`
        const info=GRID_INFO[key]
        const isSafe=info?.type==='path'&&SAFE_CELLS.has(info.idx)
        const isLane=info?.type==='lane'
        const isArrow=isLane&&info.laneIdx===0
        let fill='rgba(255,255,255,0.7)'
        if (isLane) fill=COLOR_HEX[info.color]
        if (isSafe) fill='rgba(255,255,255,0.95)'
        return (
          <g key={key}>
            <rect x={c*CS} y={r*CS} width={CS} height={CS}
              fill={fill} stroke="rgba(0,0,0,0.08)" strokeWidth={0.5}/>
            {isSafe&&<text x={c*CS+CS/2} y={r*CS+CS*0.68} textAnchor="middle"
              fontSize={CS*0.5} fill="#c99a1a" opacity={0.8}>★</text>}
            {isArrow&&<text x={c*CS+CS/2} y={r*CS+CS*0.72} textAnchor="middle"
              fontSize={CS*0.65} fill="white" fontWeight="900">{LANE_ARROW[info.color]}</text>}
          </g>
        )
      }))}

      {/* Center conic diamond */}
      <rect x={6*CS} y={6*CS} width={3*CS} height={3*CS}
        fill="url(#centerGrad)" rx={4}/>
      <defs>
        <pattern id="centerGrad" x="0" y="0" width={3*CS} height={3*CS} patternUnits="userSpaceOnUse">
          <rect width={3*CS} height={3*CS} fill={COLOR_HEX.red}/>
          <polygon points={`0,0 ${3*CS/2},${3*CS/2} ${3*CS},0`} fill={COLOR_HEX.green}/>
          <polygon points={`0,${3*CS} ${3*CS/2},${3*CS/2} ${3*CS},${3*CS}`} fill={COLOR_HEX.blue}/>
          <polygon points={`${3*CS},0 ${3*CS/2},${3*CS/2} ${3*CS},${3*CS}`} fill={COLOR_HEX.yellow}/>
        </pattern>
      </defs>
      <polygon
        points={`${7.5*CS},${6.1*CS} ${8.9*CS},${7.5*CS} ${7.5*CS},${8.9*CS} ${6.1*CS},${7.5*CS}`}
        fill="#ffd700" stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
      <text x={7.5*CS} y={7.5*CS+CS*0.25} textAnchor="middle"
        fontSize={CS*0.8} fill="white" fontWeight="bold">★</text>

      {/* Tokens */}
      {Object.entries(tokenMap).map(([key,toks])=>{
        const count=toks.length
        const [r,c]=key.split(',').map(Number)
        const cx=(c+0.5)*CS, cy=(r+0.5)*CS

        return toks.map((tok,idx)=>{
          const sel=legalTokenIds.has(tok.id)
          const baseR=count>1?CS*0.26:CS*0.34
          // Offset for stacking
          let ox=0,oy=0
          if(count===2){ox=(idx===0?-1:1)*CS*0.2}
          if(count===3){
            const a=(idx/3)*Math.PI*2-Math.PI/2
            ox=Math.cos(a)*CS*0.2;oy=Math.sin(a)*CS*0.2
          }
          if(count>=4){ox=((idx%2)*2-1)*CS*0.18;oy=(idx<2?-1:1)*CS*0.18}

          return (
            <g key={tok.id} onClick={()=>sel&&onTokenClick(tok.id)}
              transform={`translate(${ox},${oy})`}>
              <TokenSVG cx={cx} cy={cy} r={baseR}
                color={tok.color} selectable={sel}/>
            </g>
          )
        })
      })}

      <style>{`
        @keyframes lnPulse{0%,100%{opacity:0.8;transform:scale(1)}50%{opacity:0.2;transform:scale(1.2)}}
      `}</style>
    </svg>
  )
}

/* ============================================================
   DICE COMPONENT — animated, Ludo Nova style
   ============================================================ */
const DOT_POS = {
  1:[[50,50]],
  2:[[25,25],[75,75]],
  3:[[25,25],[50,50],[75,75]],
  4:[[25,25],[75,25],[25,75],[75,75]],
  5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
  6:[[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]],
}
function DiceSVG({ value, size=52, color, active, rolling, sixSpin }) {
  const dots=DOT_POS[value]||[]
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}
      style={{
        filter: sixSpin?`drop-shadow(0 0 12px #ffd700)`:active?`drop-shadow(0 0 8px ${color})`:'none',
        transform: rolling?'rotate(15deg) scale(0.88)':active?'scale(1.05)':'scale(0.95)',
        transition:'all 0.15s',
        animation: sixSpin?'lnSixSpin 0.7s cubic-bezier(.3,1.6,.4,1)'
          :active&&!rolling?'diceWiggle 2s ease-in-out infinite':'none',
        opacity: active?1:0.4,
      }}>
      <rect x={4} y={4} width={92} height={92} rx={18}
        fill="#fff" stroke={active?color:'#ccc'} strokeWidth={active?4:2}/>
      {dots.map(([dx,dy],i)=>(
        <circle key={i} cx={dx} cy={dy} r={value===1?12:9}
          fill={value===1?color:'#1a2138'}/>
      ))}
      <style>{`
        @keyframes diceWiggle{0%,100%{transform:scale(1.05) rotate(0)}25%{transform:scale(1.08) rotate(-6deg)}75%{transform:scale(1.08) rotate(6deg)}}
        @keyframes lnSixSpin{0%{transform:rotate(0) scale(1)}50%{transform:rotate(360deg) scale(1.25)}100%{transform:rotate(720deg) scale(1)}}
      `}</style>
    </svg>
  )
}

/* ============================================================
   MAIN GAME COMPONENT
   ============================================================ */
function delay(ms){ return new Promise(r=>setTimeout(r,ms)) }

export default function LudoGame({ mode='solo', playerCount=4, playerNames=[], onExit, onGameOver }) {
  const { play, vibrate } = useAudio()
  const pc = Math.min(4, Math.max(2, playerCount||4))

  // Build players array (matching index.html pattern)
  const humanPlayers = mode==='local2p'?[0,1]:mode==='local3p'?[0,1,2]:mode==='local4p'?[0,1,2,3]:[0]
  const colorsForCount = n => { if(n===2)return['red','yellow'];if(n===3)return['red','green','yellow'];return['red','green','yellow','blue'] }
  const gameColors = colorsForCount(pc)

  function buildPlayers() {
    return gameColors.map((color,i) => ({
      color,
      type: humanPlayers.includes(i) ? 'HUMAN' : 'AI',
      difficulty: 'NORMAL',
      name: playerNames[i] || (humanPlayers.includes(i)
        ? (i===0&&mode==='solo'?'You':`Player ${i+1}`)
        : `Computer ${i+1}`)
    }))
  }

  const [gs,  setGs]   = useState(()=>createState(buildPlayers()))
  const [dice, setDice] = useState(null)   // currently showing dice value
  const [rolling, setRolling] = useState(false)
  const [legal, setLegal] = useState([])   // legal moves array
  const [legalIds, setLegalIds] = useState(new Set())
  const [msg,  setMsg]  = useState('')
  const [msgC, setMsgC] = useState('#ffd700')
  const [sixPulse, setSixPulse] = useState(false)
  const [musicOn, setMusicOn] = useState(()=>audioEngine.getSettings().musicEnabled)
  const animRef = useRef(false)

  const isHuman = useCallback(color => {
    const idx = gameColors.indexOf(color)
    return humanPlayers.includes(idx)
  }, [gameColors, humanPlayers])

  function showMsg(text, color='#ffd700', ms=2000) {
    setMsg(text); setMsgC(color)
    setTimeout(()=>setMsg(''), ms)
  }

  function toggleMusic(){
    audioEngine.unlock()
    audioEngine.toggleMusic()
    setMusicOn(audioEngine.getSettings().musicEnabled)
  }

  function startGame() {
    const ns = createState(buildPlayers())
    setGs(ns); setDice(null); setLegal([]); setLegalIds(new Set())
    setMsg(''); animRef.current=false; setRolling(false)
    play('game_start')
    // trigger AI if first player is AI
    setTimeout(()=>checkAI(ns), 800)
  }

  useEffect(()=>{ /* mount: already initialized */ }, [])

  function checkAI(state) {
    if (!state||animRef.current) return
    const p=currentPlayerOf(state)
    if (p.type!=='AI'||state.phase!=='TURN_START') return
    animRef.current=true
    setTimeout(()=>{ doRoll(state); }, 700)
  }

  async function doRoll(currentGs) {
    const gs2 = currentGs||gs
    if (!gs2||gs2.phase!=='TURN_START') { animRef.current=false; return }
    setRolling(true)
    play('ludo_dice'); vibrate([15])

    // Animate dice
    for(let i=0;i<8;i++){
      setDice(Math.ceil(Math.random()*6))
      await delay(60)
    }

    const val = 1+Math.floor(Math.random()*6)
    setDice(val); setRolling(false)

    const color = currentPlayerOf(gs2).color

    // Three sixes penalty
    const newConsec = val===6 ? gs2.consecSixes+1 : 0
    if (RuleSet.threeSixPenalty && newConsec>=3) {
      showMsg("Three 6's — turn forfeited!", '#e94560')
      await delay(900)
      const ns = {...gs2, consecSixes:0, phase:'TURN_START', diceValue:null}
      doNextTurn(ns)
      animRef.current=false
      return
    }

    if (val===6) {
      play('ludo_enter')
      showMsg('🎲 SIX! Roll again bonus!', COLOR_HEX[color], 1200)
      setSixPulse(true)
      setTimeout(()=>setSixPulse(false), 700)
    }

    const moves = calculateLegalMoves(gs2, color, val)
    const ns = {...gs2, diceValue:val, consecSixes:newConsec, phase:'CHOOSING'}

    if (moves.length===0) {
      showMsg('No valid move — turn passes', 'rgba(255,255,255,0.5)')
      await delay(900)
      const afterPass = {...ns, phase:'TURN_START', diceValue:null}
      const grantExtra = val===6 && RuleSet.rollSixExtraTurn
      if (grantExtra) { setGs(afterPass); setTimeout(()=>checkAI(afterPass),500) }
      else doNextTurn(afterPass)
      animRef.current=false
      return
    }

    setLegal(moves)
    setLegalIds(new Set(moves.map(m=>m.tokenId)))
    setGs(ns)

    if (currentPlayerOf(gs2).type==='AI') {
      await delay(600)
      const mv = aiChooseMove(ns, moves, color, currentPlayerOf(gs2).difficulty)
      await resolveMove(ns, mv)
    } else {
      // Human picks token
      animRef.current=false
    }
  }

  async function handleTokenClick(tokenId) {
    if (!gs||gs.phase!=='CHOOSING'||animRef.current) return
    const mv = legal.find(m=>m.tokenId===tokenId)
    if (!mv) return
    animRef.current=true
    setLegal([]); setLegalIds(new Set())
    await resolveMove(gs, mv)
  }

  async function resolveMove(state, move) {
    const ns2 = applyMoveToState(state, move)
    setGs(ns2)
    setDice(null)

    // Sound + message
    if (ns2.event==='capture') {
      play('ludo_cut'); vibrate([25,15,25])
      showMsg(`💥 ${currentPlayerOf(state).name} captured a token!`, COLOR_HEX[currentPlayerOf(state).color])
    } else if (ns2.event==='finish') {
      play('ludo_home'); vibrate([30,20,40])
      showMsg('🏠 Token reached home!', '#4caf50')
    } else {
      play('ludo_move'); vibrate([8])
    }

    // Check win
    if (checkVictory(ns2, currentPlayerOf(state).color)) {
      const winner = currentPlayerOf(state)
      await delay(400)
      play('ludo_win'); vibrate([60,30,80])
      showMsg(`🏆 ${winner.name} wins!`, COLOR_HEX[winner.color], 6000)
      setGs({...ns2, phase:'GAME_OVER'})
      onGameOver?.({winner:winner.name})
      animRef.current=false
      return
    }

    // Extra turn or next
    await delay(400)
    const grantExtra = ns2.extraTurn || (state.diceValue===6 && RuleSet.rollSixExtraTurn && ns2.event!=='capture')
    if (grantExtra) {
      const nextGs = {...ns2, phase:'TURN_START', diceValue:null}
      setGs(nextGs)
      setTimeout(()=>checkAI(nextGs), 600)
    } else {
      doNextTurn(ns2)
    }
    animRef.current=false
  }

  function doNextTurn(state) {
    const ni = (state.turnIndex+1)%state.players.length
    const ns = {...state, turnIndex:ni, consecSixes:0, phase:'TURN_START', diceValue:null}
    setGs(ns)
    setTimeout(()=>checkAI(ns), 700)
  }

  function handleDiceClick(color) {
    const p=currentPlayerOf(gs)
    if (!p||p.type!=='HUMAN') return
    if (color && color!==p.color) return
    if (gs.phase!=='TURN_START') return
    if (animRef.current||rolling) return
    animRef.current=true
    doRoll(gs)
  }

  const cp = gs ? currentPlayerOf(gs) : null
  const cpColor = cp?.color||'red'
  const gameOver = gs?.phase==='GAME_OVER'
  const canRoll = !gameOver && gs?.phase==='TURN_START' && cp?.type==='HUMAN' && !rolling && !animRef.current

  // Token finished count per player
  const finishedCount = color => gs?.tokens.filter(t=>t.color===color&&t.isFinished).length || 0

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background:`linear-gradient(160deg,${COLOR_HEX[cpColor]}12 0%,#0b0f1a 40%)`,
      userSelect:'none',overflow:'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',gap:10,
        padding:'10px 14px 6px',flexShrink:0,
        background:'rgba(0,0,0,0.3)',
        borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <button onClick={onExit} style={BTN}>←</button>
        <span style={{fontSize:22,filter:`drop-shadow(0 0 10px ${COLOR_HEX[cpColor]}80)`}}>🎲</span>
        <span style={{color:'#fff',fontWeight:900,fontSize:18,flex:1}}>Ludo</span>
        <button onClick={toggleMusic} style={{...BTN, opacity:musicOn?1:0.45}}
          title={musicOn?'Music on':'Music off'}>🎵</button>
        <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontWeight:600,
          background:'rgba(255,255,255,0.08)',padding:'3px 8px',borderRadius:8}}>
          {mode==='solo'?`${pc}P vs AI`:mode.replace('local','')+'P Local'}
        </span>
      </div>

      {/* ── Player HUD — corner dice style from index.html ── */}
      <div style={{display:'flex',gap:5,padding:'6px 10px 3px',flexShrink:0}}>
        {gs?.players.map((p,i)=>{
          const active=cpColor===p.color&&!gameOver
          return (
            <div key={p.color} style={{
              flex:1,minWidth:0,padding:'6px 8px',borderRadius:11,
              background:active?`${COLOR_HEX[p.color]}28`:'rgba(255,255,255,0.05)',
              border:`2px solid ${active?COLOR_HEX[p.color]:'rgba(255,255,255,0.1)'}`,
              boxShadow:active?`0 0 18px ${COLOR_HEX[p.color]}45`:'none',
              transition:'all 0.2s',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                {/* Mini token indicator */}
                <svg width={18} height={18} viewBox="0 0 100 100">
                  <circle cx={50} cy={30} r={35} fill={COLOR_DARK[p.color]}/>
                  <circle cx={50} cy={30} r={27} fill={COLOR_HEX[p.color]}/>
                  <circle cx={50} cy={30} r={18} fill="rgba(255,255,255,0.85)"/>
                  <circle cx={50} cy={30} r={10} fill={COLOR_HEX[p.color]}/>
                  <polygon points="35,55 50,85 65,55" fill={COLOR_HEX[p.color]}/>
                </svg>
                <div style={{
                  color:active?'#fff':'rgba(255,255,255,0.45)',
                  fontSize:10,fontWeight:700,flex:1,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                }}>{p.type==='AI'?'🤖 ':''}{p.name}</div>
                {active&&<div style={{width:6,height:6,borderRadius:'50%',
                  background:COLOR_HEX[p.color],animation:'lnGlow 0.9s infinite'}}/>}
              </div>
              {/* Progress dots */}
              <div style={{display:'flex',gap:3,marginTop:3}}>
                {[0,1,2,3].map(j=>(
                  <div key={j} style={{width:7,height:7,borderRadius:'50%',
                    background:j<finishedCount(p.color)?COLOR_HEX[p.color]:'rgba(255,255,255,0.12)',
                    boxShadow:j<finishedCount(p.color)?`0 0 5px ${COLOR_HEX[p.color]}`:'none'}}/>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Status ── */}
      <div style={{height:24,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {msg?(
          <div style={{fontSize:12,fontWeight:700,color:msgC,padding:'1px 12px',
            borderRadius:20,background:'rgba(0,0,0,0.4)',animation:'lnMsgIn 0.25s ease'}}>
            {msg}
          </div>
        ):(
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,
            fontWeight:700,color:COLOR_HEX[cpColor]}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:COLOR_HEX[cpColor],
              animation:'lnGlow 0.9s infinite'}}/>
            {cp?.name}'s turn
            {cp?.type==='AI'&&<span style={{opacity:0.5}}> · AI playing…</span>}
          </div>
        )}
      </div>

      {/* ── Board + per-player corner dice ── */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        padding:'2px 6px',minHeight:0,overflow:'hidden'}}>
        <div style={{position:'relative',width:'100%',maxWidth:420+64,padding:32}}>
          <LudoBoard
            state={gs}
            legalTokenIds={legalIds}
            onTokenClick={handleTokenClick}
          />
          {gs?.players.map(p=>{
            const isActive = cpColor===p.color && !gameOver
            const corner =
              p.color==='red'    ? {top:0,left:0} :
              p.color==='green'  ? {top:0,right:0} :
              p.color==='blue'   ? {bottom:0,left:0} :
                                    {bottom:0,right:0}
            return (
              <button key={p.color}
                onClick={()=>handleDiceClick(p.color)}
                disabled={!(isActive&&canRoll)}
                style={{
                  position:'absolute', ...corner,
                  background:'transparent',border:'none',padding:0,
                  cursor:(isActive&&canRoll)?'pointer':'default',
                }}>
                <DiceSVG
                  value={isActive?(dice||1):1} size={44}
                  color={COLOR_HEX[p.color]}
                  active={isActive&&canRoll}
                  rolling={isActive&&rolling}
                  sixSpin={isActive&&sixPulse}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{
        padding:'8px 14px 14px',flexShrink:0,
        background:'rgba(0,0,0,0.3)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
      }}>
        {!gameOver?(
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{flex:1}}>
              {dice&&!rolling&&(
                <div style={{color:'#fff',fontSize:14,fontWeight:900,marginBottom:3}}>
                  Rolled: <span style={{color:COLOR_HEX[cpColor],fontSize:20}}>{dice}</span>
                  {dice===6&&<span style={{color:'#ffd700',fontSize:11,marginLeft:6}}>+1 bonus!</span>}
                </div>
              )}
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:11}}>
                {canRoll?'👆 Tap your glowing dice to roll'
                  :legalIds.size>0&&cp?.type==='HUMAN'?'👆 Tap a token to move'
                  :cp?.type==='AI'?'🤖 AI playing…'
                  :''}
              </div>
            </div>

            <button onClick={startGame} style={{
              padding:'10px 14px',borderRadius:12,border:'none',
              background:'rgba(255,255,255,0.1)',color:'#fff',
              fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0,fontFamily:'inherit',
            }}>↺ New</button>
          </div>
        ):(
          <div style={{display:'flex',gap:10}}>
            <button onClick={onExit} style={{flex:1,padding:'13px 0',borderRadius:13,
              border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.07)',
              color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              🏠 Home</button>
            <button onClick={startGame} style={{flex:2,padding:'13px 0',borderRadius:13,border:'none',
              background:`linear-gradient(135deg,${COLOR_HEX.red},${COLOR_HEX.blue})`,
              color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
              boxShadow:'0 4px 20px rgba(232,67,79,0.5)'}}>
              ▶ Play Again</button>
          </div>
        )}
      </div>

      {/* ── Win overlay (from index.html) ── */}
      {gameOver&&(
        <div style={{position:'absolute',inset:0,background:'rgba(6,9,20,0.92)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}>
          <div style={{
            background:'#141a2b',borderRadius:22,padding:'28px 24px',
            textAlign:'center',width:290,
            border:`2px solid ${COLOR_HEX[cpColor]}`,
            boxShadow:`0 20px 60px ${COLOR_HEX[cpColor]}50`,
            animation:'lnPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{fontSize:52,marginBottom:10}}>🏆</div>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:22,margin:'0 0 4px'}}>{msg}</h2>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:18}}>
              All 4 tokens home!
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={onExit} style={{flex:1,padding:'12px 0',borderRadius:12,
                border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.07)',
                color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                🏠 Home</button>
              <button onClick={startGame} style={{flex:2,padding:'12px 0',borderRadius:12,border:'none',
                background:`linear-gradient(135deg,${COLOR_HEX[cpColor]},${COLOR_HEX[cpColor]}cc)`,
                color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                ▶ Play Again</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lnGlow{0%,100%{opacity:1;box-shadow:0 0 8px currentColor}50%{opacity:0.3}}
        @keyframes lnMsgIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lnPopIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}

const BTN = {
  background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,cursor:'pointer',
  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:'inherit',
}
