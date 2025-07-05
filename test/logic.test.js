const { loadGameDom } = require('./helpers');

async function setup() {
  const dom = await loadGameDom();
  dom.window.localStorage.clear();
  return dom;
}

test('rectsOverlap detects collisions correctly', async () => {
  const dom = await setup();
  const { rectsOverlap } = dom.window.Game;
  expect(rectsOverlap(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 5, y: 5, width: 10, height: 10 }
  )).toBe(true);
  expect(rectsOverlap(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 20, y: 20, width: 10, height: 10 }
  )).toBe(false);
});

test('collisionSide identifies side of collision', async () => {
  const dom = await setup();
  const { collisionSide } = dom.window.Game;
  const a = { x: 10, y: 10, width: 10, height: 10 };
  const bLeft = { x: 5, y: 10, width: 10, height: 10 };
  const bTop = { x: 10, y: 5, width: 10, height: 10 };
  expect(collisionSide(a, bLeft)).toBe('right');
  expect(collisionSide(a, bTop)).toBe('bottom');
});

test('qualifiesForHighScore evaluates scores', async () => {
  const dom = await setup();
  const { qualifiesForHighScore } = dom.window.Game;
  dom.window.localStorage.setItem('highScores', JSON.stringify([
    { name: 'A', score: 10 },
    { name: 'B', score: 9 },
    { name: 'C', score: 8 },
    { name: 'D', score: 7 },
    { name: 'E', score: 6 },
  ]));
  expect(qualifiesForHighScore(6)).toBe(false);
  expect(qualifiesForHighScore(7)).toBe(true);

  dom.window.localStorage.setItem('highScores', JSON.stringify([
    { name: 'A', score: 10 },
  ]));
  expect(qualifiesForHighScore(1)).toBe(true);
});

test('saveHighScores and loadHighScores round trip', async () => {
  const dom = await setup();
  const { saveHighScores, loadHighScores } = dom.window.Game;
  const arr = [{ name: 'Foo', score: 12 }];
  saveHighScores(arr);
  expect(loadHighScores()).toEqual(arr);
});
