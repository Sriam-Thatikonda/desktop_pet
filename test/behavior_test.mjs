// Automated unit test suite for DogStateMachine, CoordinateSystem, and MovementController
import { CoordinateSystem } from '../src/renderer/movement/CoordinateSystem.js';
import { DogStateMachine, DogStates } from '../src/renderer/behavior/DogStateMachine.js';
import { MovementController } from '../src/renderer/movement/MovementController.js';
import { DogConfig } from '../src/renderer/config/DogConfig.js';
import { WorldObject } from '../src/renderer/objects/WorldObject.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

console.log('=== RUNNING BEHAVIOR & MOVEMENT TEST SUITE ===\n');

// 1. Test CoordinateSystem
const coordSystem = new CoordinateSystem(1536, 864, 816, 30);

// Center of screen
const worldCenter = coordSystem.screenToWorld(768, 432);
assert(Math.abs(worldCenter.x) < 0.01 && Math.abs(worldCenter.z) < 0.01, 'Screen center maps to world (0, 0)');

const screenReconstructed = coordSystem.worldToScreen(worldCenter.x, worldCenter.z);
assert(Math.abs(screenReconstructed.x - 768) < 0.01 && Math.abs(screenReconstructed.y - 432) < 0.01, 'Inverse projection reconstructs original screen coordinates');

// Clamping tests
const clampedOut = coordSystem.clampScreenPosition(-100, 9999, 40);
assert(clampedOut.x === 40 && clampedOut.y === 816 - 40, 'Clamping keeps dog within screen and above taskbar');

// 2. Test MovementController Kinematics
const movement = new MovementController(coordSystem, 100, 100);
assert(movement.currentPos.x === 100 && movement.currentPos.y === 100, 'MovementController initializes at given position');

movement.setTarget(400, 100, 'RUN');
assert(movement.isMoving === true, 'Setting distant target starts movement');

// Simulate 1 second of movement
const moveStep = movement.update(1.0);
assert(moveStep.screenPos.x > 100, 'Dog moves forward towards target with positive velocity');
assert(moveStep.speed > 0, 'Dog has acceleration and positive speed');

// Step until arrival
for (let i = 0; i < 30; i++) {
  movement.update(0.1);
}
assert(movement.hasArrived === true, 'Dog naturally decelerates and arrives at target');

// 3. Test Intelligent Left/Right Sitting
const mockRenderer = {
  animController: {
    play: () => {},
    setTailWag: () => {},
    setHeadLookAt: () => {},
  }
};
const stateMachine = new DogStateMachine(mockRenderer, movement, coordSystem);

// Case A: Screen center -> Enough space on right
const targetCenter = stateMachine.calculateTargetPositionNearCursor({ x: 768, y: 400 });
assert(targetCenter.x > 768, `Screen center: sits on RIGHT of cursor (cursor: 768, target: ${targetCenter.x})`);

// Case B: Near right edge (x = 1500) -> Must sit on LEFT of cursor
const targetNearRight = stateMachine.calculateTargetPositionNearCursor({ x: 1500, y: 400 });
assert(targetNearRight.x < 1500, `Near right edge: sits on LEFT of cursor (cursor: 1500, target: ${targetNearRight.x})`);
assert(targetNearRight.x + 50 <= 1536, 'Sitting on left keeps dog completely inside screen boundary');

// Case C: Near left edge (x = 50) -> Must sit on RIGHT of cursor
const targetNearLeft = stateMachine.calculateTargetPositionNearCursor({ x: 50, y: 400 });
assert(targetNearLeft.x > 50, `Near left edge: sits on RIGHT of cursor (cursor: 50, target: ${targetNearLeft.x})`);

// Case D: Near taskbar bottom edge (y = 800) -> Sits above cursor
const targetNearBottom = stateMachine.calculateTargetPositionNearCursor({ x: 768, y: 800 });
assert(targetNearBottom.y < 800, `Near bottom edge: sits ABOVE cursor to clear taskbar (cursor: 800, target: ${targetNearBottom.y})`);

// Case E: Top of screen -> Visual offset remains consistent (~70-80px) and never inflates
const targetTop = stateMachine.calculateTargetPositionNearCursor({ x: 768, y: 80 });
const distTop = Math.hypot(targetTop.x - 768, targetTop.y - 80);
assert(distTop >= 65 && distTop <= 90, `Top of screen: distance remains tight and consistent (${distTop.toFixed(1)}px), not inflated`);

// 4. Test Playful Clicking
stateMachine.transitionTo(DogStates.IDLE);
assert(stateMachine.state === DogStates.IDLE, 'State starts at IDLE');

stateMachine.onDogClicked();
assert(stateMachine.state === DogStates.IDLE, 'Single click reacts calmly without triggering playful excitement');

// Rapid clicks
stateMachine.onDogClicked();
stateMachine.onDogClicked();
assert(stateMachine.state === DogStates.PLAYFUL, '3 rapid clicks triggers PLAYFUL excited state');

// Playful expiration
stateMachine.update(5.0, null);
assert(stateMachine.state === DogStates.SITTING, 'After playful duration, dog transitions back to sitting');

// 5. Test Autonomous Sleep & Object Navigation
const mockKettle = new WorldObject('kettle-test', 'Kettle', 80, 740, 45);
mockKettle.getInteractionSocket = () => ({ x: 105, y: 752, approachAngle: 0 });

stateMachine.navigateToWorldObject(mockKettle, 'SLEEP');
assert(stateMachine.state === DogStates.MOVING_TO_OBJECT, 'Navigating to object transitions to MOVING_TO_OBJECT');
assert(movement.targetPos.x === 105 && movement.targetPos.y === 752, 'Movement target set to object interaction socket');

// Arrive at kettle
movement.currentPos = { x: 105, y: 752 };
movement.hasArrived = true;
stateMachine.update(0.1, mockKettle);
assert(stateMachine.state === DogStates.SETTLING_DOWN, 'Arriving at kettle transitions to SETTLING_DOWN');

// Wake up interrupt
stateMachine.wakeUp();
assert(stateMachine.state === DogStates.WAKING, 'Wake command triggers smooth WAKING state');

console.log(`\n=========================================`);
console.log(`ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`=========================================`);
