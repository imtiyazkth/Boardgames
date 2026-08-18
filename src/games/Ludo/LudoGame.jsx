import { useState, useEffect, useRef, useCallback } from 'react'
import { LudoEngine, LudoAI, SAFE_ZONES, TRACK, HOME_PATH,
         YARD_SLOTS, getTokenCoord, PLAYER_ENTRY } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

// ── Colors exactly matching Ludo King ────────────────────────────────────────
const PC  = ['#e53935','#2196f3','#4caf50','#ffb300']  // Red Blue Green Yellow
const PCL = ['#ffcdd2','#bbdefb','#c8e6c9','#fff9c4']  // Light versions
const PN  = ['Red','Blue','Green','Yellow']
const G   = 15  // 15x15 grid

const DICE_FACE = ['','⚀','⚁','⚂','⚃','⚄','⚅']

function delay(ms){ return new Promise(r=>setTimeout(r,ms)) }

// ── Ludo King-style SVG board ────────────────────────────────────────────────
function LudoBoard({ state, legalTokens, onTokenClick, cellSize=38 }) {
  if (!state) return null
  const S = G * cellSize

  // Track which squares have tokens: key=`${c},${r}` → [{p,t}]
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
    <svg viewBox={`0 0 ${S} ${S}`} width="100%"
      style={{ display:'block', maxWidth:420 }}>

      {/* Board base */}
      <rect width={S} height={S} fill="#f5f5f5" rx={6}/>

      {/* 4 colored home yard quadrants */}
      {[
        // Red — bottom-left
        { x:0,      y:9*cellSize, w:6*cellSize, h:6*cellSize, c:PC[0], p:0 },
        // Blue — top-right  
        { x:9*cellSize, y:0,      w:6*cellSize, h:6*cellSize, c:PC[1], p:1 },
        // Green — top-left
        { x:0,      y:0,          w:6*cellSize, h:6*cellSize, c:PC[2], p:2 },
        // Yellow — bottom-right
        { x:9*cellSize, y:9*cellSize, w:6*cellSize, h:6*cellSize, c:PC[3], p:3 },
      ].map(({x,y,w,h,c,p})=>(
        <g key={p}>
          {/* Outer colored square */}
          <rect x={x} y={y} width={w} height={h} fill={c} rx={4}/>
          {/* Inner white box */}
          <rect x={x+cellSize*0.4} y={y+cellSize*0.4}
            width={w-cellSize*0.8} height={h-cellSize*0.8}
            fill="rgba(255,255,255,0.85)" rx={3}/>
          {/* Player label */}
          <text x={x+w/2} y={y+h-cellSize*0.25} textAnchor="middle"
            fontSize={cellSize*0.38} fontWeight="800" fill={c} opacity={0.7}>
            {PN[p].toUpperCase()}
          </text>
        </g>
      ))}

      {/* Colored home-path strips (center columns) */}
      {/* Green strip (top center) */}
      <rect x={6*cellSize} y={0} width={3*cellSize} height={6*cellSize}
        fill={`${PC[2]}30`}/>
      {/* Blue strip (right center) */}
      <rect x={9*cellSize} y={6*cellSize} width={6*cellSize} height={3*cellSize}
        fill={`${PC[1]}30`}/>
      {/* Red strip (bottom center) */}
      <rect x={6*cellSize} y={9*cellSize} width={3*cellSize} height={6*cellSize}
        fill={`${PC[0]}30`}/>
      {/* Yellow strip (left center) */}
      <rect x={0} y={6*cellSize} width={6*cellSize} height={3*cellSize}
        fill={`${PC[3]}30`}/>

      {/* Grid cells */}
      {Array.from({length:G},(_,r)=>Array.from({length:G},(_,c)=>{
        const inYard=(c<6&&r<6)||(c>8&&r<6)||(c<6&&r>8)||(c>8&&r>8)
        const isCenter=c>=6&&c<=8&&r>=6&&r<=8
        if(inYard||isCenter) return null
        const trackIdx=TRACK.findIndex(([tc,tr])=>tc===c&&tr===r)
        const isSafe=trackIdx>=0&&SAFE_ZONES.has(trackIdx)
        const isStart=[0,6,8,14].some(p=>{
          const ep=PLAYER_ENTRY[p]||0
          return trackIdx===ep
        })
        return (
          <rect key={`${r}${c}`}
            x={c*cellSize} y={r*cellSize}
            width={cellSize} height={cellSize}
            fill={isSafe?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.15)'}
            stroke="rgba(0,0,0,0.08)" strokeWidth={0.5}/>
        )
      }))}

      {/* Star markers on safe zones */}
      {[...SAFE_ZONES].filter(s=>s<52).map(s=>{
        const [c,r]=TRACK[s]
        return <text key={s} x={c*cellSize+cellSize/2} y={r*cellSize+cellSize*0.7}
          textAnchor="middle" fontSize={cellSize*0.55} opacity={0.5}>☆</text>
      })}

      {/* Arrow markers at player start positions */}
      {[
        {p:0, x:7*cellSize, y:13*cellSize, t:'↑'},
        {p:1, x:1*cellSize, y:7*cellSize,  t:'→'},
        {p:2, x:7*cellSize, y:1*cellSize,  t:'↓'},
        {p:3, x:13*cellSize,y:7*cellSize,  t:'←'},
      ].map(({p,x,y,t})=>(
        <text key={p} x={x+cellSize/2} y={y+cellSize*0.72}
          textAnchor="middle" fontSize={cellSize*0.6}
          fill={PC[p]} fontWeight="900" opacity={0.8}>{t}</text>
      ))}

      {/* Center star diamond */}
      <polygon
        points={`${7.5*cellSize},${6.3*cellSize} ${8.7*cellSize},${7.5*cellSize} ${7.5*cellSize},${8.7*cellSize} ${6.3*cellSize},${7.5*cellSize}`}
        fill="#ffd700" stroke="rgba(0,0,0,0.2)" strokeWidth={1}/>
      <text x={7.5*cellSize} y={7.5*cellSize+5} textAnchor="middle"
        fontSize={cellSize*0.7} fontWeight="bold" fill="#fff">★</text>

      {/* Tokens — rendered over everything */}
      {Object.entries(tokenMap).map(([key,tokens])=>{
        const [c,r]=key.split(',').map(Number)
        const cx=(c+0.5)*cellSize, cy=(r+0.5)*cellSize
        const count=tokens.length

        return tokens.map(({p,t,tok},idx)=>{
          const isLegal=legalTokens.some(l=>l.p===p&&l.t===t)
          const r2=count>1?cellSize*0.21:cellSize*0.3

          // Offset for stacking multiple tokens
          let ox=0,oy=0
          if(count===2){ox=(idx===0?-1:1)*cellSize*0.16}
          if(count===3){
            const ang=(idx/3)*Math.PI*2-Math.PI/2
            ox=Math.cos(ang)*cellSize*0.17;oy=Math.sin(ang)*cellSize*0.17
          }
          if(count>=4){
            ox=((idx%2)*2-1)*cellSize*0.14
            oy=((Math.floor(idx/2)*2)-1)*cellSize*0.14
          }

          return (
            <g key={`${p}-${t}`}
              onClick={()=>isLegal&&onTokenClick(p,t)}
              style={{cursor:isLegal?'pointer':'default'}}>
              {/* Pulse ring for selectable */}
              {isLegal&&(
                <circle cx={cx+ox} cy={cy+oy} r={r2*1.7}
                  fill="none" stroke={PC[p]} strokeWidth={2} opacity={0.55}
                  style={{animation:'ludoPulse 0.8s ease-in-out infinite'}}/>
              )}
              {/* Drop shadow */}
              <ellipse cx={cx+ox+1} cy={cy+oy+r2*0.6} rx={r2*0.8} ry={r2*0.35}
                fill="rgba(0,0,0,0.25)"/>
              {/* Pin body — Ludo King style teardrop */}
              <path d={`M${cx+ox},${cy+oy+r2*0.8}
                C${cx+ox-r2*1.1},${cy+oy-r2*0.3}
                ${cx+ox-r2*1.1},${cy+oy-r2*1.6}
                ${cx+ox},${cy+oy-r2*1.6}
                C${cx+ox+r2*1.1},${cy+oy-r2*1.6}
                ${cx+ox+r2*1.1},${cy+oy-r2*0.3}
                ${cx+ox},${cy+oy+r2*0.8}Z`}
                fill={PC[p]} stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
              {/* Inner circle */}
              <circle cx={cx+ox} cy={cy+oy-r2*0.6} r={r2*0.55}
                fill={PCL[p]} opacity={0.9}/>
              {/* Shine */}
              <circle cx={cx+ox-r2*0.2} cy={cy+oy-r2*0.85} r={r2*0.2}
                fill="rgba(255,255,255,0.6)"/>
              {/* Bounce animation for selectable */}
              {isLegal&&(
                <animateTransform attributeName="transform" type="translate"
                  values="0,0;0,-3;0,0" dur="0.6s" repeatCount="indefinite"
                  additive="sum"/>
              )}
            </g>
          )
        })
      })}

      <style>{`
        @keyframes ludoPulse{
          0%,100%{stroke-opacity:0.6;r:${cellSize*0.3*1.7}px}
          50%{stroke-opacity:0.2;r:${cellSize*0.3*2.1}px}
        }
      `}</style>
    </svg>
  )
}

