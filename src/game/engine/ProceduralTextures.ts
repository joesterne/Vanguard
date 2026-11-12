import * as THREE from 'three';

/**
 * High-performance procedural textures & bump maps generated in HTML5 Canvas.
 * Zero external image assets or 404 dependencies.
 */

// Texture cache to prevent duplicate generation
const textureCache = new Map<string, THREE.CanvasTexture>();

export function getCachedTexture(key: string, generator: () => THREE.CanvasTexture): THREE.CanvasTexture {
  if (textureCache.has(key)) {
    return textureCache.get(key)!;
  }
  const texture = generator();
  textureCache.set(key, texture);
  return texture;
}

/** Tactical Gunmetal Albedo & Micro-Detail Texture */
export function createGunmetalTexture(): THREE.CanvasTexture {
  return getCachedTexture('gunmetal', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base gunmetal charcoal dark tone with fine gradient
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#15171b');
    grad.addColorStop(0.5, '#1e2126');
    grad.addColorStop(1, '#181a1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Micro-surface noise & subtle brushed anodized grain
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle edge highlight wear
    ctx.strokeStyle = 'rgba(180, 195, 215, 0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 1016, 1016);

    // Tactical weapon serial stamps and caliber markings
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = 'rgba(195, 210, 225, 0.55)';
    ctx.fillText('MK18-MOD1 // 5.56x45 NATO', 60, 90);
    ctx.fillText('CAGE 13629 · SER #V-8921-X', 60, 125);
    ctx.fillText('SAFE · SEMI · AUTO', 60, 160);

    // QR Data Matrix style optical UID tag
    ctx.fillStyle = '#0a0c0f';
    ctx.fillRect(800, 60, 140, 140);
    ctx.fillStyle = 'rgba(210, 225, 240, 0.7)';
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if ((x + y * 3) % 2 === 0) {
          ctx.fillRect(810 + x * 17, 70 + y * 17, 14, 14);
        }
      }
    }

    // Picatinny rail index markings T1, T3, T5...
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = 'rgba(160, 175, 190, 0.45)';
    for (let i = 1; i <= 18; i += 2) {
      ctx.fillText(`T${i}`, 50 + i * 48, 380);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  });
}

/** Weapon Metal Bump Map: Micro-machined grooves, pins, screws, and knurling */
export function createMetalBumpMap(): THREE.CanvasTexture {
  return getCachedTexture('metal_bump', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Neutral grey (no displacement)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    // Fine brushed horizontal machining lines
    for (let y = 0; y < 512; y += 3) {
      const v = 128 + (Math.random() - 0.5) * 24;
      ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
      ctx.fillRect(0, y, 512, 1);
    }

    // Recessed pins and hex bolt heads
    const drawBolt = (x: number, y: number, r: number) => {
      // Outer shadow ring
      ctx.fillStyle = '#404040';
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.fill();
      // Raised rim
      ctx.fillStyle = '#b0b0b0';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Recessed center
      ctx.fillStyle = '#202020';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    };

    drawBolt(60, 180, 8);
    drawBolt(110, 180, 8);
    drawBolt(420, 180, 6);
    drawBolt(450, 180, 6);

    // Knurling pattern for grips & knobs
    ctx.fillStyle = '#303030';
    for (let y = 280; y < 480; y += 8) {
      for (let x = 40; x < 480; x += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  });
}

/** Polymer Stippling Texture for Grips and Magpul Stocks */
export function createPolymerStippleTexture(): THREE.CanvasTexture {
  return getCachedTexture('polymer_stipple', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e2227';
    ctx.fillRect(0, 0, 256, 256);

    // Micro stippling dimples
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 0.8 + Math.random() * 1.4;
      ctx.fillStyle = Math.random() > 0.5 ? '#111417' : '#2e343d';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  });
}

