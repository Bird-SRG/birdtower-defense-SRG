/* Bird Tower Defense - Bird & Monster Codex */

import { stateManager, BIRD_TEMPLATES, MONSTER_TEMPLATES, GRADES, GRADE_NAMES, GRADE_COLORS } from './state.js';
import { getBirdSVG } from './assets.js';

const GRADE_ORDER = [GRADES.NORMAL, GRADES.UNCOMMON, GRADES.RARE, GRADES.EPIC, GRADES.LEGENDARY, GRADES.MYTHIC];

export class InventorySystem {
  constructor() {
    this.birdGrid = document.getElementById('bird-grid');
    this.detailPanel = document.getElementById('bird-detail-panel');
    this.monsterCodexContainer = document.getElementById('monster-codex-grid');

    this.selectedBirdId = null;
    this.activeGradeFilter = 'all';
  }

  init() {
    this.render();
    this.initEvents();
  }

  initEvents() {
    const filterBtns = document.querySelectorAll('#tab-inventory .filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeGradeFilter = btn.dataset.grade;
        this.renderBirdList();
      });
    });
  }

  render() {
    this.renderBirdList();
    this.renderMonsterCodex();
  }

  renderBirdList() {
    if (!this.birdGrid) return;
    this.birdGrid.innerHTML = '';
    const state = stateManager.state;

    let grades = GRADE_ORDER;
    if (this.activeGradeFilter !== 'all') {
      grades = grades.filter(g => g === this.activeGradeFilter);
    }

    grades.forEach(grade => {
      const birdKeys = Object.keys(BIRD_TEMPLATES).filter(k => BIRD_TEMPLATES[k].grade === grade);
      if (birdKeys.length === 0) return;

      const ownedCount = birdKeys.filter(k => state.ownedBirds.some(b => b.birdId === k)).length;

      const section = document.createElement('div');
      section.className = 'bird-grade-section';
      section.innerHTML = `
        <div class="bird-grade-section-title" style="color: ${GRADE_COLORS[grade]};">
          ${GRADE_NAMES[grade]}
          <span class="bird-grade-section-count">${ownedCount} / ${birdKeys.length}</span>
        </div>
      `;

      const sectionGrid = document.createElement('div');
      sectionGrid.className = 'bird-grid';

      birdKeys.forEach(birdId => {
        const template = BIRD_TEMPLATES[birdId];
        const owned = state.ownedBirds.find(b => b.birdId === birdId);

        const card = document.createElement('div');
        card.className = `bird-card glass-panel ${this.selectedBirdId === birdId ? 'selected' : ''} ${owned ? '' : 'locked'}`;

        if (owned) {
          card.innerHTML = `
            <div class="bird-card-svg">${getBirdSVG(birdId, 44)}</div>
            <div class="bird-card-name">${template.name}</div>
            <div class="bird-card-grade" style="color: ${GRADE_COLORS[template.grade]}; font-size: 11px;">${GRADE_NAMES[template.grade]}</div>
            <div class="bird-card-level">보유 ${owned.count}마리</div>
          `;
        } else {
          card.innerHTML = `
            <div class="bird-card-svg silhouette">${getBirdSVG(birdId, 44)}</div>
            <div class="bird-card-name unknown">???</div>
            <div class="bird-card-level">미획득</div>
          `;
        }

        card.addEventListener('click', () => {
          this.showBirdDetails(birdId);
        });

        sectionGrid.appendChild(card);
      });

      section.appendChild(sectionGrid);
      this.birdGrid.appendChild(section);
    });
  }

  showBirdDetails(birdId) {
    this.selectedBirdId = birdId;
    const template = BIRD_TEMPLATES[birdId];
    const state = stateManager.state;
    const owned = state.ownedBirds.find(b => b.birdId === birdId);

    if (!this.detailPanel) return;
    this.detailPanel.classList.remove('hidden');

    const svgContainer = document.getElementById('detail-bird-svg');
    svgContainer.innerHTML = getBirdSVG(birdId, 60);
    svgContainer.classList.toggle('silhouette', !owned);

    const gradeBadge = document.getElementById('detail-bird-grade');
    const lvl1Stats = template.levels[0];

    if (owned) {
      document.getElementById('detail-bird-name').textContent = template.name;
      gradeBadge.textContent = GRADE_NAMES[template.grade];
      gradeBadge.style.color = GRADE_COLORS[template.grade];
      document.getElementById('detail-stat-atk').textContent = Math.round(lvl1Stats.atk || 0);
      document.getElementById('detail-stat-spd').textContent = lvl1Stats.interval ? lvl1Stats.interval.toFixed(2) + 's' : '-';
      document.getElementById('detail-stat-rng').textContent = lvl1Stats.range || 0;
      document.getElementById('detail-bird-count').textContent = owned.count;
      document.getElementById('detail-bird-desc').textContent = template.desc;
    } else {
      document.getElementById('detail-bird-name').textContent = '???';
      gradeBadge.textContent = GRADE_NAMES[template.grade];
      gradeBadge.style.color = GRADE_COLORS[template.grade];
      document.getElementById('detail-stat-atk').textContent = '???';
      document.getElementById('detail-stat-spd').textContent = '???';
      document.getElementById('detail-stat-rng').textContent = '???';
      document.getElementById('detail-bird-count').textContent = 0;
      document.getElementById('detail-bird-desc').textContent = '아직 미획득한 새입니다. 상점에서 알을 구해 부화하세요.';
    }

    this.renderBirdList();
  }

  renderMonsterCodex() {
    if (!this.monsterCodexContainer) return;
    this.monsterCodexContainer.innerHTML = '';

    for (let mKey in MONSTER_TEMPLATES) {
      const tmpl = MONSTER_TEMPLATES[mKey];
      const card = document.createElement('div');
      card.className = 'monster-card glass-panel';
      card.innerHTML = `
        <div style="font-size: 36px; text-align:center;">${tmpl.icon}</div>
        <h4 style="margin: 4px 0;">${tmpl.name}</h4>
        <p style="font-size: 11px; color: var(--text-muted); margin: 0;">HP: ${tmpl.hp} | 속도: ${tmpl.speed}</p>
      `;
      this.monsterCodexContainer.appendChild(card);
    }
  }
}
