const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const resetBtn = document.getElementById("resetBtn");
const scoreContainer = document.getElementById("scoreContainer");
const highScoreList = document.getElementById("highScoreList");
const nameEntry = document.getElementById("nameEntry");
const nameInput = document.getElementById("nameInput");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const pauseOverlay = document.getElementById("pauseOverlay");
const characterSelectionDiv = document.getElementById("characterSelection");
const selectNephBtn = document.getElementById("selectNeph");
const selectTurfBtn = document.getElementById("selectTurf");
const selectSeugeBtn = document.getElementById("selectSeuge");
const selectJerpBtn = document.getElementById("selectJerp");
const selectSmonkBtn = document.getElementById("selectSmonk");
const selectNitroBtn = document.getElementById("selectNitro");
const selectZeniaBtn = document.getElementById("selectZenia");
let selectedCharacter = "Neph";
const MAX_HIGH_SCORES = 5;

const characters = ["Neph", "Turf", "Seuge", "Jerp", "Smonk", "Nitro", "Zenia"];
const spriteCache = {};

const gravity = 0.5;
const groundY = 250;
const CLOUD_SPEED = 0.2;
const clouds = [
  { x: 100, y: 60 },
  { x: 300, y: 80 },
  { x: 500, y: 50 }
];

const BASE_ENEMY_SPEED = -1.5;
const ENEMY_SPEED_INCREMENT = 8 / 60;
const BASE_SPAWN_INTERVAL = 120;

const sprite = new Image();
const FRAME_WIDTH = 70;
const FRAME_HEIGHT = 90;
const SPRITE_PADDING = 13;
const SHEET_OFFSET_X = 15;
const SHEET_OFFSET_Y = 9;
const HITBOX_SCALE = 0.7;
const ENEMY_OFFSET_Y = 3;
const DEBUG = false;
const ATTACK_DURATION_FRAMES = 12; // 0.2s at 60fps
const ATTACK_COOLDOWN_FRAMES = 6;  // 0.1s at 60fps
const BLOCK_DURATION_FRAMES = 30; // 0.5s at 60fps
const BLOCK_COOLDOWN_FRAMES = 6;  // 0.1s at 60fps
let score = 0;
let health = 3;
let gameOver = false;
let animationId;
let paused = false;

let frameCount = 0;
let gameStartTime = Date.now();
let totalPausedTime = 0;
let pauseStartTime = 0;
let enemyKillCount = 0;
let healthPacks = [];

