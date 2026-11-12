import * as THREE from 'three';
import { WeaponDef } from '../types';
import {
  createGunmetalTexture,
  createCamoTexture,
  createHoloReticleTexture,
  createMetalBumpMap,
  createPolymerStippleTexture,
} from './ProceduralTextures';

export interface WeaponRig {
  group: THREE.Group;
  muzzlePos: THREE.Vector3;
  ejectionPos: THREE.Vector3;
  holoSightMesh?: THREE.Mesh;
  muzzleFlashMesh?: THREE.Mesh;
  muzzleLight?: THREE.PointLight;
  inspectLight?: THREE.PointLight;
  reticleSprite?: THREE.Sprite;
  currentCamo: string;
}

export const INITIAL_WEAPONS: WeaponDef[] = [
  {
    id: 'mk18',
    name: 'MK18-MOD1 CQB',
    type: 'assault_rifle',
    damage: 34,
    fireRate: 11.5, // ~690 RPM
    magazineSize: 30,
    reserveAmmo: 180,
    reloadTime: 1.6,
    spread: 0.024,
    adsSpread: 0.003,
    recoilVertical: 0.038,
    recoilHorizontal: 0.012,
    range: 120,
    camoId: 'default',
    unlocked: true,
  },
  {
    id: 'p80',
    name: 'P80 TACTICAL 9MM',
    type: 'pistol',
    damage: 42,
    fireRate: 5.5,
    magazineSize: 15,
    reserveAmmo: 90,
    reloadTime: 1.2,
    spread: 0.018,
    adsSpread: 0.002,
    recoilVertical: 0.052,
    recoilHorizontal: 0.008,
    range: 65,
    camoId: 'default',
    unlocked: true,
  },
];

/**
 * Builds a modern AAA-quality MK18-MOD1 CQB assault rifle with smooth contours,
 * detailed mechanical sub-assemblies, and zero blocky primitives.
 */