/** Tactical Ripstop Fabric Texture for Uniforms, Vests, Plate Carriers */
export function createFabricTexture(baseColorHex: string = '#242a22'): THREE.CanvasTexture {
  return getCachedTexture(`fabric_${baseColorHex}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 256, 256);

    // Ripstop crosshatch grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 256; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(256, i);
      ctx.stroke();
    }

    // High frequency weave noise
    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    return texture;
  });
}

/** Camouflage Finishes for Weapons */
export function createCamoTexture(camoType: string): THREE.CanvasTexture {
  return getCachedTexture(`camo_${camoType}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    if (camoType === 'obsidian') {
      // Carbon fiber + iridescent obsidian facet pattern
      ctx.fillStyle = '#08090c';
      ctx.fillRect(0, 0, 1024, 1024);

      // Micro carbon fiber weave
      ctx.fillStyle = '#13161f';
      for (let y = 0; y < 1024; y += 8) {
        for (let x = 0; x < 1024; x += 16) {
          const offset = (y % 16 === 0) ? 0 : 8;
          ctx.fillRect(x + offset, y, 7, 7);
        }
      }

      // Iridescent purple/violet geometric shards
      ctx.fillStyle = 'rgba(147, 51, 234, 0.22)';
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 80, y + 30);
        ctx.lineTo(x + 40, y + 90);
        ctx.closePath();
        ctx.fill();
      }
    } else if (camoType === 'damascus') {
      // Damascus steel flowing layered ripples
      ctx.fillStyle = '#1c1f24';
      ctx.fillRect(0, 0, 1024, 1024);

      ctx.lineWidth = 3.5;
      for (let i = 0; i < 70; i++) {
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(190, 210, 235, 0.4)' : 'rgba(20, 24, 32, 0.7)';
        ctx.beginPath();
        const yBase = i * 15;
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= 1024; x += 25) {
          const wave = Math.sin(x * 0.02 + i) * 22 + Math.cos(x * 0.06) * 10;
          ctx.lineTo(x, yBase + wave);
        }
        ctx.stroke();
      }
    } else if (camoType === 'desert') {
      // Modern digital pixelated multicam desert tan / coyote
      ctx.fillStyle = '#baa175';
      ctx.fillRect(0, 0, 1024, 1024);

      const colors = ['#826642', '#d6c4a0', '#503e27', '#6f5637', '#9c845b'];
      for (let y = 0; y < 1024; y += 16) {
        for (let x = 0; x < 1024; x += 16) {
          if (Math.random() > 0.4) {
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(x, y, 16, 16);
          }
        }
      }
    } else if (camoType === 'neon') {
      // Cyber neon circuit grid
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, 1024, 1024);

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      for (let x = 0; x <= 1024; x += 96) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
        ctx.stroke();
      }
      for (let y = 0; y <= 1024; y += 96) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(1024, y);
        ctx.stroke();
      }

      // Neon chips
      ctx.fillStyle = '#38bdf8';
      for (let x = 0; x <= 1024; x += 96) {
        for (let y = 0; y <= 1024; y += 96) {
          if (Math.random() > 0.45) {
            ctx.fillRect(x - 7, y - 7, 14, 14);
          }
        }
      }
    } else if (camoType === 'gold') {
      // Polished royal gold with engraved scrollwork
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(0, 0, 1024, 1024);

      ctx.strokeStyle = '#855e0c';
      ctx.lineWidth = 3;
      for (let i = 0; i < 24; i++) {
        ctx.strokeRect(40 + i * 20, 40 + i * 20, 1024 - (80 + i * 40), 1024 - (80 + i * 40));
      }
    } else {
      // Tactical standard black
      return createGunmetalTexture();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  });
}

