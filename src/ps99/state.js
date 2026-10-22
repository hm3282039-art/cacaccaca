/* ============================================================
   État du jeu + sauvegarde locale
   ============================================================ */
import { PETS, RARITY, MUTATIONS, petPower, ZONES, UPGRADES, DIAMOND_BOOSTS, REBIRTH } from './data.js';

const SAVE_KEY = 'petblocs99.save.v1';

export function baseSlots() {
  return 3;
}

export function createState() {
  return {
    version: 1,
    coins: 0,
    gems: 0,
    diamonds: 0,
    rebirths: 0,
    zone: 1,
    mode: 'hub',
    unlockedZones: [1],
    upgrades: { click: 0, pets: 0, speed: 0, slots: 0, mult: 0, auto: 0 },
    boosts: { gold: 0, rage: 0, bag: 0 },
    pets: [], // { uid, id, level }
    uidSeq: 1,
    stats: { totalCoins: 0, totalClicks: 0, totalHatches: 0, totalBroken: 0 },
    settings: { sound: true, particles: true, lowQuality: false, autoHatch: false, palette: 0 },
    lastSave: Date.now(),
    sessionStart: Date.now(),
  };
}

/* ---------------- dérivés ---------------- */

export function petSlots(state) {
  return baseSlots() + state.upgrades.slots + state.boosts.bag;
}

export function equippedPets(state) {
  return state.pets.filter((p) => p.equipped);
}

export function maxEquipped(state) {
  return petSlots(state);
}

export function coinMultiplier(state) {
  return (1 + state.boosts.gold * 0.15) * REBIRTH.multiplier(state.rebirths) * (1 + state.upgrades.mult * 0.2);
}

export function damageMultiplier(state) {
  return (1 + state.boosts.rage * 0.15) * REBIRTH.multiplier(state.rebirths);
}

export function clickDamage(state) {
  return (3 + state.upgrades.click) * damageMultiplier(state);
}

export function petDamage(state) {
  const total = equippedPets(state).reduce((sum, p) => sum + petPowerOf(state, p), 0);
  return total * 5 * (1 + state.upgrades.pets * 0.25) * damageMultiplier(state);
}

export function petPowerOf(state, pet) {
  const base = petPower(PETS[pet.id], pet.mutation || 'normal');
  return Math.round(base * (1 + pet.level * 0.35));
}

export function totalDps(state) {
  const auto = state.upgrades.auto > 0 ? clickDamage(state) * (1 + state.upgrades.auto * 0.5) : 0;
  return petDamage(state) + auto;
}

export function autoClicksPerSecond(state) {
  return state.upgrades.auto > 0 ? 1 + state.upgrades.auto * 0.5 : 0;
}

export function petSellValue(pet) {
  const r = RARITY[PETS[pet.id].rarity];
  const mut = MUTATIONS[pet.mutation || 'normal'] || MUTATIONS.normal;
  return Math.max(5, Math.round(r.power * 12 * mut.mult * 0.9 * (1 + pet.level * 0.3)));
}

export function upgradeCost(state, key) {
  const def = UPGRADES[key];
  return def.cost(state.upgrades[key]);
}

export function upgradeMaxed(state, key) {
  return state.upgrades[key] >= UPGRADES[key].max;
}

export function boostCost(state, key) {
  return DIAMOND_BOOSTS[key].cost(state.boosts[key]);
}

export function boostMaxed(state, key) {
  return state.boosts[key] >= DIAMOND_BOOSTS[key].max;
}

export function nextRebirthRequirement(state) {
  return REBIRTH.requirement(state.rebirths);
}

export function canRebirth(state) {
  return state.coins >= nextRebirthRequirement(state);
}

export function zoneUnlocked(state, zid) {
  return state.unlockedZones.includes(zid);
}

export function zoneById(zid) {
  return ZONES.find((z) => z.id === zid) || ZONES[0];
}

/* ---------------- bestiaire ---------------- */

/** Renvoie { possédés:Set, total, pct } pour l'écran de collection. */
export function collectionProgress(state) {
  const owned = new Set(state.pets.map((p) => p.id));
  const total = Object.keys(PETS).length;
  return { owned, total, count: owned.size, pct: (owned.size / total) * 100 };
}

