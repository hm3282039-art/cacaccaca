import fs from 'fs';
// stubs navigateur minimalistes
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { addEventListener: () => {} };
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');

const data = await import('../src/ps99/data.js');
const S = await import('../src/ps99/state.js');

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('❌', msg); fails++; } else console.log('✅', msg); };

// 1. toutes les tables d'œufs pointent vers des pets existants
for (const egg of Object.values(data.EGGS)) {
  const bad = Object.keys(egg.loot).filter((id) => !data.PETS[id]);
  ok(bad.length === 0, `œuf ${egg.id} : pets valides ${bad.join(',')}`);
  const total = data.eggOdds(egg).reduce((a, o) => a + o.pct, 0);
  ok(Math.abs(total - 100) < 0.0001, `œuf ${egg.id} : probas = ${total.toFixed(3)}%`);
}

// 2. chaque pet est accessible dans au moins un œuf
const inEggs = new Set(Object.values(data.EGGS).flatMap((e) => Object.keys(e.loot)));
const missing = Object.keys(data.PETS).filter((id) => !inEggs.has(id));
ok(missing.length === 0, `pets présents dans un œuf : manquants ${missing.join(',')}`);

// 3. tirage : distribution et jamais undefined
const egg = data.EGGS.oeuf_prairie;
const counts = {};
for (let i = 0; i < 20000; i++) {
  const p = data.rollPet(egg);
  if (!p) { console.log('❌ tirage undefined'); fails++; break; }
  counts[p.id] = (counts[p.id] || 0) + 1;
}
ok(Object.keys(counts).every((id) => data.PETS[id]), 'tirage renvoie des pets connus');
ok(Math.abs((counts.chiot / 20000) * 100 - 30.8) < 3, `fréquence chiot ${((counts.chiot / 20000) * 100).toFixed(1)}%`);

// 4. création de partie + pets + slots
const st = S.createState();
ok(st.pets.length === 0, 'état initial vide');
const p1 = S.addPet(st, 'chiot');
ok(p1.equipped === true, 'le 1er pet est équipé');
S.addPet(st, 'chaton'); S.addPet(st, 'lapinou'); S.addPet(st, 'souris');
ok(S.equippedPets(st).length === 3, `3 emplacements au départ (${S.equippedPets(st).length})`);
ok(S.equipPet(st, st.pets[3].uid) === false, 'impossible d’équiper un 4e pet');
st.upgrades.slots = 1;
ok(S.equipPet(st, st.pets[3].uid) === true, 'emplacement supplémentaire fonctionne');

// 5. doublons
st.pets.forEach((p) => { p.equipped = false; });
for (let i = 0; i < 5; i++) S.addPet(st, 'chiot');
const before = st.pets.length;
const beforeCoins = st.coins;
const gained = S.sellDuplicates(st);
ok(gained > 0 && st.pets.length < before, `doublons vendus: ${gained} pièces, ${before} -> ${st.pets.length}`);
ok(st.coins === beforeCoins + gained, 'les pièces du doublon sont créditées');
ok(st.pets.some((p) => p.id === 'chiot'), 'un exemplaire de chaque doublon est conservé');

// 6. sauvegarde / chargement
st.coins = 12345; st.gems = 42; st.zone = 2;
S.saveState(st);
const loaded = S.loadState();
ok(loaded && loaded.coins === 12345 && loaded.pets.length === st.pets.length, 'sauvegarde relue correctement');
ok(loaded.upgrades.slots === 1, 'améliorations conservées');

// 7. progression / renaissance
const st2 = S.createState();
ok(Math.abs(S.coinMultiplier(st2) - 1) < 1e-9, 'multiplicateur de départ = 1');
st2.rebirths = 2;
ok(Math.abs(S.coinMultiplier(st2) - 2.3) < 1e-9, `multiplicateur renaissance = ${S.coinMultiplier(st2)}`);
ok(S.canRebirth(st2) === false, 'renaissance bloquée sans pièces');
st2.coins = data.REBIRTH.requirement(2);
ok(S.canRebirth(st2) === true, 'renaissance possible au seuil');

// 8. upgrade coûts croissants + max
const st3 = S.createState();
let last = 0, okCost = true;
for (let i = 0; i < 12; i++) { const c = S.upgradeCost(st3, 'click'); if (c <= last) okCost = false; last = c; st3.upgrades.click = i + 1; }
ok(okCost, 'coûts d’amélioration croissants');
st3.upgrades.click = 200;
ok(S.upgradeMaxed(st3, 'click') === true, 'niveau max respecté');

// 9. formatage
ok(data.fmt(950) === '950', 'fmt(950)');
ok(data.fmt(1500) === '1.5K', `fmt(1500) = ${data.fmt(1500)}`);
ok(data.fmt(2_500_000) === '2.5M', `fmt(2.5M) = ${data.fmt(2_500_000)}`);

// 10. puissance pets
ok(data.petPower(data.PETS.chiot) === 1, 'chiot = 1 puissance');
ok(data.petPower(data.PETS.blob99) > data.petPower(data.PETS.chiendore), 'y a de la puissance chez les secrets');

console.log(fails === 0 ? '\n🎉 Tous les tests passent' : `\n💥 ${fails} test(s) en échec`);
process.exit(fails === 0 ? 0 : 1);
