import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameStateStatus, GameMode, CampaignMission, HitMarkerEvent, WeaponDef, KillerInfo, EnemyActor, PlayerStats, SkyboxEnvironmentPreset } from './game/types';
import { CAMPAIGN_MISSIONS } from './game/data/campaignMissions';
import { GameWorld, SKYBOX_PRESETS } from './game/engine/GameWorld';
import { FPSController } from './game/engine/FPSController';
import { PhysicsAndDestructionManager } from './game/engine/PhysicsAndDestruction';
import { EnemyAIManager } from './game/engine/AIEnemies';
import { soundEngine, AcousticState } from './game/audio/SoundEngine';

// UI Modals & Overlays
import { TitleScreen } from './game/components/TitleScreen';
import { MissionBriefingScreen } from './game/components/MissionBriefingScreen';
import { GameHUD } from './game/components/GameHUD';
import { PauseMenu } from './game/components/PauseMenu';
import { GameOverModal } from './game/components/GameOverModal';
import { VictoryModal } from './game/components/VictoryModal';
import { DeathCamOverlay } from './game/components/DeathCamOverlay';
import { MultiplayerLobbyModal } from './game/components/MultiplayerLobbyModal';
import { BattlePassModal } from './game/components/BattlePassModal';
import { GunsmithStoreModal } from './game/components/GunsmithStoreModal';
import { SocialHubModal } from './game/components/SocialHubModal';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // High-level Game States
  const [gameState, setGameState] = useState<GameStateStatus>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('title');
  const [currentMissionIndex, setCurrentMissionIndex] = useState<number>(0);
  const [currentMission, setCurrentMission] = useState<CampaignMission>(CAMPAIGN_MISSIONS[0]);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    'none' | 'multiplayer' | 'battlepass' | 'gunsmith' | 'social'
  >('none');

  // Player & HUD State
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    stamina: 100,
    maxStamina: 100,
    currentWeaponIndex: 0,
    currentMag: 30,
    reserveAmmo: 180,
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
  });

  const [activeWeaponName, setActiveWeaponName] = useState('MK18-MOD1 CQB');
  const [selectedCamoId, setSelectedCamoId] = useState('default');
  const [userCredits, setUserCredits] = useState(1200);
  const [hitmarkers, setHitmarkers] = useState<HitMarkerEvent[]>([]);
  const [lastDamagedTime, setLastDamagedTime] = useState(0);
  const [cameraYaw, setCameraYaw] = useState(0);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [enemyCount, setEnemyCount] = useState(0);

  // Death Camera State
  const [killerInfo, setKillerInfo] = useState<KillerInfo | null>(null);
  const [deathCamProgress, setDeathCamProgress] = useState(0);
  const deathCamRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    targetPanPos: THREE.Vector3;
    killerPos: THREE.Vector3;
    killerEnemy: EnemyActor | null;
  }>({
    active: false,
    startTime: 0,
    duration: 3.8,
    startPos: new THREE.Vector3(),
    targetPanPos: new THREE.Vector3(),
    killerPos: new THREE.Vector3(),
    killerEnemy: null,
  });

  // Settings & Dynamic Skybox Atmosphere
  const [mouseSens, setMouseSens] = useState(0.0022);
  const [fov, setFov] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [skyboxPreset, setSkyboxPreset] = useState<SkyboxEnvironmentPreset>('golden_dusk');
  const [acousticState, setAcousticState] = useState<AcousticState>(() => soundEngine.getAcousticState());
  const lastAcousticUpdate = useRef<number>(0);
  const briefingFocusRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 2.5, -12));

  // Internal 3D Engine references
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    world: GameWorld;
    fpsController: FPSController;
    physicsManager: PhysicsAndDestructionManager;
    enemyManager: EnemyAIManager;
    clock: THREE.Clock;
    isSoftwareGl: boolean;
    raycaster: THREE.Raycaster;
  } | null>(null);

  // Raycaster helper vectors
  const _bulletOrigin = useRef(new THREE.Vector3());
  const _bulletDir = useRef(new THREE.Vector3());

  // Trigger hitmarker feedback
  const triggerHitmarker = useCallback((isHeadshot: boolean, isKill: boolean) => {
    soundEngine.playHitmarker(isHeadshot, isKill);
    const id = Date.now() + Math.random();
    setHitmarkers((prev) => [...prev, { id, isHeadshot, isKill, x: 0, y: 0 }]);
    setTimeout(() => {
      setHitmarkers((prev) => prev.filter((hm) => hm.id !== id));
    }, 180);
  }, []);

  // Initiate cinematic death camera panning to the killer
  const initiateDeathCam = useCallback((enemy: EnemyActor | null, playerPos: THREE.Vector3, shotOrigin: THREE.Vector3) => {
    const engine = engineRef.current;
    if (!engine) return;

    const killerPos = enemy ? enemy.mesh.position.clone() : shotOrigin.clone();
    const killerType = enemy ? enemy.type : 'rifleman';
    const dist = playerPos.distanceTo(killerPos);

    const kInfo: KillerInfo = {
      enemyId: enemy ? enemy.id : 'unknown',
      name: killerType === 'drone' ? 'Apex Recon Drone #8' : 'Apex Syndicate Sentry',
      type: killerType,
      position: killerPos.clone(),
      distance: dist,
    };

    setKillerInfo(kInfo);
    setDeathCamProgress(0);
    setGameState('death_cam');

    // Camera starts at death location
    const startPos = engine.camera.position.clone();
    startPos.y = Math.max(startPos.y, 1.9);

    // Camera pans along trajectory towards killer, elevating for cinematic tactical view
    const offsetDir = playerPos.clone().sub(killerPos).normalize();
    const targetPanPos = killerPos.clone().add(offsetDir.clone().multiplyScalar(Math.min(dist * 0.45, 5.0)));
    targetPanPos.y = Math.max(targetPanPos.y + 1.8, 2.2);

    deathCamRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 3.8,
      startPos,
      targetPanPos,
      killerPos,
      killerEnemy: enemy,
    };

    soundEngine.playDeathCamBassDrop();
    engine.fpsController.weaponRigGroup.visible = false;
    engine.fpsController.exitPointerLock();

    // Visually telegraph/highlight the killer
    if (enemy?.telegraphGlow) {
      enemy.telegraphGlow.visible = true;
      if ('material' in enemy.telegraphGlow) {
        (enemy.telegraphGlow.material as THREE.MeshBasicMaterial).opacity = 1.0;
      }
    }
  }, []);

  // Bullet hit detection against enemies and destructible environments
  const handleBulletFired = useCallback(
    (origin: THREE.Vector3, direction: THREE.Vector3, weapon: WeaponDef) => {
      const engine = engineRef.current;
      if (!engine) return;

      const { physicsManager, enemyManager, raycaster } = engine;
      _bulletOrigin.current.copy(origin);
      _bulletDir.current.copy(direction);

      raycaster.set(_bulletOrigin.current, _bulletDir.current);
      raycaster.far = weapon.range;

      // Eject spent brass casing
      const weaponRot = engine.camera.rotation;
      const muzzleWorldPos = origin.clone().add(direction.clone().multiplyScalar(0.4));
      physicsManager.ejectBrassCasing(muzzleWorldPos, weaponRot);

      // 1. Raycast Enemies
      const enemyMeshes: THREE.Object3D[] = [];
      enemyManager.enemies.forEach((e) => {
        if (e.state !== 'dead') {
          enemyMeshes.push(e.mesh);
        }
      });

      const enemyHits = raycaster.intersectObjects(enemyMeshes, true);
      if (enemyHits.length > 0) {
        const hit = enemyHits[0];
        let rootEnemyMesh = hit.object;
        while (rootEnemyMesh.parent && rootEnemyMesh.parent !== engine.scene) {
          rootEnemyMesh = rootEnemyMesh.parent;
        }

        const enemyActor = enemyManager.enemies.find((e) => e.mesh === rootEnemyMesh);
        if (enemyActor && enemyActor.state !== 'dead') {
          // Check if headshot (hit.point.y > 1.55 on standing model)
          const isHeadshot = hit.point.y - enemyActor.mesh.position.y > 1.5;
          const { isKill, damageDealt } = enemyManager.damageEnemy(enemyActor, weapon.damage, isHeadshot);

          triggerHitmarker(isHeadshot, isKill);
          physicsManager.spawnImpactSparks(hit.point);

          setPlayerStats((prev) => {
            const newKills = isKill ? prev.kills + 1 : prev.kills;
            const newHeadshots = isKill && isHeadshot ? prev.headshots + 1 : prev.headshots;
            return {
              ...prev,
              shotsHit: prev.shotsHit + 1,
              kills: newKills,
              headshots: newHeadshots,
              score: prev.score + (isKill ? 150 : 25),
            };
          });

          // Check mission objective progress for sentry elimination
          setCurrentMission((prev) => {
            if (!prev) return prev;
            const updated = prev.objectives.map((obj) => {
              if (obj.id === 'obj_clear_sentries' && isKill) {
                const nextProg = (obj.currentProgress ?? 0) + 1;
                return {
                  ...obj,
                  currentProgress: nextProg,
                  completed: nextProg >= (obj.targetProgress ?? 5),
                };
              }
              if (obj.id === 'obj_repel_wave' && isKill) {
                const nextProg = (obj.currentProgress ?? 0) + 1;
                return {
                  ...obj,
                  currentProgress: nextProg,
                  completed: nextProg >= (obj.targetProgress ?? 8),
                };
              }
              return obj;
            });
            return { ...prev, objectives: updated };
          });

          return; // Hit confirmed on enemy
        }
      }

      // 2. Raycast Destructible Environment
      const destructibleMeshes: THREE.Object3D[] = [];
      physicsManager.destructibles.forEach((d) => {
        if (!d.isDestroyed) {
          destructibleMeshes.push(d.mesh);
        }
      });

      const envHits = raycaster.intersectObjects(destructibleMeshes, true);
      if (envHits.length > 0) {
        const hit = envHits[0];
        let rootDestructible = hit.object;
        while (rootDestructible.parent && rootDestructible.parent !== engine.scene) {
          rootDestructible = rootDestructible.parent;
        }

        const destObj = physicsManager.destructibles.find((d) => d.mesh === rootDestructible);
        if (destObj && !destObj.isDestroyed) {
          physicsManager.damageObject(destObj, weapon.damage, hit.point, (center, radius, maxDamage) => {
            // Explosive Barrel Radial Damage to nearby enemies & player
            enemyManager.enemies.forEach((e) => {
              if (e.state !== 'dead') {
                const d = e.mesh.position.distanceTo(center);
                if (d < radius) {
                  const dmg = maxDamage * (1 - d / radius);
                  const { isKill } = enemyManager.damageEnemy(e, dmg, false);
                  if (isKill) {
                    triggerHitmarker(false, true);
                    setPlayerStats((prev) => ({ ...prev, kills: prev.kills + 1 }));
                  }
                }
              }
            });

            // Radial damage to player if close
            const playerDist = engine.camera.position.distanceTo(center);
            if (playerDist < radius) {
              const pDmg = maxDamage * (1 - playerDist / radius) * 0.7;
              engine.fpsController.takeDamage(pDmg);
              setLastDamagedTime(performance.now());
            }
          });

          // Check mission objective progress for explosive barrels
          if (destObj.isExplosive) {
            setCurrentMission((prev) => {
              if (!prev) return prev;
              const updated = prev.objectives.map((obj) => {
                if (obj.id === 'obj_destroy_barrels' || obj.id === 'obj_destroy_all_barrels') {
                  const nextProg = (obj.currentProgress ?? 0) + 1;
                  return {
                    ...obj,
                    currentProgress: nextProg,
                    completed: nextProg >= (obj.targetProgress ?? 2),
                  };
                }
                return obj;
              });
              return { ...prev, objectives: updated };
            });
          }

          setPlayerStats((prev) => ({ ...prev, shotsHit: prev.shotsHit + 1 }));
          return;
        }
      }

      // 3. Bullet hit terrain / rocks
      physicsManager.spawnImpactSparks(
        origin.clone().add(direction.clone().multiplyScalar(Math.min(weapon.range, 35)))
      );
    },
    [triggerHitmarker]
  );

  // Spawn battlefield encounter: destructible barriers, explosive barrels, crates, and tactical enemies
  const populateBattlefield = useCallback(
    (mission: CampaignMission) => {
      const engine = engineRef.current;
      if (!engine) return;

      const { physicsManager, enemyManager, world } = engine;
      physicsManager.cleanup();
      enemyManager.cleanup();

      // Synchronize dynamic skybox & lighting to mission environment preset
      const targetPreset: SkyboxEnvironmentPreset = mission.environmentPreset || 'golden_dusk';
      world.setEnvironmentPreset(targetPreset);
      setSkyboxPreset(targetPreset);

      // 1. Destructible Barriers & Cover
      physicsManager.createConcreteBarrier(-4, 0, 5, 0.2);
      physicsManager.createConcreteBarrier(5, 0, 8, -0.3);
      physicsManager.createConcreteBarrier(-12, 0, -6, Math.PI / 4);
      physicsManager.createConcreteBarrier(10, 0, -8, -Math.PI / 4);

      // 2. Destructible Explosive Fuel Barrels
      physicsManager.createExplosiveBarrel(-7, 0, 2);
      physicsManager.createExplosiveBarrel(8, 0, 4);
      physicsManager.createExplosiveBarrel(0, 0, -18);
      physicsManager.createExplosiveBarrel(-15, 0, -14);

      // 3. Destructible Wooden Supply Crates
      physicsManager.createSupplyCrate(-2, 0, 10, 0.1);
      physicsManager.createSupplyCrate(3, 0, 11, -0.15);
      physicsManager.createSupplyCrate(-8, 0, -2, 0.4);

      // 4. Tactical Insurgent Riflemen
      enemyManager.spawnRifleman(-6, 0, -5);
      enemyManager.spawnRifleman(7, 0, -7);
      enemyManager.spawnRifleman(0, 0, -22);
      enemyManager.spawnRifleman(-14, 0, -16);
      enemyManager.spawnRifleman(12, 0, -14);

      // 5. Autonomous Combat Recon Drones
      enemyManager.spawnCombatDrone(-10, 3.5, -12);
      enemyManager.spawnCombatDrone(10, 3.8, -10);

      setEnemyCount(enemyManager.enemies.length);
    },
    []
  );

  // Initialize Three.js WebGL Engine
  useEffect(() => {
    if (!mountRef.current) return;

    // Detect software WebGL guard as instructed by Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    // High performance WebGLRenderer with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.05, 300);
    camera.position.set(0, 1.7, 18);
    scene.add(camera);

    // Modules
    const world = new GameWorld(scene);
    world.initEnvironment(renderer, isSoftwareGl);

    const physicsManager = new PhysicsAndDestructionManager(scene);
    const enemyManager = new EnemyAIManager(scene);
    const fpsController = new FPSController(camera, renderer.domElement);
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();

    engineRef.current = {
      renderer,
      scene,
      camera,
      world,
      fpsController,
      physicsManager,
      enemyManager,
      clock,
      isSoftwareGl,
      raycaster,
    };

    // Pre-populate initial map props
    populateBattlefield(CAMPAIGN_MISSIONS[0]);

    // Continuous Animation & Simulation Render Loop
    let frameId = 0;
    let titlePanAngle = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 10);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 100);
        }
      };
      frameId = window.setTimeout(poll, 10);
    }

    function tick() {
      const rawDt = clock.getDelta();
      // Clamp delta time to avoid physics tunneling
      const delta = Math.min(rawDt, 0.05);

      const currentEng = engineRef.current;
      if (currentEng) {
        const { world: w, physicsManager: pm, enemyManager: em, fpsController: ctrl } = currentEng;

        // 1. World update (dynamic skybox shader, volumetric clouds, comms dish)
        w.update(delta, camera.position);

        // 2. Physics & Destructible Debris update
        pm.update(delta);

        // 3. Mode-specific Camera & Simulation logic
        if (gameState === 'menu' || gameState === 'briefing') {
          ctrl.weaponRigGroup.visible = false;
          titlePanAngle += delta * (gameState === 'briefing' ? 0.12 : 0.15);
          const focusPt = gameState === 'briefing' ? briefingFocusRef.current : null;

          if (focusPt) {
            const targetLook = new THREE.Vector3(focusPt.x, focusPt.y, focusPt.z);
            currentLookAtRef.current.lerp(targetLook, Math.min(1, delta * 3.5));
            const desiredCamPos = new THREE.Vector3(
              focusPt.x + Math.sin(titlePanAngle) * 14,
              Math.max(5.5, focusPt.y + 4.5),
              focusPt.z + Math.cos(titlePanAngle) * 14
            );
            camera.position.lerp(desiredCamPos, Math.min(1, delta * 2.8));
            camera.lookAt(currentLookAtRef.current);
          } else {
            const panRadius = 24;
            const desiredCamPos = new THREE.Vector3(
              Math.sin(titlePanAngle) * panRadius,
              6.5,
              Math.cos(titlePanAngle) * panRadius - 10
            );
            camera.position.lerp(desiredCamPos, Math.min(1, delta * 2.5));
            currentLookAtRef.current.lerp(new THREE.Vector3(0, 2.5, -12), Math.min(1, delta * 2.5));
            camera.lookAt(currentLookAtRef.current);
          }
        } else if (gameState === 'playing') {
          ctrl.weaponRigGroup.visible = true;
          // Player FPS controls
          ctrl.update(delta, handleBulletFired);
          setCameraYaw(ctrl.yaw);
          setIsPointerLocked(ctrl.isPointerLocked);

          // Sync reactive React HUD state
          setPlayerStats({ ...ctrl.stats });
          setActiveWeaponName(ctrl.weapons[ctrl.activeWeaponIndex].name);

          // Real-time geometric acoustic environment analysis & DSP updates
          const camDir = camera.getWorldDirection(new THREE.Vector3());
          soundEngine.updateAcoustics(ctrl.position, camDir);
          const currentTimestamp = performance.now();
          if (currentTimestamp - lastAcousticUpdate.current > 160) {
            lastAcousticUpdate.current = currentTimestamp;
            setAcousticState(soundEngine.getAcousticState());
          }

          // Enemy AI update & enemy fire with geometric acoustic occlusion & reflections
          em.update(delta, ctrl.position, (enemy, origin, dir, dmg) => {
            soundEngine.playRifleFire({ isPlayer: false, origin });
            // Check if bullet strikes player
            const toPlayer = ctrl.position.clone().sub(origin);
            const dist = toPlayer.length();
            toPlayer.normalize();

            // Near-miss or direct hit
            if (dir.dot(toPlayer) > 0.94 && dist < 40) {
              ctrl.takeDamage(dmg);
              setLastDamagedTime(performance.now());

              // Trigger death camera when lethal damage is dealt
              if (ctrl.stats.health <= 0 && gameState === 'playing' && !deathCamRef.current.active) {
                initiateDeathCam(enemy, ctrl.position.clone(), origin);
              }
            } else {
              soundEngine.playRicochet(origin);
            }
          });

          // Check Player Death fallback
          if (ctrl.stats.health <= 0 && gameState === 'playing' && !deathCamRef.current.active) {
            const nearestEnemy = em.enemies
              .filter((e) => e.state !== 'dead')
              .sort((a, b) => a.mesh.position.distanceTo(ctrl.position) - b.mesh.position.distanceTo(ctrl.position))[0] || null;
            initiateDeathCam(nearestEnemy, ctrl.position.clone(), ctrl.position.clone());
          }

          // Check Victory Conditions for active mission
          setCurrentMission((prev) => {
            if (!prev) return prev;
            const allReqDone = prev.objectives
              .filter((o) => !o.optional)
              .every((o) => o.completed);

            if (allReqDone && gameState === 'playing') {
              setGameState('victory');
              ctrl.exitPointerLock();
              soundEngine.playRadioPing();
            }
            return prev;
          });

          // Update active live enemy count
          const liveCount = em.enemies.filter((e) => e.state !== 'dead').length;
          setEnemyCount(liveCount);
        } else if (gameState === 'death_cam') {
          // Death camera system: slowly pans from location of death to the enemy who delivered final shot
          ctrl.weaponRigGroup.visible = false;
          const dc = deathCamRef.current;
          const now = performance.now();
          const elapsed = (now - dc.startTime) / 1000;
          const progress = Math.min(1.0, elapsed / dc.duration);
          setDeathCamProgress(progress);

          // Smooth sinusoidal ease-in-out easing curve
          const easeT = 0.5 - 0.5 * Math.cos(progress * Math.PI);

          // 1. Position pan: slowly pan from death location towards the enemy
          camera.position.lerpVectors(dc.startPos, dc.targetPanPos, easeT);

          // 2. Camera rotation utilizing existing camera rotation logic (pitch and yaw)
          const targetLookAt = dc.killerEnemy
            ? dc.killerEnemy.mesh.position.clone().add(new THREE.Vector3(0, dc.killerEnemy.type === 'drone' ? 0 : 1.3, 0))
            : dc.killerPos.clone().add(new THREE.Vector3(0, 1.2, 0));

          const toKiller = targetLookAt.clone().sub(camera.position);
          const targetYaw = Math.atan2(-toKiller.x, -toKiller.z);
          const horizDist = Math.hypot(toKiller.x, toKiller.z);
          const targetPitch = Math.atan2(toKiller.y, horizDist);

          // Wrap yaw to shortest rotational arc
          let yawDiff = (targetYaw - ctrl.yaw) % (Math.PI * 2);
          if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

          // Slowly rotate towards the killer using existing camera rotation logic
          ctrl.yaw += yawDiff * Math.min(1.0, delta * 4.0);
          ctrl.pitch = THREE.MathUtils.damp(ctrl.pitch, targetPitch, 4.0, delta);

          camera.rotation.set(ctrl.pitch, ctrl.yaw, 0, 'YXZ');

          if (progress >= 1.0) {
            dc.active = false;
            setGameState('game_over');
          }
        }

        renderer.render(scene, camera);
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    // Immediately kick off render loop
    tick();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      fpsController.cleanup();
      renderer.dispose();
    };
  }, [gameState, populateBattlefield, handleBulletFired]);

  // Esc key pause handling
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (gameState === 'playing') {
          setGameState('paused');
          engineRef.current?.fpsController.exitPointerLock();
        } else if (gameState === 'paused') {
          setGameState('playing');
          engineRef.current?.fpsController.requestPointerLock();
        } else if (gameState === 'briefing') {
          setGameState('menu');
          soundEngine.playUIClick();
        }
      }

      // Space / Enter shortcut on Title Screen, Briefing Screen, or Space skip during Death Camera
      if (e.code === 'Space' || e.code === 'Enter') {
        if (gameState === 'menu' && activeModal === 'none') {
          handleStartCampaign();
        } else if (gameState === 'briefing') {
          handleConfirmDeploy();
        } else if (gameState === 'death_cam') {
          deathCamRef.current.active = false;
          setGameState('game_over');
        }
      }

      // K key trigger for death camera testing
      if (e.code === 'KeyK' && gameState === 'playing') {
        const engine = engineRef.current;
        if (engine) {
          const killer = engine.enemyManager.enemies.find((en) => en.state !== 'dead') || engine.enemyManager.enemies[0] || null;
          engine.fpsController.stats.health = 0;
          initiateDeathCam(killer, engine.fpsController.position.clone(), killer ? killer.mesh.position.clone() : engine.fpsController.position.clone());
        }
      }

      // V key shortcut to cycle dynamic skybox atmosphere preset
      if (e.code === 'KeyV' && (gameState === 'playing' || gameState === 'menu' || gameState === 'briefing' || gameState === 'paused')) {
        const engine = engineRef.current;
        if (engine) {
          const next = engine.world.cycleEnvironmentPreset();
          setSkyboxPreset(next);
          soundEngine.playUIClick();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, activeModal, currentMission]);

  // Open Tactical Holographic Briefing Screen before level starts
  const handleStartCampaign = () => {
    deathCamRef.current.active = false;
    setKillerInfo(null);
    setDeathCamProgress(0);
    setGameMode('campaign');
    setGameState('briefing');
    setActiveModal('none');
    soundEngine.playHoloScan();

    const engine = engineRef.current;
    if (engine) {
      engine.fpsController.weaponRigGroup.visible = false;
      populateBattlefield(currentMission);
      engine.fpsController.exitPointerLock();
    }
  };

  // Switch Campaign Mission inside Holographic Briefing Screen
  const handleSelectBriefingMission = (idx: number) => {
    if (idx >= 0 && idx < CAMPAIGN_MISSIONS.length) {
      setCurrentMissionIndex(idx);
      const selected = CAMPAIGN_MISSIONS[idx];
      setCurrentMission(selected);
      populateBattlefield(selected);
    }
  };

  // Confirm Deployment from Briefing Screen into Active Combat
  const handleConfirmDeploy = (spawnPos?: { x: number; y: number; z: number }) => {
    deathCamRef.current.active = false;
    setKillerInfo(null);
    setDeathCamProgress(0);
    setGameMode('campaign');
    setGameState('playing');
    setActiveModal('none');
    soundEngine.playRadioPing();

    const engine = engineRef.current;
    if (engine) {
      const targetSpawn = spawnPos || currentMission.insertionPoints?.[0]?.spawnPos || { x: 0, y: 1.7, z: 18 };
      engine.fpsController.position.set(targetSpawn.x, targetSpawn.y, targetSpawn.z);
      engine.fpsController.velocity.set(0, 0, 0);
      engine.fpsController.stats.health = 100;
      engine.fpsController.stats.armor = 100;
      engine.fpsController.weaponRigGroup.visible = true;
      populateBattlefield(currentMission);
      engine.fpsController.requestPointerLock();
    }
  };

  // Launch Multiplayer Skirmish
  const handleLaunchMultiplayer = (modeId: string) => {
    deathCamRef.current.active = false;
    setKillerInfo(null);
    setDeathCamProgress(0);
    setGameMode('multiplayer_bot');
    setGameState('playing');
    setActiveModal('none');
    soundEngine.playRadioPing();

    const engine = engineRef.current;
    if (engine) {
      engine.fpsController.position.set(0, 1.7, 18);
      engine.fpsController.velocity.set(0, 0, 0);
      engine.fpsController.stats.health = 100;
      engine.fpsController.stats.armor = 100;
      engine.fpsController.weaponRigGroup.visible = true;
      populateBattlefield(currentMission);
      const mpPreset: SkyboxEnvironmentPreset = modeId.includes('night') ? 'moonlit_night' : 'arctic_dawn';
      engine.world.setEnvironmentPreset(mpPreset);
      setSkyboxPreset(mpPreset);
      engine.fpsController.requestPointerLock();
    }
  };

  // Next Mission progression -> Opens Holographic Briefing for the next mission
  const handleNextMission = () => {
    const nextIdx = currentMissionIndex + 1;
    if (nextIdx < CAMPAIGN_MISSIONS.length) {
      setCurrentMissionIndex(nextIdx);
      const nextMission = CAMPAIGN_MISSIONS[nextIdx];
      setCurrentMission(nextMission);
      setGameState('briefing');
      soundEngine.playHoloScan();

      const engine = engineRef.current;
      if (engine) {
        deathCamRef.current.active = false;
        setKillerInfo(null);
        setDeathCamProgress(0);
        engine.fpsController.weaponRigGroup.visible = false;
        populateBattlefield(nextMission);
        engine.fpsController.exitPointerLock();
      }
    } else {
      setGameState('menu');
    }
  };

  // Restart Current Encounter
  const handleRestart = () => {
    deathCamRef.current.active = false;
    setKillerInfo(null);
    setDeathCamProgress(0);
    setGameState('playing');
    const engine = engineRef.current;
    if (engine) {
      engine.fpsController.position.set(0, 1.7, 18);
      engine.fpsController.velocity.set(0, 0, 0);
      engine.fpsController.stats.health = 100;
      engine.fpsController.stats.armor = 100;
      engine.fpsController.weaponRigGroup.visible = true;
      populateBattlefield(currentMission);
      engine.fpsController.requestPointerLock();
    }
  };

  // Apply Gunsmith Camo
  const handleSelectCamo = (camoId: string) => {
    setSelectedCamoId(camoId);
    engineRef.current?.fpsController.setWeaponCamo(0, camoId);
    engineRef.current?.fpsController.setWeaponCamo(1, camoId);
  };

  // Toggle Audio Mute
  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Cycle Skybox Handler
  const handleCycleSkybox = () => {
    const engine = engineRef.current;
    if (engine) {
      const next = engine.world.cycleEnvironmentPreset();
      setSkyboxPreset(next);
    }
  };

  // Select specific Skybox Preset
  const handleSelectSkyboxPreset = (preset: SkyboxEnvironmentPreset) => {
    const engine = engineRef.current;
    if (engine) {
      engine.world.setEnvironmentPreset(preset);
      setSkyboxPreset(preset);
      soundEngine.playUIClick();
    }
  };

  const currentSkyboxLabel = SKYBOX_PRESETS[skyboxPreset]?.label || 'GOLDEN DUSK // ANATOLIA';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D WebGL Canvas Container: mounted once in an isolated ref container */}
      <div ref={mountRef} className="absolute inset-0 z-0 cursor-crosshair" />

      {/* TITLE SCREEN SHELL */}
      {gameState === 'menu' && (
        <TitleScreen
          onStartCampaign={handleStartCampaign}
          onOpenMultiplayer={() => setActiveModal('multiplayer')}
          onOpenGunsmith={() => setActiveModal('gunsmith')}
          onOpenBattlePass={() => setActiveModal('battlepass')}
          onOpenSocial={() => setActiveModal('social')}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          skyboxLabel={currentSkyboxLabel}
          onCycleSkybox={handleCycleSkybox}
        />
      )}

      {/* INTERACTIVE HOLOGRAPHIC TACTICAL MISSION BRIEFING SCREEN */}
      {gameState === 'briefing' && (
        <MissionBriefingScreen
          missions={CAMPAIGN_MISSIONS}
          selectedMissionIndex={currentMissionIndex}
          onSelectMission={handleSelectBriefingMission}
          onConfirmDeploy={handleConfirmDeploy}
          onBackToMenu={() => setGameState('menu')}
          onFocusCameraTarget={(target) => {
            briefingFocusRef.current = target;
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* ACTIVE COMBAT HUD: Low-Occlusion Perimeter Layout */}
      {gameState === 'playing' && (
        <GameHUD
          stats={playerStats}
          currentMission={gameMode === 'campaign' ? currentMission : undefined}
          hitmarkers={hitmarkers}
          lastDamagedTime={lastDamagedTime}
          cameraYaw={cameraYaw}
          activeWeaponName={activeWeaponName}
          isPointerLocked={isPointerLocked}
          onRequestPointerLock={() => engineRef.current?.fpsController.requestPointerLock()}
          enemyCount={enemyCount}
          skyboxLabel={currentSkyboxLabel}
          acousticState={acousticState}
        />
      )}

      {/* PAUSE MENU MODAL */}
      {gameState === 'paused' && (
        <PauseMenu
          mission={gameMode === 'campaign' ? currentMission : undefined}
          onResume={() => {
            setGameState('playing');
            engineRef.current?.fpsController.requestPointerLock();
          }}
          onRestart={handleRestart}
          onExitToMenu={() => {
            setGameState('menu');
            engineRef.current?.fpsController.exitPointerLock();
          }}
          mouseSens={mouseSens}
          onSetMouseSens={(val) => {
            setMouseSens(val);
            if (engineRef.current) engineRef.current.fpsController.mouseSensitivity = val;
          }}
          fov={fov}
          onSetFov={(val) => {
            setFov(val);
            if (engineRef.current) {
              engineRef.current.camera.fov = val;
              engineRef.current.camera.updateProjectionMatrix();
            }
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          skyboxPreset={skyboxPreset}
          onSelectSkyboxPreset={handleSelectSkyboxPreset}
          acousticState={acousticState}
        />
      )}

      {/* CINEMATIC DEATH CAMERA (SLOW PAN TO KILLER) */}
      {gameState === 'death_cam' && (
        <DeathCamOverlay
          killer={killerInfo}
          progress={deathCamProgress}
          onSkip={() => {
            deathCamRef.current.active = false;
            setGameState('game_over');
          }}
        />
      )}

      {/* GAME OVER (KILLED IN ACTION) MODAL */}
      {gameState === 'game_over' && (
        <GameOverModal
          stats={playerStats}
          onRestart={handleRestart}
          onExitToMenu={() => setGameState('menu')}
        />
      )}

      {/* VICTORY (MISSION ACCOMPLISHED) MODAL */}
      {gameState === 'victory' && (
        <VictoryModal
          stats={playerStats}
          mission={currentMission}
          onNextMission={handleNextMission}
          onRestart={handleRestart}
          onExitToMenu={() => setGameState('menu')}
          hasNextMission={currentMissionIndex < CAMPAIGN_MISSIONS.length - 1}
        />
      )}

      {/* MULTIPLAYER & DEDICATED SERVERS MODAL */}
      {activeModal === 'multiplayer' && (
        <MultiplayerLobbyModal
          onClose={() => setActiveModal('none')}
          onLaunchMatch={handleLaunchMultiplayer}
        />
      )}

      {/* SEASONAL BATTLE PASS MODAL */}
      {activeModal === 'battlepass' && (
        <BattlePassModal
          onClose={() => setActiveModal('none')}
          onUnlockCamo={handleSelectCamo}
        />
      )}

      {/* GUNSMITH & COSMETIC STORE MODAL */}
      {activeModal === 'gunsmith' && (
        <GunsmithStoreModal
          currentCamoId={selectedCamoId}
          onSelectCamo={handleSelectCamo}
          onClose={() => setActiveModal('none')}
          userCredits={userCredits}
          onSpendCredits={(amount) => {
            if (userCredits >= amount) {
              setUserCredits((prev) => prev - amount);
              return true;
            }
            return false;
          }}
        />
      )}

      {/* SOCIAL HUB & SQUADS MODAL */}
      {activeModal === 'social' && (
        <SocialHubModal onClose={() => setActiveModal('none')} />
      )}
    </div>
  );
}