class HealthPack {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.radius = 10;
    this.createdAt = Date.now();
  }

  update() {
    this.vy += gravity;
    this.y += this.vy;
    if (this.y + this.radius > groundY + 75) {
      this.y = groundY + 75 - this.radius;
      this.vy = 0;
    }
  }

  draw() {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function collisionSide(a, b) {
  const dx = a.x + a.width / 2 - (b.x + b.width / 2);
  const dy = a.y + a.height / 2 - (b.y + b.height / 2);
  const width = (a.width + b.width) / 2;
  const height = (a.height + b.height) / 2;
  if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
    const wy = width * dy;
    const hx = height * dx;
    if (wy > hx) {
      return wy > -hx ? "top" : "left";
    } else {
      return wy > -hx ? "right" : "bottom";
    }
  }
  return null;
}
const player = {
  x: 50,
  y: groundY,
  width: 64,
  height: 85,
  vx: 0,
  vy: 0,
  frame: 0,
  direction: 1,
  jumping: false,
  attacking: false,
  blocking: false,
  attackTimer: 0,
  cooldown: 0,
  blockTimer: 0,
  blockCooldown: 0,
  invincible: false,
  invincibility: 0,
  attack() {
    if (!this.attacking && this.cooldown <= 0) {
      this.attacking = true;
      this.attackTimer = ATTACK_DURATION_FRAMES;
    }
  },
  block() {
    if (!this.blocking && this.blockCooldown <= 0) {
      this.blocking = true;
      this.blockTimer = BLOCK_DURATION_FRAMES;
    }
  },
  update() {
    if (this.invincible) {
      this.invincibility--;
      if (this.invincibility <= 0) {
        this.invincible = false;
      }
    }
    if (this.attacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        this.attacking = false;
        this.cooldown = ATTACK_COOLDOWN_FRAMES;
      }
    } else if (this.cooldown > 0) {
      this.cooldown--;
    }

    if (this.blocking) {
      this.blockTimer--;
      if (this.blockTimer <= 0) {
        this.blocking = false;
        this.blockCooldown = BLOCK_COOLDOWN_FRAMES;
      }
    } else if (this.blockCooldown > 0) {
      this.blockCooldown--;
    }
    this.vy += gravity;
    this.y += this.vy;
    if (this.y < 0) {
      this.y = 0;
      this.vy = 0;
    }
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.jumping = false;
    }
    this.x += this.vx;
    if (this.x < 0) {
      this.x = 0;
    } else if (this.x + this.width > canvas.width) {
      this.x = canvas.width - this.width;
    }
  },
  draw() {
    let frameY = 0;
    if (this.attacking) {
      frameY = 0;
      this.frame = 3;
    } else if (this.jumping) {
      frameY = 0;
      this.frame = 2;
    } else if (this.blocking) {
      frameY = 1;
      this.frame = 3;
    } else if (this.vx !== 0) {
      frameY = 0;
      this.frame = (this.frame + 0.1) % 3;
    } else {
      frameY = 1;
      this.frame = 0;
    }
    if (!this.invincible || Math.floor(frameCount / 5) % 2 === 0) {
      const yOffset = frameY === 0 ? 6 : 0;
      ctx.drawImage(
        sprite,
        SHEET_OFFSET_X + Math.floor(this.frame) * FRAME_WIDTH,
        SHEET_OFFSET_Y + frameY * FRAME_HEIGHT,
        FRAME_WIDTH,
        FRAME_HEIGHT,
        this.x - SPRITE_PADDING,
        this.y - SPRITE_PADDING + yOffset,
        FRAME_WIDTH,
        FRAME_HEIGHT
      );
    }
    if (DEBUG) {
      ctx.strokeStyle = "lime";
      ctx.strokeRect(
        this.x - SPRITE_PADDING,
        this.y - SPRITE_PADDING,
        FRAME_WIDTH,
        FRAME_HEIGHT
      );
    }
  },
  hit() {
    if (!this.invincible && !this.blocking) {
      this.invincible = true;
      this.invincibility = 60;
      this.vy = -8;
      this.jumping = true;
      health--;
      if (health < 1) {
        gameOver = true;
      }
    }
  },
};

class Enemy {
  constructor(x, character) {
    this.character = character;
    this.sprite = spriteCache[character.toLowerCase()];
    this.x = x;
    this.y = groundY;
    this.baseSpeed = BASE_ENEMY_SPEED;
    this.vx = BASE_ENEMY_SPEED;
    this.vy = 0;
    this.jumping = false;
    this.frame = 0;
    this.state = "walk";
    this.deathTime = null; // time when the enemy entered the dead state
  }
  update() {
    if (this.state === "walk") {
      if (!this.jumping && Math.random() < 0.01) {
        this.vy = -10;
        this.jumping = true;
      }
      this.vy += gravity;
      this.y += this.vy;
      if (this.y >= groundY) {
        this.y = groundY;
        this.vy = 0;
        this.jumping = false;
      }
      const elapsedSeconds = (Date.now() - gameStartTime - totalPausedTime) / 1000;
      const multiplier = 1 + ENEMY_SPEED_INCREMENT * elapsedSeconds;
      this.vx = this.baseSpeed * multiplier;
      this.x += this.vx;
      this.frame = (this.frame + 0.1) % 2;
    } else if (this.state === "hit") {
      this.frame = 2;
      if (!this.deathTimeout) {
        // transition to dead after short hit reaction
        this.deathTimeout = setTimeout(() => {
          this.state = "dead";
          this.deathTime = Date.now();
        }, 500);
      }
    } else if (this.state === "dead") {
      // remain on the final frame for 0.3s
      if (Date.now() - this.deathTime >= 300) {
        this.state = "remove";
      }
    }
  }
  draw() {
    let frameY = 2;
    let frameX = 0;
    if (this.state === "walk") {
      frameX = Math.floor(this.frame);
    } else if (this.state === "hit") {
      frameX = 2;
    } else {
      frameX = 3;
    }
    ctx.save();
    ctx.translate(this.x + FRAME_WIDTH / 2, this.y + FRAME_HEIGHT / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(
      this.sprite,
      SHEET_OFFSET_X + frameX * FRAME_WIDTH,
      SHEET_OFFSET_Y + ENEMY_OFFSET_Y + frameY * FRAME_HEIGHT,
      FRAME_WIDTH,
      FRAME_HEIGHT,
      -FRAME_WIDTH / 2 - SPRITE_PADDING,
      -FRAME_HEIGHT / 2 - SPRITE_PADDING,
      FRAME_WIDTH,
      FRAME_HEIGHT
    );
    if (DEBUG) {
      ctx.strokeStyle = "lime";
      ctx.strokeRect(
        -FRAME_WIDTH / 2 - SPRITE_PADDING,
        -FRAME_HEIGHT / 2 - SPRITE_PADDING,
        FRAME_WIDTH,
        FRAME_HEIGHT
      );
    }
    ctx.restore();
  }
}

const keys = {};
document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "p") {
    if (!gameOver) {
      paused = !paused;
      if (paused) {
        pauseStartTime = Date.now();
        cancelAnimationFrame(animationId);
        pauseOverlay.style.display = "block";
      } else {
        totalPausedTime += Date.now() - pauseStartTime;
        pauseOverlay.style.display = "none";
        animationId = requestAnimationFrame(gameLoop);
      }
    }
  } else {
    if (e.key === " " && !keys[e.key]) {
      player.attack();
    }
    if (e.key === "ArrowDown" && !keys[e.key]) {
      player.block();
    }
    keys[e.key] = true;
  }
});
document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

