import { CoordinateSystem } from './movement/CoordinateSystem.js';
import { SceneManager } from './scene/SceneManager.js';
import { DogRenderer } from './scene/DogRenderer.js';
import { MovementController } from './movement/MovementController.js';
import { DogStateMachine, DogStates } from './behavior/DogStateMachine.js';
import { KettleHome } from './objects/KettleHome.js';
import { MouseInteraction } from './interaction/MouseInteraction.js';
import { DogConfig } from './config/DogConfig.js';

class HuskyApp {
  constructor() {
    this.container = document.getElementById('app-container');
    this.statusEl = document.getElementById('loading-status');

    this.coordSystem = null;
    this.sceneManager = null;
    this.dogRenderer = null;
    this.movementController = null;
    this.stateMachine = null;
    this.kettleHome = null;
    this.mouseInteraction = null;

    this.lastTime = performance.now();
    this.isRunning = false;
    this.currentScale = 1.0;
    this.debugMode = false;
    this.debugCanvas = null;
    this.debugCtx = null;

    this.init();
  }

  async init() {
    this.updateStatus('Detecting desktop configuration...');

    let screenW = window.innerWidth || 1536;
    let screenH = window.innerHeight || 864;
    let workAreaH = screenH - 48; // Default fallback taskbar offset

    if (window.electronAPI && window.electronAPI.getScreenInfo) {
      try {
        const info = await window.electronAPI.getScreenInfo();
        if (info && info.bounds) {
          screenW = info.bounds.width;
          screenH = info.bounds.height;
          workAreaH = info.workArea.height;
        }
      } catch (err) {
        console.warn('Could not query screen info, using window size:', err);
      }
    }

    // 1. Coordinate System
    this.coordSystem = new CoordinateSystem(screenW, screenH, workAreaH, 30);

    // 2. Scene Manager (Three.js WebGL with transparent background)
    this.sceneManager = new SceneManager(this.container, this.coordSystem);

    // 3. Kettle Home (bottom-left corner of desktop work area)
    const kettleX = DogConfig.kettleOffset.x;
    const kettleY = workAreaH - DogConfig.kettleOffset.y;
    this.kettleHome = new KettleHome(kettleX, kettleY, this.coordSystem, this.sceneManager.scene);

    // 4. Movement Controller (dog starts next to kettle)
    const initialDogX = kettleX + 70;
    const initialDogY = kettleY - 10;
    this.movementController = new MovementController(this.coordSystem, initialDogX, initialDogY);

    // 5. Dog 3D Model Renderer & Asset Loader
    this.dogRenderer = new DogRenderer(this.sceneManager.scene, this.coordSystem);

    // 6. Behavior State Machine
    this.stateMachine = new DogStateMachine(this.dogRenderer, this.movementController, this.coordSystem);

    // 7. Mouse Interaction & Context Menu
    this.mouseInteraction = new MouseInteraction(
      this.movementController,
      this.kettleHome,
      this.stateMachine,
      (newScale) => this.handleSizeChange(newScale),
      (isDebug) => this.handleDebugToggle(isDebug)
    );

    // 8. Global cursor tracking listener from Main Process
    if (window.electronAPI && window.electronAPI.onCursorPosition) {
      window.electronAPI.onCursorPosition((pos) => {
        this.stateMachine.onCursorUpdate(pos);
        this.mouseInteraction.checkHoverPassthrough(pos);
      });
    }

    // 9. Load 3D Assets & Animations
    try {
      await this.dogRenderer.loadAssets((progress, msg) => {
        this.updateStatus(`${msg} (${progress}%)`);
      });
    } catch (err) {
      console.error('Failed to load dog assets:', err);
      this.updateStatus('Error loading 3D assets. Check console.');
      return;
    }

    // Hide loading indicator
    if (this.statusEl) {
      this.statusEl.style.opacity = '0';
      setTimeout(() => {
        if (this.statusEl) this.statusEl.style.display = 'none';
      }, 500);
    }

    // Setup debug canvas
    this.setupDebugCanvas(screenW, screenH);

    // Window resize handler
    window.addEventListener('resize', () => this.handleResize());

    // 10. Start game loop
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  updateStatus(text) {
    if (this.statusEl) {
      this.statusEl.textContent = text;
    }
  }

  handleSizeChange(scaleMultiplier) {
    this.currentScale = scaleMultiplier;
    DogConfig.dogHitRadius = 85 * scaleMultiplier;
    this.dogRenderer.setVisualScale(scaleMultiplier);
  }

  handleDebugToggle(isDebug) {
    this.debugMode = isDebug;
    if (this.debugCanvas) {
      this.debugCanvas.style.display = isDebug ? 'block' : 'none';
    }
  }

  setupDebugCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.id = 'husky-debug-canvas';
    canvas.width = w;
    canvas.height = h;
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 99999;
      display: none;
    `;
    document.body.appendChild(canvas);
    this.debugCanvas = canvas;
    this.debugCtx = canvas.getContext('2d');
  }

  handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.coordSystem.updateScreenSize(w, h, h - 48);
    this.sceneManager.resize(w, h);
    if (this.kettleHome) {
      const kX = DogConfig.kettleOffset.x;
      const kY = this.coordSystem.workAreaHeight - DogConfig.kettleOffset.y;
      this.kettleHome.setScreenPosition(kX, kY);
    }
    if (this.debugCanvas) {
      this.debugCanvas.width = w;
      this.debugCanvas.height = h;
    }
  }

  renderDebug(moveData) {
    if (!this.debugMode || !this.debugCtx) return;

    const ctx = this.debugCtx;
    ctx.clearRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);

    const dogX = moveData.screenPos.x;
    const dogY = moveData.screenPos.y;

    // Dog Hit Radius (Cyan dashed circle)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(dogX, dogY, DogConfig.dogHitRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Kettle Hit Radius (Orange dashed circle)
    if (this.kettleHome) {
      ctx.strokeStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(this.kettleHome.screenPos.x, this.kettleHome.screenPos.y, DogConfig.kettleHitRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Socket target
      const sock = this.kettleHome.getInteractionSocket();
      ctx.fillStyle = '#f97316';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(sock.x, sock.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Target position (Red dot & line)
    const target = this.movementController.targetPos;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dogX, dogY);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // HUD overlay
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(16, 16, 230, 110);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 230, 110);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px monospace';
    ctx.fillText(`STATE : ${this.stateMachine.state}`, 26, 36);
    ctx.fillText(`FOLLOW: ${this.stateMachine.followMode ? 'ON' : 'OFF'}`, 26, 54);
    ctx.fillText(`POS   : (${Math.round(dogX)}, ${Math.round(dogY)})`, 26, 72);
    ctx.fillText(`TARGET: (${Math.round(target.x)}, ${Math.round(target.y)})`, 26, 90);
    ctx.fillText(`SPEED : ${Math.round(moveData.speed)} px/s`, 26, 108);
  }

  gameLoop(currentTime) {
    if (!this.isRunning) return;

    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Cap delta time to avoid large physics steps when app is paused
    deltaTime = Math.min(deltaTime, 0.1);

    // 1. Update State Machine
    this.stateMachine.update(deltaTime, this.kettleHome);

    // 2. Update Kinematics & Movement
    const moveData = this.movementController.update(deltaTime);

    // 3. Update Kettle Home (smoke / steam when sleeping)
    const isSleeping = (this.stateMachine.state === DogStates.SLEEPING);
    this.kettleHome.update(deltaTime, isSleeping);

    // 4. Update Dog 3D Transform & Facing
    this.dogRenderer.updatePositionAndRotation(moveData.worldPos, moveData.facingAngle);

    // 5. Update Contact Shadow Position
    this.sceneManager.updateShadowPosition(
      moveData.worldPos.x,
      moveData.worldPos.z,
      this.currentScale
    );

    // 6. Update Skeletal Animations
    this.dogRenderer.update(deltaTime);

    // 7. Render 3D Scene
    this.sceneManager.render();

    // 8. Debug Overlay
    this.renderDebug(moveData);

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Bootstrap on DOM content loaded
window.addEventListener('DOMContentLoaded', () => {
  new HuskyApp();
});
