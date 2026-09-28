// Test suite specifically validating all Menu options and Sleep at Home behavior
import { CoordinateSystem } from '../src/renderer/movement/CoordinateSystem.js';
import { DogStateMachine, DogStates } from '../src/renderer/behavior/DogStateMachine.js';
import { MovementController } from '../src/renderer/movement/MovementController.js';
import { DogConfig } from '../src/renderer/config/DogConfig.js';
import { WorldObject } from '../src/renderer/objects/WorldObject.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('=== RUNNING MENU & SLEEP AT HOME TEST SUITE ===\n');

const coordSystem = new CoordinateSystem(1536, 864, 816, 30);
const kettle = new WorldObject('kettle-test', 'Kettle Home', 80, 741, 75);
kettle.getInteractionSocket = () => ({ x: 108, y: 753, approachAngle: -1.1 });

const mockRenderer = {
  animController: {
    play: () => {},
    setTailWag: () => {},
    setHeadLookAt: () => {},
  }
};

// 1. Test "Sleep at Home" from center of screen while Follow Mode is ACTIVE
const movement = new MovementController(coordSystem, 800, 400);
const stateMachine = new DogStateMachine(mockRenderer, movement, coordSystem);

stateMachine.setFollowMode(true);
assert(stateMachine.followMode === true, 'Follow mode is enabled initially');

// User clicks "Sleep at Home"
stateMachine.navigateToWorldObject(kettle, 'SLEEP');
assert(stateMachine.state === DogStates.MOVING_TO_OBJECT, 'State changes to MOVING_TO_OBJECT');
assert(stateMachine.followMode === false, 'Follow mode is automatically disabled upon sleep command');
assert(movement.isMoving === true, 'Movement starts towards kettle');
assert(movement.targetPos.x === 108 && movement.targetPos.y === 753, 'Movement target is set to kettle socket (108, 753)');

// Simulate user moving mouse while dog is walking home
stateMachine.onCursorUpdate({ x: 900, y: 300 });
assert(stateMachine.state === DogStates.MOVING_TO_OBJECT, 'Routine mouse movement does NOT abort MOVING_TO_OBJECT');
assert(movement.isMoving === true, 'Dog continues walking home without interruption');

// Simulate dog arriving at kettle
for (let i = 0; i < 40; i++) {
  movement.update(0.1);
  stateMachine.update(0.1, kettle);
}
assert(movement.hasArrived === true, 'Dog arrives at kettle socket');
assert(stateMachine.state === DogStates.SETTLING_DOWN, 'Upon arrival, state transitions to SETTLING_DOWN');

// 2. Test "Sleep at Home" when dog is ALREADY near the kettle
const movementNear = new MovementController(coordSystem, 110, 755);
const stateMachineNear = new DogStateMachine(mockRenderer, movementNear, coordSystem);

stateMachineNear.navigateToWorldObject(kettle, 'SLEEP');
assert(stateMachineNear.state === DogStates.SETTLING_DOWN, 'If already near kettle, transitions immediately to SETTLING_DOWN');

// 3. Test Sleep state stability against mouse movements
stateMachineNear.transitionTo(DogStates.SLEEPING);
assert(stateMachineNear.state === DogStates.SLEEPING, 'State is SLEEPING');

// Fast mouse movements in another app (Chrome/VSCode)
stateMachineNear.onCursorUpdate({ x: 1200, y: 200 });
stateMachineNear.onCursorUpdate({ x: 400, y: 600 });
assert(stateMachineNear.state === DogStates.SLEEPING, 'Random cursor movement does NOT wake up sleeping dog');

// 4. Test "Wake Up" command
stateMachineNear.wakeUp();
assert(stateMachineNear.state === DogStates.WAKING, 'Wake Up command transitions state to WAKING');

// 5. Test "Follow Cursor" waking sleeping dog
const movementSleep = new MovementController(coordSystem, 108, 753);
const stateMachineSleep = new DogStateMachine(mockRenderer, movementSleep, coordSystem);
stateMachineSleep.transitionTo(DogStates.SLEEPING);

stateMachineSleep.setFollowMode(true);
assert(stateMachineSleep.followMode === true, 'Follow mode enabled');
assert(stateMachineSleep.state === DogStates.ALERT, 'Follow mode command alerts and wakes sleeping dog');

// 6. Test Hit Detection with new generous radius
assert(DogConfig.dogHitRadius === 85, 'Dog hit radius is 85px (generous coverage for body, head, tail)');
assert(DogConfig.kettleHitRadius === 75, 'Kettle hit radius is 75px');

console.log(`\n=========================================`);
console.log(`ALL ${passed} / ${total} TESTS PASSED SUCCESSFULLY!`);
console.log(`=========================================`);