let enemies = [];
let spawnTimer = 0;
function loadHighScores() {
  return JSON.parse(localStorage.getItem("highScores") || "[]");
}

function saveHighScores(scores) {
  localStorage.setItem("highScores", JSON.stringify(scores));
}

function renderHighScores() {
  const scores = loadHighScores();
  highScoreList.innerHTML = scores.map(s => `<li>${s.name}: ${s.score}</li>`).join("");
}

function qualifiesForHighScore(s) {
  const scores = loadHighScores();
  return scores.length < MAX_HIGH_SCORES || s > scores[scores.length - 1].score;
}
function drawScore() {
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 10, 20);
}

function drawHealth() {
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.textAlign = "right";
  ctx.fillText("Health: " + health, canvas.width - 10, 20);
}

function updateClouds() {
  clouds.forEach(c => {
    c.x -= CLOUD_SPEED;
    if (c.x < -60) {
      c.x = canvas.width + 60;
    }
  });
}

function drawClouds() {
  ctx.fillStyle = "white";
  clouds.forEach(({ x, y }) => {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 20, y - 10, 25, 0, Math.PI * 2);
    ctx.arc(x + 40, y, 20, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  });
}

function drawGround() {
  const top = groundY - SPRITE_PADDING + FRAME_HEIGHT;
  ctx.fillStyle = "green";
  ctx.fillRect(0, top, canvas.width, canvas.height - top);
}

function showGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", canvas.width / 2, 40);
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, canvas.width / 2, 80);
  resetBtn.style.display = "block";
  scoreContainer.style.display = "block";
  renderHighScores();
  if (qualifiesForHighScore(score)) {
    nameEntry.style.display = "block";
    nameInput.value = selectedCharacter;
  } else {
    nameEntry.style.display = "none";
  }
}

function resetGame() {
  resetBtn.style.display = "none";
  scoreContainer.style.display = "none";
  nameEntry.style.display = "none";
  showCharacterSelection();
}

function initGame() {
  score = 0;
  health = 3;
  gameOver = false;
  enemies = [];
  spawnTimer = 0;
  enemyKillCount = 0;
  healthPacks = [];
  gameStartTime = Date.now();
  totalPausedTime = 0;
  player.x = 50;
  player.y = groundY;
  player.vx = 0;
  player.vy = 0;
  player.jumping = false;
  player.attacking = false;
  player.attackTimer = 0;
  player.cooldown = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  resetBtn.style.display = "none";
  scoreContainer.style.display = "none";
  nameEntry.style.display = "none";
  gameLoop();
}

