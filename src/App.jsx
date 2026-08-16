import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import HomeScreen    from './components/HomeScreen.jsx'
import GameSetup     from './components/GameSetup.jsx'
import PostGame      from './components/PostGame.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { audioEngine } from './core/AudioEngine.js'
import { GAMES } from './core/GameRegistry.js'

const GAME_COMPONENTS = {
  tictactoe:  lazy(() => import('./games/TicTacToe/TicTacToeGame.jsx')),
  sliding:    lazy(() => import('./games/SlidingPuzzle/SlidingPuzzleGame.jsx')),
  snakes:     lazy(() => import('./games/SnakesLadders/SnakesLaddersGame.jsx')),
  checkers:   lazy(() => import('./games/Checkers/CheckersGame.jsx')),
  ninemens:   lazy(() => import('./games/NineMensMorris/NineMensMorrisGame.jsx')),
  carrom:     lazy(() => import('./games/Carrom/CarromGame.jsx')),
  chess:      lazy(() => import('./games/Chess/ChessGame.jsx')),
  ludo:       lazy(() => import('./games/Ludo/LudoGame.jsx')),
  dominoes:   lazy(() => import('./games/Dominoes/DominoesGame.jsx')),
  sholoGuti:  lazy(() => import('./games/SholoGuti/SholoGutiGame.jsx')),
}

// Screen transition wrapper
function SlideIn({ children, from='bottom', active=true }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const tx = from==='bottom' ? 'translateY(40px)' : from==='right' ? 'translateX(40px)' : 'scale(0.95)'
    el.style.opacity='0'; el.style.transform=tx
    requestAnimationFrame(() => {
      el.style.transition='opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.2,0.64,1)'
      el.style.opacity='1'; el.style.transform='none'
    })
  }, [active])
  return <div ref={ref} style={{position:'absolute',inset:0}}>{children}</div>
}

function GameLoadingScreen({ game }) {
  return (
    <div style={{
      position:'absolute',inset:0,display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      background: game
        ? `linear-gradient(160deg,${game.color}30 0%,#0a0b14 60%)`
        : '#0a0b14',
      gap:16,
    }}>
      <div style={{
        fontSize:52,
        filter: game ? `drop-shadow(0 0 20px ${game.color}80)` : 'none',
        animation:'pulse 0.8s ease-in-out infinite',
      }}>{game?.emoji || '🎮'}</div>
      <div style={{color:'rgba(255,255,255,0.5)',fontSize:14,fontWeight:600}}>
        Loading {game?.name}…
      </div>
      <div style={{display:'flex',gap:6}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{
            width:6,height:6,borderRadius:'50%',
            background: game?.color || 'rgba(255,255,255,0.4)',
            animation:`dotBounce 0.6s ease-in-out ${i*0.15}s infinite alternate`,
          }}/>
        ))}
      </div>
      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes dotBounce{from{transform:translateY(0)}to{transform:translateY(-6px)}}
      `}</style>
    </div>
  )
}

export default function App() {
  const [screen,       setScreen]       = useState('home')
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameConfig,   setGameConfig]   = useState(null)
  const [gameResult,   setGameResult]   = useState(null)  // {winner, moves, duration}
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const unlock = () => audioEngine.unlock()
    window.addEventListener('pointerdown', unlock, { once:true })
    window.addEventListener('touchstart',  unlock, { once:true, passive:true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart',  unlock)
    }
  }, [])

  function goHome() {
    audioEngine.play('ui_back')
    setScreen('home')
    setSelectedGame(null)
    setGameConfig(null)
    setGameResult(null)
  }

  function handleSelectGame(game) {
    if (!game.available) { audioEngine.play('ui_error'); return }
    audioEngine.play('ui_open')
    setSelectedGame(game)
    setScreen('setup')
  }

  function handleStartGame(config) {
    setGameConfig(config)
    setGameResult(null)
    setScreen('game')
  }

  function handleGameOver(result) {
    // Called by game when it finishes — show post-game screen
    setGameResult(result || {})
    setScreen('postgame')
  }

  function handleExitGame() {
    goHome()
  }

  function handlePlayAgain() {
    audioEngine.play('game_start')
    setGameResult(null)
    setScreen('game')
  }

  function handleChangeGame(game) {
    audioEngine.play('ui_open')
    setSelectedGame(game)
    setGameResult(null)
    setScreen('setup')
  }

  const GameComponent = selectedGame ? GAME_COMPONENTS[selectedGame.id] : null

  return (
    <div style={{
      width:'100vw', height:'100vh', overflow:'hidden',
      position:'fixed', inset:0, background:'#0a0b14',
    }}>
      {/* HOME */}
      {screen === 'home' && (
        <SlideIn from='bottom'>
          <HomeScreen
            onSelectGame={handleSelectGame}
            onOpenSettings={() => { audioEngine.play('ui_open'); setShowSettings(true) }}
          />
        </SlideIn>
      )}

      {/* SETUP */}
      {screen === 'setup' && selectedGame && (
        <SlideIn from='right'>
          <GameSetup
            game={selectedGame}
            onStart={handleStartGame}
            onCancel={() => { audioEngine.play('ui_cancel'); setScreen('home') }}
          />
        </SlideIn>
      )}

      {/* GAME */}
      {screen === 'game' && GameComponent && gameConfig && (
        <SlideIn from='bottom'>
          <Suspense fallback={<GameLoadingScreen game={selectedGame}/>}>
            <GameComponent
              mode={gameConfig.mode}
              difficulty={gameConfig.difficulty}
              playerNames={gameConfig.playerNames}
              playerCount={gameConfig.playerCount || 2}
              onExit={handleExitGame}
              onGameOver={handleGameOver}
            />
          </Suspense>
        </SlideIn>
      )}

      {/* POST-GAME */}
      {screen === 'postgame' && selectedGame && (
        <SlideIn from='bottom'>
          <PostGame
            game={selectedGame}
            result={gameResult}
            config={gameConfig}
            onPlayAgain={handlePlayAgain}
            onChangeGame={handleChangeGame}
            onHome={goHome}
          />
        </SlideIn>
      )}

      {/* SETTINGS */}
      {showSettings && (
        <SettingsModal onClose={() => { audioEngine.play('ui_close'); setShowSettings(false) }}/>
      )}
    </div>
  )
}