export function buildMK18WeaponMesh(camoId: string = 'default'): WeaponRig {
  const group = new THREE.Group();
  group.name = 'weapon_mk18';

  const camoTexture = createCamoTexture(camoId);
  const gunmetalTexture = createGunmetalTexture();
  const metalBumpMap = createMetalBumpMap();
  const polymerStippleTex = createPolymerStippleTexture();

  // 1. Materials with realistic PBR surface properties calibrated per weapon skin
  const isGold = camoId === 'gold';
  const isNeon = camoId === 'neon';
  const isObsidian = camoId === 'obsidian';
  const isDamascus = camoId === 'damascus';

  const receiverMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: camoId === 'default' ? gunmetalTexture : camoTexture,
    bumpMap: metalBumpMap,
    bumpScale: 0.0022,
    metalness: isGold ? 0.92 : isDamascus ? 0.88 : 0.78,
    roughness: isGold ? 0.18 : isDamascus ? 0.22 : 0.28,
    emissive: isNeon ? 0x0891b2 : isObsidian ? 0x3b0764 : isGold ? 0x422006 : 0x000000,
    emissiveIntensity: isNeon ? 0.28 : isObsidian ? 0.2 : isGold ? 0.12 : 0,
  });

  const polymerMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e23,
    map: polymerStippleTex,
    metalness: 0.12,
    roughness: 0.72,
  });

  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: 0x101317,
    bumpMap: metalBumpMap,
    bumpScale: 0.0012,
    metalness: 0.92,
    roughness: 0.22,
  });

  const chromeBoltMat = new THREE.MeshStandardMaterial({
    color: 0x484f58,
    metalness: 0.95,
    roughness: 0.15,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    metalness: 0.2,
    roughness: 0.05,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });

  // 2. Upper & Lower Receiver
  // Upper receiver main housing
  const upperGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.22, 16);
  upperGeo.rotateX(Math.PI / 2);
  const upper = new THREE.Mesh(upperGeo, receiverMat);
  upper.position.set(0, 0.022, 0);
  upper.castShadow = true;
  group.add(upper);

  // Lower receiver & trigger group chassis
  const lowerGeo = new THREE.BoxGeometry(0.042, 0.055, 0.21);
  const lower = new THREE.Mesh(lowerGeo, receiverMat);
  lower.position.set(0, -0.012, 0.005);
  lower.castShadow = true;
  group.add(lower);

  // Flared magazine well with chamfered rim
  const magwellGeo = new THREE.CylinderGeometry(0.023, 0.026, 0.052, 8);
  magwellGeo.rotateY(Math.PI / 8);
  const magwell = new THREE.Mesh(magwellGeo, receiverMat);
  magwell.position.set(0, -0.045, -0.045);
  magwell.scale.set(1.0, 1.0, 1.4);
  magwell.castShadow = true;
  group.add(magwell);

  // Brass deflector wedge & forward assist housing on right flank
  const deflectorGeo = new THREE.ConeGeometry(0.016, 0.024, 4);
  deflectorGeo.rotateZ(Math.PI / 2);
  const deflector = new THREE.Mesh(deflectorGeo, darkSteelMat);
  deflector.position.set(0.026, 0.025, 0.04);
  group.add(deflector);

  const forwardAssistGeo = new THREE.CylinderGeometry(0.006, 0.007, 0.028, 10);
  forwardAssistGeo.rotateZ(-Math.PI / 3);
  const forwardAssist = new THREE.Mesh(forwardAssistGeo, darkSteelMat);
  forwardAssist.position.set(0.026, 0.018, 0.075);
  group.add(forwardAssist);

  // Chrome Bolt Carrier visible through the ejection port
  const boltCarrierGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.07, 12);
  boltCarrierGeo.rotateX(Math.PI / 2);
  const boltCarrier = new THREE.Mesh(boltCarrierGeo, chromeBoltMat);
  boltCarrier.position.set(0.015, 0.022, -0.01);
  group.add(boltCarrier);

  // Charging handle at the rear with T-latch
  const chargingHandleGeo = new THREE.BoxGeometry(0.048, 0.01, 0.022);
  const chargingHandle = new THREE.Mesh(chargingHandleGeo, darkSteelMat);
  chargingHandle.position.set(0, 0.038, 0.115);
  group.add(chargingHandle);

  // Curved trigger guard loop and steel trigger
  const triggerGuardGeo = new THREE.TorusGeometry(0.022, 0.003, 8, 16, Math.PI);
  triggerGuardGeo.rotateX(-Math.PI / 2);
  const triggerGuard = new THREE.Mesh(triggerGuardGeo, darkSteelMat);
  triggerGuard.position.set(0, -0.042, 0.02);
  group.add(triggerGuard);

  const triggerGeo = new THREE.CylinderGeometry(0.002, 0.003, 0.018, 8);
  triggerGeo.rotateX(-0.35);
  const trigger = new THREE.Mesh(triggerGeo, darkSteelMat);
  trigger.position.set(0, -0.034, 0.022);
  group.add(trigger);

  // 3. Ergonomic Tactical Pistol Grip (contoured with beavertail)
  const gripCoreGeo = new THREE.CylinderGeometry(0.018, 0.021, 0.125, 12);
  gripCoreGeo.rotateX(-0.32);
  const grip = new THREE.Mesh(gripCoreGeo, polymerMat);
  grip.position.set(0, -0.078, 0.065);
  grip.scale.set(0.9, 1.0, 1.3);
  grip.castShadow = true;
  group.add(grip);

  // 4. Octagonal Free-Float M-LOK Handguard
  const handguardGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.28, 8);
  handguardGeo.rotateX(Math.PI / 2);
  handguardGeo.rotateZ(Math.PI / 8);
  const handguard = new THREE.Mesh(handguardGeo, receiverMat);
  handguard.position.set(0, 0.02, -0.25);
  handguard.castShadow = true;
  group.add(handguard);

  // Picatinny top rail ribs spanning receiver and handguard
  const railBaseGeo = new THREE.BoxGeometry(0.022, 0.008, 0.44);
  const railBase = new THREE.Mesh(railBaseGeo, darkSteelMat);
  railBase.position.set(0, 0.047, -0.11);
  group.add(railBase);

  // Individual 3D Picatinny cross-slots
  for (let z = 0.09; z >= -0.32; z -= 0.016) {
    const slotGeo = new THREE.BoxGeometry(0.024, 0.004, 0.007);
    const slot = new THREE.Mesh(slotGeo, darkSteelMat);
    slot.position.set(0, 0.051, z);
    group.add(slot);
  }

  // 5. Heavy Match Barrel, Low-Profile Gas Block, and QD Flash Suppressor
  const barrelGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.16, 24);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, darkSteelMat);
  barrel.position.set(0, 0.02, -0.44);
  group.add(barrel);

  // Flash hider with 6 radial compensation ports
  const flashHiderGeo = new THREE.CylinderGeometry(0.013, 0.014, 0.075, 24);
  flashHiderGeo.rotateX(Math.PI / 2);
  const flashHider = new THREE.Mesh(flashHiderGeo, darkSteelMat);
  flashHider.position.set(0, 0.02, -0.54);
  flashHider.castShadow = true;
  group.add(flashHider);

  // 6. Magpul CTR Telescoping Stock
  // Mil-spec 6-position buffer tube
  const bufferTubeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.16, 20);
  bufferTubeGeo.rotateX(Math.PI / 2);
  const bufferTube = new THREE.Mesh(bufferTubeGeo, darkSteelMat);
  bufferTube.position.set(0, 0.02, 0.18);
  group.add(bufferTube);

  // Stock body with contoured cheek weld and rubber buttpad
  const stockBodyGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.14, 12);
  stockBodyGeo.rotateX(Math.PI / 2);
  const stockBody = new THREE.Mesh(stockBodyGeo, polymerMat);
  stockBody.position.set(0, 0.018, 0.24);
  stockBody.scale.set(0.85, 1.5, 1.0);
  stockBody.castShadow = true;
  group.add(stockBody);

  const buttpadGeo = new THREE.BoxGeometry(0.038, 0.12, 0.018);
  const buttpad = new THREE.Mesh(buttpadGeo, darkSteelMat);
  buttpad.position.set(0, -0.005, 0.315);
  buttpad.castShadow = true;
  group.add(buttpad);

  // 7. Curved 30-Round PMAG Magazine with Grip Ribs
  const magGroup = new THREE.Group();
  magGroup.position.set(0, -0.05, -0.045);

  const magBodyGeo = new THREE.CylinderGeometry(0.022, 0.021, 0.17, 10);
  magBodyGeo.rotateY(Math.PI / 10);
  const magBody = new THREE.Mesh(magBodyGeo, polymerMat);
  magBody.position.set(0, -0.07, 0.01);
  magBody.rotation.x = 0.18;
  magBody.scale.set(0.8, 1.0, 1.5);
  magBody.castShadow = true;
  magGroup.add(magBody);

  // Baseplate bumper accented with weapon skin
  const magBumperGeo = new THREE.BoxGeometry(0.034, 0.016, 0.065);
  const magBumper = new THREE.Mesh(magBumperGeo, receiverMat);
  magBumper.position.set(0, -0.15, 0.03);
  magBumper.rotation.x = 0.18;
  magGroup.add(magBumper);

  group.add(magGroup);

  // 8. Tactical Angled BCM Foregrip
  const foregripGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.08, 12);
  foregripGeo.rotateX(0.42);
  const foregrip = new THREE.Mesh(foregripGeo, polymerMat);
  foregrip.position.set(0, -0.035, -0.27);
  foregrip.scale.set(0.9, 1.0, 1.3);
  group.add(foregrip);

  // 9. EOTech EXPS-Style Holographic Sight
  const sightGroup = new THREE.Group();
  sightGroup.position.set(0, 0.054, -0.06);

  // Hood protective aluminum shroud finished in active weapon skin
  const sightHoodGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.095, 16, 1, false, 0, Math.PI);
  sightHoodGeo.rotateZ(Math.PI);
  sightHoodGeo.rotateX(Math.PI / 2);
  const sightHood = new THREE.Mesh(sightHoodGeo, receiverMat);
  sightHood.position.set(0, 0.022, 0);
  sightHood.scale.set(0.9, 0.85, 1.0);
  sightGroup.add(sightHood);

  // Base clamp on Picatinny rail
  const sightBaseGeo = new THREE.BoxGeometry(0.036, 0.022, 0.085);
  const sightBase = new THREE.Mesh(sightBaseGeo, darkSteelMat);
  sightBase.position.set(0, 0.01, 0);
  sightGroup.add(sightBase);

  // Circular optical lenses (front & rear)
  const lensGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.003, 24);
  lensGeo.rotateX(Math.PI / 2);

  const frontLens = new THREE.Mesh(lensGeo, glassMat);
  frontLens.position.set(0, 0.024, -0.042);
  sightGroup.add(frontLens);

  const rearLens = new THREE.Mesh(lensGeo, glassMat);
  rearLens.position.set(0, 0.024, 0.042);
  sightGroup.add(rearLens);

  // Holographic Reticle Sprite
  const reticleTexture = createHoloReticleTexture();
  const reticleSpriteMat = new THREE.SpriteMaterial({
    map: reticleTexture,
    color: 0xff3333,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthTest: false,
  });
  const reticleSprite = new THREE.Sprite(reticleSpriteMat);
  reticleSprite.scale.set(0.028, 0.028, 1);
  reticleSprite.position.set(0, 0.024, -0.044);
  sightGroup.add(reticleSprite);

  group.add(sightGroup);

  // 10. Tactical PEQ-15 Laser / Illuminator on Top Handguard
  const peqGeo = new THREE.BoxGeometry(0.038, 0.022, 0.075);
  const peqMat = new THREE.MeshStandardMaterial({
    color: 0x24282e,
    metalness: 0.35,
    roughness: 0.65,
  });
  const peqModule = new THREE.Mesh(peqGeo, peqMat);
  peqModule.position.set(0, 0.058, -0.32);
  group.add(peqModule);

  // Dual laser aperture lenses
  const laserLensGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.004, 12);
  laserLensGeo.rotateX(Math.PI / 2);
  const laserLens1 = new THREE.Mesh(laserLensGeo, glassMat);
  laserLens1.position.set(-0.01, 0.058, -0.36);
  group.add(laserLens1);

  const laserLens2 = new THREE.Mesh(laserLensGeo, glassMat);
  laserLens2.position.set(0.01, 0.058, -0.36);
  group.add(laserLens2);

  // 11. Muzzle Flash & Dynamic Light
  const flashGeo = new THREE.ConeGeometry(0.045, 0.16, 16);
  flashGeo.rotateX(-Math.PI / 2);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffe277,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlashMesh.position.set(0, 0.02, -0.62);
  group.add(muzzleFlashMesh);

  const muzzleLight = new THREE.PointLight(0xffaa44, 0, 8);
  muzzleLight.position.set(0, 0.02, -0.62);
  group.add(muzzleLight);

  // Dedicated studio key light for in-game weapon skin inspection ('I' key)
  const inspectLight = new THREE.PointLight(0xe0f2fe, 0, 2.5);
  inspectLight.position.set(0.08, 0.14, -0.05);
  group.add(inspectLight);

  return {
    group,
    muzzlePos: new THREE.Vector3(0, 0.02, -0.62),
    ejectionPos: new THREE.Vector3(0.028, 0.024, -0.01),
    holoSightMesh: sightHood,
    muzzleFlashMesh,
    muzzleLight,
    inspectLight,
    reticleSprite,
    currentCamo: camoId,
  };
}

