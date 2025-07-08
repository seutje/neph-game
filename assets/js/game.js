(() => {
  const Game = window.Game || (window.Game = {});
  const {
    rectsOverlap,
    collisionSide,
    loadHighScores,
    saveHighScores,
    qualifiesForHighScore,
    MAX_HIGH_SCORES,
  } = Game;

  // DOM references and UI state
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  let characterSelectionVisible = false;
  let awaitingNameEntry = false;
  let enteredName = "";
  let saveScoreButtonRect = null;
  let gameOverScores = [];
  let showVolume = false;
  const SLIDER_HEIGHT = 6;
  const SLIDER_WIDTH = 100;
  const SLIDER_OFFSET_Y = 10;
  const sliders = {
    sfx: { x: 10, y: 30, width: SLIDER_WIDTH, value: 0.01 },
    music: { x: 10, y: 50, width: SLIDER_WIDTH, value: 0.01 },
  };
  let draggingSlider = null;
  let pauseSnapshot = null;
  let selectedCharacter1 = "Neph";
  let selectedCharacter2 = "Turf";
  let selectingPlayer = 1;
  let twoPlayerSelected = false;
  Game.autoplaying = false;
  let demoPreserve = false;

  // Names of all playable characters
  const characters = ["Neph", "Turf", "Seuge", "Jerp", "Smonk", "Nitro", "Zenia", "Beerceps"];
  const spriteCache = {};

  // Physics constants
  const gravity = 0.5;
  // Raised ground level by 30px
  const groundY = 220;
  const CLOUD_SPEED = 0.2;
  let worldSpeed = 0;

  // Base speeds and difficulty scaling
  const BASE_ENEMY_SPEED = -1.5;
  const ENEMY_SPEED_INCREMENT = 8 / 60;

  const BASE_WORLD_SPEED = -0.2;
  const WORLD_SPEED_INCREMENT = ENEMY_SPEED_INCREMENT;
  const SCROLL_START_DELAY = 10; // seconds before world begins scrolling
  const PLAYER_SPEED = 4;
  const BASE_SPAWN_INTERVAL = 120;

  // Sprites and bitmap font images
  const sprite = new Image();
  const sprite2 = new Image();
  const alphabetSprite = new Image();
  const numbersSprite = new Image();
  const heartSprite = new Image();
  const CHAR_WIDTH = 43;
  const CHAR_HEIGHT = 42;
  const CHAR_SCALE = 0.5;
  const DRAW_CHAR_WIDTH = CHAR_WIDTH * CHAR_SCALE;
  const DRAW_CHAR_HEIGHT = CHAR_HEIGHT * CHAR_SCALE;
  const CHAR_OFFSET_X = 23;
  const CHAR_OFFSET_Y = 32;
  const CHAR_COL_PADDING = 0;
  const CHAR_ROW_PADDING = 8;
  const CHAR_COLS = 6;
  const CHAR_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const NUMBER_MAP = "0123456789".split("");

  const CHAR_BTN_WIDTH = 160;
  const CHAR_BTN_HEIGHT = 30;
  const CHAR_BTN_SPACING = 10;
  const CHAR_BTN_TEXT_SCALE = 0.5;

  function drawSpriteText(text, x, y, align = "left", scale = 1) {
    text = String(text).toUpperCase();
    const charWidth = DRAW_CHAR_WIDTH * scale;
    const charHeight = DRAW_CHAR_HEIGHT * scale;
    let width = 0;
    for (const ch of text) {
      width += ch === " " ? charWidth / 2 : charWidth;
    }
    if (align === "center") {
      x -= width / 2;
    } else if (align === "right") {
      x -= width;
    }
    ctx.font = `${charHeight}px Arial`;
    ctx.textBaseline = "top";
    for (const ch of text) {
      if (ch === " ") {
        x += charWidth / 2;
        continue;
      }
      let idx = CHAR_MAP.indexOf(ch);
      let spriteImg = alphabetSprite;
      if (idx === -1) {
        idx = NUMBER_MAP.indexOf(ch);
        if (idx === -1) {
          ctx.fillText(ch, Math.round(x), y);
          x += charWidth;
          continue;
        }
        spriteImg = numbersSprite;
      }
      const col = idx % CHAR_COLS;
      const row = Math.floor(idx / CHAR_COLS);
      const sx = CHAR_OFFSET_X + col * (CHAR_WIDTH + CHAR_COL_PADDING);
      const sy = CHAR_OFFSET_Y + row * (CHAR_HEIGHT + CHAR_ROW_PADDING);
      ctx.drawImage(
        spriteImg,
        sx,
        sy,
        CHAR_WIDTH,
        CHAR_HEIGHT,
        Math.round(x),
        y,
        charWidth,
        charHeight
      );
      x += charWidth;
    }
  }
  const FRAME_WIDTH = 70;
  const FRAME_HEIGHT = 90;
  const SPRITE_PADDING = 13;
  const SHEET_OFFSET_X = 15;
  const SHEET_OFFSET_Y = 9;
  const HITBOX_SCALE = 0.7;
  const ENEMY_OFFSET_Y = 3;
  const DEBUG = false;

  let terrainBlocks = [];
  const TERRAIN_BLOCK_WIDTH = canvas.width;
  const TERRAIN_BLOCK_HEIGHT = canvas.height - (groundY - SPRITE_PADDING + FRAME_HEIGHT);
  let gaps = [];
  let terrainCursor = 0;
  const GAP_CHANCE = 0.20;
  const MAX_GAP_WIDTH = 100;
  const clouds = [
    { x: 100, y: 60 },
    { x: 300, y: 80 },
    { x: 500, y: 50 }
  ];
  let trees = [];
  // larger decorative trees
  const TREE_TRUNK_WIDTH = 30;
  const TREE_TRUNK_HEIGHT = 60;
  const TREE_CANOPY_SIZE = 60;
  // increase spacing so trees appear less frequently
  const TREE_MIN_SPACING = 360;
  const TREE_MAX_SPACING = 500;
  let bushes = [];
  const BUSH_WIDTH = 40;
  const BUSH_HEIGHT = 20;
  const BERRY_SIZE = 4;
  const BUSH_MIN_SPACING = 200;
  const BUSH_MAX_SPACING = 350;
  const GROUND_SURFACE_Y = groundY - SPRITE_PADDING + FRAME_HEIGHT;
  const ATTACK_DURATION_FRAMES = 12; // 0.2s at 60fps
  const ATTACK_COOLDOWN_FRAMES = 6;  // 0.1s at 60fps
  const BLOCK_DURATION_FRAMES = 30; // 0.5s at 60fps
  const BLOCK_COOLDOWN_FRAMES = 6;  // 0.1s at 60fps
  let score = 0;
  let health = 3;
  let health2 = 3;
  let twoPlayerMode = false;
  let gameOver = false;
  let animationId;
  let paused = false;
  let autoPaused = false;

  function maybeEndGame() {
    if (twoPlayerMode) {
      if (health < 1 && health2 < 1) {
        gameOver = true;
      }
    } else if (health < 1) {
      gameOver = true;
    }
  }


  const MAX_FPS = 60;
  const FRAME_DURATION = 1000 / MAX_FPS;
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let gameStartTime = Date.now();
  let totalPausedTime = 0;
  let pauseStartTime = 0;
  let enemyKillCount = 0;
  let healthPacks = [];
  // Small pickup that restores one health when touched

  class HealthPack {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vy = 0;
      this.radius = 20;
      this.createdAt = Date.now();
      this.picked = false;
      this.pickupTime = 0;
    }

    update() {
      if (this.picked) {
        this.y += this.vy;
      } else {
        this.vy += gravity;
        this.y += this.vy;
        if (this.y + this.radius > groundY + 75) {
          this.y = groundY + 75 - this.radius;
          this.vy = 0;
        }
      }
    }

    draw() {
      if (this.picked) {
        const elapsed = Date.now() - this.pickupTime;
        ctx.save();
        ctx.globalAlpha = 1 - elapsed / 500;
        ctx.drawImage(heartSprite, this.x - 20, this.y - 20, 40, 40);
        ctx.restore();
      } else {
        ctx.drawImage(heartSprite, this.x - 20, this.y - 20, 40, 40);
      }
    }
  }
  // Factory for player objects controlling character state and behavior

  function createPlayer(getHealth, setHealth, spriteImg) {
    return {
      sprite: spriteImg,
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
      touchingLeft: false,
      fellInGap: false,
      attack() {
        if (!this.attacking && this.cooldown <= 0) {
          this.attacking = true;
          this.attackTimer = ATTACK_DURATION_FRAMES;
          Game.playAttackSound();
        }
      },
      block() {
        if (!this.blocking && this.blockCooldown <= 0) {
          this.blocking = true;
          this.blockTimer = BLOCK_DURATION_FRAMES;
        }
      },
      update() {
        if (getHealth() < 1) return;
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
          const centerX = this.x + this.width / 2;
          const overGap = gaps.some(g => centerX >= g.x && centerX <= g.x + g.width);
          if (!overGap && !this.fellInGap) {
            this.y = groundY;
            this.vy = 0;
            this.jumping = false;
          } else {
            this.fellInGap = this.fellInGap || overGap;
          }
        }
        if (this.y > canvas.height) {
          setHealth(0);
          maybeEndGame();
        }
        this.x += this.vx + worldSpeed;
        if (this.x < 0) {
          this.x = 0;
          if (!this.touchingLeft) {
            this.touchingLeft = true;
            this.hit();
          }
        } else {
          this.touchingLeft = false;
          if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
          }
        }
      },
      draw() {
        if (getHealth() < 1) return;
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
            this.sprite,
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
          const newHealth = Math.max(0, getHealth() - 1);
          setHealth(newHealth);
          const willDie = newHealth < 1;
          if (!willDie) {
            this.invincible = true;
            this.invincibility = 60;
          }
          this.vy = -8;
          this.jumping = true;
          Game.playDamageSound();
          if (willDie) {
            maybeEndGame();
          }
        }
      },
    };
  }

  const player = createPlayer(() => health, v => { health = v; }, sprite);
  let player2 = createPlayer(() => health2, v => { health2 = v; }, sprite2);
  // Simple enemy entity with basic walking and death states

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
      this.fellInGap = false;
    }
    update() {
      if (this.state === "walk") {
        if (!this.jumping && this.y >= groundY && Math.random() < 0.01) {
          this.vy = -10;
          this.jumping = true;
        }
        const elapsedSeconds = (Date.now() - gameStartTime - totalPausedTime) / 1000;
        const multiplier = 1 + ENEMY_SPEED_INCREMENT * elapsedSeconds;
        this.vx = this.baseSpeed * multiplier + worldSpeed;

        const prevCenterX = this.x + FRAME_WIDTH / 2;
        this.x += this.vx;
        const newCenterX = this.x + FRAME_WIDTH / 2;

        const prevY = this.y;
        this.vy += gravity;
        this.y += this.vy;

        if (this.y >= groundY) {
          const startX = Math.min(prevCenterX, newCenterX);
          const endX = Math.max(prevCenterX, newCenterX);
          const overGap = gaps.some(g => endX >= g.x && startX <= g.x + g.width);
          if (!overGap && !this.fellInGap && prevY <= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.jumping = false;
          } else {
            this.fellInGap = this.fellInGap || overGap;
            if (overGap) {
              // enemy is falling into a gap
              this.jumping = true;
            }
          }
        }
        if (this.y > canvas.height) {
          if (this.state === "walk") {
            this.state = "dead";
            this.deathTime = Date.now();
          }
        }
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

  function resetKeys() {
    for (const k in keys) {
      keys[k] = false;
    }
  }

  function pauseGame() {
    if (paused || gameOver) return;
    paused = true;
    pauseStartTime = Date.now();
    cancelAnimationFrame(animationId);
    pauseSnapshot = document.createElement("canvas");
    pauseSnapshot.width = canvas.width;
    pauseSnapshot.height = canvas.height;
    pauseSnapshot.getContext("2d").drawImage(canvas, 0, 0);
    drawPauseScreen();
  }

  function resumeGame() {
    if (!paused || gameOver) return;
    paused = false;
    pauseSnapshot = null;
    totalPausedTime += Date.now() - pauseStartTime;
    animationId = requestAnimationFrame(gameLoop);
  }
  document.addEventListener("keydown", e => {
    if (awaitingNameEntry) {
      if (e.key === "Backspace") {
        enteredName = enteredName.slice(0, -1);
      } else if (e.key === "Enter") {
        saveEnteredScore();
      } else if (e.key.length === 1) {
        enteredName += e.key;
        if (enteredName.length > 24) {
          enteredName = enteredName.slice(0, 24);
        }
      }
      drawGameOverScreen(gameOverScores);
      return;
    }
    if (e.key.toLowerCase() === "p") {
      if (!gameOver) {
        if (paused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
    } else {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === " " && !keys[key]) {
        player.attack();
      }
      if (key === "Control" && !keys[key]) {
        if (twoPlayerMode) {
          player2.attack();
        } else {
          player.attack();
        }
      }
      if (key === "ArrowDown" && !keys[key]) {
        player.block();
      }
      if (key === "s" && !keys[key]) {
        if (twoPlayerMode) {
          player2.block();
        } else {
          player.block();
        }
      }
      keys[key] = true;
    }
  });
  document.addEventListener("keyup", e => {
    if (awaitingNameEntry) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[key] = false;
  });

  let enemies = [];
  let spawnTimer = 0;

  function autoPlayAI() {
    player.vx = PLAYER_SPEED;
    const centerX = player.x + player.width / 2;
    const lookAhead = 50;
    const gapAhead = gaps.find(g => g.x > centerX && g.x - centerX < lookAhead);
    if (gapAhead && !player.jumping) {
      player.vy = -10;
      player.jumping = true;
      Game.playJumpSound();
    }
    const enemyAhead = enemies.find(e => e.x > player.x && e.x - player.x < lookAhead && e.state === "walk");
    if (enemyAhead && !player.attacking) {
      player.attack();
    }
  }

  function drawScore() {
    ctx.fillStyle = "black";
    drawSpriteText("SCORE " + score, 10, 10, "left");
  }

  function drawHealth() {
    ctx.fillStyle = "black";
    if (twoPlayerMode) {
      const x = canvas.width - 10;
      const lineHeight = DRAW_CHAR_HEIGHT + 4;
      drawSpriteText(`P1 ${health}`, x, 10, "right");
      drawSpriteText(`P2 ${health2}`, x, 10 + lineHeight, "right");
    } else {
      drawSpriteText("HEALTH " + health, canvas.width - 10, 10, "right");
    }
  }

  function drawSlider(slider, label) {
    const sliderY = slider.y + SLIDER_OFFSET_Y;
    ctx.fillStyle = "black";
    ctx.fillRect(slider.x, sliderY, slider.width, SLIDER_HEIGHT);
    const handleX = slider.x + (slider.value / 0.1) * slider.width;
    ctx.fillStyle = "white";
    ctx.fillRect(handleX - 2, sliderY - 2, 4, SLIDER_HEIGHT + 4);
    ctx.fillStyle = "black";
    drawSpriteText(
      label,
      slider.x + slider.width + 5,
      slider.y + SLIDER_HEIGHT,
      "left",
      0.5
    );
  }

  function drawVolumeSliders() {
    if (!showVolume) return;
    drawSlider(sliders.sfx, "SFX");
    drawSlider(sliders.music, "MUSIC");
  }

  function drawHighScoresCanvas(scores = loadHighScores()) {
    ctx.fillStyle = "white";
    drawSpriteText("HIGH SCORES", canvas.width / 2, 120, "center");
    scores.forEach((s, i) => {
      const y = 150 + i * 25;
      drawSpriteText(`${s.name} ${s.score}`, canvas.width / 2, y, "center");
    });
  }

  function drawNameEntry() {
    const inputWidth = 160;
    const inputHeight = 20;
    const inputX = (canvas.width - inputWidth) / 2;
    const inputY = 250;
    ctx.fillStyle = "white";
    ctx.fillRect(inputX, inputY, inputWidth, inputHeight);
    ctx.strokeStyle = "black";
    ctx.strokeRect(inputX, inputY, inputWidth, inputHeight);
    ctx.fillStyle = "black";
    drawSpriteText(enteredName || "_", inputX + 4, inputY + 4, "left", 0.5);

    const btnWidth = 210;
    const btnHeight = CHAR_BTN_HEIGHT;
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = inputY + inputHeight + 10;
    const textY = btnY + (btnHeight - DRAW_CHAR_HEIGHT) / 2;
    drawSpriteText("SAVE SCORE", btnX + btnWidth / 2, textY, "center");
    ctx.strokeStyle = "white";
    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
    saveScoreButtonRect = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };
  }

  function drawGameOverScreen(scores) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    drawSpriteText("GAME OVER", canvas.width / 2, 40, "center");
    drawSpriteText("SCORE " + score, canvas.width / 2, 80, "center");
    drawHighScoresCanvas(scores);
    if (awaitingNameEntry) {
      drawNameEntry();
    }
    const btnX = (canvas.width - CHAR_BTN_WIDTH) / 2;
    const btnY = canvas.height - CHAR_BTN_HEIGHT - 10;
    const textY = btnY + (CHAR_BTN_HEIGHT - DRAW_CHAR_HEIGHT) / 2;
    drawSpriteText("RESTART", btnX + CHAR_BTN_WIDTH / 2, textY, "center");
    ctx.strokeStyle = "white";
    ctx.strokeRect(btnX, btnY, CHAR_BTN_WIDTH, CHAR_BTN_HEIGHT);
    restartButtonRect = { x: btnX, y: btnY, width: CHAR_BTN_WIDTH, height: CHAR_BTN_HEIGHT };
  }

  let restartButtonRect = null;
  let characterButtonRects = [];
  let twoPlayerButtonRect = null;

  function buildCharacterButtonRects() {
    const startX = (canvas.width - (CHAR_BTN_WIDTH * 2 + CHAR_BTN_SPACING)) / 2;
    const startY = 80;
    characterButtonRects = characters.map((name, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      return {
        name,
        x: startX + col * (CHAR_BTN_WIDTH + CHAR_BTN_SPACING),
        y: startY + row * (CHAR_BTN_HEIGHT + CHAR_BTN_SPACING),
        width: CHAR_BTN_WIDTH,
        height: CHAR_BTN_HEIGHT,
      };
    });
    const rows = Math.ceil(characters.length / 2);
    twoPlayerButtonRect = {
      x: (canvas.width - CHAR_BTN_WIDTH) / 2,
      y: startY + rows * (CHAR_BTN_HEIGHT + CHAR_BTN_SPACING) + 10,
      width: CHAR_BTN_WIDTH,
      height: CHAR_BTN_HEIGHT,
    };
  }

  function drawCharacterMenu() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    const title = twoPlayerSelected
      ? selectingPlayer === 1
        ? "PLAYER 1 SELECT"
        : "PLAYER 2 SELECT"
      : "SELECT YOUR CHARACTER";
    drawSpriteText(title, canvas.width / 2, 40, "center");

    characterButtonRects.forEach(({ name, x, y, width, height }) => {
      ctx.strokeStyle = "black";
      ctx.strokeRect(x, y, width, height);
      const textY = y + (height - DRAW_CHAR_HEIGHT * CHAR_BTN_TEXT_SCALE) / 2;
      drawSpriteText(name, x + width / 2, textY, "center", CHAR_BTN_TEXT_SCALE);
    });
    ctx.strokeStyle = "black";
    ctx.strokeRect(
      twoPlayerButtonRect.x,
      twoPlayerButtonRect.y,
      twoPlayerButtonRect.width,
      twoPlayerButtonRect.height
    );
    const modeLabel = "2 PLAYER";
    const textY =
      twoPlayerButtonRect.y +
      (twoPlayerButtonRect.height - DRAW_CHAR_HEIGHT * CHAR_BTN_TEXT_SCALE) / 2;
    drawSpriteText(
      modeLabel,
      twoPlayerButtonRect.x + twoPlayerButtonRect.width / 2,
      textY,
      "center",
      CHAR_BTN_TEXT_SCALE
    );
  }

  function drawPauseScreen() {
    if (pauseSnapshot) {
      ctx.drawImage(pauseSnapshot, 0, 0);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    drawSpriteText(
      "PAUSED",
      canvas.width / 2,
      canvas.height / 2 - DRAW_CHAR_HEIGHT / 2,
      "center"
    );
    drawVolumeSliders();
    const btnX = (canvas.width - CHAR_BTN_WIDTH) / 2;
    const btnY = canvas.height - CHAR_BTN_HEIGHT - 10;
    const textY = btnY + (CHAR_BTN_HEIGHT - DRAW_CHAR_HEIGHT) / 2;
    drawSpriteText("RESTART", btnX + CHAR_BTN_WIDTH / 2, textY, "center");
    ctx.strokeStyle = "black";
    ctx.strokeRect(btnX, btnY, CHAR_BTN_WIDTH, CHAR_BTN_HEIGHT);
    restartButtonRect = {
      x: btnX,
      y: btnY,
      width: CHAR_BTN_WIDTH,
      height: CHAR_BTN_HEIGHT,
    };
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

  function initTrees() {
    trees.length = 0;
    let x = 100;
    while (x < canvas.width * 2) {
      const gap = gaps.find(g => x >= g.x && x <= g.x + g.width);
      if (!gap) {
        trees.push({ x });
        x += TREE_MIN_SPACING + Math.random() * (TREE_MAX_SPACING - TREE_MIN_SPACING);
      } else {
        x = gap.x + gap.width + TREE_MIN_SPACING;
      }
    }
  }

  function updateTrees() {
    trees.forEach(t => {
      t.x += worldSpeed;
    });
    trees = trees.filter(t => t.x + TREE_CANOPY_SIZE > 0);
    let lastX = trees.length ? trees[trees.length - 1].x : 0;
    while (lastX < canvas.width * 2) {
      lastX += TREE_MIN_SPACING + Math.random() * (TREE_MAX_SPACING - TREE_MIN_SPACING);
      const gap = gaps.find(g => lastX >= g.x && lastX <= g.x + g.width);
      if (gap) {
        lastX = gap.x + gap.width + TREE_MIN_SPACING;
      }
      trees.push({ x: lastX });
    }
  }

  function drawTrees() {
    ctx.save();
    ctx.globalAlpha = 0.5;
    trees.forEach(t => {
      const trunkX = t.x - TREE_TRUNK_WIDTH / 2;
      const trunkY = GROUND_SURFACE_Y - TREE_TRUNK_HEIGHT;
      ctx.fillStyle = "brown";
      ctx.fillRect(trunkX, trunkY, TREE_TRUNK_WIDTH, TREE_TRUNK_HEIGHT);
      const canopyX = t.x - TREE_CANOPY_SIZE / 2;
      const canopyY = trunkY - TREE_CANOPY_SIZE;
      ctx.fillStyle = "green";
      ctx.fillRect(canopyX, canopyY, TREE_CANOPY_SIZE, TREE_CANOPY_SIZE);
      // canopy and trunk no longer outlined
    });
    ctx.restore();
  }

  function initBushes() {
    bushes.length = 0;
    let x = 80;
    while (x < canvas.width * 2) {
      const gap = gaps.find(g => x >= g.x && x <= g.x + g.width);
      if (!gap) {
        bushes.push({ x });
        x += BUSH_MIN_SPACING + Math.random() * (BUSH_MAX_SPACING - BUSH_MIN_SPACING);
      } else {
        x = gap.x + gap.width + BUSH_MIN_SPACING;
      }
    }
  }

  function updateBushes() {
    bushes.forEach(b => {
      b.x += worldSpeed;
    });
    bushes = bushes.filter(b => b.x + BUSH_WIDTH > 0);
    let lastX = bushes.length ? bushes[bushes.length - 1].x : 0;
    while (lastX < canvas.width * 2) {
      lastX += BUSH_MIN_SPACING + Math.random() * (BUSH_MAX_SPACING - BUSH_MIN_SPACING);
      const gap = gaps.find(g => lastX >= g.x && lastX <= g.x + g.width);
      if (gap) {
        lastX = gap.x + gap.width + BUSH_MIN_SPACING;
      }
      bushes.push({ x: lastX });
    }
  }

  function drawBushes() {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "green";
    bushes.forEach(b => {
      // skip drawing if the bush overlaps a gap
      const gap = gaps.find(g =>
        b.x + BUSH_WIDTH / 2 > g.x && b.x - BUSH_WIDTH / 2 < g.x + g.width
      );
      if (gap) return;
      const bx = b.x - BUSH_WIDTH / 2;
      const by = GROUND_SURFACE_Y - BUSH_HEIGHT;
      ctx.fillRect(bx, by, BUSH_WIDTH, BUSH_HEIGHT);
      ctx.fillStyle = "red";
      for (let i = 0; i < 3; i++) {
        const berryX = bx + (i + 1) * (BUSH_WIDTH / 4) - BERRY_SIZE / 2;
        let berryY = by + BUSH_HEIGHT / 3;
        if (i === 1) berryY += 2; // middle berry slightly lower
        ctx.fillRect(berryX, berryY, BERRY_SIZE, BERRY_SIZE);
      }
      ctx.fillStyle = "green";
    });
    ctx.restore();
  }

  function generateGaps() {
    while (terrainCursor < canvas.width * 3) {
      if (Math.random() < GAP_CHANCE) {
        const width = 40 + Math.random() * (MAX_GAP_WIDTH - 40);
        gaps.push({ x: terrainCursor, width });
        terrainCursor += width;
      } else {
        const groundWidth = 50 + Math.random() * 150;
        terrainCursor += groundWidth;
      }
    }
  }

  function initTerrain() {
    terrainBlocks = [];
    gaps = [];
    terrainCursor = canvas.width;
    let currentX = 0;
    while (currentX < canvas.width + TERRAIN_BLOCK_WIDTH) {
      terrainBlocks.push({ x: currentX, y: groundY - SPRITE_PADDING + FRAME_HEIGHT });
      currentX += TERRAIN_BLOCK_WIDTH;
    }
    generateGaps();
  }

  function drawGround() {
    ctx.fillStyle = "green";
    terrainBlocks.forEach(block => {
      ctx.fillRect(block.x, block.y, TERRAIN_BLOCK_WIDTH, canvas.height - block.y);
    });
    gaps.forEach(gap => {
      ctx.clearRect(gap.x, groundY, gap.width, canvas.height - groundY);
    });
  }

  function showGameOver() {
    Game.stopBackgroundMusic();
    Game.playDeathSound();
    gameOverScores = loadHighScores();
    awaitingNameEntry = qualifiesForHighScore(score);
    if (awaitingNameEntry) {
      enteredName = selectedCharacter1;
    }
    drawGameOverScreen(gameOverScores);
  }

  function saveEnteredScore() {
    const name = enteredName.substring(0, 24) || "Anonymous";
    gameOverScores.push({ name, score });
    gameOverScores.sort((a, b) => b.score - a.score);
    gameOverScores = gameOverScores.slice(0, MAX_HIGH_SCORES);
    saveHighScores(gameOverScores);
    awaitingNameEntry = false;
    drawGameOverScreen(gameOverScores);
  }

  function resetGame() {
    worldSpeed = 0;
    gameStartTime = Date.now();
    restartButtonRect = null;
    awaitingNameEntry = false;
    enteredName = "";
    Game.stopBackgroundMusic();
    showCharacterSelection(1);
  }

  function initGame() {
    score = 0;
    health = 3;
    health2 = 3;
    gameOver = false;
    enemies = [];
    spawnTimer = 0;
    enemyKillCount = 0;
    healthPacks = [];
    worldSpeed = 0;
    gameStartTime = Date.now();
    totalPausedTime = 0;
    player.x = 50;
    player.y = groundY;
    player.vx = 0;
    player.vy = 0;
    player.jumping = false;
    player.fellInGap = false;
    player.attacking = false;
    player.attackTimer = 0;
    player.cooldown = 0;
    player.touchingLeft = false;
    if (twoPlayerMode) {
      player2.x = 100;
      player2.y = groundY;
      player2.vx = 0;
      player2.vy = 0;
      player2.jumping = false;
      player2.fellInGap = false;
      player2.attacking = false;
      player2.attackTimer = 0;
      player2.cooldown = 0;
      player2.touchingLeft = false;
    }
    initTerrain();
    initTrees();
    initBushes();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastFrameTime = performance.now();
    gameLoop();
  }

  function showCharacterSelection(playerIndex = 1) {
    selectingPlayer = playerIndex;
    characterSelectionVisible = true;
    canvas.style.display = "block";
    showVolume = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    buildCharacterButtonRects();
    if (twoPlayerSelected && playerIndex === 2) {
      demoPreserve = true;
      return; // keep demo running in the background
    }
    cancelAnimationFrame(animationId);
    Game.autoplaying = false;
    startDemo(playerIndex !== 1);
  }

  function startGame(character, character2 = selectedCharacter2) {
    cancelAnimationFrame(animationId);
    selectedCharacter1 = character;
    selectedCharacter2 = character2;
    twoPlayerMode = twoPlayerSelected;
    const spritePath = `assets/images/sprite-${character.toLowerCase()}.png`;
    const alreadyLoaded = sprite.complete && sprite.src.endsWith(spritePath);
    sprite.src = spritePath;
    if (twoPlayerMode) {
      const spritePath2 = `assets/images/sprite-${character2.toLowerCase()}.png`;
      sprite2.src = spritePath2;
    }
    characterSelectionVisible = false;
    canvas.style.display = "block";
    showVolume = true;
    sliders.sfx.value = Game.sfxVolume;
    sliders.music.value = Game.musicVolume;
    Game.autoplaying = false;
    resetKeys();
    // Reset timing so regular play always begins at base speed
    gameStartTime = Date.now();
    worldSpeed = 0;
    // Ensure player velocity is cleared when starting real play
    player.vx = 0;
    player.vy = 0;
    Game.startBackgroundMusic();
    if (alreadyLoaded) {
      initGame();
    }
  }

  function startDemo(preserve = false) {
    demoPreserve = preserve;
    twoPlayerMode = false;
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    if (!demoPreserve) {
      selectedCharacter1 = randomCharacter;
    }
    const spritePath = `assets/images/sprite-${randomCharacter.toLowerCase()}.png`;
    const alreadyLoaded = sprite.complete && sprite.src.endsWith(spritePath);
    sprite.src = spritePath;
    Game.autoplaying = true;
    showVolume = false;
    resetKeys();
    Game.stopBackgroundMusic();
    // Reset time tracking so world speed starts from the baseline
    gameStartTime = Date.now();
    worldSpeed = 0;
    // Ensure player velocity resets between demo runs
    player.vx = 0;
    player.vy = 0;
    if (alreadyLoaded) {
      initGame();
    }
  }

  // Update scrolling ground blocks and generate new gaps

  function updateTerrain() {
    // Move existing blocks
    terrainBlocks.forEach(block => {
      block.x += worldSpeed;
    });
    gaps.forEach(gap => {
      gap.x += worldSpeed;
    });
    terrainCursor += worldSpeed;

    // Remove off-screen blocks
    terrainBlocks = terrainBlocks.filter(block => block.x + TERRAIN_BLOCK_WIDTH > 0);
    gaps = gaps.filter(gap => gap.x + gap.width > 0);

    // Generate new blocks off-screen
    const lastBlock = terrainBlocks[terrainBlocks.length - 1];
    if (!lastBlock || lastBlock.x < canvas.width) {
      terrainBlocks.push({ x: (lastBlock ? lastBlock.x : 0) + TERRAIN_BLOCK_WIDTH, y: groundY - SPRITE_PADDING + FRAME_HEIGHT });
    }
    generateGaps();
  }

  function gameLoop() {
    const currentTime = performance.now();
    const delta = currentTime - lastFrameTime;
    if (delta < FRAME_DURATION) {
      animationId = requestAnimationFrame(gameLoop);
      return;
    }
    lastFrameTime = currentTime;
    frameCount++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateClouds();
    drawClouds();

    const elapsedSeconds = (Date.now() - gameStartTime - totalPausedTime) / 1000;
    const scrollElapsed = elapsedSeconds - SCROLL_START_DELAY;
    if (scrollElapsed > 0) {
      worldSpeed = BASE_WORLD_SPEED * (1 + WORLD_SPEED_INCREMENT * scrollElapsed);
    } else {
      worldSpeed = 0;
    }
    if (player.x > canvas.width * 0.5 && player.vx > 0) {
      worldSpeed -= player.vx;
    }

    if (Game.autoplaying) {
      autoPlayAI();
    } else {
      if (keys["ArrowLeft"]) {
        player.vx = -PLAYER_SPEED;
      } else if (keys["ArrowRight"]) {
        player.vx = PLAYER_SPEED;
      } else if (!twoPlayerMode && (keys["a"] || keys["q"])) {
        player.vx = -PLAYER_SPEED;
      } else if (!twoPlayerMode && keys["d"]) {
        player.vx = PLAYER_SPEED;
      } else {
        player.vx = 0;
      }

      if ((keys["ArrowUp"] || (!twoPlayerMode && (keys["w"] || keys["z"]))) && !player.jumping) {
        player.vy = -10;
        player.jumping = true;
        Game.playJumpSound();
      }

      if (twoPlayerMode) {
        if (keys["a"] || keys["q"]) {
          player2.vx = -PLAYER_SPEED;
        } else if (keys["d"]) {
          player2.vx = PLAYER_SPEED;
        } else {
          player2.vx = 0;
        }

        if ((keys["w"] || keys["z"]) && !player2.jumping) {
          player2.vy = -10;
          player2.jumping = true;
          Game.playJumpSound();
        }
      }
    }

    player.update();
    if (twoPlayerMode) player2.update();
    enemies.forEach(e => {
      e.x += worldSpeed;
      e.update();
    });
    healthPacks.forEach(hp => {
      hp.x += worldSpeed;
      hp.update();
    });

    updateTerrain();
    updateTrees();
    updateBushes();
    drawGround();
    drawTrees();
    drawBushes();

    enemies.forEach(e => {
      const enemyBox = {
        x: e.x,
        y: e.y,
        width: FRAME_WIDTH - SPRITE_PADDING * 3,
        height: FRAME_HEIGHT - SPRITE_PADDING * 3,
      };
      if (health > 0) {
        const playerBox = {
          x: player.x,
          y: player.y,
          width: FRAME_WIDTH - SPRITE_PADDING * 3,
          height: FRAME_HEIGHT - SPRITE_PADDING * 3,
        };
        if (rectsOverlap(playerBox, enemyBox)) {
          const side = collisionSide(playerBox, enemyBox);
          if (e.state === "walk") {
            const stompKill = side === "top" && player.vy > 0;
            if (player.attacking || stompKill) {
              e.state = "hit";
              Game.playEnemyKillSound();
              score += 1;
              enemyKillCount++;
              if (enemyKillCount % 3 === 0) {
                healthPacks.push(new HealthPack(e.x, e.y));
              }
              if (stompKill) {
                player.vy = -10;
                player.jumping = true;
                player.fellInGap = false;
              }
            } else if (side !== "top" && !player.attacking && !player.invincible) {
              player.hit();
            }
          }
        }
      }
      if (twoPlayerMode && health2 > 0) {
        const p2Box = {
          x: player2.x,
          y: player2.y,
          width: FRAME_WIDTH - SPRITE_PADDING * 3,
          height: FRAME_HEIGHT - SPRITE_PADDING * 3,
        };
        if (rectsOverlap(p2Box, enemyBox)) {
          const side2 = collisionSide(p2Box, enemyBox);
          if (e.state === "walk") {
            const stomp2 = side2 === "top" && player2.vy > 0;
            if (player2.attacking || stomp2) {
              e.state = "hit";
              Game.playEnemyKillSound();
              score += 1;
              enemyKillCount++;
              if (enemyKillCount % 3 === 0) {
                healthPacks.push(new HealthPack(e.x, e.y));
              }
              if (stomp2) {
                player2.vy = -10;
                player2.jumping = true;
                player2.fellInGap = false;
              }
            } else if (side2 !== "top" && !player2.attacking && !player2.invincible) {
              player2.hit();
            }
          }
        }
      }
    });

    spawnTimer++;
    const spawnInterval = BASE_SPAWN_INTERVAL / (1 + ENEMY_SPEED_INCREMENT * elapsedSeconds);
    if (spawnTimer > spawnInterval) {
      const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
      enemies.push(new Enemy(canvas.width, randomCharacter));
      spawnTimer = 0;
    }

    player.draw();
    if (twoPlayerMode) player2.draw();
    enemies.forEach(e => e.draw());
    healthPacks.forEach(hp => hp.update());
    healthPacks.forEach(hp => hp.draw());

    // remove enemies after their death animation has finished
    enemies = enemies.filter(e => e.state !== "remove");

    // Update and filter health packs
    const now = Date.now();
    healthPacks = healthPacks.filter(hp => {
      const packBox = {
        x: hp.x - hp.radius,
        y: hp.y - hp.radius,
        width: hp.radius * 2,
        height: hp.radius * 2,
      };

      if (health > 0) {
        const p1Box = {
          x: player.x,
          y: player.y,
          width: player.width,
          height: player.height,
        };
        if (rectsOverlap(p1Box, packBox)) {
          if (!hp.picked) {
            health++;
            hp.picked = true;
            hp.pickupTime = now;
            hp.vy = -2;
            Game.playHealthPackSound();
          }
          return true;
        }
      }

      if (twoPlayerMode && health2 > 0) {
        const p2Box = {
          x: player2.x,
          y: player2.y,
          width: player2.width,
          height: player2.height,
        };
        if (rectsOverlap(p2Box, packBox)) {
          if (!hp.picked) {
            health2++;
            hp.picked = true;
            hp.pickupTime = now;
            hp.vy = -2;
            Game.playHealthPackSound();
          }
          return true;
        }
      }

      if (hp.picked) {
        return now - hp.pickupTime < 500;
      }
      return now - hp.createdAt < 1000;
    });

    drawScore();
    drawHealth();
    drawVolumeSliders();

    if (characterSelectionVisible) {
      drawCharacterMenu();
    }

    if (!gameOver) {
      animationId = requestAnimationFrame(gameLoop);
    } else {
      if (Game.autoplaying) {
        startDemo(demoPreserve);
        initGame();
      } else {
        showGameOver();
      }
    }
  }


  canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    function sliderHit(slider) {
      const sliderY = slider.y + SLIDER_OFFSET_Y;
      return (
        x >= slider.x &&
        x <= slider.x + slider.width &&
        y >= sliderY - 4 &&
        y <= sliderY + SLIDER_HEIGHT + 4
      );
    }

    if (awaitingNameEntry && saveScoreButtonRect) {
      if (
        x >= saveScoreButtonRect.x &&
        x <= saveScoreButtonRect.x + saveScoreButtonRect.width &&
        y >= saveScoreButtonRect.y &&
        y <= saveScoreButtonRect.y + saveScoreButtonRect.height
      ) {
        saveEnteredScore();
        return;
      }
    }

    if (showVolume) {
      if (sliderHit(sliders.sfx)) {
        sliders.sfx.value = ((x - sliders.sfx.x) / sliders.sfx.width) * 0.1;
        Game.sfxVolume = sliders.sfx.value;
        if (paused) drawPauseScreen();
        return;
      }
      if (sliderHit(sliders.music)) {
        sliders.music.value = ((x - sliders.music.x) / sliders.music.width) * 0.1;
        Game.musicVolume = sliders.music.value;
        if (paused) drawPauseScreen();
        return;
      }
    }

    if (characterSelectionVisible) {
      if (
        x >= twoPlayerButtonRect.x &&
        x <= twoPlayerButtonRect.x + twoPlayerButtonRect.width &&
        y >= twoPlayerButtonRect.y &&
        y <= twoPlayerButtonRect.y + twoPlayerButtonRect.height
      ) {
        twoPlayerSelected = !twoPlayerSelected;
        return;
      }
      for (const btn of characterButtonRects) {
        if (
          x >= btn.x &&
          x <= btn.x + btn.width &&
          y >= btn.y &&
          y <= btn.y + btn.height
        ) {
          if (twoPlayerSelected && selectingPlayer === 1) {
            selectedCharacter1 = btn.name;
            showCharacterSelection(2);
          } else if (twoPlayerSelected && selectingPlayer === 2) {
            selectedCharacter2 = btn.name;
            startGame(selectedCharacter1, selectedCharacter2);
          } else {
            startGame(btn.name);
          }
          break;
        }
      }
      return;
    }

    if (
      (gameOver || paused) &&
      restartButtonRect &&
      x >= restartButtonRect.x &&
      x <= restartButtonRect.x + restartButtonRect.width &&
      y >= restartButtonRect.y &&
      y <= restartButtonRect.y + restartButtonRect.height
    ) {
      if (paused) {
        paused = false;
        pauseSnapshot = null;
        totalPausedTime += Date.now() - pauseStartTime;
      }
      if (twoPlayerMode) {
        twoPlayerMode = false;
      }
      twoPlayerSelected = false;
      resetGame();
    }
  });

  canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    function sliderHit(slider) {
      const sliderY = slider.y + SLIDER_OFFSET_Y;
      return (
        x >= slider.x &&
        x <= slider.x + slider.width &&
        y >= sliderY - 4 &&
        y <= sliderY + SLIDER_HEIGHT + 4
      );
    }
    if (showVolume) {
      if (sliderHit(sliders.sfx)) {
        draggingSlider = sliders.sfx;
        draggingSlider.value = ((x - draggingSlider.x) / draggingSlider.width) * 0.1;
        Game.sfxVolume = draggingSlider.value;
        if (paused) drawPauseScreen();
      } else if (sliderHit(sliders.music)) {
        draggingSlider = sliders.music;
        draggingSlider.value = ((x - draggingSlider.x) / draggingSlider.width) * 0.1;
        Game.musicVolume = draggingSlider.value;
        if (paused) drawPauseScreen();
      }
    }
  });

  canvas.addEventListener("mousemove", e => {
    if (!draggingSlider) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    draggingSlider.value = ((x - draggingSlider.x) / draggingSlider.width) * 0.1;
    draggingSlider.value = Math.max(0, Math.min(0.1, draggingSlider.value));
    if (draggingSlider === sliders.sfx) {
      Game.sfxVolume = draggingSlider.value;
    } else {
      Game.musicVolume = draggingSlider.value;
    }
    if (paused) drawPauseScreen();
  });

  document.addEventListener("mouseup", () => {
    draggingSlider = null;
    if (paused) drawPauseScreen();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (!paused && !gameOver) {
        autoPaused = true;
        pauseGame();
      }
    } else if (autoPaused) {
      autoPaused = false;
      resumeGame();
    }
  });



  sprite.onload = () => {
    initGame();
  };

  function preload() {
    let loaded = 0;
    const total = characters.length + 3;
    for (const char of characters) {
      const img = new Image();
      img.src = `assets/images/sprite-${char.toLowerCase()}.png`;
      img.onload = () => {
        loaded++;
        if (loaded === total) {
          showCharacterSelection(1);
        }
      };
      spriteCache[char.toLowerCase()] = img;
    }
    alphabetSprite.src = "assets/images/sprite-alphabet.png";
    alphabetSprite.onload = () => {
      loaded++;
      if (loaded === total) {
        showCharacterSelection(1);
      }
    };
    numbersSprite.src = "assets/images/sprite-numbers.png";
    numbersSprite.onload = () => {
      loaded++;
      if (loaded === total) {
        showCharacterSelection(1);
      }
    };
    heartSprite.src = "assets/images/sprite-heart.png";
    heartSprite.onload = () => {
      loaded++;
      if (loaded === total) {
        showCharacterSelection(1);
      }
    };
  }

  Game.setTwoPlayerMode = v => { twoPlayerMode = v; };
  Game.getTwoPlayerMode = () => twoPlayerMode;
  // Testing helpers
  Game._getHealthForTest = () => health;
  Game._setHealthForTest = (v) => { health = v; };
  Game._hitPlayerForTest = () => player.hit();

  window.Game = Game;

  preload();
})();
