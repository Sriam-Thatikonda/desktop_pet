import * as THREE from 'three';

export class SceneManager {
  constructor(container, coordinateSystem) {
    this.container = container;
    this.coordSystem = coordinateSystem;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.shadowMesh = null;
    this.lights = {};

    this.init();
  }

  init() {
    const width = this.coordSystem.screenWidth;
    const height = this.coordSystem.screenHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Orthographic Camera with downward isometric tilt
    const halfW = width / 2;
    const halfH = height / 2;
    this.camera = new THREE.OrthographicCamera(
      -halfW, halfW,
      halfH, -halfH,
      -4000, 4000
    );

    // Position camera along view axis looking precisely at origin (0, 0, 0)
    const tilt = this.coordSystem.tiltAngle;
    const D = 1000;
    this.camera.position.set(0, D * Math.sin(tilt), D * Math.cos(tilt));
    this.camera.lookAt(0, 0, 0);

    // 3. WebGL Renderer with full alpha transparency
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0); // Completely transparent
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting setup for rich 3D fur rendering
    this.setupLighting();

    // 5. Contact Shadow setup (procedural soft radial shadow disk)
    this.setupContactShadow();
  }

  setupLighting() {
    // Ambient light - warm soft ambient
    const ambientLight = new THREE.AmbientLight(0xf0f4ff, 1.3);
    this.scene.add(ambientLight);
    this.lights.ambient = ambientLight;

    // Key directional light (sun / room light from top-right)
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.8);
    keyLight.position.set(400, 800, 500);
    this.scene.add(keyLight);
    this.lights.key = keyLight;

    // Fill light (cooler soft light from opposite side)
    const fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.9);
    fillLight.position.set(-500, 400, -300);
    this.scene.add(fillLight);
    this.lights.fill = fillLight;

    // Rim light (highlighting fur silhouette from behind)
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(0, 300, -600);
    this.scene.add(rimLight);
    this.lights.rim = rimLight;
  }

  setupContactShadow() {
    // Generate soft radial gradient canvas for contact shadow
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.35)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTexture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(80, 80);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.8
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2; // Flat on floor
    this.shadowMesh.position.y = 0.5; // Slight offset to prevent z-fighting
    this.scene.add(this.shadowMesh);
  }

  updateShadowPosition(x, z, scale = 1.0) {
    if (this.shadowMesh) {
      this.shadowMesh.position.x = x;
      this.shadowMesh.position.z = z;
      this.shadowMesh.scale.set(scale, scale * 1.3, 1.0); // Slightly elongated along body axis
    }
  }

  resize(width, height) {
    const halfW = width / 2;
    const halfH = height / 2;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
