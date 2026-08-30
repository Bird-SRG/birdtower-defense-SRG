/* Bird Tower Defense - Battle Deck Builder */

import { stateManager, BIRD_TEMPLATES, GRADES, GRADE_NAMES, GRADE_COLORS, MAX_DECK_SIZE } from './state.js';
import { getBirdSVG } from './assets.js';

export class DeckSystem {
  constructor() {
    this.slotsRow = document.getElementById('deck-slots-row');
    this.ownedGrid = document.getElementById('owned-bird-grid');
    this.countLabel = document.getElementById('deck-count-label');
    this.activeGradeFilter = 'all';
  }

  init() {
    this.initEvents();
    this.render();
  }

  initEvents() {
    const filterBtns = document.querySelectorAll('#tab-deck .filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeGradeFilter = btn.dataset.grade;
        this.renderOwnedList();
      });
    });
  }

  render() {
    this.renderSlots();
    this.renderOwnedList();
  }

  renderSlots() {
    if (!this.slotsRow) return;
    this.slotsRow.innerHTML = '';
    const state = stateManager.state;

    if (this.countLabel) {
      this.countLabel.textContent = `${state.deck.length} / ${MAX_DECK_SIZE}`;
    }

    for (let i = 0; i < MAX_DECK_SIZE; i++) {
      const birdId = state.deck[i];
      const slot = document.createElement('div');
      slot.className = `deck-builder-slot ${birdId ? 'filled' : 'empty'}`;

      if (birdId) {
        const template = BIRD_TEMPLATES[birdId];
        const owned = state.ownedBirds.find(b => b.birdId === birdId);
        slot.innerHTML = `
          <div class="deck-builder-slot-svg">${getBirdSVG(birdId, 48)}</div>
          <div class="deck-builder-slot-name">${template ? template.name : birdId}</div>
          <div class="deck-builder-slot-grade" style="color: ${template ? GRADE_COLORS[template.grade] : ''}">${template ? GRADE_NAMES[template.grade] : ''}</div>
          <div class="deck-builder-slot-count">보유 ${owned ? owned.count : 0}마리</div>
          <button type="button" class="btn btn-danger btn-sm deck-unequip-btn">해제</button>
        `;
        slot.querySelector('.deck-unequip-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.tryToggle(birdId);
        });
      } else {
        slot.innerHTML = `
          <div class="deck-builder-slot-empty-num">${i + 1}</div>
          <div class="deck-builder-slot-empty-label">빈 슬롯</div>
        `;
      }

      this.slotsRow.appendChild(slot);
    }
  }

  renderOwnedList() {
    if (!this.ownedGrid) return;
    this.ownedGrid.innerHTML = '';
    const state = stateManager.state;
    const owned = state.ownedBirds.filter(b => b.count > 0);

    let list = owned.slice();
    if (this.activeGradeFilter !== 'all') {
      list = list.filter(b => BIRD_TEMPLATES[b.birdId]?.grade === this.activeGradeFilter);
    }

    list.sort((a, b) => {
      const ga = BIRD_TEMPLATES[a.birdId]?.grade || GRADES.NORMAL;
      const gb = BIRD_TEMPLATES[b.birdId]?.grade || GRADES.NORMAL;
      const order = [GRADES.NORMAL, GRADES.UNCOMMON, GRADES.RARE, GRADES.EPIC, GRADES.LEGENDARY, GRADES.MYTHIC];
      return order.indexOf(ga) - order.indexOf(gb);
    });

    if (list.length === 0) {
      this.ownedGrid.innerHTML = '<p class="deck-owned-empty">표시할 보유 새가 없습니다.</p>';
      return;
    }

    list.forEach(ownedBird => {
      const birdId = ownedBird.birdId;
      const template = BIRD_TEMPLATES[birdId];
      if (!template) return;

      const isEquipped = state.deck.includes(birdId);
      const card = document.createElement('div');
      card.className = `bird-card glass-panel ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="bird-card-svg">${getBirdSVG(birdId, 44)}</div>
        <div class="bird-card-name">${template.name}</div>
        <div class="bird-card-grade" style="color: ${GRADE_COLORS[template.grade]}; font-size: 11px;">${GRADE_NAMES[template.grade]}</div>
        <div class="bird-card-level">보유 ${ownedBird.count}마리</div>
      `;

      card.addEventListener('click', () => this.tryToggle(birdId));
      this.ownedGrid.appendChild(card);
    });
  }

  tryToggle(birdId) {
    const state = stateManager.state;
    const isEquipped = state.deck.includes(birdId);

    if (isEquipped && state.deck.length <= 1) {
      alert('전투 덱에는 최소 1마리가 필요합니다.');
      return;
    }
    if (!isEquipped && state.deck.length >= MAX_DECK_SIZE) {
      alert(`덱에는 서로 다른 새를 최대 ${MAX_DECK_SIZE}마리까지 장착할 수 있습니다.`);
      return;
    }

    stateManager.toggleDeck(birdId);
    this.render();
  }
}
