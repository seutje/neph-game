const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

test('game.js runs without errors', () => {
  const html = fs.readFileSync(path.join(__dirname, '../game.html'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
  });

  // stub canvas context
  dom.window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
  });

  // stub Image to load immediately
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

  // stub AudioContext
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

  // wait briefly to allow script to execute
  return new Promise((resolve, reject) => {
    dom.window.addEventListener('error', (e) => reject(e.error || e.message));
    // Allow time for script execution
    setTimeout(() => resolve(), 50);
  });
});
