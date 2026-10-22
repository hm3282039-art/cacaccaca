/* ============================================================
   Interface — HUD, panneaux, toasts, éclosions
   ============================================================ */
import {
  EGGS, PETS, RARITY, RARITY_ORDER, UPGRADES, DIAMOND_BOOSTS, ZONES, MUTATIONS,
  fmt, petPower, eggOdds, REBIRTH, mutationChances,
} from './data.js';
import {
  equippedPets, maxEquipped, petSlots, upgradeCost, upgradeMaxed, boostCost, boostMaxed,
  petPowerOf, petSellValue, nextRebirthRequirement, canRebirth, zoneById, autoClicksPerSecond,
  totalDps, collectionProgress,
} from './state.js';
import { AVATAR_PALETTES } from './models.js';

const $ = (sel) => document.querySelector(sel);

export class UI {
  constructor(game) {
    this.game = game;
    this.currentPanel = null;
    this.petsFilter = 'all';
    this.shopShowMutations = false;
    this.dmgCount = 0;
    this.init();
  }

  init() {
    // panneaux
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closePanels()));
    $('#panel-backdrop').addEventListener('click', () => this.closePanels());

    $('#btn-hub')?.addEventListener('click', () => this.game.goToHub());
    $('#btn-shop').addEventListener('click', () => this.openPanel('shop'));
    $('#btn-pets').addEventListener('click', () => this.openPanel('pets'));
    $('#btn-upgrades').addEventListener('click', () => this.openPanel('upgrades'));
    $('#btn-rebirth').addEventListener('click', () => this.openPanel('rebirth'));
    $('#btn-settings').addEventListener('click', () => this.openPanel('settings'));

    $('#btn-equip-best').addEventListener('click', () => this.game.equipBest());
    $('#btn-sell-dupes').addEventListener('click', () => this.game.sellDuplicates());

    $('#hatch-close').addEventListener('click', () => this.hideHatch());
    $('#hatch-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'hatch-overlay' && !$('#hatch-close').classList.contains('hidden')) this.hideHatch();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closePanels();
      if (e.key === '1') this.openPanel('shop');
      if (e.key === '2') this.openPanel('pets');
      if (e.key === '3') this.openPanel('upgrades');
      if (e.key === '4') this.openPanel('rebirth');
    });

    this.damageLayer = $('#damage-layer');
    this.toastsEl = $('#toasts');
  }

  /* ---------------- HUD ---------------- */

  updateHud(state) {
    $('#stat-coins').textContent = fmt(state.coins);
    $('#stat-gems').textContent = fmt(state.gems);
    $('#stat-diamonds').textContent = String(state.diamonds);
    $('#hint-dps-value').textContent = fmt(totalDps(state));
    const z = zoneById(state.zone);
    const inHub = state.mode === 'hub';
    const banner = $('#zone-banner');
    banner.classList.toggle('hub', inHub);
    $('.zb-name').textContent = inHub ? '🏛️ Place centrale' : `${z.icon || '🧭'} Zone ${z.id} · ${z.name}`;
    $('.zb-sub').textContent = inHub ? 'Portails · machine à œufs · fontaine' : `Pièces x${fmt(z.coinMult)}`;
    $('#btn-hub').classList.toggle('hidden', inHub);
    $('#hint-text').innerHTML = inHub
      ? 'Clique sur un <b>portail</b> ou la <b>machine à œufs</b>'
      : (state.upgrades.auto > 0
        ? `Tes pets tapent tout seuls (${autoClicksPerSecond(state).toFixed(1)} coups/s)`
        : 'Clique sur les pièces pour les casser');
    // compteur de pets dans le bouton
    const badge = $('#pets-badge');
    if (badge) {
      const n = state.pets.length;
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.classList.toggle('hidden', n === 0);
    }
  }

  renderDock(state) {
    const dock = $('#pet-dock');
    const equipped = equippedPets(state);
    const slots = maxEquipped(state);
    const items = [];
    for (let i = 0; i < slots; i++) {
      const pet = equipped[i];
      if (pet) {
        const def = PETS[pet.id];
        const mut = MUTATIONS[pet.mutation || 'normal'];
        const color = RARITY[def.rarity].color;
        items.push(`<div class="dock-pet ${pet.mutation !== 'normal' ? 'mutated' : ''}"
            data-uid="${pet.uid}"
            title="${def.name} · ${RARITY[def.rarity].name}${pet.mutation !== 'normal' ? ' · ' + mut.name : ''}"
            style="border-color:${pet.mutation !== 'normal' ? mut.color : color};--glow:${mut.color}">
          <span class="pet-emoji">${def.emoji}</span>
          ${pet.level > 0 ? `<span class="dot">+${pet.level}</span>` : ''}
          ${pet.mutation !== 'normal' ? `<span class="mut-dot" style="background:${mut.color}">✦</span>` : ''}
        </div>`);
      } else {
        items.push('<div class="dock-empty">+</div>');
      }
    }
    dock.innerHTML = items.join('');
    dock.querySelectorAll('.dock-pet').forEach((el) => {
      el.addEventListener('click', () => this.openPanel('pets'));
    });
  }

  /* ---------------- Toasts / dégâts ---------------- */

  toast(text, cls = '') {
    const el = document.createElement('div');
    el.className = `toast ${cls}`;
    el.innerHTML = text;
    this.toastsEl.appendChild(el);
    setTimeout(() => el.remove(), 2700);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstChild.remove();
  }

  damage(pos, text, cls = '') {
    if (this.dmgCount > 26) return;
    const el = document.createElement('div');
    el.className = `dmg ${cls}`;
    el.textContent = text;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    this.damageLayer.appendChild(el);
    this.dmgCount++;
    setTimeout(() => {
      el.remove();
      this.dmgCount--;
    }, 880);
  }

  setTarget(b, state) {
    const hud = $('#target-hud');
    if (!b) {
      hud.classList.add('hidden');
      return;
    }
    hud.classList.remove('hidden');
    $('#target-name').textContent = b.def.name;
    $('#target-value').textContent = `+${fmt(b.def.coins * zoneById(state.zone).coinMult * this.game.coinMultiplier())} 🪙`;
    const pct = Math.max(0, Math.min(1, b.hp / b.maxHp));
    $('#target-fill').style.width = `${pct * 100}%`;
    $('#target-hp-text').textContent = `${fmt(Math.max(0, b.hp))} / ${fmt(b.maxHp)}`;
  }

  /* ---------------- Panneaux ---------------- */

  openPanel(name) {
    this.closePanels(true);
    const panel = $(`#panel-${name}`);
    if (!panel) return;
    this.currentPanel = name;
    panel.classList.remove('hidden');
    $('#panel-backdrop').classList.remove('hidden');
    if (name === 'shop') this.renderShop();
    if (name === 'pets') this.renderPets();
    if (name === 'upgrades') this.renderUpgrades();
    if (name === 'rebirth') this.renderRebirth();
    if (name === 'settings') this.renderSettings();
  }

  closePanels(silent = false) {
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
    if (!silent) $('#panel-backdrop').classList.add('hidden');
    this.currentPanel = null;
  }

  refreshOpenPanel() {
    // on ne rafraîchit que les panneaux dont les valeurs bougent en continu ;
    // l'inventaire est reconstruit uniquement sur action du joueur.
    if (this.currentPanel === 'shop') this.renderShop();
    if (this.currentPanel === 'upgrades') this.renderUpgrades();
    if (this.currentPanel === 'rebirth') this.renderRebirth();
  }

  /* ---------------- Boutique ---------------- */

  renderShop() {
    const state = this.game.state;
    const body = $('#shop-body');
    const cards = Object.values(EGGS).map((egg) => {
      const zone = ZONES.find((z) => z.id === egg.zone);
      const odds = eggOdds(egg);
      const canAfford = state.coins >= egg.price;
      const topOdds = odds.slice(0, 3).map((o) => {
        const p = PETS[o.petId];
        return `<span style="color:${RARITY[p.rarity].color}">${p.emoji} ${o.pct.toFixed(1)}%</span>`;
      }).join(' · ');
      const secret = odds.find((o) => PETS[o.petId].rarity === 'secret');
      const secretLine = secret
        ? `<span style="color:${RARITY.secret.color}">✦ ${PETS[secret.petId].name} ${secret.pct.toFixed(2)}%</span>`
        : '';
      const muts = mutationChances(egg.zone);
      const mutLine = this.shopShowMutations
        ? `<div class="egg-mut">${['dore', 'arcenciel', 'prismatique'].map((k) => `
            <span style="color:${MUTATIONS[k].color}">✦ ${MUTATIONS[k].name} ${(muts[k] * 100).toFixed(2)}%</span>`).join('')}</div>`
        : '';
      const locked = !state.unlockedZones.includes(egg.zone);
      return `
        <div class="egg-card ${locked ? 'locked' : ''}" style="--egg:${egg.color}">
          ${locked ? '<span class="egg-lock">🔒 zone ' + egg.zone + '</span>' : ''}
          <div class="egg-art"><span class="egg-pattern"></span></div>
          <h3>${egg.name}</h3>
          <div class="egg-zone">${zone?.icon || ''} ${zone?.name || ''}</div>
          <div class="egg-odds">${topOdds}</div>
          ${secretLine ? `<div class="egg-odds secret">${secretLine}</div>` : ''}
          ${mutLine}
          <div class="price">${fmt(egg.price)} 🪙</div>
          <div class="egg-buttons">
            <button class="primary-btn" data-egg="${egg.id}" data-count="1" ${canAfford ? '' : 'disabled'}>Éclore</button>
            <button class="mini-btn" data-egg="${egg.id}" data-count="5" ${state.coins >= egg.price * 5 ? '' : 'disabled'}>x5</button>
          </div>
        </div>`;
    }).join('');

    const zonesHtml = ZONES.filter((z) => z.id > 1).map((z) => {
      const unlocked = state.unlockedZones.includes(z.id);
      const affordable = state.coins >= z.price;
      return `
        <div class="upgrade-row">
          <div class="u-icon">${unlocked ? '🏝️' : '🔒'}</div>
          <div class="u-info">
            <div class="u-name">Zone ${z.id} · ${z.name}</div>
            <div class="u-desc">Objets plus costauds, pièces x${fmt(z.coinMult)}</div>
            <div class="u-level">${unlocked ? 'Débloquée' : `Prix : ${fmt(z.price)} 🪙`}</div>
          </div>
          ${unlocked
            ? `<button class="buy" data-zone="${z.id}" ${state.zone === z.id ? 'disabled' : ''}>${state.zone === z.id ? 'Active' : 'Aller'}</button>`
            : `<button class="buy" data-unlockzone="${z.id}" ${affordable ? '' : 'disabled'}>Débloquer</button>`}
        </div>`;
    }).join('');

    body.innerHTML = `
      <div class="shop-toolbar">
        <span class="shop-hint">Les œufs les plus chers donnent les meilleurs pets <b>et</b> plus de mutations.</span>
        <button class="mini-btn" id="toggle-mutations">${this.shopShowMutations ? '✦ Cacher les mutations' : '✦ Voir les mutations'}</button>
      </div>
      <div class="shop-grid">${cards}</div>
      <div class="section-title">Zones</div>
      ${zonesHtml}`;

    $('#toggle-mutations')?.addEventListener('click', () => {
      this.shopShowMutations = !this.shopShowMutations;
      this.renderShop();
    });

    body.querySelectorAll('[data-egg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const count = Number(btn.dataset.count);
        this.game.hatchEgg(btn.dataset.egg, count);
      });
    });
    body.querySelectorAll('[data-zone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.game.goToZone(Number(btn.dataset.zone));
        this.closePanels();
      });
    });
    body.querySelectorAll('[data-unlockzone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.game.unlockZone(Number(btn.dataset.unlockzone));
        this.renderShop();
      });
    });
  }

  /* ---------------- Pets ---------------- */

  renderPets() {
    const state = this.game.state;
    const body = $('#pets-body');
    const equipped = equippedPets(state);
    const col = collectionProgress(state);
    $('#pets-counter').textContent = `${equipped.length} / ${maxEquipped(state)} équipés`;

    const tabs = [
      { id: 'all', label: `Tous ${state.pets.length}` },
      { id: 'equipped', label: `Équipés ${equipped.length}` },
      { id: 'mutated', label: `Mutés ${state.pets.filter((p) => (p.mutation || 'normal') !== 'normal').length}` },
      { id: 'best', label: 'Top puissance' },
    ];

    const header = `
      <div class="dex-bar">
        <div class="dex-top">
          <span>📖 Bestiaire</span>
          <b>${col.count} / ${col.total}</b>
        </div>
        <div class="dex-progress"><div style="width:${col.pct.toFixed(1)}%"></div></div>
      </div>
      <div class="tabs">${tabs.map((t) => `
        <button class="tab ${this.petsFilter === t.id ? 'active' : ''}" data-filter="${t.id}">${t.label}</button>
      `).join('')}</div>`;

    if (state.pets.length === 0) {
      body.innerHTML = header + `<div class="empty-note">Tu n'as encore aucun pet 🐾<br>Ouvre la <b>Boutique</b> et éclos ton premier œuf !</div>`;
      this.bindPetTabs(body);
      return;
    }

    let list = [...state.pets];
    if (this.petsFilter === 'equipped') list = list.filter((p) => p.equipped);
    if (this.petsFilter === 'mutated') list = list.filter((p) => (p.mutation || 'normal') !== 'normal');

    if (this.petsFilter === 'best') {
      list.sort((a, b) => petPowerOf(state, b) - petPowerOf(state, a));
    } else {
      list.sort((a, b) => {
        if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
        const d = petPowerOf(state, b) - petPowerOf(state, a);
        return d !== 0 ? d : PETS[a.id].name.localeCompare(PETS[b.id].name);
      });
    }

    const cards = list.map((pet) => {
      const def = PETS[pet.id];
      const rar = RARITY[def.rarity];
      const mut = MUTATIONS[pet.mutation || 'normal'];
      const power = petPowerOf(state, pet);
      const isMut = (pet.mutation || 'normal') !== 'normal';
      return `
        <div class="pet-card ${pet.equipped ? 'equipped' : ''} ${isMut ? 'mutated' : ''}"
             style="--rar:${rar.color};--mut:${mut.color}">
          ${pet.equipped ? '<span class="badge">ÉQUIPÉ</span>' : ''}
          ${isMut ? `<span class="mut-badge" style="--mut:${mut.color}">✦ ${mut.name}</span>` : ''}
          <div class="pet-emoji">${def.emoji}</div>
          <div class="pet-name">${def.name}${pet.level > 0 ? ` <span style="color:#3ddcff">+${pet.level}</span>` : ''}</div>
          <div class="pet-rarity">${rar.name}</div>
          <div class="pet-power">⚔️ ${fmt(power)}${isMut ? ` <span class="mut-x">x${mut.mult}</span>` : ''}</div>
          <div class="pet-actions">
            <button class="mini-btn" data-toggle="${pet.uid}">${pet.equipped ? 'Retirer' : 'Équiper'}</button>
            <button class="mini-btn danger" data-sell="${pet.uid}">+${fmt(petSellValue(pet))}🪙</button>
          </div>
        </div>`;
    }).join('');

    body.innerHTML = header + (cards
      ? `<div class="pets-grid">${cards}</div>`
      : `<div class="empty-note">Rien dans ce filtre.</div>`);

    this.bindPetTabs(body);
    body.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
      this.game.togglePet(b.dataset.toggle);
      this.renderPets();
    }));
    body.querySelectorAll('[data-sell]').forEach((b) => b.addEventListener('click', () => {
      this.game.sellPet(b.dataset.sell);
      this.renderPets();
    }));
  }

  bindPetTabs(body) {
    body.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.petsFilter = btn.dataset.filter;
        this.renderPets();
      });
    });
  }

  /* ---------------- Améliorations ---------------- */

  renderUpgrades() {
    const state = this.game.state;
    const body = $('#upgrades-body');
    const row = (def, kind) => {
      const lvl = kind === 'upgrade' ? state.upgrades[def.id] : state.boosts[def.id];
      const maxed = kind === 'upgrade' ? upgradeMaxed(state, def.id) : boostMaxed(state, def.id);
      const cost = kind === 'upgrade' ? upgradeCost(state, def.id) : boostCost(state, def.id);
      const max = kind === 'upgrade' ? UPGRADES[def.id].max : DIAMOND_BOOSTS[def.id].max;
      const currency = kind === 'upgrade' ? def.currency : 'diamonds';
      const has = currency === 'coins' ? state.coins >= cost : currency === 'gems' ? state.gems >= cost : state.diamonds >= cost;
      const cls = currency === 'coins' ? '' : currency === 'gems' ? 'gem' : 'diamond';
      const icon = currency === 'coins' ? '🪙' : currency === 'gems' ? '💎' : '✨';
      return `
        <div class="upgrade-row">
          <div class="u-icon">${def.icon}</div>
          <div class="u-info">
            <div class="u-name">${def.name}</div>
            <div class="u-desc">${def.desc(lvl)}</div>
            <div class="u-level">Niveau ${lvl} / ${max}</div>
          </div>
          <button class="buy ${cls}" data-kind="${kind}" data-id="${def.id}" ${maxed || !has ? 'disabled' : ''}>
            ${maxed ? 'MAX' : `${fmt(cost)} ${icon}`}
          </button>
        </div>`;
    };

    const coinUps = ['click', 'pets', 'speed'].map((k) => row(UPGRADES[k], 'upgrade')).join('');
    const gemUps = ['slots', 'mult', 'auto'].map((k) => row(UPGRADES[k], 'upgrade')).join('');
    const diamondUps = Object.values(DIAMOND_BOOSTS).map((d) => row(d, 'boost')).join('');

    body.innerHTML = `
      <div class="section-title">Avec des pièces</div>
      ${coinUps}
      <div class="section-title">Avec des gemmes</div>
      ${gemUps}
      <div class="section-title">Bonus permanents (diamants ✨)</div>
      ${diamondUps}
      <div class="empty-note" style="padding:10px 0 0;font-size:11px">
        Les gemmes 💎 se gagnent en cassant des objets. Les diamants ✨ s'obtiennent en faisant une <b>Renaissance</b>.
      </div>`;

    body.querySelectorAll('[data-kind]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.kind === 'upgrade') this.game.buyUpgrade(btn.dataset.id);
        else this.game.buyBoost(btn.dataset.id);
        this.renderUpgrades();
        this.updateHud(state);
      });
    });
  }

  /* ---------------- Renaissance ---------------- */

  renderRebirth() {
    const state = this.game.state;
    const body = $('#rebirth-body');
    const need = nextRebirthRequirement(state);
    const progress = Math.min(1, state.coins / need);
    const nextMult = REBIRTH.multiplier(state.rebirths + 1);
    const gain = REBIRTH.diamonds(state.rebirths);
    const ok = canRebirth(state);
    const bestPet = state.pets.reduce((best, p) => Math.max(best, petPowerOf(state, p)), 0);

    body.innerHTML = `
      <div class="rebirth-hero">
        <div class="big">🔄</div>
        <h3>Renaissance ${state.rebirths + 1}</h3>
        <p>Repars de zéro, mais deviens beaucoup plus fort.</p>
      </div>
      <div class="rebirth-stats">
        <div class="rebirth-stat"><b>x${REBIRTH.multiplier(state.rebirths).toFixed(2)}</b><span>Multiplicateur actuel</span></div>
        <div class="rebirth-stat"><b>x${nextMult.toFixed(2)}</b><span>Après renaissance</span></div>
        <div class="rebirth-stat"><b>+${gain} ✨</b><span>Diamants gagnés</span></div>
      </div>
      <div class="rebirth-progress"><div style="width:${(progress * 100).toFixed(1)}%"></div></div>
      <div class="rebirth-note">
        ${fmt(state.coins)} / ${fmt(need)} 🪙
        <br>Tu gardes : tes pets, tes gemmes, tes diamants et tes bonus permanents.
        <br>Tu perds : pièces, améliorations, zones et ton meilleur pet (${fmt(bestPet)} de puissance) repart en pet de départ.
      </div>
      <div class="rebirth-actions">
        <button class="primary-btn" id="do-rebirth" ${ok ? '' : 'disabled'}>
          ${ok ? 'Renaître maintenant' : `Il manque ${fmt(need - state.coins)} 🪙`}
        </button>
      </div>`;

    $('#do-rebirth')?.addEventListener('click', () => {
      this.game.doRebirth();
      this.renderRebirth();
    });
  }

  /* ---------------- Réglages ---------------- */

  renderSettings() {
    const s = this.game.state.settings;
    const body = $('#settings-body');
    const sw = (on) => `<div class="switch ${on ? 'on' : ''}"></div>`;
    const palettes = AVATAR_PALETTES.map((p, i) => `
      <button class="mini-btn" data-palette="${i}" style="border-color:${p.shirt};color:${p.shirt}">
        ${p.name}
      </button>`).join('');

    body.innerHTML = `
      <div class="setting-row"><div>🔊 Sons<small>Bruitages et éclosions</small></div>
        <div class="switch ${s.sound ? 'on' : ''}" data-setting="sound"></div></div>
      <div class="setting-row"><div>✨ Particules<small>Étincelles quand tu casses un objet</small></div>
        <div class="switch ${s.particles ? 'on' : ''}" data-setting="particles"></div></div>
      <div class="setting-row"><div>⚡ Mode léger<small>Désactive les ombres (utile sur mobile)</small></div>
        <div class="switch ${s.lowQuality ? 'on' : ''}" data-setting="lowQuality"></div></div>
      <div class="setting-row"><div>🥚 Éclosion rapide<small>Passe l'animation des œufs</small></div>
        <div class="switch ${s.autoHatch ? 'on' : ''}" data-setting="autoHatch"></div></div>

      <div class="section-title">Couleur de ton personnage</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${palettes}</div>

      <div class="section-title">Sauvegarde</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="mini-btn" id="btn-save-now">💾 Sauvegarder</button>
        <button class="mini-btn" id="btn-export">📤 Exporter</button>
        <button class="mini-btn danger" id="btn-reset">🗑️ Tout effacer</button>
      </div>
      <div class="credits">
        <b>Pet Blocs 99</b> — un jeu de casse de pièces et de pets.<br>
        Projet original : personnages, pets, œufs et décors sont générés par le code.<br>
        Aucun asset, nom ou code d'un jeu existant n'est utilisé.
      </div>`;

    body.querySelectorAll('[data-setting]').forEach((el) => {
      el.addEventListener('click', () => {
        const key = el.dataset.setting;
        s[key] = !s[key];
        el.classList.toggle('on', s[key]);
        this.game.applySettings();
      });
    });
    body.querySelectorAll('[data-palette]').forEach((el) => {
      el.addEventListener('click', () => this.game.setPalette(Number(el.dataset.palette)));
    });
    $('#btn-save-now')?.addEventListener('click', () => {
      this.game.save();
      this.toast('💾 Sauvegarde enregistrée', 'good');
    });
    $('#btn-export')?.addEventListener('click', () => {
      this.game.exportSave();
    });
    $('#btn-reset')?.addEventListener('click', () => {
      if (confirm('Effacer définitivement ta progression ?')) {
        this.game.resetGame();
      }
    });
  }

  /* ---------------- Éclosion ---------------- */

  showHatch(egg, pets, quick = false) {
    clearTimeout(this._hatchTimerA);
    clearTimeout(this._hatchTimerB);
    const overlay = $('#hatch-overlay');
    const eggEl = $('#hatch-egg');
    const title = $('#hatch-title');
    const result = $('#hatch-result');
    const closeBtn = $('#hatch-close');

    overlay.classList.remove('hidden');
    document.querySelector('.hatch-stage')?.classList.remove('rainbow');
    eggEl.style.setProperty('--egg', egg.color);
    eggEl.classList.remove('cracked');
    eggEl.style.display = '';
    result.classList.add('hidden');
    result.innerHTML = '';
    closeBtn.classList.add('hidden');
    title.textContent = 'Éclosion…';
    title.style.color = '';
    this.hatchPets = pets;

    const reveal = () => {
      eggEl.classList.add('cracked');
      this._hatchTimerB = setTimeout(() => {
        eggEl.style.display = 'none';
        result.classList.remove('hidden');
        result.innerHTML = pets.map((p, i) => {
          const def = PETS[p.id];
          const rar = RARITY[def.rarity];
          const mut = MUTATIONS[p.mutation || 'normal'];
          const isMut = (p.mutation || 'normal') !== 'normal';
          return `<div class="hatch-pet ${def.rarity === 'secret' ? 'secret' : ''} ${isMut ? 'mutated' : ''}"
              style="--rar:${rar.color};--mut:${mut.color};animation-delay:${i * 0.1}s">
            ${isMut ? `<div class="hp-mut">✦ ${mut.name}</div>` : ''}
            <div class="hp-emoji">${def.emoji}</div>
            <div class="hp-name">${def.name}</div>
            <div class="hp-rarity">${rar.name}</div>
            <div class="hp-power">⚔️ ${fmt(petPower(def, p.mutation || 'normal'))}${isMut ? ` <span class="mut-x">x${mut.mult}</span>` : ''}</div>
          </div>`;
        }).join('');
        const hasSecret = pets.some((p) => PETS[p.id].rarity === 'secret');
        const bestMut = pets.reduce((best, p) => {
          const order = ['normal', 'dore', 'arcenciel', 'prismatique'];
          return order.indexOf(p.mutation || 'normal') > order.indexOf(best.mutation || 'normal') ? p : best;
        }, pets[0]);
        const mutKey = bestMut.mutation || 'normal';
        const isPrisma = mutKey === 'prismatique';
        const isRainbow = mutKey === 'arcenciel';
        const isGold = mutKey === 'dore';
        const best = pets.reduce((b, p) => (RARITY[PETS[p.id].rarity].order > RARITY[PETS[b.id].rarity].order ? p : b), pets[0]);
        title.textContent = isPrisma ? '💠 PRISMATIQUE ! 💠'
          : isRainbow ? '🌈 ARC-EN-CIEL !'
            : hasSecret ? '✨ PET SECRET ! ✨'
              : isGold ? '✦ PET DORÉ !'
                : `Nouveau pet · ${RARITY[PETS[best.id].rarity].name}`;
        title.style.color = isPrisma ? '#7cf2ff'
          : isRainbow ? '#ff7ab8'
            : hasSecret ? '#fde047'
              : isGold ? '#ffd24a'
                : RARITY[PETS[best.id].rarity].color;
        document.querySelector('.hatch-stage')?.classList.toggle('rainbow', isRainbow || isPrisma);
        closeBtn.classList.remove('hidden');
        this.confetti(isPrisma ? 60 : isRainbow ? 45 : hasSecret ? 40 : 18, isPrisma ? '#7cf2ff' : RARITY[PETS[best.id].rarity].color);
        this.game.playSound(isPrisma || isRainbow ? 'secret' : 'hatch');
        if (isPrisma || isRainbow) setTimeout(() => this.game.playSound('secret'), 260);
      }, quick ? 120 : 520);
    };

    this._hatchTimerA = setTimeout(reveal, quick ? 40 : 560);
  }

  confetti(count, color) {
    const stage = document.querySelector('.hatch-stage');
    if (!stage) return;
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'hatch-confetti';
      c.style.background = [color, '#ffd24a', '#3ddcff', '#ff7ab8', '#ffffff'][Math.floor(Math.random() * 5)];
      c.style.left = '50%';
      c.style.top = '40%';
      c.style.position = 'absolute';
      const angle = Math.random() * Math.PI * 2;
      const dist = 110 + Math.random() * 180;
      c.style.transition = 'transform 0.9s cubic-bezier(0.15,0.8,0.3,1), opacity 0.9s';
      stage.appendChild(c);
      requestAnimationFrame(() => {
        c.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 120}px) rotate(${Math.random() * 720}deg)`;
        c.style.opacity = '0';
      });
      setTimeout(() => c.remove(), 1000);
    }
  }

  hideHatch() {
    $('#hatch-overlay').classList.add('hidden');
    this.hatchPets = null;
  }
}
