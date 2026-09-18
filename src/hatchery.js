/* Bird Tower Defense - Hatchery & Gacha System (Full GDD Specification) */

import { stateManager, EGG_GACHA_PROBS, SEED_BOX_GACHA_PROBS, BIRD_TEMPLATES, CROPS, GRADES, GRADE_NAMES, GRADE_COLORS, FEED_RECIPES, FEED_REGURGITATE_COST, FEED_EFFECTS } from './state.js';
import { getEggSVG, getSeedPacketSVG, getBirdSVG, soundEngine } from './assets.js';

export class HatcherySystem {
  constructor() {
    this.container = document.getElementById('egg-inventory-list');
    this.bgm = new Audio('Hatchery Rush.mp3');
    this.bgm.loop = true;
    this.isPlaying = false;

    this.hatchModal = document.getElementById('hatch-result-modal');
    this.hatchStageEgg = document.getElementById('hatch-stage-egg');
    this.hatchEggVisual = document.getElementById('hatch-egg-visual');
    this.hatchEggLabel = document.getElementById('hatch-egg-label');
    this.hatchStageReveal = document.getElementById('hatch-stage-reveal');
    this.hatchBirdSvg = document.getElementById('hatch-bird-svg');
    this.hatchGradeBadge = document.getElementById('hatch-grade-badge');
    this.hatchBirdName = document.getElementById('hatch-bird-name');
    this.hatchBirdDesc = document.getElementById('hatch-bird-desc');
    this.hatchCloseBtn = document.getElementById('hatch-close-btn');
  }

  init() {
    this.render();
    this.initBGMControls();
    this.initHatchModal();
    this.initFeedModals();
  }

  // --- 모이 아이템 칸 & 먹이기 흐름 ---
  initFeedModals() {
    this.feedGrid = document.getElementById('feed-inventory-grid');
    this.feedUseModal = document.getElementById('feed-use-modal');
    this.feedConfirmModal = document.getElementById('feed-confirm-modal');
    this.pendingFeed = null;   // 사용하려는 모이 id
    this.pendingEntry = null;  // 먹일 대상 새 entry id

    const closeUse = document.getElementById('feed-use-close');
    if (closeUse) closeUse.addEventListener('click', () => this.feedUseModal.classList.add('hidden'));
    if (this.feedUseModal) {
      this.feedUseModal.addEventListener('click', (e) => {
        if (e.target === this.feedUseModal) this.feedUseModal.classList.add('hidden');
      });
    }

    const yes = document.getElementById('feed-confirm-yes');
    const no = document.getElementById('feed-confirm-no');
    if (no) no.addEventListener('click', () => this.feedConfirmModal.classList.add('hidden'));
    if (yes) yes.addEventListener('click', () => this.confirmFeed());
  }

  renderFeedInventory() {
    if (!this.feedGrid) return;
    const feeds = stateManager.state.inventory.feeds || {};
    this.feedGrid.innerHTML = '';

    // 제작 가능한 모이(FEED_RECIPES)든 암시장 전용 모이(FEED_EFFECTS에만 등록)든 보유 중이면 전부 표시
    const owned = Object.keys(FEED_EFFECTS).filter(id => (feeds[id] || 0) > 0);
    if (owned.length === 0) {
      this.feedGrid.innerHTML = '<p class="feed-inventory-empty">보유한 아이템이 없습니다. 강화소의 모이 제작소에서 모이를 만들어보세요!</p>';
      return;
    }

    owned.forEach(feedId => {
      const info = FEED_EFFECTS[feedId];
      const card = document.createElement('div');
      card.className = 'shop-item feed-item glass-panel';
      card.innerHTML = `
        <div class="shop-item-icon" style="font-size: 40px; filter: drop-shadow(0 0 10px ${GRADE_COLORS[info.grade]});">${info.icon}</div>
        <h4>${info.name}</h4>
        <span class="grade-badge" style="color:${GRADE_COLORS[info.grade]}">${GRADE_NAMES[info.grade]}</span>
        <p class="feed-effect-text">${info.desc || ''}</p>
        <p>보유: <b>${feeds[feedId]}개</b></p>
        <button class="btn btn-success btn-sm w-100 btn-use-feed">사용</button>
      `;
      card.querySelector('.btn-use-feed').addEventListener('click', () => this.openFeedUse(feedId));
      this.feedGrid.appendChild(card);
    });
  }

