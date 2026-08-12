import { useState, useEffect } from 'react'
import { GAMES } from '../core/GameRegistry.js'
import { SaveSystem } from '../core/SaveSystem.js'
import { VERSION_LABEL } from '../core/Version.js'
import { audioEngine } from '../core/AudioEngine.js'

// ─── Mini Board Previews ──────────────────────────────────────────────────────
function TicTacToePreview() {
  const board = ['O','X','X','','O','X','O','','']
  return (
    <svg viewBox="0 0 90 90" width="80" height="80">
      <line x1="30" y1="5" x2="30" y2="85" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <line x1="60" y1="5" x2="60" y2="85" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <line x1="5" y1="30" x2="85" y2="30" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <line x1="5" y1="60" x2="85" y2="60" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      {board.map((v,i) => {
        const x = (i%3)*30+15, y = Math.floor(i/3)*30+15
        if (v==='O') return <circle key={i} cx={x} cy={y} r="9" fill="none" stroke="#e94560" strokeWidth="2.5"/>
        if (v==='X') return <g key={i}>
          <line x1={x-8} y1={y-8} x2={x+8} y2={y+8} stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1={x+8} y1={y-8} x2={x-8} y2={y+8} stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round"/>
        </g>
        return null
      })}
    </svg>
  )
}

function ChessPreview() {
  const pieces = [
    {p:'♜',x:5,y:5,c:'#ccc'},{p:'♚',x:35,y:5,c:'#ccc'},{p:'♛',x:65,y:5,c:'#ccc'},
    {p:'♟',x:5,y:30,c:'#aaa'},{p:'♟',x:35,y:30,c:'#aaa'},{p:'♟',x:65,y:30,c:'#aaa'},
    {p:'♙',x:5,y:55,c:'#fff'},{p:'♙',x:35,y:55,c:'#fff'},{p:'♙',x:65,y:55,c:'#fff'},
    {p:'♔',x:5,y:78,c:'#fff'},{p:'♕',x:35,y:78,c:'#fff'},{p:'♖',x:65,y:78,c:'#fff'},
  ]
  return (
    <svg viewBox="0 0 90 90" width="84" height="84">
      {[0,1,2,3].map(r=>[0,1,2,3].map(c=>(
        <rect key={`${r}${c}`} x={c*22} y={r*22} width="22" height="22"
          fill={(r+c)%2===0?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.25)'}/>
      )))}
      {pieces.map((p,i)=>(
        <text key={i} x={p.x} y={p.y+14} fontSize="16" fill={p.c} opacity="0.9">{p.p}</text>
      ))}
    </svg>
  )
}

function CheckersPreview() {
  const whites = [[0,0],[2,0],[1,1],[0,2],[2,2]]
  const blacks = [[1,3],[0,4],[2,4],[1,5]]
  return (
    <svg viewBox="0 0 90 90" width="84" height="84">
      {[0,1,2,3,4,5].map(r=>[0,1,2].map(c=>(
        <rect key={`${r}${c}`} x={c*30} y={r*15} width="30" height="15"
          fill={(r+c)%2===0?'rgba(156,39,176,0.25)':'rgba(0,0,0,0.3)'}/>
      )))}
      {whites.map(([c,r],i)=>(
        <circle key={`w${i}`} cx={c*30+15} cy={r*15+7.5} r="6"
          fill="#eee" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      ))}
      {blacks.map(([c,r],i)=>(
        <circle key={`b${i}`} cx={c*30+15} cy={r*15+7.5} r="6"
          fill="#222" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      ))}
    </svg>
  )
}

function SlidingPreview() {
  const tiles = [1,2,3,4,5,6,7,null,8,10,11,12,9,13,14,15]
  return (
    <svg viewBox="0 0 88 88" width="82" height="82">
      {tiles.map((t,i)=>{
        const x=(i%4)*22, y=Math.floor(i/4)*22
        if(!t) return null
        const correct = t===i+1
        return (
          <g key={i}>
            <rect x={x+1} y={y+1} width="20" height="20" rx="4"
              fill={correct?'rgba(245,166,35,0.4)':'rgba(255,255,255,0.1)'}
              stroke={correct?'rgba(245,166,35,0.6)':'rgba(255,255,255,0.15)'} strokeWidth="1"/>
            <text x={x+11} y={y+15} textAnchor="middle" fontSize="10" fontWeight="700"
              fill={correct?'#f5a623':'rgba(255,255,255,0.7)'}>{t}</text>
          </g>
        )
      })}
    </svg>
  )
}

