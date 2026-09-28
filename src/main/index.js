const { app } = require('electron');
const { OverlayWindowManager } = require('./overlayWindow');
const { CursorTracker } = require('./cursorTracker');

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  let overlayManager = null;
  let cursorTracker = null;

  app.whenReady().then(() => {
    overlayManager = new OverlayWindowManager();
    overlayManager.createWindow();

    cursorTracker = new CursorTracker(33); // ~30 FPS cursor tracking
    cursorTracker.start((pos) => {
      overlayManager.sendCursorPosition(pos);
    });

    app.on('activate', () => {
      if (!overlayManager.window) {
        overlayManager.createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (cursorTracker) cursorTracker.stop();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (cursorTracker) cursorTracker.stop();
  });
}
