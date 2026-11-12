import * as THREE from 'three';
import { EnemyActor } from '../types';
import { soundEngine } from '../audio/SoundEngine';
import { createFabricTexture, createGunmetalTexture } from './ProceduralTextures';

export class EnemyAIManager {
  private scene: THREE.Scene;
  public enemies: EnemyActor[] = [];

  // PBR Materials with high visual contrast & fabric weave
  private uniformMat = new THREE.MeshStandardMaterial({
    map: createFabricTexture('#1c2026'),
    roughness: 0.8,
    metalness: 0.12,
  });

  private vestMat = new THREE.MeshStandardMaterial({
    map: createFabricTexture('#2d362a'),
    roughness: 0.75,
    metalness: 0.18,
  });

  private helmetMat = new THREE.MeshStandardMaterial({
    color: 0x16181b,
    roughness: 0.35,
    metalness: 0.65,
  });

  private visorMat = new THREE.MeshStandardMaterial({
    color: 0xff2222,
    emissive: 0xff1111,
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.85,
  });

  private armorPlateMat = new THREE.MeshStandardMaterial({
    color: 0x111316,
    roughness: 0.5,
    metalness: 0.5,
  });

  private weaponMat = new THREE.MeshStandardMaterial({
    map: createGunmetalTexture(),
    roughness: 0.3,
    metalness: 0.8,
  });

  private droneHullMat = new THREE.MeshStandardMaterial({
    color: 0x15181e,
    roughness: 0.3,
    metalness: 0.85,
  });

  private carbonMat = new THREE.MeshStandardMaterial({
    color: 0x0d0e12,
    roughness: 0.45,
    metalness: 0.6,
  });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Spawn a tactical Insurgent Rifleman built as an anatomical 12-part composite model:
   * 1. Contoured torso with ripstop combat uniform
   * 2. MOLLE tactical plate carrier vest with mag pouches
   * 3. Ops-Core FAST ballistic helmet with NVG mount and ear cups
   * 4. Curved reflective ballistic goggles
   * 5. Two-handed combat arms holding carbine
   * 6. Contoured legs with tactical knee pads and combat boots
   * 7. Detailed AK carbine weapon
   * 8. Telegraph targeting laser
   */
  public spawnRifleman(x: number, y: number, z: number): EnemyActor {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // 1. Contoured Torso
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.65, 16);
    const torso = new THREE.Mesh(torsoGeo, this.uniformMat);
    torso.position.y = 1.15;
    torso.scale.set(1.2, 1.0, 0.85);
    torso.castShadow = true;
    group.add(torso);

    // 2. MOLLE Tactical Plate Carrier Vest
    const vestGeo = new THREE.CylinderGeometry(0.27, 0.25, 0.46, 16);
    const vest = new THREE.Mesh(vestGeo, this.vestMat);
    vest.position.y = 1.22;
    vest.scale.set(1.22, 1.0, 0.92);
    vest.castShadow = true;
    group.add(vest);

    // Front triple rifle magazine pouches
    for (let i = -1; i <= 1; i++) {
      const pouchGeo = new THREE.BoxGeometry(0.09, 0.18, 0.07);
      const pouch = new THREE.Mesh(pouchGeo, this.armorPlateMat);
      pouch.position.set(i * 0.11, 1.15, 0.22);
      pouch.castShadow = true;
      group.add(pouch);
    }

    // Tactical radio with antenna on back shoulder
    const radioGeo = new THREE.BoxGeometry(0.08, 0.16, 0.06);
    const radio = new THREE.Mesh(radioGeo, this.armorPlateMat);
    radio.position.set(-0.18, 1.32, -0.2);
    group.add(radio);

