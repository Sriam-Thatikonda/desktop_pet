import * as THREE from 'three';

// Verify all components of the Kettle Cottage
const group = new THREE.Group();

// 1. Ceramic cottage walls (hollow with doorway)
const wallRadiusTop = 48;
const wallRadiusBottom = 56;
const wallHeight = 52;
// Opening angle: 80 degrees (0.44 * PI)
// Theta start at 0.3 * PI, length = 1.56 * PI
const wallGeo = new THREE.CylinderGeometry(
  wallRadiusTop, wallRadiusBottom, wallHeight, 36, 1, true,
  Math.PI * 0.22, Math.PI * 1.56
);
const wallMat = new THREE.MeshStandardMaterial({
  color: 0xd25a35, // Warm terracotta kettle
  roughness: 0.35,
  metalness: 0.1,
  side: THREE.DoubleSide
});
const walls = new THREE.Mesh(wallGeo, wallMat);
walls.position.y = wallHeight / 2;
group.add(walls);

// 2. Base & Soft Bed Cushion
const bedGeo = new THREE.CylinderGeometry(46, 50, 6, 32);
const bedMat = new THREE.MeshStandardMaterial({ color: 0xf4eedb, roughness: 0.9 });
const bed = new THREE.Mesh(bedGeo, bedMat);
bed.position.y = 3;
group.add(bed);

// 3. Wooden Doorstep / Threshold
const stepGeo = new THREE.BoxGeometry(32, 4, 18);
const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.7 });
const step = new THREE.Mesh(stepGeo, woodMat);
step.position.set(38, 2, 28);
step.rotation.y = -Math.PI * 0.28;
group.add(step);

// 4. Roof / Kettle Lid
const roofGeo = new THREE.ConeGeometry(54, 28, 36);
const roofMat = new THREE.MeshStandardMaterial({ color: 0xba4a28, roughness: 0.35 });
const roof = new THREE.Mesh(roofGeo, roofMat);
roof.position.y = wallHeight + 14;
group.add(roof);

// 5. Brass Knob & Handle
const brassMat = new THREE.MeshStandardMaterial({ color: 0xdfb15b, metalness: 0.8, roughness: 0.25 });
const knobGeo = new THREE.SphereGeometry(6, 16, 16);
const knob = new THREE.Mesh(knobGeo, brassMat);
knob.position.y = wallHeight + 30;
group.add(knob);

const handleGeo = new THREE.TorusGeometry(32, 3, 12, 32, Math.PI);
const handle = new THREE.Mesh(handleGeo, brassMat);
handle.position.set(0, wallHeight + 18, 0);
handle.rotation.x = Math.PI / 2;
handle.rotation.y = -Math.PI * 0.25;
group.add(handle);

// 6. Spout Chimney
const spoutGeo = new THREE.CylinderGeometry(4, 9, 28, 16);
const spout = new THREE.Mesh(spoutGeo, wallMat);
spout.position.set(-42, 42, -15);
spout.rotation.z = Math.PI / 3;
spout.rotation.y = Math.PI * 0.3;
group.add(spout);

console.log('Total children in Kettle Cottage:', group.children.length);
