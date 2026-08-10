import { useState, Suspense, lazy } from 'react'
import HomeScreen from './components/HomeScreen.jsx'
import GameSetup from './components/GameSetup.jsx'

// Lazy-load game components for performance
const TicTacToeGame = lazy(() => import('./games/TicTacToe/TicTacToeGame.jsx'))
const SlidingPuzzleGame = lazy(() => import('./games/SlidingPuzzle/SlidingPuzzleGame.jsx'))
const SnakesLaddersGame = lazy(() => import('./games/SnakesLadders/SnakesLaddersGame.jsx'))
const CheckersGame = lazy(() => import('./games/Checkers/CheckersGame.jsx'))
const NineMensMorrisGame = lazy(() => import('./games/NineMensMorris/NineMensMorrisGame.jsx'))

// Map game id → component
const GAME_COMPONENTS = {
  tictactoe: TicTacToeGame,
  sliding: SlidingPuzzleGame,
  snakes: SnakesLaddersGame,
  checkers: CheckersGame,
  ninemens: NineMensMorrisGame
}

export default function App() {
  const [screen, setScreen] = useState('home')   // 'home' | 'setup' | 'game'
  const [selectedGame, setSelectedGame] = useState(null)
  const [gameConfig, setGameConfig] = useState(null)

  function handleSelectGame(game) {
    if (!game.available) {
      alert(`${game.name} is coming soon! 🚀\n\nAvailable games: Tic Tac Toe, Sliding Puzzle, Snakes & Ladders, Checkers, Nine Men's Morris`)
      return
    }
    setSelectedGame(game)
    setScreen('setup')
  }

  function handleStartGame(config) {
    setGameConfig(config)
    setScreen('game')
  }

  function handleExitGame() {
    setScreen('home')
    setSelectedGame(null)
    setGameConfig(null)
  }

  if (screen === 'home') {
    return (
      <div style={appStyle}>
        <HomeScreen onSelectGame={handleSelectGame} />
      </div>
    )
  }

  if (screen === 'setup' && selectedGame) {
    return (
      <div style={appStyle}>
        <HomeScreen onSelectGame={handleSelectGame} />
        <GameSetup
          game={selectedGame}
          onStart={handleStartGame}
          onCancel={() => setScreen('home')}
        />
      </div>
    )
  }

  if (screen === 'game' && selectedGame && gameConfig) {
    const GameComponent = GAME_COMPONENTS[selectedGame.id]
    if (!GameComponent) {
      return (
        <div style={{ ...appStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
          <div style={{ color: '#fff', fontSize: 24 }}>🚧 Engine loading…</div>
          <button onClick={handleExitGame} style={{ padding: '12px 24px', borderRadius: 12, background: '#e94560', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' }}>
            Back to Home
          </button>
        </div>
      )
    }

    return (
      <div style={appStyle}>
        <Suspense fallback={<LoadingScreen />}>
          <GameComponent
            mode={gameConfig.mode}
            difficulty={gameConfig.difficulty}
            playerNames={gameConfig.playerNames}
            playerCount={gameConfig.playerCount || 2}
            onExit={handleExitGame}
          />
        </Suspense>
      </div>
    )
  }

  return <div style={appStyle}><HomeScreen onSelectGame={handleSelectGame} /></div>
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#1a1a2e', flexDirection: 'column', gap: 16
    }}>
      <div style={{ fontSize: 40 }}>🎮</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>Loading game…</div>
    </div>
  )
}

const appStyle = {
  width: '100vw', height: '100vh', overflow: 'hidden', position: 'fixed', inset: 0
}
