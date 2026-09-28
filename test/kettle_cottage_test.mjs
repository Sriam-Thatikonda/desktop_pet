import { CoordinateSystem } from '../src/renderer/movement/CoordinateSystem.js';
import { KettleHome } from '../src/renderer/objects/KettleHome.js';
import { DogStateMachine, DogStates } from '../src/renderer/behavior/DogStateMachine.js';
import { MovementController } from '../src/renderer/movement/MovementController.js';
import * as THREE from 'three';

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

console.log('=== RUNNING KETTLE COTTAGE & SLEEP ALIGNMENT TEST SUITE ===\n');

const coordSystem = new CoordinateSystem(1536, 864, 816, 30);
const scene = new THREE.Scene();
const kettleX = 80;
const kettleY = 741;
const kettleHome = new KettleHome(kettleX, kettleY, coordSystem, scene);

// 1. Verify Kettle Cottage 3D Model components
assert(kettleHome.group.children.length > 5, 'Kettle Cottage contains full 3D assembly (walls, bed, doorstep, arch, roof, handle, chimney, light)');
assert(kettleHome.interiorLight !== null, 'Cozy interior hearth light is present');

// 2. Verify Interaction Sockets
const socket = kettleHome.getInteractionSocket();
assert(typeof socket.approachX === 'number' && typeof socket.approachY === 'number', 'approachX/Y are valid numbers');
assert(typeof socket.sleepX === 'number' && typeof socket.sleepY === 'number', 'sleepX/Y are valid numbers');
assert(typeof socket.stepOutX === 'number' && typeof socket.stepOutY === 'number', 'stepOutX/Y are valid numbers');
assert(Math.abs(socket.approachAngle - (50 * Math.PI / 180)) < 0.01, 'Approach angle points outward through doorway (~50 degrees / 0.8727 rad)');

// Geometry verification:
// Sleep point should be inside the cottage near doorway, so sleepDist < approachDist
const distCenterToSleep = Math.hypot(socket.sleepX - kettleX, socket.sleepY - kettleY);
const distCenterToApproach = Math.hypot(socket.approachX - kettleX, socket.approachY - kettleY);
const distCenterToStepOut = Math.hypot(socket.stepOutX - kettleX, socket.stepOutY - kettleY);

assert(distCenterToSleep < distCenterToApproach, 'Sleep socket is located inside the cottage relative to approach point');
assert(distCenterToApproach < distCenterToStepOut, 'Step-out point is outside doorway on desktop');

// 3. Test Full Sleep Sequence in DogStateMachine
const mockRenderer = {
  animController: {
    play: () => {},
    setTailWag: () => {},
    setHeadLookAt: () => {},
  }
};
const movement = new MovementController(coordSystem, 600, 300);
const stateMachine = new DogStateMachine(mockRenderer, movement, coordSystem);

// User commands dog to sleep at home
stateMachine.navigateToWorldObject(kettleHome, 'SLEEP');
assert(stateMachine.state === DogStates.MOVING_TO_OBJECT, 'Transitions to MOVING_TO_OBJECT');
assert(movement.targetPos.x === socket.approachX && movement.targetPos.y === socket.approachY, 'Dog targets the cottage doorway approach socket');

// Fast-forward movement to arrival
for (let i = 0; i < 50; i++) {
  movement.update(0.1);
  stateMachine.update(0.1, kettleHome);
}

assert(movement.hasArrived === true, 'Dog arrives at the doorway approach socket');
assert(stateMachine.state === DogStates.SETTLING_DOWN, 'Transitions to SETTLING_DOWN upon arrival');
assert(movement.currentPos.x === socket.sleepX && movement.currentPos.y === socket.sleepY, 'Dog settles at sleep socket inside cottage');
assert(Math.abs(movement.facingAngle - socket.approachAngle) < 0.01, 'Dog faces forward through the doorway (head outside)');

// 4. Test Wake Up & Step Out
stateMachine.transitionTo(DogStates.SLEEPING);
assert(stateMachine.state === DogStates.SLEEPING, 'State is SLEEPING');

stateMachine.wakeUp();
assert(stateMachine.state === DogStates.WAKING, 'Transitions to WAKING');
assert(movement.targetPos.x === socket.stepOutX && movement.targetPos.y === socket.stepOutY, 'Dog steps forward out through the doorway onto desktop');

console.log(`\n=========================================`);
console.log(`ALL ${passed} / ${total} TESTS PASSED SUCCESSFULLY!`);
console.log(`=========================================`);
