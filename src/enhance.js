/* Bird Tower Defense - Enhance Workshop (same-bird fusion) */

import {
  stateManager, BIRD_TEMPLATES, GRADE_NAMES, GRADE_COLORS, GRADES,
  ENHANCE_MAX, ENHANCE_COPY_COST, ENHANCE_ATK_BONUS,
  getEnhanceFeatherCost, getEnhanceMult, formatEnhanceStars
} from './state.js';
import { getBirdSVG } from './assets.js';

export class EnhanceSystem {
  constructor() {
    this.grid = document.getElementById('enhance-bird-grid');
    this.detailPanel = document.getElementById('enhance-detail-panel');
    this.selectedBirdId = null;
    this.activeGradeFilter = 'all';
  }

  init() {
    this.initEvents();
    this.render();
  }

  initEvents() {
    const filterBtns = document.querySelectorAll('#tab-enhance .filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeGradeFilter = btn.dataset.grade;
        this.renderList();
      });
    });
  }

  render() {
    this.renderList();
    if (this.selectedBirdId) this.renderDetail(this.selectedBirdId);
    else this.renderEmptyDetail();
  }

  renderList() {
    if (!this.grid) return;
    this.grid.innerHTML = '';
    const state = stateManager.state;
    let owned = state.ownedBirds.filter(b => b.count > 0);

    if (this.activeGradeFilter !== 'all') {
      owned = owned.filter(b => BIRD_TEMPLATES[b.birdId]?.grade === this.activeGradeFilter);
    }

    const order = [GRADES.NORMAL, GRADES.UNCOMMON, GRADES.RARE, GRADES.EPIC, GRADES.LEGENDARY, GRADES.MYTHIC];
    owned.sort((a, b) => {
      const ga = BIRD_TEMPLATES[a.birdId]?.grade || GRADES.NORMAL;
      const gb = BIRD_TEMPLATES[b.birdId]?.grade || GRADES.NORMAL;
      return order.indexOf(ga) - order.indexOf(gb);
    });

    if (owned.length === 0) {
      this.grid.innerHTML = '<p class="deck-owned-empty">강화할 보유 새가 없습니다.</p>';
      return;
    }

    owned.forEach(entry => {
      const template = BIRD_TEMPLATES[entry.birdId];
      if (!template) return;
      const enhance = entry.enhanceLevel || 0;
      const canFuse = enhance < ENHANCE_MAX && entry.count >= ENHANCE_COPY_COST + 1;

      const card = document.createElement('div');
      card.className = `bird-card glass-panel ${this.selectedBirdId === entry.birdId ? 'selected' : ''} ${canFuse ? 'enhance-ready' : ''}`;
      card.innerHTML = `
        <div class="bird-card-svg">${getBirdSVG(entry.birdId, 44)}</div>
        <div class="bird-card-name">${template.name}</div>
        <div class="bird-card-grade" style="color: ${GRADE_COLORS[template.grade]}; font-size: 11px;">${GRADE_NAMES[template.grade]}</div>
        <div class="enhance-stars">${formatEnhanceStars(enhance)}</div>
        <div class="bird-card-level">보유 ${entry.count}마리</div>
      `;
      card.addEventListener('click', () => {
        this.selectedBirdId = entry.birdId;
        this.render();
      });
      this.grid.appendChild(card);
    });
  }

  renderEmptyDetail() {
    if (!this.detailPanel) return;
    this.detailPanel.innerHTML = '<p class="enhance-placeholder">강화할 새를 선택하세요.</p>';
  }

  renderDetail(birdId) {
    if (!this.detailPanel) return;
    const template = BIRD_TEMPLATES[birdId];
    const owned = stateManager.state.ownedBirds.find(b => b.birdId === birdId);
    if (!template || !owned) {
      this.renderEmptyDetail();
      return;
    }

    const enhance = owned.enhanceLevel || 0;
    const atMax = enhance >= ENHANCE_MAX;
    const copiesOk = owned.count >= ENHANCE_COPY_COST + 1;
    const cost = atMax ? 0 : getEnhanceFeatherCost(template.grade, enhance);
    const feathersOk = stateManager.state.feathers >= cost;
    const canFuse = !atMax && copiesOk && feathersOk;
    const curMult = getEnhanceMult(enhance);
    const nextMult = getEnhanceMult(Math.min(ENHANCE_MAX, enhance + 1));
    const baseAtk = template.levels[0].atk || 0;

    let hint = '';
    if (atMax) hint = '이미 최대 강화입니다.';
    else if (!copiesOk) hint = `같은 새가 ${ENHANCE_COPY_COST + 1}마리 이상 필요합니다. (합성에 ${ENHANCE_COPY_COST}마리 소모)`;
    else if (!feathersOk) hint = `깃털이 부족합니다. (필요 ${cost.toLocaleString()})`;

    this.detailPanel.innerHTML = `
      <div class="detail-header">
        <div class="detail-bird-svg-container">${getBirdSVG(birdId, 60)}</div>
        <div class="detail-title-info">
          <h3>${template.name}</h3>
          <span class="grade-badge" style="color: ${GRADE_COLORS[template.grade]}">${GRADE_NAMES[template.grade]}</span>
          <div class="enhance-stars enhance-stars-lg">${formatEnhanceStars(enhance)}</div>
          <div class="detail-level">보유 ${owned.count}마리 · 강화 +${enhance}</div>
        </div>
      </div>
      <div class="detail-body">
        <div class="stat-row"><span>현재 피해 배율</span><span>×${curMult.toFixed(2)}</span></div>
        <div class="stat-row"><span>현재 기본 ATK</span><span>${Math.round(baseAtk * curMult)}</span></div>
        ${atMax ? '' : `
          <div class="stat-row"><span>합성 후 배율</span><span>×${nextMult.toFixed(2)} (+${Math.round(ENHANCE_ATK_BONUS * 100)}%)</span></div>
          <div class="stat-row"><span>합성 후 기본 ATK</span><span>${Math.round(baseAtk * nextMult)}</span></div>
          <div class="stat-row"><span>소모 새</span><span>같은 새 ${ENHANCE_COPY_COST}마리</span></div>
          <div class="stat-row"><span>소모 깃털</span><span>🪶 ${cost.toLocaleString()}</span></div>
        `}
        <p class="enhance-hint">${hint}</p>
        <button id="btn-enhance-bird" class="btn w-100 ${canFuse ? 'btn-success' : 'btn-secondary'}" ${canFuse ? '' : 'disabled'}>
          ${atMax ? '최대 강화' : '합성하여 강화'}
        </button>
      </div>
    `;

    const btn = document.getElementById('btn-enhance-bird');
    if (btn && canFuse) {
      btn.addEventListener('click', () => {
        const result = stateManager.enhanceBird(birdId);
        if (!result.ok) {
          const messages = {
            copies: '같은 새가 부족합니다.',
            feathers: '깃털이 부족합니다.',
            max: '이미 최대 강화입니다.'
          };
          alert(messages[result.reason] || '강화에 실패했습니다.');
          return;
        }
        this.render();
      });
    }
  }
}