function SnakesPreview() {
  return (
    <svg viewBox="0 0 90 90" width="84" height="84">
      {[0,1,2,3,4].map(r=>[0,1,2,3,4].map(c=>(
        <rect key={`${r}${c}`} x={c*18} y={r*18} width="18" height="18"
          fill={(r+c)%2===0?'rgba(76,175,80,0.2)':'rgba(76,175,80,0.08)'}
          stroke="rgba(76,175,80,0.1)" strokeWidth="0.5"/>
      )))}
      {/* Snake body */}
      <path d="M9 9 Q45 9 45 45 Q45 81 81 81" fill="none" stroke="#4caf50" strokeWidth="6" strokeLinecap="round" opacity="0.7"/>
      {/* Ladder */}
      <line x1="27" y1="63" x2="63" y2="27" stroke="#ff9800" strokeWidth="2.5" opacity="0.8"/>
      <line x1="33" y1="63" x2="69" y2="27" stroke="#ff9800" strokeWidth="2.5" opacity="0.8"/>
      <line x1="33" y1="51" x2="45" y2="39" stroke="#ff9800" strokeWidth="1.5" opacity="0.7"/>
      {/* Player token */}
      <circle cx="9" cy="81" r="6" fill="#2196f3"/>
    </svg>
  )
}

function LudoPreview() {
  const colors = ['#2196f3','#f44336','#ffeb3b','#4caf50']
  const positions = [[10,10],[50,10],[10,50],[50,50]]
  return (
    <svg viewBox="0 0 90 90" width="84" height="84">
      {colors.map((c,i)=>(
        <rect key={i} x={positions[i][0]} y={positions[i][1]} width="28" height="28"
          rx="5" fill={`${c}30`} stroke={`${c}60`} strokeWidth="1.5"/>
      ))}
      {colors.map((c,i)=>(
        <circle key={`p${i}`} cx={positions[i][0]+14} cy={positions[i][1]+14} r="7"
          fill={c} opacity="0.85"/>
      ))}
      <rect x="34" y="34" width="22" height="22" rx="3" fill="rgba(255,255,255,0.08)"/>
      <polygon points="45,37 50,47 40,47" fill="rgba(255,255,255,0.4)"/>
    </svg>
  )
}

function CarromPreview() {
  const whites = [[30,20],[50,20],[20,45],[60,45],[30,65],[50,65]]
  const blacks = [[20,25],[60,25],[45,40],[25,55],[55,55],[40,70]]
  return (
    <svg viewBox="0 0 90 90" width="84" height="84">
      <rect x="4" y="4" width="82" height="82" rx="6" fill="rgba(160,100,40,0.3)" stroke="rgba(255,152,0,0.4)" strokeWidth="2"/>
      <rect x="10" y="10" width="70" height="70" rx="4" fill="rgba(160,100,40,0.15)" stroke="rgba(255,152,0,0.2)" strokeWidth="1"/>
      <circle cx="45" cy="45" r="20" fill="none" stroke="rgba(255,152,0,0.25)" strokeWidth="1"/>
      {whites.map(([x,y],i)=>(
        <circle key={`w${i}`} cx={x} cy={y} r="5.5" fill="rgba(240,240,220,0.85)" stroke="rgba(200,200,180,0.5)" strokeWidth="0.8"/>
      ))}
      {blacks.map(([x,y],i)=>(
        <circle key={`b${i}`} cx={x} cy={y} r="5.5" fill="rgba(40,40,40,0.85)" stroke="rgba(80,80,80,0.5)" strokeWidth="0.8"/>
      ))}
      <circle cx="45" cy="45" r="5" fill="#e53935" opacity="0.9"/>
    </svg>
  )
}

