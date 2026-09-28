const { screen } = require('electron');

class CursorTracker {
  constructor(pollIntervalMs = 33) {
    this.pollIntervalMs = pollIntervalMs;
    this.timer = null;
    this.lastX = -1;
    this.lastY = -1;
    this.onMoveCallback = null;
  }

  start(onMove) {
    this.onMoveCallback = onMove;
    this.stop();

    this.timer = setInterval(() => {
      try {
        const point = screen.getCursorScreenPoint();
        if (point.x !== this.lastX || point.y !== this.lastY) {
          this.lastX = point.x;
          this.lastY = point.y;
          if (this.onMoveCallback) {
            this.onMoveCallback({ x: point.x, y: point.y, moved: true });
          }
        } else {
          // Still send periodic heartbeat so renderer knows current position
          if (this.onMoveCallback) {
            this.onMoveCallback({ x: point.x, y: point.y, moved: false });
          }
        }
      } catch (err) {
        console.error('CursorTracker error:', err);
      }
    }, this.pollIntervalMs);
  }

  getCurrentPosition() {
    return screen.getCursorScreenPoint();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = { CursorTracker };
