/**
 * HomeScreen v3 — Premium game hub
 * - Animated board previews per game
 * - Daily Challenge badge
 * - Smooth filter system
 * - Win stats per card
 * - Category browsing
 */
import { useState, useEffect, useRef } from 'react'
import { GAMES } from '../core/GameRegistry.js'
import { SaveSystem } from '../core/SaveSystem.js'
import { VERSION_LABEL } from '../core/Version.js'
import { audioEngine } from '../core/AudioEngine.js'

// ── Daily game pick (deterministic by date) ───────────────────────────────────
function getDailyGame() {
  const available = GAMES.filter(g=>g.available)
  return available[Math.floor(Date.now()/86400000) % available.length]
}

// ── Rotating tips ─────────────────────────────────────────────────────────────
const TIPS = [
  '♟ Chess: Control the center in the opening',
  '🎲 Ludo: Roll 6 for a bonus turn',
  '⭕ Tic Tac Toe: Take the center first',
  '🐍 Snakes: You bounce back past 100',
  '🔢 Sliding Puzzle: Solve top rows first',
  '🎱 Carrom: Pocket queen then cover immediately',
  '⬛ Morris: Double-mills are unstoppable',
  '🔴 Checkers: All captures are mandatory',
  '🟡 16 Goti: Chain captures win games',
]

const TAG_COLORS = {
  quick:'#e94560',strategy:'#9c27b0',puzzle:'#f5a623',dice:'#ff9800',
  family:'#4caf50',physics:'#03a9f4',classic:'#795548',brain:'#00bcd4',
  capture:'#f44336',solo:'#607d8b',luck:'#ff5722',mill:'#6d4c41',
  skill:'#ff6f00',tiles:'#78909c',race:'#e91e63',deep:'#455a64',
}

// ── SVG Board Previews ────────────────────────────────────────────────────────
function TicPreview({ color }) {
  const cells=['O','X','X','','O','X','O','','']
  return (
    <svg viewBox="0 0 78 78" width="72" height="72">
      <line x1="26" y1="2" x2="26" y2="76" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <line x1="52" y1="2" x2="52" y2="76" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <line x1="2" y1="26" x2="76" y2="26" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <line x1="2" y1="52" x2="76" y2="52" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      {cells.map((c,i)=>{
        const x=(i%3)*26+13, y=Math.floor(i/3)*26+13
        if(c==='O') return <circle key={i} cx={x} cy={y} r="8" fill="none" stroke={color} strokeWidth="2.5"/>
        if(c==='X') return <g key={i}>
          <line x1={x-7} y1={y-7} x2={x+7} y2={y+7} stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1={x+7} y1={y-7} x2={x-7} y2={y+7} stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
        </g>
        return null
      })}
    </svg>
  )
}

function ChessPreview() {
  const pieces=[['♜',0,0],['♚',3,0],['♛',4,0],['♟',1,1],['♟',4,1],
                ['♙',2,6],['♙',5,6],['♔',4,7],['♕',3,7],['♖',7,7]]
  return (
    <svg viewBox="0 0 80 80" width="74" height="74">
      {[0,1,2,3].map(r=>[0,1,2,3].map(c=>(
        <rect key={`${r}${c}`} x={c*20} y={r*20} width="20" height="20"
          fill={(r+c)%2===0?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.25)'}/>
      )))}
      {pieces.map(([p,c,r],i)=>(
        <text key={i} x={c*10+6} y={r*10+15} fontSize="12" fill={r>3?'#fff':'#aaa'} opacity="0.9">{p}</text>
      ))}
    </svg>
  )
}

function LudoPreview({ color }) {
  const cols=['#e53935','#1565c0','#2e7d32','#f9a825']
  const pos=[[4,4],[44,4],[4,44],[44,44]]
  return (
    <svg viewBox="0 0 80 80" width="74" height="74">
      {cols.map((c,i)=>(
        <g key={i}>
          <rect x={pos[i][0]} y={pos[i][1]} width="28" height="28" rx="4" fill={`${c}30`} stroke={`${c}60`} strokeWidth="1.5"/>
          <circle cx={pos[i][0]+14} cy={pos[i][1]+14} r="8" fill={c} opacity="0.85"/>
        </g>
      ))}
      <polygon points="40,32 50,48 30,48" fill="rgba(255,215,0,0.7)"/>
    </svg>
  )
}

