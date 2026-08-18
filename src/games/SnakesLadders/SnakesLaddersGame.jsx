import { useState, useCallback, useRef } from 'react'
import { SnakesLaddersEngine } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

// Board layout: snakes and ladders
const SNAKES  = { 99:37,95:75,92:88,89:68,74:53,64:60,62:19,49:11,46:25,16:6 }
const LADDERS = { 2:38,7:14,8:31,15:26,21:42,28:84,36:44,51:67,71:91,78:98,87:94 }

const P_COLORS = ['#e53935','#1565c0','#43a047','#f9a825']
const P_LIGHT  = ['#ef9a9a','#90caf9','#a5d6a7','#fff176']
const P_EMOJI  = ['🔴','🔵','🟢','🟡']
const DICE_FACE = ['','⚀','⚁','⚂','⚃','⚄','⚅']

function delay(ms) { return new Promise(r=>setTimeout(r,ms)) }

// Build 10x10 board — row 0 is top (91-100), row 9 is bottom (1-10)
// Odd rows go right, even rows go left (boustrophedon)
function squareToRowCol(sq) {
  const row = 9 - Math.floor((sq-1)/10)
  const col = (Math.floor((sq-1)/10)%2===0)
    ? (sq-1)%10
    : 9-(sq-1)%10
  return { row, col }
}