  // --- 유적 알 아이템 칸 ---
  renderRuinEggInventory() {
    const grid = document.getElementById('ruin-egg-inventory-grid');
    if (!grid) return;
    const count = stateManager.state.inventory.ruinEggs || 0;
    grid.innerHTML = '';
    if (count <= 0) {
      grid.innerHTML = '<p class="feed-inventory-empty">보유한 유적 알이 없습니다. 강화소에서 유적 조각 10개로 제작해보세요!</p>';
      return;
    }
    const card = document.createElement('div');
    card.className = 'shop-item feed-item glass-panel';
    card.innerHTML = `
      <div class="shop-item-icon" style="font-size: 40px;">🗿</div>
      <h4>유적 알</h4>
      <p>보유: <b>${count}개</b></p>
      <button class="btn btn-success btn-sm w-100 btn-open-ruin-egg">열기</button>
    `;
    card.querySelector('.btn-open-ruin-egg').addEventListener('click', () => this.openRuinEggUI());
    grid.appendChild(card);
  }

  openRuinEggUI() {
    const result = stateManager.openRuinEgg();
    if (!result.ok) {
      alert('보유한 유적 알이 없습니다.');
      return;
    }
    const template = BIRD_TEMPLATES[result.birdId];
    this.playHatchAnimation(GRADES.LEGENDARY, template.grade, template);
    stateManager.save();
    this.render();
  }

  openFeedUse(feedId) {
    this.pendingFeed = feedId;
    const recipe = FEED_EFFECTS[feedId];
    document.getElementById('feed-use-title').textContent = `${recipe.icon} ${recipe.name} 사용`;
    const effectDesc = recipe.desc || '';
    document.getElementById('feed-use-desc').innerHTML =
      `효과: <b style="color:${GRADE_COLORS[recipe.grade]}">${effectDesc}</b><br>` +
      '모이를 먹일 새를 선택하세요. 새 한 마리당 모이는 하나만 먹일 수 있습니다.';

    const grid = document.getElementById('feed-use-bird-grid');
    grid.innerHTML = '';
    const state = stateManager.state;
    const list = state.ownedBirds.filter(b => b.count > 0 && BIRD_TEMPLATES[b.birdId]);

    if (list.length === 0) {
      grid.innerHTML = '<p class="deck-owned-empty">보유한 새가 없습니다.</p>';
    }

    list.forEach(entry => {
      const template = BIRD_TEMPLATES[entry.birdId];
      const fed = !!entry.feed;
      const card = document.createElement('div');
      card.className = `bird-card glass-panel ${fed ? 'fed-bird' : ''}`;
      card.innerHTML = `
        <div class="bird-card-svg">${getBirdSVG(entry.birdId, 44)}</div>
        <div class="bird-card-name">${template.name}</div>
        <div class="bird-card-grade" style="color:${GRADE_COLORS[template.grade]}; font-size:11px;">${GRADE_NAMES[template.grade]}</div>
        <div class="bird-card-level">보유 ${entry.count}마리</div>
        ${fed ? `<div class="bird-fed-badge">${entry.feed.icon} ${entry.feed.name}</div>` : ''}
      `;
      card.addEventListener('click', () => {
        if (fed) {
          this.promptRegurgitate(entry);
          return;
        }
        this.pendingEntry = entry.id;
        document.getElementById('feed-confirm-text').innerHTML =
          `<b>${template.name}</b>에게 <b>${recipe.name}</b>을(를) 먹입니다.<br>` +
          `<span style="color:${GRADE_COLORS[recipe.grade]}">${effectDesc}</span><br><br>` +
          `계속하시겠습니까?<br>나중에 새로운 모이를 먹이려면 비용을 내고 토해 내야 합니다.`;
        this.feedConfirmModal.classList.remove('hidden');
      });
      grid.appendChild(card);
    });

    this.feedUseModal.classList.remove('hidden');
  }