// ── Player Panel (top/bottom style like Ludo King) ──────────────────────────
function PlayerPanel({ name, color, light, isActive, isAI, tokensDone, score, small }) {
  return (
    <div style={{
      flex:1,minWidth:0,padding:small?'5px 7px':'7px 10px',
      borderRadius:12,transition:'all 0.25s',
      background:isActive?`${color}25`:'rgba(255,255,255,0.05)',
      border:`2px solid ${isActive?color:'rgba(255,255,255,0.1)'}`,
      boxShadow:isActive?`0 0 20px ${color}40`:'none',
      position:'relative',overflow:'hidden',
    }}>
      {isActive&&<div style={{
        position:'absolute',top:0,left:0,right:0,height:3,
        background:`linear-gradient(90deg,${color},${color}60)`,
      }}/>}
      <div style={{display:'flex',alignItems:'center',gap:5}}>
        <div style={{
          width:18,height:18,borderRadius:'50%',background:color,
          flexShrink:0,border:'1.5px solid rgba(255,255,255,0.3)',
          boxShadow:isActive?`0 0 8px ${color}`:'none',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:8,
        }}>{isAI?'🤖':''}</div>
        <div style={{
          color:isActive?'#fff':'rgba(255,255,255,0.5)',
          fontSize:small?9:11,fontWeight:700,
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,
        }}>{name}</div>
        {isActive&&<div style={{
          width:6,height:6,borderRadius:'50%',background:color,
          animation:'ludoGlow 0.9s ease-in-out infinite',flexShrink:0,
        }}/>}
      </div>
      <div style={{display:'flex',gap:3,marginTop:3}}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{
            width:8,height:8,borderRadius:'50%',
            background:i<tokensDone?color:'rgba(255,255,255,0.12)',
            boxShadow:i<tokensDone?`0 0 5px ${color}`:'none',
            transition:'all 0.3s',
          }}/>
        ))}
      </div>
    </div>
  )
}

