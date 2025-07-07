# AGENTS

This file provides guidance for working with the Neph Game repository.

## Project overview

The project is a small browser-based platform game. All game assets live in the
`assets/` directory and the entry point is `game.html`. JavaScript files used by
the game can be found under `assets/js/`.

## Running the game

Open `game.html` directly in a modern web browser. There is no build step.

## Installing dependencies

If you want to execute the test suite, install the dev dependencies first:

```bash
npm install
```

## Running tests

Run the Jest-based suite with:

```bash
npm test
```

The tests under the `test/` directory load the game using `jsdom` and verify
the game logic and health system. Make sure the tests pass before committing
changes.
