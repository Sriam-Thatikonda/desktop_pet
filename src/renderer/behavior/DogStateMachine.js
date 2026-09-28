import { DogConfig } from '../config/DogConfig.js';

export const DogStates = {
  IDLE: 'IDLE',
  ALERT: 'ALERT',
  MOVING_TO_CURSOR: 'MOVING_TO_CURSOR',
  SITTING: 'SITTING',
  FOLLOWING: 'FOLLOWING',
  PLAYFUL: 'PLAYFUL',
  MOVING_TO_OBJECT: 'MOVING_TO_OBJECT',
  SETTLING_DOWN: 'SETTLING_DOWN',
  SLEEPING: 'SLEEPING',
  WAKING: 'WAKING',
};

export class DogStateMachine {
  constructor(renderer, movement, coordSystem) {
    this.renderer = renderer;
    this.movement = movement;
    this.coordSystem = coordSystem;

    this.state = DogStates.IDLE;
    this.followMode = false; // Persistent follow toggle

    // Cursor tracking state
    this.lastCursorPos = { x: 0, y: 0 };
    this.alertTimer = 0;
    this.sittingTimer = 0;
    this.playfulTimer = 0;
    this.idleTimer = 0;

    // Target object navigation
    this.targetWorldObject = null;
    this.targetObjectAction = null;

    // Clicking interaction
    this.recentClicks = [];

    // Autonomous sleep
    this.lastActivityTime = performance.now();
  }

  notifyActivity() {
    this.lastActivityTime = performance.now();
    this.idleTimer = 0;
  }

  setFollowMode(enabled) {
    this.followMode = enabled;
    if (this.followMode) {
      if (this.state === DogStates.SLEEPING ||
          this.state === DogStates.SETTLING_DOWN ||
          this.state === DogStates.MOVING_TO_OBJECT) {
        this.wakeUp();
      }
      this.transitionTo(DogStates.ALERT);
    }
    return this.followMode;
  }

  toggleFollowMode() {
    return this.setFollowMode(!this.followMode);
  }

  onCursorUpdate(cursorPos) {
    const dx = cursorPos.x - this.lastCursorPos.x;
    const dy = cursorPos.y - this.lastCursorPos.y;
    const cursorSpeed = Math.hypot(dx, dy);

    this.lastCursorPos = { ...cursorPos };

    // When navigating to home, settling down, sleeping, or waking:
    // DO NOT interrupt the dog with routine cursor movements!
    if (this.state === DogStates.MOVING_TO_OBJECT ||
        this.state === DogStates.SETTLING_DOWN ||
        this.state === DogStates.SLEEPING ||
        this.state === DogStates.WAKING) {
      return;
    }

    if (cursorSpeed > 3) {
      this.notifyActivity();
    }

    const currentPos = this.movement.currentPos;
    const distToDog = Math.hypot(cursorPos.x - currentPos.x, cursorPos.y - currentPos.y);

    // If currently sitting or idle, check if cursor moved beyond the deadzone
    if (this.state === DogStates.SITTING || this.state === DogStates.IDLE || this.followMode) {
      // Procedural head look at cursor when sitting nearby
      if (distToDog < DogConfig.cursorTriggerDistance) {
        const dxDog = cursorPos.x - currentPos.x;
        const dyDog = (cursorPos.y - currentPos.y) / this.coordSystem.sinTilt;
        const angleToCursor = Math.atan2(dxDog, dyDog);
        if (this.renderer.animController) {
          this.renderer.animController.setHeadLookAt(angleToCursor);
        }
      }

      // Check if cursor moved significantly away
      if (distToDog > DogConfig.cursorTriggerDistance) {
        if (this.state !== DogStates.ALERT && this.state !== DogStates.MOVING_TO_CURSOR) {
          this.transitionTo(DogStates.ALERT);
        }
      }
    }
  }

