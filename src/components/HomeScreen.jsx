import { useState, useEffect, useRef } from 'react'
import { GAMES } from '../core/GameRegistry.js'
import { SaveSystem } from '../core/SaveSystem.js'
import { VERSION_LABEL } from '../core/Version.js'
import { audioEngine } from '../core/AudioEngine.js'

// ─── Mini board preview renderers ────────────────────────────────────────────
function BoardPreview({ game }) {
  const map = {
    tictactoe:  <TicTacToePreview />,
    sliding:    <SlidingPreview />,
    snakes:     <SnakesPreview />,
    checkers:   <CheckersPreview />,
    ninemens:   <MorrisPreview />,
    carrom:     <CarromPreview />,
    chess:      <ChessPreview />,
    ludo:       <LudoPreview />,
    sholoGuti:  <SholoGutiPreview />,
    dominoes:   <DominoesPreview />,
  }
  return (
    <div style={{ width:'100%', height:100, display:'flex', alignItems:'center',
      justifyContent:'center', overflow:'hidden', borderRadius:'12px 12px 0 0',
      background: `linear-gradient(135deg, ${game.color}22 0%, ${game.color}08 100%)` }}>
      {map[game.id] || <div style={{ fontSize:36 }}>{game.emoji}</div>}
    </div>
  )
}

function TicTacToePreview() {
  const cells = ['O','X','','X','O','','','','O']
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3, width:72, height:72 }}>
      {cells.map((c,i) => (
        <div key={i} style={{ background:'rgba(233,69,96,0.18)', borderRadius:4,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:15, fontWeight:900, color: c==='O'?'#e94560':'#fff' }}>{c}</div>
      ))}
    </div>
  )
}

function ChessPreview() {
  const pieces = [['♜','','♝',''],['','♟','','♟'],['♙','','♙',''],['','♖','','♔']]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, width:80, height:80 }}>
      {pieces.flat().map((p,i) => {
        const row=Math.floor(i/4), col=i%4
        const light=(row+col)%2===0
        return (
          <div key={i} style={{ background: light?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.28)',
            borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:16 }}>{p}</div>
        )
      })}
    </div>
  )
}

function CheckersPreview() {
  const grid = [0,1,0,1, 0,0,0,0, 0,0,0,0, 2,0,2,0]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, width:76, height:76 }}>
      {grid.map((v,i) => {
        const row=Math.floor(i/4), col=i%4
        const dark=(row+col)%2===1
        return (
          <div key={i} style={{ background: dark?'rgba(156,39,176,0.35)':'rgba(255,255,255,0.08)',
            borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {v===1 && <div style={{ width:12, height:12, borderRadius:'50%', background:'#eee',
              boxShadow:'inset 0 -2px 4px rgba(0,0,0,0.3)' }} />}
            {v===2 && <div style={{ width:12, height:12, borderRadius:'50%', background:'#333',
              boxShadow:'inset 0 -2px 4px rgba(0,0,0,0.5)' }} />}
          </div>
        )
      })}
    </div>
  )
}

function SlidingPreview() {
  const tiles = [1,2,3,4,5,6,7,8,null,10,11,12,9,13,14,15]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, width:82, height:82 }}>
      {tiles.map((t,i) => (
        <div key={i} style={{ background: t ? 'rgba(245,166,35,0.35)' : 'transparent',
          borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:700, color:'#f5a623',
          border: t ? '1px solid rgba(245,166,35,0.4)' : 'none' }}>{t}</div>
      ))}
    </div>
  )
}

function SnakesPreview() {
  return (
    <div style={{ position:'relative', width:76, height:76 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:1.5, width:'100%', height:'100%' }}>
        {Array(25).fill(0).map((_,i) => (
          <div key={i} style={{ background: (Math.floor(i/5)+i%5)%2===0
            ? 'rgba(76,175,80,0.22)' : 'rgba(76,175,80,0.08)', borderRadius:2 }} />
        ))}
      </div>
      <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
        fontSize:20, lineHeight:1 }}>🐍</div>
      <div style={{ position:'absolute', bottom:10, left:10, fontSize:12 }}>🪜</div>
      <div style={{ position:'absolute', bottom:10, right:10, width:9, height:9,
        borderRadius:'50%', background:'#4caf50' }} />
    </div>
  )
}

