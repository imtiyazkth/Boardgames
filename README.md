# 🎮 Classic Board Games — Offline PWA

A unified, offline-first, mobile-friendly gaming platform built with React + Vite.  
No server required. No login needed. Works on Android, iOS, and any modern browser.

---

## 🚀 Deployed Games (Phase 1 — Ready)

| Game | Engine | AI | Modes |
|---|---|---|---|
| ⭕ Tic Tac Toe | Minimax (perfect) | ✅ 5 levels | Solo, 2P, AI vs AI |
| 🔢 Sliding Puzzle | A* solver | ✅ Hint mode | Solo |
| 🎲 Snakes & Ladders | Probabilistic | ✅ | 2–4P local |
| 🔴 Checkers | Alpha-beta pruning | ✅ 3 levels | Solo, 2P |
| ⬛ Nine Men's Morris | Heuristic + mill detection | ✅ 3 levels | Solo, 2P |

## 🔧 Engineered (Phase 2 — Engine Done, UI Coming)

| Game | Engine Status |
|---|---|
| ♟️ Chess | Full legal moves, castling, en passant, check/checkmate ✅ |
| 🎯 Ludo | Full token logic, capture, home column ✅ |
| 🟡 16 Goti / Sholo Guti | Full captures, multi-jump ✅ |
| 🁢 Dominoes | Full block dominoes logic ✅ |

---

## 📁 Project Structure

```
boardgames/
├── .github/workflows/deploy.yml    # Auto build + deploy to GitHub Pages
├── public/favicon.svg
├── index.html
├── vite.config.js                  # Vite + PWA plugin
├── package.json
└── src/
    ├── main.jsx                    # React entry point
    ├── App.jsx                     # App shell + routing
    ├── core/
    │   ├── GameEngine.js           # BaseGameEngine + BaseAIEngine interfaces
    │   ├── GameRegistry.js         # Central game catalog
    │   └── SaveSystem.js           # localStorage persistence (safe)
    ├── components/
    │   ├── HomeScreen.jsx          # Game launcher grid
    │   └── GameSetup.jsx           # Mode/difficulty/player picker modal
    └── games/
        ├── TicTacToe/
        │   ├── engine.js           # Rules + perfect minimax AI
        │   └── TicTacToeGame.jsx   # UI
        ├── SlidingPuzzle/
        │   ├── engine.js           # A* hint solver
        │   └── SlidingPuzzleGame.jsx
        ├── SnakesLadders/
        │   ├── engine.js
        │   └── SnakesLaddersGame.jsx
        ├── Checkers/
        │   ├── engine.js           # Alpha-beta AI
        │   └── CheckersGame.jsx
        ├── NineMensMorris/
        │   ├── engine.js           # Mill detection + AI
        │   └── NineMensMorrisGame.jsx
        ├── Chess/engine.js         # Full move gen (Phase 2 UI)
        ├── Ludo/engine.js          # Full Ludo logic (Phase 2 UI)
        ├── SholoGuti/engine.js     # Multi-jump captures (Phase 2 UI)
        └── Dominoes/engine.js      # Block dominoes (Phase 2 UI)
```

---

## ⚙️ Architecture Principles

### Layer Separation
```
UI Layer      → React components (render only)
Engine Layer  → Pure JS classes (no DOM, no React)
AI Layer      → Extends BaseAIEngine (pure JS)
Save Layer    → SaveSystem (localStorage wrapper)
Registry      → GameRegistry (single source of truth)
```

### Engine Contract
Every game engine implements `BaseGameEngine`:
```js
initializeGame(options)    → initial state
getLegalMoves()            → array of legal move objects
applyMove(move)            → { success, newState, error }
undoMove()                 → { success, newState }
isGameOver()               → boolean
getResult()                → { winner, reason }
serializeState()           → plain JSON-safe object
deserializeState(obj)      → restore from JSON
getHints()                 → subset of legal moves
validateMove(move)         → { valid, reason }
```

### AI Contract
Every AI implements `BaseAIEngine`:
```js
getBestMove(engine)        → move object
evaluatePosition(state)    → number
suggestHint(engine)        → move object
getDepth()                 → integer (by difficulty)
```

---

## 🚀 Deploy to GitHub Pages

### Step 1 — Create Repository
```bash
# On Termux or any git client:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/board-games.git
git push -u origin main
```

### Step 2 — Enable GitHub Pages
1. Go to your repo → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. The workflow in `.github/workflows/deploy.yml` runs automatically on every push

### Step 3 — Access Your App
```
https://YOUR_USERNAME.github.io/board-games/
```

### Install as Android App (PWA)
1. Open the URL in Chrome on Android
2. Tap the **"Add to Home Screen"** banner or browser menu
3. It installs like a native app — works fully offline!

---

