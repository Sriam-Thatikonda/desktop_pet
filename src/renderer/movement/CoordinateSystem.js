/**
 * CoordinateSystem
 * Provides 1:1 bidirectional mapping between 2D screen pixels and 3D floor coordinates.
 * Uses an orthographic camera tilted at an isometric/cabinet angle (e.g. 30 degrees).
 */
export class CoordinateSystem {
  constructor(screenWidth = 1536, screenHeight = 864, workAreaHeight = 816, tiltAngleDeg = 30) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.workAreaHeight = workAreaHeight;
    this.tiltAngle = (tiltAngleDeg * Math.PI) / 180;
    this.cosTilt = Math.cos(this.tiltAngle);
    this.sinTilt = Math.sin(this.tiltAngle);
  }

  updateScreenSize(width, height, workAreaHeight) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.workAreaHeight = workAreaHeight || height;
  }

  /**
   * Converts 2D screen coordinates (px) to 3D world ground position (x, y=0, z).
   * Exact zero-error closed-form mapping matching Three.js OrthographicCamera projection.
   */
  screenToWorld(screenX, screenY) {
    const worldX = screenX - this.screenWidth / 2;
    const worldZ = (screenY - this.screenHeight / 2) / this.sinTilt;
    return { x: worldX, y: 0, z: worldZ };
  }

  /**
   * Converts 3D world ground position (x, y=0, z) back to 2D screen coordinates (px).
   */
  worldToScreen(worldX, worldZ) {
    const screenX = worldX + this.screenWidth / 2;
    const screenY = worldZ * this.sinTilt + this.screenHeight / 2;
    return { x: screenX, y: screenY };
  }

  /**
   * Clamps screen coordinates so the dog remains inside the visible desktop area,
   * keeping clear of the screen edges and the Windows taskbar.
   */
  clampScreenPosition(screenX, screenY, margin = 40) {
    const clampedX = Math.max(margin, Math.min(this.screenWidth - margin, screenX));
    const clampedY = Math.max(margin, Math.min(this.workAreaHeight - margin, screenY));
    return { x: clampedX, y: clampedY };
  }
}
