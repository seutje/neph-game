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

  function audioEnabled() {
    return !Game.autoplaying;
  }

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

  function playJumpSound() {
    if (!audioEnabled()) return;
    playNote(329.63, 0.1, Game.sfxVolume);
  }

  function playAttackSound() {
    if (!audioEnabled()) return;
    playNote(261.63, 0.1, Game.sfxVolume);
  }

  function playDamageSound() {
    if (!audioEnabled()) return;
    playNote(196.0, 0.1, Game.sfxVolume);
  }

  function playHealthPackSound() {
    if (!audioEnabled()) return;
    playNote(392.0, 0.07, Game.sfxVolume);
    setTimeout(() => playNote(523.25, 0.07, Game.sfxVolume), 70);
  }

  function playEnemyKillSound() {
    if (!audioEnabled()) return;
    playNote(329.63, 0.1, Game.sfxVolume);
    setTimeout(() => playNote(261.63, 0.1, Game.sfxVolume), 100);
  }

  function playDeathSound() {
    if (!audioEnabled()) return;
    playNote(261.63, 0.15, Game.sfxVolume);
    setTimeout(() => playNote(196.0, 0.15, Game.sfxVolume), 150);
    setTimeout(() => playNote(130.81, 0.15, Game.sfxVolume), 300);
    setTimeout(() => playNote(98.0, 0.15, Game.sfxVolume), 450);
  }

  function stopBackgroundMusic() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  Game.startBackgroundMusic = startBackgroundMusic;
  Game.stopBackgroundMusic = stopBackgroundMusic;
  Game.playJumpSound = playJumpSound;
  Game.playAttackSound = playAttackSound;
  Game.playDamageSound = playDamageSound;
  Game.playHealthPackSound = playHealthPackSound;
  Game.playEnemyKillSound = playEnemyKillSound;
  Game.playDeathSound = playDeathSound;
})();
