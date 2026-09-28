import { DogConfig } from '../config/DogConfig.js';
import { ContextMenu } from './ContextMenu.js';

export class MouseInteraction {
  constructor(movementController, kettleHome, stateMachine, onSizeChange, onDebugToggle) {
    this.movement = movementController;
    this.kettle = kettleHome;
    this.stateMachine = stateMachine;
    this.onSizeChange = onSizeChange;
    this.onDebugToggle = onDebugToggle;

    this.isHoveringInteractive = false;
    this.isMenuOpen = false;
    this.currentSize = 'medium';
    this.debugBounds = false;

    // Custom sleek glassmorphic context menu
    this.contextMenu = new ContextMenu((cmd) => this.handleMenuCommand(cmd));

    this.initEventListeners();
  }

  initEventListeners() {
    // 1. Mouse down / click handlers
    window.addEventListener('mousedown', (e) => {
      const clickPos = { x: e.clientX, y: e.clientY };

      if (e.button === 0) { // Left click
        // If menu is open, let menu handle clicks
        if (this.contextMenu && this.contextMenu.isOpen) {
          if (!this.contextMenu.domElement.contains(e.target)) {
            this.closeMenu();
          }
          return;
        }

        if (this.isNearDog(clickPos.x, clickPos.y)) {
          this.stateMachine.onDogClicked();
        } else if (this.kettle && this.kettle.isPointInside(clickPos.x, clickPos.y)) {
          this.stateMachine.wakeUp();
        }
      } else if (e.button === 2) { // Right click
        if (this.isNearDog(clickPos.x, clickPos.y) || (this.kettle && this.kettle.isPointInside(clickPos.x, clickPos.y))) {
          e.preventDefault();
          this.openMenu(clickPos.x, clickPos.y);
        }
      }
    });

    // 2. Prevent default browser context menu
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 3. Listen to context menu commands from Main process (native menu backup)
    if (window.electronAPI && window.electronAPI.onMenuCommand) {
      window.electronAPI.onMenuCommand((command) => {
        this.handleMenuCommand(command);
      });
    }

    if (window.electronAPI && window.electronAPI.onMenuClosed) {
      window.electronAPI.onMenuClosed(() => {
        this.closeMenu();
      });
    }
  }

  openMenu(x, y) {
    this.isMenuOpen = true;
    if (window.electronAPI && window.electronAPI.notifyMenuOpened) {
      window.electronAPI.notifyMenuOpened();
    }
    // Also request non-ignore mouse events
    if (window.electronAPI && window.electronAPI.setIgnoreMouseEvents) {
      window.electronAPI.setIgnoreMouseEvents(false);
    }

    this.contextMenu.show(x, y, {
      isFollowing: this.stateMachine.followMode,
      currentStatus: this.stateMachine.state,
      currentSize: this.currentSize,
      debugBounds: this.debugBounds,
    });
  }

  closeMenu() {
    this.isMenuOpen = false;
    if (this.contextMenu) {
      this.contextMenu.hide();
    }
    if (window.electronAPI && window.electronAPI.notifyMenuClosed) {
      window.electronAPI.notifyMenuClosed();
    }
  }

  isNearDog(screenX, screenY) {
    const dogPos = this.movement.currentPos;
    const dist = Math.hypot(screenX - dogPos.x, screenY - dogPos.y);
    return dist <= DogConfig.dogHitRadius;
  }

  /**
   * Called on every cursor update to toggle Electron's mouse passthrough.
   */
  checkHoverPassthrough(cursorPos) {
    // If context menu is open, ALWAYS capture mouse events so clicks reach menu!
    if (this.isMenuOpen || (this.contextMenu && this.contextMenu.isOpen)) {
      if (!this.isHoveringInteractive) {
        this.isHoveringInteractive = true;
        if (window.electronAPI) {
          window.electronAPI.setIgnoreMouseEvents(false);
        }
      }
      return;
    }

    const nearDog = this.isNearDog(cursorPos.x, cursorPos.y);
    const nearKettle = this.kettle ? this.kettle.isPointInside(cursorPos.x, cursorPos.y) : false;

    const shouldCapture = nearDog || nearKettle;

    if (shouldCapture !== this.isHoveringInteractive) {
      this.isHoveringInteractive = shouldCapture;
      if (window.electronAPI) {
        // If hovering over dog or kettle, capture mouse. Otherwise pass clicks through to Windows apps!
        window.electronAPI.setIgnoreMouseEvents(!shouldCapture, { forward: true });
      }
    }
  }

  handleMenuCommand(command) {
    this.closeMenu();

    switch (command) {
      case 'toggle-follow':
        this.stateMachine.toggleFollowMode();
        break;

      case 'sleep':
        if (this.kettle) {
          this.stateMachine.navigateToWorldObject(this.kettle, 'SLEEP');
        }
        break;

      case 'wake':
        this.stateMachine.wakeUp();
        break;

      case 'size-small':
        this.currentSize = 'small';
        if (this.onSizeChange) this.onSizeChange(0.75);
        break;

      case 'size-medium':
        this.currentSize = 'medium';
        if (this.onSizeChange) this.onSizeChange(1.0);
        break;

      case 'size-large':
        this.currentSize = 'large';
        if (this.onSizeChange) this.onSizeChange(1.3);
        break;

      case 'toggle-debug':
        this.debugBounds = !this.debugBounds;
        if (this.onDebugToggle) this.onDebugToggle(this.debugBounds);
        break;

      case 'exit':
        if (window.electronAPI && window.electronAPI.exitApp) {
          window.electronAPI.exitApp();
        }
        break;
    }
  }
}
