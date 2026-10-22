/* ============================================================
   Données du jeu — pets, raretés, œufs, zones, boutique
   ============================================================ */

export const RARITY = {
  commun: { key: 'commun', name: 'Commun', color: '#a8b3c2', power: 1, order: 0 },
  peucommun: { key: 'peucommun', name: 'Peu commun', color: '#4ade80', power: 3, order: 1 },
  rare: { key: 'rare', name: 'Rare', color: '#38bdf8', power: 8, order: 2 },
  epique: { key: 'epique', name: 'Épique', color: '#a78bfa', power: 20, order: 3 },
  legendaire: { key: 'legendaire', name: 'Légendaire', color: '#fb923c', power: 55, order: 4 },
  mythique: { key: 'mythique', name: 'Mythique', color: '#f43f5e', power: 150, order: 5 },
  secret: { key: 'secret', name: 'Secret', color: '#fde047', power: 420, order: 6 },
};

export const RARITY_ORDER = ['commun', 'peucommun', 'rare', 'epique', 'legendaire', 'mythique', 'secret'];

/**
 * MUTATIONS — le sel de la collection : un même pet peut sortir Doré,
 * Arc-en-ciel ou Prismatique, et devient beaucoup plus puissant.
 * Les chances sont par œuf (plus l'œuf est cher, plus c'est généreux).
 */
export const MUTATIONS = {
  normal: {
    key: 'normal', name: 'Normal', mult: 1, color: '#a8b3c2', glow: null,
  },
  dore: {
    key: 'dore', name: 'Doré', mult: 2.5, color: '#ffd24a', glow: '#ffb300',
    odds: { 1: 0.09, 2: 0.10, 3: 0.11, 4: 0.12, 5: 0.13, 6: 0.14 },
  },
  arcenciel: {
    key: 'arcenciel', name: 'Arc-en-ciel', mult: 8, color: '#ff7ab8', glow: '#a855f7',
    odds: { 1: 0.018, 2: 0.022, 3: 0.026, 4: 0.03, 5: 0.034, 6: 0.04 },
  },
  prismatique: {
    key: 'prismatique', name: 'Prismatique', mult: 25, color: '#7cf2ff', glow: '#ffffff',
    odds: { 1: 0.002, 2: 0.0025, 3: 0.003, 4: 0.004, 5: 0.005, 6: 0.006 },
  },
};

export const MUTATION_ORDER = ['normal', 'dore', 'arcenciel', 'prismatique'];

/** Tire une mutation pour un œuf donné (zone = palier de chance). */
export function rollMutation(eggZone, rng = Math.random) {
  const r = rng();
  let acc = 0;
  // du plus rare au plus commun
  for (const key of ['prismatique', 'arcenciel', 'dore']) {
    const m = MUTATIONS[key];
    acc += m.odds[eggZone] ?? 0.01;
    if (r < acc) return m;
  }
  return MUTATIONS.normal;
}

export function mutationChances(eggZone) {
  const out = {};
  let rest = 1;
  for (const key of ['prismatique', 'arcenciel', 'dore']) {
    const c = MUTATIONS[key].odds[eggZone] ?? 0.01;
    out[key] = c;
    rest -= c;
  }
  out.normal = Math.max(0, rest);
  return out;
}

/**
 * PETS — chaque pet est décrit par :
 *  family    : archétype de modèle 3D
 *  colors    : palette du modèle
 *  emoji     : représentation UI
 *  rarity    : palier
 *  mult      : variation de puissance dans le palier
 */