    const antennaGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.35, 6);
    const antenna = new THREE.Mesh(antennaGeo, this.armorPlateMat);
    antenna.position.set(-0.18, 1.55, -0.2);
    antenna.rotation.z = -0.15;
    group.add(antenna);

    // 3. Ops-Core FAST Combat Helmet
    const helmetGeo = new THREE.SphereGeometry(0.18, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const helmet = new THREE.Mesh(helmetGeo, this.helmetMat);
    helmet.position.y = 1.74;
    helmet.castShadow = true;
    group.add(helmet);

    // NVG Shroud Mount on forehead
    const nvgMountGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
    const nvgMount = new THREE.Mesh(nvgMountGeo, this.armorPlateMat);
    nvgMount.position.set(0, 1.76, 0.17);
    group.add(nvgMount);

    // Headset Ear Protection Cups
    const earCupGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.04, 12);
    earCupGeo.rotateZ(Math.PI / 2);
    const leftEar = new THREE.Mesh(earCupGeo, this.armorPlateMat);
    leftEar.position.set(-0.17, 1.7, 0);
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earCupGeo, this.armorPlateMat);
    rightEar.position.set(0.17, 1.7, 0);
    group.add(rightEar);

    // 4. Curved Ballistic Goggles with Glowing Optics
    const goggleGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.07, 16, 1, false, -Math.PI / 4, Math.PI / 2);
    const goggle = new THREE.Mesh(goggleGeo, this.visorMat);
    goggle.position.set(0, 1.7, 0.04);
    group.add(goggle);

    // 5. Two-Handed Combat Arms
    // Left arm forward holding handguard
    const leftArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.42, 12);
    leftArmGeo.rotateX(Math.PI / 3);
    const leftArm = new THREE.Mesh(leftArmGeo, this.uniformMat);
    leftArm.position.set(-0.24, 1.25, 0.18);
    leftArm.castShadow = true;
    group.add(leftArm);

    // Right arm holding pistol grip
    const rightArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.38, 12);
    rightArmGeo.rotateX(Math.PI / 4);
    const rightArm = new THREE.Mesh(rightArmGeo, this.uniformMat);
    rightArm.position.set(0.24, 1.25, 0.14);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Tactical Gloves
    const gloveGeo = new THREE.SphereGeometry(0.055, 12, 12);
    const leftGlove = new THREE.Mesh(gloveGeo, this.armorPlateMat);
    leftGlove.position.set(-0.08, 1.12, 0.38);
    group.add(leftGlove);

    const rightGlove = new THREE.Mesh(gloveGeo, this.armorPlateMat);
    rightGlove.position.set(0.16, 1.12, 0.28);
    group.add(rightGlove);

    // 6. Articulated Combat Legs & Boots
    const createLeg = (posX: number) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(posX, 0, 0);

      // Thigh
      const thighGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.42, 12);
      const thigh = new THREE.Mesh(thighGeo, this.uniformMat);
      thigh.position.y = 0.65;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // Tactical Knee Pad
      const kneePadGeo = new THREE.SphereGeometry(0.075, 12, 10);
      const kneePad = new THREE.Mesh(kneePadGeo, this.armorPlateMat);
      kneePad.position.set(0, 0.45, 0.07);
      kneePad.scale.set(1.0, 1.2, 0.6);
      legGroup.add(kneePad);

      // Shin
      const shinGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.38, 12);
      const shin = new THREE.Mesh(shinGeo, this.uniformMat);
      shin.position.y = 0.26;
      shin.castShadow = true;
      legGroup.add(shin);

      // Combat Boot with rugged sole
      const bootGeo = new THREE.BoxGeometry(0.12, 0.12, 0.24);
      const boot = new THREE.Mesh(bootGeo, this.armorPlateMat);
      boot.position.set(0, 0.06, 0.03);
      boot.castShadow = true;
      legGroup.add(boot);

      return legGroup;
    };

    group.add(createLeg(-0.16));
    group.add(createLeg(0.16));

    // 7. Tactical AK Carbine Weapon
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0.08, 1.15, 0.32);

    const receiverGeo = new THREE.BoxGeometry(0.05, 0.08, 0.34);
    const gunReceiver = new THREE.Mesh(receiverGeo, this.weaponMat);
    gunGroup.add(gunReceiver);

    const barrelGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.28, 16);
    barrelGeo.rotateX(Math.PI / 2);
    const gunBarrel = new THREE.Mesh(barrelGeo, this.weaponMat);
    gunBarrel.position.set(0, 0.015, 0.28);
    gunGroup.add(gunBarrel);

    const magGeo = new THREE.CylinderGeometry(0.02, 0.018, 0.18, 10);
    magGeo.rotateX(-0.25);
    const gunMag = new THREE.Mesh(magGeo, this.armorPlateMat);
    gunMag.position.set(0, -0.09, 0.06);
    gunMag.scale.set(0.8, 1.0, 1.4);
    gunGroup.add(gunMag);

    group.add(gunGroup);

    // 8. Visible Targeting Laser Windup Indicator
    const laserGeo = new THREE.CylinderGeometry(0.006, 0.006, 14, 6);
    laserGeo.rotateX(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const laser = new THREE.Mesh(laserGeo, laserMat);
    laser.position.set(0.08, 1.16, 7.35);
    group.add(laser);

    this.scene.add(group);

    const enemy: EnemyActor = {
      id: `rifleman_${Math.random().toString(36).substring(2, 8)}`,
      type: 'rifleman',
      mesh: group,
      health: 80,
      maxHealth: 80,
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      state: 'patrol',
      patrolTarget: { x: x + (Math.random() - 0.5) * 8, z: z + (Math.random() - 0.5) * 8 },
      shootCooldown: 1.5 + Math.random() * 1.5,
      aimTime: 0,
      isAlerted: false,
      telegraphGlow: laser,
    };

    this.enemies.push(enemy);
    return enemy;
  }

  /**
   * Spawn a Combat Recon Drone (aerodynamic carbon fiber airframe)
   */
  public spawnCombatDrone(x: number, y: number, z: number): EnemyActor {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // 1. Aerodynamic Central Fuselage
    const fuselageGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.18, 24);
    const fuselage = new THREE.Mesh(fuselageGeo, this.droneHullMat);
    fuselage.castShadow = true;
    group.add(fuselage);

    // 2. Optical Sensor Dome Turret
    const eyeTurretGeo = new THREE.SphereGeometry(0.12, 18, 16);
    const eyeTurret = new THREE.Mesh(eyeTurretGeo, this.visorMat);
    eyeTurret.position.set(0, -0.06, 0.22);
    group.add(eyeTurret);

    // 3. 4 Carbon Fiber Tubular Motor Booms
    const boomGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.65, 12);
    boomGeo.rotateZ(Math.PI / 4);
    const boom1 = new THREE.Mesh(boomGeo, this.carbonMat);
    boom1.position.y = 0.04;
    group.add(boom1);

    const boom2 = new THREE.Mesh(boomGeo, this.carbonMat);
    boom2.position.y = 0.04;
    boom2.rotation.y = Math.PI / 2;
    group.add(boom2);

    // 4. Brushless Motor Pods & Spinning Propellers
    const rotorOffsets = [
      [-0.42, 0.06, -0.42],
      [0.42, 0.06, -0.42],
      [-0.42, 0.06, 0.42],
      [0.42, 0.06, 0.42],
    ];

    rotorOffsets.forEach(pos => {
      // Motor nacelle
      const motorGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.07, 16);
      const motor = new THREE.Mesh(motorGeo, this.droneHullMat);
      motor.position.set(pos[0], pos[1], pos[2]);
      group.add(motor);

      // Aerodynamic dual-blade prop
      const propGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.012, 16);
      const prop = new THREE.Mesh(propGeo, this.carbonMat);
      prop.position.set(pos[0], pos[1] + 0.04, pos[2]);
      group.add(prop);
    });

    // 5. Downward Search & Targeting Spotlight
    const droneLight = new THREE.PointLight(0xff2222, 1.4, 14);
    droneLight.position.set(0, -0.2, 0);
    group.add(droneLight);

    this.scene.add(group);

    const enemy: EnemyActor = {
      id: `drone_${Math.random().toString(36).substring(2, 8)}`,
      type: 'drone',
      mesh: group,
      health: 50,
      maxHealth: 50,
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      state: 'patrol',
      patrolTarget: { x: x + (Math.random() - 0.5) * 12, z: z + (Math.random() - 0.5) * 12 },
      shootCooldown: 1.0,
      aimTime: 0,
      isAlerted: false,
      telegraphGlow: droneLight,
    };

    this.enemies.push(enemy);
    return enemy;
  }

  /**
   * Update enemy AI states, pathfinding, and combat targeting
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    onEnemyShoot: (enemy: EnemyActor, origin: THREE.Vector3, dir: THREE.Vector3, damage: number) => void
  ) {
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'dead') return;

      const mesh = enemy.mesh;
      const enemyPos = mesh.position;
      const distToPlayer = enemyPos.distanceTo(playerPos);

      // Line of sight / alert radius (35m)
      if (distToPlayer < 38) {
        enemy.isAlerted = true;
      }

      // Smooth look-at player rotation
      if (enemy.isAlerted) {
        const toPlayer = new THREE.Vector3().subVectors(playerPos, enemyPos);
        toPlayer.y = 0;
        toPlayer.normalize();
        const targetRotY = Math.atan2(toPlayer.x, toPlayer.z);

        // Smooth rotation damping
        let diff = (targetRotY - mesh.rotation.y) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        mesh.rotation.y += diff * Math.min(1.0, delta * 6.0);

        // Combat behavior: Aim and Shoot with telegraph indicator
        enemy.shootCooldown -= delta;

        if (enemy.shootCooldown <= 0.8 && enemy.shootCooldown > 0) {
          // Windup phase: brighten telegraph
          const telegraphProg = 1.0 - enemy.shootCooldown / 0.8;
          if (enemy.type === 'rifleman' && enemy.telegraphGlow instanceof THREE.Mesh) {
            (enemy.telegraphGlow.material as THREE.MeshBasicMaterial).opacity = telegraphProg * 0.9;
          } else if (enemy.type === 'drone' && enemy.telegraphGlow instanceof THREE.PointLight) {
            enemy.telegraphGlow.intensity = 1.0 + telegraphProg * 2.5;
          }
        } else if (enemy.shootCooldown <= 0) {
          // Fire shot at player
          const shotOrigin = enemyPos.clone().add(new THREE.Vector3(0, enemy.type === 'drone' ? 0 : 1.15, 0));
          const aimSpread = (Math.random() - 0.5) * 0.07;
          const shotDir = new THREE.Vector3().subVectors(playerPos, shotOrigin).normalize();
          shotDir.x += aimSpread;
          shotDir.z += aimSpread;
          shotDir.normalize();

          const damage = enemy.type === 'drone' ? 14 : 22;
          onEnemyShoot(enemy, shotOrigin, shotDir, damage);

          // Reset cooldown
          enemy.shootCooldown = 1.8 + Math.random() * 1.4;

          // Reset telegraph
          if (enemy.type === 'rifleman' && enemy.telegraphGlow instanceof THREE.Mesh) {
            (enemy.telegraphGlow.material as THREE.MeshBasicMaterial).opacity = 0;
          } else if (enemy.type === 'drone' && enemy.telegraphGlow instanceof THREE.PointLight) {
            enemy.telegraphGlow.intensity = 1.2;
          }
        }

        // Slight tactical strafe
        if (distToPlayer > 12 && enemy.type === 'rifleman') {
          const moveDir = toPlayer.clone().multiplyScalar(delta * 2.2);
          enemyPos.add(moveDir);
        } else if (enemy.type === 'drone') {
          // Bobbing hover animation
          mesh.position.y += Math.sin(performance.now() * 0.003) * 0.008;
        }
      }
    });
  }

  /**
   * Handle taking damage and ragdoll / death animation
   */
  public damageEnemy(enemy: EnemyActor, damage: number, isHeadshot: boolean = false): { isKill: boolean; damageDealt: number } {
    if (enemy.state === 'dead') return { isKill: false, damageDealt: 0 };

    const effectiveDamage = isHeadshot ? damage * 2.5 : damage;
    enemy.health = Math.max(0, enemy.health - effectiveDamage);

    if (enemy.health <= 0) {
      enemy.state = 'dead';
      // Trigger ragdoll collapse
      enemy.mesh.rotation.x = Math.PI / 2;
      enemy.mesh.position.y = 0.2;

      if (enemy.type === 'rifleman' && enemy.telegraphGlow instanceof THREE.Mesh) {
        (enemy.telegraphGlow.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      soundEngine.playEnemyDeath();
      return { isKill: true, damageDealt: effectiveDamage };
    }

    return { isKill: false, damageDealt: effectiveDamage };
  }

  public cleanup() {
    this.enemies.forEach((e) => {
      this.scene.remove(e.mesh);
    });
    this.enemies = [];
  }
}
