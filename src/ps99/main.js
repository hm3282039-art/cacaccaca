/* ============================================================
   PET BLOCS 99 — contrôleur du jeu
   ============================================================ */
import './style.css';
import { World } from './world3d.js';
import { UI } from './ui.js';
import * as S from './state.js';
import {
  EGGS, PETS, RARITY, ZONES, UPGRADES, DIAMOND_BOOSTS,
  zoneLayout, rollPet, fmt, REBIRTH, eggOdds,
} from './data.js';
import { AVATAR_PALETTES } from './models.js';

const QS = (s) => document.querySelector(s);

class Game {
  constructor() {
    this.saved = S.loadState();
    this.state = this.saved || S.createState();
    const state = this.state;
    window.__petblocs_state = this.state;
    window.__petblocs_game = this;

    this.petTickTimer = 0;
    this.autoAcc = 0;
    this.hudTimer = 0;
    this.saveTimer = 0;
    this.targetTimer = 0;
    this.lastFrame = performance.now();

    this.canvas = QS('#scene');
    this.world = new World(this.canvas, {
      onPlayerHit: (b) => this.playerHit(b),
      onBroken: (b) => this.onBroken(b),
      onDamageText: (pos, text, cls) => this.ui?.damage(pos, text, cls),
      onTargetChange: (b) => this.ui?.setTarget(b, this.state),
    });
    this.ui = new UI(this);

    this.applySettings(true);
    this.buildZone(true);
    this.refreshPets();
    this.ui.updateHud(this.state);
    this.ui.renderDock(this.state);

    this.world.setPalette(state.settings.palette || 0);

    if (this.saved) this.grantOffline();
    else {
      S.addPet(state, 'chiot');
      this.refreshPets();
      setTimeout(() => this.ui.toast('Bienvenue ! Clique sur un tas de pièces pour commencer 🪙'), 700);
      setTimeout(() => this.ui.toast('🌿 Tu es dans la zone 1 : Prairie'), 1900);
    }

    this.bindGlobalEvents();
    this.hideLoading();
    this.loop();
  }

  /* ---------------- boucle ---------------- */

  loop = () => {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    if (dt > 0.25) dt = 0.25;

    const state = this.state;
    const world = this.world;

    world.update(dt);

    const target = world.target;
    if (target && target.alive && world.inRangeOf(target)) {
      // dégâts continus des pets
      const petDps = S.petDamage(state);
      if (petDps > 0) {
        this.petTickTimer += dt;
        while (this.petTickTimer >= 0.4) {
          this.petTickTimer -= 0.4;
          const dmg = petDps * 0.4;
          const broke = world.applyDamage(target, dmg, 'pet');
          this.popCoinsCheck(broke);
          if (broke) break;
        }
      }

      // clics automatiques
      const auto = S.autoClicksPerSecond(state);
      if (auto > 0) {
        this.autoAcc += dt * auto;
        while (this.autoAcc >= 1) {
          this.autoAcc -= 1;
          world.requestAutoHit();
        }
      }
    }

    this.hudTimer += dt;
    if (this.hudTimer > 0.12) {
      this.hudTimer = 0;
      this.ui.updateHud(state);
      this.ui.setTarget(world.target, state);
    }

    this.targetTimer += dt;
    if (this.targetTimer > 0.5) {
      this.targetTimer = 0;
      if (this.ui.currentPanel) this.ui.refreshOpenPanel();
    }

    this.saveTimer += dt;
    if (this.saveTimer > 6) {
      this.saveTimer = 0;
      S.saveState(state);
    }

    world.render();
  };

  popCoinsCheck() { /* hook de lisibilité */ }

  coinMultiplier() {
    return S.coinMultiplier(this.state);
  }

  /* ---------------- attaques ---------------- */

  playerHit(b) {
    const state = this.state;
    const crit = Math.random() < 0.1;
    let dmg = S.clickDamage(state) * (crit ? 3 : 1);
    dmg *= 1 + Math.random() * 0.15;
    const broke = this.world.applyDamage(b, dmg, crit ? 'crit' : '');
    this.playSound('click');
    if (broke) this.playSound('break');
  }

  /* ---------------- récompenses ---------------- */