function showCharacterSelection() {
  characterSelectionDiv.style.display = "block";
  canvas.style.display = "none";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startGame(character) {
  selectedCharacter = character;
  sprite.src = `assets/images/sprite-${character.toLowerCase()}.png`;
  characterSelectionDiv.style.display = "none";
  canvas.style.display = "block";
}


function gameLoop() {
  frameCount++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateClouds();
  drawClouds();
  drawGround();

  player.vx = 0;
  if (keys["ArrowLeft"]) player.vx = -2;
  if (keys["ArrowRight"]) player.vx = 2;
  if (keys["ArrowUp"] && !player.jumping) {
    player.vy = -10;
    player.jumping = true;
  }

  player.update();
  enemies.forEach(e => e.update());

  enemies.forEach(e => {
    const playerBox = {
      x: player.x,
      y: player.y,
      width: FRAME_WIDTH - SPRITE_PADDING * 3,
      height: FRAME_HEIGHT - SPRITE_PADDING * 3,
    };
    const enemyBox = {
      x: e.x,
      y: e.y,
      width: FRAME_WIDTH - SPRITE_PADDING * 3,
      height: FRAME_HEIGHT - SPRITE_PADDING * 3,
    };
    if (rectsOverlap(playerBox, enemyBox)) {
      const side = collisionSide(playerBox, enemyBox);
      if (player.attacking && e.state === "walk") {
        e.state = "hit";
        score += 1;
        enemyKillCount++;
        if (enemyKillCount % 3 === 0) {
          healthPacks.push(new HealthPack(e.x, e.y));
        }
      } else if (!player.attacking && e.state === "walk" && !player.invincible) {
        player.hit();
      }
    }
  });

  spawnTimer++;
  const elapsedSeconds = (Date.now() - gameStartTime - totalPausedTime) / 1000;
  const spawnInterval = BASE_SPAWN_INTERVAL / (1 + ENEMY_SPEED_INCREMENT * elapsedSeconds);
  if (spawnTimer > spawnInterval) {
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    enemies.push(new Enemy(canvas.width, randomCharacter));
    spawnTimer = 0;
  }

  player.draw();
  enemies.forEach(e => e.draw());
  healthPacks.forEach(hp => hp.update());
  healthPacks.forEach(hp => hp.draw());

  // remove enemies after their death animation has finished
  enemies = enemies.filter(e => e.state !== "remove");

  // Update and filter health packs
  const now = Date.now();
  healthPacks = healthPacks.filter(hp => {
    const playerBox = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
    };
    const packBox = {
      x: hp.x - hp.radius,
      y: hp.y - hp.radius,
      width: hp.radius * 2,
      height: hp.radius * 2,
    };

    if (rectsOverlap(playerBox, packBox)) {
      health++;
      return false; // Remove pack
    }

    return now - hp.createdAt < 500; // Keep pack if less than 0.5s old
  });

  drawScore();
  drawHealth();

  if (!gameOver) {
    animationId = requestAnimationFrame(gameLoop);
  } else {
    showGameOver();
  }
}

resetBtn.addEventListener("click", resetGame);
saveScoreBtn.addEventListener("click", () => {
  const name = nameInput.value.substring(0, 24) || "Anonymous";
  let scores = loadHighScores();
  scores.push({ name, score });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, MAX_HIGH_SCORES);
  saveHighScores(scores);
  renderHighScores();
  nameEntry.style.display = "none";
});

selectNephBtn.addEventListener("click", () => startGame("Neph"));
selectTurfBtn.addEventListener("click", () => startGame("Turf"));
selectSeugeBtn.addEventListener("click", () => startGame("Seuge"));
selectJerpBtn.addEventListener("click", () => startGame("Jerp"));
selectSmonkBtn.addEventListener("click", () => startGame("Smonk"));
selectNitroBtn.addEventListener("click", () => startGame("Nitro"));
selectZeniaBtn.addEventListener("click", () => startGame("Zenia"));

sprite.onload = () => {
  initGame();
};

function preload() {
  let loaded = 0;
  for (const char of characters) {
    const img = new Image();
    img.src = `assets/images/sprite-${char.toLowerCase()}.png`;
    img.onload = () => {
      loaded++;
      if (loaded === characters.length) {
        showCharacterSelection();
      }
    };
    spriteCache[char.toLowerCase()] = img;
  }
}

preload();