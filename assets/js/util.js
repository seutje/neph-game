(() => {
  const Game = window.Game || (window.Game = {});

  // Maximum number of high scores to store
  Game.MAX_HIGH_SCORES = 5;

  // Check if two axis-aligned rectangles overlap
  Game.rectsOverlap = function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  };

  // Determine which side of rectangle b is collided by a
  Game.collisionSide = function collisionSide(a, b) {
    const dx = a.x + a.width / 2 - (b.x + b.width / 2);
    const dy = a.y + a.height / 2 - (b.y + b.height / 2);
    const width = (a.width + b.width) / 2;
    const height = (a.height + b.height) / 2;
    if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
      const wy = width * dy;
      const hx = height * dx;
      if (wy > hx) {
        return wy > -hx ? "bottom" : "left";
      } else {
        return wy > -hx ? "right" : "top";
      }
    }
    return null;
  };

  // Retrieve saved high scores from localStorage
  Game.loadHighScores = function loadHighScores() {
    return JSON.parse(localStorage.getItem("highScores") || "[]");
  };

  // Persist high scores array to localStorage
  Game.saveHighScores = function saveHighScores(scores) {
    localStorage.setItem("highScores", JSON.stringify(scores));
  };

  // Check if a given score should be recorded
  Game.qualifiesForHighScore = function qualifiesForHighScore(score) {
    const scores = Game.loadHighScores();
    return (
      scores.length < Game.MAX_HIGH_SCORES ||
      score > scores[scores.length - 1].score
    );
  };
})();