  onBroken(b) {
    const state = this.state;
    const zone = S.zoneById(state.zone);
    const def = b.def;

    // pièces
    const variance = 0.9 + Math.random() * 0.2;
    const coins = def.coins * zone.coinMult * this.coinMultiplier() * variance;
    state.coins += coins;
    state.stats.totalCoins += coins;
    state.stats.totalBroken += 1;

    // gemmes
    let gems = Math.floor(def.gems);
    if (Math.random() < def.gems - gems) gems += 1;
    if (gems > 0) {
      state.gems += gems;
      this.ui.toast(`💎 +${gems} gemme${gems > 1 ? 's' : ''}`, 'good');
      this.playSound('gem');
    }

    // texte flottant des pièces
    this.world.spawnText(
      { x: b.basePos.x, y: 2.1 * b.scale, z: b.basePos.z },
      `+${fmt(coins)} 🪙`,
      'gold',
    );

    // objet suivant
    const next = this.nearestAlive(b);
    if (next) this.world.selectTarget(next);

    if (state.stats.totalBroken % 25 === 0) {
      this.ui.toast(`🔥 ${state.stats.totalBroken} objets cassés !`, 'good');
    }
  }

  nearestAlive(from) {
    let best = null;
    let bestD = Infinity;
    for (const b of this.world.breakables) {
      if (!b.alive) continue;
      const d = Math.hypot(b.basePos.x - from.basePos.x, b.basePos.z - from.basePos.z);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  /* ---------------- zones ---------------- */

  buildZone(resetPets = false) {
    const state = this.state;
    const zone = S.zoneById(state.zone);
    this.world.buildZone(zone, zoneLayout(zone.id));
    if (resetPets) this.refreshPets();
    if (this.ui) {
      this.ui.updateHud(state);
      this.ui.setTarget(null, state);
    }
  }

  goToZone(zid) {
    const state = this.state;
    if (!S.zoneUnlocked(state, zid)) {
      this.ui.toast('🔒 Cette zone est encore verrouillée', 'bad');
      return;
    }
    if (state.zone === zid) return;
    state.zone = zid;
    this.buildZone();
    const zone = S.zoneById(zid);
    this.ui.toast(`🧭 Direction : ${zone.name}`, 'good');
    this.playSound('buy');
    S.saveState(state);
  }

  unlockZone(zid) {
    const state = this.state;
    const zone = ZONES.find((z) => z.id === zid);
    if (!zone || S.zoneUnlocked(state, zid)) return;
    if (state.coins < zone.price) {
      this.ui.toast('🪙 Pas assez de pièces', 'bad');
      return;
    }
    state.coins -= zone.price;
    state.unlockedZones.push(zid);
    this.playSound('buy');
    this.ui.toast(`🎉 Zone débloquée : ${zone.name}`, 'good');
    S.saveState(state);
  }

  /* ---------------- pets ---------------- */

  refreshPets() {
    const state = this.state;
    const defs = S.equippedPets(state).map((p) => PETS[p.id]).filter(Boolean);
    this.world.setPets(defs);
    this.ui.renderDock(state);
  }

  hatchEgg(eggId, count = 1) {
    const state = this.state;
    const egg = EGGS[eggId];
    if (!egg) return;
    const cost = egg.price * count;
    if (state.coins < cost) {
      this.ui.toast('🪙 Pas assez de pièces pour cet œuf', 'bad');
      this.playSound('error');
      return;
    }
    state.coins -= cost;
    const pets = [];
    for (let i = 0; i < count; i++) {
      const def = rollPet(egg);
      const pet = S.addPet(state, def.id);
      if (pet) pets.push(pet);
    }
    state.stats.totalHatches += count;
    this.ui.closePanels();
    this.refreshPets();
    this.ui.updateHud(state);
    this.ui.showHatch(egg, pets, state.settings.autoHatch);
    const bestRarity = pets.reduce((best, p) => Math.max(best, RARITY[PETS[p.id].rarity].order), 0);
    if (bestRarity >= 5) this.ui.toast('🌟 Un pet mythique ou mieux !', 'good');
    S.saveState(state);
    return pets;
  }

  togglePet(uid) {
    const state = this.state;
    const pet = state.pets.find((p) => p.uid === uid);
    if (!pet) return;
    if (!pet.equipped && S.equippedPets(state).length >= S.maxEquipped(state)) {
      this.ui.toast('Tous les emplacements sont pris !', 'bad');
      return;
    }
    S.togglePet(state, uid);
    this.refreshPets();
    this.ui.updateHud(state);
  }

  sellPet(uid) {
    const state = this.state;
    const pet = state.pets.find((p) => p.uid === uid);
    if (!pet) return;
    const val = S.sellPet(state, uid);
    this.ui.toast(`💸 Pet vendu : +${fmt(val)} 🪙`, 'good');
    this.refreshPets();
    this.ui.updateHud(state);
    this.playSound('buy');
  }

  equipBest() {
    S.equipBest(this.state);
    this.refreshPets();
    this.ui.toast('⭐ Meilleurs pets équipés', 'good');
  }

  sellDuplicates() {
    const gained = S.sellDuplicates(this.state);
    if (gained > 0) {
      this.ui.toast(`🗑️ Doublons vendus : +${fmt(gained)} 🪙`, 'good');
      this.refreshPets();
      this.ui.updateHud(this.state);
    } else {
      this.ui.toast('Aucun doublon à vendre', '');
    }
  }

  /* ---------------- améliorations ---------------- */

  buyUpgrade(id) {
    const state = this.state;
    const def = UPGRADES[id];
    if (!def || S.upgradeMaxed(state, id)) return;
    const cost = S.upgradeCost(state, id);
    const currency = id === 'slots' || id === 'mult' || id === 'auto' ? 'gems' : 'coins';
    if (currency === 'coins' && state.coins < cost) return;
    if (currency === 'gems' && state.gems < cost) return;
    if (currency === 'coins') state.coins -= cost;
    else state.gems -= cost;
    state.upgrades[id] += 1;
    this.playSound('buy');
    this.ui.updateHud(state);
    if (id === 'slots') this.refreshPets();
    S.saveState(state);
  }

  buyBoost(id) {
    const state = this.state;
    if (S.boostMaxed(state, id)) return;
    const cost = S.boostCost(state, id);
    if (state.diamonds < cost) {
      this.ui.toast('✨ Pas assez de diamants', 'bad');
      return;
    }
    state.diamonds -= cost;
    state.boosts[id] += 1;
    this.playSound('buy');
    this.ui.updateHud(state);
    if (id === 'bag') this.refreshPets();
    S.saveState(state);
  }

  /* ---------------- renaissance ---------------- */

  doRebirth() {
    const state = this.state;
    if (!S.canRebirth(state)) return;
    const gain = REBIRTH.diamonds(state.rebirths);
    state.diamonds += gain;
    state.rebirths += 1;
    state.coins = 0;
    state.zone = 1;
    state.unlockedZones = [1];
    state.upgrades = { click: 0, pets: 0, speed: 0, slots: 0, mult: 0, auto: 0 };
    this.buildZone();
    this.refreshPets();
    this.ui.updateHud(state);
    this.ui.closePanels();
    this.ui.toast(`🔄 Renaissance ${state.rebirths} ! Multiplicateur x${REBIRTH.multiplier(state.rebirths).toFixed(2)}`, 'good');
    this.ui.toast(`✨ +${gain} diamants`, 'good');
    this.playSound('rebirth');
    this.world.player.position.set(0, 0, 7.6);
    S.saveState(state);
  }

  /* ---------------- réglages ---------------- */

  setPalette(index) {
    this.state.settings.palette = index;
    this.world.setPalette(index);
    this.ui.toast(`🎨 Look ${AVATAR_PALETTES[index].name}`, '');
    S.saveState(this.state);
  }

  applySettings(initial = false) {
    const s = this.state.settings;
    this.world.setQuality(!!s.lowQuality);
    this.world.particlesEnabled = s.particles;
    if (!initial && !s.sound) this.audioCtx?.suspend?.();
    if (!initial && s.sound) this.audioCtx?.resume?.();
  }

  /* ---------------- sauvegarde ---------------- */

  save() {
    S.saveState(this.state);
  }

  exportSave() {
    const code = S.exportSave(this.state);
    if (!code) return;
    navigator.clipboard?.writeText(code).then(
      () => this.ui.toast('📤 Code de sauvegarde copié !', 'good'),
      () => this.ui.toast('Impossible de copier le code', 'bad'),
    );
  }

  resetGame() {
    S.wipeSave();
    location.reload();
  }

  grantOffline() {
    const state = this.state;
    const elapsed = Math.max(0, (Date.now() - (state.lastSave || Date.now())) / 1000);
    if (elapsed < 90) return;
    const capped = Math.min(elapsed, 4 * 3600);
    const zone = S.zoneById(state.zone);
    const coins = capped * (6 + state.zone * 4) * zone.coinMult * S.coinMultiplier(state) * 0.25;
    if (coins < 1) return;
    state.coins += coins;
    state.stats.totalCoins += coins;
    const mins = Math.round(elapsed / 60);
    setTimeout(() => {
      this.ui.toast(`😴 Pendant ton absence (${mins} min) : +${fmt(coins)} 🪙`, 'good');
    }, 900);
  }

  /* ---------------- sons ---------------- */

  playSound(type) {
    const s = this.state.settings;
    if (!s.sound) return;
    try {
      if (!this.audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.audioCtx = new Ctx();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const tone = (freq, dur, wave = 'square', vol = 0.05, slide = null, delay = 0) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = wave;
        o.frequency.setValueAtTime(freq, now + delay);
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, now + delay + dur);
        g.gain.setValueAtTime(0.0001, now + delay);
        g.gain.exponentialRampToValueAtTime(vol, now + delay + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        o.connect(g).connect(ctx.destination);
        o.start(now + delay);
        o.stop(now + delay + dur + 0.02);
      };
      switch (type) {
        case 'click': tone(620 + Math.random() * 60, 0.06, 'square', 0.025, 380); break;
        case 'break': tone(300, 0.16, 'triangle', 0.05, 760); tone(180, 0.18, 'sine', 0.04, 90, 0.02); break;
        case 'gem': tone(880, 0.1, 'sine', 0.045, 1250); tone(1320, 0.12, 'sine', 0.03, 1760, 0.06); break;
        case 'hatch': tone(520, 0.12, 'sine', 0.05, 900); tone(780, 0.16, 'sine', 0.04, 1200, 0.1); break;
        case 'secret':
          [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.05, null, i * 0.09));
          break;
        case 'buy': tone(700, 0.08, 'sine', 0.04, 900); break;
        case 'error': tone(200, 0.14, 'sawtooth', 0.035, 120); break;
        case 'rebirth':
          [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'sine', 0.05, null, i * 0.11));
          break;
        default: break;
      }
    } catch { /* audio indisponible : on ignore */ }
  }

