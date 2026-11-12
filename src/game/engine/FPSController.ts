import * as THREE from 'three';
import { WeaponDef, PlayerStats } from '../types';
import { WeaponRig, buildMK18WeaponMesh, buildPistolWeaponMesh, INITIAL_WEAPONS } from './Weapons';
import { soundEngine } from '../audio/SoundEngine';

export class FPSController {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;

  // Viewmodel camera rig
  public weaponRigGroup: THREE.Group;
  public currentRig: WeaponRig;
  public weapons: WeaponDef[] = INITIAL_WEAPONS;
  public activeWeaponIndex: number = 0;

  // Player state
  public stats: PlayerStats;
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 18);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;

  // Camera orientation
  public pitch: number = 0; // vertical angle (radians)
  public yaw: number = 0;   // horizontal angle (radians)
  public mouseSensitivity: number = 0.0022;

  // Input states
  private keys: { [key: string]: boolean } = {};
  public isPointerLocked: boolean = false;
  private isMouseDown: boolean = false;
  private isRightMouseDown: boolean = false;

  // Weapon stances & animations
  private hipPos = new THREE.Vector3(0.2, -0.18, -0.38);
  private adsPos = new THREE.Vector3(0.0, -0.078, -0.28);
  private currentWeaponOffset = new THREE.Vector3(0.2, -0.18, -0.38);
  private weaponRecoilOffset = new THREE.Vector3();
  private weaponRecoilRot = new THREE.Vector3();
  private cameraRecoilPitch: number = 0;
  private walkBobTime: number = 0;
  private footstepTimer: number = 0;

  // Inspect Weapon Animation
  public isInspecting: boolean = false;
  private inspectTime: number = 0;
  private inspectDuration: number = 3.6;
  private inspectOffset = new THREE.Vector3();
  private inspectRot = new THREE.Vector3();

  // Fire timing
  private lastShotTime: number = 0;
  private reloadTimer: number = 0;

  // Pre-allocated vectors to prevent GC allocations
  private _moveDir = new THREE.Vector3();
  private _forward = new THREE.Vector3();
  private _right = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.stats = {
      health: 100,
      maxHealth: 100,
      armor: 100,
      maxArmor: 100,
      stamina: 100,
      maxStamina: 100,
      currentWeaponIndex: 0,
      currentMag: INITIAL_WEAPONS[0].magazineSize,
      reserveAmmo: INITIAL_WEAPONS[0].reserveAmmo,
      grenades: 2,
      score: 0,
      kills: 0,
      headshots: 0,
      shotsFired: 0,
      shotsHit: 0,
      timeElapsed: 0,
      isReloading: false,
      isAiming: false,
      isSprinting: false,
      isCrouching: false,
      isInspecting: false,
    };

    // Attach weapon rig group directly as child of camera
    this.weaponRigGroup = new THREE.Group();
    this.camera.add(this.weaponRigGroup);

    // Initial weapon rig
    this.currentRig = buildMK18WeaponMesh('default');
    this.weaponRigGroup.add(this.currentRig.group);
    this.currentRig.group.position.copy(this.hipPos);

    this.setupEventListeners();
  }

  public startInspect() {
    if (this.stats.isReloading || this.stats.isAiming || this.stats.isSprinting) return;
    this.isInspecting = true;
    this.stats.isInspecting = true;
    this.inspectTime = 0;
    soundEngine.playInspectWeapon();
  }

  public cancelInspect() {
    if (this.isInspecting || this.stats.isInspecting) {
      this.isInspecting = false;
      this.stats.isInspecting = false;
      this.inspectTime = 0;
    }
  }

  private setupEventListeners() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // Prevent context menu during right-click ADS
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public requestPointerLock() {
    this.domElement.requestPointerLock();
  }

  public exitPointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  private onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isPointerLocked) return;

    const sens = this.stats.isAiming ? this.mouseSensitivity * 0.65 : this.mouseSensitivity;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;

    // Clamp vertical look to [-89°, +89°]
    this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));

    // Weapon sway lag on mouse movement
    this.weaponRecoilRot.y -= e.movementX * 0.0006;
    this.weaponRecoilRot.x -= e.movementY * 0.0006;
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.isPointerLocked) {
      this.requestPointerLock();
      return;
    }

    if (e.button === 0) {
      this.isMouseDown = true;
      this.cancelInspect();
    } else if (e.button === 2) {
      this.isRightMouseDown = true;
      this.stats.isAiming = true;
      this.cancelInspect();
      soundEngine.playADS(true);
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.isMouseDown = false;
    } else if (e.button === 2) {
      this.isRightMouseDown = false;
      this.stats.isAiming = false;
      soundEngine.playADS(false);
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;

    // Reload trigger (R)
    if (e.code === 'KeyR' && !this.stats.isReloading) {
      this.startReload();
    }

    // Inspect weapon trigger (I)
    if (e.code === 'KeyI' || e.key === 'i' || e.key === 'I') {
      if (this.isInspecting) {
        this.cancelInspect();
      } else {
        this.startInspect();
      }
    }

    // Switch weapons (1 or 2)
    if (e.code === 'Digit1') this.switchWeapon(0);
    if (e.code === 'Digit2') this.switchWeapon(1);

    // Crouch toggle (KeyC)
    if (e.code === 'KeyC') {
      this.stats.isCrouching = !this.stats.isCrouching;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
  }

  public switchWeapon(index: number) {
    if (index === this.activeWeaponIndex || index >= this.weapons.length) return;
    if (this.stats.isReloading) return;
    this.cancelInspect();

    this.activeWeaponIndex = index;
    this.stats.currentWeaponIndex = index;
    const def = this.weapons[index];
    this.stats.currentMag = def.magazineSize;
    this.stats.reserveAmmo = def.reserveAmmo;

    // Replace 3D mesh rig
    this.weaponRigGroup.remove(this.currentRig.group);
    if (index === 0) {
      this.currentRig = buildMK18WeaponMesh(def.camoId);
    } else {
      this.currentRig = buildPistolWeaponMesh(def.camoId);
    }
    this.weaponRigGroup.add(this.currentRig.group);

    soundEngine.playADS(false);
  }

  public setWeaponCamo(weaponIndex: number, camoId: string) {
    if (this.weapons[weaponIndex]) {
      this.weapons[weaponIndex].camoId = camoId;
      if (this.activeWeaponIndex === weaponIndex) {
        this.weaponRigGroup.remove(this.currentRig.group);
        if (weaponIndex === 0) {
          this.currentRig = buildMK18WeaponMesh(camoId);
        } else {
          this.currentRig = buildPistolWeaponMesh(camoId);
        }
        this.weaponRigGroup.add(this.currentRig.group);
      }
    }
  }

  public startReload() {
    const currentDef = this.weapons[this.activeWeaponIndex];
    if (this.stats.currentMag >= currentDef.magazineSize || this.stats.reserveAmmo <= 0) return;
    this.cancelInspect();

    this.stats.isReloading = true;
    this.reloadTimer = currentDef.reloadTime;
    soundEngine.playReload();
  }

  /**
   * Shoot active weapon
   */
  public attemptShoot(onBulletFired: (origin: THREE.Vector3, direction: THREE.Vector3, weapon: WeaponDef) => void) {
    if (!this.isPointerLocked) return;
    if (this.stats.isReloading) return;

    const currentDef = this.weapons[this.activeWeaponIndex];
    const now = performance.now() / 1000;
    const fireInterval = 1.0 / currentDef.fireRate;

    if (now - this.lastShotTime < fireInterval) return;

    if (this.stats.currentMag <= 0) {
      soundEngine.playDryFire();
      this.lastShotTime = now;
      this.startReload();
      return;
    }

    // Spend round
    this.stats.currentMag--;
    this.stats.shotsFired++;
    this.lastShotTime = now;

    // Sound with acoustic environment processing
    if (currentDef.type === 'assault_rifle') {
      soundEngine.playRifleFire({ isPlayer: true, origin: this.position });
    } else {
      soundEngine.playPistolFire({ isPlayer: true, origin: this.position });
    }

    // Recoil impulse
    this.weaponRecoilOffset.z += 0.045; // kickback
    this.weaponRecoilRot.x += currentDef.recoilVertical;
    this.weaponRecoilRot.y += (Math.random() - 0.5) * currentDef.recoilHorizontal;
    this.cameraRecoilPitch += currentDef.recoilVertical * 0.45;

    // Muzzle flash visibility trigger
    if (this.currentRig.muzzleFlashMesh && this.currentRig.muzzleLight) {
      const flashMat = this.currentRig.muzzleFlashMesh.material as THREE.MeshBasicMaterial;
      flashMat.opacity = 1.0;
      this.currentRig.muzzleLight.intensity = 4.0;
      setTimeout(() => {
        if (this.currentRig?.muzzleFlashMesh && this.currentRig.muzzleLight) {
          (this.currentRig.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0;
          this.currentRig.muzzleLight.intensity = 0;
        }
      }, 45);
    }

    // Direction with spread bloom
    const spread = this.stats.isAiming ? currentDef.adsSpread : (this.stats.isCrouching ? currentDef.spread * 0.5 : currentDef.spread);
    const dir = new THREE.Vector3(0, 0, -1);
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    dir.normalize();

    onBulletFired(this.camera.position.clone(), dir, currentDef);
  }

  /**
   * Apply damage to player
   */
  public takeDamage(amount: number) {
    let remaining = amount;
    soundEngine.playPlayerHit();

    if (this.stats.armor > 0) {
      const absorbed = Math.min(this.stats.armor, remaining * 0.7);
      this.stats.armor -= absorbed;
      remaining -= absorbed;
    }

    this.stats.health = Math.max(0, this.stats.health - remaining);

    // Heartbeat audio if health is critical (< 30)
    soundEngine.setHeartbeatActive(this.stats.health > 0 && this.stats.health <= 30);
  }

  /**
   * Frame update for movement, input, spring recoil recovery, weapon stance & camera
   */
  public update(delta: number, onBulletFired: (origin: THREE.Vector3, direction: THREE.Vector3, weapon: WeaponDef) => void) {
    this.stats.timeElapsed += delta;

    // 1. Continuous firing check for automatic weapons
    if (this.isMouseDown) {
      this.attemptShoot(onBulletFired);
    }

    // 2. Reload progress
    if (this.stats.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.stats.isReloading = false;
        const currentDef = this.weapons[this.activeWeaponIndex];
        const needed = currentDef.magazineSize - this.stats.currentMag;
        const taken = Math.min(needed, this.stats.reserveAmmo);
        this.stats.currentMag += taken;
        this.stats.reserveAmmo -= taken;
      }
    }

    // 3. Movement Calculations
    const isShift = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    this.stats.isSprinting = isShift && (this.keys['KeyW'] || this.keys['ArrowUp']) && !this.stats.isAiming && this.stats.stamina > 10;
    if (this.stats.isSprinting && this.isInspecting) {
      this.cancelInspect();
    }

    // Stamina depletion / recovery
    if (this.stats.isSprinting) {
      this.stats.stamina = Math.max(0, this.stats.stamina - delta * 22);
    } else {
      this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + delta * 16);
    }

    let moveSpeed = 4.8;
    if (this.stats.isSprinting) moveSpeed = 8.2;
    if (this.stats.isAiming) moveSpeed = 2.4;
    if (this.stats.isCrouching) moveSpeed = 2.2;

    this._moveDir.set(0, 0, 0);
    if (this.keys['KeyW'] || this.keys['ArrowUp']) this._moveDir.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) this._moveDir.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this._moveDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this._moveDir.x += 1;

    const isMoving = this._moveDir.lengthSq() > 0.001;
    if (isMoving) {
      this._moveDir.normalize();

      // Project onto camera yaw plane
      this._forward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this._right.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      const targetVx = (this._forward.x * -this._moveDir.z + this._right.x * this._moveDir.x) * moveSpeed;
      const targetVz = (this._forward.z * -this._moveDir.z + this._right.z * this._moveDir.x) * moveSpeed;

      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVx, 12, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVz, 12, delta);

      // Footstep sound cadence
      this.footstepTimer += delta * (this.stats.isSprinting ? 1.8 : 1.0);
      if (this.footstepTimer > 0.42) {
        this.footstepTimer = 0;
        soundEngine.playFootstep();
      }

      // Viewmodel walking bobbing
      this.walkBobTime += delta * (this.stats.isSprinting ? 14 : 9);
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 14, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, 14, delta);
    }

    // Jump
    if ((this.keys['Space']) && this.isGrounded) {
      this.velocity.y = 5.8;
      this.isGrounded = false;
    }

    // Gravity
    this.velocity.y -= 18.0 * delta;

    // Apply velocity to position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // Floor collision & standing/crouch height
    const eyeHeight = this.stats.isCrouching ? 1.05 : 1.7;
    if (this.position.y <= eyeHeight) {
      this.position.y = eyeHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // World play area boundary clamp
    this.position.x = Math.max(-55, Math.min(55, this.position.x));
    this.position.z = Math.max(-55, Math.min(55, this.position.z));

    // 4. Update Camera Orientation & Recoil Recovery
    this.cameraRecoilPitch = THREE.MathUtils.damp(this.cameraRecoilPitch, 0, 8, delta);
    const effectivePitch = this.pitch + this.cameraRecoilPitch;

    this.camera.position.copy(this.position);
    this.camera.rotation.set(effectivePitch, this.yaw, 0, 'YXZ');

    // Smooth FOV zoom during ADS
    const targetFOV = this.stats.isAiming ? 52 : 75;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFOV, 16, delta);
    this.camera.updateProjectionMatrix();

    // 5. Weapon Rig Stance & Spring Kinematics
    const targetStance = this.stats.isAiming ? this.adsPos : this.hipPos;
    this.currentWeaponOffset.x = THREE.MathUtils.damp(this.currentWeaponOffset.x, targetStance.x, 16, delta);
    this.currentWeaponOffset.y = THREE.MathUtils.damp(this.currentWeaponOffset.y, targetStance.y, 16, delta);
    this.currentWeaponOffset.z = THREE.MathUtils.damp(this.currentWeaponOffset.z, targetStance.z, 16, delta);

    // Exponential recovery of recoil offsets
    this.weaponRecoilOffset.x = THREE.MathUtils.damp(this.weaponRecoilOffset.x, 0, 18, delta);
    this.weaponRecoilOffset.y = THREE.MathUtils.damp(this.weaponRecoilOffset.y, 0, 18, delta);
    this.weaponRecoilOffset.z = THREE.MathUtils.damp(this.weaponRecoilOffset.z, 0, 18, delta);

    this.weaponRecoilRot.x = THREE.MathUtils.damp(this.weaponRecoilRot.x, 0, 16, delta);
    this.weaponRecoilRot.y = THREE.MathUtils.damp(this.weaponRecoilRot.y, 0, 16, delta);
    this.weaponRecoilRot.z = THREE.MathUtils.damp(this.weaponRecoilRot.z, 0, 16, delta);

    // Inspect weapon animation kinematics
    if (this.isInspecting) {
      this.inspectTime += delta;
      const t = this.inspectTime;

      if (t < 1.3) {
        // Phase 1: Lift towards chest, roll counter-clockwise to inspect receiver markings & optics
        const p1 = t / 1.3;
        const ease1 = Math.sin((p1 * Math.PI) / 2);
        const targetPos = new THREE.Vector3(-0.07, 0.08, 0.12);
        const targetRot = new THREE.Vector3(0.25, -0.35, 0.65);

        this.inspectOffset.lerp(targetPos, ease1);
        this.inspectRot.x = THREE.MathUtils.lerp(this.inspectRot.x, targetRot.x, ease1);
        this.inspectRot.y = THREE.MathUtils.lerp(this.inspectRot.y, targetRot.y, ease1);
        this.inspectRot.z = THREE.MathUtils.lerp(this.inspectRot.z, targetRot.z, ease1);
      } else if (t < 2.5) {
        // Phase 2: Roll over to inspect right flank, bolt carrier & camo finish
        const p2 = (t - 1.3) / 1.2;
        const ease2 = 0.5 - 0.5 * Math.cos(p2 * Math.PI);
        const phase1Pos = new THREE.Vector3(-0.07, 0.08, 0.12);
        const phase2Pos = new THREE.Vector3(-0.02, 0.06, 0.14);
        const phase1Rot = new THREE.Vector3(0.25, -0.35, 0.65);
        const phase2Rot = new THREE.Vector3(-0.18, 0.42, -0.58);

        this.inspectOffset.lerpVectors(phase1Pos, phase2Pos, ease2);
        this.inspectRot.x = THREE.MathUtils.lerp(phase1Rot.x, phase2Rot.x, ease2);
        this.inspectRot.y = THREE.MathUtils.lerp(phase1Rot.y, phase2Rot.y, ease2);
        this.inspectRot.z = THREE.MathUtils.lerp(phase1Rot.z, phase2Rot.z, ease2);
      } else if (t < this.inspectDuration) {
        // Phase 3: Smooth return to hip fire stance
        const p3 = (t - 2.5) / (this.inspectDuration - 2.5);
        const ease3 = Math.sin((p3 * Math.PI) / 2);
        const phase2Pos = new THREE.Vector3(-0.02, 0.06, 0.14);
        const phase2Rot = new THREE.Vector3(-0.18, 0.42, -0.58);

        this.inspectOffset.lerpVectors(phase2Pos, new THREE.Vector3(0, 0, 0), ease3);
        this.inspectRot.x = THREE.MathUtils.lerp(phase2Rot.x, 0, ease3);
        this.inspectRot.y = THREE.MathUtils.lerp(phase2Rot.y, 0, ease3);
        this.inspectRot.z = THREE.MathUtils.lerp(phase2Rot.z, 0, ease3);
      } else {
        this.cancelInspect();
      }
    } else {
      // Exponential damp back to zero
      this.inspectOffset.x = THREE.MathUtils.damp(this.inspectOffset.x, 0, 14, delta);
      this.inspectOffset.y = THREE.MathUtils.damp(this.inspectOffset.y, 0, 14, delta);
      this.inspectOffset.z = THREE.MathUtils.damp(this.inspectOffset.z, 0, 14, delta);

      this.inspectRot.x = THREE.MathUtils.damp(this.inspectRot.x, 0, 14, delta);
      this.inspectRot.y = THREE.MathUtils.damp(this.inspectRot.y, 0, 14, delta);
      this.inspectRot.z = THREE.MathUtils.damp(this.inspectRot.z, 0, 14, delta);
    }

    // Walk bobbing offset (muted when aiming or inspecting)
    const bobMult = (this.stats.isAiming || this.isInspecting) ? 0.05 : 1.0;
    const bobX = isMoving ? Math.cos(this.walkBobTime) * 0.012 * bobMult : 0;
    const bobY = isMoving ? Math.abs(Math.sin(this.walkBobTime)) * 0.016 * bobMult : 0;

    // Apply combined transform to weapon rig group
    this.currentRig.group.position.set(
      this.currentWeaponOffset.x + this.weaponRecoilOffset.x + this.inspectOffset.x + bobX,
      this.currentWeaponOffset.y + this.weaponRecoilOffset.y + this.inspectOffset.y - bobY,
      this.currentWeaponOffset.z + this.weaponRecoilOffset.z + this.inspectOffset.z
    );

    this.currentRig.group.rotation.set(
      this.weaponRecoilRot.x + this.inspectRot.x,
      this.weaponRecoilRot.y + this.inspectRot.y,
      this.weaponRecoilRot.z + this.inspectRot.z
    );
  }

  public cleanup() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    soundEngine.setHeartbeatActive(false);
  }
}