  calculateTargetPositionNearCursor(cursorPos) {
    const screenW = this.coordSystem.screenWidth;
    const workH = this.coordSystem.workAreaHeight;
    const offset = DogConfig.cursorFollowOffset;
    const dogHalfWidth = 50;
    const margin = 50;

    let targetX;
    let targetY = cursorPos.y + 10;

    // Intelligent Left / Right side selection:
    // Check if there is comfortable room on the right
    if (cursorPos.x + offset + dogHalfWidth <= screenW - margin) {
      // Sit on the RIGHT of cursor
      targetX = cursorPos.x + offset;
    } else {
      // Near right screen edge -> sit on the LEFT of cursor
      targetX = cursorPos.x - offset;
    }

    // Near left screen edge -> ensure we never go off-screen to the left
    if (targetX - dogHalfWidth < margin) {
      targetX = cursorPos.x + offset;
    }

    // Edge check top/bottom
    if (targetY + 40 > workH - margin) {
      targetY = cursorPos.y - 30; // Sit slightly above cursor if near taskbar
    } else if (targetY - 40 < margin) {
      targetY = cursorPos.y + 35;
    }

    return { x: targetX, y: targetY };
  }

  onDogClicked() {
    this.notifyActivity();

    if (this.state === DogStates.SLEEPING) {
      this.wakeUp();
      return;
    }

    const now = performance.now();
    this.recentClicks.push(now);

    // Keep clicks within playful window
    this.recentClicks = this.recentClicks.filter(t => now - t <= DogConfig.playfulClickWindowMs);

    if (this.recentClicks.length >= DogConfig.playfulClickThreshold) {
      // Trigger playful excitement!
      this.transitionTo(DogStates.PLAYFUL);
      this.recentClicks = [];
    } else {
      // Single click: gentle reaction, tail wag, look at cursor
      if (this.renderer.animController) {
        this.renderer.animController.setTailWag(0.6);
        setTimeout(() => {
          if (this.state !== DogStates.PLAYFUL) {
            this.renderer.animController.setTailWag(0);
          }
        }, 1200);
      }
    }
  }

  navigateToWorldObject(worldObject, onArriveAction = 'SLEEP') {
    this.followMode = false;
    this.targetWorldObject = worldObject;
    this.targetObjectAction = onArriveAction;

    const socket = worldObject.getInteractionSocket();
    const currentPos = this.movement.currentPos;
    const targetX = socket.approachX || socket.x;
    const targetY = socket.approachY || socket.y;
    const dist = Math.hypot(targetX - currentPos.x, targetY - currentPos.y);

    if (dist <= this.movement.arrivalThreshold + 15) {
      this.transitionTo(DogStates.SETTLING_DOWN);
    } else {
      this.transitionTo(DogStates.MOVING_TO_OBJECT);
    }
  }

  wakeUp() {
    if (this.state === DogStates.SLEEPING ||
        this.state === DogStates.SETTLING_DOWN ||
        this.state === DogStates.MOVING_TO_OBJECT) {
      this.transitionTo(DogStates.WAKING);
    }
  }

