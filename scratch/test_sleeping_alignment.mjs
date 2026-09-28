import * as THREE from 'three';
import { CoordinateSystem } from '../src/renderer/movement/CoordinateSystem.js';

const width = 1536;
const height = 864;
const coordSystem = new CoordinateSystem(width, height, height - 48, 30);

const kettleScreen = { x: 80, y: 816 - 75 };
const kettleWorld = coordSystem.screenToWorld(kettleScreen.x, kettleScreen.y);

// Doorway in world coords relative to kettle:
const doorWorldOffset = { x: 34, z: 24 };
const doorAngle = Math.atan2(doorWorldOffset.x, doorWorldOffset.z);

// Dog position when sleeping inside cottage:
const dogWorldOffset = { x: 16, z: 12 };
const dogWorldPos = {
  x: kettleWorld.x + dogWorldOffset.x,
  y: 0,
  z: kettleWorld.z + dogWorldOffset.z
};

// Convert dog position to screen coords:
const dogScreenPos = coordSystem.worldToScreen(dogWorldPos.x, dogWorldPos.z);

// Doorstep in screen coords:
const stepScreenPos = coordSystem.worldToScreen(kettleWorld.x + doorWorldOffset.x, kettleWorld.z + doorWorldOffset.z);

console.log('=== SLEEPING ALIGNMENT VALIDATION ===');
console.log('Kettle Screen Pos:', kettleScreen);
console.log('Dog Sleeping Screen Pos:', dogScreenPos);
console.log('Doorstep Screen Pos:', stepScreenPos);
console.log('Dog Facing Angle (radians):', doorAngle.toFixed(3), 'deg:', (doorAngle * 180 / Math.PI).toFixed(1));

// Verify head position (local +Z is forward ~35 units)
const headWorldPos = {
  x: dogWorldPos.x + 35 * Math.sin(doorAngle),
  z: dogWorldPos.z + 35 * Math.cos(doorAngle)
};
const headScreenPos = coordSystem.worldToScreen(headWorldPos.x, headWorldPos.z);
console.log('Head Screen Pos (poking out):', headScreenPos);
console.log('Head is beyond doorway step by:', (headScreenPos.x - stepScreenPos.x).toFixed(1), 'px in X');