// ── SVG Board ──────────────────────────────────────────────────────────────────
function SnakesBoard({ positions, playerCount, currentPlayer }) {
  const W = 320, H = 360
  const CW = W/10, CH = H/10

  // Snake paths (head -> tail): draw as curved SVG path
  const snakeData = Object.entries(SNAKES).map(([h,t])=>({
    head:parseInt(h), tail:parseInt(t),
    headPos:squareToRowCol(parseInt(h)),
    tailPos:squareToRowCol(parseInt(t)),
  }))

  // Ladder data (bottom -> top)
  const ladderData = Object.entries(LADDERS).map(([b,top])=>({
    bottom:parseInt(b), top:parseInt(top),
    botPos:squareToRowCol(parseInt(b)),
    topPos:squareToRowCol(parseInt(top)),
  }))

  // Tokens grouped by square
  const tokenMap = {}
  positions.forEach((sq,p)=>{
    if (!tokenMap[sq]) tokenMap[sq]=[]
    tokenMap[sq].push(p)
  })

  return (
    <svg viewBox={`0 0 ${W} ${H+20}`} width="100%" style={{display:'block',maxWidth:360}}>
      {/* Board background */}
      <rect width={W} height={H} rx={8} fill="#f5e6d0"/>

      {/* Grid squares */}
      {Array.from({length:100},(_,i)=>{
        const sq = 100-i
        const {row,col} = squareToRowCol(sq)
        const isDark = (row+col)%2===0
        return (
          <g key={sq}>
            <rect x={col*CW} y={row*CH} width={CW} height={CH}
              fill={isDark?'#e8d5b0':'#f5e6d0'} stroke="rgba(0,0,0,0.08)" strokeWidth={0.5}/>
            <text x={col*CW+CW/2} y={row*CH+CH*0.32} textAnchor="middle"
              fontSize="8" fill="rgba(0,0,0,0.5)" fontWeight="600">{sq}</text>
          </g>
        )
      })}

      {/* Ladders — blue/cyan like screenshot */}
      {ladderData.map(({bottom,top,botPos,topPos},i)=>{
        const x1=(botPos.col+0.5)*CW, y1=(botPos.row+0.5)*CH
        const x2=(topPos.col+0.5)*CW, y2=(topPos.row+0.5)*CH
        const dx=x2-x1, dy=y2-y1
        const len=Math.sqrt(dx*dx+dy*dy)
        const ux=dy/len*4, uy=-dx/len*4
        return (
          <g key={`lad${i}`}>
            {/* Left rail */}
            <line x1={x1-ux} y1={y1-uy} x2={x2-ux} y2={y2-uy}
              stroke="#29b6f6" strokeWidth={3} strokeLinecap="round"/>
            {/* Right rail */}
            <line x1={x1+ux} y1={y1+uy} x2={x2+ux} y2={y2+uy}
              stroke="#29b6f6" strokeWidth={3} strokeLinecap="round"/>
            {/* Rungs */}
            {Array.from({length:Math.floor(len/14)},(_,r)=>{
              const t=(r+1)/(Math.floor(len/14)+1)
              const rx=x1+dx*t, ry=y1+dy*t
              return <line key={r} x1={rx-ux} y1={ry-uy} x2={rx+ux} y2={ry+uy}
                stroke="#29b6f6" strokeWidth={2} strokeLinecap="round"/>
            })}
          </g>
        )
      })}

      {/* Snakes — green like screenshot */}
      {snakeData.map(({head,tail,headPos,tailPos},i)=>{
        const hx=(headPos.col+0.5)*CW, hy=(headPos.row+0.5)*CH
        const tx=(tailPos.col+0.5)*CW, ty=(tailPos.row+0.5)*CH
        const mx=(hx+tx)/2+(hx<tx?-20:20), my=(hy+ty)/2-20
        return (
          <g key={`sn${i}`}>
            <path d={`M${hx},${hy} Q${mx},${my} ${tx},${ty}`}
              fill="none" stroke="#388e3c" strokeWidth={7} strokeLinecap="round" opacity={0.85}/>
            <path d={`M${hx},${hy} Q${mx},${my} ${tx},${ty}`}
              fill="none" stroke="#66bb6a" strokeWidth={3} strokeLinecap="round"
              strokeDasharray="4 8" opacity={0.7}/>
            {/* Snake head */}
            <circle cx={hx} cy={hy} r={6} fill="#2e7d32"/>
            <circle cx={hx-2} cy={hy-2} r={1.5} fill="#fff"/>
            <circle cx={hx+2} cy={hy-2} r={1.5} fill="#fff"/>
            {/* Snake eyes */}
            <circle cx={hx-2} cy={hy-2} r={0.8} fill="#000"/>
            <circle cx={hx+2} cy={hy-2} r={0.8} fill="#000"/>
          </g>
        )
      })}

      {/* Tokens */}
      {Object.entries(tokenMap).map(([sq,players])=>{
        const s=parseInt(sq)
        if(s===0) return null  // off board
        const {row,col}=squareToRowCol(s)
        const cx=(col+0.5)*CW, cy=(row+0.5)*CH
        return players.map((p,idx)=>{
          const ox = players.length>1?(idx===0?-5:5):0
          return (
            <g key={`tok${p}`}>
              {/* Pin shadow */}
              <ellipse cx={cx+ox+1} cy={cy+12} rx={4} ry={2} fill="rgba(0,0,0,0.3)"/>
              {/* Pin body */}
              <path d={`M${cx+ox},${cy+10} C${cx+ox-6},${cy-2} ${cx+ox-6},${cy-14} ${cx+ox},${cy-14} C${cx+ox+6},${cy-14} ${cx+ox+6},${cy-2} ${cx+ox},${cy+10}Z`}
                fill={P_COLORS[p]} stroke="rgba(255,255,255,0.5)" strokeWidth={1}/>
              {/* Pin inner circle */}
              <circle cx={cx+ox} cy={cy-8} r={4} fill={P_LIGHT[p]}/>
            </g>
          )
        })
      })}

      {/* Bottom bar */}
      <rect x={0} y={H} width={W} height={20} rx={0} fill="#8d6e63"/>
    </svg>
  )
}

