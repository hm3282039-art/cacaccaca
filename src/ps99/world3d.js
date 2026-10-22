/* ============================================================
   Monde 3D — décor, avatar, pets, objets à casser
   ============================================================ */
import * as THREE from 'three';
import {
  AVATAR_PALETTES as AVATAR_PALETTE_LIST,
  buildAvatar, buildPet, buildTree, buildPalm, buildRock, buildCrystal,
  buildLavaPool, buildFlower, buildNeonBlock, buildChest, buildCoinPile,
} from './models.js';
import { BREAKABLES } from './data.js';

const ZONE_SKY = {
  1: { bg: '#9bd8ff', fog: '#c6ecff', sun: '#fff4d6', sunI: 2.1, hemi: '#cfe9ff', ground: '#6fbf55' },
  2: { bg: '#7fb8a2', fog: '#a6d3c1', sun: '#fff2cc', sunI: 1.9, hemi: '#c9e8d8', ground: '#3f7d45' },
  3: { bg: '#a7e6ff', fog: '#d6f3ff', sun: '#fff6dd', sunI: 2.2, hemi: '#d9f2ff', ground: '#d9c795' },
  4: { bg: '#3a2233', fog: '#6b3a3a', sun: '#ffb27a', sunI: 1.5, hemi: '#ff9a6a', ground: '#4a3b3b' },
  5: { bg: '#0a0820', fog: '#1c1440', sun: '#c9b6ff', sunI: 1.8, hemi: '#8b7bff', ground: '#221a4a' },
  6: { bg: '#04101f', fog: '#0b2333', sun: '#7de7ff', sunI: 1.7, hemi: '#3ddcff', ground: '#141c33' },
};

const PARTICLE_POOL = 140;

export class World {
  constructor(canvas, callbacks = {}, options = {}) {
    this.canvas = canvas;
    this.cb = callbacks;
    this.breakables = [];
    this.hitMeshes = [];
    this.pets = [];
    this.target = null;
    this.queued = false;
    this.low = false;

    this.clock = new THREE.Clock();
    this.time = 0;
    this.attackCooldown = 0;
    this.petAttackTimer = 0;
    this.swing = 0;
    this.walkCycle = 0;
    this.moving = false;

    // renderer injectable : permet de tester le monde sans contexte WebGL
    this.renderer = options.renderer || new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.enabled = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9bd8ff');
    this.scene.fog = new THREE.Fog('#c6ecff', 38, 92);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 260);
    this.camYaw = 0;
    this.camPitch = 0.52;
    this.camDist = 17;
    this.camLook = new THREE.Vector3(0, 1.2, 0);
    this.camTargetYaw = 0;
    this.camPos = new THREE.Vector3(0, 10, 17);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.tmpVec = new THREE.Vector3();