/** High-Resolution Heavy Concrete & Asphalt Compound Texture */
export function createConcreteTexture(): THREE.CanvasTexture {
  return getCachedTexture('concrete_hi_res', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base atmospheric tarmac / weathered concrete
    ctx.fillStyle = '#3b4047';
    ctx.fillRect(0, 0, 1024, 1024);

    // Multi-frequency aggregate specks & coarse noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 45;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Concrete expansion joint slabs (512x512 grid)
    ctx.strokeStyle = 'rgba(15, 18, 22, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 512); ctx.lineTo(1024, 512);
    ctx.moveTo(512, 0); ctx.lineTo(512, 1024);
    ctx.stroke();

    // Expansion joint sealant lines
    ctx.strokeStyle = 'rgba(8, 9, 12, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 512); ctx.lineTo(1024, 512);
    ctx.moveTo(512, 0); ctx.lineTo(512, 1024);
    ctx.stroke();

    // Weathering oil drips and tire rubber marks
    for (let i = 0; i < 14; i++) {
      const rx = Math.random() * 800 + 100;
      const ry = Math.random() * 800 + 100;
      const rad = 30 + Math.random() * 70;
      const spotGrad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rad);
      spotGrad.addColorStop(0, 'rgba(12, 14, 18, 0.45)');
      spotGrad.addColorStop(1, 'rgba(12, 14, 18, 0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Concrete stress micro-cracks
    ctx.strokeStyle = 'rgba(25, 28, 33, 0.5)';
    ctx.lineWidth = 1.5;
    for (let c = 0; c < 6; c++) {
      let cx = Math.random() * 900;
      let cy = Math.random() * 900;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 8; s++) {
        cx += (Math.random() - 0.5) * 40;
        cy += (Math.random() - 0.5) * 40;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  });
}

/** Natural Rock & Mountain Cliff Strata Texture */
export function createRockTexture(): THREE.CanvasTexture {
  return getCachedTexture('rock_strata', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark craggy slate base
    ctx.fillStyle = '#282d36';
    ctx.fillRect(0, 0, 512, 512);

    // Geological sediment bands
    for (let y = 0; y < 512; y += 12) {
      const shade = 35 + Math.sin(y * 0.08) * 15 + (Math.random() - 0.5) * 12;
      ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 8})`;
      ctx.fillRect(0, y, 512, 12);
    }

    // Vertical mineral fissures
    ctx.strokeStyle = 'rgba(18, 20, 25, 0.7)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 15; i++) {
      let x = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= 512; y += 32) {
        x += (Math.random() - 0.5) * 18;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  });
}

/** Hazard Chevron Stripes for Explosive Barrels & Blast Doors */
export function createHazardTexture(): THREE.CanvasTexture {
  return getCachedTexture('hazard', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Vibrant safety yellow
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 512, 512);

    // 45 degree hazard black stripes
    ctx.fillStyle = '#111317';
    ctx.beginPath();
    const stripeWidth = 48;
    for (let x = -512; x < 1024; x += stripeWidth * 2) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.lineTo(x + stripeWidth + 512, 512);
      ctx.lineTo(x + 512, 512);
      ctx.closePath();
    }
    ctx.fill();

    // Hazard warning text / skull
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px monospace';
    ctx.fillText('DANGER // EXPLOSIVE', 70, 260);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  });
}

/** Destructible Wood Crate Texture */
export function createCrateWoodTexture(): THREE.CanvasTexture {
  return getCachedTexture('crate_wood', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Military olive-tinted wood base
    ctx.fillStyle = '#424c36';
    ctx.fillRect(0, 0, 512, 512);

    // Wood grain lines
    ctx.fillStyle = 'rgba(30, 36, 24, 0.35)';
    for (let y = 0; y < 512; y += 4) {
      if (Math.random() > 0.4) {
        ctx.fillRect(0, y, 512, 1.5);
      }
    }

    // Planks horizontal separator lines
    ctx.strokeStyle = '#1b2016';
    ctx.lineWidth = 6;
    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Steel reinforcement border & corner brackets
    ctx.fillStyle = '#22262b';
    ctx.fillRect(0, 0, 512, 36);
    ctx.fillRect(0, 476, 512, 36);
    ctx.fillRect(0, 0, 36, 512);
    ctx.fillRect(476, 0, 36, 512);

    // Stencil markings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('ORDNANCE 5.56MM NATO', 90, 230);
    ctx.fillText('LOT #08-VANGUARD / LIVE', 90, 270);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  });
}

/** Holographic Red Dot Sight Reticle */
export function createHoloReticleTexture(): THREE.CanvasTexture {
  return getCachedTexture('holo_reticle', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 512, 512);

    // Holographic outer 68 MOA ring with subtle glow
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 256, 128, 0, Math.PI * 2);
    ctx.stroke();

    // Outer range stadia ticks
    ctx.beginPath();
    ctx.moveTo(256, 96); ctx.lineTo(256, 128);
    ctx.moveTo(256, 384); ctx.lineTo(256, 416);
    ctx.moveTo(96, 256); ctx.lineTo(128, 256);
    ctx.moveTo(384, 256); ctx.lineTo(416, 256);
    ctx.stroke();

    // Center precision 1 MOA dot
    ctx.fillStyle = '#ff1111';
    ctx.beginPath();
    ctx.arc(256, 256, 7, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  });
}
