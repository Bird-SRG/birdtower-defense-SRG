/* Bird Tower Defense - Enhance Workshop (same-bird fusion) */

import {
  stateManager, BIRD_TEMPLATES, GRADE_NAMES, GRADE_COLORS, GRADES,
  ENHANCE_MAX, ENHANCE_COPY_COST, ENHANCE_ATK_BONUS,
  getEnhanceFeatherCost, getEnhanceMult, formatEnhanceStars,
  STAGE_MATERIAL_DROPS, FEED_RECIPES, FEED_EFFECTS, RUIN_EGG_RECIPE
} from './state.js';
import { getBirdSVG, soundEngine } from './assets.js';

export class EnhanceSystem {
  constructor() {
    this.grid = document.getElementById('enhance-bird-grid');
    this.detailPanel = document.getElementById('enhance-detail-panel');
    this.materialsRow = document.getElementById('feed-materials-row');
    this.recipeGrid = document.getElementById('feed-recipe-grid');
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
    this.renderFeedCraft();
    this.renderRuinEggCraft();
  }

  // --- 모이 제작소: 재료(스테이지 드롭) + 깃털 조합 ---
  renderFeedCraft() {
    if (!this.materialsRow || !this.recipeGrid) return;
    const state = stateManager.state;
    const materials = state.inventory.materials || {};
    const feeds = state.inventory.feeds || {};
    const materialTable = STAGE_MATERIAL_DROPS[1];

    this.materialsRow.innerHTML = materialTable.map(mat => `
      <div class="feed-material-badge" style="border-color: ${GRADE_COLORS[mat.grade]}66;">
        <span class="feed-material-icon">${mat.icon}</span>
        <span class="feed-material-name">${mat.name}</span>
        <span class="feed-material-count">${materials[mat.id] || 0}개</span>
      </div>
    `).join('');

    this.recipeGrid.innerHTML = '';
    Object.values(FEED_RECIPES).forEach(recipe => {
      const haveMaterial = materials[recipe.materialId] || 0;
      const haveFeathers = state.feathers;
      const materialOk = haveMaterial >= recipe.materialCost;
      const feathersOk = haveFeathers >= recipe.featherCost;
      const canCraft = materialOk && feathersOk;
      const matInfo = materialTable.find(m => m.id === recipe.materialId);

      const card = document.createElement('div');
      card.className = 'feed-recipe-card glass-panel';
      card.innerHTML = `
        <div class="feed-recipe-icon" style="filter: drop-shadow(0 0 10px ${GRADE_COLORS[recipe.grade]});">${recipe.icon}</div>
        <h4>${recipe.name}</h4>
        <span class="grade-badge" style="color: ${GRADE_COLORS[recipe.grade]}">${GRADE_NAMES[recipe.grade]}</span>
        <p class="feed-effect-text">${(FEED_EFFECTS[recipe.id] || {}).desc || ''}</p>
        <div class="feed-recipe-cost">
          <span class="${materialOk ? '' : 'cost-lack'}">${matInfo ? matInfo.icon : ''} ${recipe.materialCost}개 (보유 ${haveMaterial})</span>
          <span class="${feathersOk ? '' : 'cost-lack'}">🪶 ${recipe.featherCost}</span>
        </div>
        <div class="feed-recipe-owned">보유: ${feeds[recipe.id] || 0}개</div>
        <button class="btn ${canCraft ? 'btn-success' : 'btn-secondary'} btn-sm w-100" ${canCraft ? '' : 'disabled'}>제작하기</button>
      `;
      card.querySelector('button').addEventListener('click', () => this.craftFeed(recipe.id));
      this.recipeGrid.appendChild(card);
    });
  }

  craftFeed(feedId) {
    const recipe = FEED_RECIPES[feedId];
    const matInfo = STAGE_MATERIAL_DROPS[1].find(m => m.id === recipe.materialId);
    const matName = matInfo ? matInfo.name : recipe.materialId;
    if (!confirm(
      `[${recipe.name}]을(를) 제작합니다.\n\n소모: ${matName} ${recipe.materialCost}개 · 🪶 ${recipe.featherCost}개\n\n정말 제작하시겠습니까? 취소할 수 없습니다.`
    )) return;

    const result = stateManager.craftFeed(feedId);
    if (!result.ok) {
      const messages = {
        material: '재료가 부족합니다.',
        feathers: '깃털이 부족합니다.',
        invalid: '잘못된 레시피입니다.'
      };
      alert(messages[result.reason] || '제작에 실패했습니다.');
      return;
    }
    soundEngine.playHatch();
    this.render();
  }

  // --- 유적 알 제작소: 암시장에서 구매한 유적 조각 10개로 유적 알 1개 제작 ---
  renderRuinEggCraft() {
    const grid = document.getElementById('ruin-egg-recipe-grid');
    if (!grid) return;
    const state = stateManager.state;
    const have = (state.inventory.materials || {}).ruin_fragment || 0;
    const canCraft = have >= RUIN_EGG_RECIPE.materialCost;
    const owned = state.inventory.ruinEggs || 0;

    grid.innerHTML = `
      <div class="feed-recipe-card glass-panel">
        <div class="feed-recipe-icon">🗿➜🥚</div>
        <h4>유적 알</h4>
        <p class="feed-effect-text">에픽~영광스러운 등급의 암시장 전용 새를 뽑을 수 있는 알</p>
        <div class="feed-recipe-cost">
          <span class="${canCraft ? '' : 'cost-lack'}">🗿 ${RUIN_EGG_RECIPE.materialCost}개 (보유 ${have})</span>
        </div>
        <div class="feed-recipe-owned">보유: ${owned}개</div>
        <button class="btn ${canCraft ? 'btn-success' : 'btn-secondary'} btn-sm w-100" ${canCraft ? '' : 'disabled'}>제작하기</button>
      </div>
    `;
    grid.querySelector('button').addEventListener('click', () => this.craftRuinEgg());
  }

  craftRuinEgg() {
    if (!confirm(`유적 조각 ${RUIN_EGG_RECIPE.materialCost}개를 소모해 [유적 알]을 제작합니다.\n\n정말 제작하시겠습니까? 취소할 수 없습니다.`)) return;

    const result = stateManager.craftRuinEgg();
    if (!result.ok) {
      alert('유적 조각이 부족합니다.');
      return;
    }
    soundEngine.playHatch();
    this.render();
  }

  renderList() {
    if (!this.grid) return;
    this.grid.innerHTML = '';
    const state = stateManager.state;
    let owned = state.ownedBirds.filter(b => b.count > 0);

    if (this.activeGradeFilter !== 'all') {
      owned = owned.filter(b => BIRD_TEMPLATES[b.birdId]?.grade === this.activeGradeFilter);
    }

    const order = [GRADES.NORMAL, GRADES.UNCOMMON, GRADES.RARE, GRADES.EPIC, GRADES.LEGENDARY, GRADES.MYTHIC, GRADES.GLORIOUS];
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