    this.#setupLights();
    this.#setupGroundStatic();
    this.#buildPlayer();
    this.#buildPets([]);
    this.#buildParticles();
    this.#setupInput();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement || document.body);
    this.resize();
  }

  /* ---------------- setup ---------------- */

  #setupLights() {
    this.hemi = new THREE.HemisphereLight('#cfe9ff', '#6fbf55', 0.95);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#fff4d6', 1.9);
    this.sun.position.set(14, 26, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const cam = this.sun.shadow.camera;
    cam.left = -24; cam.right = 24; cam.top = 24; cam.bottom = -24;
    cam.near = 1; cam.far = 90;
    this.sun.shadow.bias = -0.0012;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.fill = new THREE.DirectionalLight('#9ec8ff', 0.35);
    this.fill.position.set(-16, 10, -14);
    this.scene.add(this.fill);

    this.pointLights = [];
  }

  #setupGroundStatic() {
    // grande plateforme d'herbe
    this.plane = new THREE.Mesh(
      new THREE.CircleGeometry(46, 48),
      new THREE.MeshStandardMaterial({ color: '#6fbf55', roughness: 0.95 }),
    );
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.receiveShadow = true;
    this.scene.add(this.plane);

    // anneau de sable / sentier
    this.pathRing = new THREE.Mesh(
      new THREE.RingGeometry(7.2, 11.6, 40),
      new THREE.MeshStandardMaterial({ color: '#d9c89a', roughness: 1 }),
    );
    this.pathRing.rotation.x = -Math.PI / 2;
    this.pathRing.position.y = 0.02;
    this.pathRing.receiveShadow = true;
    this.scene.add(this.pathRing);
  }

  #buildPlayer() {
    this.player = buildAvatar();
    this.player.position.set(0, 0, 7.2);
    this.player.rotation.y = Math.PI;
    this.scene.add(this.player);
    this.playerParts = this.player.userData;

    // anneau de sélection du joueur
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.0, 24),
      new THREE.MeshBasicMaterial({ color: '#3ddcff', transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    this.playerRing = ring;
    this.scene.add(ring);

    // anneau de survol / cible
    const t = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.4, 28),
      new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
    );
    t.rotation.x = -Math.PI / 2;
    t.position.y = 0.04;
    t.visible = false;
    this.targetRing = t;
    this.scene.add(t);

    this.avatar = this.player;
  }

  #buildPets(defs) {
    if (this.petGroup) {
      this.scene.remove(this.petGroup);
      this.petGroup.traverse((o) => {
        if (o.isMesh && o.geometry) { /* géométries mutualisées : rien à libérer */ }
      });
    }
    this.petGroup = new THREE.Group();
    this.scene.add(this.petGroup);
    this.pets = defs.map((def, i) => {
      const model = buildPet(def);
      const scale = def.rarity === 'secret' ? 0.85 : def.rarity === 'mythique' ? 0.78 : 0.7;
      model.scale.setScalar(scale);
      this.petGroup.add(model);
      return {
        def,
        model,
        index: i,
        angle: (i / Math.max(1, defs.length)) * Math.PI * 2,
        baseY: 0,
        hop: Math.random() * 6,
        lunge: 0,
        float: model.userData.float || 0,
      };
    });
  }

  #buildParticles() {
    this.particles = [];
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);
    this.particleGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    this.particleMats = new Map();
    for (let i = 0; i < PARTICLE_POOL; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, new THREE.MeshStandardMaterial({ color: '#ffd24a', roughness: 0.4 }));
      mesh.visible = false;
      mesh.castShadow = false;
      this.particleGroup.add(mesh);
      this.particles.push({ mesh, life: 0, maxLife: 1, vel: new THREE.Vector3(), spin: new THREE.Vector3() });
    }
  }

  #setupInput() {
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const el = this.canvas;

    el.addEventListener('pointerdown', (e) => {
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
      downTime = performance.now();
      dragging = false;
      el.setPointerCapture?.(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (e.buttons === 0 && e.pointerType === 'mouse') {
        this.hoverAt(e.clientX, e.clientY);
        return;
      }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (Math.abs(e.clientX - downX) > 7 || Math.abs(e.clientY - downY) > 7) {
        dragging = true;
        el.classList.add('dragging');
        this.camTargetYaw -= dx * 0.006;
        this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.004, 0.18, 1.15);
      }
    });

    el.addEventListener('pointerup', (e) => {
      el.classList.remove('dragging');
      const dt = performance.now() - downTime;
      const moved = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
      if (!dragging && moved < 10 && dt < 600) {
        this.clickAt(e.clientX, e.clientY);
      }
      dragging = false;
    });

    el.addEventListener('pointercancel', () => el.classList.remove('dragging'));

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.012, 9, 30);
    }, { passive: false });

    // pincement à deux doigts
    let pinchStart = 0;
    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        if (pinchStart) this.camDist = THREE.MathUtils.clamp(this.camDist + (pinchStart - d) * 0.05, 9, 30);
        pinchStart = d;
      }
    }, { passive: true });
    el.addEventListener('touchend', () => { pinchStart = 0; });
  }

  /* ---------------- API publique ---------------- */

  resize() {
    const parent = this.canvas.parentElement;
    const w = (parent?.clientWidth || window.innerWidth) || 1;
    const h = (parent?.clientHeight || window.innerHeight) || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // cadrage : on élargit un peu le FOV sur mobile portrait
    this.camera.fov = w / h < 0.85 ? 58 : 46;
    this.camera.updateProjectionMatrix();
    this.viewW = w;
    this.viewH = h;
  }

  setQuality(low) {
    this.low = low;
    this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !low;
    this.sun.castShadow = !low;
    this.scene.traverse((o) => {
      if (o.isMesh) o.castShadow = !low && !o.userData.noShadow;
    });
    this.resize();
  }

  buildZone(zone, layout, { keepPets = true } = {}) {
    if (this.zoneRoot) {
      this.scene.remove(this.zoneRoot);
      this.zoneRoot = null;
    }
    this.breakables = [];
    this.hitMeshes = [];
    this.target = null;
    this.queued = false;
    if (this.targetRing) this.targetRing.visible = false;

    const sky = ZONE_SKY[zone.id] || ZONE_SKY[1];
    this.sky = sky;
    this.scene.background = new THREE.Color(sky.bg);
    this.scene.fog = new THREE.Fog(sky.fog, zone.id >= 5 ? 30 : 38, zone.id >= 5 ? 78 : 92);
    this.hemi.color.set(sky.hemi);
    this.hemi.groundColor.set(sky.ground);
    this.sun.color.set(sky.sun);
    this.sun.intensity = sky.sunI;
    this.fill.color.set(zone.id === 4 ? '#ff8a5c' : zone.id >= 5 ? '#9b8bff' : '#9ec8ff');

    this.fxColor = zone.id === 4 ? '#ffb072' : zone.id >= 5 ? '#c4b5fd' : '#ffd24a';
    this.particlesEnabled = true;
    this.plane.material.color.set(zone.ground);
    this.pathRing.material.color.set(zone.path);

    this.pointLights.forEach((l) => this.scene.remove(l));
    this.pointLights = [];

    const root = new THREE.Group();
    this.zoneRoot = root;
    this.scene.add(root);

    this.#buildDecor(root, zone);
    this.#buildBreakables(root, zone, layout);

    // joueur replacé
    this.player.position.set(0, 0, 7.6);
    this.player.rotation.y = Math.PI;
    this.camTargetYaw = 0;
    this.camYaw = 0;
    this.camDist = zone.id >= 5 ? 18 : 17;

    if (!keepPets) {
      // les pets restent, rien à faire
    }
  }

  #buildDecor(root, zone) {
    const p = zone.props || {};
    const rand = mulberry(zone.id * 7919 + 13);

    const place = (obj, radiusMin, radiusMax, scaleMin, scaleMax) => {
      const a = rand() * Math.PI * 2;
      const r = radiusMin + rand() * (radiusMax - radiusMin);
      obj.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const s = scaleMin + rand() * (scaleMax - scaleMin);
      obj.scale.setScalar(s);
      obj.rotation.y = rand() * Math.PI * 2;
      root.add(obj);
    };

    for (let i = 0; i < (p.trees || 0); i++) {
      const t = buildTree(zone.id === 2 ? 'pine' : 'leaf');
      place(t, 13, 26, 0.9, 1.6);
    }
    for (let i = 0; i < (p.palms || 0); i++) place(buildPalm(), 12, 24, 0.9, 1.4);
    for (let i = 0; i < (p.rocks || 0); i++) {
      const col = zone.id === 4 ? '#5b4a48' : zone.id >= 5 ? '#3b3360' : '#8b95a5';
      place(buildRock(0.8 + rand() * 0.7, col), 11, 27, 0.8, 1.5);
    }
    for (let i = 0; i < (p.flowers || 0); i++) place(buildFlower(), 8.6, 28, 0.9, 1.5);
    for (let i = 0; i < (p.crystals || 0); i++) {
      place(buildCrystal(zone.id >= 5 ? '#a78bfa' : '#7dd3fc', zone.id >= 5 ? '#7c3aed' : '#38bdf8'), 10, 27, 0.8, 1.6);
    }
    for (let i = 0; i < (p.lava || 0); i++) place(buildLavaPool(), 11, 25, 0.9, 1.7);
    for (let i = 0; i < (p.neons || 0); i++) {
      const colors = ['#3ddcff', '#ff4fd8', '#a78bfa', '#4ade80'];
      place(buildNeonBlock(colors[Math.floor(rand() * colors.length)]), 9.5, 26, 0.9, 1.8);
    }

    // étoiles
    if (p.stars) {
      const positions = new Float32Array(p.stars * 3);
      for (let i = 0; i < p.stars; i++) {
        const a = rand() * Math.PI * 2;
        const r = 18 + rand() * 34;
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = 6 + rand() * 30;
        positions[i * 3 + 2] = Math.sin(a) * r;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
      root.add(stars);
      this.stars = stars;
    } else {
      this.stars = null;
    }

    // petits nuages (ou blocs flottants en néon)
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      const cloud = new THREE.Group();
      if (zone.id >= 5) {
        const col = zone.id === 6 ? '#3ddcff' : '#a78bfa';
        const b = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5, roughness: 0.4 });
        for (let k = 0; k < 3; k++) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(2 + rand() * 2, 0.4, 2 + rand() * 2), b);
          m.position.set((rand() - 0.5) * 4, (rand() - 0.5) * 2, (rand() - 0.5) * 4);
          cloud.add(m);
        }
      } else {
        const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#dbeafe', emissiveIntensity: 0.25 });
        for (let k = 0; k < 3; k++) {
          const box = new THREE.Mesh(new THREE.BoxGeometry(2.4 + rand() * 2.4, 1.0 + rand() * 0.6, 2 + rand() * 2), m);
          box.position.set((rand() - 0.5) * 4.5, (rand() - 0.5) * 1.2, (rand() - 0.5) * 3);
          cloud.add(box);
        }
      }
      cloud.position.set((rand() - 0.5) * 46, 13 + rand() * 8, (rand() - 0.5) * 46);
      cloud.userData.speed = 0.3 + rand() * 0.5;
      this.clouds.push(cloud);
      root.add(cloud);
    }

    // barrière de blocs autour de la zone
    const fenceMat = new THREE.MeshStandardMaterial({ color: zone.id >= 5 ? '#2b2350' : '#c9b07a', roughness: 0.9 });
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2;
      const h = 1.8 + rand() * 1.4;
      const post = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 1.1), fenceMat);
      post.position.set(Math.cos(a) * 29, h / 2, Math.sin(a) * 29);
      post.rotation.y = -a;
      post.castShadow = true;
      post.receiveShadow = true;
      root.add(post);
    }

    if (zone.id === 4) {
      const l = new THREE.PointLight('#ff6d3a', 22, 34, 2);
      l.position.set(0, 5, 0);
      root.add(l);
      this.pointLights.push(l);
    }
    if (zone.id >= 5) {
      const l = new THREE.PointLight(zone.id === 6 ? '#3ddcff' : '#a78bfa', 18, 34, 2);
      l.position.set(0, 6, 2);
      root.add(l);
      this.pointLights.push(l);
    }
  }

  #buildBreakables(root, zone, layout) {
    const defs = layout.map((id) => BREAKABLES[id] || BREAKABLES.pile);
    const spacing = 3.5;

    defs.forEach((def, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = (col - 1) * spacing;
      const z = (row - 1) * spacing;
      const model = this.#modelFor(def.id, def.size);
      const wrap = new THREE.Group();
      wrap.position.set(x, 0, z);
      wrap.rotation.y = ((i * 47) % 30 - 15) * 0.012;
      wrap.add(model);
      root.add(wrap);

      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(2.1 * def.size, 2.0 * def.size, 2.1 * def.size),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.position.set(x, 0.85 * def.size, z);
      hit.userData.breakableIndex = this.breakables.length;
      root.add(hit);
      this.hitMeshes.push(hit);

      const scale = def.size;
      const stand = new THREE.Vector3(x, 0, z + 1.55 * scale + 0.55);

      const bw = {
        index: this.breakables.length,
        def,
        wrap,
        model,
        hit,
        basePos: new THREE.Vector3(x, 0, z),
        stand,
        scale,
        maxHp: def.hp * zone.hpMult,
        hp: def.hp * zone.hpMult,
        alive: true,
        respawn: 0,
      };
      this.breakables.push(bw);
    });
  }

  #modelFor(id, size) {
    const g = new THREE.Group();
    if (id === 'pile') {
      const p = buildCoinPile();
      p.scale.setScalar(size * 2.3);
      g.add(p);
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14), new THREE.MeshStandardMaterial({ color: '#ffe9a3', metalness: 0.6, roughness: 0.25, emissive: '#ffd24a', emissiveIntensity: 0.35 }));
      label.position.y = 0.95;
      label.rotation.x = 0.25;
      g.add(label);
    } else if (id === 'stack') {
      const p1 = buildCoinPile();
      p1.scale.setScalar(size * 2.6);
      const p2 = buildCoinPile();
      p2.scale.setScalar(size * 1.9);
      p2.position.y = 0.62;
      p2.rotation.y = 0.8;
      g.add(p1, p2);
    } else if (id === 'chest' || id === 'giant') {
      const c = buildChest(size);
      g.add(c);
      if (id === 'giant') {
        const crystal = buildCrystal('#ffd24a', '#ffb300');
        crystal.position.set(0, 1.5, 0);
        crystal.scale.setScalar(0.6);
        g.add(crystal);
        const c2 = buildChest(size * 0.55);
        c2.position.set(1.1, 0, 0.6);
        c2.rotation.y = 0.6;
        g.add(c2);
      }
    } else if (id === 'diamond') {
      const c = buildChest(size * 0.95, false);
      c.traverse((o) => {
        if (o.isMesh && o.material && o.material.color && o.material.color.getHex() !== 0x000000) {
          if (o.material.color.getHexString() === 'c98f2b' || o.material.color.getHexString() === 'ffd24a') {
            o.material = o.material.clone();
            o.material.color.set('#8b5cf6');
          }
        }
      });
      g.add(c);
      const cry = buildCrystal('#a78bfa', '#7c3aed');
      cry.position.set(0, 1.1, 0);
      cry.scale.setScalar(0.9);
      g.add(cry);
      const glow = new THREE.PointLight('#a78bfa', 6, 8, 2);
      glow.position.set(0, 1.4, 0);
      g.add(glow);
    }
    g.scale.setScalar(1);
    return g;
  }

  /* ---------------- pets ---------------- */

  setPets(defs) {
    this.#buildPets(defs);
  }

  /* ---------------- interactions ---------------- */

  setPointerFromEvent(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  pickAt(clientX, clientY) {
    this.setPointerFromEvent(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    for (const h of hits) {
      const idx = h.object.userData.breakableIndex;
      const b = this.breakables[idx];
      if (b && b.alive) return b;
    }
    return null;
  }

  hoverAt(clientX, clientY) {
    const b = this.pickAt(clientX, clientY);
    if (b) {
      this.targetRing.visible = true;
      this.targetRing.position.set(b.basePos.x, 0.05, b.basePos.z);
      this.targetRing.scale.setScalar(b.scale);
      this.canvas.style.cursor = 'pointer';
    } else {
      this.targetRing.visible = false;
      this.canvas.style.cursor = 'grab';
    }
  }

  clickAt(clientX, clientY) {
    const b = this.pickAt(clientX, clientY);
    if (!b) return;
    this.selectTarget(b);
    this.queued = true;
    // un clic joueur tape tout de suite, même si l'animation précédente tourne encore
    if (this.#inRange(b)) this.#doPlayerSwing({ force: true });
  }

  requestAutoHit() {
    if (this.target && this.target.alive && this.#inRange(this.target)) {
      return this.#doPlayerSwing();
    }
    return false;
  }

  selectTarget(b) {
    if (!b || !b.alive) return;
    // changer de cible annule le coup en attente de l'ancienne cible
    this.queued = false;
    this.target = b;
    this.targetRing.visible = true;
    this.targetRing.position.set(b.basePos.x, 0.05, b.basePos.z);
    this.targetRing.scale.setScalar(b.scale);
    this.cb.onTargetChange?.(b);
  }

  #inRange(b) {
    return this.inRangeOf(b);
  }

  inRangeOf(b) {
    if (!b) return false;
    const p = this.player.position;
    const s = b.stand;
    return Math.hypot(p.x - s.x, p.z - s.z) < 1.35;
  }

  setPalette(index) {
    const pal = AVATAR_PALETTE_LIST[index % AVATAR_PALETTE_LIST.length];
    const pos = this.player.position.clone();
    const rot = this.player.rotation.y;
    this.scene.remove(this.player);
    this.player = buildAvatar(pal);
    this.player.position.copy(pos);
    this.player.rotation.y = rot;
    this.playerParts = this.player.userData;
    this.scene.add(this.player);
    this.avatar = this.player;
  }

  #doPlayerSwing({ force = false } = {}) {
    const b = this.target;
    if (!b || !b.alive) return false;
    if (this.swing > 0.01 && !force) return false;
    this.swing = 1;
    this.queued = false;
    this.cb.onPlayerHit?.(b);
    this.#burst(b.basePos.x, 0.9 * b.scale, b.basePos.z, 6, this.fxColor, 0.35);
    return true;
  }

  /* ---------------- dégâts ---------------- */

  fxColor = '#ffd24a';

  applyDamage(b, amount, cls = '') {
    if (!b || !b.alive || amount <= 0) return false;
    b.hp -= amount;

    // secousse + flash
    b.wrap.userData.hitTime = 0.001;
    this.spawnText(new THREE.Vector3(b.basePos.x, 1.6 * b.scale, b.basePos.z), formatDmg(amount), cls);

    if (b.hp <= 0) {
      this.#breakObject(b);
      return true;
    }
    return false;
  }

  #breakObject(b) {
    b.alive = false;
    b.hp = 0;
    b.respawn = 1.6;
    b.wrap.visible = true;
    b.wrap.userData.breaking = 0.001;
    this.#burst(b.basePos.x, 0.9 * b.scale, b.basePos.z, this.low ? 10 : 22, this.fxColor, 0.9);
    this.#burst(b.basePos.x, 0.6 * b.scale, b.basePos.z, this.low ? 6 : 12, '#ffffff', 0.7);
    if (this.target === b) this.cb.onTargetChange?.(null);
    this.cb.onBroken?.(b);
  }

  spawnText(worldPos, text, cls) {
    const p = this.tmpVec.copy(worldPos).project(this.camera);
    const x = (p.x * 0.5 + 0.5) * this.viewW;
    const y = (-p.y * 0.5 + 0.5) * this.viewH;
    this.cb.onDamageText?.({ x, y }, text, cls);
  }

  #burst(x, y, z, count, color, power = 1) {
    if (this.particlesEnabled === false) return;
    let spawned = 0;
    for (const p of this.particles) {
      if (p.life > 0) continue;
      p.mesh.visible = true;
      p.mesh.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.5, z + (Math.random() - 0.5) * 0.6);
      p.mesh.material.color.set(color);
      p.mesh.material.emissive.set(color);
      p.mesh.material.emissiveIntensity = 0.35;
      p.mesh.scale.setScalar(0.6 + Math.random() * 1.1);
      p.vel.set((Math.random() - 0.5) * 7 * power, (3 + Math.random() * 5) * power, (Math.random() - 0.5) * 7 * power);
      p.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      p.maxLife = 0.55 + Math.random() * 0.5;
      p.life = p.maxLife;
      if (++spawned >= count) break;
    }
  }

  /* ---------------- boucle ---------------- */

  update(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;

    // caméra
    this.camYaw += (this.camTargetYaw - this.camYaw) * Math.min(1, dt * 8);

    const lookTarget = new THREE.Vector3(this.player.position.x, 1.4, this.player.position.z);
    if (this.target && this.target.alive) {
      lookTarget.lerp(new THREE.Vector3(this.target.basePos.x, 1.2, this.target.basePos.z), 0.4);
    }
    this.camLook.lerp(lookTarget, Math.min(1, dt * 4));

    const cp = Math.cos(this.camPitch);
    const desired = new THREE.Vector3(
      this.camLook.x + Math.sin(this.camYaw) * this.camDist * cp,
      this.camLook.y + Math.sin(this.camPitch) * this.camDist,
      this.camLook.z + Math.cos(this.camYaw) * this.camDist * cp,
    );
    this.camPos.lerp(desired, Math.min(1, dt * 4));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.sun.position.set(this.camLook.x + 14, 26, this.camLook.z + 12);
    this.sun.target.position.copy(this.camLook);

    this.#updatePlayer(dt);
    this.#updatePets(dt);
    this.#updateBreakables(dt);
    this.#updateParticles(dt);

    // nuages
    if (this.clouds) {
      for (const c of this.clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 30) c.position.x = -30;
      }
    }
    if (this.stars) this.stars.rotation.y += dt * 0.02;

    // anneau joueur
    this.playerRing.position.set(this.player.position.x, 0.03, this.player.position.z);
    this.playerRing.rotation.z += dt * 0.8;
    if (this.targetRing.visible) {
      const s = 1 + Math.sin(this.time * 4) * 0.05;
      this.targetRing.scale.setScalar((this.target?.scale || 1) * s);
      this.targetRing.rotation.z += dt * 1.4;
    }
  }

  #updatePlayer(dt) {
    const parts = this.playerParts;
    const p = this.player.position;

    let moving = false;
    if (this.target && this.target.alive) {
      const stand = this.target.stand;
      const dx = stand.x - p.x;
      const dz = stand.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.05) {
        const speed = 5.2;
        p.x += (dx / dist) * speed * dt;
        p.z += (dz / dist) * speed * dt;
        const targetRot = Math.atan2(dx, dz);
        this.player.rotation.y = lerpAngle(this.player.rotation.y, targetRot, Math.min(1, dt * 10));
        moving = true;
      } else {
        const targetRot = Math.atan2(
          this.target.basePos.x - p.x,
          this.target.basePos.z - p.z,
        );
        this.player.rotation.y = lerpAngle(this.player.rotation.y, targetRot, Math.min(1, dt * 8));
      }
      if (this.queued && dist < 1.35) {
        this.#doPlayerSwing({ force: true });
      }
    }
    this.moving = moving;

    // animation de marche
    if (moving) {
      this.walkCycle += dt * 9;
      const s = Math.sin(this.walkCycle) * 0.65;
      parts.legL.rotation.x = s;
      parts.legR.rotation.x = -s;
      parts.armL.rotation.x = -s * 0.8;
      parts.armR.rotation.x = s * 0.8;
      this.player.position.y = Math.abs(Math.sin(this.walkCycle)) * 0.07;
    } else {
      this.walkCycle += dt * 2;
      const idle = Math.sin(this.walkCycle) * 0.06;
      parts.legL.rotation.x *= 0.85;
      parts.legR.rotation.x *= 0.85;
      parts.armL.rotation.x = -0.18 + idle;
      parts.armR.rotation.x = 0.18 - idle;
      this.player.position.y *= 0.8;
      parts.torso.scale.y = 1 + Math.sin(this.walkCycle * 1.6) * 0.012;
    }

    // coup de poing
    if (this.swing > 0) {
      this.swing = Math.max(0, this.swing - dt * 3.4);
      const t = 1 - this.swing; // 0 → 1
      const punch = Math.sin(Math.min(1, t) * Math.PI);
      parts.armR.rotation.x = -2.2 * punch;
      parts.armR.rotation.z = -0.35 * punch;
      parts.armL.rotation.x = -0.5 * punch;
      if (t > 0.35) this.attackCooldown = 0.1;
    } else {
      parts.armR.rotation.z *= 0.85;
    }

    // le personnage ne sort pas de l'arène
    const r = Math.hypot(p.x, p.z);
    if (r > 26) {
      p.x *= 26 / r;
      p.z *= 26 / r;
    }
  }

  #updatePets(dt) {
    const p = this.player.position;
    const t = this.time;
    const target = this.target && this.target.alive ? this.target : null;

    this.pets.forEach((pet, i) => {
      pet.angle += dt * (0.9 + i * 0.05);
      const radius = 1.5 + (i % 3) * 0.55;
      const a = pet.angle + i * 1.7;
      let tx = p.x + Math.cos(a) * radius;
      let tz = p.z + Math.sin(a) * radius;
      let ty = 0;

      // les pets se tournent vers la cible quand on tape
      if (target && this.swing > 0.6) {
        pet.lunge = Math.min(1, pet.lunge + dt * 6);
      } else {
        pet.lunge = Math.max(0, pet.lunge - dt * 3);
      }
      if (target) {
        tx = THREE.MathUtils.lerp(tx, target.basePos.x + Math.cos(a) * 1.1, pet.lunge * 0.55);
        tz = THREE.MathUtils.lerp(tz, target.basePos.z + Math.sin(a) * 1.1, pet.lunge * 0.55);
      }

      const m = pet.model;
      m.position.x += (tx - m.position.x) * Math.min(1, dt * 5);
      m.position.z += (tz - m.position.z) * Math.min(1, dt * 5);

      const hop = Math.abs(Math.sin(t * 3.2 + pet.hop)) * 0.22;
      const float = pet.float ? pet.float + Math.sin(t * 2 + pet.hop) * 0.08 : 0;
      m.position.y += ((hop + float) - m.position.y) * Math.min(1, dt * 10);

      // orientation
      const rot = Math.atan2(p.x - m.position.x, p.z - m.position.z);
      m.rotation.y = lerpAngle(m.rotation.y, rot, Math.min(1, dt * 4));
      // petit dandinement
      m.rotation.z = Math.sin(t * 2.4 + pet.hop) * 0.06;

      if (m.userData.wings) {
        const flap = Math.sin(t * 9 + pet.hop) * 0.35;
        m.userData.wings.forEach((w, wi) => {
          w.rotation.z = (wi === 0 ? 1 : -1) * (0.35 + flap) * (pet.def.family === 'dragon' ? 0.6 : 1);
        });
      }
    });
  }

  #updateBreakables(dt) {
    for (const b of this.breakables) {
      if (b.alive) {
        // petit flottement / rebond des piles
        const bob = Math.sin(this.time * 1.6 + b.index) * 0.02;
        b.model.position.y = bob;

        // animation de coup
        if (b.wrap.userData.hitTime) {
          b.wrap.userData.hitTime += dt;
          const t = Math.min(1, b.wrap.userData.hitTime / 0.22);
          const s = 1 + Math.sin(t * Math.PI) * 0.14;
          b.model.scale.set(s, 1 / s, s);
          if (t >= 1) {
            b.wrap.userData.hitTime = 0;
            b.model.scale.set(1, 1, 1);
          }
        }
      } else if (b.wrap.userData.breaking) {
        b.wrap.userData.breaking += dt;
        const t = Math.min(1, b.wrap.userData.breaking / 0.32);
        b.wrap.rotation.y += dt * 8;
        const s = 1 - t;
        b.wrap.scale.setScalar(Math.max(0.001, s));
        b.wrap.position.y = t * 0.6;
        if (t >= 1) {
          b.wrap.visible = false;
          b.wrap.rotation.y = 0;
          b.wrap.scale.setScalar(1);
          b.wrap.position.y = 0;
          b.wrap.userData.breaking = 0;
        }
      } else {
        b.respawn -= dt;
        if (b.respawn <= 0) {
          b.alive = true;
          b.hp = b.maxHp;
          b.wrap.visible = true;
          b.wrap.scale.setScalar(0.001);
          b.wrap.position.y = 0;
          b.wrap.userData.spawn = 0.001;
        }
      }
      if (b.wrap.userData.spawn && b.alive) {
        b.wrap.userData.spawn += dt;
        const t = Math.min(1, b.wrap.userData.spawn / 0.4);
        const ease = 1 - Math.pow(1 - t, 3);
        b.wrap.scale.setScalar(ease);
        if (t >= 1) {
          b.wrap.scale.setScalar(1);
          b.wrap.userData.spawn = 0;
        }
      }
    }
  }

  #updateParticles(dt) {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= 16 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      const k = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.05, k * 1.1));
      if (p.mesh.position.y < 0.1) {
        p.mesh.position.y = 0.1;
        p.vel.y *= -0.35;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}

/* ---------------- utilitaires ---------------- */

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatDmg(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  if (n < 10) return n.toFixed(1);
  return String(Math.round(n));
}
