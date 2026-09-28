import * as THREE from 'three';

export class AnimationController {
  constructor(modelRoot) {
    this.modelRoot = modelRoot;
    this.mixer = new THREE.AnimationMixer(modelRoot);
    this.actions = new Map(); // clipName -> AnimationAction
    this.currentAction = null;
    this.currentState = null;

    // Head / Tail procedural animation bones
    this.headBone = null;
    this.neckBone = null;
    this.tailBones = [];
    this.spineBone = null;
    this.findProceduralBones();

    // Procedural states
    this.tailWagTime = 0;
    this.tailWagIntensity = 0;
    this.headTargetAngle = 0;
    this.currentHeadAngle = 0;
    this.breathingTime = 0;
    this.currentSleepPitch = 0;
    this.isSittingProcedural = false;
    this.isSleepingProcedural = false;
  }

  findProceduralBones() {
    this.modelRoot.traverse((child) => {
      if (child.isBone) {
        const name = child.name.toLowerCase();
        // Head is DEF-spine011
        if ((name.includes('spine011') || name.includes('head')) && !this.headBone) {
          this.headBone = child;
        }
        // Neck is DEF-spine010
        else if ((name.includes('spine010') || name.includes('neck')) && !this.neckBone) {
          this.neckBone = child;
        }
        // Tail bones are DEF-spine003, DEF-spine002, DEF-spine001, DEF-spine
        else if (name === 'def-spine' || name.includes('spine001') || name.includes('spine002') || name.includes('spine003') || name.includes('tail')) {
          this.tailBones.push(child);
        }
        else if ((name.includes('spine006') || name.includes('pelvis') || name.includes('root')) && !this.spineBone) {
          this.spineBone = child;
        }
      }
    });
  }

  registerClip(name, clip) {
    if (!clip) return;
    const action = this.mixer.clipAction(clip);
    this.actions.set(name, action);
  }

  hasClip(name) {
    return this.actions.has(name);
  }

  play(name, crossFadeDuration = 0.35, loop = true) {
    if (this.currentState === name && this.currentAction && this.currentAction.isRunning()) {
      return;
    }

    const nextAction = this.actions.get(name);
    if (!nextAction) {
      console.warn(`Animation action '${name}' not found.`);
      return;
    }

    nextAction.reset();
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.clampWhenFinished = !loop;
    nextAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;

    if (this.currentAction) {
      this.currentAction.crossFadeTo(nextAction, crossFadeDuration, true);
    }

    nextAction.play();
    this.currentAction = nextAction;
    this.currentState = name;

    // Reset procedural flags depending on state
    this.isSittingProcedural = (name === 'SIT');
    this.isSleepingProcedural = (name === 'SLEEP');
  }

  setTailWag(intensity) {
    this.tailWagIntensity = THREE.MathUtils.clamp(intensity, 0, 1);
  }

  setHeadLookAt(angleRad) {
    this.headTargetAngle = angleRad;
  }

  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // Procedural tail wagging (excited / playful)
    if (this.tailBones.length > 0 && this.tailWagIntensity > 0.01) {
      this.tailWagTime += deltaTime * (8 + this.tailWagIntensity * 12);
      const wagAngle = Math.sin(this.tailWagTime) * 0.45 * this.tailWagIntensity;
      this.tailBones.forEach((bone, index) => {
        bone.rotation.y += wagAngle * (1 + index * 0.3);
      });
    }

    // Procedural head tracking
    if (this.headBone) {
      this.currentHeadAngle = THREE.MathUtils.lerp(
        this.currentHeadAngle,
        this.headTargetAngle,
        deltaTime * 5
      );
      this.headBone.rotation.y += this.currentHeadAngle * 0.35;
    }

    // Procedural breathing & sitting/sleeping posture refinement
    this.breathingTime += deltaTime;
    if (this.isSleepingProcedural && this.modelRoot) {
      // Gentle rhythmic breathing movement while curled down for sleep inside cottage
      const breath = Math.sin(this.breathingTime * 1.6) * 0.5;
      this.modelRoot.position.y = THREE.MathUtils.lerp(this.modelRoot.position.y, -11 + breath, deltaTime * 4);

      // Relax head & snout gently down resting on the wooden threshold doorstep
      const targetPitch = 0.24 + Math.sin(this.breathingTime * 1.6) * 0.03;
      this.currentSleepPitch = THREE.MathUtils.lerp(this.currentSleepPitch, targetPitch, deltaTime * 3);
    } else if (this.isSittingProcedural && this.modelRoot) {
      // Natural sit posture
      this.modelRoot.position.y = THREE.MathUtils.lerp(this.modelRoot.position.y, -4, deltaTime * 4);
      this.currentSleepPitch = THREE.MathUtils.lerp(this.currentSleepPitch, 0, deltaTime * 6);
    } else if (this.modelRoot) {
      this.modelRoot.position.y = THREE.MathUtils.lerp(this.modelRoot.position.y, 0, deltaTime * 5);
      this.currentSleepPitch = THREE.MathUtils.lerp(this.currentSleepPitch, 0, deltaTime * 6);
    }

    if (this.headBone && this.currentSleepPitch > 0.001) {
      this.headBone.rotation.x += this.currentSleepPitch;
    }
    if (this.neckBone && this.currentSleepPitch > 0.001) {
      this.neckBone.rotation.x += this.currentSleepPitch * 0.4;
    }
  }
}