export const PETS = {
  chiot: {
    id: 'chiot', name: 'Chiot', rarity: 'commun', emoji: '🐶', mult: 1,
    family: 'dog', colors: { main: '#d8a06a', belly: '#f4e2c8', accent: '#a9713c' },
  },
  chaton: {
    id: 'chaton', name: 'Chaton', rarity: 'commun', emoji: '🐱', mult: 1,
    family: 'cat', colors: { main: '#9aa7b8', belly: '#eef3f8', accent: '#6f7d90' },
  },
  lapinou: {
    id: 'lapinou', name: 'Lapinou', rarity: 'commun', emoji: '🐰', mult: 1.05,
    family: 'bunny', colors: { main: '#f6f1e6', belly: '#ffffff', accent: '#f0a8bd' },
  },
  souris: {
    id: 'souris', name: 'Souris', rarity: 'commun', emoji: '🐭', mult: 0.95,
    family: 'mouse', colors: { main: '#c9d2dd', belly: '#f5f8fb', accent: '#f0a8bd' },
  },
  grenouille: {
    id: 'grenouille', name: 'Grenouille', rarity: 'commun', emoji: '🐸', mult: 1.1,
    family: 'slime', colors: { main: '#7ed957', belly: '#c8f2a8', accent: '#3f8f2c' },
  },
  renard: {
    id: 'renard', name: 'Renard', rarity: 'peucommun', emoji: '🦊', mult: 1,
    family: 'fox', colors: { main: '#f59e5b', belly: '#fff1e0', accent: '#2b2b2b' },
  },
  panda: {
    id: 'panda', name: 'Panda', rarity: 'peucommun', emoji: '🐼', mult: 1.05,
    family: 'bear', colors: { main: '#f2f5f8', belly: '#ffffff', accent: '#26262b' },
  },
  abeille: {
    id: 'abeille', name: 'Abeille', rarity: 'peucommun', emoji: '🐝', mult: 1.1,
    family: 'bee', colors: { main: '#fbbf24', belly: '#fff6cf', accent: '#2b2b2b' },
  },
  pingouin: {
    id: 'pingouin', name: 'Pingouin', rarity: 'peucommun', emoji: '🐧', mult: 1.15,
    family: 'penguin', colors: { main: '#1f2a3d', belly: '#f7fbff', accent: '#f59e0b' },
  },
  herisson: {
    id: 'herisson', name: 'Hérisson', rarity: 'peucommun', emoji: '🦔', mult: 1.2,
    family: 'hedgehog', colors: { main: '#a9754d', belly: '#f2dfc6', accent: '#5b3a24' },
  },
  ourson: {
    id: 'ourson', name: 'Ourson', rarity: 'rare', emoji: '🐻', mult: 1,
    family: 'bear', colors: { main: '#b5793f', belly: '#e8c79b', accent: '#7a4d24' },
  },
  crabe: {
    id: 'crabe', name: 'Crabe', rarity: 'rare', emoji: '🦀', mult: 1.05,
    family: 'crab', colors: { main: '#ef4444', belly: '#ffb4a8', accent: '#a31818' },
  },
  requin: {
    id: 'requin', name: 'Requin', rarity: 'rare', emoji: '🦈', mult: 1.1,
    family: 'shark', colors: { main: '#64748b', belly: '#e6eef6', accent: '#3f4c5c' },
  },
  dragonnet: {
    id: 'dragonnet', name: 'Dragonnet', rarity: 'rare', emoji: '🐲', mult: 1.15,
    family: 'dragon', colors: { main: '#34d399', belly: '#d3f9e8', accent: '#0f7a5a' },
  },
  robo: {
    id: 'robo', name: 'Robo', rarity: 'rare', emoji: '🤖', mult: 1.2,
    family: 'robot', colors: { main: '#a9b6c7', belly: '#e6edf6', accent: '#3ddcff' },
  },
  loupglace: {
    id: 'loupglace', name: 'Loup de glace', rarity: 'epique', emoji: '🐺', mult: 1,
    family: 'wolf', colors: { main: '#9fe8ff', belly: '#f0fdff', accent: '#3aa7c9' },
  },
  golem: {
    id: 'golem', name: 'Golem', rarity: 'epique', emoji: '🗿', mult: 1.05,
    family: 'golem', colors: { main: '#8d7860', belly: '#b9a68c', accent: '#5e4c38' },
  },
  phenix: {
    id: 'phenix', name: 'Phénix', rarity: 'epique', emoji: '🔥', mult: 1.1,
    family: 'phoenix', colors: { main: '#f97316', belly: '#ffe0a3', accent: '#dc2626' },
  },
  calmar: {
    id: 'calmar', name: 'Calmar cosmique', rarity: 'epique', emoji: '🦑', mult: 1.15,
    family: 'squid', colors: { main: '#a855f7', belly: '#e9d5ff', accent: '#6d28d9' },
  },
  dragonfeu: {
    id: 'dragonfeu', name: 'Dragon de feu', rarity: 'legendaire', emoji: '🐉', mult: 1,
    family: 'dragon', colors: { main: '#ef4444', belly: '#ffd9a8', accent: '#7f1d1d' },
  },
  yeti: {
    id: 'yeti', name: 'Yéti', rarity: 'legendaire', emoji: '🦍', mult: 1.05,
    family: 'yeti', colors: { main: '#e7f1fb', belly: '#ffffff', accent: '#9fc0dd' },
  },
  griffon: {
    id: 'griffon', name: 'Griffon', rarity: 'legendaire', emoji: '🦅', mult: 1.1,
    family: 'griffon', colors: { main: '#d4af37', belly: '#fff3c4', accent: '#8a6a10' },
  },
  dragonespace: {
    id: 'dragonespace', name: 'Dragon de l\'espace', rarity: 'mythique', emoji: '🌌', mult: 1,
    family: 'dragon', colors: { main: '#6366f1', belly: '#c7d2fe', accent: '#fde047' },
  },
  chatcosmique: {
    id: 'chatcosmique', name: 'Chat cosmique', rarity: 'mythique', emoji: '🌠', mult: 1.05,
    family: 'cat', colors: { main: '#8b5cf6', belly: '#ede9fe', accent: '#fde047' },
  },
  slimearcenciel: {
    id: 'slimearcenciel', name: 'Slime arc-en-ciel', rarity: 'secret', emoji: '🌈', mult: 1,
    family: 'slime', colors: { main: '#ff7ab8', belly: '#b8f0ff', accent: '#ffe066' }, rainbow: true,
  },
  chiendore: {
    id: 'chiendore', name: 'Chien doré', rarity: 'secret', emoji: '🏆', mult: 1.05,
    family: 'dog', colors: { main: '#ffd24a', belly: '#fff4c2', accent: '#c98f00' }, shiny: true,
  },
  blob99: {
    id: 'blob99', name: 'Blob 99', rarity: 'secret', emoji: '👾', mult: 1.1,
    family: 'slime', colors: { main: '#22d3ee', belly: '#a5f3fc', accent: '#0e7490' }, shiny: true,
  },

  /* ---- deuxième vague : bestiaire élargi ---- */
  cochon: {
    id: 'cochon', name: 'Cochon', rarity: 'commun', emoji: '🐷', mult: 1.02,
    family: 'pig', colors: { main: '#ffb3c7', belly: '#ffe0e8', accent: '#e08aa0' },
  },
  poussin: {
    id: 'poussin', name: 'Poussin', rarity: 'commun', emoji: '🐤', mult: 0.98,
    family: 'chick', colors: { main: '#ffe066', belly: '#fff6cc', accent: '#ff9f1c' },
  },
  raton: {
    id: 'raton', name: 'Raton laveur', rarity: 'peucommun', emoji: '🦝', mult: 1.08,
    family: 'raccoon', colors: { main: '#9aa3ad', belly: '#e8edf3', accent: '#2b2b33' },
  },
  tortue: {
    id: 'tortue', name: 'Tortue', rarity: 'peucommun', emoji: '🐢', mult: 1.12,
    family: 'turtle', colors: { main: '#6ab04c', belly: '#f2e8c9', accent: '#3d7a2a' },
  },
  chouette: {
    id: 'chouette', name: 'Chouette', rarity: 'peucommun', emoji: '🦉', mult: 1.16,
    family: 'owl', colors: { main: '#b98a5a', belly: '#f4e3c6', accent: '#6b4527' },
  },
  singe: {
    id: 'singe', name: 'Singe', rarity: 'rare', emoji: '🐒', mult: 1.06,
    family: 'monkey', colors: { main: '#a97442', belly: '#f0cfae', accent: '#6d4622' },
  },
  tigre: {
    id: 'tigre', name: 'Tigre', rarity: 'rare', emoji: '🐯', mult: 1.12,
    family: 'tiger', colors: { main: '#f59e0b', belly: '#fff1cf', accent: '#2b1a08' },
  },
  cerf: {
    id: 'cerf', name: 'Cerf', rarity: 'rare', emoji: '🦌', mult: 1.18,
    family: 'deer', colors: { main: '#b98558', belly: '#f4e1c8', accent: '#6b4a2a' },
  },
  axolotl: {
    id: 'axolotl', name: 'Axolotl', rarity: 'rare', emoji: '🦎', mult: 1.22,
    family: 'axolotl', colors: { main: '#ff9ec7', belly: '#ffd9e8', accent: '#e0609a' },
  },
  licorne: {
    id: 'licorne', name: 'Licorne', rarity: 'epique', emoji: '🦄', mult: 1.08,
    family: 'unicorn', colors: { main: '#f7f2ff', belly: '#ffffff', accent: '#ff9ec7' }, rainbow: true,
  },
  elephant: {
    id: 'elephant', name: 'Éléphant', rarity: 'epique', emoji: '🐘', mult: 1.12,
    family: 'elephant', colors: { main: '#9aa8c4', belly: '#d3dcf0', accent: '#6a7898' },
  },
  fantome: {
    id: 'fantome', name: 'Fantôme', rarity: 'epique', emoji: '👻', mult: 1.18,
    family: 'ghost', colors: { main: '#e8f4ff', belly: '#ffffff', accent: '#a9c7e8' },
  },
  hydre: {
    id: 'hydre', name: 'Hydre', rarity: 'legendaire', emoji: '🐍', mult: 1.08,
    family: 'hydra', colors: { main: '#4ade80', belly: '#d9ffd9', accent: '#1a7a44' },
  },
  mecatron: {
    id: 'mecatron', name: 'Mécatron', rarity: 'legendaire', emoji: '🦾', mult: 1.14,
    family: 'mecha', colors: { main: '#8ea2bd', belly: '#dfe9f7', accent: '#3ddcff' },
  },
  cerbere: {
    id: 'cerbere', name: 'Cerbère', rarity: 'mythique', emoji: '🐕‍🦺', mult: 1.08,
    family: 'hydra', colors: { main: '#a855f7', belly: '#e9d5ff', accent: '#4c1d95' },
  },
  titan: {
    id: 'titan', name: 'Titan', rarity: 'mythique', emoji: '🗿', mult: 1.16,
    family: 'mecha', colors: { main: '#4b5563', belly: '#9ca3af', accent: '#f59e0b' },
  },
  prisme: {
    id: 'prisme', name: 'Prisme', rarity: 'secret', emoji: '🔮', mult: 1.04,
    family: 'ghost', colors: { main: '#c4b5fd', belly: '#f5f3ff', accent: '#7c3aed' }, shiny: true,
  },
  dragondieu: {
    id: 'dragondieu', name: 'Dragon divin', rarity: 'secret', emoji: '🐲', mult: 1.2,
    family: 'dragon', colors: { main: '#ffd24a', belly: '#fff3c4', accent: '#e0a800' }, shiny: true,
  },
};