// ── Dice Component (Ludo King style) ────────────────────────────────────────
function LudoDice({ value, rolling, canRoll, onRoll, color }) {
  return (
    <button onClick={onRoll} disabled={!canRoll||rolling}
      style={{
        width:64,height:64,borderRadius:16,flexShrink:0,
        background:canRoll?'#fff':'rgba(255,255,255,0.1)',
        border:`3px solid ${canRoll?color:'rgba(255,255,255,0.15)'}`,
        fontSize:38,cursor:canRoll?'pointer':'default',
        display:'flex',alignItems:'center',justifyContent:'center',
        boxShadow:canRoll?`0 6px 24px ${color}70,0 2px 8px rgba(0,0,0,0.4)`:'none',
        transform:rolling?'rotate(20deg) scale(0.88)':canRoll?'scale(1.05)':'scale(1)',
        transition:'all 0.15s',
        animation:canRoll&&!rolling?'diceWiggle 2s ease-in-out infinite':'none',
      }}>
      {value?DICE_FACE[value]:'🎲'}
      <style>{`
        @keyframes diceWiggle{
          0%,100%{transform:scale(1.05) rotate(0deg)}
          25%{transform:scale(1.07) rotate(-5deg)}
          75%{transform:scale(1.07) rotate(5deg)}
        }
      `}</style>
    </button>
  )
}

