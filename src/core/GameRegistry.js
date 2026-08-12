import { MODE } from './GameEngine.js'

export { MODE }
export const DIFFICULTY = { beginner:0, easy:1, normal:2, hard:3, expert:4 }

export const GAMES = [
  {
    id:'tictactoe', name:'Tic Tac Toe', emoji:'⭕', color:'#e94560',
    players:[2], modes:[MODE.solo,MODE.local2p,MODE.aiVsAi],
    difficulties:['beginner','easy','normal','hard','expert'],
    tags:['quick','classic','strategy'], estimatedMinutes:2, available:true,
    description:'Get three in a row. Simple rules, deep strategy.',
    tutorialSteps:[
      'Take turns placing X or O on the 3×3 grid.',
      'First player to get 3 in a row — horizontal, vertical, or diagonal — wins.',
      'If all 9 squares fill with no winner, it\'s a draw.',
      'Expert AI plays perfectly — your best result is a draw!'
    ]
  },
  {
    id:'sliding', name:'Sliding Puzzle', emoji:'🔢', color:'#f5a623',
    players:[1], modes:[MODE.solo],
    difficulties:['easy','normal','hard'],
    tags:['puzzle','solo','brain'], estimatedMinutes:5, available:true,
    description:'Slide numbered tiles into the correct 1–15 order.',
    tutorialSteps:[
      'Tap any tile next to the empty space to slide it there.',
      'Goal: arrange all tiles in order from 1 (top-left) to 15.',
      'Use Hint to see the next optimal move (A* solver).',
      'Fewer moves and less time = better score.'
    ]
  },
  {
    id:'snakes', name:'Snakes & Ladders', emoji:'🎲', color:'#4caf50',
    players:[2,4], modes:[MODE.local2p],
    difficulties:['normal'],
    tags:['dice','family','luck'], estimatedMinutes:10, available:true,
    description:'Race to square 100. Climb ladders, dodge snakes!',
    tutorialSteps:[
      'Roll the dice and move your token that many squares forward.',
      'Land on a ladder base — climb up instantly!',
      'Land on a snake\'s head — slide back down.',
      'First player to reach exactly 100 wins.'
    ]
  },
  {
    id:'checkers', name:'Checkers', emoji:'🔴', color:'#9c27b0',
    players:[2], modes:[MODE.solo,MODE.local2p],
    difficulties:['easy','normal','hard'],
    tags:['strategy','classic','capture'], estimatedMinutes:15, available:true,
    description:'Capture all opponent pieces by jumping over them.',
    tutorialSteps:[
      'Move diagonally forward one square at a time.',
      'Capture by jumping over an adjacent enemy piece to an empty square beyond.',
      'Captures are mandatory — you must jump if you can.',
      'Reach the back rank to become a King and move both directions.'
    ]
  },
  {
    id:'ninemens', name:"Nine Men's Morris", emoji:'⬛', color:'#795548',
    players:[2], modes:[MODE.solo,MODE.local2p],
    difficulties:['easy','normal','hard'],
    tags:['strategy','mill','classic'], estimatedMinutes:20, available:true,
    description:'Form mills of 3 to capture pieces. 4 000-year-old strategy game.',
    tutorialSteps:[
      'Phase 1: Take turns placing your 9 pieces anywhere on the 24 points.',
      'Form a mill (3 in a row along a line) to remove one enemy piece.',
      'Phase 2: Move pieces one step along lines, continuing to form mills.',
      'Win when opponent has fewer than 3 pieces or cannot move.'
    ]
  },
  {
    id:'carrom', name:'Carrom', emoji:'🎱', color:'#ff9800',
    players:[2], modes:[MODE.solo,MODE.local2p],
    difficulties:['easy','normal','hard'],
    tags:['physics','skill','family'], estimatedMinutes:15, available:true,
    description:'Flick the striker to pocket carrom men and the queen.',
    tutorialSteps:[
      'Slide the position bar to place your striker, adjust power and aim.',
      'Drag on the board to aim the shot direction.',
      'Tap "Strike!" to fire. Pocket your white coins.',
      'Pocket the red queen then immediately cover it with your own coin.'
    ]
  },
  {
    id:'chess', name:'Chess', emoji:'♟️', color:'#607d8b',
    players:[2], modes:[MODE.solo,MODE.local2p],
    difficulties:['easy','normal','hard'],
    tags:['strategy','classic','deep'], estimatedMinutes:30,
    available:true,
    description:'The ultimate strategy game. Checkmate the king.'
  },
  {
    id:'ludo', name:'Ludo', emoji:'🎯', color:'#ff5722',
    players:[2,4], modes:[MODE.solo,MODE.local2p],
    difficulties:['easy','normal'],
    tags:['dice','family','race'], estimatedMinutes:20,
    available:true,
    description:'Race your four tokens home. Cut opponents and dodge cuts!'
  },
  {
    id:'sholoGuti', name:'16 Goti', emoji:'🟡', color:'#ffc107',
    players:[2], modes:[MODE.solo,MODE.local2p],
    difficulties:['easy','normal','hard'],
    tags:['strategy','capture'], estimatedMinutes:20,
    available:true,
    description:'Traditional Bengali strategy. Capture all enemy pieces.'
  },
  {
    id:'dominoes', name:'Dominoes', emoji:'🁢', color:'#78909c',
    players:[2], modes:[MODE.solo,MODE.local2p],
    difficulties:['easy','normal'],
    tags:['tiles','classic'], estimatedMinutes:12,
    available:true,
    description:'Match tiles by pip count. Empty your hand to win.'
  }
]

export function getGame(id)         { return GAMES.find(g => g.id === id) || null }
export function getAvailableGames() { return GAMES.filter(g => g.available) }
export function getAllGames()        { return GAMES }