export function petPower(pet, mutation = 'normal') {
  const m = MUTATIONS[mutation] || MUTATIONS.normal;
  return Math.round(RARITY[pet.rarity].power * pet.mult * m.mult);
}

/* ------------------------------------------------------------
   ZONES — une allée de 3x3 objets à casser + machine à œufs
   ------------------------------------------------------------ */
export const ZONES = [
  {
    id: 1, name: 'Prairie', egg: 'oeuf_prairie', price: 0,
    ground: '#7ccf5f', groundAlt: '#69bb4e', path: '#d9c89a', fog: '#bfe9ff',
    props: { trees: 7, rocks: 4, flowers: 22 },
    hpMult: 1, coinMult: 1, portal: '#7ccf5f', icon: '🌿',
  },
  {
    id: 2, name: 'Forêt', egg: 'oeuf_foret', price: 4000,
    ground: '#4f9f52', groundAlt: '#418a45', path: '#b8a06f', fog: '#a9d6c0',
    props: { trees: 13, rocks: 5, flowers: 12 },
    hpMult: 8, coinMult: 12, portal: '#3f8f52', icon: '🌲',
  },
  {
    id: 3, name: 'Plage', egg: 'oeuf_plage', price: 60000,
    ground: '#e8d9a8', groundAlt: '#dccb95', path: '#c2a878', fog: '#cdeeff',
    props: { trees: 5, rocks: 8, palms: 7, flowers: 0 },
    hpMult: 70, coinMult: 140, portal: '#38bdf8', icon: '🏖️',
  },
  {
    id: 4, name: 'Volcan', egg: 'oeuf_volcan', price: 900000,
    ground: '#4a3b3b', groundAlt: '#3b2e2e', path: '#6b4a3a', fog: '#ffb38a',
    props: { rocks: 14, lava: 9, trees: 0, flowers: 0 },
    hpMult: 600, coinMult: 2000, portal: '#f97316', icon: '🌋',
  },
  {
    id: 5, name: 'Galaxie', egg: 'oeuf_galaxie', price: 15000000,
    ground: '#221a4a', groundAlt: '#1a1438', path: '#4a3a8a', fog: '#b39dff',
    props: { crystals: 14, rocks: 5, stars: 40, trees: 0, flowers: 0 },
    hpMult: 5000, coinMult: 26000, portal: '#a78bfa', icon: '🌌',
  },
  {
    id: 6, name: 'Néon', egg: 'oeuf_neon', price: 300000000,
    ground: '#141c33', groundAlt: '#0f1628', path: '#25406b', fog: '#7de7ff',
    props: { neons: 18, crystals: 6, stars: 26, trees: 0, flowers: 0 },
    hpMult: 45000, coinMult: 350000, portal: '#3ddcff', icon: '💠',
  },
];