// ── Main Ludo Game ──────────────────────────────────────────────────────────
export default function LudoGame({ mode='solo', playerCount=4, playerNames=[], onExit, onGameOver }) {
  const { play, vibrate } = useAudio()
  const pc = Math.min(4, Math.max(2, playerCount||4))

  const humanPlayers = mode==='local2p'?[0,1]:mode==='local3p'?[0,1,2]:mode==='local4p'?[0,1,2,3]:[0]
  const names = Array.from({length:pc},(_,i)=>
    playerNames[i] || (humanPlayers.includes(i)?`Player ${i+1}`:PN[i])
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

  function showMsg(text,color='#ffd700',ms=2000) {
    setMsg(text); setMsgClr(color)
    setTimeout(()=>setMsg(''),ms)
  }

  function startGame() {
    engine.initializeGame({playerCount:pc,playerNames:names,humanPlayers})
    setState(engine.cloneState())
    setDiceVal(null);setLegal([]);setMsg('')
    aiBusy.current=false; setRolling(false)
    play('game_start')
  }

  useEffect(()=>{startGame()},[])

  useEffect(()=>{
    if (!state||state.dice===null||state.gameOver){setLegal([]);return}
    const moves=engine.getValidMoves()
    setLegal(moves.map(m=>({p:m.player,t:m.token})))
  },[state])

  // AI auto-play
  useEffect(()=>{
    if (!state||state.gameOver||aiBusy.current) return
    const p=state.currentPlayer
    if (isHuman(p)) return
    aiBusy.current=true
    if (state.dice===null) {
      setTimeout(()=>{doRoll();aiBusy.current=false},700)
    } else {
      setTimeout(()=>{
        const move=ai.getBestMove(engine)
        if(move) doApplyMove(move)
        else {engine.autoPass();setState(engine.cloneState());setDiceVal(null)}
        aiBusy.current=false
      },800)
    }
  },[state])

  async function doRoll() {
    if (!state||state.dice!==null||rolling) return
    setRolling(true)
    play('ludo_dice'); vibrate([12])
    for(let i=0;i<8;i++){setDiceVal(Math.ceil(Math.random()*6));await delay(70)}
    setRolling(false)
    const res=engine.rollDice()
    setDiceVal(res.dice)
    const ns=engine.cloneState()
    setState(ns)
    if(res.event==='three_sixes'){
      showMsg('🚫 Three 6s! Turn skipped.','#e94560')
      setDiceVal(null)
    } else if(res.event==='no_moves'){
      showMsg('😔 No moves available','rgba(255,255,255,0.5)')
      setTimeout(()=>{engine.autoPass();setState(engine.cloneState());setDiceVal(null)},1500)
    } else if(res.event==='auto_move'&&res.autoMove){
      setTimeout(()=>doApplyMove(res.autoMove),400)
    }
    if(res.dice===6) showMsg('🎲 Roll again!',PC[state.currentPlayer],1200)
  }

  function handleRoll() {
    if (!isHuman(state?.currentPlayer)) return
    doRoll()
  }

  function doApplyMove(move) {
    const res=engine.applyMove(move)
    const ns=engine.cloneState()
    setState(ns);setDiceVal(null);setLegal([])
    if(res.event==='capture'){
      play('ludo_capture');vibrate([25,15,25])
      showMsg(`💥 ${names[move.player]} cut a token!`,PC[move.player])
    } else if(res.event==='goal'){
      play('ludo_finish');vibrate([30,20,40])
      showMsg(`🏠 Token home!`,'#4caf50')
    } else if(res.event==='entered'){
      play('ludo_enter')
    } else {
      play('ludo_move');vibrate([6])
    }
    if(ns.gameOver){
      play('ttt_win');vibrate([60,30,80])
      showMsg(`🏆 ${names[ns.winner]} wins!`,'#ffd700',5000)
      onGameOver?.({winner:names[ns.winner]})
    }
  }

  function handleTokenClick(p,t) {
    if (!state||state.gameOver||!isHuman(p)||state.currentPlayer!==p) return
    const move=engine.getValidMoves().find(m=>m.player===p&&m.token===t)
    if (!move) return
    doApplyMove(move)
  }

  if (!state) return null
  const {currentPlayer,gameOver,winner,tokens}=state
  const canRoll=!gameOver&&state.dice===null&&isHuman(currentPlayer)&&!rolling
  const tokensDone=p=>tokens[p].filter(t=>t.status==='GOAL').length

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',
      background:`linear-gradient(160deg,${PC[currentPlayer]}15 0%,#0d0d1a 40%,#1a1428 100%)`,
      userSelect:'none',overflow:'hidden',position:'relative',
    }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex',alignItems:'center',gap:10,
        padding:'10px 14px 6px',flexShrink:0,
        background:'rgba(0,0,0,0.3)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
      }}>
        <button onClick={onExit} style={BTN}>←</button>
        <span style={{fontSize:22,filter:`drop-shadow(0 0 10px ${PC[currentPlayer]}90)`}}>🎲</span>
        <span style={{color:'#fff',fontWeight:900,fontSize:18,flex:1,letterSpacing:-0.3}}>Ludo</span>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontWeight:600}}>
          {mode==='solo'?`${pc}P vs AI`:mode==='local2p'?'2P Local':mode==='local3p'?'3P Local':'4P Local'}
        </span>
      </div>

      {/* ── Player Panels ── */}
      <div style={{display:'flex',gap:6,padding:'7px 10px 3px',flexShrink:0}}>
        {Array.from({length:pc},(_,i)=>(
          <PlayerPanel key={i}
            name={names[i]} color={PC[i]} light={PCL[i]}
            isActive={currentPlayer===i&&!gameOver}
            isAI={!isHuman(i)}
            tokensDone={tokensDone(i)}
            small={pc>2}
          />
        ))}
      </div>

      {/* ── Status message ── */}
      <div style={{height:26,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {msg?(
          <div style={{fontSize:12,fontWeight:700,color:msgClr,
            padding:'2px 12px',borderRadius:20,
            background:'rgba(0,0,0,0.4)',
            animation:'ludoMsgIn 0.25s ease'}}>
            {msg}
          </div>
        ):!gameOver&&(
          <div style={{display:'flex',alignItems:'center',gap:5,
            fontSize:12,fontWeight:600,color:PC[currentPlayer]}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:PC[currentPlayer],
              animation:'ludoGlow 0.9s infinite'}}/>
            {names[currentPlayer]}'s turn
            {!isHuman(currentPlayer)&&<span style={{opacity:0.5}}> · AI playing…</span>}
          </div>
        )}
      </div>

      {/* ── Board ── */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
        padding:'0 6px',minHeight:0,overflow:'hidden'}}>
        <LudoBoard
          state={state}
          legalTokens={legal}
          onTokenClick={(p,t)=>isHuman(p)&&!gameOver&&handleTokenClick(p,t)}
        />
      </div>

      {/* ── Bottom Controls — Ludo King style ── */}
      <div style={{
        padding:'8px 14px 14px',flexShrink:0,
        background:'rgba(0,0,0,0.3)',
        borderTop:'1px solid rgba(255,255,255,0.05)',
      }}>
        {!gameOver?(
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <LudoDice
              value={diceVal} rolling={rolling}
              canRoll={canRoll} onRoll={handleRoll}
              color={PC[currentPlayer]}
            />
            <div style={{flex:1}}>
              {diceVal&&!rolling&&(
                <div style={{color:'#fff',fontSize:14,fontWeight:900,marginBottom:4}}>
                  Rolled: <span style={{color:PC[currentPlayer],fontSize:22}}>{diceVal}</span>
                  {diceVal===6&&<span style={{color:'#ffd700',fontSize:11,marginLeft:6,fontWeight:700}}>
                    +1 bonus roll!
                  </span>}
                </div>
              )}
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:11}}>
                {canRoll?'👆 Tap dice to roll'
                  :legal.length>0?'👆 Tap glowing token'
                  :!isHuman(currentPlayer)?'🤖 AI is playing…'
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
            <button onClick={onExit} style={{
              flex:1,padding:'13px 0',borderRadius:13,
              border:'1px solid rgba(255,255,255,0.12)',
              background:'rgba(255,255,255,0.07)',
              color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,
              cursor:'pointer',fontFamily:'inherit'}}>
              🏠 Home
            </button>
            <button onClick={startGame} style={{
              flex:2,padding:'13px 0',borderRadius:13,border:'none',
              background:`linear-gradient(135deg,${PC[0]},${PC[1]})`,
              color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
              boxShadow:'0 4px 20px rgba(229,57,53,0.5)'}}>
              ▶ Play Again
            </button>
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
            animation:'ludoPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{fontSize:56,marginBottom:10}}>🏆</div>
            <div style={{fontSize:26,fontWeight:900,color:'#fff',marginBottom:4}}>
              {names[winner]} Wins!
            </div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:18}}>
              All tokens home! 🏠
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={onExit} style={{
                flex:1,padding:'12px 0',borderRadius:12,
                border:'1px solid rgba(255,255,255,0.12)',
                background:'rgba(255,255,255,0.07)',
                color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:700,
                cursor:'pointer',fontFamily:'inherit'}}>
                🏠 Home
              </button>
              <button onClick={startGame} style={{
                flex:2,padding:'12px 0',borderRadius:12,border:'none',
                background:`linear-gradient(135deg,${PC[winner]},${PC[winner]}cc)`,
                color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                ▶ Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ludoGlow{0%,100%{opacity:1;box-shadow:0 0 8px currentColor}50%{opacity:0.4;box-shadow:none}}
        @keyframes ludoMsgIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ludoPopIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}
const BTN={background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff',fontSize:18,width:36,height:36,borderRadius:10,cursor:'pointer',
  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:'inherit'}