function MorrisPreview() {
  const whites = [[5,5],[45,5],[85,5],[5,45]]
  const blacks = [[85,45],[5,85],[45,85],[85,85],[25,25],[45,25],[65,25]]
  return (
    <svg viewBox="0 0 90 90" width="82" height="82">
      <rect x="3" y="3" width="84" height="84" fill="none" stroke="rgba(121,85,72,0.6)" strokeWidth="1.5"/>
      <rect x="20" y="20" width="50" height="50" fill="none" stroke="rgba(121,85,72,0.6)" strokeWidth="1.5"/>
      <rect x="37" y="37" width="16" height="16" fill="none" stroke="rgba(121,85,72,0.6)" strokeWidth="1.5"/>
      <line x1="45" y1="3" x2="45" y2="37" stroke="rgba(121,85,72,0.5)" strokeWidth="1.5"/>
      <line x1="45" y1="53" x2="45" y2="87" stroke="rgba(121,85,72,0.5)" strokeWidth="1.5"/>
      <line x1="3" y1="45" x2="37" y2="45" stroke="rgba(121,85,72,0.5)" strokeWidth="1.5"/>
      <line x1="53" y1="45" x2="87" y2="45" stroke="rgba(121,85,72,0.5)" strokeWidth="1.5"/>
      {whites.map(([x,y],i)=><circle key={`w${i}`} cx={x} cy={y} r="5" fill="#fff" opacity="0.9"/>)}
      {blacks.map(([x,y],i)=><circle key={`b${i}`} cx={x} cy={y} r="5" fill="#333" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>)}
    </svg>
  )
}

function SholoGutiPreview() {
  const reds=[[5,5],[25,5],[45,5],[65,5],[5,25],[65,25],[5,45],[65,45],[5,65],[65,65]]
  const blues=[[25,45],[45,45],[25,65],[45,65],[25,85],[45,85],[5,85],[65,85]]
  return (
    <svg viewBox="0 0 80 90" width="74" height="84">
      {[0,1,2,3].map(r=>[0,1,2,3].map(c=>{
        const x=5+c*20, y=5+r*20
        return <g key={`${r}${c}`}>
          <line x1={x} y1={y} x2={x+20} y2={y} stroke="rgba(255,193,7,0.3)" strokeWidth="1"/>
          <line x1={x} y1={y} x2={x} y2={y+20} stroke="rgba(255,193,7,0.3)" strokeWidth="1"/>
          <line x1={x} y1={y} x2={x+20} y2={y+20} stroke="rgba(255,193,7,0.2)" strokeWidth="0.8"/>
        </g>
      }))}
      {reds.map(([x,y],i)=><circle key={`r${i}`} cx={x} cy={y} r="5" fill="#e53935" opacity="0.85"/>)}
      {blues.map(([x,y],i)=><circle key={`b${i}`} cx={x} cy={y} r="5" fill="#1976d2" opacity="0.85"/>)}
    </svg>
  )
}

function DominoesPreview() {
  function Tile({x,y,a,b,rot=0}) {
    const cx=x+12, cy=y+24
    return (
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        <rect x={x} y={y} width="24" height="48" rx="4" fill="#f5f5f0" stroke="#ccc" strokeWidth="1"/>
        <line x1={x} y1={y+24} x2={x+24} y2={y+24} stroke="#999" strokeWidth="1"/>
        {[...Array(a)].map((_,i)=><circle key={`a${i}`} cx={x+8+(i%2)*8} cy={y+8+Math.floor(i/2)*6} r="2.5" fill="#333"/>)}
        {[...Array(b)].map((_,i)=><circle key={`b${i}`} cx={x+8+(i%2)*8} cy={y+28+Math.floor(i/2)*6} r="2.5" fill="#333"/>)}
      </g>
    )
  }
  return (
    <svg viewBox="0 0 90 90" width="84" height="84">
      <Tile x={5} y={15} a={2} b={3}/>
      <Tile x={35} y={10} a={1} b={4} rot={-10}/>
      <Tile x={62} y={18} a={3} b={2} rot={8}/>
    </svg>
  )
}