function CheckersPreview({ color }) {
  const whites=[[5,5],[25,5],[15,15],[35,15]]
  const blacks=[[5,45],[25,45],[15,55],[35,55]]
  return (
    <svg viewBox="0 0 60 60" width="60" height="60">
      {[0,1,2,3,4].map(r=>[0,1].map(c=>(
        <rect key={`${r}${c}`} x={c*30} y={r*12} width="30" height="12"
          fill={(r+c)%2===0?`${color}25`:'rgba(0,0,0,0.2)'}/>
      )))}
      {whites.map(([x,y],i)=><circle key={`w${i}`} cx={x} cy={y} r="5" fill="#eee" opacity="0.9"/>)}
      {blacks.map(([x,y],i)=><circle key={`b${i}`} cx={x} cy={y} r="5" fill="#333" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>)}
    </svg>
  )
}

function SnakesPreview({ color }) {
  return (
    <svg viewBox="0 0 72 72" width="68" height="68">
      {[0,1,2,3].map(r=>[0,1,2,3].map(c=>(
        <rect key={`${r}${c}`} x={c*18} y={r*18} width="18" height="18"
          fill={(r+c)%2===0?`${color}22`:`${color}08`} stroke={`${color}15`} strokeWidth="0.5"/>
      )))}
      <path d="M9 63 Q36 63 36 36 Q36 9 63 9" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.7"/>
      <line x1="18" y1="54" x2="54" y2="18" stroke="#ff9800" strokeWidth="2.5" opacity="0.8"/>
      <line x1="22" y1="54" x2="58" y2="18" stroke="#ff9800" strokeWidth="2.5" opacity="0.8"/>
      <circle cx="9" cy="63" r="5" fill="#2196f3"/>
    </svg>
  )
}

function MorrisPreview({ color }) {
  return (
    <svg viewBox="0 0 80 80" width="74" height="74">
      <rect x="3" y="3" width="74" height="74" fill="none" stroke={`${color}60`} strokeWidth="1.5"/>
      <rect x="18" y="18" width="44" height="44" fill="none" stroke={`${color}60`} strokeWidth="1.5"/>
      <rect x="33" y="33" width="14" height="14" fill="none" stroke={`${color}60`} strokeWidth="1.5"/>
      <line x1="40" y1="3" x2="40" y2="33" stroke={`${color}50`} strokeWidth="1.5"/>
      <line x1="40" y1="47" x2="40" y2="77" stroke={`${color}50`} strokeWidth="1.5"/>
      <line x1="3" y1="40" x2="33" y2="40" stroke={`${color}50`} strokeWidth="1.5"/>
      <line x1="47" y1="40" x2="77" y2="40" stroke={`${color}50`} strokeWidth="1.5"/>
      {[[3,3],[40,3],[77,3],[3,40],[77,40],[3,77],[40,77],[77,77]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="5" fill={i%2===0?'#fff':`${color}cc`}/>
      ))}
    </svg>
  )
}

function CarromPreview({ color }) {
  const w=[[22,18],[42,18],[32,35],[20,48],[44,48]]
  const b=[[18,22],[46,22],[18,46],[46,46]]
  return (
    <svg viewBox="0 0 80 80" width="74" height="74">
      <rect x="4" y="4" width="72" height="72" rx="6" fill="rgba(139,90,43,0.3)" stroke={`${color}50`} strokeWidth="2"/>
      <circle cx="40" cy="40" r="18" fill="none" stroke={`${color}30`} strokeWidth="1"/>
      {w.map(([x,y],i)=><circle key={`w${i}`} cx={x} cy={y} r="5" fill="rgba(240,230,200,0.85)" stroke="rgba(200,190,160,0.5)" strokeWidth="0.8"/>)}
      {b.map(([x,y],i)=><circle key={`b${i}`} cx={x} cy={y} r="5" fill="rgba(40,40,40,0.85)"/>)}
      <circle cx="40" cy="40" r="5" fill="#e53935" opacity="0.9"/>
    </svg>
  )
}

