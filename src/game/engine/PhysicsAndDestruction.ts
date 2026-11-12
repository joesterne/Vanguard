import * as THREE from 'three';
import { DestructibleObject } from '../types';
import { createConcreteTexture, createHazardTexture, createCrateWoodTexture } from './ProceduralTextures';
import { soundEngine } from '../audio/SoundEngine';

export interface DebrisChunk {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface EjectedCasing {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
}

export interface ParticleEffect {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  scaleGrowth: number;
  alphaDecay: number;
  life: number;
  maxLife: number;
}

export class PhysicsAndDestructionManager {
  private scene: THREE.Scene;
  public destructibles: DestructibleObject[] = [];
  public activeDebris: DebrisChunk[] = [];
  public activeCasings: EjectedCasing[] = [];
  public activeParticles: ParticleEffect[] = [];

  // Shared reusable geometries & materials
  private concreteGeo = new THREE.BoxGeometry(0.25, 0.2, 0.3);
  private woodChunkGeo = new THREE.BoxGeometry(0.18, 0.12, 0.22);
  private casingGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.035, 8);
  private casingMat = new THREE.MeshStandardMaterial({
    color: 0xdeb887,
    metalness: 0.95,
    roughness: 0.15,
  });
  private sparkMat = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });
  private smokeMat = new THREE.MeshBasicMaterial({
    color: 0x777e88,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  private explosionFireMat = new THREE.MeshBasicMaterial({
    color: 0xff6622,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Spawn a modern contoured concrete blast barrier (Jersey barrier with beveled sloped profile)
   */
  public createConcreteBarrier(x: number, y: number, z: number, rotY: number = 0): DestructibleObject {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const concreteTex = createConcreteTexture();
    const concreteMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      metalness: 0.12,
      roughness: 0.85,
    });

    // Realistic contoured Jersey barrier cross-section shape
    const shape = new THREE.Shape();
    shape.moveTo(-0.42, 0);
    shape.lineTo(0.42, 0);
    shape.lineTo(0.42, 0.12);
    shape.lineTo(0.26, 0.42);
    shape.lineTo(0.15, 1.18);
    shape.lineTo(-0.15, 1.18);
    shape.lineTo(-0.26, 0.42);
    shape.lineTo(-0.42, 0.12);
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 1,
      depth: 3.2,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    };

    const barrierGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    barrierGeo.center();
    // Rotate so depth is aligned with Z
    barrierGeo.rotateY(Math.PI / 2);

    const barrierMesh = new THREE.Mesh(barrierGeo, concreteMat);
    barrierMesh.position.y = 0.59;
    barrierMesh.castShadow = true;
    barrierMesh.receiveShadow = true;
    group.add(barrierMesh);

    // Steel lifting rebar loop on top
    const rebarGeo = new THREE.TorusGeometry(0.08, 0.016, 8, 16);
    const rebarMat = new THREE.MeshStandardMaterial({ color: 0x24282e, metalness: 0.85, roughness: 0.35 });
    const rebar = new THREE.Mesh(rebarGeo, rebarMat);
    rebar.position.set(0, 1.25, 0);
    group.add(rebar);

    this.scene.add(group);

    const obj: DestructibleObject = {
      id: `barrier_${Math.random().toString(36).substring(2, 8)}`,
      type: 'barrier',
      mesh: group,
      health: 120,
      maxHealth: 120,
      isDestroyed: false,
      position: { x, y, z },
      boundingRadius: 1.6,
    };

    this.destructibles.push(obj);
    return obj;
  }

  /**
   * Spawn an explosive fuel drum with stamped chime rings, rolling hoops, and hazard markings
   */
  public createExplosiveBarrel(x: number, y: number, z: number): DestructibleObject {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const hazardTex = createHazardTexture();
    const barrelMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      metalness: 0.78,
      roughness: 0.32,
    });

    const steelRimMat = new THREE.MeshStandardMaterial({
      color: 0x121418,
      metalness: 0.85,
      roughness: 0.28,
    });

    // 32-segment smooth barrel cylinder
    const barrelGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.2, 32);
    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrelMesh.position.y = 0.6;
    barrelMesh.castShadow = true;
    barrelMesh.receiveShadow = true;
    group.add(barrelMesh);

    // Stamped top and bottom chimes (rims)
    const chimeGeo = new THREE.TorusGeometry(0.428, 0.022, 12, 32);
    chimeGeo.rotateX(Math.PI / 2);

    const topChime = new THREE.Mesh(chimeGeo, steelRimMat);
    topChime.position.y = 1.18;
    group.add(topChime);

    const botChime = new THREE.Mesh(chimeGeo, steelRimMat);
    botChime.position.y = 0.04;
    group.add(botChime);

    // Middle rolling hoops (characteristic steel drum ribs)
    const midHoop1 = new THREE.Mesh(chimeGeo, steelRimMat);
    midHoop1.position.y = 0.42;
    group.add(midHoop1);

    const midHoop2 = new THREE.Mesh(chimeGeo, steelRimMat);
    midHoop2.position.y = 0.78;
    group.add(midHoop2);

    // Threaded bung caps on top lid
    const bungGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.025, 12);
    const bung = new THREE.Mesh(bungGeo, steelRimMat);
    bung.position.set(0.18, 1.21, 0.12);
    group.add(bung);

    this.scene.add(group);

    const obj: DestructibleObject = {
      id: `barrel_${Math.random().toString(36).substring(2, 8)}`,
      type: 'barrel',
      mesh: group,
      health: 45,
      maxHealth: 45,
      isDestroyed: false,
      isExplosive: true,
      position: { x, y, z },
      boundingRadius: 0.7,
    };

    this.destructibles.push(obj);
    return obj;
  }

  /**
   * Spawn a destructible military supply ammo crate with reinforced corner braces & rope handles
   */
  public createSupplyCrate(x: number, y: number, z: number, rotY: number = 0): DestructibleObject {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;

    const crateTex = createCrateWoodTexture();
    const crateMat = new THREE.MeshStandardMaterial({
      map: crateTex,
      metalness: 0.18,
      roughness: 0.72,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1d2127,
      metalness: 0.85,
      roughness: 0.35,
    });

    // Main wooden crate body
    const crateGeo = new THREE.BoxGeometry(1.2, 0.85, 1.2);
    const crateMesh = new THREE.Mesh(crateGeo, crateMat);
    crateMesh.position.y = 0.425;
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;
    group.add(crateMesh);

    // Overhanging lid rim
    const lidGeo = new THREE.BoxGeometry(1.26, 0.08, 1.26);
    const lid = new THREE.Mesh(lidGeo, crateMat);
    lid.position.y = 0.88;
    lid.castShadow = true;
    group.add(lid);

    // Recessed steel rope handles on left & right sides
    const handleGeo = new THREE.TorusGeometry(0.1, 0.016, 8, 16, Math.PI);
    handleGeo.rotateX(Math.PI / 2);
    const leftHandle = new THREE.Mesh(handleGeo, steelMat);
    leftHandle.position.set(-0.62, 0.5, 0);
    group.add(leftHandle);

    const rightHandle = new THREE.Mesh(handleGeo, steelMat);
    rightHandle.position.set(0.62, 0.5, 0);
    group.add(rightHandle);

    this.scene.add(group);

    const obj: DestructibleObject = {
      id: `crate_${Math.random().toString(36).substring(2, 8)}`,
      type: 'crate',
      mesh: group,
      health: 60,
      maxHealth: 60,
      isDestroyed: false,
      position: { x, y, z },
      boundingRadius: 0.9,
    };

    this.destructibles.push(obj);
    return obj;
  }

  /**
   * Apply damage to a destructible object and handle realistic shatter & explosive blast
   */
  public damageObject(
    obj: DestructibleObject,
    damage: number,
    hitPoint: THREE.Vector3,
    onExplosionRadialDamage?: (center: THREE.Vector3, radius: number, maxDamage: number) => void
  ): boolean {
    if (obj.isDestroyed) return false;

    obj.health -= damage;
    this.spawnImpactSparks(hitPoint);

    if (obj.health <= 0) {
      obj.isDestroyed = true;
      this.shatterObject(obj, hitPoint, onExplosionRadialDamage);
      return true;
    }
    return false;
  }

  /**
   * Realistic destruction physics: shatters object into rigid body chunks with blast impulse
   */
  private shatterObject(
    obj: DestructibleObject,
    hitPoint: THREE.Vector3,
    onExplosionRadialDamage?: (center: THREE.Vector3, radius: number, maxDamage: number) => void
  ) {
    const pos = obj.mesh.position.clone();
    this.scene.remove(obj.mesh);

    if (obj.isExplosive) {
      // Barrel explosion chain reaction with spatial occlusion & reflection
      soundEngine.playExplosion(pos);
      this.spawnExplosionEffect(pos);
      if (onExplosionRadialDamage) {
        onExplosionRadialDamage(pos, 7.5, 120);
      }
    } else {
      soundEngine.playDebrisShatter(pos);
      this.spawnDustCloud(pos);
    }

    // Spawn 8 - 14 real physics debris chunks
    const chunkCount = obj.type === 'barrier' ? 12 : 8;
    const isWood = obj.type === 'crate';

    for (let i = 0; i < chunkCount; i++) {
      const geo = isWood ? this.woodChunkGeo : this.concreteGeo;
      const mat = isWood
        ? new THREE.MeshStandardMaterial({ color: 0x444b36, roughness: 0.8 })
        : new THREE.MeshStandardMaterial({ color: 0x686e75, roughness: 0.85 });

      const chunkMesh = new THREE.Mesh(geo, mat);
      chunkMesh.castShadow = true;
      chunkMesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.8,
        pos.y + 0.3 + Math.random() * 0.5,
        pos.z + (Math.random() - 0.5) * 0.8
      );

      // Random scale for natural broken silhouette
      const s = 0.6 + Math.random() * 0.8;
      chunkMesh.scale.set(s, s, s);

      // Explosive outward impulse
      const impulseStrength = obj.isExplosive ? 14 + Math.random() * 10 : 6 + Math.random() * 6;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const velocity = dir.multiplyScalar(impulseStrength);
      const rotVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );

      this.scene.add(chunkMesh);
      this.activeDebris.push({
        mesh: chunkMesh,
        velocity,
        rotVelocity,
        life: 5.0,
        maxLife: 5.0,
      });
    }
  }

  /**
   * Eject brass spent shell casing during weapon firing
   */
  public ejectBrassCasing(origin: THREE.Vector3, weaponRot: THREE.Euler) {
    const casing = new THREE.Mesh(this.casingGeo, this.casingMat);
    casing.position.copy(origin);
    this.scene.add(casing);

    // Eject to the right and slightly up/back
    const ejectDir = new THREE.Vector3(1.2 + Math.random() * 0.4, 1.8 + Math.random() * 0.5, -0.6 + Math.random() * 0.3);
    ejectDir.applyEuler(weaponRot);

    this.activeCasings.push({
      mesh: casing,
      velocity: ejectDir.multiplyScalar(1.8),
      rotVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
      ),
      life: 2.5,
    });
  }

  /**
   * Bullet impact sparks
   */
  public spawnImpactSparks(pos: THREE.Vector3) {
    for (let i = 0; i < 6; i++) {
      const sparkGeo = new THREE.SphereGeometry(0.02, 4, 4);
      const mesh = new THREE.Mesh(sparkGeo, this.sparkMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );

      this.activeParticles.push({
        mesh,
        velocity: vel,
        scaleGrowth: -0.015,
        alphaDecay: 3.5,
        life: 0.3,
        maxLife: 0.3,
      });
    }
  }

  /**
   * Concrete dust / smoke cloud
   */
  public spawnDustCloud(pos: THREE.Vector3) {
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 6, 6);
      const mesh = new THREE.Mesh(geo, this.smokeMat.clone());
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.5,
        pos.y + 0.4 + Math.random() * 0.4,
        pos.z + (Math.random() - 0.5) * 0.5
      );
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 1.2
      );

      this.activeParticles.push({
        mesh,
        velocity: vel,
        scaleGrowth: 0.6,
        alphaDecay: 0.7,
        life: 1.2,
        maxLife: 1.2,
      });
    }
  }

  /**
   * Massive fireball & smoke explosion
   */
  public spawnExplosionEffect(pos: THREE.Vector3) {
    // Fireball core expanding sphere
    const fireGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const fireMesh = new THREE.Mesh(fireGeo, this.explosionFireMat.clone());
    fireMesh.position.copy(pos);
    fireMesh.position.y += 0.5;
    this.scene.add(fireMesh);

    this.activeParticles.push({
      mesh: fireMesh,
      velocity: new THREE.Vector3(0, 1.8, 0),
      scaleGrowth: 4.5,
      alphaDecay: 1.4,
      life: 0.8,
      maxLife: 0.8,
    });

    // Surrounding rolling smoke clouds
    for (let i = 0; i < 8; i++) {
      const smokeGeo = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 6, 6);
      const smokeMesh = new THREE.Mesh(smokeGeo, this.smokeMat.clone());
      smokeMesh.position.set(
        pos.x + (Math.random() - 0.5) * 1.0,
        pos.y + 0.4 + Math.random() * 0.8,
        pos.z + (Math.random() - 0.5) * 1.0
      );
      this.scene.add(smokeMesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        Math.random() * 3.0 + 1.2,
        (Math.random() - 0.5) * 3.5
      );

      this.activeParticles.push({
        mesh: smokeMesh,
        velocity: vel,
        scaleGrowth: 1.5,
        alphaDecay: 0.6,
        life: 1.8,
        maxLife: 1.8,
      });
    }

    // Dynamic explosion point light
    const blastLight = new THREE.PointLight(0xff6622, 5.0, 15);
    blastLight.position.copy(pos);
    blastLight.position.y += 1.0;
    this.scene.add(blastLight);

    let lightLife = 0.25;
    const fadeLight = () => {
      lightLife -= 0.05;
      blastLight.intensity = Math.max(0, lightLife * 20);
      if (lightLife > 0) {
        requestAnimationFrame(fadeLight);
      } else {
        this.scene.remove(blastLight);
      }
    };
    fadeLight();
  }

  /**
   * Per-frame physics simulation update: gravity, bounce, friction, and lifetimes
   */
  public update(delta: number) {
    const gravity = -18.0;

    // 1. Update Debris Chunks
    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const chunk = this.activeDebris[i];
      chunk.life -= delta;

      // Apply gravity
      chunk.velocity.y += gravity * delta;

      // Position step
      chunk.mesh.position.addScaledVector(chunk.velocity, delta);

      // Rotation step
      chunk.mesh.rotation.x += chunk.rotVelocity.x * delta;
      chunk.mesh.rotation.y += chunk.rotVelocity.y * delta;
      chunk.mesh.rotation.z += chunk.rotVelocity.z * delta;

      // Floor collision & bounce damping
      if (chunk.mesh.position.y <= 0.1) {
        chunk.mesh.position.y = 0.1;
        chunk.velocity.y = -chunk.velocity.y * 0.38; // restitution
        chunk.velocity.x *= 0.75; // ground friction
        chunk.velocity.z *= 0.75;
        chunk.rotVelocity.multiplyScalar(0.7);
      }

      // Fade out and remove
      if (chunk.life <= 0) {
        this.scene.remove(chunk.mesh);
        this.activeDebris.splice(i, 1);
      }
    }

    // 2. Update Ejected Spent Casings
    for (let i = this.activeCasings.length - 1; i >= 0; i--) {
      const casing = this.activeCasings[i];
      casing.life -= delta;

      casing.velocity.y += gravity * delta;
      casing.mesh.position.addScaledVector(casing.velocity, delta);
      casing.mesh.rotation.x += casing.rotVelocity.x * delta;
      casing.mesh.rotation.y += casing.rotVelocity.y * delta;

      if (casing.mesh.position.y <= 0.02) {
        casing.mesh.position.y = 0.02;
        casing.velocity.y = -casing.velocity.y * 0.35;
        casing.velocity.x *= 0.6;
        casing.velocity.z *= 0.6;
      }

      if (casing.life <= 0) {
        this.scene.remove(casing.mesh);
        this.activeCasings.splice(i, 1);
      }
    }

    // 3. Update Particles (Sparks, Smoke, Fire)
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= delta;

      p.mesh.position.addScaledVector(p.velocity, delta);
      p.velocity.multiplyScalar(0.96); // drag

      const scaleInc = 1 + p.scaleGrowth * delta;
      p.mesh.scale.multiplyScalar(scaleInc);

      const mat = p.mesh.material as THREE.Material & { opacity: number };
      if (mat && mat.opacity !== undefined) {
        mat.opacity = Math.max(0, mat.opacity - p.alphaDecay * delta);
      }

      if (p.life <= 0 || (mat && mat.opacity <= 0)) {
        this.scene.remove(p.mesh);
        this.activeParticles.splice(i, 1);
      }
    }
  }

  /**
   * Reset / Clear all debris and destructibles for new round or mission
   */
  public cleanup() {
    this.destructibles.forEach(d => this.scene.remove(d.mesh));
    this.destructibles = [];
    this.activeDebris.forEach(d => this.scene.remove(d.mesh));
    this.activeDebris = [];
    this.activeCasings.forEach(c => this.scene.remove(c.mesh));
    this.activeCasings = [];
    this.activeParticles.forEach(p => this.scene.remove(p.mesh));
    this.activeParticles = [];
  }
}
