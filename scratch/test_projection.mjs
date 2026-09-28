import * as THREE from 'three';

const width = 1536;
const height = 864;
const tiltDeg = 30;
const tiltRad = (tiltDeg * Math.PI) / 180;

const camera = new THREE.OrthographicCamera(
  -width / 2, width / 2,
  height / 2, -height / 2,
  -4000, 4000
);

// We want camera to look at (0, 0, 0)
// Distance D along view vector
const D = 1000;
camera.position.set(0, D * Math.sin(tiltRad), D * Math.cos(tiltRad));
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();

// Let's test what formula for worldZ gives EXACTLY screenY!
// Test multiple points from top to bottom
const testPoints = [
  [768, 50],   // top
  [768, 150],  // upper
  [768, 432],  // center
  [768, 700],  // lower
  [768, 850],  // bottom
];

console.log('Testing formula: worldZ = (screenY - height/2) / Math.sin(tiltRad)');
for (const [sx, sy] of testPoints) {
  const worldX = sx - width / 2;
  // Let's test with sin(tiltRad):
  const worldZ = (sy - height / 2) / Math.sin(tiltRad);

  const p = new THREE.Vector3(worldX, 0, worldZ);
  p.project(camera);

  const px = (p.x + 1) * width / 2;
  const py = (1 - p.y) * height / 2;

  const errX = Math.abs(px - sx);
  const errY = Math.abs(py - sy);
  console.log(`Input: (${sx}, ${sy}) -> Projected: (${px.toFixed(2)}, ${py.toFixed(2)}) | Error: (X=${errX.toFixed(4)}, Y=${errY.toFixed(4)})`);
}