function SlidingPreview({ color }) {
  const tiles=[1,2,3,4,5,6,7,null,8,10,11,12,9,13,14,15]
  return (
    <svg viewBox="0 0 76 76" width="70" height="70">
      {tiles.map((t,i)=>{
        const x=(i%4)*19, y=Math.floor(i/4)*19
        if(!t) return null
        const ok=t===i+1
        return (
          <g key={i}>
            <rect x={x+1} y={y+1} width="17" height="17" rx="3"
              fill={ok?`${color}40`:'rgba(255,255,255,0.08)'}
              stroke={ok?`${color}60`:'rgba(255,255,255,0.12)'} strokeWidth="1"/>
            <text x={x+9.5} y={y+13} textAnchor="middle" fontSize="9" fontWeight="700"
              fill={ok?color:'rgba(255,255,255,0.6)'}>{t}</text>
          </g>
        )
      })}
    </svg>
  )
}

function SholoPreview({ color }) {
  const reds=[[5,5],[25,5],[45,5],[65,5],[5,25],[65,25]]
  const blues=[[5,65],[25,65],[45,65],[65,65],[5,45],[65,45]]
  return (
    <svg viewBox="0 0 78 78" width="72" height="72">
      {[0,1,2,3].map(r=>[0,1,2,3].map(c=>{
        const x=5+c*18,y=5+r*18
        return <g key={`${r}${c}`}>
          <line x1={x} y1={y} x2={x+18} y2={y} stroke={`${color}30`} strokeWidth="1"/>
          <line x1={x} y1={y} x2={x} y2={y+18} stroke={`${color}30`} strokeWidth="1"/>
          <line x1={x} y1={y} x2={x+18} y2={y+18} stroke={`${color}20`} strokeWidth="0.8"/>
        </g>
      }))}
      {reds.map(([x,y],i)=><circle key={`r${i}`} cx={x} cy={y} r="5" fill="#e53935" opacity="0.85"/>)}
      {blues.map(([x,y],i)=><circle key={`b${i}`} cx={x} cy={y} r="5" fill="#1976d2" opacity="0.85"/>)}
    </svg>
  )
}

function DominoPreview() {
  return (
    <svg viewBox="0 0 80 72" width="74" height="68">
      {[[5,12,2,3],[30,8,1,4],[55,14,3,2]].map(([x,y,a,b],i)=>(
        <g key={i} transform={`rotate(${(i-1)*8} ${x+11} ${y+24})`}>
          <rect x={x} y={y} width="22" height="44" rx="4" fill="#f5f5f0" stroke="#ccc" strokeWidth="1"/>
          <line x1={x} y1={y+22} x2={x+22} y2={y+22} stroke="#999" strokeWidth="1"/>
          {[...Array(a)].map((_,j)=><circle key={`a${j}`} cx={x+7+(j%2)*8} cy={y+7+Math.floor(j/2)*6} r="2.5" fill="#333"/>)}
          {[...Array(b)].map((_,j)=><circle key={`b${j}`} cx={x+7+(j%2)*8} cy={y+27+Math.floor(j/2)*6} r="2.5" fill="#333"/>)}
        </g>
      ))}
    </svg>
  )
}

function BoardPreview({ game }) {
  const map = {
    tictactoe: <TicPreview color={game.color}/>,
    chess:     <ChessPreview/>,
    ludo:      <LudoPreview color={game.color}/>,
    checkers:  <CheckersPreview color={game.color}/>,
    snakes:    <SnakesPreview color={game.color}/>,
    ninemens:  <MorrisPreview color={game.color}/>,
    carrom:    <CarromPreview color={game.color}/>,
    sliding:   <SlidingPreview color={game.color}/>,
    sholoGuti: <SholoPreview color={game.color}/>,
    dominoes:  <DominoPreview/>,
  }
  return (
    <div style={{
      width:'100%',height:108,display:'flex',alignItems:'center',justifyContent:'center',
      overflow:'hidden',borderRadius:'14px 14px 0 0',flexShrink:0,
      background:`radial-gradient(ellipse at 50% 30%,${game.color}18 0%,transparent 70%)`,
    }}>
      {map[game.id]||<span style={{fontSize:38}}>{game.emoji}</span>}
    </div>
  )
}