export default function SnakesLaddersGame({ playerCount=2, mode='solo', playerNames, onExit, onGameOver }) {
  const { play, vibrate } = useAudio()
  const pc = Math.min(4, Math.max(2, playerCount||2))
  const isHuman = useCallback(p => mode==='local2p'?true:mode==='solo'?p===0:true, [mode])
  const names = playerNames?.slice(0,pc) || Array.from({length:pc},(_,i)=>
    i===0&&mode==='solo'?'You':`Computer ${i}`)

  const [engine] = useState(()=>{
    const e=new SnakesLaddersEngine()
    e.initializeGame({playerCount:pc,playerNames:names})
    return e
  })
  const [state,    setState]    = useState(()=>engine.cloneState())
  const [displayPos,setDisplay] = useState(()=>Array(pc).fill(0))
  const [rolling,  setRolling]  = useState(false)
  const [diceVal,  setDiceVal]  = useState(null)
  const [eventMsg, setEventMsg] = useState('')
  const [msgColor, setMsgColor] = useState('#fff')
  const animRef = useRef(false)

  async function handleRoll() {
    if (rolling||state.gameOver||animRef.current) return
    if (!isHuman(state.currentPlayer)) return
    setRolling(true); animRef.current=true; setEventMsg('')

    play('snakes_dice'); vibrate([15])
    for (let i=0;i<7;i++){
      setDiceVal(Math.floor(Math.random()*6)+1)
      await delay(70)
    }

    const res = engine.applyMove({action:'roll'})
    const ns  = engine.cloneState()
    const p   = state.currentPlayer
    const finalDice = ns.dice || res.dice || 1
    setDiceVal(finalDice)

    // Animate token movement step by step
    const from = state.positions[p]
    const raw  = from + finalDice
    const bounced = raw>100 ? 100-(raw-100) : raw
    const finalPos = ns.positions[p]

    for (let step=from+1; step<=Math.min(bounced,100); step++) {
      await delay(80)
      setDisplay(d=>{const nd=[...d];nd[p]=step;return nd})
      if(step%3===0) play('snakes_step')
    }

    // Snake or ladder animation
    if (ns.lastEvent==='snake') {
      setEventMsg(`🐍 Snake! Slide down from ${bounced} to ${finalPos}`)
      setMsgColor('#e94560')
      play('snakes_snake'); vibrate([30,20,30])
      await delay(400)
      setDisplay(d=>{const nd=[...d];nd[p]=finalPos;return nd})
    } else if (ns.lastEvent==='ladder') {
      setEventMsg(`🪜 Ladder! Climb up from ${bounced} to ${finalPos}`)
      setMsgColor('#4caf50')
      play('snakes_ladder'); vibrate([20,10,30])
      await delay(400)
      setDisplay(d=>{const nd=[...d];nd[p]=finalPos;return nd})
    } else if (ns.lastEvent==='win') {
      setEventMsg(`🏆 ${names[p]} wins!`)
      setMsgColor('#ffd700')
      play('ttt_win'); vibrate([50,30,80])
      onGameOver?.({winner:names[p]})
    }

    setState(ns)
    setRolling(false); animRef.current=false

    // AI auto-roll
    if (!ns.gameOver && !isHuman(ns.currentPlayer)) {
      setTimeout(()=>doAIRoll(ns), 900)
    }
  }

  async function doAIRoll(st) {
    if (st.gameOver||animRef.current) return
    animRef.current=true; setRolling(true); setEventMsg('')

    play('snakes_dice')
    for(let i=0;i<5;i++){setDiceVal(Math.floor(Math.random()*6)+1);await delay(65)}

    const res=engine.applyMove({action:'roll'})
    const ns=engine.cloneState()
    const p=st.currentPlayer
    const finalDice=ns.dice||res.dice||1
    setDiceVal(finalDice)

    const from=st.positions[p]
    const raw=from+finalDice
    const bounced=raw>100?100-(raw-100):raw
    const finalPos=ns.positions[p]

    for(let step=from+1;step<=Math.min(bounced,100);step++){
      await delay(70);setDisplay(d=>{const nd=[...d];nd[p]=step;return nd})
    }
    if(ns.lastEvent==='snake'){
      setEventMsg(`🐍 ${names[p]} hit a snake!`);setMsgColor('#e94560')
      await delay(400);setDisplay(d=>{const nd=[...d];nd[p]=finalPos;return nd})
    } else if(ns.lastEvent==='ladder'){
      setEventMsg(`🪜 ${names[p]} found a ladder!`);setMsgColor('#4caf50')
      await delay(400);setDisplay(d=>{const nd=[...d];nd[p]=finalPos;return nd})
    } else if(ns.lastEvent==='win'){
      setEventMsg(`🏆 ${names[p]} wins!`);setMsgColor('#ffd700')
      play('ttt_win');vibrate([50,30,80])
      onGameOver?.({winner:names[p]})
    }
    setState(ns);setRolling(false);animRef.current=false

    if(!ns.gameOver&&!isHuman(ns.currentPlayer)){
      setTimeout(()=>doAIRoll(ns),900)
    }
  }

  const {currentPlayer,gameOver,positions}=state

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background:'linear-gradient(160deg,#3e1a00 0%,#1a0a00 40%,#0a0b14 100%)',
      userSelect:'none',overflow:'hidden',
    }}>

      {/* Header — Snakes & Ladders style like screenshot */}
      <div style={{
        flexShrink:0,padding:'10px 14px 8px',
        background:'linear-gradient(90deg,#8b0000,#c62828)',
        borderBottom:'3px solid #ffd700',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={onExit} style={{...BTN,background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.2)'}}>←</button>
          <div style={{
            fontSize:20,fontWeight:900,color:'#ffd700',flex:1,
            textShadow:'2px 2px 4px rgba(0,0,0,0.5)',letterSpacing:-0.5,
            fontStyle:'italic',
          }}>🐍 Snakes & Ladders</div>
          <div style={{
            background:'rgba(0,0,0,0.3)',borderRadius:8,
            padding:'3px 8px',border:'1px solid rgba(255,215,0,0.3)',
          }}>
            <div style={{fontSize:9,color:'rgba(255,215,0,0.6)',fontWeight:700}}>PLAYERS</div>
            <div style={{fontSize:14,color:'#ffd700',fontWeight:900,textAlign:'center'}}>{pc}</div>
          </div>
        </div>
      </div>

      {/* Player panels — bottom style like Ludo King */}
      <div style={{display:'flex',gap:6,padding:'6px 10px 4px',flexShrink:0}}>
        {Array.from({length:pc},(_,i)=>(
          <div key={i} style={{
            flex:1,padding:'5px 8px',borderRadius:10,
            background:currentPlayer===i&&!gameOver?`${P_COLORS[i]}25`:'rgba(255,255,255,0.05)',
            border:`1.5px solid ${currentPlayer===i&&!gameOver?P_COLORS[i]:'rgba(255,255,255,0.1)'}`,
            boxShadow:currentPlayer===i&&!gameOver?`0 0 14px ${P_COLORS[i]}40`:'none',
            transition:'all 0.2s',minWidth:0,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:14}}>{P_EMOJI[i]}</span>
              <div style={{color:currentPlayer===i&&!gameOver?'#fff':'rgba(255,255,255,0.45)',
                fontSize:10,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                {names[i]}
              </div>
            </div>
            <div style={{color:currentPlayer===i&&!gameOver?P_COLORS[i]:'rgba(255,255,255,0.3)',
              fontSize:11,fontWeight:800,marginTop:2}}>
              Sq {positions[i]||0}
            </div>
          </div>
        ))}
      </div>

      {/* Event message */}
      <div style={{height:24,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {eventMsg&&(
          <div style={{fontSize:12,fontWeight:700,color:msgColor,padding:'1px 12px',
            borderRadius:20,background:'rgba(0,0,0,0.4)',animation:'snkFadeIn 0.3s ease'}}>
            {eventMsg}
          </div>
        )}
      </div>

      {/* Board */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        padding:'0 6px',minHeight:0,overflow:'hidden'}}>
        <SnakesBoard
          positions={displayPos.map((p,i)=>p||0)}
          playerCount={pc}
          currentPlayer={currentPlayer}
        />
      </div>

      {/* Bottom controls — like screenshot with dice button */}
      <div style={{
        flexShrink:0,padding:'8px 14px 14px',
        background:'linear-gradient(0deg,rgba(0,0,0,0.5),transparent)',
        borderTop:'1px solid rgba(255,255,255,0.05)',
      }}>
        {!gameOver ? (
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {/* Player indicator */}
            <div style={{
              display:'flex',alignItems:'center',gap:8,flex:1,
              padding:'8px 12px',borderRadius:12,
              background:`${P_COLORS[currentPlayer]}20`,
              border:`1px solid ${P_COLORS[currentPlayer]}40`,
            }}>
              <span style={{fontSize:20}}>{P_EMOJI[currentPlayer]}</span>
              <div>
                <div style={{color:'#fff',fontSize:12,fontWeight:700,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:80}}>
                  {names[currentPlayer]}
                </div>
                <div style={{color:P_COLORS[currentPlayer],fontSize:10,fontWeight:600}}>
                  {isHuman(currentPlayer)&&!rolling?'Your turn':'AI playing…'}
                </div>
              </div>
            </div>

            {/* Dice button */}
            <button onClick={handleRoll}
              disabled={rolling||gameOver||!isHuman(currentPlayer)}
              style={{
                width:70,height:70,borderRadius:16,border:'none',flexShrink:0,
                background:rolling||!isHuman(currentPlayer)
                  ?'rgba(255,255,255,0.1)'
                  :'linear-gradient(135deg,#fff,#f0f0f0)',
                fontSize:38,cursor:rolling?'default':'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:!rolling&&isHuman(currentPlayer)
                  ?`0 6px 24px ${P_COLORS[currentPlayer]}60,0 2px 8px rgba(0,0,0,0.4)`
                  :'none',
                transform:rolling?'rotate(15deg) scale(0.9)':'scale(1)',
                transition:'all 0.15s',
                animation:!rolling&&isHuman(currentPlayer)&&!gameOver
                  ?'diceGlow 1.5s ease-in-out infinite':'none',
              }}>
              {diceVal?DICE_FACE[diceVal]:'🎲'}
            </button>
          </div>
        ) : (
          <div style={{display:'flex',gap:10}}>
            <button onClick={onExit} style={{flex:1,padding:'13px 0',borderRadius:13,
              border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.07)',
              color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              🏠 Home</button>
            <button onClick={()=>{
              engine.initializeGame({playerCount:pc,playerNames:names})
              setState(engine.cloneState())
              setDisplay(Array(pc).fill(0))
              setDiceVal(null);setEventMsg('');setRolling(false);animRef.current=false
              play('game_start')
            }} style={{flex:2,padding:'13px 0',borderRadius:13,border:'none',
              background:'linear-gradient(135deg,#c62828,#8b0000)',
              color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
              boxShadow:'0 4px 20px rgba(198,40,40,0.4)'}}>
              ▶ Play Again</button>
          </div>
        )}
      </div>

      {/* Game over modal */}
      {gameOver&&(
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
          <div style={{
            background:'linear-gradient(160deg,#1a1e30,#0f1220)',
            borderRadius:22,padding:'26px 20px',width:'100%',maxWidth:300,textAlign:'center',
            border:'2px solid rgba(255,215,0,0.5)',
            boxShadow:'0 20px 60px rgba(255,215,0,0.15)',
            animation:'snkPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{fontSize:48,marginBottom:8}}>🏆</div>
            <div style={{color:'#ffd700',fontWeight:900,fontSize:22,marginBottom:14}}>
              {state.winner!==null?`${names[state.winner]} Wins!`:'Game Over!'}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={onExit} style={{flex:1,padding:'12px 0',borderRadius:12,
                border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.07)',
                color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                🏠 Home</button>
              <button onClick={()=>{
                engine.initializeGame({playerCount:pc,playerNames:names})
                setState(engine.cloneState())
                setDisplay(Array(pc).fill(0))
                setDiceVal(null);setEventMsg('');setRolling(false);animRef.current=false
                play('game_start')
              }} style={{flex:2,padding:'12px 0',borderRadius:12,border:'none',
                background:'linear-gradient(135deg,#c62828,#8b0000)',
                color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 3px 16px rgba(198,40,40,0.4)'}}>
                ▶ Play Again</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes snkFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes snkPopIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes diceGlow{0%,100%{box-shadow:0 6px 24px ${P_COLORS[0]}60}50%{box-shadow:0 6px 30px ${P_COLORS[0]}90}}
      `}</style>
    </div>
  )
}
const BTN={background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,cursor:'pointer',
  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:'inherit'}