  confirmFeed() {
    this.feedConfirmModal.classList.add('hidden');
    const result = stateManager.feedBirdEntry(this.pendingEntry, this.pendingFeed);
    if (!result.ok) {
      const msgs = {
        noFeed: '해당 모이를 보유하고 있지 않습니다.',
        alreadyFed: '이 새는 이미 모이를 먹었습니다.',
        missing: '대상 새를 찾을 수 없습니다.',
        invalid: '잘못된 모이입니다.'
      };
      alert(msgs[result.reason] || '모이를 먹이지 못했습니다.');
      return;
    }
    soundEngine.playHatch();
    this.render();
    // 남은 모이가 있으면 목록을 갱신해서 계속 사용 가능
    const remaining = (stateManager.state.inventory.feeds || {})[this.pendingFeed] || 0;
    if (remaining > 0) this.openFeedUse(this.pendingFeed);
    else this.feedUseModal.classList.add('hidden');
  }

  promptRegurgitate(entry) {
    const cost = FEED_REGURGITATE_COST[entry.feed.grade] || 100;
    const hasFreeTicket = (stateManager.state.freeRegurgitateTickets || 0) > 0;
    const template = BIRD_TEMPLATES[entry.birdId];
    const costLine = hasFreeTicket
      ? '비용: 🎫 무료 토해내기권 1장 사용'
      : `비용: 🪶 ${cost.toLocaleString()}개`;
    const ok = confirm(
      `${template.name}이(가) 먹은 [${entry.feed.name}]을(를) 토해내게 할까요?\n\n${costLine}\n(토해내면 새 모이를 다시 먹일 수 있습니다)`
    );
    if (!ok) return;

    const result = stateManager.regurgitateFeed(entry.id);
    if (!result.ok) {
      if (result.reason === 'feathers') alert(`깃털이 부족합니다! (필요 🪶 ${result.cost.toLocaleString()}개)`);
      else alert('토해내지 못했습니다.');
      return;
    }
    soundEngine.playCoin();
    if (result.usedFreeTicket) alert('🎫 무료 토해내기권을 사용했습니다!');
    this.render();
    this.openFeedUse(this.pendingFeed);
  }

  initHatchModal() {
    if (this.hatchCloseBtn) {
      this.hatchCloseBtn.addEventListener('click', () => this.closeHatchModal());
    }
    if (this.hatchModal) {
      this.hatchModal.addEventListener('click', (e) => {
        if (e.target === this.hatchModal) this.closeHatchModal();
      });
    }
  }

  closeHatchModal() {
    if (this.hatchModal) this.hatchModal.classList.add('hidden');
  }

  // --- 알 부화 연출: 알이 흔들리다 터지며 새 등급/이미지가 드러남 ---
  playHatchAnimation(eggGrade, rolledGrade, chosenBird) {
    if (!this.hatchModal) return;

    this.hatchEggVisual.classList.remove('hatch-egg-pop');
    this.hatchEggVisual.innerHTML = getEggSVG(eggGrade, 100);
    if (this.hatchEggLabel) this.hatchEggLabel.textContent = '부화 중...';
    this.hatchStageEgg.classList.remove('hidden');
    this.hatchStageReveal.classList.add('hidden');
    this.hatchModal.classList.remove('hidden');

    setTimeout(() => {
      this.hatchEggVisual.classList.add('hatch-egg-pop');
      soundEngine.playHatch();
    }, 1000);

    setTimeout(() => {
      this.hatchStageEgg.classList.add('hidden');

      const gradeColor = GRADE_COLORS[rolledGrade];
      this.hatchBirdSvg.innerHTML = getBirdSVG(chosenBird.id, 96);
      this.hatchBirdSvg.style.color = gradeColor;
      this.hatchGradeBadge.textContent = GRADE_NAMES[rolledGrade];
      this.hatchGradeBadge.style.color = gradeColor;
      this.hatchBirdName.textContent = chosenBird.name;
      this.hatchBirdDesc.textContent = chosenBird.desc;

      this.hatchStageReveal.classList.remove('hidden');
    }, 1400);
  }