// ── Rules Modal ───────────────────────────────────────────────────────────────
const RULES = {
  tictactoe:{ obj:'Get 3 in a row — horizontal, vertical, or diagonal.',
    how:['Players take turns placing X or O.','First to get 3 in a row wins.','All 9 squares filled = Draw.'],
    tips:['Control the center first.','Expert AI plays perfectly — aim for draw!'] },
  sliding:{ obj:'Arrange tiles 1-15 in order, left-to-right top-to-bottom.',
    how:['Tap any tile next to the empty space to slide it.','Arrange all 16 tiles in order.','Use Hint for next optimal move.'],
    tips:['Solve top 2 rows first.','Fewer moves + less time = higher score.'] },
  snakes:{ obj:'First player to reach exactly square 100 wins.',
    how:['Roll dice and move that many squares.','Land on ladder base — climb up!','Land on snake head — slide down!','Must land exactly on 100 to win.'],
    tips:['Pure luck — enjoy the ride!','Overshooting 100 bounces you back.'] },
  checkers:{ obj:'Capture all opponent pieces or block all their moves.',
    how:['Move diagonally forward one square.','Jump over enemy to capture (mandatory!).','Reach far rank to become a King.','Kings move in all 4 diagonal directions.'],
    tips:['Control the center early.','Chain captures in one turn are mandatory.'] },
  ninemens:{ obj:'Reduce opponent to 2 pieces or block all their moves.',
    how:['Phase 1: Place 9 pieces on any intersection.','Mill (3 in a line) = remove one enemy.','Phase 2: Move pieces one step to form new mills.','3 pieces left: jump anywhere on board.'],
    tips:['Double-mills are nearly unbeatable.','Block opponent mills before they form.'] },
  carrom:{ obj:'Pocket all your coins and the queen before opponent.',
    how:['Slide bar to place striker, adjust power & aim.','Drag to aim, tap Strike to fire.','Pocket your coins (white or black).','Pocket queen then immediately cover it.'],
    tips:['Aim at clusters for multiple pockets.','Queen gives 3-point bonus when covered.'] },
  chess:{ obj:'Checkmate the opponent\'s king.',
    how:['Each piece moves uniquely.','Check = king attacked, must escape.','Checkmate = king in check with no escape.','Special moves: castle, en passant, promote.'],
    tips:['Control center in the opening.','Castle early to protect your king.'] },
  ludo:{ obj:'Race all 4 tokens from home base to finish.',
    how:['Roll 6 to bring token out of base.','Move tokens clockwise around the board.','Land on opponent = send them home.','Get all 4 tokens to finish column to win.'],
    tips:['Spread tokens — don\'t bunch them.','Roll 6 = bonus turn always.'] },
  sholoGuti:{ obj:'Capture all 16 enemy pieces.',
    how:['Move one piece along any board line.','Jump over adjacent enemy to capture.','Chain captures allowed in one turn.','Player with pieces remaining wins.'],
    tips:['Protect edge and corner pieces.','Attack from two sides simultaneously.'] },
  dominoes:{ obj:'Empty your hand before opponent to win.',
    how:['Match pip count to either open chain end.','Cannot play? Draw from boneyard.','First player to empty hand wins round.','Score = opponent\'s remaining pip total.'],
    tips:['Block the ends your opponent needs.','Track played numbers to predict draws.'] },
}

