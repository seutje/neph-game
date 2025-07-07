// Audio utility functions for game sound effects and music
(() => {
  const Game = window.Game || (window.Game = {});

  Game.musicVolume = Game.musicVolume || 0.01;
  Game.sfxVolume = Game.sfxVolume || 0.01;
  let audioCtx;
  let musicInterval;
  let currentTrack = 0;
  const musicTrack1 = [
    130.81, 146.83, 164.82, 174.62, 196.0, 220.0, 196.0, 164.82,
    130.81, 146.83, 164.82, 174.62, 196.0, 220.0, 196.0, 164.82,
    164.82, 196.0, 220.0, 196.0, 174.62, 164.82, 146.83, 130.81,
    196.0, 220.0, 246.94, 220.0, 196.0, 174.62, 164.82, 146.83,
    261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 392.0, 329.63,
    329.63, 392.0, 440.0, 392.0, 349.23, 329.63, 293.66, 261.63,
    130.81, 146.83, 164.82, 174.62, 196.0, 220.0, 196.0, 164.82,
    164.82, 196.0, 220.0, 196.0, 174.62, 164.82, 146.83, 130.81
  ];

  const musicTrack2 = [...musicTrack1].reverse();

  const tracks = [musicTrack1, musicTrack2];
  // True when sound should play (disabled during autoplay demo)

  function audioEnabled() {
    return !Game.autoplaying;
  }

  // Play a single oscillator note
  function playNote(freq, duration = 0.3, volume = Game.musicVolume) {
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

  // Kick drum sound synthesized with downward pitch sweep
  function playKick(volume = Game.musicVolume) {
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

  // White noise burst used for a snare drum effect
  function playSnare(volume = Game.musicVolume) {
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

  // Begin looping chiptune music using oscillator notes
  function startBackgroundMusic() {
    if (!audioEnabled()) return;
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
      const notes = tracks[currentTrack];
      playNote(notes[idx], 0.3, Game.musicVolume);
      if (beat % 4 === 0) {
        playKick(Game.musicVolume);
      } else if (beat % 4 === 2) {
        playSnare(Game.musicVolume);
      }
      idx++;
      beat++;
      if (idx >= notes.length) {
        idx = 0;
        currentTrack = (currentTrack + 1) % tracks.length;
      }
    }, 300);
  }

  // Sound played when the player jumps
  function playJumpSound() {
    if (!audioEnabled()) return;
    playNote(329.63, 0.1, Game.sfxVolume);
  }

  // Short blip used when the player attacks
  function playAttackSound() {
    if (!audioEnabled()) return;
    playNote(261.63, 0.1, Game.sfxVolume);
  }

  // Played when the player takes damage
  function playDamageSound() {
    if (!audioEnabled()) return;
    playNote(196.0, 0.1, Game.sfxVolume);
  }

  // Two-note chirp when a health pack is collected
  function playHealthPackSound() {
    if (!audioEnabled()) return;
    playNote(392.0, 0.07, Game.sfxVolume);
    setTimeout(() => playNote(523.25, 0.07, Game.sfxVolume), 70);
  }

  // Sound effect for enemy defeat
  function playEnemyKillSound() {
    if (!audioEnabled()) return;
    playNote(329.63, 0.1, Game.sfxVolume);
    setTimeout(() => playNote(261.63, 0.1, Game.sfxVolume), 100);
  }

  // Sequence of descending notes when the player dies
  function playDeathSound() {
    if (!audioEnabled()) return;
    playNote(261.63, 0.15, Game.sfxVolume);
    setTimeout(() => playNote(196.0, 0.15, Game.sfxVolume), 150);
    setTimeout(() => playNote(130.81, 0.15, Game.sfxVolume), 300);
    setTimeout(() => playNote(98.0, 0.15, Game.sfxVolume), 450);
  }

  // Stop the music loop if it is running
  function stopBackgroundMusic() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  // Expose API on the global Game object
  Game.startBackgroundMusic = startBackgroundMusic;
  Game.stopBackgroundMusic = stopBackgroundMusic;
  Game.playJumpSound = playJumpSound;
  Game.playAttackSound = playAttackSound;
  Game.playDamageSound = playDamageSound;
  Game.playHealthPackSound = playHealthPackSound;
  Game.playEnemyKillSound = playEnemyKillSound;
  Game.playDeathSound = playDeathSound;
})();
