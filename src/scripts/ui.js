/**
 * UI System
 *
 * Handles all visual rendering and UI updates.
 * - Draws heroes and enemies on canvas
 * - Draws health bars
 * - Draws floating damage numbers
 * - Updates HTML elements (gold, gems, etc.)
 *
 * Learning Note: Canvas is like a digital painting canvas.
 * You draw shapes, text, and images on it using JavaScript.
 */

class UIManager {
  constructor(canvasId) {
    // Get canvas element and 2D drawing context
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Device pixel ratio for crisp rendering on high-DPI displays
    this.dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;

    // Ensure the canvas backing store matches the visible (CSS) size
    this.resizeCanvas();

    // Recompute canvas size on window resize
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resizeCanvas());
    }

  }

  /**
   * Resize the canvas backing store to match its CSS size and device pixel ratio
   */
  resizeCanvas() {
    const baseWidth = 800;
    const baseHeight = 400;
    const heroXRatio = 0.125;
    const enemyXRatio = 0.75;
    const yPositionRatios = [0.25, 0.5, 0.75];

    // Get the CSS size of the canvas (fallback to attributes if not styled)
    const cssWidth =
      this.canvas.clientWidth ||
      parseInt(this.canvas.getAttribute('width')) ||
      baseWidth;
    const cssHeight =
      this.canvas.clientHeight ||
      parseInt(this.canvas.getAttribute('height')) ||
      baseHeight;

    // Set the canvas width/height in device pixels
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);

    // Ensure the element's CSS size remains the intended size
    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';

    // Scale drawing operations so code can continue using CSS pixel coordinates
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Store logical drawing size in CSS pixels for the rest of the UI code
    this.width = cssWidth;
    this.height = cssHeight;

    // Responsive layout scaling for cross-platform sizing
    const scale = Math.min(this.width / baseWidth, this.height / baseHeight, 1);
    this.characterSize = Math.max(40, Math.round(60 * scale));
    this.healthBarWidth = Math.max(50, Math.round(70 * scale));
    this.healthBarHeight = Math.max(6, Math.round(8 * scale));
    this.labelFontSize = Math.max(12, Math.round(14 * scale));
    this.damageFontSize = Math.max(14, Math.round(24 * scale));
    this.resultFontSize = Math.max(32, Math.round(72 * scale));

    this.heroStartX = Math.max(
      this.characterSize,
      Math.round(this.width * heroXRatio)
    );
    this.enemyStartX = Math.min(
      this.width - this.characterSize,
      Math.round(this.width * enemyXRatio)
    );
    this.yPositions = yPositionRatios.map(ratio =>
      Math.round(this.height * ratio)
    );
  }

  /**
   * Main render function - draws everything
   *
   * @param {Array<Hero>} heroes - Heroes to draw
   * @param {Array<Enemy>} enemies - Enemies to draw
   * @param {Array} damageNumbers - Damage numbers to draw
   */
  render(heroes, enemies, damageNumbers) {
    // Clear canvas (like erasing the whiteboard)
    this.clearCanvas();

    // Draw background effects
    this.drawBackground();

    // Draw characters
    this.drawHeroes(heroes);
    this.drawEnemies(enemies);

    // Draw floating damage numbers
    this.drawDamageNumbers(damageNumbers);
  }

  sprite(category, name) {
    const manager = window.game && window.game.assetManager;
    const img = manager && manager.get ? manager.get(category, name) : null;
    if (img && img.complete && img.naturalWidth) return img;
    return null;
  }

  backgroundNameForStage(stage) {
    if (stage <= 3) return 'forest';
    if (stage <= 6) return 'dungeon';
    if (stage <= 9) return 'volcano';
    return 'castle';
  }

  /**
   * Clear the entire canvas
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Draw background gradient and effects
   */
  drawBackground() {
    const stage = (window.game && window.game.currentStage) || 1;
    const background = this.sprite('backgrounds', this.backgroundNameForStage(stage));

    if (background) {
      this.ctx.drawImage(background, 0, 0, this.width, this.height);
      return;
    }

    // Draw a subtle gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#2d1b3d');
    gradient.addColorStop(1, '#1a1a2e');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw hero (single hero in horde mode)
   *
   * @param {Hero|Array<Hero>} heroes - Hero or array of heroes to draw
   */
  drawHeroes(heroes) {
    // Handle single hero or array for backward compatibility
    const heroArray = Array.isArray(heroes) ? heroes : [heroes];

    heroArray.forEach((hero, index) => {
      if (!hero) return; // Skip if hero is null/undefined

      const x = this.heroStartX;
      const y = this.yPositions[index];

      // Update hero position (for damage numbers)
      hero.x = x;
      hero.y = y;

      // Draw the hero art from this repo, or a colored fallback
      const heroSprite = this.sprite('heroes', 'bartimaeus');
      if (!this.drawSprite(heroSprite, x, y, hero.isAlive())) {
        this.drawCharacter(x, y, hero.color, hero.isAlive());
      }

      // Draw health bar
      this.drawHealthBar(x, y - 40, hero.getHealthPercent(), true);

      // Draw name label
      this.drawLabel(x, y + 80, hero.name, '#fbbf24');
    });
  }

  /**
   * Draw all enemies
   *
   * @param {Array<Enemy>} enemies - Enemies to draw
   */
  drawEnemies(enemies) {
    enemies.forEach((enemy, index) => {
      const x = this.enemyStartX;
      const y = this.yPositions[index];

      // Update enemy position (for damage numbers)
      enemy.x = x;
      enemy.y = y;

      // Draw the enemy art from this repo, or a colored fallback
      const enemySprite = this.sprite('enemies', (enemy.type || '').toLowerCase());
      if (!this.drawSprite(enemySprite, x, y, enemy.isAlive())) {
        this.drawCharacter(x, y, enemy.color, enemy.isAlive());
      }

      // Draw health bar
      this.drawHealthBar(x, y - 40, enemy.getHealthPercent(), false);

      // Draw type label
      this.drawLabel(x, y + 80, enemy.type, '#d1d5db');
    });
  }

  /**
   * Draw a single character (rectangle with glow effect)
   *
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} color - Color
   * @param {boolean} isAlive - If false, draw as gray/dead
   */
  drawSprite(img, x, y, isAlive) {
    if (!img) return false;
    const width = Math.round(this.characterSize * 1.45);
    const height = Math.round(width * 1.25);
    this.ctx.save();
    if (!isAlive) this.ctx.globalAlpha = 0.35;
    this.ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
    this.ctx.restore();
    return true;
  }

  drawCharacter(x, y, color, isAlive) {
    const size = this.characterSize;

    // If dead, draw gray
    const displayColor = isAlive ? color : '#404040';

    // Draw glow effect (shadow)
    if (isAlive) {
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = color;
    }

    // Draw character rectangle
    this.ctx.fillStyle = displayColor;
    this.ctx.fillRect(x - size / 2, y - size / 2, size, size);

    // Add border
    this.ctx.strokeStyle = isAlive ? '#ffffff' : '#808080';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);

    // Reset shadow
    this.ctx.shadowBlur = 0;

    // Draw X if dead
    if (!isAlive) {
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 4;
      const crossOffset = Math.round(size * 0.33);
      this.ctx.beginPath();
      this.ctx.moveTo(x - crossOffset, y - crossOffset);
      this.ctx.lineTo(x + crossOffset, y + crossOffset);
      this.ctx.moveTo(x + crossOffset, y - crossOffset);
      this.ctx.lineTo(x - crossOffset, y + crossOffset);
      this.ctx.stroke();
    }
  }

  /**
   * Draw a health bar
   *
   * @param {number} x - X position (center)
   * @param {number} y - Y position (center)
   * @param {number} healthPercent - Health percentage (0 to 1)
   * @param {boolean} isHero - If true, use green; if false, use red
   */
  drawHealthBar(x, y, healthPercent, isHero) {
    const width = this.healthBarWidth;
    const height = this.healthBarHeight;

    // Background (empty health bar)
    this.ctx.fillStyle = '#404040';
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height);

    // Foreground (current health)
    const currentWidth = width * healthPercent;
    const healthColor = isHero ? '#10b981' : '#ef4444'; // Green for heroes, red for enemies

    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(x - width / 2, y - height / 2, currentWidth, height);

    // Border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
  }

  /**
   * Draw a text label
   *
   * @param {number} x - X position (center)
   * @param {number} y - Y position
   * @param {string} text - Text to display
   * @param {string} color - Text color
   */
  drawLabel(x, y, text, color) {
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${this.labelFontSize || 14}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  /**
   * Draw floating damage numbers
   *
   * @param {Array} damageNumbers - Array of damage number objects
   */
  drawDamageNumbers(damageNumbers) {
    damageNumbers.forEach(num => {
      // Color: red for hero damage, white for enemy damage
      const color = num.isHero ? '#ef4444' : '#ffffff';

      // Set opacity
      this.ctx.globalAlpha = num.opacity;

      // Draw damage text
      this.ctx.fillStyle = color;
      this.ctx.font = `bold ${this.damageFontSize || 24}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`-${num.damage}`, num.x, num.y);

      // Reset opacity
      this.ctx.globalAlpha = 1.0;
    });
  }

  /**
   * Draw battle result overlay (Victory or Defeat)
   *
   * @param {string} result - 'victory' or 'defeat'
   */
  drawBattleResult(result) {
    // Semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Result text
    const text = result === 'victory' ? 'VICTORY!' : 'DEFEAT!';
    const color = result === 'victory' ? '#10b981' : '#ef4444';

    // Draw text with glow
    this.ctx.shadowBlur = 30;
    this.ctx.shadowColor = color;
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${this.resultFontSize || 72}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, this.width / 2, this.height / 2);

    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  /**
   * Update HTML resource displays (gold, gems, stage)
   *
   * @param {number} gold - Current gold amount
   * @param {number} gems - Current gems amount
   * @param {number} stage - Current stage number
   */
  updateResourceDisplay(gold, gems, stage) {
    document.getElementById('gold-display').textContent = gold.toLocaleString();
    document.getElementById('gem-display').textContent = gems.toLocaleString();
    document.getElementById('stage-number').textContent = stage;
  }

  updateHeroPanel(hero, wave) {
    if (!hero) return;

    const name = document.getElementById('hero-name');
    if (name) name.textContent = hero.name;
    const level = document.querySelector('#hero-level span');
    if (level) level.textContent = hero.level;
    const atk = document.getElementById('hero-atk');
    if (atk) atk.textContent = hero.attack;
    const def = document.getElementById('hero-def');
    if (def) def.textContent = hero.defense;

    const hpText = document.querySelector('#left-panel .stat-text');
    if (hpText) hpText.textContent = `${Math.floor(hero.health)}/${hero.maxHealth}`;
    const hpFill = document.querySelector('#left-panel .hp-fill');
    if (hpFill) hpFill.style.width = `${Math.round(hero.getHealthPercent() * 100)}%`;

    const cost = document.querySelector('#upgrade-stats-btn .upgrade-cost');
    if (cost) cost.textContent = `${hero.getUpgradeCost().toLocaleString()} 💰`;

    const waveEl = document.getElementById('wave-number');
    if (waveEl && wave != null) waveEl.textContent = wave;

    const portrait = document.getElementById('hero-portrait');
    const placeholder = document.querySelector('.hero-portrait-placeholder');
    const img = this.sprite('heroes', 'bartimaeus');
    if (portrait && img) {
      if (portrait.getAttribute('src') !== img.src) portrait.src = img.src;
      portrait.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    }

    this.updateSkillButtons();
  }

  updateSkillButtons() {
    const box = document.getElementById('skill-buttons');
    const battle = window.game && window.game.battleManager;
    const manager = battle && battle.skillManager;
    if (!box || !manager) return;

    const skills = manager.getSkills();
    const signature = skills.map(skill => skill.id).join(',');
    if (box.dataset.signature !== signature) {
      box.dataset.signature = signature;
      box.innerHTML = '';
      skills.forEach(skill => {
        const button = document.createElement('button');
        button.className = 'skill-btn';
        button.dataset.skill = skill.id;
        button.title = `${skill.name} — ${skill.description}`;
        button.textContent = skill.name;
        const icon = this.sprite('ui', `skill_${skill.id}`);
        if (icon) {
          button.style.backgroundImage = `url("${icon.src}")`;
          button.style.color = '#fff';
          button.style.textShadow = '0 1px 3px #000';
        }
        button.addEventListener('click', () => {
          const current = window.game && window.game.battleManager;
          if (!current || !current.skillManager) return;
          const targets = (current.enemies || []).filter(enemy => enemy.isAlive());
          current.skillManager.useSkill(skill.id, targets, current);
        });
        box.appendChild(button);
      });
    }

    box.querySelectorAll('.skill-btn').forEach(button => {
      const skill = skills.find(item => item.id === button.dataset.skill);
      if (skill) button.classList.toggle('on-cooldown', !skill.canUse());
    });
  }

  /**
   * Update upgrade modal with hero information
   *
   * @param {Array<Hero>} heroes - Heroes to display
   * @param {function} onUpgrade - Callback when upgrade button clicked
   */
  updateUpgradeModal(heroes, onUpgrade) {
    const heroList = document.getElementById('hero-list');
    heroList.innerHTML = ''; // Clear existing content

    heroes.forEach(hero => {
      const heroItem = document.createElement('div');
      heroItem.className = 'hero-item';

      const cost = hero.getUpgradeCost();

      heroItem.innerHTML = `
                <div class="hero-info">
                    <div class="hero-name">${hero.name} - Level ${hero.level}</div>
                    <div class="hero-stats">
                        ❤️ HP: ${hero.maxHealth} | ⚔️ ATK: ${hero.attack} | 🛡️ DEF: ${hero.defense}
                    </div>
                </div>
                <button class="hero-upgrade-btn" data-hero-id="${hero.id}">
                    Upgrade (${cost.toLocaleString()} 💰)
                </button>
            `;

      heroList.appendChild(heroItem);
    });

    // Add event listeners to upgrade buttons
    document.querySelectorAll('.hero-upgrade-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const heroId = parseInt(e.target.dataset.heroId);
        onUpgrade(heroId);
      });
    });
  }

  /**
   * Show AFK rewards modal
   *
   * @param {number} gold - Gold earned
   * @param {number} gems - Gems earned
   * @param {string} timeAway - Formatted time away
   */
  showAFKRewards(gold, gems, timeAway) {
    document.getElementById('afk-gold').textContent =
      `+${gold.toLocaleString()}`;
    document.getElementById('afk-gems').textContent =
      `+${gems.toLocaleString()}`;
    document.getElementById('time-away').textContent = timeAway;

    // Show modal
    document.getElementById('afk-modal').style.display = 'flex';
  }

  /**
   * Hide AFK rewards modal
   */
  hideAFKRewards() {
    document.getElementById('afk-modal').style.display = 'none';
  }

  /**
   * Show/hide upgrade modal
   *
   * @param {boolean} show - True to show, false to hide
   */
  toggleUpgradeModal(show) {
    document.getElementById('upgrade-modal').style.display = show
      ? 'flex'
      : 'none';
  }

  /**
   * Update battle control buttons
   *
   * @param {string} result - Battle result ('victory', 'defeat', or null)
   * @param {string} mode - 'IDLE' or 'BOSS'
   */
  updateBattleControls(result, mode = 'IDLE') {
    const nextStageBtn = document.getElementById('next-stage-btn');
    const retryBtn = document.getElementById('retry-btn');

    // In IDLE mode, always show Challenge button
    if (mode === 'IDLE') {
      if (nextStageBtn) {
        nextStageBtn.style.display = 'block';
        // Note: The text is set to "Challenge Stage" in game.js initialization
      }
      if (retryBtn) retryBtn.style.display = 'none';
      return;
    }

    // In BOSS mode, hide challenge button while fighting
    if (mode === 'BOSS') {
      if (nextStageBtn) nextStageBtn.style.display = 'none';
      if (retryBtn) retryBtn.style.display = 'none';
      // Wait for result
    }
  }
}

globalThis.UIManager = UIManager;