function RulesModal({ game, onClose }) {
  const r = RULES[game.id] || { obj:'', how:[], tips:[] }
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',
      zIndex:300,
    }}>
      <div style={{
        background:'#13151f',borderRadius:'22px 22px 0 0',
        padding:'20px 18px 36px',width:'100%',maxWidth:480,
        maxHeight:'84vh',overflowY:'auto',
        borderTop:`2px solid ${game.color}`,
        boxShadow:'0 -16px 60px rgba(0,0,0,0.8)',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:26,filter:`drop-shadow(0 0 10px ${game.color}80)`}}>{game.emoji}</span>
            <span style={{color:'#fff',fontWeight:800,fontSize:17}}>{game.name}</span>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.1)',border:'none',
            color:'#fff',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:12}}>✕</button>
        </div>

        <div style={{background:`${game.color}15`,borderRadius:10,padding:12,marginBottom:10,
          borderLeft:`3px solid ${game.color}`}}>
          <div style={{color:game.color,fontSize:9,fontWeight:700,letterSpacing:1.5,marginBottom:5}}>OBJECTIVE</div>
          <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,lineHeight:1.5}}>{r.obj}</div>
        </div>

        <div style={{background:'rgba(255,255,255,0.04)',borderRadius:10,padding:12,marginBottom:10}}>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:700,letterSpacing:1.5,marginBottom:8}}>HOW TO PLAY</div>
          {r.how.map((s,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:7}}>
              <span style={{color:game.color,fontWeight:800,fontSize:12,minWidth:18}}>{i+1}.</span>
              <span style={{color:'rgba(255,255,255,0.65)',fontSize:13,lineHeight:1.5}}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{background:`${game.color}10`,borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{color:game.color,fontSize:9,fontWeight:700,letterSpacing:1.5,marginBottom:8}}>⚡ PRO TIPS</div>
          {r.tips.map((t,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
              <span style={{color:game.color}}>▸</span>
              <span style={{color:'rgba(255,255,255,0.65)',fontSize:13,lineHeight:1.5}}>{t}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          width:'100%',padding:'13px 0',borderRadius:12,border:'none',
          background:`linear-gradient(135deg,${game.color},${game.color}bb)`,
          color:'#fff',fontWeight:800,fontSize:15,cursor:'pointer',fontFamily:'inherit',
          boxShadow:`0 4px 20px ${game.color}45`,
        }}>Let's Play!</button>
      </div>
    </div>
  )
}

