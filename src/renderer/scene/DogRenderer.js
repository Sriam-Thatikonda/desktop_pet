import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { AnimationController } from '../animation/AnimationController.js';
import { DogConfig } from '../config/DogConfig.js';

export class DogRenderer {
  constructor(scene, coordinateSystem) {
    this.scene = scene;
    this.coordSystem = coordinateSystem;

    this.dogGroup = new THREE.Group();
    this.scene.add(this.dogGroup);

    this.mesh = null;
    this.animController = null;
    this.isLoaded = false;
    this.baseScale = 1.0;
  }

  async loadAssets(onProgress) {
    const loader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();

    const basePath = '../../assets/test-dog/rsg_dogspack_germanshepherd_fbx';

    // 1. Load PBR Textures (Husky Puppy coat)
    if (onProgress) onProgress(10, 'Loading textures...');
    const [baseColorMap, normalMap, roughnessMap] = await Promise.all([
      textureLoader.loadAsync(`${basePath}/Textures/T_Husky_B.png`),
      textureLoader.loadAsync(`${basePath}/Textures/T_GermanShepherd_N.png`),
      textureLoader.loadAsync(`${basePath}/Textures/T_GermanShepherd_R.png`),
    ]);

    baseColorMap.colorSpace = THREE.SRGBColorSpace;

    // Create high quality PBR material with soft fur sheen
    const dogMaterial = new THREE.MeshStandardMaterial({
      map: baseColorMap,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
      roughness: 0.85,
      metalness: 0.05,
    });

    // 2. Load Base Skinned Mesh
    if (onProgress) onProgress(30, 'Loading 3D mesh...');
    const fbxMesh = await loader.loadAsync(`${basePath}/Mesh/SK_GermanShepherd_01.fbx`);

    fbxMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = dogMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Compute bounding box to calculate exact scale for desktop target height
    const bbox = new THREE.Box3().setFromObject(fbxMesh);
    const rawHeight = bbox.max.y - bbox.min.y;
    // Target height in 3D world units (which corresponds directly to screen pixels in orthographic view)
    this.baseScale = (DogConfig.targetHeightPixels * DogConfig.visualScale) / (rawHeight || 100);
    fbxMesh.scale.set(this.baseScale, this.baseScale, this.baseScale);

    this.mesh = fbxMesh;
    this.dogGroup.add(this.mesh);

    // Initialize animation controller with the loaded model
    this.animController = new AnimationController(this.mesh);

    // 3. Load Skeletal Animations
    if (onProgress) onProgress(50, 'Loading animations...');
    const animFiles = [
      { key: 'IDLE', file: '1 type_Idle Breathing_v01.fbx' },
      { key: 'PLAYFUL', file: '1 type_Idle_Playing_v01.fbx' },
      { key: 'WALK', file: '1 type_Walk Loop_v01.fbx' },
      { key: 'RUN', file: '1 type_Run Loop_v01.fbx' },
    ];

    for (let i = 0; i < animFiles.length; i++) {
      const { key, file } = animFiles[i];
      try {
        const animFbx = await loader.loadAsync(`${basePath}/Animations/${file}`);
        if (animFbx.animations && animFbx.animations.length > 0) {
          const clip = animFbx.animations[0];
          clip.name = key;
          this.animController.registerClip(key, clip);
        }
      } catch (err) {
        console.warn(`Failed to load animation ${file}:`, err);
      }
      if (onProgress) onProgress(50 + (i + 1) * 10, `Loaded ${key}...`);
    }

    // Set up SIT and SLEEP clips using Idle Breathing base with posture blends
    if (this.animController.hasClip('IDLE')) {
      const idleAction = this.animController.actions.get('IDLE');
      if (idleAction) {
        // Clone idle clip for SIT and SLEEP
        const sitClip = idleAction.getClip().clone();
        sitClip.name = 'SIT';
        this.animController.registerClip('SIT', sitClip);

        const sleepClip = idleAction.getClip().clone();
        sleepClip.name = 'SLEEP';
        this.animController.registerClip('SLEEP', sleepClip);
      }
    }

    this.isLoaded = true;
    if (onProgress) onProgress(100, 'Ready!');

    // Start with calm IDLE animation
    this.animController.play('IDLE', 0.1);
  }

  setVisualScale(scaleMultiplier) {
    if (this.mesh) {
      const newScale = this.baseScale * scaleMultiplier;
      this.mesh.scale.set(newScale, newScale, newScale);
    }
  }

  updatePositionAndRotation(worldPos, facingAngleRad) {
    if (!this.dogGroup) return;

    this.dogGroup.position.set(worldPos.x, worldPos.y, worldPos.z);
    // Smooth facing rotation around Y axis
    this.dogGroup.rotation.y = facingAngleRad;
  }

  update(deltaTime) {
    if (this.animController) {
      this.animController.update(deltaTime);
    }
  }
}