export const ZONE_GAP = 48;

/* ------------------------------------------------------------
   OBJETS À CASSER
   ------------------------------------------------------------ */
export const BREAKABLES = {
  pile: { id: 'pile', name: 'Tas de pièces', hp: 9, coins: 18, gems: 0, size: 0.9 },
  stack: { id: 'stack', name: 'Pile de pièces', hp: 30, coins: 70, gems: 0.04, size: 1.1 },
  chest: { id: 'chest', name: 'Coffre', hp: 120, coins: 320, gems: 0.3, size: 1.2 },
  giant: { id: 'giant', name: 'Coffre géant', hp: 700, coins: 2200, gems: 1, size: 1.5 },
  diamond: { id: 'diamond', name: 'Coffre diamant', hp: 5000, coins: 14000, gems: 4, size: 1.8 },
};

/** Répartition des objets à casser dans une zone (grille 3x3). */
export function zoneLayout(zoneId) {
  if (zoneId <= 1) return ['pile', 'pile', 'stack', 'pile', 'stack', 'chest', 'stack', 'chest', 'giant'];
  if (zoneId === 2) return ['pile', 'stack', 'stack', 'chest', 'chest', 'giant', 'stack', 'chest', 'giant'];
  if (zoneId === 3) return ['stack', 'chest', 'chest', 'giant', 'giant', 'diamond', 'chest', 'giant', 'diamond'];
  return ['chest', 'giant', 'giant', 'diamond', 'diamond', 'diamond', 'giant', 'diamond', 'diamond'];
}

