# Neph Game

This repository contains a small browser-based platform game.

## Playing

1. Install dependencies if you want to run the test suite:
   ```bash
   npm install
   ```
2. Open `game.html` in a modern web browser.
3. Choose one of the available characters. Click the **2 PLAYER** button if you want to play cooperatively and let the second player pick a character after the first. Once player one has chosen, the demo pauses until player two selects their character.
4. Use the following controls:
   - **Left/Right Arrows** – Move your character.
   - **Up Arrow** – Jump over gaps or onto enemies.
   - **Space** – Attack with your weapon.
   - **Down Arrow** – Hold to block incoming hits.
   - **WASD/ZQSD + Ctrl** – Second player controls when two-player mode is enabled. In single player these are alternate keys for player one.
  - **P** – Pause or resume the action. When paused you can click the on-screen restart button to start over.
5. Defeat enemies and collect health packs to increase your score and survive as long as possible. When you fall or your health reaches zero the game ends. Save your name to the high score table if you qualify.

## Features

- **Character selection** – Seven different playable characters, each with their own sprite sheet.
- **Scrolling world** – The ground moves continuously with randomly generated gaps that you must jump across.
- **Dynamic difficulty** – Enemy and world speed gradually increase the longer you play.
- **Attacks and blocking** – Swing your weapon with <kbd>Space</kbd> or block with <kbd>ArrowDown</kbd> to mitigate damage.
- **Enemy AI** – Enemies walk, jump, fall into pits and die when hit or stomped.
- **Health system** – Start with three hearts. Every third defeated enemy drops a health pack.
- **Score & high scores** – Earn points for killing enemies. The top five scores are stored locally in your browser.
- **Pause functionality** – Press <kbd>P</kbd> at any time to pause the game. The pause screen includes a restart button and the game now automatically pauses when the browser tab loses focus.
- **Chiptune music and sound effects** – Background music and SFX with adjustable volume sliders.
- **Keyboard-only controls** – All interaction is via the keyboard, making the game easy to pick up.

## Testing

Run `npm test` to execute the Jest test that ensures `game.js` can load without errors in a simulated DOM environment.
