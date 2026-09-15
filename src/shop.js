/* Bird Tower Defense - 6-Slot Dynamic Shop System (Full GDD Specification) */

import { stateManager, EGG_PRICES, SHOP_EGG_SLOT_PROBS, SEED_BOX_GACHA_PROBS, GRADES, GRADE_NAMES, CROPS, BLACK_MARKET_ITEMS, WEATHER_TYPES } from './state.js';
import { getEggSVG, getSeedPacketSVG, getReaperBirdSVG, soundEngine } from './assets.js';

const REAPER_LINE = '쉿, 조용히 해. 걸리면 우리 모두에게 좋을 게 없어.';

const BLACK_MARKET_APPEAR_CHANCE = 0.25; // 확인 주기마다 등장할 확률
const BLACK_MARKET_CHECK_INTERVAL = 60;  // 등장 여부를 굴리는 주기 (초)
const BLACK_MARKET_DURATION = 180;       // 한 번 등장하면 유지되는 시간 (초)

export class ShopSystem {
  constructor() {
    this.container = document.getElementById('shop-slots-container');
    this.resetBtn = document.getElementById('btn-reset-shop');
    this.blackMarketContainer = document.getElementById('black-market-container');
  }

  init() {
    const state = stateManager.state;
    if (!state.shopItems || state.shopItems.length === 0 || state.shopItems.some(i => i.type === 'seed')) {
      this.generateShopItems();
    }
    if (!state.blackMarket) {
      state.blackMarket = { active: false, timeLeft: 0, nextCheckIn: BLACK_MARKET_CHECK_INTERVAL, items: [] };
    }
    this.render();
    this.initBlackMarket();
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetShop());
    }
  }

  // --- 암시장: 일정 확률로 등장하는 한정 상인 ---
  initBlackMarket() {
    const modal = document.getElementById('black-market-modal');
    const closeBtn = document.getElementById('black-market-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeBlackMarketModal());

    // 암시장 NPC(사신 새) — 클릭하면 대사 표시
    const npcArt = document.getElementById('black-market-npc-art');
    if (npcArt) npcArt.innerHTML = getReaperBirdSVG(110);
    const npc = document.getElementById('black-market-npc');
    if (npc) npc.addEventListener('click', () => this.talkToReaper());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeBlackMarketModal();
      });
    }
    this.renderBlackMarket();
    setInterval(() => {
      const bm = stateManager.state.blackMarket;
      let changed = false;

      if (bm.active) {
        bm.timeLeft--;
        if (bm.timeLeft <= 0) {
          bm.active = false;
          bm.items = [];
          bm.nextCheckIn = BLACK_MARKET_CHECK_INTERVAL;
          changed = true;
        }
      } else {
        bm.nextCheckIn--;
        if (bm.nextCheckIn <= 0) {
          bm.nextCheckIn = BLACK_MARKET_CHECK_INTERVAL;
          if (Math.random() < BLACK_MARKET_APPEAR_CHANCE) {
            bm.active = true;
            bm.timeLeft = BLACK_MARKET_DURATION;
            bm.items = Object.keys(BLACK_MARKET_ITEMS);
          }
          changed = true;
        }
      }

      if (changed) stateManager.save();
      this.renderBlackMarket();
    }, 1000);
  }

  // 상점 탭에는 진입 배너만 표시하고, 실제 매대는 모달로 연다
  renderBlackMarket() {
    if (!this.blackMarketContainer) return;
    const bm = stateManager.state.blackMarket;
    this.blackMarketContainer.innerHTML = '';

    if (!bm.active) {
      const mins = Math.floor(bm.nextCheckIn / 60);
      const secs = bm.nextCheckIn % 60;
      this.blackMarketContainer.classList.remove('black-market-live');
      this.blackMarketContainer.innerHTML = `
        <div class="black-market-teaser">
          🕵️ 암시장은 일정 확률로 나타납니다. 다음 등장 판정까지: <b>${mins}:${secs < 10 ? '0' : ''}${secs}</b>
        </div>
      `;
      this.closeBlackMarketModal();
      return;
    }

    this.blackMarketContainer.classList.add('black-market-live');
    const mins = Math.floor(bm.timeLeft / 60);
    const secs = bm.timeLeft % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const banner = document.createElement('button');
    banner.type = 'button';
    banner.className = 'black-market-enter';
    banner.innerHTML = `
      <span class="black-market-enter-icon">🕵️</span>
      <span class="black-market-enter-text">
        <b>암시장이 나타났습니다!</b>
        <small>클릭해서 들어가기 · 남은 시간 ⏳ ${timeStr}</small>
      </span>
      <span class="black-market-enter-arrow">›</span>
    `;
    banner.addEventListener('click', () => this.openBlackMarketModal());
    this.blackMarketContainer.appendChild(banner);

    // 모달이 열려 있으면 내용(남은 시간 등)도 갱신
    const modal = document.getElementById('black-market-modal');
    if (modal && !modal.classList.contains('hidden')) this.renderBlackMarketModal();
  }

  openBlackMarketModal() {
    const modal = document.getElementById('black-market-modal');
    if (!modal) return;
    this.renderBlackMarketModal();
    const bubble = document.getElementById('black-market-npc-bubble');
    if (bubble) bubble.classList.add('hidden');
    modal.classList.remove('hidden');
  }

  // 사신 새에게 말 걸기
  talkToReaper() {
    const bubble = document.getElementById('black-market-npc-bubble');
    if (!bubble) return;
    bubble.textContent = REAPER_LINE;
    bubble.classList.remove('hidden');
    // 살짝 튀는 연출 재생
    bubble.classList.remove('npc-bubble-pop');
    void bubble.offsetWidth;
    bubble.classList.add('npc-bubble-pop');
  }

  closeBlackMarketModal() {
    const modal = document.getElementById('black-market-modal');
    if (modal) modal.classList.add('hidden');
  }

  renderBlackMarketModal() {
    const bm = stateManager.state.blackMarket;
    const grid = document.getElementById('black-market-modal-grid');
    const timer = document.getElementById('black-market-modal-timer');
    if (!grid) return;

    const mins = Math.floor(bm.timeLeft / 60);
    const secs = bm.timeLeft % 60;
    if (timer) timer.textContent = `⏳ ${mins}:${secs < 10 ? '0' : ''}${secs}`;

    grid.innerHTML = '';
    bm.items.forEach(itemId => {
      const item = BLACK_MARKET_ITEMS[itemId];
      if (!item) return;
      const card = document.createElement('div');
      card.className = 'shop-item black-market-item glass-panel';
      card.innerHTML = `
        <div class="shop-item-icon" style="font-size: 40px;">${item.icon}</div>
        <h4>${item.name}</h4>
        <p>${item.desc}</p>
        <button class="btn btn-danger btn-buy-black-market" data-item="${itemId}">💜 ${item.price}</button>
      `;
      card.querySelector('.btn-buy-black-market').addEventListener('click', () => this.buyBlackMarketItem(itemId));
      grid.appendChild(card);
    });
  }

  buyBlackMarketItem(itemId) {
    const item = BLACK_MARKET_ITEMS[itemId];
    if (!item) return;
    const state = stateManager.state;

    if (!confirm(`[${item.name}]을(를) 💜 ${item.price}개에 구매합니다.\n\n정말 구매하시겠습니까? 취소할 수 없습니다.`)) return;

    if (!stateManager.spendStrangeGems(item.price)) {
      alert(`💜 이상한 보석이 부족합니다! (필요 ${item.price}개 / 보유 ${state.strangeGems || 0}개)`);
      return;
    }

    if (itemId === 'weather_changer') {
      // 확률표에 따라 즉시 새로운 날씨로 재추첨 (원하는 날씨 지정 등 세부 효과는 추후 확장)
      const rand = Math.random();
      let cumulative = 0;
      let nextWeather = WEATHER_TYPES.sunny;
      for (let wKey in WEATHER_TYPES) {
        cumulative += WEATHER_TYPES[wKey].chance;
        if (rand <= cumulative) {
          nextWeather = WEATHER_TYPES[wKey];
          break;
        }
      }
      state.currentWeather = nextWeather.id;
      state.weatherTimer = 1200;
      alert(`🌦️ 날씨 조작기 사용! 날씨가 [${nextWeather.icon} ${nextWeather.name}](으)로 바뀌었습니다!`);
    }

    soundEngine.playCoin();
    stateManager.save();
    this.renderBlackMarketModal();
  }

  generateShopItems() {
    const state = stateManager.state;
    const items = [];

    // 칸 1~3: 알 (3칸) - 6-2 확률표 적용
    for (let i = 0; i < 3; i++) {
      const grade = this.rollGrade(SHOP_EGG_SLOT_PROBS);
      items.push({
        type: 'egg',
        grade,
        price: EGG_PRICES[grade] || 50
      });
    }

    // 칸 4~6: 씨앗 상자만 등장 (3칸) - 특정 씨앗 제외
    for (let i = 0; i < 3; i++) {
      const grade = this.rollGrade(SHOP_EGG_SLOT_PROBS);
      const price = Math.round((EGG_PRICES[grade] || 50) * 0.2);
      items.push({
        type: 'seed_box',
        grade,
        price
      });
    }

    state.shopItems = items;
    stateManager.save();
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

  resetShop() {
    const state = stateManager.state;
    if (state.dailyResetCount >= 5) {
      alert('1일 최대 새로고침 횟수(5회)를 초과했습니다!');
      return;
    }
    const featherCost = (state.dailyResetCount + 1) * 50;
    if (confirm(`상점을 새로고침 하시겠습니까? (비용: 🪶 ${featherCost}개, 남은 횟수: ${5 - state.dailyResetCount}회)`)) {
      if (stateManager.spendFeathers(featherCost)) {
        state.dailyResetCount++;
        this.generateShopItems();
        soundEngine.playHatch();
        this.render();
      } else {
        alert('깃털이 부족합니다!');
      }
    }
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    const state = stateManager.state;

    state.shopItems.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'shop-item glass-panel';

      if (item.type === 'egg') {
        card.innerHTML = `
          <div class="shop-item-icon">${getEggSVG(item.grade, 50)}</div>
          <h4>${GRADE_NAMES[item.grade]} 알</h4>
          <p>${GRADE_NAMES[item.grade]} 등급 알 (새 부화)</p>
          <button class="btn btn-primary btn-buy" data-index="${index}">🪶 ${item.price}</button>
        `;
      } else if (item.type === 'seed') {
        const crop = CROPS[item.cropId] || CROPS.carrot;
        card.innerHTML = `
          <div class="shop-item-icon" style="font-size: 40px;">${crop.icon}</div>
          <h4>${crop.name} 씨앗</h4>
          <p>확정 재배 (${GRADE_NAMES[crop.grade]})</p>
          <button class="btn btn-primary btn-buy" data-index="${index}">🪶 ${item.price}</button>
        `;
      } else if (item.type === 'seed_box') {
        card.innerHTML = `
          <div class="shop-item-icon">${getSeedPacketSVG(item.grade, 50)}</div>
          <h4>${GRADE_NAMES[item.grade]} 씨앗 상자</h4>
          <p>랜덤 작물 씨앗 개봉</p>
          <button class="btn btn-primary btn-buy" data-index="${index}">🪶 ${item.price}</button>
        `;
      }

      card.querySelector('.btn-buy').addEventListener('click', () => this.buyItem(index));
      this.container.appendChild(card);
    });

    const resetLabel = document.getElementById('reset-count-label');
    if (resetLabel) {
      resetLabel.textContent = `오늘 새로고침: ${state.dailyResetCount}/5회`;
    }

    if (this.resetBtn) {
      const nextCost = (state.dailyResetCount + 1) * 50;
      this.resetBtn.textContent = `새로고침 (🪶 ${nextCost})`;
    }
  }

  buyItem(index) {
    const state = stateManager.state;
    const item = state.shopItems[index];
    if (!item) return;

    // 구매 확인
    let itemLabel;
    if (item.type === 'egg') itemLabel = `${GRADE_NAMES[item.grade]} 알`;
    else if (item.type === 'seed') itemLabel = `${CROPS[item.cropId].name} 씨앗`;
    else itemLabel = `${GRADE_NAMES[item.grade]} 씨앗 상자`;

    if (!confirm(`[${itemLabel}]을(를) 🪶 ${item.price}개에 구매합니다.\n\n정말 구매하시겠습니까? 취소할 수 없습니다.`)) return;

    if (stateManager.spendFeathers(item.price)) {
      if (item.type === 'egg') {
        state.inventory.eggs[item.grade] = (state.inventory.eggs[item.grade] || 0) + 1;
        alert(`🥚 [${GRADE_NAMES[item.grade]} 알]을 획득했습니다! 부화소에서 부화시키세요!`);
      } else if (item.type === 'seed') {
        state.inventory.seeds[item.cropId] = (state.inventory.seeds[item.cropId] || 0) + 1;
        alert(`🌱 [${CROPS[item.cropId].name} 씨앗]을 획득했습니다! 농장에서 재배하세요!`);
      } else if (item.type === 'seed_box') {
        state.inventory.seedBoxes[item.grade] = (state.inventory.seedBoxes[item.grade] || 0) + 1;
        alert(`🎁 [${GRADE_NAMES[item.grade]} 씨앗 상자]를 획득했습니다!`);
      }

      soundEngine.playCoin();
      stateManager.save();
    } else {
      alert('깃털이 부족합니다!');
    }
  }
}
