/* Test du monde 3D sans WebGL : on injecte un faux renderer. */
import fs from 'fs';
import { JSDOM } from 'jsdom';

const root = new URL('..', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.localStorage = window.localStorage;
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);

const THREE = await import('three');
const { World } = await import('../src/ps99/world3d.js');
const { ZONES, zoneLayout, BREAKABLES, PETS } = await import('../src/ps99/data.js');

const canvas = document.querySelector('#scene');
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 600, right: 900, bottom: 600, x: 0, y: 0 });
Object.defineProperty(canvas.parentElement, 'clientWidth', { value: 900, configurable: true });
Object.defineProperty(canvas.parentElement, 'clientHeight', { value: 600, configurable: true });

const fakeRenderer = {
  shadowMap: { type: 0, enabled: true },
  outputColorSpace: '',
  toneMapping: 0,
  toneMappingExposure: 1,
  setPixelRatio() {},
  setSize() {},
  render(scene, camera) { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); },
  dispose() {},
};

let fails = 0;
const ok = (c, m) => { if (!c) { console.log('❌', m); fails++; } else console.log('✅', m); };

const events = { hits: 0, broken: 0, texts: 0, targets: 0, portals: [], machine: 0 };
const world = new World(canvas, {
  onPlayerHit: (b) => { events.hits++; if (b.hp > 0) world.applyDamage(b, 5, ''); },
  onBroken: () => { events.broken++; },
  onDamageText: (pos, text) => {
    events.texts++;
    if (!isFinite(pos.x) || !isFinite(pos.y)) { console.log('❌ position de dégât non finie', pos); fails++; }
    if (!text) { console.log('❌ texte de dégât vide'); fails++; }
  },
  onTargetChange: () => { events.targets++; },
  onPortal: (z) => { events.portals.push(z); },
  onEggMachine: () => { events.machine++; },
}, { renderer: fakeRenderer });

ok(world.scene.children.length > 5, `scène initialisée (${world.scene.children.length} enfants)`);
ok(world.camera.fov > 0 && world.viewW === 900, `caméra cadrée ${world.viewW}x${world.viewH}`);

world.setPets(['chiot', 'dragonfeu', 'blob99'].map((id) => PETS[id]));
ok(world.pets.length === 3, `pets affichés : ${world.pets.length}`);

for (const zone of ZONES) {
  let err = null;
  try {
    world.buildZone(zone, zoneLayout(zone.id));
    world.update(0.016);
  } catch (e) { err = e; }
  ok(!err && world.breakables.length === 9, `zone ${zone.id} (${zone.name}) construite : ${world.breakables.length} objets${err ? ' — ' + err.message : ''}`);
  if (err) console.log(err.stack);
}

/* ---------------- HUB ---------------- */
let hubErr = null;
try { world.buildHub({ unlockedZones: [1, 2] }); } catch (e) { hubErr = e; }
ok(!hubErr && world.mode === 'hub', `hub construit${hubErr ? ' — ' + hubErr.message : ''}`);
if (hubErr) console.log(hubErr.stack);
ok(world.portals.length === 6, `6 portails : ${world.portals.length}`);
ok(world.breakables.length === 0, 'aucun objet à casser dans le hub');
ok(world.hitMeshes.length === 7, `collisions hub : ${world.hitMeshes.length} (6 portails + machine)`);
ok(world.portals.filter((p) => p.unlocked).length === 2, 'portails débloqués marqués');

// cadrage : tous les portails doivent être visibles
world.update(0.02);
world.render();
const frustum = new THREE.Frustum().setFromProjectionMatrix(
  new THREE.Matrix4().multiplyMatrices(world.camera.projectionMatrix, world.camera.matrixWorldInverse),
);
const visiblePortals = world.portals.filter((p) => {
  const pos = new THREE.Vector3();
  p.group.getWorldPosition(pos);
  pos.y = 2;
  return frustum.containsPoint(pos);
});
ok(visiblePortals.length === 6, `portails visibles à l'écran : ${visiblePortals.length}/6`);
ok(frustum.containsPoint(new THREE.Vector3(0, 2.2, 0)), 'fontaine dans le champ de la caméra');

// clic sur un portail
const portal = world.portals[2];
const aimP = new THREE.Vector3();
portal.group.getWorldPosition(aimP);
aimP.y = 1.8;
world.update(0.016);
world.render();
aimP.project(world.camera);
world.clickAt((aimP.x * 0.5 + 0.5) * 900, (-aimP.y * 0.5 + 0.5) * 600);
ok(events.portals.length === 1 && events.portals[0] === portal.zone.id, `clic portail → zone ${events.portals.join(',')}`);

