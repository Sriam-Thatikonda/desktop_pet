/**
 * ContextMenu - Sleek dark glassmorphic context menu for Desktop Pet
 */
export class ContextMenu {
  constructor(onCommand) {
    this.onCommand = onCommand;
    this.isOpen = false;
    this.domElement = null;

    this.createDOM();
    this.bindGlobalEvents();
  }

  createDOM() {
    const el = document.createElement('div');
    el.id = 'husky-custom-menu';
    el.style.cssText = `
      position: fixed;
      display: none;
      z-index: 100000;
      min-width: 210px;
      background: rgba(18, 22, 32, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.3);
      padding: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      color: #e2e8f0;
      user-select: none;
      -webkit-user-select: none;
      opacity: 0;
      transform: scale(0.94);
      transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
    `;

    document.body.appendChild(el);
    this.domElement = el;
  }

  bindGlobalEvents() {
    // Close menu when clicking outside
    window.addEventListener('mousedown', (e) => {
      if (!this.isOpen) return;
      if (this.domElement && !this.domElement.contains(e.target)) {
        this.hide();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
      }
    });
  }

  show(screenX, screenY, state = {}) {
    const { isFollowing, currentStatus, currentSize, debugBounds } = state;

    const followChecked = isFollowing ? '✓ ' : '';
    const isSmall = currentSize === 'small';
    const isMedium = !currentSize || currentSize === 'medium';
    const isLarge = currentSize === 'large';

    this.domElement.innerHTML = `
      <div style="padding: 8px 12px 6px; font-weight: 700; font-size: 12px; color: #94a3b8; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 4px;">
        <span>🐺 HUSKY PET</span>
        <span style="font-size: 10px; background: rgba(56, 189, 248, 0.18); color: #38bdf8; padding: 2px 7px; border-radius: 10px; font-weight: 600; text-transform: uppercase;">${currentStatus || 'IDLE'}</span>
      </div>

      <div class="menu-item" data-cmd="toggle-follow">
        <span class="menu-icon">🐾</span>
        <span style="flex: 1;">${followChecked}Follow Cursor</span>
      </div>

      <div class="menu-item" data-cmd="sleep">
        <span class="menu-icon">🫖</span>
        <span style="flex: 1;">Sleep at Home</span>
      </div>

      <div class="menu-item" data-cmd="wake">
        <span class="menu-icon">☀️</span>
        <span style="flex: 1;">Wake Up</span>
      </div>

      <div style="height: 1px; background: rgba(255, 255, 255, 0.08); margin: 4px 6px;"></div>

      <div style="padding: 4px 12px 2px; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Dog Size</div>
      <div style="display: flex; gap: 4px; padding: 4px 8px 6px;">
        <button class="size-btn ${isSmall ? 'active' : ''}" data-cmd="size-small">Small</button>
        <button class="size-btn ${isMedium ? 'active' : ''}" data-cmd="size-medium">Med</button>
        <button class="size-btn ${isLarge ? 'active' : ''}" data-cmd="size-large">Large</button>
      </div>

      <div style="height: 1px; background: rgba(255, 255, 255, 0.08); margin: 4px 6px;"></div>

      <div class="menu-item" data-cmd="toggle-debug">
        <span class="menu-icon">🎯</span>
        <span style="flex: 1;">${debugBounds ? '✓ ' : ''}Debug Bounds</span>
      </div>

      <div class="menu-item exit-item" data-cmd="exit" style="color: #f87171;">
        <span class="menu-icon">❌</span>
        <span style="flex: 1;">Exit Companion</span>
      </div>
    `;

    // Inject styles for items
    this.injectStyles();

    // Attach click listeners to menu items
    const items = this.domElement.querySelectorAll('[data-cmd]');
    items.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmd = item.getAttribute('data-cmd');
        this.hide();
        if (this.onCommand) {
          this.onCommand(cmd);
        }
      });
    });

    // Position menu and keep inside screen bounds
    this.domElement.style.display = 'block';
    const menuWidth = 220;
    const menuHeight = this.domElement.offsetHeight || 260;

    let posX = screenX + 10;
    let posY = screenY + 10;

    if (posX + menuWidth > window.innerWidth - 20) {
      posX = screenX - menuWidth - 10;
    }
    if (posY + menuHeight > window.innerHeight - 50) {
      posY = screenY - menuHeight - 10;
    }

    this.domElement.style.left = `${Math.max(10, posX)}px`;
    this.domElement.style.top = `${Math.max(10, posY)}px`;

    // Trigger animation
    requestAnimationFrame(() => {
      this.domElement.style.opacity = '1';
      this.domElement.style.transform = 'scale(1)';
    });

    this.isOpen = true;
  }

  hide() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.domElement) {
      this.domElement.style.opacity = '0';
      this.domElement.style.transform = 'scale(0.94)';
      setTimeout(() => {
        if (!this.isOpen && this.domElement) {
          this.domElement.style.display = 'none';
        }
      }, 150);
    }
  }

  injectStyles() {
    if (document.getElementById('husky-menu-styles')) return;

    const style = document.createElement('style');
    style.id = 'husky-menu-styles';
    style.textContent = `
      .menu-item {
        display: flex;
        align-items: center;
        padding: 7px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.12s ease, color 0.12s ease;
        font-weight: 500;
      }
      .menu-item:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      .menu-item.exit-item:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
      }
      .menu-icon {
        width: 22px;
        font-size: 14px;
        display: inline-block;
      }
      .size-btn {
        flex: 1;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        padding: 5px 8px;
        border-radius: 7px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .size-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }
      .size-btn.active {
        background: #38bdf8;
        border-color: #38bdf8;
        color: #0f172a;
      }
    `;
    document.head.appendChild(style);
  }
}