function BoardPreview({ game }) {
  const previews = {
    tictactoe: <TicTacToePreview/>,
    chess: <ChessPreview/>,
    checkers: <CheckersPreview/>,
    sliding: <SlidingPreview/>,
    snakes: <SnakesPreview/>,
    ludo: <LudoPreview/>,
    carrom: <CarromPreview/>,
    ninemens: <MorrisPreview/>,
    sholoGuti: <SholoGutiPreview/>,
    dominoes: <DominoesPreview/>,
  }
  return (
    <div style={{
      width:'100%', height:110,
      background:`radial-gradient(ellipse at 50% 30%, ${game.color}18 0%, transparent 70%)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      borderRadius:'14px 14px 0 0', overflow:'hidden', flexShrink:0
    }}>
      {previews[game.id] || <span style={{fontSize:36}}>{game.emoji}</span>}
    </div>
  )
}

// ─── Rules data ───────────────────────────────────────────────────────────────
const RULES = {
  tictactoe:{ obj:'Get 3 in a row — horizontal, vertical, or diagonal.', how:['Players alternate placing X or O.','First to get 3 in a row wins.','Board full with no winner = Draw.'], tips:['Control the center on move 1.','Expert AI is unbeatable — aim for draw!'] },
  sliding:{ obj:'Arrange tiles 1–15 in order, left-to-right top-to-bottom.', how:['Tap any tile next to the empty space to slide it.','Arrange 1 to 15 in order.','Use Hint for the next optimal move.'], tips:['Solve top two rows first.','Fewer moves + less time = higher score.'] },
  snakes:{ obj:'First player to reach exactly square 100 wins.', how:['Roll the dice and move that many squares.','Land on ladder base — climb up!','Land on snake head — slide down!','Must land exactly on 100 to win.'], tips:['Pure luck — enjoy the ride!','Overshooting 100 bounces you back.'] },
  checkers:{ obj:'Capture all opponent pieces or block them from moving.', how:['Move diagonally forward one square.','Jump over enemy to capture it.','Captures are mandatory.','Reach far rank to become a King.'], tips:['Control the center early.','Chain jumps in one turn are mandatory.'] },
  ninemens:{ obj:'Reduce opponent to fewer than 3 pieces or block all moves.', how:['Place your 9 pieces on any intersection.','A mill (3 in a line) removes one enemy.','Move one step along lines to form mills.','3 pieces left: jump anywhere.'], tips:['Create double mills for power.','Block opponent mills early.'] },
  carrom:{ obj:'Pocket all your coins and cover the queen first.', how:['Slide position bar to place striker.','Drag to aim, tap Strike! to shoot.','Pocket your color coins.','Pocket queen then cover it immediately.'], tips:['Aim at clusters for multiple pockets.','Queen gives 3-point bonus.'] },
  chess:{ obj:'Checkmate the opponent\'s king.', how:['Each piece moves uniquely.','Check = king is attacked — must escape.','Checkmate = no legal escape = game over.','Special moves: castling, en passant.'], tips:['Control center in the opening.','Develop all pieces before attacking.'] },
  ludo:{ obj:'Race all 4 tokens from home base to finish first.', how:['Roll a 6 to bring a token out.','Move tokens clockwise around the board.','Land on opponent = send them home.','Get all 4 tokens to the finish lane.'], tips:['Spread tokens to avoid mass cuts.','A 6 always gives an extra roll.'] },
  sholoGuti:{ obj:'Capture all 16 enemy pieces.', how:['Move along any board line.','Jump over adjacent enemy to capture.','Chain captures allowed in one turn.','Player with pieces remaining wins.'], tips:['Protect edge and corner pieces.','Attack from two sides simultaneously.'] },
  dominoes:{ obj:'Empty your hand before opponent to win.', how:['Match pip count to either open chain end.','If unable to play, draw from boneyard.','Empty hand first wins the round.','Score = sum of opponent\'s remaining pips.'], tips:['Block ends your opponent needs.','Track played numbers to predict draws.'] },
}

function getDailyGame() {
  const available = GAMES.filter(g=>g.available)
  return available[Math.floor(Date.now()/86400000) % available.length]
}

const TIPS = [
  '♟ Chess: Control the center in the opening',
  '🎲 Ludo: Roll 6 for an extra turn',
  '⭕ Tic Tac Toe: Center square wins games',
  '🐍 Snakes: Overshooting 100 bounces you back',
  '🔢 Sliding Puzzle: Solve top rows first',
  '🎱 Carrom: Pocket queen then cover immediately',
  '⬛ Morris: Double-mills are unstoppable',
  '🔴 Checkers: All captures are mandatory',
  '🟡 16 Goti: Chain captures win games',
  '🁢 Dominoes: Block the ends opponent needs',
]

const TAG_COLORS = {
  quick:'#e94560',strategy:'#9c27b0',puzzle:'#f5a623',dice:'#ff9800',
  family:'#4caf50',physics:'#03a9f4',classic:'#795548',brain:'#00bcd4',
  capture:'#f44336',solo:'#607d8b',luck:'#ff5722',deep:'#455a64',
  mill:'#6d4c41',skill:'#ff6f00',tiles:'#78909c',race:'#e91e63'
}

function RulesModal({ game, onClose }) {
  const r = RULES[game.id]
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',
      zIndex:300,padding:'0 0'
    }}>
      <div style={{
        background:'#13151f',borderRadius:'22px 22px 0 0',
        padding:'20px 20px 36px',width:'100%',maxWidth:480,
        maxHeight:'82vh',overflowY:'auto',
        borderTop:`2px solid ${game.color}`,
        boxShadow:'0 -20px 60px rgba(0,0,0,0.8)'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:26}}>{game.emoji}</span>
            <span style={{color:'#fff',fontWeight:800,fontSize:17}}>{game.name}</span>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',
            width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:12
          }}>✕</button>
        </div>
        <div style={{background:`${game.color}15`,borderRadius:10,padding:12,marginBottom:10,borderLeft:`3px solid ${game.color}`}}>
          <div style={{color:game.color,fontSize:9,fontWeight:700,letterSpacing:1.5,marginBottom:5}}>OBJECTIVE</div>
          <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,lineHeight:1.5}}>{r?.obj}</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.04)',borderRadius:10,padding:12,marginBottom:10}}>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:700,letterSpacing:1.5,marginBottom:8}}>HOW TO PLAY</div>
          {r?.how.map((s,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:7}}>
              <span style={{color:game.color,fontWeight:800,fontSize:12,minWidth:18}}>{i+1}.</span>
              <span style={{color:'rgba(255,255,255,0.65)',fontSize:13,lineHeight:1.5}}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{background:`${game.color}10`,borderRadius:10,padding:12}}>
          <div style={{color:game.color,fontSize:9,fontWeight:700,letterSpacing:1.5,marginBottom:8}}>⚡ PRO TIPS</div>
          {r?.tips.map((t,i)=>(
            <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
              <span style={{color:game.color}}>▸</span>
              <span style={{color:'rgba(255,255,255,0.65)',fontSize:13,lineHeight:1.5}}>{t}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          marginTop:16,width:'100%',padding:'13px 0',borderRadius:12,border:'none',
          background:`linear-gradient(135deg,${game.color},${game.color}bb)`,
          color:'#fff',fontWeight:800,fontSize:15,cursor:'pointer',
          boxShadow:`0 4px 20px ${game.color}50`
        }}>Let's Play!</button>
      </div>
    </div>
  )
}

function GameCard({ game, onClick, isDaily, onRules }) {
  const stats = SaveSystem.loadStats(game.id)
  const [pressed, setPressed] = useState(false)
  const winPct = stats.played>0 ? Math.round(stats.won/stats.played*100) : null
  const complexity = game.estimatedMinutes>20?3:game.estimatedMinutes>10?2:1

  return (
    <div style={{position:'relative',marginTop: isDaily?14:0}}>
      {isDaily&&(
        <div style={{
          position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',
          background:'linear-gradient(90deg,#f5c842,#e8860a)',
          color:'#000',fontSize:9,fontWeight:800,padding:'3px 12px',
          borderRadius:20,zIndex:5,whiteSpace:'nowrap',letterSpacing:0.5,
          boxShadow:'0 2px 12px rgba(245,200,66,0.5)'
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
          outline: isDaily?`2px solid ${game.color}`:'2px solid transparent',
          boxShadow: isDaily
            ?`0 0 0 1px ${game.color}40, 0 8px 32px rgba(0,0,0,0.5)`
            :'0 4px 20px rgba(0,0,0,0.4)',
          transform: pressed?'scale(0.97)':'scale(1)',
          transition:'transform 0.12s, box-shadow 0.2s',
          cursor: game.available?'pointer':'default',
          opacity: game.available?1:0.45,
          position:'relative',
        }}>

        {/* Info button */}
        <button onClick={e=>{e.stopPropagation();onRules(game)}} style={{
          position:'absolute',top:7,right:7,zIndex:4,
          width:22,height:22,borderRadius:'50%',
          background:'rgba(0,0,0,0.55)',border:'1px solid rgba(255,255,255,0.2)',
          color:'rgba(255,255,255,0.75)',fontSize:11,fontWeight:700,
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
          backdropFilter:'blur(4px)'
        }}>ⓘ</button>

        {/* Complexity dots */}
        <div style={{position:'absolute',top:8,left:8,display:'flex',gap:3,zIndex:4}}>
          {[1,2,3].map(d=>(
            <div key={d} style={{
              width:5,height:5,borderRadius:'50%',
              background:d<=complexity?game.color:'rgba(255,255,255,0.15)',
              boxShadow:d<=complexity?`0 0 6px ${game.color}`:'none'
            }}/>
          ))}
        </div>

        {/* Board Preview */}
        <BoardPreview game={game}/>

        {/* Thin color strip */}
        <div style={{height:2,background:`linear-gradient(90deg,${game.color},${game.color}44,transparent)`}}/>

        {/* Card body */}
        <div style={{padding:'10px 11px 12px',textAlign:'left',background:'#13151f'}}>
          <div style={{
            color:'#fff',fontWeight:800,fontSize:13.5,
            marginBottom:3,letterSpacing:-0.2,lineHeight:1.2
          }}>{game.name}</div>
          <div style={{
            color:'rgba(255,255,255,0.38)',fontSize:10.5,lineHeight:1.4,marginBottom:7
          }}>{game.description.slice(0,48)}{game.description.length>48?'…':''}</div>

          {/* Tags */}
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:6}}>
            {game.tags.slice(0,2).map(t=>(
              <span key={t} style={{
                fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:700,
                background:`${TAG_COLORS[t]||game.color}22`,
                color:TAG_COLORS[t]||game.color,
                border:`1px solid ${TAG_COLORS[t]||game.color}40`,
                letterSpacing:0.4,textTransform:'uppercase'
              }}>{t}</span>
            ))}
            {game.comingSoon&&(
              <span style={{fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:700,
                background:'rgba(255,165,0,0.15)',color:'#ffa500',
                border:'1px solid rgba(255,165,0,0.3)',letterSpacing:0.4}}>SOON</span>
            )}
          </div>

          {/* Stats OR Play prompt */}
          {stats.played>0 ? (
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>🏆 {stats.won}W / {stats.played}P</span>
              {winPct!==null&&<span style={{fontSize:10,color:game.color,fontWeight:700}}>{winPct}%</span>}
            </div>
          ) : (
            <div style={{
              fontSize:10,color:game.color,fontWeight:700,letterSpacing:0.3,
              display:'flex',alignItems:'center',gap:4,opacity:0.8
            }}>▶ Tap to play</div>
          )}
        </div>
      </button>
    </div>
  )
}

export default function HomeScreen({ onSelectGame, onOpenSettings }) {
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [rulesGame, setRulesGame] = useState(null)
  const [tipIdx, setTipIdx]       = useState(0)
  const [mounted, setMounted]     = useState(false)

  const daily = getDailyGame()

  useEffect(() => {
    const id = setTimeout(()=>setMounted(true), 60)
    const t  = setInterval(()=>setTipIdx(i=>(i+1)%TIPS.length), 4500)
    return ()=>{ clearTimeout(id); clearInterval(t) }
  }, [])

  const tags = ['all','quick','strategy','puzzle','dice','family','physics','classic']

  const filtered = GAMES.filter(g => {
    const ms = g.name.toLowerCase().includes(search.toLowerCase()) ||
               g.tags.some(t=>t.includes(search.toLowerCase()))
    const mt = filter==='all' || g.tags.includes(filter)
    return ms && mt
  })

  return (
    <div style={{
      display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',
      background:'#0a0b14'
    }}>

      {/* ── Hero ── */}
      <div style={{
        padding:'16px 16px 12px',flexShrink:0,
        background:'linear-gradient(160deg,rgba(99,102,241,0.15) 0%,rgba(10,11,20,0) 60%)',
        borderBottom:'1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontSize:9,letterSpacing:2.5,color:'rgba(255,255,255,0.3)',fontWeight:700,marginBottom:5}}>
              🎮 CLASSIC BOARD GAMES
            </div>
            <h1 style={{
              color:'#fff',fontSize:28,fontWeight:900,margin:'0 0 3px',
              lineHeight:1.1,letterSpacing:-1
            }}>
              Play.{' '}
              <span style={{
                background:'linear-gradient(90deg,#f5c842 0%,#e8860a 100%)',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'
              }}>Win.</span>
              {' '}Repeat.
            </h1>
            <p style={{color:'rgba(255,255,255,0.3)',fontSize:11.5,margin:0}}>
              {GAMES.filter(g=>g.available).length} games · Offline · No ads
            </p>
          </div>
          <button onClick={()=>{audioEngine.play('ui_open');onOpenSettings()}} style={{
            background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',
            color:'#fff',fontSize:19,width:40,height:40,borderRadius:11,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
          }}>⚙️</button>
        </div>
        <div style={{
          display:'inline-block',fontSize:9,color:'rgba(255,255,255,0.2)',
          background:'rgba(255,255,255,0.05)',padding:'2px 8px',borderRadius:8,
          border:'1px solid rgba(255,255,255,0.08)',marginTop:8
        }}>{VERSION_LABEL}</div>
      </div>

      {/* ── Tip Ticker ── */}
      <div style={{
        padding:'5px 14px',background:'rgba(255,255,255,0.025)',
        borderBottom:'1px solid rgba(255,255,255,0.04)',
        display:'flex',alignItems:'center',gap:6,flexShrink:0,minHeight:28
      }}>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.2)'}}>💡</span>
        <span key={tipIdx} style={{
          color:'rgba(255,255,255,0.38)',fontSize:10.5,fontStyle:'italic',
          animation:'fadein 0.5s ease'
        }}>{TIPS[tipIdx]}</span>
      </div>

      {/* ── Search ── */}
      <div style={{padding:'8px 14px 0',flexShrink:0}}>
        <div style={{position:'relative'}}>
          <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
            fontSize:13,opacity:0.35}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search games…" style={{
              width:'100%',padding:'9px 12px 9px 34px',borderRadius:11,
              background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',
              color:'#fff',fontSize:14,outline:'none',boxSizing:'border-box'
            }}/>
        </div>
      </div>

      {/* ── Tag Filters ── */}
      <div style={{
        display:'flex',gap:5,padding:'8px 14px',overflowX:'auto',
        scrollbarWidth:'none',flexShrink:0
      }}>
        {tags.map(t=>(
          <button key={t} onClick={()=>{audioEngine.play('ui_click');setFilter(t)}} style={{
            padding:'5px 12px',borderRadius:20,fontSize:10,cursor:'pointer',
            whiteSpace:'nowrap',fontWeight:filter===t?700:500,flexShrink:0,
            letterSpacing:0.3,transition:'all 0.15s',
            background:filter===t?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.05)',
            border:`1px solid ${filter===t?'rgba(255,255,255,0.45)':'rgba(255,255,255,0.09)'}`,
            color:filter===t?'#fff':'rgba(255,255,255,0.4)'
          }}>{t==='all'?'✦ All':t}</button>
        ))}
      </div>

      {/* ── Game Grid ── */}
      <div style={{
        flex:1,display:'grid',gridTemplateColumns:'repeat(2,1fr)',
        gap:10,padding:'4px 12px 16px',overflowY:'auto',alignContent:'start'
      }}>
        {filtered.map((game,idx)=>(
          <div key={game.id} style={{
            opacity:mounted?1:0,
            transform:mounted?'translateY(0)':'translateY(16px)',
            transition:`opacity 0.28s ${idx*0.045}s ease, transform 0.28s ${idx*0.045}s ease`
          }}>
            <GameCard
              game={game}
              isDaily={daily.id===game.id && !search && filter==='all'}
              onClick={()=>{audioEngine.play('ui_confirm');onSelectGame(game)}}
              onRules={setRulesGame}
            />
          </div>
        ))}
        {filtered.length===0&&(
          <div style={{gridColumn:'1/-1',textAlign:'center',
            color:'rgba(255,255,255,0.22)',padding:48,fontSize:13}}>
            No games found for "{search}"
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        textAlign:'center',color:'rgba(255,255,255,0.13)',fontSize:10,
        padding:'6px 0 10px',borderTop:'1px solid rgba(255,255,255,0.04)',flexShrink:0
      }}>
        {GAMES.filter(g=>g.available).length} games ready · Made offline with ❤️
      </div>

      {rulesGame&&<RulesModal game={rulesGame} onClose={()=>setRulesGame(null)}/>}
    </div>
  )
}