// clic sur la machine à œufs
const machine = world.hitMeshes.find((h) => h.userData.kind === 'machine');
const aimM = new THREE.Vector3();
machine.getWorldPosition(aimM);
aimM.project(world.camera);
world.clickAt((aimM.x * 0.5 + 0.5) * 900, (-aimM.y * 0.5 + 0.5) * 600);
ok(events.machine >= 1, 'clic machine à œufs → boutique');

// boucle du hub stable
let hubLoopErr = null;
try { for (let i = 0; i < 150; i++) { world.update(1 / 60); world.render(); } } catch (e) { hubLoopErr = e; }
ok(!hubLoopErr, `boucle hub stable${hubLoopErr ? ' — ' + hubLoopErr.message : ''}`);
ok(world.hubEgg.rotation.y > 0, 'œuf de la machine animé');

// pets mutés
world.setPets([
  { ...PETS.chiot, mutation: 'dore' },
  { ...PETS.dragonfeu, mutation: 'arcenciel' },
  { ...PETS.blob99, mutation: 'prismatique' },
]);
ok(world.pets.length === 3 && world.pets.every((p) => p.halo), 'halos sur les 3 pets mutés');
const rainbowPet = world.pets.find((p) => p.mutation === 'arcenciel');
ok(rainbowPet.animatedMats.length > 0, `matériaux animés arc-en-ciel : ${rainbowPet.animatedMats.length}`);
const hueA = rainbowPet.animatedMats[0].emissive.getHSL({ h: 0, s: 0, l: 0 }).h;
world.update(0.4);
const hueB = rainbowPet.animatedMats[0].emissive.getHSL({ h: 0, s: 0, l: 0 }).h;
ok(hueA !== hueB, 'la couleur arc-en-ciel évolue');

// retour en zone 1 pour les tests d'interaction
world.buildZone(ZONES[0], zoneLayout(1));
const b = world.breakables[0];
ok(b.alive && Math.abs(b.hp - BREAKABLES[b.def.id].hp) < 1e-6, `PV initiaux = ${b.hp}`);

world.selectTarget(b);
ok(world.target === b && events.targets > 0, 'sélection de cible + callback');

// dégâts partiels
world.applyDamage(b, 3, '');
ok(b.hp < b.maxHp && b.alive, `dégâts appliqués (${b.hp.toFixed(1)} restants)`);
ok(events.texts > 0, 'nombres flottants générés');

// clic réel via raycast : on vise le centre projeté de l'objet
world.update(0.016);
world.render();
const aim = b.basePos.clone(); aim.y = 0.8 * b.scale;
aim.project(world.camera);
const cx = (aim.x * 0.5 + 0.5) * 900;
const cy = (-aim.y * 0.5 + 0.5) * 600;
const picked = world.pickAt(cx, cy);
ok(picked && picked.kind === 'breakable' && picked.breakable === b, `raycast touche l'objet visé (${picked?.kind} #${picked?.breakable?.index})`);
world.player.position.copy(b.stand);
world.update(0.016);
const hitsBefore = events.hits;
world.clickAt(cx, cy);
ok(events.hits > hitsBefore, 'un clic déclenche une attaque');

// destruction
const coinsTarget = world.breakables[5];
world.selectTarget(coinsTarget);
const brokenBefore = events.broken;
world.applyDamage(coinsTarget, 1e9, '');
ok(!coinsTarget.alive && events.broken === brokenBefore + 1, 'objet détruit + callback onBroken');
ok(coinsTarget.respawn > 0, 'respawn programmé');

// le monde tourne sans erreur, et l'objet réapparaît
let loopErr = null;
try {
  for (let i = 0; i < 260; i++) {
    world.update(1 / 60);
    world.render();
  }
} catch (e) { loopErr = e; }
ok(!loopErr, `boucle de jeu stable${loopErr ? ' — ' + loopErr.message : ''}`);
if (loopErr) console.log(loopErr.stack);
ok(coinsTarget.alive && coinsTarget.hp === coinsTarget.maxHp, 'objet réapparu avec ses PV');

// caméra / qualité / palette
world.setQuality(true);
world.setQuality(false);
world.setPalette(3);
ok(world.playerParts.armR && world.playerParts.torso, 'palette appliquée (avatar reconstruit)');

// attaque auto
world.selectTarget(world.breakables[0]);
world.player.position.copy(world.breakables[0].stand);
world.update(0.016);
const auto = world.requestAutoHit();
ok(auto === true, 'attaque automatique possible à portée');
world.player.position.set(30, 0, 30);
world.update(0.016);
ok(world.requestAutoHit() === false, 'attaque automatique refusée hors de portée');

// rendu caméra : pas de NaN
ok(isFinite(world.camera.position.x) && isFinite(world.camera.position.y), 'position caméra valide');

console.log(fails === 0 ? '\n🎉 Monde 3D OK' : `\n💥 ${fails} erreur(s) monde`);
process.exit(fails ? 1 : 0);
