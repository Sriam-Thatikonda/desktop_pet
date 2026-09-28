/**
 * WorldObject - Base class for interactive desktop objects
 */
export class WorldObject {
  constructor(id, name, screenX, screenY, radius = 40) {
    this.id = id;
    this.name = name;
    this.screenPos = { x: screenX, y: screenY };
    this.radius = radius;
    this.group = null;
  }

  getInteractionSocket() {
    return {
      x: this.screenPos.x,
      y: this.screenPos.y,
      approachAngle: 0,
    };
  }

  isPointInside(screenX, screenY) {
    const dist = Math.hypot(screenX - this.screenPos.x, screenY - this.screenPos.y);
    return dist <= this.radius;
  }

  update(deltaTime) {
    // Override in subclasses for object animations
  }

  destroy(scene) {
    if (this.group && scene) {
      scene.remove(this.group);
    }
  }
}
