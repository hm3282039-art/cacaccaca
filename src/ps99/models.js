/* ============================================================
   Modèles 3D « blocs » — avatar et pets
   Tous les modèles sont générés à partir de boîtes et de cônes :
   léger, rapide, et facile à recolorier par pet.
   ============================================================ */
import * as THREE from 'three';

const geoCache = new Map();
function boxGeo(w, h, d) {
  const key = `${w}|${h}|${d}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}
function sphereGeo(r, seg = 12) {
  const key = `s${r}|${seg}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2));
    geoCache.set(key, g);
  }
  return g;
}
function coneGeo(r, h, seg = 10) {
  const key = `c${r}|${h}|${seg}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.ConeGeometry(r, h, seg);
    geoCache.set(key, g);
  }
  return g;
}

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + (opts.roughness ?? 0.55) + (opts.metalness ?? 0) + (opts.emissive || '') + (opts.emissiveIntensity || '');
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0,
    flatShading: opts.flat ?? true,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  if (!opts.unique) matCache.set(key, m);
  return m;
}

function bx(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat(color, opts));
  m.castShadow = opts.noShadow ? false : true;
  m.receiveShadow = true;
  m.userData.noShadow = !!opts.noShadow;
  return m;
}

function add(parent, mesh, x = 0, y = 0, z = 0) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/* ============================================================
   AVATAR — personnage bloc style jouet
   ============================================================ */
export const AVATAR_PALETTES = [
  { shirt: '#3b82f6', pants: '#1e3a8a', skin: '#f2c49b', cap: '#facc15', name: 'Bleu' },
  { shirt: '#ef4444', pants: '#7f1d1d', skin: '#8d5524', cap: '#22d3ee', name: 'Rouge' },
  { shirt: '#22c55e', pants: '#14532d', skin: '#f2c49b', cap: '#f97316', name: 'Vert' },
  { shirt: '#a855f7', pants: '#3b0764', skin: '#e8b48c', cap: '#f472b6', name: 'Violet' },
  { shirt: '#f59e0b', pants: '#78350f', skin: '#c68642', cap: '#ef4444', name: 'Or' },
  { shirt: '#0ea5e9', pants: '#0c4a6e', skin: '#ffdbac', cap: '#84cc16', name: 'Océan' },
];

export function buildAvatar(palette = AVATAR_PALETTES[0]) {
  const group = new THREE.Group();
  const p = palette;

  const skin = p.skin;
  const shirt = p.shirt;
  const pants = p.pants;

  // torse
  const torso = bx(1.02, 1.18, 0.58, shirt);
  add(group, torso, 0, 1.62, 0);

  // col
  add(group, bx(0.86, 0.16, 0.5, '#f8fafc'), 0, 2.24, 0);

  // tête
  const head = new THREE.Group();
  head.position.set(0, 2.7, 0);
  group.add(head);
  add(head, bx(0.88, 0.86, 0.86, skin), 0, 0, 0);

  // yeux
  add(head, bx(0.13, 0.16, 0.04, '#1b1b22', { noShadow: true }), -0.19, 0.06, 0.44);
  add(head, bx(0.13, 0.16, 0.04, '#1b1b22', { noShadow: true }), 0.19, 0.06, 0.44);
  // sourire
  add(head, bx(0.26, 0.05, 0.03, '#7c3f2a', { noShadow: true }), 0, -0.22, 0.44);
  // casquette
  add(head, bx(0.94, 0.2, 0.92, p.cap), 0, 0.5, 0);
  add(head, bx(0.94, 0.07, 0.4, p.cap), 0, 0.42, 0.6);

  // bras (pivots aux épaules)
  const armL = new THREE.Group();
  armL.position.set(-0.68, 2.16, 0);
  group.add(armL);
  add(armL, bx(0.32, 1.12, 0.36, shirt), 0, -0.52, 0);
  add(armL, bx(0.3, 0.24, 0.34, skin), 0, -1.16, 0);

  const armR = new THREE.Group();
  armR.position.set(0.68, 2.16, 0);
  group.add(armR);
  add(armR, bx(0.32, 1.12, 0.36, shirt), 0, -0.52, 0);
  add(armR, bx(0.3, 0.24, 0.34, skin), 0, -1.16, 0);

  // jambes (pivots aux hanches)
  const legL = new THREE.Group();
  legL.position.set(-0.26, 1.04, 0);
  group.add(legL);
  add(legL, bx(0.42, 1.0, 0.5, pants), 0, -0.5, 0);
  add(legL, bx(0.44, 0.16, 0.56, '#20242e'), 0, -1.0, 0.02);

  const legR = new THREE.Group();
  legR.position.set(0.26, 1.04, 0);
  group.add(legR);
  add(legR, bx(0.42, 1.0, 0.5, pants), 0, -0.5, 0);
  add(legR, bx(0.44, 0.16, 0.56, '#20242e'), 0, -1.0, 0.02);

  // backpack léger
  add(group, bx(0.66, 0.7, 0.24, '#334155'), 0, 1.66, -0.4);

  group.userData = { torso, head, armL, armR, legL, legR };
  return group;
}

/* ============================================================
   PETS — un constructeur générique + quelques familles spéciales
   ============================================================ */
export function buildPet(def) {
  const c = def.colors || {};
  const main = c.main || '#cccccc';
  const belly = c.belly || '#ffffff';
  const accent = c.accent || '#444444';
  const shiny = def.shiny;
  const group = new THREE.Group();

  const eye = (parent, x, y, z, s = 1) => {
    add(parent, bx(0.1 * s, 0.13 * s, 0.05, '#141420', { noShadow: true }), x, y, z);
    add(parent, bx(0.04 * s, 0.05 * s, 0.02, '#ffffff', { noShadow: true }), x + 0.025 * s, y + 0.03 * s, z + 0.03);
  };

  const finish = (g) => {
    if (shiny) {
      g.traverse((o) => {
        if (o.isMesh && o.material && o.material.color && !o.userData.keep) {
          o.material = o.material.clone();
          o.material.emissive = new THREE.Color(o.material.color).multiplyScalar(0.35);
          o.material.metalness = 0.55;
          o.material.roughness = 0.3;
        }
      });
    }
    group.add(g);
    return group;
  };

  switch (def.family) {
    case 'slime': {
      const g = new THREE.Group();
      const blob = new THREE.Mesh(sphereGeo(0.52, 16), mat(main, { roughness: 0.25, emissive: main, emissiveIntensity: 0.22 }));
      blob.scale.set(1, 0.82, 1);
      blob.position.y = 0.44;
      blob.castShadow = true;
      g.add(blob);
      const bellyMesh = new THREE.Mesh(sphereGeo(0.34, 14), mat(belly, { roughness: 0.3 }));
      bellyMesh.scale.set(1, 0.8, 0.4);
      bellyMesh.position.set(0, 0.35, 0.34);
      g.add(bellyMesh);
      eye(g, -0.18, 0.6, 0.44);
      eye(g, 0.18, 0.6, 0.44);
      add(g, bx(0.2, 0.06, 0.05, '#141420', { noShadow: true }), 0, 0.4, 0.47);
      add(g, bx(0.1, 0.22, 0.1, accent), 0, 0.83, 0);
      add(g, bx(0.34, 0.14, 0.3, accent), 0, 0.94, 0);
      return finish(g);
    }

    case 'bee': {
      const g = new THREE.Group();
      const body = bx(0.62, 0.5, 0.86, main);
      add(g, body, 0, 0.5, 0);
      add(g, bx(0.64, 0.16, 0.2, accent), 0, 0.5, 0.1);
      add(g, bx(0.64, 0.16, 0.2, accent), 0, 0.5, 0.4);
      const head = bx(0.5, 0.5, 0.4, main);
      add(g, head, 0, 0.6, 0.55);
      eye(g, -0.13, 0.66, 0.76, 0.9);
      eye(g, 0.13, 0.66, 0.76, 0.9);
      add(g, bx(0.04, 0.3, 0.04, accent), -0.14, 0.92, 0.6);
      add(g, bx(0.04, 0.3, 0.04, accent), 0.14, 0.92, 0.6);
      add(g, bx(0.1, 0.1, 0.1, accent), -0.14, 1.08, 0.6);
      add(g, bx(0.1, 0.1, 0.1, accent), 0.14, 1.08, 0.6);
      const w1 = bx(0.7, 0.05, 0.36, belly, { unique: true });
      w1.position.set(-0.6, 0.68, 0.05);
      w1.rotation.z = 0.35;
      w1.material.transparent = true;
      w1.material.opacity = 0.85;
      g.add(w1);
      const w2 = w1.clone();
      w2.position.x = 0.6;
      w2.rotation.z = -0.35;
      g.add(w2);
      g.userData.wings = [w1, w2];
      g.userData.float = 0.35;
      return finish(g);
    }

    case 'crab': {
      const g = new THREE.Group();
      const body = bx(0.9, 0.38, 0.72, main);
      add(g, body, 0, 0.4, 0);
      add(g, bx(0.8, 0.1, 0.6, accent), 0, 0.2, 0);
      eye(g, -0.22, 0.66, 0.34, 0.9);
      eye(g, 0.22, 0.66, 0.34, 0.9);
      add(g, bx(0.08, 0.24, 0.08, accent), -0.22, 0.56, 0.3);
      add(g, bx(0.08, 0.24, 0.08, accent), 0.22, 0.56, 0.3);
      // pinces
      add(g, bx(0.34, 0.3, 0.4, main), -0.66, 0.42, 0.28);
      add(g, bx(0.34, 0.3, 0.4, main), 0.66, 0.42, 0.28);
      add(g, bx(0.16, 0.14, 0.3, accent), -0.86, 0.52, 0.3);
      add(g, bx(0.16, 0.14, 0.3, accent), 0.86, 0.52, 0.3);
      // pattes
      for (let i = 0; i < 3; i++) {
        add(g, bx(0.28, 0.1, 0.1, accent), -0.55, 0.14, -0.15 + i * 0.24);
        add(g, bx(0.28, 0.1, 0.1, accent), 0.55, 0.14, -0.15 + i * 0.24);
      }
      return finish(g);
    }

    case 'shark': {
      const g = new THREE.Group();
      const body = bx(0.6, 0.58, 1.2, main);
      add(g, body, 0, 0.5, 0);
      add(g, bx(0.62, 0.28, 0.9, belly), 0, 0.3, 0.08);
      const snout = bx(0.5, 0.42, 0.4, main);
      add(g, snout, 0, 0.56, 0.72);
      // dents
      for (let i = -1; i <= 1; i++) add(g, bx(0.1, 0.12, 0.08, '#ffffff', { noShadow: true }), i * 0.15, 0.42, 0.9);
      eye(g, -0.22, 0.68, 0.58, 0.85);
      eye(g, 0.22, 0.68, 0.58, 0.85);
      // aileron
      const fin = new THREE.Mesh(coneGeo(0.3, 0.55, 4), mat(main));
      fin.position.set(0, 0.9, 0);
      fin.rotation.y = Math.PI / 4;
      g.add(fin);
      add(g, bx(0.7, 0.1, 0.36, main), 0, 0.55, -0.55);
      const tail = new THREE.Mesh(coneGeo(0.36, 0.6, 4), mat(main));
      tail.position.set(0, 0.7, -0.72);
      tail.rotation.set(0.4, Math.PI / 4, 0);
      g.add(tail);
      g.userData.float = 0.22;
      g.userData.wobble = true;
      return finish(g);
    }

    case 'dragon': {
      const g = new THREE.Group();
      add(g, bx(0.7, 0.6, 1.0, main), 0, 0.62, 0);
      add(g, bx(0.5, 0.44, 0.7, belly), 0, 0.38, 0.08);
      add(g, bx(0.56, 0.5, 0.5, main), 0, 0.86, 0.6);
      eye(g, -0.16, 0.94, 0.86, 0.85);
      eye(g, 0.16, 0.94, 0.86, 0.85);
      add(g, bx(0.36, 0.2, 0.3, belly), 0, 0.68, 0.92);
      add(g, bx(0.06, 0.06, 0.06, '#141420', { noShadow: true }), -0.08, 0.7, 1.05);
      add(g, bx(0.06, 0.06, 0.06, '#141420', { noShadow: true }), 0.08, 0.7, 1.05);
      // cornes
      const h1 = new THREE.Mesh(coneGeo(0.1, 0.34, 5), mat(accent));
      h1.position.set(-0.2, 1.16, 0.5);
      h1.rotation.x = -0.3;
      g.add(h1);
      const h2 = h1.clone();
      h2.position.x = 0.2;
      g.add(h2);
      // ailes
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(0.9, 0.5);
      wingShape.lineTo(1.05, 0.05);
      wingShape.lineTo(0.8, -0.35);
      wingShape.lineTo(0.4, -0.55);
      wingShape.lineTo(0, -0.2);
      wingShape.closePath();
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.05, bevelEnabled: false });
      const wm = mat(shiny ? accent : accent, { roughness: 0.5 });
      const wingL = new THREE.Mesh(wingGeo, wm);
      wingL.position.set(-0.32, 0.85, -0.05);
      wingL.rotation.set(0, Math.PI, 0.15);
      wingL.castShadow = true;
      g.add(wingL);
      const wingR = new THREE.Mesh(wingGeo, wm);
      wingR.position.set(0.32, 0.85, 0.05);
      wingR.rotation.set(0, 0, -0.15);
      wingR.castShadow = true;
      g.add(wingR);
      g.userData.wings = [wingL, wingR];
      // queue
      add(g, bx(0.2, 0.2, 0.7, main), 0, 0.55, -0.75);
      const tip = new THREE.Mesh(coneGeo(0.2, 0.32, 4), mat(accent));
      tip.position.set(0, 0.6, -1.15);
      tip.rotation.x = Math.PI / 2;
      g.add(tip);
      g.userData.float = 0.18;
      return finish(g);
    }

    case 'robot': {
      const g = new THREE.Group();
      add(g, bx(0.72, 0.7, 0.56, main), 0, 0.72, 0);
      add(g, bx(0.5, 0.34, 0.5, belly), 0, 0.62, 0.06);
      add(g, bx(0.62, 0.52, 0.56, main), 0, 1.32, 0);
      add(g, bx(0.5, 0.2, 0.06, accent, { emissive: accent, emissiveIntensity: 1.1, noShadow: true }), 0, 1.36, 0.3);
      add(g, bx(0.08, 0.06, 0.06, '#0b1020', { noShadow: true }), -0.14, 1.36, 0.33);
      add(g, bx(0.08, 0.06, 0.06, '#0b1020', { noShadow: true }), 0.14, 1.36, 0.33);
      add(g, bx(0.1, 0.16, 0.1, accent), 0, 1.66, 0);
      const orbe = new THREE.Mesh(sphereGeo(0.1, 8), mat(accent, { emissive: accent, emissiveIntensity: 1.6 }));
      orbe.position.y = 1.82;
      g.add(orbe);
      add(g, bx(0.2, 0.5, 0.24, main), -0.48, 0.78, 0);
      add(g, bx(0.2, 0.5, 0.24, main), 0.48, 0.78, 0);
      add(g, bx(0.26, 0.16, 0.3, accent), -0.5, 0.42, 0.02);
      add(g, bx(0.26, 0.16, 0.3, accent), 0.5, 0.42, 0.02);
      add(g, bx(0.24, 0.5, 0.3, main), -0.2, 0.25, 0);
      add(g, bx(0.24, 0.5, 0.3, main), 0.2, 0.25, 0);
      return finish(g);
    }

    case 'golem': {
      const g = new THREE.Group();
      add(g, bx(0.9, 0.8, 0.7, main), 0, 0.9, 0);
      add(g, bx(0.6, 0.5, 0.74, belly), 0, 0.98, 0.02);
      add(g, bx(0.6, 0.55, 0.6, main), 0, 1.52, 0);
      add(g, bx(0.14, 0.12, 0.05, accent, { emissive: accent, emissiveIntensity: 0.9, noShadow: true }), -0.15, 1.54, 0.32);
      add(g, bx(0.14, 0.12, 0.05, accent, { emissive: accent, emissiveIntensity: 0.9, noShadow: true }), 0.15, 1.54, 0.32);
      add(g, bx(0.34, 0.4, 0.34, main), -0.72, 1.0, 0);
      add(g, bx(0.34, 0.4, 0.34, main), 0.72, 1.0, 0);
      add(g, bx(0.42, 0.36, 0.44, accent), -0.78, 0.6, 0);
      add(g, bx(0.42, 0.36, 0.44, accent), 0.78, 0.6, 0);
      add(g, bx(0.36, 0.52, 0.4, main), -0.26, 0.28, 0);
      add(g, bx(0.36, 0.52, 0.4, main), 0.26, 0.28, 0);
      // cristaux
      for (let i = 0; i < 3; i++) {
        const cr = new THREE.Mesh(coneGeo(0.1, 0.3, 5), mat('#7dd3fc', { emissive: '#38bdf8', emissiveIntensity: 0.7 }));
        cr.position.set(-0.2 + i * 0.2, 1.86, -0.1);
        cr.rotation.z = (i - 1) * 0.25;
        g.add(cr);
      }
      return finish(g);
    }

    case 'squid': {
      const g = new THREE.Group();
      const head = new THREE.Mesh(sphereGeo(0.5, 14), mat(main));
      head.scale.set(1, 1.25, 1);
      head.position.y = 0.95;
      head.castShadow = true;
      g.add(head);
      eye(g, -0.19, 1.0, 0.42, 1);
      eye(g, 0.19, 1.0, 0.42, 1);
      add(g, bx(0.3, 0.16, 0.5, accent), 0, 1.45, 0);
      for (let i = 0; i < 5; i++) {
        const t = bx(0.16, 0.5, 0.16, i % 2 ? main : accent);
        t.position.set((i - 2) * 0.18, 0.35, 0.1);
        t.rotation.z = (i - 2) * 0.15;
        g.add(t);
      }
      g.userData.float = 0.28;
      g.userData.wobble = true;
      return finish(g);
    }

    case 'phoenix':
    case 'griffon': {
      const g = new THREE.Group();
      add(g, bx(0.62, 0.56, 0.86, main), 0, 0.72, 0);
      add(g, bx(0.44, 0.4, 0.6, belly), 0, 0.62, 0.16);
      add(g, bx(0.5, 0.46, 0.44, main), 0, 1.12, 0.34);
      add(g, bx(0.22, 0.12, 0.24, accent), 0, 1.05, 0.62);
      eye(g, -0.14, 1.18, 0.56, 0.8);
      eye(g, 0.14, 1.18, 0.56, 0.8);
      add(g, bx(0.1, 0.26, 0.1, accent), -0.12, 1.44, 0.3);
      add(g, bx(0.1, 0.26, 0.1, accent), 0.12, 1.44, 0.3);
      const w1 = bx(0.9, 0.08, 0.5, accent, { emissive: def.family === 'phoenix' ? accent : '#000000', emissiveIntensity: 0.5 });
      w1.position.set(-0.62, 0.95, 0);
      w1.rotation.z = 0.5;
      g.add(w1);
      const w2 = w1.clone();
      w2.position.x = 0.62;
      w2.rotation.z = -0.5;
      g.add(w2);
      g.userData.wings = [w1, w2];
      const tail = bx(0.5, 0.08, 0.6, accent, { emissive: def.family === 'phoenix' ? accent : '#000000', emissiveIntensity: 0.6 });
      tail.position.set(0, 0.85, -0.72);
      tail.rotation.x = -0.4;
      g.add(tail);
      add(g, bx(0.1, 0.3, 0.1, accent), -0.16, 0.28, 0);
      add(g, bx(0.1, 0.3, 0.1, accent), 0.16, 0.28, 0);
      g.userData.float = 0.3;
      return finish(g);
    }

    case 'yeti': {
      const g = new THREE.Group();
      add(g, bx(0.95, 0.95, 0.7, main), 0, 0.95, 0);
      add(g, bx(0.6, 0.6, 0.72, belly), 0, 1.0, 0.02);
      add(g, bx(0.72, 0.66, 0.66, main), 0, 1.86, 0);
      add(g, bx(0.5, 0.3, 0.1, belly), 0, 1.78, 0.35);
      add(g, bx(0.1, 0.12, 0.05, '#141420', { noShadow: true }), -0.17, 1.95, 0.34);
      add(g, bx(0.1, 0.12, 0.05, '#141420', { noShadow: true }), 0.17, 1.95, 0.34);
      add(g, bx(0.3, 0.06, 0.06, accent, { noShadow: true }), 0, 1.66, 0.36);
      add(g, bx(0.3, 0.7, 0.34, main), -0.66, 1.0, 0);
      add(g, bx(0.3, 0.7, 0.34, main), 0.66, 1.0, 0);
      add(g, bx(0.3, 0.6, 0.34, main), -0.28, 0.3, 0);
      add(g, bx(0.3, 0.6, 0.34, main), 0.28, 0.3, 0);
      return finish(g);
    }

    default: {
      // quadrupèdes : dog, cat, fox, wolf, bear, bunny, mouse, hedgehog, penguin
      const g = new THREE.Group();
      const long = def.family === 'bunny' ? 0.42 : def.family === 'fox' ? 0.3 : 0.24;
      const bodyH = def.family === 'penguin' ? 0.72 : 0.52;
      const body = bx(0.66, bodyH, 0.92, main);
      add(g, body, 0, 0.42 + bodyH / 2 - 0.1, 0);
      add(g, bx(0.5, bodyH * 0.72, 0.66, belly), 0, 0.42 + bodyH / 2 - 0.08, 0.16);

      const headY = 0.42 + bodyH + 0.22;
      const head = bx(0.6, 0.56, 0.56, main);
      add(g, head, 0, headY, 0.36);
      add(g, bx(0.36, 0.24, 0.16, belly), 0, headY - 0.1, 0.66);
      add(g, bx(0.12, 0.08, 0.06, accent), 0, headY - 0.02, 0.75);
      eye(g, -0.16, headY + 0.1, 0.64, 0.9);
      eye(g, 0.16, headY + 0.1, 0.64, 0.9);

      // oreilles
      if (def.family === 'bunny') {
        add(g, bx(0.16, 0.62, 0.1, main), -0.16, headY + 0.5, 0.34);
        add(g, bx(0.16, 0.62, 0.1, main), 0.16, headY + 0.5, 0.34);
        add(g, bx(0.08, 0.44, 0.05, accent), -0.16, headY + 0.5, 0.4);
        add(g, bx(0.08, 0.44, 0.05, accent), 0.16, headY + 0.5, 0.4);
      } else if (def.family === 'cat' || def.family === 'fox' || def.family === 'wolf') {
        const e1 = new THREE.Mesh(coneGeo(0.15, 0.34, 4), mat(main));
        e1.position.set(-0.2, headY + 0.38, 0.34);
        e1.rotation.y = Math.PI / 4;
        g.add(e1);
        const e2 = e1.clone();
        e2.position.x = 0.2;
        g.add(e2);
      } else if (def.family === 'mouse') {
        const s1 = new THREE.Mesh(sphereGeo(0.17, 10), mat(main));
        s1.position.set(-0.28, headY + 0.3, 0.3);
        s1.scale.z = 0.4;
        g.add(s1);
        const s2 = s1.clone();
        s2.position.x = 0.28;
        g.add(s2);
      } else if (def.family === 'bear' || def.family === 'hedgehog') {
        add(g, bx(0.2, 0.2, 0.1, main), -0.22, headY + 0.32, 0.32);
        add(g, bx(0.2, 0.2, 0.1, main), 0.22, headY + 0.32, 0.32);
        if (def.family === 'hedgehog') {
          for (let i = 0; i < 5; i++) {
            const spike = new THREE.Mesh(coneGeo(0.09, 0.3, 4), mat(accent));
            spike.position.set(-0.2 + i * 0.1, headY + 0.42, -0.05 + (i % 2) * 0.1);
            g.add(spike);
          }
          for (let i = 0; i < 4; i++) {
            const spike = new THREE.Mesh(coneGeo(0.1, 0.34, 4), mat(accent));
            spike.position.set(0, 0.42 + bodyH, -0.2 + i * 0.2);
            g.add(spike);
          }
        }
      } else {
        // chien : oreilles tombantes
        add(g, bx(0.16, 0.3, 0.12, accent), -0.32, headY + 0.12, 0.3);
        add(g, bx(0.16, 0.3, 0.12, accent), 0.32, headY + 0.12, 0.3);
      }

      // queue
      if (def.family === 'fox') {
        const t = bx(0.24, 0.24, 0.62, main);
        t.position.set(0, 0.72, -0.72);
        t.rotation.x = -0.5;
        g.add(t);
        add(g, bx(0.26, 0.26, 0.18, belly), 0, 0.92, -0.98);
      } else if (def.family !== 'penguin') {
        const t = bx(0.14, 0.14, 0.42, main);
        t.position.set(0, 0.72, -0.62);
        t.rotation.x = -0.7;
        g.add(t);
      }

      // pattes
      const pawY = 0.16;
      const pawZ = 0.3;
      add(g, bx(0.2, 0.32, 0.24, main), -0.24, pawY, pawZ);
      add(g, bx(0.2, 0.32, 0.24, main), 0.24, pawY, pawZ);
      add(g, bx(0.2, 0.32, 0.24, main), -0.24, pawY, -pawZ);
      add(g, bx(0.2, 0.32, 0.24, main), 0.24, pawY, -pawZ);

      if (def.family === 'penguin') {
        add(g, bx(0.62, 0.12, 0.36, accent), 0, 0.2, 0.36);
        const f1 = bx(0.2, 0.44, 0.08, main);
        f1.position.set(-0.4, 0.6, 0.1);
        f1.rotation.z = 0.3;
        g.add(f1);
        const f2 = f1.clone();
        f2.position.x = 0.4;
        f2.rotation.z = -0.3;
        g.add(f2);
      }

      g.scale.setScalar(0.98);
      return finish(g);
    }
  }
}

/* ============================================================
   Décor : arbres, rochers, cristaux…
   ============================================================ */
export function buildTree(type = 'leaf') {
  const g = new THREE.Group();
  const trunk = bx(0.42, 1.7, 0.42, '#7a5230');
  trunk.position.y = 0.85;
  g.add(trunk);
  if (type === 'pine') {
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(coneGeo(1.2 - i * 0.28, 1.2, 7), mat(i % 2 ? '#2f6b3a' : '#357a42'));
      c.position.y = 1.9 + i * 0.7;
      c.castShadow = true;
      g.add(c);
    }
  } else {
    const colors = ['#3f9c4a', '#4cb35a', '#358a40'];
    for (let i = 0; i < 3; i++) {
      const leaf = bx(1.5 - i * 0.22, 1.0, 1.5 - i * 0.22, colors[i]);
      leaf.position.set((i - 1) * 0.42, 2.0 + i * 0.55, (i - 1) * -0.3);
      leaf.rotation.y = i * 0.6;
      g.add(leaf);
    }
  }
  return g;
}

export function buildPalm() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = bx(0.34, 0.72, 0.34, i % 2 ? '#a8763f' : '#96682f');
    seg.position.set(i * 0.1, 0.36 + i * 0.66, 0);
    seg.rotation.z = -i * 0.07;
    g.add(seg);
  }
  const leaves = ['#3fa34d', '#4fbf5e'];
  for (let i = 0; i < 5; i++) {
    const leaf = bx(1.7, 0.12, 0.5, leaves[i % 2]);
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(0.4 + Math.cos(a) * 0.7, 3.3, Math.sin(a) * 0.7);
    leaf.rotation.set(0, -a, 0.22);
    g.add(leaf);
  }
  return g;
}

export function buildRock(size = 1, color = '#8b95a5') {
  const g = new THREE.Group();
  const base = bx(1.5 * size, 1.1 * size, 1.3 * size, color);
  base.position.y = 0.5 * size;
  base.rotation.y = Math.random() * Math.PI;
  g.add(base);
  const top = bx(0.9 * size, 0.7 * size, 0.8 * size, '#9fa9b8');
  top.position.set(0.3 * size, 1.1 * size, 0.1 * size);
  top.rotation.y = Math.random() * Math.PI;
  g.add(top);
  return g;
}

export function buildCrystal(color = '#7dd3fc', glow = '#38bdf8') {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const h = 1.2 + Math.random() * 1.1;
    const c = new THREE.Mesh(coneGeo(0.28 + Math.random() * 0.12, h, 5), mat(color, { emissive: glow, emissiveIntensity: 0.65, roughness: 0.2 }));
    c.position.set((Math.random() - 0.5) * 0.9, h / 2, (Math.random() - 0.5) * 0.9);
    c.rotation.z = (Math.random() - 0.5) * 0.4;
    c.castShadow = true;
    g.add(c);
  }
  return g;
}

export function buildLavaPool() {
  const g = new THREE.Group();
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.18, 12), mat('#ff5722', { emissive: '#ff3d00', emissiveIntensity: 0.9, roughness: 0.3 }));
  pool.position.y = 0.06;
  g.add(pool);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.06, 12), mat('#5a2a1a', { emissive: '#ff6d00', emissiveIntensity: 0.25 }));
  glow.position.y = 0.06;
  g.add(glow);
  return g;
}

export function buildFlower() {
  const g = new THREE.Group();
  add(g, bx(0.06, 0.4, 0.06, '#3f8f4a'), 0, 0.2, 0);
  const colors = ['#ffd24a', '#ff7ab8', '#ffffff', '#a78bfa', '#ff8a3d'];
  const c = colors[Math.floor(Math.random() * colors.length)];
  add(g, bx(0.22, 0.1, 0.22, c, { noShadow: true }), 0, 0.44, 0);
  return g;
}

export function buildNeonBlock(color = '#3ddcff') {
  const g = new THREE.Group();
  const h = 1 + Math.random() * 1.6;
  add(g, bx(0.5, h, 0.5, '#1b2742'), 0, h / 2, 0);
  add(g, bx(0.54, 0.14, 0.54, color, { emissive: color, emissiveIntensity: 1.4, noShadow: true }), 0, h - 0.1, 0);
  return g;
}

export function buildCoinPile() {
  const g = new THREE.Group();
  const gold = '#ffd24a';
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), mat(gold, { metalness: 0.7, roughness: 0.25, emissive: '#a87200', emissiveIntensity: 0.25 }));
    c.position.set((Math.random() - 0.5) * 0.6, 0.07 + Math.floor(i / 3) * 0.11, (Math.random() - 0.5) * 0.6);
    c.castShadow = true;
    g.add(c);
  }
  return g;
}

export function buildChest(size = 1, gold = true) {
  const g = new THREE.Group();
  const body = bx(1.25 * size, 0.75 * size, 0.85 * size, gold ? '#c98f2b' : '#7a5c3a');
  add(g, body, 0, 0.38 * size, 0);
  const lid = bx(1.3 * size, 0.36 * size, 0.9 * size, gold ? '#ffd24a' : '#9a7550');
  add(g, lid, 0, 0.86 * size, 0);
  add(g, bx(1.34 * size, 0.12 * size, 0.94 * size, '#8a5d1a'), 0, 0.68 * size, 0);
  add(g, bx(0.2 * size, 0.26 * size, 0.1 * size, '#ffe9a3'), 0, 0.5 * size, 0.45 * size);
  add(g, bx(0.34 * size, 0.1 * size, 0.1 * size, '#ffe9a3'), 0, 0.92 * size, 0.46 * size);
  if (gold) {
    const shine = new THREE.Mesh(sphereGeo(0.06 * size, 8), mat('#fff3b0', { emissive: '#ffd24a', emissiveIntensity: 1.4 }));
    shine.position.set(0.35 * size, 0.95 * size, 0.3 * size);
    g.add(shine);
  }
  return g;
}
