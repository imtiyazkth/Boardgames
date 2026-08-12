import { useState, useEffect, useCallback } from 'react'
import { DominoesEngine, DominoesAI } from './engine.js'
import { useAudio } from '../../hooks/useAudio.js'

// Single domino tile visual component
function Tile({ tile, onClick, highlight, small }) {
  if (!tile) return null
  const [a, b] = tile
  const pip = (n) => {
    const dots = {
      0:[], 1:[[50,50]],
      2:[[25,25],[75,75]], 3:[[25,25],[50,50],[75,75]],
      4:[[25,25],[75,25],[25,75],[75,75]],
      5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
      6:[[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]
    }[n] || []
    const sz = small ? 22 : 30
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={12} fill="rgba(0,0,0,0.75)" />
        ))}
      </svg>
    )
  }

  const w = small ? 52 : 68
  const h = small ? 26 : 34

  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:0,
      background: highlight ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.95)',
      border: `2px solid ${highlight ? '#4caf50' : 'rgba(0,0,0,0.2)'}`,
      borderRadius:6, cursor: onClick ? 'pointer' : 'default',
      padding:'2px 4px', width:w, height:h, flexShrink:0,
      boxShadow: highlight ? '0 0 8px rgba(76,175,80,0.5)' : '0 2px 4px rgba(0,0,0,0.2)',
      transition:'all 0.12s'
    }}>
      <div style={{ flex:1, display:'flex', justifyContent:'center' }}>{pip(a)}</div>
      <div style={{ width:1, height:'70%', background:'rgba(0,0,0,0.2)', flexShrink:0 }} />
      <div style={{ flex:1, display:'flex', justifyContent:'center' }}>{pip(b)}</div>
    </button>
  )
}