/**
 * Builds a modern AAA-quality P80 Combat Pistol with beveled slide,
 * fluted match barrel, and ergonomic stippled frame.
 */
export function buildPistolWeaponMesh(camoId: string = 'default'): WeaponRig {
  const group = new THREE.Group();
  group.name = 'weapon_p80';

  const camoTexture = createCamoTexture(camoId);
  const gunmetalTexture = createGunmetalTexture();
  const metalBumpMap = createMetalBumpMap();
  const polymerStippleTex = createPolymerStippleTexture();

  const isGold = camoId === 'gold';
  const isNeon = camoId === 'neon';
  const isObsidian = camoId === 'obsidian';

  const slideMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: camoId === 'default' ? gunmetalTexture : camoTexture,
    bumpMap: metalBumpMap,
    bumpScale: 0.002,
    metalness: isGold ? 0.92 : 0.88,
    roughness: isGold ? 0.18 : 0.22,
    emissive: isNeon ? 0x0891b2 : isObsidian ? 0x3b0764 : isGold ? 0x422006 : 0x000000,
    emissiveIntensity: isNeon ? 0.28 : isObsidian ? 0.2 : isGold ? 0.12 : 0,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x16191d,
    map: polymerStippleTex,
    metalness: 0.12,
    roughness: 0.74,
  });

  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e12,
    metalness: 0.94,
    roughness: 0.14,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    transparent: true,
    opacity: 0.4,
    metalness: 0.2,
    roughness: 0.05,
    depthWrite: false,
  });

  // 1. Beveled Slide (chamfered top profile)
  const slideMainGeo = new THREE.BoxGeometry(0.03, 0.034, 0.185);
  const slide = new THREE.Mesh(slideMainGeo, slideMat);
  slide.position.set(0, 0.036, -0.025);
  slide.castShadow = true;
  group.add(slide);

  // Top beveled chamfer along slide crown
  const slideCrownGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.185, 12, 1, false, 0, Math.PI);
  slideCrownGeo.rotateZ(Math.PI);
  slideCrownGeo.rotateX(Math.PI / 2);
  const slideCrown = new THREE.Mesh(slideCrownGeo, slideMat);
  slideCrown.position.set(0, 0.053, -0.025);
  slideCrown.scale.set(0.9, 0.35, 1.0);
  group.add(slideCrown);

  // 2. Crowned Match Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.045, 24);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.set(0, 0.038, -0.13);
  group.add(barrel);

  // 3. Ergonomic Lower Polymer Frame
  const frameGeo = new THREE.BoxGeometry(0.032, 0.028, 0.16);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, 0.008, -0.018);
  frame.castShadow = true;
  group.add(frame);

  // Undercut trigger guard & steel trigger
  const triggerGuardGeo = new THREE.TorusGeometry(0.018, 0.0025, 8, 16, Math.PI);
  triggerGuardGeo.rotateX(-Math.PI / 2);
  const triggerGuard = new THREE.Mesh(triggerGuardGeo, frameMat);
  triggerGuard.position.set(0, -0.016, 0.005);
  group.add(triggerGuard);

  const triggerGeo = new THREE.CylinderGeometry(0.0018, 0.0025, 0.014, 8);
  triggerGeo.rotateX(-0.35);
  const trigger = new THREE.Mesh(triggerGeo, barrelMat);
  trigger.position.set(0, -0.01, 0.008);
  group.add(trigger);

  // 4. Contoured Stippled Pistol Grip
  const gripGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.115, 12);
  gripGeo.rotateX(-0.34);
  const grip = new THREE.Mesh(gripGeo, frameMat);
  grip.position.set(0, -0.052, 0.028);
  grip.scale.set(0.9, 1.0, 1.4);
  grip.castShadow = true;
  group.add(grip);

  // Extended magazine base bumper
  const magBumperGeo = new THREE.BoxGeometry(0.028, 0.014, 0.05);
  const magBumper = new THREE.Mesh(magBumperGeo, barrelMat);
  magBumper.position.set(0, -0.108, 0.048);
  magBumper.rotation.x = -0.34;
  group.add(magBumper);

  // 5. Trijicon RMR-Style Micro Red Dot Optic
  const opticGroup = new THREE.Group();
  opticGroup.position.set(0, 0.062, 0.015);

  const opticBodyGeo = new THREE.CylinderGeometry(0.014, 0.015, 0.038, 12, 1, false, 0, Math.PI);
  opticBodyGeo.rotateZ(Math.PI);
  opticBodyGeo.rotateX(Math.PI / 2);
  const opticBody = new THREE.Mesh(opticBodyGeo, barrelMat);
  opticBody.scale.set(0.95, 0.9, 1.0);
  opticGroup.add(opticBody);

  const opticLensGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.002, 16);
  opticLensGeo.rotateX(Math.PI / 2);
  const opticLens = new THREE.Mesh(opticLensGeo, glassMat);
  opticLens.position.set(0, 0.008, 0.018);
  opticGroup.add(opticLens);

  // Glowing micro dot
  const dotGeo = new THREE.SphereGeometry(0.002, 8, 8);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.set(0, 0.008, 0.016);
  opticGroup.add(dot);

  group.add(opticGroup);

  // 6. Muzzle Flash & Dynamic Light
  const flashGeo = new THREE.ConeGeometry(0.035, 0.12, 14);
  flashGeo.rotateX(-Math.PI / 2);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffe277,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlashMesh.position.set(0, 0.038, -0.17);
  group.add(muzzleFlashMesh);

  const muzzleLight = new THREE.PointLight(0xffaa44, 0, 6);
  muzzleLight.position.set(0, 0.038, -0.17);
  group.add(muzzleLight);

  const inspectLight = new THREE.PointLight(0xe0f2fe, 0, 2.5);
  inspectLight.position.set(0.06, 0.12, -0.02);
  group.add(inspectLight);

  return {
    group,
    muzzlePos: new THREE.Vector3(0, 0.038, -0.17),
    ejectionPos: new THREE.Vector3(0.02, 0.04, -0.01),
    muzzleFlashMesh,
    muzzleLight,
    inspectLight,
    currentCamo: camoId,
  };
}