/* ------------------------------------------------------------
   ŒUFS & TABLES DE BUTIN
   poids = chance relative ; on affiche les % calculés.
   ------------------------------------------------------------ */
export const EGGS = {
  oeuf_prairie: {
    id: 'oeuf_prairie', name: 'Œuf Prairie', zone: 1, price: 150, color: '#8ef0a0', button: 'Éclore',
    loot: {
      chiot: 26, chaton: 22, lapinou: 17, souris: 13, grenouille: 9,
      cochon: 10, poussin: 9, renard: 2, abeille: 1, raton: 0.5,
    },
  },
  oeuf_foret: {
    id: 'oeuf_foret', name: 'Œuf Forêt', zone: 2, price: 4500, color: '#57c785', button: 'Éclore',
    loot: {
      chiot: 10, chaton: 9, lapinou: 8, souris: 7, grenouille: 6,
      renard: 11, panda: 9, abeille: 8, pingouin: 6, herisson: 5,
      raton: 7, tortue: 5, chouette: 4, cochon: 5,
      ourson: 3, dragonnet: 1.5, robo: 1, loupglace: 0.4,
    },
  },
  oeuf_plage: {
    id: 'oeuf_plage', name: 'Œuf Plage', zone: 3, price: 65000, color: '#6ddcff', button: 'Éclore',
    loot: {
      renard: 9, panda: 8, abeille: 7, pingouin: 7, herisson: 6,
      raton: 6, tortue: 6, chouette: 5, singe: 6, tigre: 5, cerf: 4, axolotl: 3,
      ourson: 9, crabe: 8, requin: 7, dragonnet: 6, robo: 5,
      loupglace: 3.4, golem: 2.2, phenix: 1.4, calmar: 1, dragonfeu: 0.4,
    },
  },
  oeuf_volcan: {
    id: 'oeuf_volcan', name: 'Œuf Volcan', zone: 4, price: 900000, color: '#ff8a3d', button: 'Éclore',
    loot: {
      ourson: 8, crabe: 7, requin: 6, dragonnet: 6, robo: 6,
      singe: 5, tigre: 4, cerf: 3, axolotl: 3, licorne: 2.5, elephant: 2, fantome: 1.4,
      loupglace: 8, golem: 7, phenix: 6, calmar: 5,
      dragonfeu: 4.5, yeti: 3, griffon: 2.2, hydre: 1.6, mecatron: 1.2,
      dragonespace: 0.9, chatcosmique: 0.6,
    },
  },
  oeuf_galaxie: {
    id: 'oeuf_galaxie', name: 'Œuf Galaxie', zone: 5, price: 20000000, color: '#a78bfa', button: 'Éclore',
    loot: {
      loupglace: 7, golem: 6, phenix: 6, calmar: 5,
      licorne: 6, elephant: 5, fantome: 4,
      dragonfeu: 9, yeti: 7, griffon: 5, hydre: 4, mecatron: 3,
      dragonespace: 5, chatcosmique: 4, cerbere: 2.4, titan: 2,
      slimearcenciel: 1.6, chiendore: 1.1, blob99: 0.7, prisme: 0.5, dragondieu: 0.35,
    },
  },
  oeuf_neon: {
    id: 'oeuf_neon', name: 'Œuf Néon', zone: 6, price: 400000000, color: '#3ddcff', button: 'Éclore',
    loot: {
      dragonfeu: 10, yeti: 9, griffon: 7, hydre: 6, mecatron: 5,
      dragonespace: 9, chatcosmique: 8, cerbere: 6, titan: 5,
      slimearcenciel: 4, chiendore: 3.5, blob99: 3, prisme: 2.5, dragondieu: 2,
    },
  },
};