export default function DominoesGame({ mode='solo', playerNames=[], onExit }) {
  const { play, vibrate } = useAudio()
  const [engine]  = useState(() => new DominoesEngine())
  const [state, setState]       = useState(null)
  const [ai]      = useState(() => new DominoesAI('normal'))
  const [thinking, setThinking] = useState(false)
  const [selTile, setSelTile]   = useState(null)   // index in hand
  const [selEnd,  setSelEnd]    = useState(null)    // 'left' | 'right'
  const [msg, setMsg]           = useState('')
  const names = [playerNames[0]||'You', playerNames[1]||'AI']

  const isAITurn = useCallback(st =>
    !(!st || st.gameOver || mode==='local2p' || st.currentPlayer!==1), [mode])

  useEffect(() => {
    engine.initializeGame({ playerNames: names })
    setState(engine.cloneState())
    play('game_start')
  }, [])

  // AI turn
  useEffect(() => {
    if (!state || !isAITurn(state)) return
    setThinking(true)
    const t = setTimeout(() => {
      const move = ai.getBestMove(engine)
      if (move) {
        const res = engine.applyMove(move)
        if (res.success) {
          const ns = engine.cloneState()
          setState(ns)
          if (move.action==='play') { play('domino_place'); vibrate([8]) }
          else if (move.action==='draw') play('domino_draw')
          else play('domino_block')
          if (ns.gameOver) handleGameOver(ns)
        }
      }
      setThinking(false)
    }, 700)
    return () => clearTimeout(t)
  }, [state])

  function handleGameOver(ns) {
    if (ns.winner === 0)       { setMsg(`${names[0]} wins! 🎉`); play('domino_win'); vibrate([50,30,70]) }
    else if (ns.winner === 1)  { setMsg(`${names[1]} wins!`);   play('game_lose') }
    else                       { setMsg("Blocked — it's a draw!"); play('game_draw') }
  }

  function playTile(tileIdx, end) {
    const move = { action:'play', tileIdx, end }
    const res = engine.applyMove(move)
    if (res.success) {
      const ns = engine.cloneState()
      setState(ns); setSelTile(null); setSelEnd(null)
      play('domino_place'); vibrate([8])
      if (ns.gameOver) handleGameOver(ns)
    } else {
      play('domino_invalid'); setSelTile(null); setSelEnd(null)
    }
  }

  function handleTileClick(i) {
    if (!state || state.gameOver || state.currentPlayer!==0 || thinking) return
    const legal = engine.getLegalMoves()
    const plays = legal.filter(m => m.action==='play' && m.tileIdx===i)
    if (!plays.length) { play('domino_invalid'); return }

    if (selTile === i) {
      setSelTile(null); setSelEnd(null); return
    }
    play('ui_click'); setSelTile(i)

    // If only one end valid, auto-play
    const ends = [...new Set(plays.map(m=>m.end))]
    if (ends.length === 1) {
      setSelEnd(ends[0])
      setTimeout(() => playTile(i, ends[0]), 120)
    } else {
      setSelEnd(null)  // ask user to pick end
    }
  }

  function handleDraw() {
    if (!state || state.gameOver || state.currentPlayer!==0) return
    const res = engine.applyMove({ action:'draw' })
    if (res.success) { setState(engine.cloneState()); play('domino_draw') }
  }

  function handlePass() {
    if (!state || state.gameOver || state.currentPlayer!==0) return
    const res = engine.applyMove({ action:'pass' })
    if (res.success) {
      const ns = engine.cloneState()
      setState(ns); play('domino_block')
      if (ns.gameOver) handleGameOver(ns)
    }
  }

  function restart() {
    engine.initializeGame({ playerNames: names }); play('game_start')
    setState(engine.cloneState()); setMsg(''); setSelTile(null); setSelEnd(null)
  }

  if (!state) return null
  const { hands, chain, leftEnd, rightEnd, currentPlayer, gameOver, boneyard } = state
  const myHand  = hands[0]
  const legal   = !gameOver && currentPlayer===0 ? engine.getLegalMoves() : []
  const playable = new Set(legal.filter(m=>m.action==='play').map(m=>m.tileIdx))
  const canDraw  = legal.some(m=>m.action==='draw')
  const canPass  = legal.some(m=>m.action==='pass')

  // Need to pick end?
  const selPlays = selTile!==null ? legal.filter(m=>m.action==='play'&&m.tileIdx===selTile) : []
  const needPickEnd = selTile!==null && [...new Set(selPlays.map(m=>m.end))].length > 1

  return (
    <div style={S.container}>
      <div style={S.header}>
        <button onClick={() => { play('ui_back'); onExit() }} style={S.backBtn}>←</button>
        <span style={S.title}>Dominoes</span>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', textAlign:'right' }}>
          <div>Boneyard: {boneyard.length}</div>
          <div>AI hand: {hands[1].length} tiles</div>
        </div>
      </div>

      {/* Status */}
      <div style={S.status}>
        {gameOver     ? <span style={{ color:'#ffd700', fontWeight:700 }}>{msg}</span>
        : thinking    ? <span style={{ color:'rgba(255,255,255,0.45)' }}>🤖 AI thinking…</span>
        : currentPlayer===0 ? <span style={{ color:'#4caf50' }}>Your turn — tap a tile</span>
        : <span style={{ color:'rgba(255,255,255,0.45)' }}>AI's turn…</span>}
      </div>

      {/* Chain / board */}
      <div style={S.chainBox}>
        {chain.length === 0 ? (
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13, textAlign:'center', padding:20 }}>
            Play the first tile to start the chain
          </div>
        ) : (
          <>
            <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, marginBottom:6 }}>
              Left: [{leftEnd}] ←  chain ({chain.length} tiles)  → [{rightEnd}]: Right
            </div>
            <div style={S.chain}>
              {chain.slice(-14).map(({ tile, flipped }, i) => (
                <Tile key={i} tile={flipped ? [tile[1],tile[0]] : tile} small />
              ))}
              {chain.length > 14 && (
                <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>+{chain.length-14} more</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* End picker modal */}
      {needPickEnd && (
        <div style={S.endPicker}>
          <div style={{ color:'#fff', fontWeight:600, fontSize:13, marginBottom:8 }}>
            Place on which end?
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button onClick={() => playTile(selTile,'left')} style={S.endBtn}>
              [{leftEnd}] Left end
            </button>
            <button onClick={() => playTile(selTile,'right')} style={S.endBtn}>
              Right end [{rightEnd}]
            </button>
          </div>
          <button onClick={() => setSelTile(null)} style={{ ...S.endBtn, marginTop:8,
            background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.5)' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Your hand */}
      <div style={S.handLabel}>Your hand ({myHand.length} tiles)</div>
      <div style={S.hand}>
        {myHand.map((tile, i) => (
          <Tile key={i} tile={tile}
            highlight={playable.has(i)}
            onClick={() => handleTileClick(i)} />
        ))}
        {myHand.length === 0 && (
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>No tiles</div>
        )}
      </div>

      {/* Controls */}
      {!gameOver && currentPlayer === 0 && (
        <div style={S.controls}>
          {canDraw && (
            <button onClick={handleDraw} style={{ ...S.btn, color:'#f5a623' }}>
              Draw tile
            </button>
          )}
          {canPass && (
            <button onClick={handlePass} style={{ ...S.btn, color:'#e94560' }}>
              Pass
            </button>
          )}
        </div>
      )}

      {gameOver && (
        <button onClick={restart} style={{ ...S.btn, ...S.primary, width:'100%', maxWidth:380 }}>
          ▶ Play Again
        </button>
      )}
    </div>
  )
}

const S = {
  container:{ display:'flex', flexDirection:'column', alignItems:'center',
    height:'100%', background:'linear-gradient(160deg,#1a1a1a 0%,#2d2d1a 100%)',
    padding:'10px 12px', gap:8, userSelect:'none', overflow:'hidden' },
  header:{ display:'flex', alignItems:'center', width:'100%', maxWidth:420, gap:8 },
  backBtn:{ background:'rgba(255,255,255,0.1)', border:'none', color:'#fff',
    fontSize:20, padding:'6px 12px', borderRadius:10, cursor:'pointer' },
  title:{ flex:1, color:'#fff', fontSize:18, fontWeight:700, textAlign:'center' },
  status:{ height:28, display:'flex', alignItems:'center', fontSize:13 },
  chainBox:{ width:'100%', maxWidth:420, background:'rgba(255,255,255,0.06)',
    borderRadius:12, padding:'10px 12px', minHeight:100,
    border:'1px solid rgba(255,255,255,0.1)', display:'flex', flexDirection:'column',
    justifyContent:'center' },
  chain:{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' },
  endPicker:{ width:'100%', maxWidth:420, background:'rgba(255,255,255,0.08)',
    border:'1px solid rgba(255,215,0,0.3)', borderRadius:12, padding:14,
    textAlign:'center' },
  endBtn:{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)',
    background:'rgba(255,255,255,0.12)', color:'#fff', fontSize:13,
    fontWeight:600, cursor:'pointer' },
  handLabel:{ color:'rgba(255,255,255,0.45)', fontSize:11,
    textTransform:'uppercase', letterSpacing:1, alignSelf:'flex-start' },
  hand:{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'flex-start',
    width:'100%', maxWidth:420, overflowY:'auto', maxHeight:160,
    padding:'4px 2px' },
  controls:{ display:'flex', gap:10, width:'100%', maxWidth:420 },
  btn:{ flex:1, padding:'11px 0', borderRadius:12, border:'none',
    background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:14,
    fontWeight:600, cursor:'pointer' },
  primary:{ background:'#78909c', color:'#fff' }
}
