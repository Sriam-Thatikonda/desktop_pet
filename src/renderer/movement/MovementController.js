import * as THREE from 'three';
import { DogConfig } from '../config/DogConfig.js';

export class MovementController {
  constructor(coordinateSystem, initialScreenX, initialScreenY) {
    this.coordSystem = coordinateSystem;

    // 2D Screen pixel coordinates
    this.currentPos = { x: initialScreenX, y: initialScreenY };
    this.targetPos = { x: initialScreenX, y: initialScreenY };

    // Kinematics
    this.velocity = { x: 0, y: 0 };
    this.speed = 0;
    this.targetSpeed = DogConfig.runSpeed;
    this.facingAngle = 0; // Radians
    this.targetFacingAngle = 0;

    this.isMoving = false;
    this.hasArrived = true;
    this.arrivalThreshold = 8; // px
  }

  setTarget(screenX, screenY, speedType = 'RUN') {
    // Clamp target to ensure dog never aims for an out-of-bounds area
    const clamped = this.coordSystem.clampScreenPosition(screenX, screenY);
    this.targetPos.x = clamped.x;
    this.targetPos.y = clamped.y;

    this.targetSpeed = (speedType === 'WALK') ? DogConfig.walkSpeed : DogConfig.runSpeed;

    const dx = this.targetPos.x - this.currentPos.x;
    const dy = this.targetPos.y - this.currentPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.arrivalThreshold) {
      this.isMoving = true;
      this.hasArrived = false;
    }
  }

  stop() {
    this.isMoving = false;
    this.speed = 0;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.hasArrived = true;
    this.targetPos.x = this.currentPos.x;
    this.targetPos.y = this.currentPos.y;
  }

  setFacingTowards(targetScreenX, targetScreenY) {
    const dx = targetScreenX - this.currentPos.x;
    const dy = targetScreenY - this.currentPos.y;
    // Map screen delta to 3D world delta: world dx = dx, world dz = dy / sinTilt
    const dz = dy / this.coordSystem.sinTilt;
    this.targetFacingAngle = Math.atan2(dx, dz);
  }

  update(deltaTime) {
    const dx = this.targetPos.x - this.currentPos.x;
    const dy = this.targetPos.y - this.currentPos.y;
    const distanceToTarget = Math.hypot(dx, dy);

    if (this.isMoving && distanceToTarget > this.arrivalThreshold) {
      // 1. Calculate stopping distance based on current speed and deceleration
      const stoppingDistance = (this.speed * this.speed) / (2 * DogConfig.deceleration);

      if (distanceToTarget <= stoppingDistance) {
        // Decelerate naturally
        this.speed = Math.max(DogConfig.walkSpeed * 0.5, this.speed - DogConfig.deceleration * deltaTime);
      } else {
        // Accelerate up to target speed
        this.speed = Math.min(this.targetSpeed, this.speed + DogConfig.acceleration * deltaTime);
      }

      // 2. Compute normalized movement vector
      const dirX = dx / distanceToTarget;
      const dirY = dy / distanceToTarget;

      // 3. Update velocity and position
      this.velocity.x = dirX * this.speed;
      this.velocity.y = dirY * this.speed;

      this.currentPos.x += this.velocity.x * deltaTime;
      this.currentPos.y += this.velocity.y * deltaTime;

      // 4. Update facing direction (smoothed angle in 3D world space)
      const dz = dirY / this.coordSystem.sinTilt;
      this.targetFacingAngle = Math.atan2(dirX, dz);
    } else {
      // Arrived at destination
      if (this.isMoving) {
        this.isMoving = false;
        this.hasArrived = true;
        this.speed = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;
      }
    }

    // Clamp within desktop boundaries
    const clamped = this.coordSystem.clampScreenPosition(this.currentPos.x, this.currentPos.y);
    this.currentPos.x = clamped.x;
    this.currentPos.y = clamped.y;

    // Smoothly interpolate facing angle towards target angle
    this.facingAngle = this.smoothRotate(this.facingAngle, this.targetFacingAngle, DogConfig.turnSpeed * deltaTime);

    // Return 3D world position and facing angle
    const worldPos = this.coordSystem.screenToWorld(this.currentPos.x, this.currentPos.y);
    return {
      worldPos,
      screenPos: { ...this.currentPos },
      facingAngle: this.facingAngle,
      speed: this.speed,
      isMoving: this.isMoving,
      hasArrived: this.hasArrived,
    };
  }

  smoothRotate(current, target, maxStep) {
    let diff = (target - current) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) <= maxStep) return target;
    return current + Math.sign(diff) * maxStep;
  }
}
