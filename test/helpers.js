const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadGameDom() {
  const html = fs.readFileSync(path.join(__dirname, '../game.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });

  dom.window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    fillText: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
  });

  dom.window.Image = class {
    constructor() {
      this.onload = null;
    }
    set src(_v) {
      if (typeof this.onload === 'function') {
        this.onload();
      }
    }
  };

  dom.window.AudioContext = class {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
      this.sampleRate = 44100;
    }
    createOscillator() {
      return {
        type: '',
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {} },
        connect() {},
      };
    }
    createBuffer() {
      return {
        getChannelData() {
          return new Float32Array(0);
        },
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        start() {},
        stop() {},
      };
    }
    createBiquadFilter() {
      return {
        type: '',
        frequency: { setValueAtTime() {} },
        connect() {},
      };
    }
    resume() {}
  };

  // Load the game script manually so tests can access globals
  const scriptText = fs.readFileSync(
    path.join(__dirname, '../assets/js/game.js'),
    'utf8'
  );
  dom.window.eval(scriptText);

  return new Promise((resolve, reject) => {
    dom.window.addEventListener('error', (e) => reject(e.error || e.message));
    setTimeout(() => resolve(dom), 50);
  });
}

module.exports = { loadGameDom };