/** Nombre de pets par rareté possédés (pour les badges de collection). */
export function collectionByRarity(state) {
  const out = {};
  for (const pet of state.pets) {
    const r = PETS[pet.id].rarity;
    out[r] = (out[r] || 0) + 1;
  }
  return out;
}

/* ---------------- pets ---------------- */

export function addPet(state, petId, mutation = 'normal') {
  if (!PETS[petId]) return null;
  if (!MUTATIONS[mutation]) mutation = 'normal';
  const pet = {
    uid: `p${state.uidSeq++}`,
    id: petId,
    level: 0,
    mutation,
    equipped: false,
  };
  // équipe automatiquement s'il reste de la place
  if (equippedPets(state).length < maxEquipped(state)) pet.equipped = true;
  state.pets.push(pet);
  return pet;
}

export function equipPet(state, uid) {
  const pet = state.pets.find((p) => p.uid === uid);
  if (!pet) return false;
  if (pet.equipped) return true;
  if (equippedPets(state).length >= maxEquipped(state)) return false;
  pet.equipped = true;
  return true;
}

export function unequipPet(state, uid) {
  const pet = state.pets.find((p) => p.uid === uid);
  if (pet) pet.equipped = false;
}

export function togglePet(state, uid) {
  const pet = state.pets.find((p) => p.uid === uid);
  if (!pet) return;
  if (pet.equipped) pet.equipped = false;
  else equipPet(state, uid);
}

export function equipBest(state) {
  const sorted = [...state.pets].sort((a, b) => petPowerOf(state, b) - petPowerOf(state, a));
  state.pets.forEach((p) => { p.equipped = false; });
  sorted.slice(0, maxEquipped(state)).forEach((p) => { p.equipped = true; });
}

export function sellPet(state, uid) {
  const idx = state.pets.findIndex((p) => p.uid === uid);
  if (idx === -1) return 0;
  const pet = state.pets[idx];
  const value = petSellValue(pet);
  state.coins += value;
  state.pets.splice(idx, 1);
  return value;
}

/** Vends les doublons (même pet + même niveau), en garde un seul par groupe. */
export function sellDuplicates(state) {
  const sorted = [...state.pets].sort((a, b) => petPowerOf(state, b) - petPowerOf(state, a));
  const kept = new Map(); // key -> pet gardé
  const remove = new Set();
  let gained = 0;

  for (const pet of sorted) {
    const key = `${pet.id}|${pet.level}|${pet.mutation || 'normal'}`;
    const champion = kept.get(key);
    if (!champion) {
      kept.set(key, pet);
      continue;
    }
    // on garde en priorité celui qui est équipé
    if (pet.equipped && !champion.equipped) {
      gained += petSellValue(champion);
      remove.add(champion.uid);
      kept.set(key, pet);
    } else {
      gained += petSellValue(pet);
      remove.add(pet.uid);
    }
  }

  if (gained > 0) {
    state.pets = state.pets.filter((p) => !remove.has(p.uid));
    state.coins += gained;
  }
  return gained;
}

/* ---------------- sauvegarde ---------------- */

export function saveState(state) {
  try {
    state.lastSave = Date.now();
    const data = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch (err) {
    console.warn('[save] échec', err);
    return false;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const fresh = createState();
    const state = {
      ...fresh,
      ...parsed,
      upgrades: { ...fresh.upgrades, ...(parsed.upgrades || {}) },
      boosts: { ...fresh.boosts, ...(parsed.boosts || {}) },
      stats: { ...fresh.stats, ...(parsed.stats || {}) },
      settings: { ...fresh.settings, ...(parsed.settings || {}) },
    };
    state.pets = (state.pets || [])
      .filter((p) => PETS[p.id])
      .map((p) => ({ ...p, mutation: MUTATIONS[p.mutation] ? p.mutation : 'normal' }));
    if (state.mode !== 'zone' && state.mode !== 'hub') state.mode = 'hub';
    state.unlockedZones = Array.from(new Set([1, ...(state.unlockedZones || [])]));
    state.sessionStart = Date.now();
    return state;
  } catch (err) {
    console.warn('[load] sauvegarde corrompue, on repart de zéro', err);
    return null;
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch { /* ignore */ }
}

export function exportSave(state) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  } catch {
    return '';
  }
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', () => {
    // sauvegarde de secours si le jeu expose son état
    if (window.__petblocs_state) saveState(window.__petblocs_state);
  });
}