function LudoPreview() {
  return (
    <div style={{ width:78, height:78, position:'relative' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, width:'100%', height:'100%' }}>
        {[['#2196f3','🔵'],['#f44336','🔴'],['#ffeb3b','🟡'],['#4caf50','🟢']].map(([c,e],i)=>(
          <div key={i} style={{ background:`${c}30`, borderRadius:4,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{e}</div>
        ))}
      </div>
    </div>
  )
}

function CarromPreview() {
  const pieces = [[1,1,2,1,2],[2,1,2,1,1],[1,2,0,2,1],[2,1,2,1,2],[1,2,1,2,1]]
  return (
    <div style={{ width:80, height:80, background:'rgba(255,152,0,0.12)',
      borderRadius:8, padding:4, position:'relative',
      border:'2px solid rgba(255,152,0,0.3)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:1.5,
        width:'100%', height:'100%' }}>
        {pieces.flat().map((v,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            {v===0 && <div style={{ width:6, height:6, borderRadius:'50%', background:'#e53935' }} />}
            {v===1 && <div style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.7)' }} />}
            {v===2 && <div style={{ width:6, height:6, borderRadius:'50%', background:'rgba(0,0,0,0.6)' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function MorrisPreview() {
  return (
    <svg width="78" height="78" viewBox="0 0 78 78">
      <rect x="4" y="4" width="70" height="70" fill="none" stroke="rgba(121,85,72,0.6)" strokeWidth="1.5"/>
      <rect x="18" y="18" width="42" height="42" fill="none" stroke="rgba(121,85,72,0.6)" strokeWidth="1.5"/>
      <rect x="32" y="32" width="14" height="14" fill="none" stroke="rgba(121,85,72,0.6)" strokeWidth="1.5"/>
      <line x1="39" y1="4" x2="39" y2="32" stroke="rgba(121,85,72,0.5)" strokeWidth="1.5"/>
      <line x1="39" y1="46" x2="39" y2="74" stroke="rgba(121,85,72,0.5)" strokeWidth="1.5"/>
      <line x1="4" y1="39" x2="32" y2="39" stroke="rgba(121,85,72,0.5)" strokeWidth="1.5"/>
      <line x1="46" y1="39" x2="74" y2="39" stroke="rgba(121,85,72,0.5)" strokeWidth="1.5"/>
      {[[4,4],[39,4],[74,4],[4,39],[74,39],[4,74],[39,74],[74,74],[18,18],[60,18],[18,60],[60,60]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="4" fill={i%3===0?'#fff':'rgba(121,85,72,0.7)'} />
      ))}
    </svg>
  )
}

function SholoGutiPreview() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      {[0,1,2,3].map(r=>[0,1,2,3].map(c=>{
        const x=10+c*20, y=10+r*20
        return <line key={`h${r}${c}`} x1={x} y1={y} x2={x+20} y2={y} stroke="rgba(255,193,7,0.4)" strokeWidth="1"/>
      }))}
      {[0,1,2,3].map(r=>[0,1,2,3].map(c=>{
        const x=10+c*20, y=10+r*20
        return <line key={`v${r}${c}`} x1={x} y1={y} x2={x} y2={y+20} stroke="rgba(255,193,7,0.4)" strokeWidth="1"/>
      }))}
      {[[10,10],[30,10],[50,10],[70,10],[10,30],[70,30],[10,50],[70,50]].map(([x,y],i)=>(
        <circle key={`r${i}`} cx={x} cy={y} r="5" fill="#e53935" opacity="0.85"/>
      ))}
      {[[10,70],[30,70],[50,70],[70,70],[30,50],[50,50],[30,30],[50,30]].map(([x,y],i)=>(
        <circle key={`b${i}`} cx={x} cy={y} r="5" fill="#1976d2" opacity="0.85"/>
      ))}
    </svg>
  )
}

function DominoesPreview() {
  function Domino({ a, b, rot=0 }) {
    return (
      <div style={{ transform:`rotate(${rot}deg)`, background:'#f5f5f5',
        borderRadius:5, padding:'3px 2px', display:'flex', flexDirection:'column',
        gap:1, boxShadow:'0 2px 6px rgba(0,0,0,0.4)', width:22 }}>
        <div style={{ background:'rgba(0,0,0,0.06)', borderRadius:3, height:18,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, fontWeight:700, color:'#444' }}>{a}</div>
        <div style={{ height:1, background:'#bbb' }}/>
        <div style={{ background:'rgba(0,0,0,0.06)', borderRadius:3, height:18,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, fontWeight:700, color:'#444' }}>{b}</div>
      </div>
    )
  }
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center' }}>
      <Domino a="••" b="•" />
      <Domino a="••" b="••" rot={-10} />
      <Domino a="•" b="•••" rot={8} />
    </div>
  )
}

// ─── Rules data ───────────────────────────────────────────────────────────────
const RULES = {
  tictactoe: {
    objective: 'Get 3 in a row — horizontal, vertical, or diagonal.',
    howToPlay: ['Players alternate placing X or O on the 3×3 grid.','First to get 3 in a row wins.','All 9 squares filled with no winner = draw.'],
    proTips: ['Control the center square on move 1.', 'Expert AI is unbeatable — your goal is a draw!']
  },
  sliding: {
    objective: 'Arrange tiles 1–15 in order by sliding into the empty space.',
    howToPlay: ['Tap any tile adjacent to the empty space to slide it.','Arrange all tiles 1 to 15, left-to-right, top-to-bottom.','Use the Hint button to reveal the next optimal move.'],
    proTips: ['Solve the top two rows first, then the bottom.', 'Fewer moves in less time = higher score.']
  },
  snakes: {
    objective: 'First player to reach exactly square 100 wins.',
    howToPlay: ['Roll the dice and move your token forward.','Land on a ladder base — climb up!','Land on a snake head — slide back down.','You must roll exactly to 100 to win.'],
    proTips: ['Pure luck — but watch where opponents land!', 'Bounce-back rule: overshooting 100 bounces you back.']
  },
  checkers: {
    objective: 'Capture all opponent pieces or block them from moving.',
    howToPlay: ['Move diagonally forward one square at a time.','Jump over an adjacent enemy piece to capture it.','Captures are mandatory — you must jump if able.','Reach the far rank to become a King (moves both ways).'],
    proTips: ['Control the center early.', 'Multiple jumps in one turn are allowed and mandatory.']
  },
  ninemens: {
    objective: 'Reduce opponent to fewer than 3 pieces or block all their moves.',
    howToPlay: ['Phase 1: Place your 9 pieces on any empty intersection.','A mill (3 in a line) lets you remove one enemy piece.','Phase 2: Move pieces one step along lines to form new mills.','Phase 3 (3 pieces left): Jump anywhere on the board.'],
    proTips: ['Aim for double mills — two mills sharing one piece.', 'Block opponent mills before they form.']
  },
  carrom: {
    objective: 'Pocket all your carrom men and the queen before your opponent.',
    howToPlay: ['Slide the position bar to place your striker, set power and aim.','Drag on the board to aim the direction.','Tap Strike! to fire — pocket your colour coins.','Pocket the red queen, then immediately cover it with your coin.'],
    proTips: ['Aim for clusters to pocket multiple coins.', 'The queen gives a 3-point bonus when covered.']
  },
  chess: {
    objective: 'Checkmate the opponent\'s king.',
    howToPlay: ['Each piece moves uniquely — pawns forward, bishops diagonally, etc.','Check means the king is under attack; you must escape it.','Checkmate: king is in check with no legal escape.','Special moves: castling, en passant, pawn promotion.'],
    proTips: ['Control the center with pawns and knights early.', 'Develop all pieces before launching an attack.']
  },
  ludo: {
    objective: 'Race all 4 tokens from home to the finish before opponents.',
    howToPlay: ['Roll a 6 to bring a token out of your home base.','Move tokens clockwise around the board.','Land on an opponent to send them back home.','Get a token into the coloured final lane to win with it.'],
    proTips: ['Keep tokens spread to avoid being all cut at once.', 'A 6 always gives you an extra roll.']
  },
  sholoGuti: {
    objective: 'Capture all 16 enemy pieces.',
    howToPlay: ['Move one piece per turn along any board line.','Jump over an adjacent enemy to capture it.','Chain captures are allowed in one turn.','Player with pieces remaining wins.'],
    proTips: ['Protect your pieces in corners and edges.', 'Force splits — attack from two sides simultaneously.']
  },
  dominoes: {
    objective: 'Empty your hand before your opponent.',
    howToPlay: ['Match a tile\'s pip count to either open end of the chain.','If you can\'t play, draw from the boneyard.','First player to empty their hand wins the round.','Score is the sum of pips remaining in opponents\' hands.'],
    proTips: ['Block ends your opponent needs.', 'Track which numbers have been played to predict draws.']
  },
}

// ─── Daily Challenge ──────────────────────────────────────────────────────────
function getDailyGame() {
  const day = Math.floor(Date.now() / 86400000)
  const available = GAMES.filter(g => g.available)
  return available[day % available.length]
}

// ─── Ticker tips ──────────────────────────────────────────────────────────────
const TIPS = [
  '♟ In Chess, control the center in the opening.',
  '🎲 In Ludo, a roll of 6 always grants an extra turn.',
  '⭕ In Tic Tac Toe, the corner-center trap is unbeatable.',
  '🐍 In Snakes & Ladders, you bounce back if you overshoot 100.',
  '🔢 Solve the top two rows of the Sliding Puzzle first.',
  '🎱 In Carrom, pocket the queen then immediately cover it.',
  '⬛ In Morris, a double-mill lets you remove 2 pieces per move.',
  '🔴 In Checkers, all captures are mandatory.',
  '🟡 In 16 Goti, chain captures win games.',
  '🁢 In Dominoes, track which pip counts are exhausted.',
]

// ─── Components ──────────────────────────────────────────────────────────────
function RulesModal({ game, onClose }) {
  const rules = RULES[game.id]
  return (
    <div style={overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={rulesModal}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:28 }}>{game.emoji}</span>
            <span style={{ color:'#fff', fontWeight:800, fontSize:18 }}>{game.name}</span>
          </div>
          <button onClick={onClose} style={closeX}>✕</button>
        </div>

        <div style={ruleSection}>
          <div style={ruleSectionLabel}>🎯 Objective</div>
          <div style={ruleText}>{rules?.objective}</div>
        </div>

        <div style={ruleSection}>
          <div style={ruleSectionLabel}>📖 How to Play</div>
          {rules?.howToPlay.map((s,i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
              <span style={{ color: game.color, fontWeight:700, minWidth:18 }}>{i+1}.</span>
              <span style={ruleText}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ ...ruleSection, background:`${game.color}15`, borderColor:`${game.color}30` }}>
          <div style={{ ...ruleSectionLabel, color: game.color }}>⚡ Pro Tips</div>
          {rules?.proTips.map((t,i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:5 }}>
              <span style={{ color: game.color }}>•</span>
              <span style={ruleText}>{t}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ ...playBtn, background: game.color, marginTop:8 }}>
          Got it — Let's Play!
        </button>
      </div>
    </div>
  )
}

function GameCard({ game, onClick, isDaily, showRules }) {
  const stats = SaveSystem.loadStats(game.id)
  const [hovered, setHovered] = useState(false)

  const tagColors = {
    quick:'#e94560', strategy:'#9c27b0', puzzle:'#f5a623', dice:'#ff9800',
    family:'#4caf50', physics:'#03a9f4', classic:'#795548', brain:'#00bcd4',
    capture:'#f44336', solo:'#607d8b', luck:'#ff5722', deep:'#455a64',
    mill:'#6d4c41', skill:'#ff6f00', tiles:'#78909c', race:'#e91e63'
  }

  return (
    <div style={{ position:'relative' }}>
      {isDaily && (
        <div style={dailyBadge}>🔥 Today's Pick</div>
      )}
      <button
        disabled={!game.available}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...cardBase,
          border: isDaily
            ? `2px solid ${game.color}`
            : hovered
            ? `1px solid ${game.color}80`
            : '1px solid rgba(255,255,255,0.08)',
          transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: hovered
            ? `0 16px 40px ${game.color}30, 0 4px 16px rgba(0,0,0,0.5)`
            : isDaily
            ? `0 0 20px ${game.color}40`
            : '0 2px 12px rgba(0,0,0,0.3)',
          opacity: game.available ? 1 : 0.45,
          cursor: game.available ? 'pointer' : 'default',
        }}>

        {/* Board Preview */}
        <BoardPreview game={game} />

        {/* Info button */}
        <button
          onClick={e => { e.stopPropagation(); showRules(game) }}
          style={infoBtn}>ℹ</button>

        {/* Difficulty dots */}
        <div style={diffRow}>
          {[1,2,3].map(d => (
            <div key={d} style={{ width:5, height:5, borderRadius:'50%',
              background: d <= (game.estimatedMinutes > 20 ? 3 : game.estimatedMinutes > 10 ? 2 : 1)
                ? game.color : 'rgba(255,255,255,0.18)' }} />
          ))}
        </div>

        {/* Card body */}
        <div style={cardBody}>
          <div style={cardName}>{game.name}</div>
          <div style={cardDesc}>{game.description}</div>

          <div style={tagRow}>
            {game.tags.slice(0,2).map(t => (
              <span key={t} style={{
                fontSize:9, padding:'2px 7px', borderRadius:10, fontWeight:700,
                background: `${tagColors[t] || game.color}28`,
                color: tagColors[t] || game.color,
                border: `1px solid ${tagColors[t] || game.color}40`,
                letterSpacing:0.3
              }}>{t.toUpperCase()}</span>
            ))}
          </div>

          {stats.played > 0 && (
            <div style={statsRow}>
              <span>🏆 {stats.won}W</span>
              <span>🎮 {stats.played}P</span>
              {stats.played > 0 && <span style={{ color:'rgba(255,255,255,0.35)' }}>
                {Math.round(stats.won/stats.played*100)}%
              </span>}
            </div>
          )}

          <div style={{ ...playBtn, background: game.available
            ? `linear-gradient(135deg, ${game.color} 0%, ${game.color}cc 100%)`
            : 'rgba(255,255,255,0.08)',
            marginTop:8, fontSize:12, padding:'8px 0' }}>
            {game.available ? '▶ Play Now' : '⏳ Coming Soon'}
          </div>
        </div>
      </button>
    </div>
  )
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────
export default function HomeScreen({ onSelectGame, onOpenSettings }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [rulesGame, setRulesGame] = useState(null)
  const [tipIdx, setTipIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const dailyGame = getDailyGame()

  useEffect(() => {
    setTimeout(() => setLoaded(true), 80)
    const t = setInterval(() => setTipIdx(i => (i+1) % TIPS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const tags = ['all','quick','strategy','puzzle','dice','family','physics','classic']

  const filtered = GAMES.filter(g => {
    const ms = g.name.toLowerCase().includes(search.toLowerCase()) ||
               g.tags.some(t => t.includes(search.toLowerCase()))
    const mt = filter === 'all' || g.tags.includes(filter)
    return ms && mt
  })

  const availCount = GAMES.filter(g => g.available).length

  return (
    <div style={container}>

      {/* Hero */}
      <div style={hero}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={heroEyebrow}>🎮 CLASSIC BOARD GAMES</div>
            <h1 style={heroTitle}>Play.<br/><span style={heroAccent}>Win.</span> Repeat.</h1>
            <p style={heroSub}>{availCount} games · Offline · AI opponents</p>
          </div>
          <button onClick={() => { audioEngine.play('ui_open'); onOpenSettings() }} style={settingsBtn}>
            ⚙️
          </button>
        </div>
        <div style={versionChip}>{VERSION_LABEL}</div>
      </div>

      {/* Tip ticker */}
      <div style={ticker}>
        <span style={{ color:'rgba(255,255,255,0.35)', marginRight:6 }}>💡</span>
        <span key={tipIdx} style={tickerText}>{TIPS[tipIdx]}</span>
      </div>

      {/* Search */}
      <div style={{ padding:'6px 14px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search games…" style={searchInput} />
      </div>

      {/* Tag filters */}
      <div style={filterRow}>
        {tags.map(t => (
          <button key={t} onClick={() => { audioEngine.play('ui_click'); setFilter(t) }}
            style={{
              ...filterChip,
              background: filter===t ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${filter===t ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: filter===t ? '#fff' : 'rgba(255,255,255,0.45)',
              fontWeight: filter===t ? 700 : 500,
            }}>{t === 'all' ? '✦ All' : t}</button>
        ))}
      </div>

      {/* Game grid */}
      <div style={grid}>
        {filtered.map((game, idx) => (
          <div key={game.id} style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(20px)',
            transition: `opacity 0.3s ${idx*0.05}s, transform 0.3s ${idx*0.05}s`
          }}>
            <GameCard
              game={game}
              isDaily={dailyGame.id === game.id && filter === 'all' && !search}
              onClick={() => { audioEngine.play('ui_confirm'); onSelectGame(game) }}
              showRules={setRulesGame}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center',
            color:'rgba(255,255,255,0.25)', padding:48, fontSize:14 }}>
            No games found for "{search}"
          </div>
        )}
      </div>

      <div style={footer}>
        {availCount} games ready · Made with ❤️ offline
      </div>

      {/* Rules modal */}
      {rulesGame && (
        <RulesModal game={rulesGame} onClose={() => setRulesGame(null)} />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const container = {
  display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
  background:'linear-gradient(180deg, #0a0b14 0%, #0d1020 50%, #0f1428 100%)',
}
const hero = {
  padding:'18px 16px 12px',
  background:'linear-gradient(180deg, rgba(99,102,241,0.12) 0%, transparent 100%)',
  borderBottom:'1px solid rgba(255,255,255,0.05)',
}
const heroEyebrow = {
  fontSize:9, letterSpacing:2, color:'rgba(255,255,255,0.35)',
  fontWeight:700, marginBottom:4,
}
const heroTitle = {
  color:'#fff', fontSize:26, fontWeight:900, margin:'0 0 2px',
  lineHeight:1.15, letterSpacing:-0.5,
}
const heroAccent = {
  background:'linear-gradient(90deg, #f5c842 0%, #e8860a 100%)',
  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
}
const heroSub = {
  color:'rgba(255,255,255,0.35)', fontSize:12, margin:0,
}
const settingsBtn = {
  background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff', fontSize:20, width:42, height:42, borderRadius:12, cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
}
const versionChip = {
  display:'inline-block', fontSize:9, color:'rgba(255,255,255,0.2)',
  background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:8,
  border:'1px solid rgba(255,255,255,0.08)', marginTop:8,
}
const ticker = {
  padding:'6px 14px', background:'rgba(255,255,255,0.03)',
  borderBottom:'1px solid rgba(255,255,255,0.04)',
  display:'flex', alignItems:'center', minHeight:30,
}
const tickerText = {
  color:'rgba(255,255,255,0.45)', fontSize:11, fontStyle:'italic',
  animation:'fadein 0.4s ease',
}
const searchInput = {
  width:'100%', padding:'9px 14px', borderRadius:12,
  background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)',
  color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box',
}
const filterRow = {
  display:'flex', gap:5, padding:'6px 14px 8px', overflowX:'auto',
  scrollbarWidth:'none',
}
const filterChip = {
  padding:'5px 11px', borderRadius:20, fontSize:10, cursor:'pointer',
  whiteSpace:'nowrap', transition:'all 0.15s', flexShrink:0, letterSpacing:0.3,
}
const grid = {
  flex:1, display:'grid', gridTemplateColumns:'repeat(2,1fr)',
  gap:10, padding:'4px 12px 12px', overflowY:'auto', alignContent:'start',
}
const footer = {
  textAlign:'center', color:'rgba(255,255,255,0.15)', fontSize:10,
  padding:'6px 0 10px', borderTop:'1px solid rgba(255,255,255,0.05)',
}

// Card
const cardBase = {
  display:'flex', flexDirection:'column', borderRadius:16,
  background:'linear-gradient(180deg,#141826 0%,#0f1320 100%)',
  position:'relative', textAlign:'left', width:'100%',
  transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
  userSelect:'none', padding:0, overflow:'hidden',
}
const infoBtn = {
  position:'absolute', top:6, right:6, width:22, height:22,
  borderRadius:'50%', background:'rgba(0,0,0,0.45)',
  border:'1px solid rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.7)',
  fontSize:11, fontWeight:700, cursor:'pointer', zIndex:2,
  display:'flex', alignItems:'center', justifyContent:'center',
}
const diffRow = {
  position:'absolute', top:8, left:8, display:'flex', gap:3,
}
const cardBody = {
  padding:'10px 10px 10px',
}
const cardName = {
  color:'#fff', fontWeight:800, fontSize:13, marginBottom:3,
}
const cardDesc = {
  color:'rgba(255,255,255,0.38)', fontSize:10, lineHeight:1.4, marginBottom:6,
}
const tagRow = {
  display:'flex', gap:4, flexWrap:'wrap', marginBottom:2,
}
const statsRow = {
  display:'flex', gap:8, fontSize:10, color:'rgba(255,255,255,0.4)',
  marginTop:4,
}
const playBtn = {
  display:'block', width:'100%', borderRadius:8, border:'none',
  color:'#fff', fontWeight:700, cursor:'pointer', textAlign:'center',
  letterSpacing:0.3,
}
const dailyBadge = {
  position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)',
  background:'linear-gradient(90deg,#f5c842,#e8860a)',
  color:'#000', fontSize:9, fontWeight:800, padding:'3px 10px',
  borderRadius:20, zIndex:3, whiteSpace:'nowrap', letterSpacing:0.5,
}

// Rules modal
const overlay = {
  position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
  display:'flex', alignItems:'flex-end', justifyContent:'center',
  zIndex:300, padding:'0 12px',
}
const rulesModal = {
  background:'#141826', borderRadius:'20px 20px 0 0',
  padding:'20px 20px 32px', width:'100%', maxWidth:480,
  maxHeight:'85vh', overflowY:'auto',
  border:'1px solid rgba(255,255,255,0.1)',
  boxShadow:'0 -12px 60px rgba(0,0,0,0.7)',
}
const closeX = {
  background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
  width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:13,
}
const ruleSection = {
  background:'rgba(255,255,255,0.04)', borderRadius:12,
  border:'1px solid rgba(255,255,255,0.07)', padding:12, marginBottom:10,
}
const ruleSectionLabel = {
  color:'rgba(255,255,255,0.5)', fontSize:10, fontWeight:700,
  letterSpacing:1, textTransform:'uppercase', marginBottom:8,
}
const ruleText = {
  color:'rgba(255,255,255,0.72)', fontSize:13, lineHeight:1.5,
}
