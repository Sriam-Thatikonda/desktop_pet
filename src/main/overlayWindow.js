const { BrowserWindow, screen, ipcMain, Menu, app } = require('electron');
const path = require('path');

class OverlayWindowManager {
  constructor() {
    this.window = null;
  }

  createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { bounds, workArea } = primaryDisplay;

    this.window = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      show: false,
      enableLargerThanScreen: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Allow loading local 3D assets & node_modules via file://
        backgroundThrottling: false, // Keep dog moving smoothly even when window not focused
      },
    });

    this.window.once('ready-to-show', () => {
      this.window.showInactive(); // Show window without stealing active app focus
    });

    // Pipe renderer console logs to terminal for diagnostic visibility
    this.window.webContents.on('console-message', (e, ...args) => {
      const msg = (e && typeof e === 'object' && e.message) ? e.message : args[1] || e;
      // Filter out noisy security warnings in development
      if (typeof msg === 'string' && msg.includes('Electron Security Warning')) return;
      console.log(`[Renderer] ${msg}`);
    });

    // Stay above normal desktop windows and fullscreen apps
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Crucial: Default to ignoring mouse events with forward: true so user can work normally
    this.window.setIgnoreMouseEvents(true, { forward: true });

    this.window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    this.setupIPC();

    this.window.on('closed', () => {
      this.window = null;
    });

    return this.window;
  }

  setupIPC() {
    this.isMenuOpen = false;

    ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
      if (this.window && !this.window.isDestroyed()) {
        // When context menu is open, NEVER ignore mouse events so user can click menu items!
        if (this.isMenuOpen) {
          this.window.setIgnoreMouseEvents(false);
          return;
        }
        this.window.setIgnoreMouseEvents(ignore, options || { forward: true });
      }
    });

    ipcMain.on('menu-opened', () => {
      this.isMenuOpen = true;
      if (this.window && !this.window.isDestroyed()) {
        this.window.setIgnoreMouseEvents(false);
      }
    });

    ipcMain.on('menu-closed', () => {
      this.isMenuOpen = false;
    });

    ipcMain.handle('get-screen-info', () => {
      const display = screen.getPrimaryDisplay();
      return {
        bounds: display.bounds,
        workArea: display.workArea,
        scaleFactor: display.scaleFactor,
      };
    });

    ipcMain.handle('get-app-dir', () => {
      return app.getAppPath();
    });

    ipcMain.on('exit-app', () => {
      app.quit();
    });

    ipcMain.on('open-context-menu', (event, state) => {
      if (!this.window || this.window.isDestroyed()) return;

      const template = [
        {
          label: 'Husky Companion',
          enabled: false,
        },
        { type: 'separator' },
        {
          label: state && state.isFollowing ? '✓ Follow Cursor' : 'Follow Cursor',
          type: 'checkbox',
          checked: state && state.isFollowing,
          click: () => {
            this.window.webContents.send('menu-command', 'toggle-follow');
          },
        },
        {
          label: 'Sleep at Home',
          click: () => {
            this.window.webContents.send('menu-command', 'sleep');
          },
        },
        {
          label: 'Wake Up',
          click: () => {
            this.window.webContents.send('menu-command', 'wake');
          },
        },
        { type: 'separator' },
        {
          label: 'Settings',
          submenu: [
            {
              label: 'Size: Small (90px)',
              type: 'radio',
              checked: state && state.size === 'small',
              click: () => this.window.webContents.send('menu-command', 'size-small'),
            },
            {
              label: 'Size: Medium (120px - Default)',
              type: 'radio',
              checked: !state || !state.size || state.size === 'medium',
              click: () => this.window.webContents.send('menu-command', 'size-medium'),
            },
            {
              label: 'Size: Large (150px)',
              type: 'radio',
              checked: state && state.size === 'large',
              click: () => this.window.webContents.send('menu-command', 'size-large'),
            },
            { type: 'separator' },
            {
              label: 'Toggle Debug Bounds',
              type: 'checkbox',
              checked: state && state.debugBounds,
              click: () => this.window.webContents.send('menu-command', 'toggle-debug'),
            },
          ],
        },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          },
        },
      ];

      this.isMenuOpen = true;
      this.window.setIgnoreMouseEvents(false);

      const menu = Menu.buildFromTemplate(template);
      menu.popup({
        window: this.window,
        callback: () => {
          this.isMenuOpen = false;
          if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('menu-closed');
          }
        },
      });
    });
  }

  sendCursorPosition(pos) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('cursor-position', pos);
    }
  }
}

module.exports = { OverlayWindowManager };
