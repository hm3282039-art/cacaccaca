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

const events = { hits: 0, broken: 0, texts: 0, targets: 0 };
const world = new World(canvas, {
  onPlayerHit: (b) => { events.hits++; if (b.hp > 0) world.applyDamage(b, 5, ''); },
  onBroken: () => { events.broken++; },
  onDamageText: (pos, text) => {
    events.texts++;
    if (!isFinite(pos.x) || !isFinite(pos.y)) { console.log('❌ position de dégât non finie', pos); fails++; }
    if (!text) { console.log('❌ texte de dégât vide'); fails++; }
  },
  onTargetChange: () => { events.targets++; },
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
ok(picked === b, `raycast touche l'objet visé (index ${picked?.index})`);
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