// ── Game Card ─────────────────────────────────────────────────────────────────
function GameCard({ game, isDaily, onClick, onRules }) {
  const [pressed, setPressed] = useState(false)
  const stats = SaveSystem.loadStats(game.id)
  const complexity = game.estimatedMinutes>20?3:game.estimatedMinutes>10?2:1
  const winPct = stats.played>0 ? Math.round(stats.won/stats.played*100) : null

  return (
    <div style={{position:'relative',marginTop:isDaily?16:0}}>
      {isDaily&&(
        <div style={{
          position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',
          background:'linear-gradient(90deg,#f5c842,#e8860a)',
          color:'#000',fontSize:9,fontWeight:800,padding:'3px 12px',
          borderRadius:20,zIndex:5,whiteSpace:'nowrap',letterSpacing:0.5,
          boxShadow:'0 2px 12px rgba(245,200,66,0.5)',
        }}>🔥 TODAY'S PICK</div>
      )}

      <button
        disabled={!game.available}
        onClick={onClick}
        onPointerDown={()=>setPressed(true)}
        onPointerUp={()=>setPressed(false)}
        onPointerLeave={()=>setPressed(false)}
        style={{
          width:'100%',display:'flex',flexDirection:'column',
          borderRadius:14,overflow:'hidden',padding:0,border:'none',
          background:'#13151f',
          outline:isDaily?`2px solid ${game.color}`:'2px solid transparent',
          boxShadow:isDaily?`0 0 0 1px ${game.color}40,0 8px 32px rgba(0,0,0,0.5)`:'0 4px 20px rgba(0,0,0,0.35)',
          transform:pressed?'scale(0.96)':'scale(1)',
          transition:'transform 0.12s,box-shadow 0.2s',
          cursor:game.available?'pointer':'default',
          opacity:game.available?1:0.45,
        }}>

        {/* Info btn */}
        <button onClick={e=>{e.stopPropagation();onRules(game)}} style={{
          position:'absolute',top:7,right:7,zIndex:4,width:22,height:22,
          borderRadius:'50%',background:'rgba(0,0,0,0.55)',
          border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.75)',
          fontSize:11,fontWeight:700,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>ⓘ</button>

        {/* Complexity dots */}
        <div style={{position:'absolute',top:8,left:8,display:'flex',gap:3,zIndex:4}}>
          {[1,2,3].map(d=>(
            <div key={d} style={{width:5,height:5,borderRadius:'50%',
              background:d<=complexity?game.color:'rgba(255,255,255,0.15)',
              boxShadow:d<=complexity?`0 0 5px ${game.color}`:'none'}}/>
          ))}
        </div>

        <BoardPreview game={game}/>

        {/* Color strip */}
        <div style={{height:2,background:`linear-gradient(90deg,${game.color},${game.color}50,transparent)`}}/>

        {/* Card body */}
        <div style={{padding:'10px 11px 12px',textAlign:'left',background:'#13151f'}}>
          <div style={{color:'#fff',fontWeight:800,fontSize:13.5,marginBottom:3,letterSpacing:-0.2}}>
            {game.name}
          </div>
          <div style={{color:'rgba(255,255,255,0.38)',fontSize:10.5,lineHeight:1.4,marginBottom:7}}>
            {game.description.slice(0,48)}{game.description.length>48?'…':''}
          </div>

          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:6}}>
            {game.tags.slice(0,2).map(t=>(
              <span key={t} style={{
                fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:700,
                background:`${TAG_COLORS[t]||game.color}22`,
                color:TAG_COLORS[t]||game.color,
                border:`1px solid ${TAG_COLORS[t]||game.color}40`,
                letterSpacing:0.4,textTransform:'uppercase',
              }}>{t}</span>
            ))}
          </div>

          {stats.played>0 ? (
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.38)'}}>
                🏆{stats.won}W / {stats.played}P
              </span>
              {winPct!==null&&<span style={{fontSize:10,color:game.color,fontWeight:700}}>{winPct}%</span>}
            </div>
          ) : (
            <div style={{fontSize:10,color:game.color,fontWeight:700,opacity:0.8}}>
              ▶ Tap to play
            </div>
          )}
        </div>
      </button>
    </div>
  )
}