  initBGMControls() {
    this.btnPlay = document.getElementById('btn-bgm-play');
    this.volumeSlider = document.getElementById('bgm-volume');
    this.iconPlay = document.getElementById('bgm-icon');

    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => {
        if (this.isPlaying) {
          this.pauseBGM();
        } else {
          this.playBGM();
        }
      });
    }

    if (this.volumeSlider) {
      this.bgm.volume = parseFloat(this.volumeSlider.value);
      this.volumeSlider.addEventListener('input', (e) => {
        this.bgm.volume = parseFloat(e.target.value);
      });
    }

    this.bgm.addEventListener('play', () => {
      this.isPlaying = true;
      if (this.btnPlay) this.btnPlay.textContent = '일시정지';
      if (this.iconPlay) this.iconPlay.classList.add('playing');
    });

    this.bgm.addEventListener('pause', () => {
      this.isPlaying = false;
      if (this.btnPlay) this.btnPlay.textContent = '재생';
      if (this.iconPlay) this.iconPlay.classList.remove('playing');
    });
  }

  playBGM() {
    this.bgm.play()
      .then(() => {
        this.isPlaying = true;
        if (this.btnPlay) this.btnPlay.textContent = '일시정지';
        if (this.iconPlay) this.iconPlay.classList.add('playing');
      })
      .catch((err) => {
        console.log("Autoplay blocked or audio error:", err);
        this.isPlaying = false;
        if (this.btnPlay) this.btnPlay.textContent = '재생';
        if (this.iconPlay) this.iconPlay.classList.remove('playing');
      });
  }

  pauseBGM() {
    this.bgm.pause();
    this.isPlaying = false;
    if (this.btnPlay) this.btnPlay.textContent = '재생';
    if (this.iconPlay) this.iconPlay.classList.remove('playing');
  }

  render() {
    this.renderFeedInventory();
    this.renderRuinEggInventory();
    if (!this.container) return;
    this.container.innerHTML = '';
    const state = stateManager.state;
    const eggs = state.inventory.eggs;

    let totalEggs = 0;
    for (let gKey in eggs) {
      const count = eggs[gKey] || 0;
      totalEggs += count;
      if (count > 0) {
        const card = document.createElement('div');
        card.className = 'egg-card glass-panel';
        card.innerHTML = `
          <div class="egg-icon">${getEggSVG(gKey, 56)}</div>
          <h4>${GRADE_NAMES[gKey]} 알</h4>
          <p>보유: <b>${count}개</b></p>
          <button class="btn btn-success btn-sm btn-hatch" data-grade="${gKey}">부화하기</button>
        `;
        card.querySelector('.btn-hatch').addEventListener('click', () => this.hatchEgg(gKey));
        this.container.appendChild(card);
      }
    }

    if (totalEggs === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'color:var(--text-muted); padding:1rem; grid-column: 1/-1;';
      emptyMsg.textContent = '보유 중인 알이 없습니다. 상점에서 깃털로 알을 구매하세요!';
      this.container.appendChild(emptyMsg);
    }

    // --- 씨앗 상자 섹션 ---
    const seedBoxes = state.inventory.seedBoxes || {};
    let totalBoxes = 0;
    for (let gKey in seedBoxes) {
      totalBoxes += (seedBoxes[gKey] || 0);
    }

    if (totalBoxes > 0) {
      const divider = document.createElement('div');
      divider.style.cssText = 'grid-column: 1/-1; border-top: 1px solid var(--border-glow); margin: 1rem 0; padding-top: 1rem;';
      divider.innerHTML = '<h3 style="margin:0;">🎁 씨앗 상자 개봉</h3><p style="color:var(--text-muted);font-size:0.85rem;margin:4px 0 0;">씨앗 상자를 개봉하여 랜덤 작물 씨앗을 획득하세요!</p>';
      this.container.appendChild(divider);

      for (let gKey in seedBoxes) {
        const count = seedBoxes[gKey] || 0;
        if (count > 0) {
          const card = document.createElement('div');
          card.className = 'egg-card glass-panel';
          card.innerHTML = `
            <div class="egg-icon">${getSeedPacketSVG(gKey, 56)}</div>
            <h4>${GRADE_NAMES[gKey]} 씨앗 상자</h4>
            <p>보유: <b>${count}개</b></p>
            <button class="btn btn-success btn-sm btn-open-box" data-grade="${gKey}">개봉하기</button>
          `;
          card.querySelector('.btn-open-box').addEventListener('click', () => this.openSeedBox(gKey));
          this.container.appendChild(card);
        }
      }
    }
  }

  // --- 씨앗 상자 개봉 연출: 상자가 흔들리다 터지며 작물 등급/아이콘이 드러남 ---
  playBoxOpenAnimation(boxGrade, crop) {
    if (!this.hatchModal) return;

    this.hatchEggVisual.classList.remove('hatch-egg-pop');
    this.hatchEggVisual.innerHTML = getSeedPacketSVG(boxGrade, 100);
    if (this.hatchEggLabel) this.hatchEggLabel.textContent = '여는 중...';
    this.hatchStageEgg.classList.remove('hidden');
    this.hatchStageReveal.classList.add('hidden');
    this.hatchModal.classList.remove('hidden');

    setTimeout(() => {
      this.hatchEggVisual.classList.add('hatch-egg-pop');
      soundEngine.playHatch();
    }, 1000);

    setTimeout(() => {
      this.hatchStageEgg.classList.add('hidden');

      const gradeColor = GRADE_COLORS[crop.grade];
      this.hatchBirdSvg.innerHTML = `<span class="hatch-crop-icon">${crop.icon}</span>`;
      this.hatchBirdSvg.style.color = gradeColor;
      this.hatchGradeBadge.textContent = GRADE_NAMES[crop.grade];
      this.hatchGradeBadge.style.color = gradeColor;
      this.hatchBirdName.textContent = crop.name + ' 씨앗';
      this.hatchBirdDesc.textContent = `판매가 ${crop.minSell}~${crop.maxSell}🪙 · 성장 ${crop.growSec}초`;

      this.hatchStageReveal.classList.remove('hidden');
    }, 1400);
  }

  // --- 씨앗 상자 개봉 ---
  openSeedBox(boxGrade) {
    const state = stateManager.state;
    if (!state.inventory.seedBoxes) return;
    if ((state.inventory.seedBoxes[boxGrade] || 0) <= 0) return;

    // 1개 소모
    state.inventory.seedBoxes[boxGrade]--;

    // 결과 등급 가챠 롤 (SEED_BOX_GACHA_PROBS 사용)
    const probTable = SEED_BOX_GACHA_PROBS[boxGrade] || SEED_BOX_GACHA_PROBS[GRADES.NORMAL];
    const rolledGrade = this.rollGrade(probTable);

    // 해당 등급 내의 작물 무작위 선택 (없으면 전체에서 선택)
    const matchingCrops = Object.keys(CROPS).filter(cKey => CROPS[cKey].grade === rolledGrade);
    const pool = matchingCrops.length > 0 ? matchingCrops : Object.keys(CROPS);
    const chosenCropId = pool[Math.floor(Math.random() * pool.length)];
    const crop = CROPS[chosenCropId];
    state.inventory.seeds[chosenCropId] = (state.inventory.seeds[chosenCropId] || 0) + 1;

    // 개봉 연출: 상자가 흔들리다 터지며 작물 등급/아이콘이 드러남
    this.playBoxOpenAnimation(boxGrade, crop);

    stateManager.save();
    this.render();
  }

  hatchEgg(eggGrade) {
    const state = stateManager.state;
    if ((state.inventory.eggs[eggGrade] || 0) <= 0) return;

    // 1개 소모
    state.inventory.eggs[eggGrade]--;

    // 1. 결과 새 등급 가챠 롤 (Section 8)
    const probTable = EGG_GACHA_PROBS[eggGrade] || EGG_GACHA_PROBS[GRADES.NORMAL];
    const rolledGrade = this.rollGrade(probTable);

    // 2. 해당 등급 내의 새 무작위 선택
    const matchingBirds = Object.keys(BIRD_TEMPLATES).filter(bKey => BIRD_TEMPLATES[bKey].grade === rolledGrade);
    const chosenBirdId = matchingBirds[Math.floor(Math.random() * matchingBirds.length)];
    const chosenBird = BIRD_TEMPLATES[chosenBirdId];

    // 인벤토리에 새 추가
    stateManager.addBird(chosenBirdId);

    // 부화 연출: 알이 흔들리다 터지며 새 등급/이미지가 드러남
    this.playHatchAnimation(eggGrade, rolledGrade, chosenBird);

    stateManager.save();
    this.render();
  }

  rollGrade(probTable) {
    const rand = Math.random();
    let cum = 0;
    for (let gKey in probTable) {
      cum += probTable[gKey];
      if (rand <= cum) return gKey;
    }
    return GRADES.NORMAL;
  }
}
