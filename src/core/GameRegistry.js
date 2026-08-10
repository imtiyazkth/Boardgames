/**
 * GameRegistry — single source of truth for all games.
 * Adding a new game = adding one entry here + implementing the engine.
 */

export const DIFFICULTY = { beginner: 0, easy: 1, normal: 2, hard: 3, expert: 4 }
export const MODE = { solo: 'solo', local2p: 'local2p', aiVsAi: 'aiVsAi' }

export const GAMES = [
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    emoji: '⭕',
    color: '#e94560',
    players: [2],
    modes: [MODE.solo, MODE.local2p, MODE.aiVsAi],
    difficulties: ['beginner', 'easy', 'normal', 'hard', 'expert'],
    boardType: 'grid3x3',
    tags: ['quick', 'classic', 'strategy'],
    description: 'Get three in a row. Simple rules, deep strategy.',
    tutorialSteps: [
      'Players take turns placing their mark (X or O) on the 3×3 grid.',
      'The first player to get 3 of their marks in a row (horizontal, vertical, or diagonal) wins.',
      'If all 9 squares are filled with no winner, the game is a draw.',
      'On Expert difficulty, the AI plays perfectly — find the draw!'
    ],
    estimatedMinutes: 2,
    available: true
  },
  {
    id: 'sliding',
    name: 'Sliding Puzzle',
    emoji: '🔢',
    color: '#f5a623',
    players: [1],
    modes: [MODE.solo],
    difficulties: ['easy', 'normal', 'hard'],
    boardType: 'grid4x4',
    tags: ['puzzle', 'solo', 'brain'],
    description: 'Slide numbered tiles into the correct order.',
    tutorialSteps: [
      'Slide tiles into the empty space to rearrange them in order (1–15).',
      'Tap a tile adjacent to the empty space to move it.',
      'Use "Hint" to see the next optimal move.',
      'Fewer moves = better score!'
    ],
    estimatedMinutes: 5,
    available: true
  },
  {
    id: 'snakes',
    name: 'Snakes & Ladders',
    emoji: '🎲',
    color: '#4caf50',
    players: [2, 4],
    modes: [MODE.local2p, MODE.aiVsAi],
    difficulties: ['normal'],
    boardType: 'grid10x10',
    tags: ['dice', 'family', 'luck'],
    description: 'Race to square 100. Climb ladders, avoid snakes!',
    tutorialSteps: [
      'Roll the dice and move forward that many squares.',
      'Land on a ladder bottom to climb up!',
      'Land on a snake head to slide down.',
      'First player to reach exactly 100 wins.'
    ],
    estimatedMinutes: 10,
    available: true
  },
  {
    id: 'checkers',
    name: 'Checkers',
    emoji: '🔴',
    color: '#9c27b0',
    players: [2],
    modes: [MODE.solo, MODE.local2p],
    difficulties: ['easy', 'normal', 'hard'],
    boardType: 'grid8x8',
    tags: ['strategy', 'classic', 'capture'],
    description: 'Capture all opponent pieces by jumping over them.',
    tutorialSteps: [
      'Move diagonally forward. Capture by jumping over enemy pieces.',
      'Multiple captures are mandatory — take as many as possible.',
      'Reach the back rank to be crowned a King (moves both directions).',
      'Win by capturing all enemy pieces or leaving them no moves.'
    ],
    estimatedMinutes: 15,
    available: true
  },
  {
    id: 'ninemens',
    name: "Nine Men's Morris",
    emoji: '⬛',
    color: '#795548',
    players: [2],
    modes: [MODE.solo, MODE.local2p],
    difficulties: ['easy', 'normal', 'hard'],
    boardType: 'morris',
    tags: ['strategy', 'mill', 'classic'],
    description: 'Form mills of 3 to capture pieces. Ancient strategy game.',
    tutorialSteps: [
      'Phase 1: Place your 9 pieces on any open point.',
      'Phase 2: Move pieces one step along the lines.',
      'Form a mill (3 in a row) to remove one enemy piece.',
      'Win when your opponent has fewer than 3 pieces or cannot move.'
    ],
    estimatedMinutes: 20,
    available: true
  },
  {
    id: 'chess',
    name: 'Chess',
    emoji: '♟️',
    color: '#607d8b',
    players: [2],
    modes: [MODE.solo, MODE.local2p],
    difficulties: ['easy', 'normal', 'hard'],
    boardType: 'grid8x8',
    tags: ['strategy', 'classic', 'deep'],
    description: 'The ultimate strategy game. Checkmate the king.',
    estimatedMinutes: 30,
    available: false, // Phase 2
    comingSoon: true
  },
  {
    id: 'ludo',
    name: 'Ludo',
    emoji: '🎯',
    color: '#ff5722',
    players: [2, 4],
    modes: [MODE.solo, MODE.local2p],
    difficulties: ['easy', 'normal'],
    boardType: 'ludo',
    tags: ['dice', 'family', 'race'],
    description: 'Race your tokens home. Cut opponents and dodge cuts!',
    estimatedMinutes: 20,
    available: false,
    comingSoon: true
  },
  {
    id: 'carrom',
    name: 'Carrom',
    emoji: '🎱',
    color: '#ff9800',
    players: [2],
    modes: [MODE.solo, MODE.local2p],
    difficulties: ['easy', 'normal', 'hard'],
    boardType: 'carrom',
    tags: ['physics', 'skill', 'indian'],
    description: 'Flick the striker to pocket carrom men and the queen.',
    estimatedMinutes: 15,
    available: false,
    comingSoon: true
  },
  {
    id: 'sholoGuti',
    name: '16 Goti / Sholo Guti',
    emoji: '🟡',
    color: '#ffc107',
    players: [2],
    modes: [MODE.solo, MODE.local2p],
    difficulties: ['easy', 'normal', 'hard'],
    boardType: 'sholo',
    tags: ['strategy', 'bengali', 'capture'],
    description: 'Traditional Bengali strategy game. Capture all enemy pieces.',
    estimatedMinutes: 20,
    available: false,
    comingSoon: true
  }
]

export function getGame(id) {
  return GAMES.find(g => g.id === id) || null
}

export function getAvailableGames() {
  return GAMES.filter(g => g.available)
}