// ── Main HomeScreen ───────────────────────────────────────────────────────────
export default function HomeScreen({ onSelectGame, onOpenSettings }) {
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [rulesGame, setRulesGame] = useState(null)
  const [tipIdx,    setTipIdx]    = useState(0)
  const [mounted,   setMounted]   = useState(false)
  const daily = getDailyGame()

  useEffect(()=>{
    setTimeout(()=>setMounted(true),60)
    const t=setInterval(()=>setTipIdx(i=>(i+1)%TIPS.length),4500)
    return()=>clearInterval(t)
  },[])

  const tags = ['all','quick','strategy','puzzle','dice','family','physics','classic']

  const filtered = GAMES.filter(g=>{
    const ms = g.name.toLowerCase().includes(search.toLowerCase())||
               g.tags.some(t=>t.includes(search.toLowerCase()))
    const mt = filter==='all' || g.tags.includes(filter)
    return ms && mt
  })

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',
      overflow:'hidden',background:'#0a0b14'}}>

      {/* Hero */}
      <div style={{
        padding:'16px 16px 12px',flexShrink:0,
        background:'linear-gradient(160deg,rgba(99,102,241,0.14) 0%,rgba(10,11,20,0) 60%)',
        borderBottom:'1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:9,letterSpacing:2.5,color:'rgba(255,255,255,0.3)',fontWeight:700,marginBottom:5}}>
              🎮 CLASSIC BOARD GAMES
            </div>
            <h1 style={{color:'#fff',fontSize:27,fontWeight:900,margin:'0 0 3px',lineHeight:1.1,letterSpacing:-0.8}}>
              Play.{' '}
              <span style={{background:'linear-gradient(90deg,#f5c842,#e8860a)',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Win.</span>
              {' '}Repeat.
            </h1>
            <p style={{color:'rgba(255,255,255,0.3)',fontSize:11.5,margin:0}}>
              {GAMES.filter(g=>g.available).length} games · Offline · No ads
            </p>
          </div>
          <button onClick={()=>{audioEngine.play('ui_open');onOpenSettings()}} style={{
            background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',
            color:'#fff',fontSize:19,width:40,height:40,borderRadius:11,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
          }}>⚙️</button>
        </div>
        <div style={{display:'inline-block',fontSize:9,color:'rgba(255,255,255,0.2)',
          background:'rgba(255,255,255,0.05)',padding:'2px 8px',borderRadius:8,
          border:'1px solid rgba(255,255,255,0.08)',marginTop:8}}>{VERSION_LABEL}</div>
      </div>

      {/* Tip ticker */}
      <div style={{padding:'5px 14px',background:'rgba(255,255,255,0.025)',
        borderBottom:'1px solid rgba(255,255,255,0.04)',
        display:'flex',alignItems:'center',gap:6,flexShrink:0,minHeight:28}}>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.2)'}}>💡</span>
        <span key={tipIdx} style={{color:'rgba(255,255,255,0.38)',fontSize:10.5,fontStyle:'italic',
          animation:'homeFadeIn 0.5s ease'}}>{TIPS[tipIdx]}</span>
      </div>

      {/* Search */}
      <div style={{padding:'8px 14px 0',flexShrink:0}}>
        <div style={{position:'relative'}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
            fontSize:13,opacity:0.3}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search games…" style={{
              width:'100%',padding:'9px 12px 9px 34px',borderRadius:11,
              background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',
              color:'#fff',fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'inherit',
            }}/>
        </div>
      </div>

      {/* Tag filters */}
      <div style={{display:'flex',gap:5,padding:'8px 14px',overflowX:'auto',
        scrollbarWidth:'none',flexShrink:0}}>
        {tags.map(t=>(
          <button key={t} onClick={()=>{audioEngine.play('ui_click');setFilter(t)}} style={{
            padding:'5px 12px',borderRadius:20,fontSize:10,cursor:'pointer',
            whiteSpace:'nowrap',fontWeight:filter===t?700:500,flexShrink:0,
            letterSpacing:0.3,transition:'all 0.15s',fontFamily:'inherit',
            background:filter===t?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.05)',
            border:`1px solid ${filter===t?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.09)'}`,
            color:filter===t?'#fff':'rgba(255,255,255,0.4)',
          }}>{t==='all'?'✦ All':t}</button>
        ))}
      </div>

      {/* Game grid */}
      <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(2,1fr)',
        gap:10,padding:'4px 12px 16px',overflowY:'auto',alignContent:'start'}}>
        {filtered.map((game,idx)=>(
          <div key={game.id} style={{
            opacity:mounted?1:0,
            transform:mounted?'translateY(0)':'translateY(16px)',
            transition:`opacity 0.28s ${idx*0.045}s ease,transform 0.28s ${idx*0.045}s ease`,
          }}>
            <GameCard
              game={game}
              isDaily={daily.id===game.id&&!search&&filter==='all'}
              onClick={()=>{audioEngine.play('ui_confirm');onSelectGame(game)}}
              onRules={setRulesGame}
            />
          </div>
        ))}
        {filtered.length===0&&(
          <div style={{gridColumn:'1/-1',textAlign:'center',
            color:'rgba(255,255,255,0.2)',padding:48,fontSize:13}}>
            No games found for "{search}"
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{textAlign:'center',color:'rgba(255,255,255,0.12)',fontSize:10,
        padding:'6px 0 10px',borderTop:'1px solid rgba(255,255,255,0.04)',flexShrink:0}}>
        {GAMES.filter(g=>g.available).length} games · Made offline with ❤️
      </div>

      {rulesGame&&<RulesModal game={rulesGame} onClose={()=>setRulesGame(null)}/>}

      <style>{`
        @keyframes homeFadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{display:none}
        input::placeholder{color:rgba(255,255,255,0.28)}
      `}</style>
    </div>
  )
}
