const { loadGameDom } = require('./helpers');

test('player health never goes negative', async () => {
  const dom = await loadGameDom();
  const Game = dom.window.Game;
  Game._setHealthForTest(1);
  Game._hitPlayerForTest();
  expect(Game._getHealthForTest()).toBe(0);
  Game._hitPlayerForTest();
  expect(Game._getHealthForTest()).toBe(0);
});
