import * as THREE from 'three';
import { CoordinateSystem } from '../src/renderer/movement/CoordinateSystem.js';
import { DogStateMachine } from '../src/renderer/behavior/DogStateMachine.js';
import { MovementController } from '../src/renderer/movement/MovementController.js';

const width = 1536;
const height = 864;
const coordSystem = new CoordinateSystem(width, height, height - 48, 30);
const movement = new MovementController(coordSystem, 768, 432);
const sm = new DogStateMachine({ animController: null }, movement, coordSystem);

const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -4000, 4000);
const D = 1000;
camera.position.set(0, D * Math.sin(coordSystem.tiltAngle), D * Math.cos(coordSystem.tiltAngle));
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();

const testPositions = [
  { desc: 'Top of screen', cursor: { x: 768, y: 60 } },
  { desc: 'Upper screen', cursor: { x: 768, y: 200 } },
  { desc: 'Center screen', cursor: { x: 768, y: 432 } },
  { desc: 'Lower screen', cursor: { x: 768, y: 650 } },
  { desc: 'Near taskbar', cursor: { x: 768, y: 780 } },
];

console.log('=== VISUAL OFFSET ACCURACY TEST ===\n');

for (const t of testPositions) {
  const target = sm.calculateTargetPositionNearCursor(t.cursor);

  // Convert logical target to 3D world space
  const world = coordSystem.screenToWorld(target.x, target.y);

  // Project 3D world through Three.js camera
  const p = new THREE.Vector3(world.x, 0, world.z);
  p.project(camera);
  const renderScreenX = (p.x + 1) * width / 2;
  const renderScreenY = (1 - p.y) * height / 2;

  // Measure actual visual pixel distance between cursor and rendered dog
  const visualDist = Math.hypot(renderScreenX - t.cursor.x, renderScreenY - t.cursor.y);
  console.log(`${t.desc.padEnd(16)} | Cursor: (${t.cursor.x}, ${t.cursor.y}) -> Rendered: (${renderScreenX.toFixed(1)}, ${renderScreenY.toFixed(1)}) | Visual Distance: ${visualDist.toFixed(1)} px`);
}
