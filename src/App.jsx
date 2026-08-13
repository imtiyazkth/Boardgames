import { useState, useEffect, Suspense, lazy } from 'react'
import HomeScreen    from './components/HomeScreen.jsx'
import GameSetup     from './components/GameSetup.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { audioEngine } from './core/AudioEngine.js'

const TicTacToeGame      = lazy(() => import('./games/TicTacToe/TicTacToeGame.jsx'))
const SlidingPuzzleGame  = lazy(() => import('./games/SlidingPuzzle/SlidingPuzzleGame.jsx'))
const SnakesLaddersGame  = lazy(() => import('./games/SnakesLadders/SnakesLaddersGame.jsx'))
const CheckersGame       = lazy(() => import('./games/Checkers/CheckersGame.jsx'))
const NineMensMorrisGame = lazy(() => import('./games/NineMensMorris/NineMensMorrisGame.jsx'))
const CarromGame         = lazy(() => import('./games/Carrom/CarromGame.jsx'))
const ChessGame          = lazy(() => import('./games/Chess/ChessGame.jsx'))
const LudoGame           = lazy(() => import('./games/Ludo/LudoGame.jsx'))
const DominoesGame       = lazy(() => import('./games/Dominoes/DominoesGame.jsx'))
const SholoGutiGame      = lazy(() => import('./games/SholoGuti/SholoGutiGame.jsx'))

const GAME_COMPONENTS = {
  tictactoe:  TicTacToeGame,
  sliding:    SlidingPuzzleGame,
  snakes:     SnakesLaddersGame,
  checkers:   CheckersGame,
  ninemens:   NineMensMorrisGame,
  carrom:     CarromGame,
  chess:      ChessGame,
  ludo:       LudoGame,
  dominoes:   DominoesGame,
  sholoGuti:  SholoGutiGame,
}

export default function App() {
  const [screen, setScreen]             = useState('home')
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameConfig, setGameConfig]     = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const unlock = () => audioEngine.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('touchstart',  unlock, { once: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart',  unlock)
    }
  }, [])

  function handleSelectGame(game) {
    if (!game.available) { audioEngine.play('ui_error'); return }
    audioEngine.play('ui_open')
    setSelectedGame(game)
    setScreen('setup')
  }

  function handleStartGame(config) {
    setGameConfig(config)
    setScreen('game')
  }

  function handleExitGame() {
    audioEngine.play('ui_back')
    setScreen('home')
    setSelectedGame(null)
    setGameConfig(null)
  }

  const GameComponent = selectedGame ? GAME_COMPONENTS[selectedGame.id] : null

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', position:'fixed', inset:0 }}>
      {screen === 'home' && (
        <HomeScreen
          onSelectGame={handleSelectGame}
          onOpenSettings={() => { audioEngine.play('ui_open'); setShowSettings(true) }}
        />
      )}

      {screen === 'setup' && selectedGame && (
        <>
          <HomeScreen onSelectGame={handleSelectGame}
            onOpenSettings={() => { audioEngine.play('ui_open'); setShowSettings(true) }} />
          <GameSetup
            game={selectedGame}
            onStart={handleStartGame}
            onCancel={() => { audioEngine.play('ui_cancel'); setScreen('home') }}
          />
        </>
      )}

      {screen === 'game' && GameComponent && gameConfig && (
        <Suspense fallback={<LoadingScreen name={selectedGame?.name} />}>
          <GameComponent
            mode={gameConfig.mode}
            difficulty={gameConfig.difficulty}
            playerNames={gameConfig.playerNames}
            playerCount={gameConfig.playerCount || 2}
            onExit={handleExitGame}
          />
        </Suspense>
      )}

      {showSettings && (
        <SettingsModal onClose={() => { audioEngine.play('ui_close'); setShowSettings(false) }} />
      )}
    </div>
  )
}

function LoadingScreen({ name }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', height:'100%', background:'#0a0b14', gap:16 }}>
      <div style={{ fontSize:44 }}>🎮</div>
      <div style={{ color:'rgba(255,255,255,0.5)', fontSize:16 }}>
        Loading {name || 'game'}…
      </div>
    </div>
  )
}
