import fs from 'fs';
import { JSDOM } from 'jsdom';

const root = new URL('..', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
globalThis.localStorage = window.localStorage;
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
globalThis.confirm = () => false;
globalThis.alert = () => {};
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');

const data = await import('../src/ps99/data.js');
const S = await import('../src/ps99/state.js');
const { UI } = await import('../src/ps99/ui.js');

let fails = 0;
const ok = (c, m) => { if (!c) { console.log('❌', m); fails++; } else console.log('✅', m); };

const state = S.createState();
['chiot', 'renard', 'dragonfeu', 'blob99'].forEach((id) => S.addPet(state, id));
state.coins = 5_000_000;
state.gems = 500;
state.diamonds = 20;
state.zone = 2;
state.unlockedZones = [1, 2];

const calls = [];
const game = {
  state,
  coinMultiplier: () => S.coinMultiplier(state),
  hatchEgg: (id, n) => calls.push(['hatch', id, n]),
  goToZone: (z) => calls.push(['go', z]),
  unlockZone: (z) => calls.push(['unlock', z]),
  togglePet: (u) => calls.push(['toggle', u]),
  sellPet: (u) => calls.push(['sell', u]),
  equipBest: () => calls.push(['equipBest']),
  sellDuplicates: () => calls.push(['sellDupes']),
  buyUpgrade: (id) => calls.push(['up', id]),
  buyBoost: (id) => calls.push(['boost', id]),
  doRebirth: () => calls.push(['rebirth']),
  save: () => calls.push(['save']),
  exportSave: () => calls.push(['export']),
  resetGame: () => calls.push(['reset']),
  applySettings: () => calls.push(['applySettings']),
  setPalette: (i) => calls.push(['palette', i]),
  playSound: () => {},
  world: {},
};

const ui = new UI(game);
ui.updateHud(state);
ui.renderDock(state);
ok(document.querySelector('#stat-coins').textContent === '5M', `HUD pièces = ${document.querySelector('#stat-coins').textContent}`);
ok(document.querySelectorAll('.dock-pet').length === 3, 'dock : 3 pets équipés');
ok(document.querySelector('#hint-dps-value').textContent.length > 0, 'DPS affiché');

for (const panel of ['shop', 'pets', 'upgrades', 'rebirth', 'settings']) {
  let err = null;
  try { ui.openPanel(panel); } catch (e) { err = e; }
  ok(!err && !document.querySelector(`#panel-${panel}`).classList.contains('hidden'), `panneau ${panel} ouvert${err ? ' : ' + err.message : ''}`);
  if (err) console.log(err.stack);
}
ui.renderShop();
ok(document.querySelectorAll('.egg-card').length === 6, `boutique : ${document.querySelectorAll('.egg-card').length} œufs`);
ok(document.querySelectorAll('[data-egg]').length === 12, 'boutons d’éclosion présents');
document.querySelector('[data-egg]:not([disabled])').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok(calls.some((c) => c[0] === 'hatch'), 'clic sur Éclore appelle hatchEgg');

ui.openPanel('pets');
ok(document.querySelectorAll('.pet-card').length === 4, `inventaire : ${document.querySelectorAll('.pet-card').length} pets`);
document.querySelector('[data-toggle]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok(calls.some((c) => c[0] === 'toggle'), 'bouton équiper/retirer fonctionne');

ui.openPanel('upgrades');
ok(document.querySelectorAll('#upgrades-body .upgrade-row').length === 9, `améliorations : ${document.querySelectorAll('#upgrades-body .upgrade-row').length} lignes`);
document.querySelector('[data-kind="upgrade"]:not([disabled])').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok(calls.some((c) => c[0] === 'up'), 'achat d’amélioration déclenché');

ui.openPanel('rebirth');
ok(document.querySelector('#do-rebirth') !== null, 'bouton renaissance présent');

ui.openPanel('settings');
ok(document.querySelector('[data-setting="sound"]') !== null, 'switch son présent');
document.querySelector('[data-setting="sound"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
ok(state.settings.sound === false, 'switch son bascule l’état');
ok(calls.some((c) => c[0] === 'applySettings'), 'réglages appliqués');

// toasts / dégâts
ui.toast('hello', 'good');
ok(document.querySelectorAll('.toast').length === 1, 'toast affiché');
ui.damage({ x: 10, y: 10 }, '12', 'crit');
ok(document.querySelectorAll('.dmg').length === 1, 'dégât flottant affiché');

// cible
ui.setTarget({ def: { name: 'Coffre', coins: 320 }, hp: 50, maxHp: 100, scale: 1.2 }, state);
ok(document.querySelector('#target-hud').classList.contains('hidden') === false, 'HUD cible visible');
ok(document.querySelector('#target-fill').style.width === '50%', `barre de PV à ${document.querySelector('#target-fill').style.width}`);
ui.setTarget(null, state);
ok(document.querySelector('#target-hud').classList.contains('hidden'), 'HUD cible masqué');

// éclosion
const pets = [{ id: 'dragonfeu' }, { id: 'blob99' }];
const egg = data.EGGS.oeuf_prairie;
ui.showHatch(egg, pets, true);
ok(!document.querySelector('#hatch-overlay').classList.contains('hidden'), 'overlay d’éclosion visible');
await new Promise((r) => setTimeout(r, 400));
ok(document.querySelectorAll('.hatch-pet').length === 2, `résultats d’éclosion : ${document.querySelectorAll('.hatch-pet').length}`);
ok(document.querySelector('#hatch-close').classList.contains('hidden') === false, 'bouton fermer visible');
ui.hideHatch();
ok(document.querySelector('#hatch-overlay').classList.contains('hidden'), 'overlay fermé');

console.log(fails === 0 ? '\n🎉 UI OK' : `\n💥 ${fails} erreur(s) UI`);
process.exit(fails ? 1 : 0);