export function eggOdds(egg) {
  const total = Object.values(egg.loot).reduce((a, b) => a + b, 0);
  return Object.entries(egg.loot)
    .map(([petId, weight]) => ({ petId, weight, pct: (weight / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);
}

/** Tirage pondéré d'un pet dans un œuf. */
export function rollPet(egg, rng = Math.random) {
  const entries = Object.entries(egg.loot);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [petId, weight] of entries) {
    r -= weight;
    if (r <= 0) return PETS[petId];
  }
  return PETS[entries[entries.length - 1][0]];
}

/* ------------------------------------------------------------
   AMÉLIORATIONS (pièces / gemmes / diamants)
   ------------------------------------------------------------ */
export const UPGRADES = {
  click: {
    id: 'click', name: 'Force de clic', icon: '⚡', currency: 'coins',
    desc: (lvl) => `Chaque clic inflige ${3 + lvl} dégâts.`,
    cost: (lvl) => Math.floor(60 * Math.pow(1.85, lvl)),
    max: 200,
  },
  pets: {
    id: 'pets', name: 'Puissance des pets', icon: '🐾', currency: 'coins',
    desc: (lvl) => `+${Math.round(lvl * 25)}% de dégâts des pets.`,
    cost: (lvl) => Math.floor(180 * Math.pow(2.05, lvl)),
    max: 150,
  },
  speed: {
    id: 'speed', name: 'Vitesse de course', icon: '🏃', currency: 'coins',
    desc: (lvl) => `Déplacement ${(1 + lvl * 0.1).toFixed(1)}x plus rapide.`,
    cost: (lvl) => Math.floor(120 * Math.pow(1.9, lvl)),
    max: 25,
  },
  slots: {
    id: 'slots', name: 'Emplacement de pet', icon: '➕', currency: 'gems',
    desc: () => 'Un pet de plus qui se bat avec toi.',
    cost: (lvl) => Math.floor(35 * Math.pow(2.1, lvl)),
    max: 7, // 3 → 10
  },
  mult: {
    id: 'mult', name: 'Multiplicateur de pièces', icon: '💰', currency: 'gems',
    desc: (lvl) => `+${lvl * 20}% de pièces gagnées.`,
    cost: (lvl) => Math.floor(20 * Math.pow(1.75, lvl)),
    max: 40,
  },
  auto: {
    id: 'auto', name: 'Clic automatique', icon: '🤖', currency: 'gems',
    desc: (lvl) => (lvl === 0 ? 'Ton perso tape tout seul.' : `${(1 + lvl * 0.5).toFixed(1)} coups auto par seconde.`),
    cost: (lvl) => Math.floor(90 * Math.pow(1.9, lvl)),
    max: 12,
  },
};

export const DIAMOND_BOOSTS = {
  gold: {
    id: 'gold', name: "Griffe d'or", icon: '😼', max: 15,
    desc: (lvl) => `+${lvl * 15}% de pièces, pour toujours.`,
    cost: (lvl) => 1 + lvl,
  },
  rage: {
    id: 'rage', name: 'Cœur de titan', icon: '❤️‍🔥', max: 15,
    desc: (lvl) => `+${lvl * 15}% de dégâts, pour toujours.`,
    cost: (lvl) => 1 + lvl,
  },
  bag: {
    id: 'bag', name: 'Sac sans fond', icon: '🎒', max: 5,
    desc: (lvl) => `+${lvl} emplacement de pet.`,
    cost: (lvl) => 3 + lvl * 2,
  },
};

/* ------------------------------------------------------------
   RENAISSANCE
   ------------------------------------------------------------ */
export const REBIRTH = {
  requirement: (n) => 800000 * Math.pow(9, n),
  multiplier: (n) => 1 + n * 0.65,
  diamonds: (n) => 2 + n * 2,
};

/* ------------------------------------------------------------
   Formatage des nombres
   ------------------------------------------------------------ */
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd'];

export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return String(Math.floor(n));
  let tier = 0;
  let v = n;
  while (v >= 1000 && tier < SUFFIXES.length - 1) {
    v /= 1000;
    tier++;
  }
  const decimals = v < 10 ? 2 : v < 100 ? 1 : 0;
  const str = v.toFixed(decimals);
  return (str.includes('.') ? str.replace(/\.?0+$/, '') : str) + SUFFIXES[tier];
}