  /* ---------------- divers ---------------- */

  bindGlobalEvents() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) S.saveState(this.state);
    });
    window.addEventListener('beforeunload', () => S.saveState(this.state));
    window.addEventListener('resize', () => this.world.resize());

    // déblocage de l'audio au premier geste
    const unlock = () => {
      try {
        if (!this.audioCtx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) this.audioCtx = new Ctx();
        }
        this.audioCtx?.resume?.();
      } catch { /* ignore */ }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  hideLoading() {
    const el = QS('#loading');
    QS('#loading-fill').style.width = '100%';
    setTimeout(() => {
      el.classList.add('done');
      setTimeout(() => el.remove(), 500);
    }, 320);
  }
}

/* ---------------- démarrage ---------------- */

function showFatalError(err) {
  const message = String(err?.message || err || 'Erreur inconnue');
  console.error('[Pet Blocs 99]', err);
  let el = document.getElementById('fatal-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fatal-error';
    el.innerHTML = '<div><b>Petit souci technique 🛠️</b><code></code></div>';
    const btn = document.createElement('button');
    btn.textContent = 'Recharger';
    btn.addEventListener('click', () => location.reload());
    el.appendChild(btn);
    document.getElementById('app')?.appendChild(el);
  }
  el.querySelector('code').textContent = message;
}

window.addEventListener('error', (e) => {
  if (e?.error) showFatalError(e.error);
});
window.addEventListener('unhandledrejection', (e) => showFatalError(e.reason));

function boot() {
  try {
    new Game();
  } catch (err) {
    console.error(err);
    const el = QS('#loading');
    if (el) {
      el.innerHTML = `<div class="loading-inner"><div class="loading-logo">😿</div>
        <h1>Oups…</h1>
        <p style="line-height:1.6">Le jeu n'a pas pu démarrer.<br>${String(err.message || err)}</p>
        <button class="primary-btn" style="margin-top:16px" onclick="location.reload()">Recharger</button></div>`;
    }
    showFatalError(err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// petite aide en console
console.log('%c🐾 Pet Blocs 99', 'font-size:18px;font-weight:bold;color:#ffd24a');
console.log('Astuce : tape 1/2/3/4 pour ouvrir les menus. Échap pour fermer.');