## 📱 Adding to Capacitor (Native APK)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Classic Board Games" com.boardgames.app
npm run build
npx cap add android
npx cap copy
npx cap open android  # or build APK via GitHub Actions
```

For GitHub Actions APK build, add this job to `deploy.yml`:
```yaml
build-apk:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20' }
    - run: npm ci && npm run build
    - run: |
        npm install @capacitor/core @capacitor/cli @capacitor/android
        npx cap add android
        npx cap copy
    - uses: actions/setup-java@v4
      with: { java-version: '17', distribution: 'temurin' }
    - run: cd android && ./gradlew assembleRelease
    - uses: actions/upload-artifact@v4
      with:
        name: app-release
        path: android/app/build/outputs/apk/release/*.apk
```

---

## 🎯 Game-Specific AI Notes

### Tic Tac Toe
- **Expert**: Perfect minimax (never loses). Player can only draw.
- **Hard**: Minimax but may occasionally miss the optimal move.
- **Easy/Beginner**: 30–50% random moves injected.

### Checkers
- Alpha-beta pruning, depth 1–5 by difficulty.
- Mandatory capture rules enforced.
- King promotion handled.

### Nine Men's Morris
- Phase-aware AI: optimizes placement for mill potential.
- Scores: piece count difference + mill count × 5.
- Flying phase (3 pieces) triggers automatic.

### Sliding Puzzle
- A* with Manhattan distance heuristic (optimal solver).
- Hint button runs A* and highlights the next tile to move.
- Solvability check ensures only valid boards are generated.

---

## 🧪 QA / Testing Checklist

### Per-Game Bug Risks

**Tic Tac Toe**
- [x] Draw detection when board is full with no winner
- [x] AI never plays on occupied cell
- [x] Win line highlights correctly
- [x] AI-vs-AI doesn't run endlessly
- [x] Undo restores correct player turn

**Sliding Puzzle**
- [x] Only solvable boards generated (parity check)
- [x] A* hint doesn't crash on near-solved boards
- [x] Undo stack doesn't grow unbounded
- [x] Timer pauses when game is solved
- [x] Correct position detection (val === i+1, not i)

**Snakes & Ladders**
- [x] Exact landing on 100 required (bounce back)
- [x] All snake/ladder positions accurate
- [x] Multi-player turn order correct
- [x] Dice display matches actual roll

**Checkers**
- [x] Mandatory capture enforced
- [x] Multi-jump chaining allowed
- [x] King promotion only on back rank
- [x] AI doesn't select pieces from wrong side
- [x] Game over when no moves available

**Nine Men's Morris**
- [x] Mill detection after every move
- [x] Capture targets exclude pieces in their own mill (when possible)
- [x] Phase transition 1→2 when all pieces placed
- [x] Flying phase triggers at 3 pieces
- [x] Game over: < 3 pieces OR no moves

### General Tests
- [ ] App loads without network (offline PWA test)
- [ ] Save/restore session survives app close
- [ ] Corrupted localStorage doesn't crash app
- [ ] Two-player mode doesn't let same player move twice
- [ ] Undo doesn't go below initial state
- [ ] Difficulty changes take effect on new game only

---

## 🗺️ Development Roadmap

### Phase 1 — Complete ✅
- [x] App shell, home screen, game registry
- [x] Save system
- [x] Tic Tac Toe (full + perfect AI)
- [x] Sliding Puzzle (A* hint)
- [x] Snakes & Ladders
- [x] Checkers (alpha-beta AI)
- [x] Nine Men's Morris

### Phase 2 — Engine Done, UI Needed
- [ ] Chess UI (engine: 100% complete)
- [ ] Ludo UI (engine: 100% complete)
- [ ] Sholo Guti UI (engine: 100% complete)
- [ ] Dominoes UI (engine: 100% complete)

### Phase 3 — New Games
- [ ] Carrom (physics simulation — canvas/WebGL required)
- [ ] Mancala
- [ ] Othello/Reversi
- [ ] Connect Four
- [ ] Word Puzzle / Anagram

### Phase 4 — Platform Features
- [ ] Sound effects (Web Audio API)
- [ ] Haptic feedback (navigator.vibrate)
- [ ] Achievement system
- [ ] Game statistics screen
- [ ] Tutorial animations per game
- [ ] Theme switching (light/dark/colorful)
- [ ] Online multiplayer (optional WebSocket layer)
- [ ] Native APK via Capacitor

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| react + react-dom | UI framework |
| vite | Build tool (fast, ESM-based) |
| @vitejs/plugin-react | React fast refresh |
| vite-plugin-pwa | Service worker + manifest |

No game logic dependencies — all AI and engines are pure vanilla JS.

---

## 🔒 Privacy

- No data leaves the device
- No analytics, no tracking
- No login, no account
- All game state stored in localStorage (device only)
- Works 100% offline after first load
