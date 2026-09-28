import * as THREE from 'three';
import { WorldObject } from './WorldObject.js';
import { DogConfig } from '../config/DogConfig.js';

/**
 * KettleHome - Cozy 3D Kettle Cottage where the Husky puppy lives & sleeps.
 * Designed with an arched doorway so the dog sleeps inside with its head resting outside.
 */
export class KettleHome extends WorldObject {
  constructor(screenX, screenY, coordinateSystem, scene) {
    super('kettle-home', 'Kettle Cottage', screenX, screenY, DogConfig.kettleHitRadius);
    this.coordSystem = coordinateSystem;
    this.scene = scene;

    this.steamParticles = [];
    this.steamTimer = 0;
    this.interiorLight = null;

    this.build3DModel();
  }

  build3DModel() {
    this.group = new THREE.Group();

    // 1. Cozy Cottage Walls (Hollow ceramic cylinder with arched doorway)
    // Doorway opening faces forward-right (50 degrees) towards screen center
    const doorAngle = 50 * Math.PI / 180; // 0.8727 rad
    const doorSin = Math.sin(doorAngle); // 0.7660
    const doorCos = Math.cos(doorAngle); // 0.6428

    const wallRadiusTop = 48;
    const wallRadiusBottom = 56;
    const wallHeight = 52;
    const doorOpeningAngle = 76 * Math.PI / 180; // 76 degree opening for puppy head & chest
    const thetaStart = doorAngle + doorOpeningAngle / 2; // Starts at 88 deg
    const thetaLength = Math.PI * 2 - doorOpeningAngle;  // Wraps 284 deg around back & sides

    const wallGeo = new THREE.CylinderGeometry(
      wallRadiusTop, wallRadiusBottom, wallHeight, 36, 1, true,
      thetaStart, thetaLength
    );
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd25a35, // Warm terracotta cottage ceramic
      roughness: 0.38,
      metalness: 0.1,
      side: THREE.DoubleSide, // Ensure both inside and outside walls are visible
    });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = wallHeight / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    this.group.add(walls);

    // 2. Base Floor & Plush Dog Bed Inside
    const bedGeo = new THREE.CylinderGeometry(46, 50, 6, 32);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0xf6f0e2, // Soft cream wool fleece cushion
      roughness: 0.9,
    });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.y = 3;
    bed.receiveShadow = true;
    this.group.add(bed);

    // 3. Wooden Doorstep / Threshold where dog rests its chin & front paws
    const threshR = 52;
    const stepGeo = new THREE.BoxGeometry(32, 4, 18);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3818, // Warm rich timber
      roughness: 0.72,
    });
    const step = new THREE.Mesh(stepGeo, woodMat);
    step.position.set(threshR * doorSin, 2, threshR * doorCos);
    step.rotation.y = doorAngle;
    step.receiveShadow = true;
    this.group.add(step);

    // 4. Arched Doorway Wooden Trim & Doorposts
    const postGeo = new THREE.BoxGeometry(3.5, 24, 3.5);
    const postHalfDist = 18.5; // Half width of doorway

    const leftPost = new THREE.Mesh(postGeo, woodMat);
    leftPost.position.set(
      threshR * doorSin - postHalfDist * doorCos,
      12,
      threshR * doorCos + postHalfDist * doorSin
    );
    leftPost.rotation.y = doorAngle;
    this.group.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, woodMat);
    rightPost.position.set(
      threshR * doorSin + postHalfDist * doorCos,
      12,
      threshR * doorCos - postHalfDist * doorSin
    );
    rightPost.rotation.y = doorAngle;
    this.group.add(rightPost);

    const archRadius = 18.5;
    const archGeo = new THREE.TorusGeometry(archRadius, 2.4, 12, 24, Math.PI);
    const arch = new THREE.Mesh(archGeo, woodMat);
    arch.position.set(threshR * doorSin, 24, threshR * doorCos);
    arch.rotation.y = doorAngle;
    this.group.add(arch);

    // 5. Cottage Roof / Kettle Lid with Overhanging Eaves
    const roofGeo = new THREE.ConeGeometry(56, 28, 36);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb84626, // Rich terracotta cottage roof
      roughness: 0.35,
      metalness: 0.05,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = wallHeight + 14;
    roof.castShadow = true;
    this.group.add(roof);

    // 6. Polished Brass Finial Knob atop Roof
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xdfb15b, // Polished brass
      metalness: 0.85,
      roughness: 0.22,
    });
    const knobGeo = new THREE.SphereGeometry(6.5, 16, 16);
    const knob = new THREE.Mesh(knobGeo, brassMat);
    knob.position.y = wallHeight + 30;
    this.group.add(knob);

    // 7. Arched Overhead Brass Kettle Handle
    const handleGeo = new THREE.TorusGeometry(32, 3, 12, 32, Math.PI);
    const handle = new THREE.Mesh(handleGeo, brassMat);
    handle.position.set(0, wallHeight + 18, 0);
    handle.rotation.x = Math.PI / 2;
    handle.rotation.y = doorAngle - Math.PI / 2;
    this.group.add(handle);

    // 8. Spout Chimney on Left Side
    const spoutGeo = new THREE.CylinderGeometry(4.5, 9, 28, 16);
    const spout = new THREE.Mesh(spoutGeo, wallMat);
    spout.position.set(-42, 42, -15);
    spout.rotation.z = Math.PI / 3;
    spout.rotation.y = Math.PI * 0.3;
    this.group.add(spout);

    // 9. Soft Warm Interior Nightlight (creates cozy hearth glow inside cottage)
    this.interiorLight = new THREE.PointLight(0xffa726, 1.3, 110);
    this.interiorLight.position.set(0, 22, 0);
    this.group.add(this.interiorLight);

    // 10. Realistic Soft Contact Shadow
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const shadowTex = new THREE.CanvasTexture(canvas);
      const shadowGeo = new THREE.PlaneGeometry(125, 125);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.4;
      this.group.add(shadowMesh);
    }

    // Position in 3D world space
    this.update3DPosition();
    this.scene.add(this.group);
  }

  update3DPosition() {
    if (!this.group) return;
    const worldPos = this.coordSystem.screenToWorld(this.screenPos.x, this.screenPos.y);
    this.group.position.set(worldPos.x, 0, worldPos.z);
  }

  setScreenPosition(screenX, screenY) {
    this.screenPos.x = screenX;
    this.screenPos.y = screenY;
    this.update3DPosition();
  }

  /**
   * Returns navigation and sleeping sockets so the dog sleeps inside
   * with its head resting outside the doorway on the threshold.
   */
  getInteractionSocket() {
    const doorAngle = 50 * Math.PI / 180; // ~0.8727 rad
    const doorSin = Math.sin(doorAngle); // 0.7660
    const doorCos = Math.cos(doorAngle); // 0.6428
    const sinTilt = this.coordSystem ? this.coordSystem.sinTilt : 0.5;

    // Approach point: 70 units outside the doorway
    const appDist = 70;
    const appScreenDx = Math.round(appDist * doorSin);
    const appScreenDy = Math.round(appDist * doorCos * sinTilt);

    // Sleep point: 13 units from center along doorway
    // Rear & body stay nestled inside cottage bed; head protrudes through door!
    const sleepDist = 13;
    const sleepScreenDx = Math.round(sleepDist * doorSin);
    const sleepScreenDy = Math.round(sleepDist * doorCos * sinTilt);

    // Step-out point: 78 units from center along doorway
    const stepDist = 78;
    const stepScreenDx = Math.round(stepDist * doorSin);
    const stepScreenDy = Math.round(stepDist * doorCos * sinTilt);

    return {
      // Approach point just outside the doorway
      approachX: this.screenPos.x + appScreenDx,
      approachY: this.screenPos.y + appScreenDy,

      // Target position where the dog settles down to sleep
      sleepX: this.screenPos.x + sleepScreenDx,
      sleepY: this.screenPos.y + sleepScreenDy,

      // Position when waking up and stepping out onto the desktop
      stepOutX: this.screenPos.x + stepScreenDx,
      stepOutY: this.screenPos.y + stepScreenDy,

      approachAngle: doorAngle,

      // Legacy compatibility properties
      x: this.screenPos.x + appScreenDx,
      y: this.screenPos.y + appScreenDy,
    };
  }

  update(deltaTime, isDogSleeping) {
    // Floating cozy steam puffs from the kettle chimney while dog sleeps inside
    if (isDogSleeping) {
      this.steamTimer += deltaTime;
      if (this.steamTimer > 0.6) {
        this.steamTimer = 0;
        this.spawnSteamPuff();
      }
    }

    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i];
      p.mesh.position.y += deltaTime * 18;
      p.mesh.scale.multiplyScalar(1 + deltaTime * 0.4);
      p.life -= deltaTime;
      p.mat.opacity = Math.max(0, p.life * 0.45);

      if (p.life <= 0) {
        this.group.remove(p.mesh);
        p.geo.dispose();
        p.mat.dispose();
        this.steamParticles.splice(i, 1);
      }
    }
  }

  spawnSteamPuff() {
    const geo = new THREE.SphereGeometry(2.5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(-52, 54, -20); // At spout chimney opening
    this.group.add(mesh);
    this.steamParticles.push({ mesh, mat, geo, life: 1.6 });
  }
}