  transitionTo(newState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    console.log(`[DogState] ${oldState} -> ${newState}`);

    switch (newState) {
      case DogStates.ALERT:
        this.alertTimer = DogConfig.cursorReactionDelayMs / 1000;
        // Turn head and stand alert
        if (this.renderer.animController) {
          this.renderer.animController.play('IDLE', 0.2);
        }
        break;

      case DogStates.MOVING_TO_CURSOR: {
        const target = this.calculateTargetPositionNearCursor(this.lastCursorPos);
        this.movement.setTarget(target.x, target.y, 'RUN');
        if (this.renderer.animController) {
          this.renderer.animController.play('RUN', 0.25);
          this.renderer.animController.setTailWag(0.2);
        }
        break;
      }

      case DogStates.SITTING:
        this.movement.stop();
        this.sittingTimer = 0;
        this.movement.setFacingTowards(this.lastCursorPos.x, this.lastCursorPos.y);
        if (this.renderer.animController) {
          this.renderer.animController.play('SIT', 0.35);
          this.renderer.animController.setTailWag(0);
        }
        break;

      case DogStates.IDLE:
        this.movement.stop();
        if (this.renderer.animController) {
          this.renderer.animController.play('IDLE', 0.35);
          this.renderer.animController.setTailWag(0);
        }
        break;

      case DogStates.PLAYFUL:
        this.playfulTimer = DogConfig.playfulDurationMs / 1000;
        this.movement.stop();
        this.movement.setFacingTowards(this.lastCursorPos.x, this.lastCursorPos.y);
        if (this.renderer.animController) {
          this.renderer.animController.play('PLAYFUL', 0.2);
          this.renderer.animController.setTailWag(1.0);
        }
        break;

      case DogStates.MOVING_TO_OBJECT:
        if (this.targetWorldObject) {
          const socket = this.targetWorldObject.getInteractionSocket();
          const targetX = socket.approachX || socket.x;
          const targetY = socket.approachY || socket.y;
          this.movement.setTarget(targetX, targetY, 'RUN');
          if (this.renderer.animController) {
            this.renderer.animController.play('RUN', 0.25);
            this.renderer.animController.setTailWag(0.2);
          }
        }
        break;

      case DogStates.SETTLING_DOWN:
        this.movement.stop();
        if (this.targetWorldObject) {
          const socket = this.targetWorldObject.getInteractionSocket();
          // Position dog inside the kettle cottage with head resting on doorstep
          if (socket.sleepX && socket.sleepY) {
            this.movement.currentPos.x = socket.sleepX;
            this.movement.currentPos.y = socket.sleepY;
            this.movement.targetPos.x = socket.sleepX;
            this.movement.targetPos.y = socket.sleepY;
          }
          this.movement.targetFacingAngle = socket.approachAngle;
          this.movement.facingAngle = socket.approachAngle;
        }
        if (this.renderer.animController) {
          this.renderer.animController.play('IDLE', 0.3);
          this.renderer.animController.setTailWag(0);
        }
        // Settle down and curl into sleep
        setTimeout(() => {
          if (this.state === DogStates.SETTLING_DOWN) {
            this.transitionTo(DogStates.SLEEPING);
          }
        }, 700);
        break;

      case DogStates.SLEEPING:
        this.movement.stop();
        if (this.renderer.animController) {
          this.renderer.animController.play('SLEEP', 0.6);
          this.renderer.animController.setTailWag(0);
        }
        break;

      case DogStates.WAKING:
        this.movement.stop();
        if (this.renderer.animController) {
          this.renderer.animController.play('IDLE', 0.4);
          this.renderer.animController.setTailWag(0.4);
        }
        // Smoothly step forward through the doorway out onto the desktop
        if (this.targetWorldObject) {
          const socket = this.targetWorldObject.getInteractionSocket();
          if (socket.stepOutX && socket.stepOutY) {
            this.movement.setTarget(socket.stepOutX, socket.stepOutY, 'WALK');
          }
        }
        setTimeout(() => {
          if (this.state === DogStates.WAKING) {
            this.transitionTo(DogStates.IDLE);
          }
        }, 800);
        break;
    }
  }

  update(deltaTime, kettleHome) {
    const now = performance.now();

    // Autonomous sleep check
    if (this.state !== DogStates.SLEEPING &&
        this.state !== DogStates.SETTLING_DOWN &&
        this.state !== DogStates.MOVING_TO_OBJECT) {
      if (now - this.lastActivityTime > DogConfig.idleSleepTimeoutMs) {
        if (kettleHome) {
          this.navigateToWorldObject(kettleHome, 'SLEEP');
          return;
        }
      }
    }

    switch (this.state) {
      case DogStates.ALERT:
        this.alertTimer -= deltaTime;
        if (this.alertTimer <= 0) {
          this.transitionTo(DogStates.MOVING_TO_CURSOR);
        }
        break;

      case DogStates.MOVING_TO_CURSOR: {
        // Continuously update target if cursor moves significantly
        const currentTarget = this.calculateTargetPositionNearCursor(this.lastCursorPos);
        const distFromCurrentTarget = Math.hypot(
          currentTarget.x - this.movement.targetPos.x,
          currentTarget.y - this.movement.targetPos.y
        );
        if (distFromCurrentTarget > 50) {
          this.movement.setTarget(currentTarget.x, currentTarget.y, 'RUN');
        }

        if (this.movement.hasArrived) {
          this.transitionTo(DogStates.SITTING);
        }
        break;
      }

      case DogStates.SITTING:
        this.sittingTimer += deltaTime;
        // After sitting calmly for a few seconds, transition to relaxed IDLE
        if (this.sittingTimer > 6.0) {
          this.transitionTo(DogStates.IDLE);
        }
        break;

      case DogStates.PLAYFUL:
        this.playfulTimer -= deltaTime;
        if (this.playfulTimer <= 0) {
          if (this.renderer.animController) {
            this.renderer.animController.setTailWag(0);
          }
          this.transitionTo(DogStates.SITTING);
        }
        break;

      case DogStates.MOVING_TO_OBJECT:
        if (this.movement.hasArrived) {
          this.transitionTo(DogStates.SETTLING_DOWN);
        }
        break;

      case DogStates.SLEEPING:
        // Dog sleeps calmly, gentle breathing handled procedurally
        break;
    }
  }
}
