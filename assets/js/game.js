(() => {
  const Game = {};

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
  let showVolume = false;
  const SLIDER_HEIGHT = 6;
  const SLIDER_WIDTH = 100;
  const sliders = {
    sfx: { x: 10, y: 30, width: SLIDER_WIDTH, value: 0.01 },
    music: { x: 10, y: 50, width: SLIDER_WIDTH, value: 0.01 },
  };
  let draggingSlider = null;
  let selectedCharacter = "Neph";
  let autoplaying = false;
  function audioEnabled() {
    return !autoplaying;
  }
  const MAX_HIGH_SCORES = 5;

  const characters = ["Neph", "Turf", "Seuge", "Jerp", "Smonk", "Nitro", "Zenia", "Beerceps"];
  const spriteCache = {};

  const gravity = 0.5;
  const groundY = 250;
  const CLOUD_SPEED = 0.2;
  let worldSpeed = 0;

  const BASE_ENEMY_SPEED = -1.5;
  const ENEMY_SPEED_INCREMENT = 8 / 60;

  const BASE_WORLD_SPEED = -0.2;
  const WORLD_SPEED_INCREMENT = ENEMY_SPEED_INCREMENT;
  const PLAYER_SPEED = 4;
  const BASE_SPAWN_INTERVAL = 120;

  const sprite = new Image();
  const alphabetSprite = new Image();
  const numbersSprite = new Image();
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
  const ATTACK_DURATION_FRAMES = 12; // 0.2s at 60fps
  const ATTACK_COOLDOWN_FRAMES = 6;  // 0.1s at 60fps
  const BLOCK_DURATION_FRAMES = 30; // 0.5s at 60fps
  const BLOCK_COOLDOWN_FRAMES = 6;  // 0.1s at 60fps
  let score = 0;
  let health = 3;
  let gameOver = false;
  let animationId;
  let paused = false;

  // Web Audio API setup for simple chiptune background music
  let audioCtx;
  let musicInterval;
  let musicVolume = 0.01;
  let sfxVolume = 0.01;
  const musicNotes = [
    // set 1: original melody
    130.81, 146.83, 164.82, 174.62, 196.0, 220.0, 196.0, 164.82,
    // set 2: repeat
    130.81, 146.83, 164.82, 174.62, 196.0, 220.0, 196.0, 164.82,
    // set 3: reversed
    164.82, 196.0, 220.0, 196.0, 174.62, 164.82, 146.83, 130.81,
    // set 4: alternate progression
    196.0, 220.0, 246.94, 220.0, 196.0, 174.62, 164.82, 146.83,
    // set 5: one octave higher
    261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 392.0, 329.63,
    // set 6: octave high reversed
    329.63, 392.0, 440.0, 392.0, 349.23, 329.63, 293.66, 261.63,
    // set 7: return to original
    130.81, 146.83, 164.82, 174.62, 196.0, 220.0, 196.0, 164.82,
    // set 8: reversed to finish
    164.82, 196.0, 220.0, 196.0, 174.62, 164.82, 146.83, 130.81
  ];

  function playNote(freq, duration = 0.3, volume = musicVolume) {
    if (!audioEnabled() || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  }

  function playKick(volume = musicVolume) {
    if (!audioEnabled() || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 10, audioCtx.currentTime + 0.01);
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.stop(audioCtx.currentTime + 0.11);
  }

  function playSnare(volume = musicVolume) {
    if (!audioEnabled() || !audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 0.2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 5, audioCtx.currentTime + 0.01);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    noise.stop(audioCtx.currentTime + 0.2);
  }

  function startBackgroundMusic() {
    if (!audioEnabled()) {
      return;
    }
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    let idx = 0;
    let beat = 0;
    clearInterval(musicInterval);
    musicInterval = setInterval(() => {
      playNote(musicNotes[idx % musicNotes.length], 0.3, musicVolume);
      if (beat % 4 === 0) {
        playKick(musicVolume);
      } else if (beat % 4 === 2) {
        playSnare(musicVolume);
      }
      idx++;
      beat++;
    }, 300);
  }

  function playJumpSound() {
    if (!audioEnabled()) return;
    // quick up-beep
    playNote(329.63, 0.1, sfxVolume);
  }

  function playAttackSound() {
    if (!audioEnabled()) return;
    // short lower tone for attack
    playNote(261.63, 0.1, sfxVolume);
  }

  function playDamageSound() {
    if (!audioEnabled()) return;
    // deeper tone when taking damage
    playNote(196.0, 0.1, sfxVolume);
  }

  function playHealthPackSound() {
    if (!audioEnabled()) return;
    // quick ascending tones for picking up health
    playNote(392.0, 0.07, sfxVolume);
    setTimeout(() => playNote(523.25, 0.07, sfxVolume), 70);
  }

  function playEnemyKillSound() {
    if (!audioEnabled()) return;
    // two descending tones for killing an enemy
    playNote(329.63, 0.1, sfxVolume);
    setTimeout(() => playNote(261.63, 0.1, sfxVolume), 100);
  }

  function playDeathSound() {
    if (!audioEnabled()) return;
    // descending tones when the player dies
    playNote(261.63, 0.15, sfxVolume);
    setTimeout(() => playNote(196.0, 0.15, sfxVolume), 150);
    setTimeout(() => playNote(130.81, 0.15, sfxVolume), 300);
    setTimeout(() => playNote(98.0, 0.15, sfxVolume), 450);
  }

  function stopBackgroundMusic() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

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
      // Canvas coordinates increase downward, so flip the vertical checks
      if (wy > hx) {
        return wy > -hx ? "bottom" : "left";
      } else {
        return wy > -hx ? "right" : "top";
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
    touchingLeft: false,
    attack() {
      if (!this.attacking && this.cooldown <= 0) {
        this.attacking = true;
        this.attackTimer = ATTACK_DURATION_FRAMES;
        playAttackSound();
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
        const centerX = this.x + this.width / 2;
        const overGap = gaps.some(g => centerX >= g.x && centerX <= g.x + g.width);
        if (!overGap) {
          this.y = groundY;
          this.vy = 0;
          this.jumping = false;
        }
      }
      if (this.y > canvas.height) {
        gameOver = true;
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
        playDamageSound();
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
          if (!overGap && prevY <= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.jumping = false;
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

  function autoPlayAI() {
    player.vx = PLAYER_SPEED;
    const centerX = player.x + player.width / 2;
    const lookAhead = 50;
    const gapAhead = gaps.find(g => g.x > centerX && g.x - centerX < lookAhead);
    if (gapAhead && !player.jumping) {
      player.vy = -10;
      player.jumping = true;
      playJumpSound();
    }
    const enemyAhead = enemies.find(e => e.x > player.x && e.x - player.x < lookAhead && e.state === "walk");
    if (enemyAhead && !player.attacking) {
      player.attack();
    }
  }

  function renderHighScores() {
    const scores = loadHighScores();
    highScoreList.innerHTML = scores.map(s => `<li>${s.name} ${s.score}</li>`).join("");
    return scores;
  }

  function qualifiesForHighScore(s) {
    const scores = loadHighScores();
    return scores.length < MAX_HIGH_SCORES || s > scores[scores.length - 1].score;
  }
  function drawScore() {
    ctx.fillStyle = "black";
    drawSpriteText("SCORE " + score, 10, 10, "left");
  }

  function drawHealth() {
    ctx.fillStyle = "black";
    drawSpriteText("HEALTH " + health, canvas.width - 10, 10, "right");
  }

  function drawSlider(slider, label) {
    ctx.fillStyle = "black";
    ctx.fillRect(slider.x, slider.y, slider.width, SLIDER_HEIGHT);
    const handleX = slider.x + (slider.value / 0.1) * slider.width;
    ctx.fillStyle = "white";
    ctx.fillRect(handleX - 2, slider.y - 2, 4, SLIDER_HEIGHT + 4);
    ctx.fillStyle = "black";
    ctx.fillText(label, slider.x + slider.width + 5, slider.y + SLIDER_HEIGHT);
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

  function drawGameOverScreen(scores) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    drawSpriteText("GAME OVER", canvas.width / 2, 40, "center");
    drawSpriteText("SCORE " + score, canvas.width / 2, 80, "center");
    drawHighScoresCanvas(scores);
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
  }

  function drawCharacterMenu() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    drawSpriteText("SELECT YOUR CHARACTER", canvas.width / 2, 40, "center");

    characterButtonRects.forEach(({ name, x, y, width, height }) => {
      ctx.strokeStyle = "black";
      ctx.strokeRect(x, y, width, height);
      const textY = y + (height - DRAW_CHAR_HEIGHT * CHAR_BTN_TEXT_SCALE) / 2;
      drawSpriteText(name, x + width / 2, textY, "center", CHAR_BTN_TEXT_SCALE);
    });
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
    stopBackgroundMusic();
    playDeathSound();
    const scores = renderHighScores();
    drawGameOverScreen(scores);
    resetBtn.style.display = "none";
    const heading = scoreContainer.querySelector("h2");
    if (heading) heading.style.display = "none";
    highScoreList.style.display = "none";
    if (qualifiesForHighScore(score)) {
      scoreContainer.style.display = "block";
      nameEntry.style.display = "block";
      nameInput.value = selectedCharacter;
    } else {
      nameEntry.style.display = "none";
      scoreContainer.style.display = "none";
    }
  }

  function resetGame() {
    worldSpeed = 0;
    gameStartTime = Date.now();
    resetBtn.style.display = "none";
    scoreContainer.style.display = "none";
    nameEntry.style.display = "none";
    restartButtonRect = null;
    stopBackgroundMusic();
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
    worldSpeed = 0;
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
    player.touchingLeft = false;
    initTerrain();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resetBtn.style.display = "none";
    scoreContainer.style.display = "none";
    nameEntry.style.display = "none";
    gameLoop();
  }

  function showCharacterSelection() {
    cancelAnimationFrame(animationId);
    characterSelectionDiv.style.display = "block";
    canvas.style.display = "block";
    showVolume = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    buildCharacterButtonRects();
    startDemo();
  }

  function startGame(character) {
    cancelAnimationFrame(animationId);
    selectedCharacter = character;
    const spritePath = `assets/images/sprite-${character.toLowerCase()}.png`;
    const alreadyLoaded = sprite.complete && sprite.src.endsWith(spritePath);
    sprite.src = spritePath;
    characterSelectionDiv.style.display = "none";
    canvas.style.display = "block";
    showVolume = true;
    sliders.sfx.value = sfxVolume;
    sliders.music.value = musicVolume;
    autoplaying = false;
    // Reset timing so regular play always begins at base speed
    gameStartTime = Date.now();
    worldSpeed = 0;
    // Ensure player velocity is cleared when starting real play
    player.vx = 0;
    player.vy = 0;
    startBackgroundMusic();
    if (alreadyLoaded) {
      initGame();
    }
  }

  function startDemo() {
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    selectedCharacter = randomCharacter;
    const spritePath = `assets/images/sprite-${randomCharacter.toLowerCase()}.png`;
    const alreadyLoaded = sprite.complete && sprite.src.endsWith(spritePath);
    sprite.src = spritePath;
    autoplaying = true;
    showVolume = false;
    stopBackgroundMusic();
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
    frameCount++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateClouds();
    drawClouds();

    const elapsedSeconds = (Date.now() - gameStartTime - totalPausedTime) / 1000;
    worldSpeed = BASE_WORLD_SPEED * (1 + WORLD_SPEED_INCREMENT * elapsedSeconds);
    if (player.x > canvas.width * 0.5 && player.vx > 0) {
      worldSpeed -= player.vx;
    }

    if (autoplaying) {
      autoPlayAI();
    } else {
      if (keys["ArrowLeft"]) {
        player.vx = -PLAYER_SPEED;
      } else if (keys["ArrowRight"]) {
        player.vx = PLAYER_SPEED;
      } else {
        player.vx = 0;
      }

      if (keys["ArrowUp"] && !player.jumping) {
        player.vy = -10;
        player.jumping = true;
        playJumpSound();
      }
    }

    player.update();
    enemies.forEach(e => {
      e.x += worldSpeed;
      e.update();
    });
    healthPacks.forEach(hp => {
      hp.x += worldSpeed;
      hp.update();
    });

    updateTerrain();
    drawGround();

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
        if (e.state === "walk") {
          const stompKill = side === "top" && player.vy > 0;
          if (player.attacking || stompKill) {
            e.state = "hit";
            playEnemyKillSound();
            score += 1;
            enemyKillCount++;
            if (enemyKillCount % 3 === 0) {
              healthPacks.push(new HealthPack(e.x, e.y));
            }
            if (stompKill) {
              player.vy = -10;
              player.jumping = true;
            }
          } else if (side !== "top" && !player.attacking && !player.invincible) {
            player.hit();
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
        playHealthPackSound();
        return false; // Remove pack
      }

      return now - hp.createdAt < 500; // Keep pack if less than 0.5s old
    });

    drawScore();
    drawHealth();
    drawVolumeSliders();

    if (characterSelectionDiv.style.display === "block") {
      drawCharacterMenu();
    }

    if (!gameOver) {
      animationId = requestAnimationFrame(gameLoop);
    } else {
      if (autoplaying) {
        startDemo();
        initGame();
      } else {
        showGameOver();
      }
    }
  }

  saveScoreBtn.addEventListener("click", () => {
    const name = nameInput.value.substring(0, 24) || "Anonymous";
    let scores = loadHighScores();
    scores.push({ name, score });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, MAX_HIGH_SCORES);
    saveHighScores(scores);
    renderHighScores();
    nameEntry.style.display = "none";
    drawGameOverScreen(scores);
  });

  canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    function sliderHit(slider) {
      return (
        x >= slider.x &&
        x <= slider.x + slider.width &&
        y >= slider.y - 4 &&
        y <= slider.y + SLIDER_HEIGHT + 4
      );
    }

    if (showVolume) {
      if (sliderHit(sliders.sfx)) {
        sliders.sfx.value = ((x - sliders.sfx.x) / sliders.sfx.width) * 0.1;
        sfxVolume = sliders.sfx.value;
        return;
      }
      if (sliderHit(sliders.music)) {
        sliders.music.value = ((x - sliders.music.x) / sliders.music.width) * 0.1;
        musicVolume = sliders.music.value;
        return;
      }
    }

    if (characterSelectionDiv.style.display === "block") {
      for (const btn of characterButtonRects) {
        if (
          x >= btn.x &&
          x <= btn.x + btn.width &&
          y >= btn.y &&
          y <= btn.y + btn.height
        ) {
          startGame(btn.name);
          break;
        }
      }
      return;
    }

    if (
      gameOver &&
      restartButtonRect &&
      x >= restartButtonRect.x &&
      x <= restartButtonRect.x + restartButtonRect.width &&
      y >= restartButtonRect.y &&
      y <= restartButtonRect.y + restartButtonRect.height
    ) {
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
      return (
        x >= slider.x &&
        x <= slider.x + slider.width &&
        y >= slider.y - 4 &&
        y <= slider.y + SLIDER_HEIGHT + 4
      );
    }
    if (showVolume) {
      if (sliderHit(sliders.sfx)) {
        draggingSlider = sliders.sfx;
        draggingSlider.value = ((x - draggingSlider.x) / draggingSlider.width) * 0.1;
        sfxVolume = draggingSlider.value;
      } else if (sliderHit(sliders.music)) {
        draggingSlider = sliders.music;
        draggingSlider.value = ((x - draggingSlider.x) / draggingSlider.width) * 0.1;
        musicVolume = draggingSlider.value;
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
      sfxVolume = draggingSlider.value;
    } else {
      musicVolume = draggingSlider.value;
    }
  });

  document.addEventListener("mouseup", () => {
    draggingSlider = null;
  });



  sprite.onload = () => {
    initGame();
  };

  function preload() {
    let loaded = 0;
    const total = characters.length + 2;
    for (const char of characters) {
      const img = new Image();
      img.src = `assets/images/sprite-${char.toLowerCase()}.png`;
      img.onload = () => {
        loaded++;
        if (loaded === total) {
          showCharacterSelection();
        }
      };
      spriteCache[char.toLowerCase()] = img;
    }
    alphabetSprite.src = "assets/images/sprite-alphabet.png";
    alphabetSprite.onload = () => {
      loaded++;
      if (loaded === total) {
        showCharacterSelection();
      }
    };
    numbersSprite.src = "assets/images/sprite-numbers.png";
    numbersSprite.onload = () => {
      loaded++;
      if (loaded === total) {
        showCharacterSelection();
      }
    };
  }

  Game.rectsOverlap = rectsOverlap;
  Game.collisionSide = collisionSide;
  Game.qualifiesForHighScore = qualifiesForHighScore;
  Game.loadHighScores = loadHighScores;
  Game.saveHighScores = saveHighScores;

  window.Game = Game;

  preload();
})();
