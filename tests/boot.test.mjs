/* Test du démarrage complet (main.js) avec un renderer factice. */
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
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
window.HTMLCanvasElement.prototype.getContext = () => null;

let fails = 0;
const ok = (c, m) => { if (!c) { console.log('❌', m); fails++; } else console.log('✅', m); };

const { rendererFactory } = await import('../src/ps99/world3d.js');
rendererFactory.create = () => ({
  shadowMap: { type: 0, enabled: true },
  outputColorSpace: '', toneMapping: 0, toneMappingExposure: 1,
  setPixelRatio() {}, setSize() {},
  render(scene, cam) { scene.updateMatrixWorld(true); cam.updateMatrixWorld(true); },
  dispose() {},
});

const canvas = document.querySelector('#scene');
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 800, right: 1280, bottom: 800, x: 0, y: 0 });
Object.defineProperty(canvas.parentElement, 'clientWidth', { value: 1280, configurable: true });
Object.defineProperty(canvas.parentElement, 'clientHeight', { value: 800, configurable: true });
window.innerWidth = 1280; window.innerHeight = 800;

const errors = [];
process.on('uncaughtException', (e) => { errors.push(e); });

await import('../src/ps99/main.js');
// laisse tourner quelques frames + les timers de boot
await new Promise((r) => setTimeout(r, 1200));

const state = window.__petblocs_state;
ok(!!state, 'état global créé');
ok(state && state.pets.length === 1 && state.pets[0].id === 'chiot', `pet de départ offert (${state?.pets.map((p) => p.id)})`);
ok(!document.querySelector('#loading'), 'écran de chargement retiré');
ok(document.querySelectorAll('.dock-pet').length === 1, 'dock avec le pet de départ');
ok(document.querySelector('#stat-coins').textContent === '0', 'pièces à 0');
ok(document.querySelector('#metric') === null, 'pas de résidu de test');

const clickAt = (x, y, target = canvas) => {
  const ev = new window.MouseEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, buttons: 1, pointerId: 1, pointerType: 'mouse' });
  const evUp = new window.MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y, buttons: 0, pointerId: 1, pointerType: 'mouse' });
  target.dispatchEvent(ev);
  target.dispatchEvent(evUp);
};

// clic au centre de l'écran : doit toucher un objet à casser
clickAt(640, 400);
await new Promise((r) => setTimeout(r, 300));

// ouvre les menus
for (const id of ['btn-shop', 'btn-pets', 'btn-upgrades', 'btn-rebirth', 'btn-settings']) {
  const btn = document.querySelector(`#${id}`);
  let err = null;
  try { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); } catch (e) { err = e; }
  ok(!err, `bouton ${id}${err ? ' — ' + err.message : ''}`);
  if (err) console.log(err.stack);
}
document.querySelector('[data-close]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

// éclosion réelle via le jeu
const game = window.__petblocs_game;
ok(!!game, 'instance de jeu accessible');
state.coins = 100000;
const pets = game.hatchEgg('oeuf_prairie', 3);
await new Promise((r) => setTimeout(r, 1400));
ok(document.querySelectorAll('.hatch-pet').length === 3, `éclosion : ${document.querySelectorAll('.hatch-pet').length} pets`);
ok(state.pets.length === 4, `inventaire : ${state.pets.length} pets`);

// attaque réelle : on vise un objet à l'écran et on vérifie que ça rapporte
document.querySelector('#hatch-overlay').classList.add('hidden');
const world = game.world;
const target = world.breakables[4];
world.update(0.016);
const p3 = target.basePos.clone();
p3.y = 0.9;
p3.project(world.camera);
const sx = (p3.x * 0.5 + 0.5) * 1280;
const sy = (-p3.y * 0.5 + 0.5) * 800;
for (let i = 0; i < 3; i++) {
  window.dispatchEvent(new window.Event('pointerdown'));
  clickAt(sx, sy);
  await new Promise((r) => setTimeout(r, 220));
}
await new Promise((r) => setTimeout(r, 1600));
ok(!!world.target, 'une cible a été sélectionnée en cliquant');
ok(state.coins > 0, `pièces gagnées en cassant : ${Math.round(state.coins)}`);
ok(state.stats.totalBroken + (target.hp < target.maxHp ? 1 : 0) > 0, 'les objets encaissent bien les dégâts');

ok(errors.length === 0, `aucune exception non capturée${errors.length ? ' : ' + errors.map((e) => e.message).join(' | ') : ''}`);
if (errors.length) console.log(errors[0].stack);

console.log(fails === 0 ? '\n🎉 Boot OK' : `\n💥 ${fails} erreur(s) au démarrage`);
process.exit(fails ? 1 : 0);
