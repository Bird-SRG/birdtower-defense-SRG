/* Bird Tower Defense - Main Controller & Bootstrap */

import { stateManager, BIRD_TEMPLATES, PLACEMENT_COSTS, STAGES } from './state.js';
import { getBirdSVG } from './assets.js';
import { GameEngine } from './game/engine.js';
import { FarmSystem } from './farm.js';
import { HatcherySystem } from './hatchery.js';
import { InventorySystem } from './inventory.js';
import { DeckSystem } from './deck.js';
import { EnhanceSystem } from './enhance.js';
import { ShopSystem } from './shop.js';
import { AdminSystem } from './admin.js';

// --- 스테이지 소개 화면용 일러스트 (스테이지별) ---
const STAGE_INTRO_ART = {
  1: `
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="stage-sky-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3a2f78"/>
          <stop offset="55%" stop-color="#6c5ce7"/>
          <stop offset="100%" stop-color="#a78bfa"/>
        </linearGradient>
        <radialGradient id="stage-sun-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff6cf"/>
          <stop offset="100%" stop-color="#ffd76a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#stage-sky-1)"/>
      <circle cx="250" cy="45" r="55" fill="url(#stage-sun-1)"/>
      <circle cx="250" cy="45" r="20" fill="#fff4d6"/>
      <g opacity="0.5" fill="#ffffff">
        <ellipse cx="55" cy="35" rx="26" ry="10"/>
        <ellipse cx="80" cy="30" rx="20" ry="9"/>
        <ellipse cx="140" cy="55" rx="22" ry="8"/>
      </g>
      <path d="M0,150 L20,150 L20,120 L90,120 L90,150 L130,150 L130,90 L200,90 L200,150 L240,150 L240,110 L320,110 L320,180 L0,180 Z" fill="#241b4d" opacity="0.85"/>
      <path d="M10,140 L60,140 L60,170 L150,170 L150,130 L210,130 L210,170 L310,170" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
      <path d="M10,140 L60,140 L60,170 L150,170 L150,130 L210,130 L210,170 L310,170" fill="none" stroke="#6c5ce7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <g transform="translate(120,58) rotate(-8)">
        <circle cx="0" cy="0" r="16" fill="#d2b48c"/>
        <circle cx="0" cy="4" r="11" fill="#f5f5dc"/>
        <path d="M-15,0 C-22,-5 -22,7 -15,8 Z" fill="#8b5a2b"/>
        <path d="M15,0 C22,-5 22,7 15,8 Z" fill="#8b5a2b"/>
        <polygon points="-4,-4 4,-4 0,4" fill="#ffa500"/>
        <circle cx="-5" cy="-6" r="2" fill="#1a202c"/>
      </g>
    </svg>
  `,
  2: `
    <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="stage-sky-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f3d2e"/>
          <stop offset="55%" stop-color="#1c6e4f"/>
          <stop offset="100%" stop-color="#8fd694"/>
        </linearGradient>
        <radialGradient id="stage-sun-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fffbd6"/>
          <stop offset="100%" stop-color="#ffe98a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#stage-sky-2)"/>
      <circle cx="70" cy="40" r="50" fill="url(#stage-sun-2)"/>
      <circle cx="70" cy="40" r="18" fill="#fff6cf"/>
      <!-- 정글 캐노피 실루엣 -->
      <path d="M0,60 C30,30 60,70 90,45 C120,20 150,60 180,40 C210,20 250,55 280,35 C300,25 310,35 320,30 L320,0 L0,0 Z" fill="#08251a" opacity="0.9"/>
      <path d="M0,180 L0,120 C40,140 60,105 100,120 C140,135 170,100 210,118 C250,136 280,108 320,125 L320,180 Z" fill="#0c3323" opacity="0.9"/>
      <!-- 구불구불한 정글 오솔길 -->
      <path d="M10,150 L60,150 L60,95 L130,95 L130,150 L190,150 L190,95 L260,95 L260,150 L310,150"
            fill="none" stroke="#e9d8a6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
      <path d="M10,150 L60,150 L60,95 L130,95 L130,150 L190,150 L190,95 L260,95 L260,150 L310,150"
            fill="none" stroke="#1c6e4f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- 새 -->
      <g transform="translate(150,70) rotate(-6)">
        <circle cx="0" cy="0" r="15" fill="#38a169"/>
        <circle cx="0" cy="4" r="10" fill="#c6f6d5"/>
        <path d="M-14,0 C-20,-5 -20,7 -14,7 Z" fill="#276749"/>
        <path d="M14,0 C20,-5 20,7 14,7 Z" fill="#276749"/>
        <polygon points="-4,-3 4,-3 0,4" fill="#ecc94b"/>
        <circle cx="-5" cy="-5" r="2" fill="#1a202c"/>
      </g>
    </svg>
  `
};

let gameEngine;
let farmSystem;
let hatcherySystem;
let inventorySystem;
let deckSystem;
let enhanceSystem;
let shopSystem;
let adminSystem;

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('global-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  requestAnimationFrame(() => toast.classList.add('global-toast-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('global-toast-visible');
    setTimeout(() => toast.classList.add('hidden'), 250);
  }, 2200);
}

function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  // 전투(웨이브 진행) 중에는 body에 battle-locked 클래스를 부여해 다른 탭을 잠금
  setInterval(() => {
    if (gameEngine) {
      document.body.classList.toggle('battle-locked', gameEngine.isBattleInProgress());
    }
  }, 300);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;

      // 전투 중 이동 잠금 (어드민 패널은 개발용이므로 예외적으로 허용)
      const allowedDuringBattle = ['tab-defense', 'tab-admin'];
      if (gameEngine && gameEngine.isBattleInProgress() && !allowedDuringBattle.includes(targetId)) {
        showToast('⚔️ 전투 중에는 이동할 수 없습니다. 먼저 전투를 끝내주세요!');
        return;
      }

      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'tab-farm' && farmSystem) farmSystem.render();
      else if (targetId === 'tab-hatchery' && hatcherySystem) hatcherySystem.render();
      else if (targetId === 'tab-inventory' && inventorySystem) inventorySystem.render();
      else if (targetId === 'tab-deck' && deckSystem) deckSystem.render();
      else if (targetId === 'tab-enhance' && enhanceSystem) enhanceSystem.render();
      else if (targetId === 'tab-shop' && shopSystem) shopSystem.render();

      if (hatcherySystem) {
        if (targetId === 'tab-hatchery') {
          hatcherySystem.playBGM();
        } else {
          hatcherySystem.pauseBGM();
        }
      }

      if (gameEngine) {
        // 전투 중에는 방어전/어드민 탭을 오가도 전투 브금이 끊기지 않게 유지
        if (gameEngine.isBattleInProgress() && allowedDuringBattle.includes(targetId)) {
          gameEngine.playBGM();
        } else {
          gameEngine.pauseBGM();
        }
      }
    });
  });
}

// --- 스테이지 소개 화면: 좌우 화살표로 둘러보고, 해금된 스테이지만 플레이 가능 ---
const STAGE_IDS = Object.keys(STAGES).map(Number).sort((a, b) => a - b);

function renderStageIntro() {
  const state = stateManager.state;
  const viewing = STAGE_IDS.includes(state.selectedStage) ? state.selectedStage : STAGE_IDS[0];
  const stage = STAGES[viewing];
  const unlocked = viewing <= (state.unlockedStage || 1);

  const imgEl = document.getElementById('stage-intro-image');
  if (imgEl) imgEl.innerHTML = STAGE_INTRO_ART[viewing] || '';
  const labelEl = document.getElementById('stage-intro-label');
  if (labelEl) labelEl.textContent = stage.badge;
  const titleEl = document.getElementById('stage-intro-title');
  if (titleEl) titleEl.textContent = stage.name;
  const descEl = document.getElementById('stage-intro-desc');
  if (descEl) descEl.textContent = stage.desc;

  const hint = document.getElementById('stage-locked-hint');
  if (hint) hint.classList.toggle('hidden', unlocked);
  const btnStagePlay = document.getElementById('btn-stage-play');
  if (btnStagePlay) {
    btnStagePlay.disabled = !unlocked;
    btnStagePlay.classList.toggle('hidden', !unlocked);
  }

  const idx = STAGE_IDS.indexOf(viewing);
  const prevBtn = document.getElementById('btn-stage-prev');
  const nextBtn = document.getElementById('btn-stage-next');
  if (prevBtn) prevBtn.disabled = idx <= 0;
  if (nextBtn) nextBtn.disabled = idx >= STAGE_IDS.length - 1;
}

function changeStagePreview(delta) {
  const state = stateManager.state;
  const current = STAGE_IDS.includes(state.selectedStage) ? state.selectedStage : STAGE_IDS[0];
  const idx = STAGE_IDS.indexOf(current);
  const nextIdx = Math.min(STAGE_IDS.length - 1, Math.max(0, idx + delta));
  state.selectedStage = STAGE_IDS[nextIdx];
  stateManager.save();
  renderStageIntro();
}

function renderDefenseDeck() {
  const deckContainer = document.getElementById('defense-deck');
  if (!deckContainer) return;
  deckContainer.innerHTML = '';

  const state = stateManager.state;

  if (state.deck.length === 0) {
    deckContainer.innerHTML = '<p class="deck-empty-hint">덱 탭에서 새를 장착하세요</p>';
    return;
  }

  state.deck.forEach(birdId => {
    const template = BIRD_TEMPLATES[birdId];
    if (!template) return;

    const cost = PLACEMENT_COSTS[template.grade] || 15;
    const canAfford = gameEngine ? gameEngine.inRunCoins >= cost : true;

    const slot = document.createElement('div');
    slot.className = `deck-slot ${canAfford ? '' : 'deck-slot-poor'}`;
    slot.dataset.birdId = birdId;

    slot.innerHTML = `
      <div class="deck-slot-bird">${getBirdSVG(birdId, 32)}</div>
      <div class="deck-slot-name">${template.name}</div>
      <div class="deck-slot-cost ${canAfford ? 'cost-ok' : 'cost-no'}">🪙${cost}</div>
    `;

    slot.style.cursor = canAfford ? 'grab' : 'not-allowed';

    slot.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canAfford || !gameEngine) return;

      // 다른 슬롯 selected 해제
      deckContainer.querySelectorAll('.deck-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');

      // 드래그 시작
      gameEngine.startDrag(birdId);
    });

    deckContainer.appendChild(slot);
  });
}

// 코인이 바뀔 때(배치/업그레이드/판매/관리자 지급 등)마다 덱 패널의 배치 가능 여부 갱신
document.addEventListener('coins-changed', renderDefenseDeck);

function initDefenseControls() {
  const btnStart = document.getElementById('btn-start-wave');
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (gameEngine) gameEngine.skipWave();
    });
  }

  const btnSpeed = document.getElementById('btn-speed-up');
  if (btnSpeed) {
    btnSpeed.addEventListener('click', () => {
      if (gameEngine) {
        if (gameEngine.timeScale === 1.0) {
          gameEngine.timeScale = 2.0;
          btnSpeed.textContent = '속도 x2';
        } else {
          gameEngine.timeScale = 1.0;
          btnSpeed.textContent = '속도 x1';
        }
      }
    });
  }

  const btnRestart = document.getElementById('btn-restart');
  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      const overlay = document.getElementById('game-overlay');
      if (overlay) overlay.className = 'game-overlay-hidden';
      if (gameEngine) {
        gameEngine.resetMatch();
        gameEngine.start();
        gameEngine.startWave();
        renderDefenseDeck();
      }
    });
  }

  const btnStagePlay = document.getElementById('btn-stage-play');
  const stageIntroOverlay = document.getElementById('stage-intro-overlay');

  const btnStagePrev = document.getElementById('btn-stage-prev');
  const btnStageNext = document.getElementById('btn-stage-next');
  if (btnStagePrev) btnStagePrev.addEventListener('click', () => changeStagePreview(-1));
  if (btnStageNext) btnStageNext.addEventListener('click', () => changeStagePreview(1));

  if (btnStagePlay) {
    btnStagePlay.addEventListener('click', () => {
      const state = stateManager.state;
      const viewing = STAGE_IDS.includes(state.selectedStage) ? state.selectedStage : STAGE_IDS[0];
      if (viewing > (state.unlockedStage || 1)) return; // 잠긴 스테이지는 시작 불가
      if (gameEngine) gameEngine.setStage(viewing); // 선택한 스테이지의 경로/구성표를 즉시 반영
      if (stageIntroOverlay) stageIntroOverlay.classList.add('stage-intro-overlay-hidden');
      if (gameEngine) gameEngine.startWave();
    });
  }

  renderStageIntro();

  // 전투를 정리하고 스테이지 시작 화면으로 복귀 (전투 끝내기 / 메뉴로 공용)
  function returnToStageIntro() {
    const overlay = document.getElementById('game-overlay');
    if (overlay) overlay.className = 'game-overlay-hidden';
    if (gameEngine) {
      gameEngine.resetMatch();
      gameEngine.start();
    }
    document.body.classList.remove('battle-locked');
    if (stageIntroOverlay) stageIntroOverlay.classList.remove('stage-intro-overlay-hidden');
    renderDefenseDeck();
  }

  // 실패/클리어 화면에서 메뉴로 돌아가기
  const btnBackToMenu = document.getElementById('btn-back-to-menu');
  if (btnBackToMenu) {
    btnBackToMenu.addEventListener('click', returnToStageIntro);
  }

  // 전투 끝내기 (확인 후 웨이브 진행을 포기하고 스테이지 소개 화면으로 복귀)
  const btnEndBattle = document.getElementById('btn-end-battle');
  const endBattleModal = document.getElementById('battle-end-confirm-modal');
  const btnEndBattleConfirm = document.getElementById('btn-end-battle-confirm');
  const btnEndBattleCancel = document.getElementById('btn-end-battle-cancel');

  if (btnEndBattle) {
    btnEndBattle.addEventListener('click', () => {
      if (!gameEngine || !gameEngine.isBattleInProgress()) return;
      if (endBattleModal) endBattleModal.classList.remove('hidden');
    });
  }
  if (btnEndBattleCancel) {
    btnEndBattleCancel.addEventListener('click', () => {
      if (endBattleModal) endBattleModal.classList.add('hidden');
    });
  }
  if (btnEndBattleConfirm) {
    btnEndBattleConfirm.addEventListener('click', () => {
      if (endBattleModal) endBattleModal.classList.add('hidden');
      returnToStageIntro();
    });
  }

  const btnUpgrade = document.getElementById('btn-upgrade-tower');
  if (btnUpgrade) {
    btnUpgrade.addEventListener('click', () => {
      if (gameEngine) gameEngine.upgradeSelectedTower();
    });
  }

  const btnSell = document.getElementById('btn-sell-tower');
  if (btnSell) {
    btnSell.addEventListener('click', () => {
      if (gameEngine) gameEngine.sellSelectedTower();
    });
  }

  // X 닫기 버튼
  const btnClosePanel = document.getElementById('btn-close-tower-panel');
  if (btnClosePanel) {
    btnClosePanel.addEventListener('click', () => {
      if (!gameEngine) return;
      // selectedTower가 이미 비어 있어도 패널은 항상 닫히도록 처리
      if (gameEngine.selectedTower) {
        gameEngine.selectedTower.isSelected = false;
        gameEngine.selectedTower = null;
      }
      gameEngine.renderSelectedTowerPanel();
    });
  }

  // 30초 스킵 투표 버튼 (승인 / 거부)
  const btnVoteAccept = document.getElementById('btn-vote-accept');
  if (btnVoteAccept) {
    btnVoteAccept.addEventListener('click', () => {
      if (gameEngine) gameEngine.acceptSkipVote();
    });
  }

  const btnVoteReject = document.getElementById('btn-vote-reject');
  if (btnVoteReject) {
    btnVoteReject.addEventListener('click', () => {
      if (gameEngine) gameEngine.rejectSkipVote();
    });
  }
}

function subscribeStateChanges() {
  stateManager.subscribe((state) => {
    const elFeathers = document.getElementById('player-feathers');
    if (elFeathers) elFeathers.textContent = state.feathers.toLocaleString();

    const elGems = document.getElementById('player-gems');
    if (elGems) elGems.textContent = (state.strangeGems || 0).toLocaleString();

    renderDefenseDeck();
    if (deckSystem) deckSystem.render();
    renderStageIntro();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  gameEngine = new GameEngine('game-canvas');
  farmSystem = new FarmSystem();
  hatcherySystem = new HatcherySystem();
  inventorySystem = new InventorySystem();
  deckSystem = new DeckSystem();
  enhanceSystem = new EnhanceSystem();
  shopSystem = new ShopSystem();
  adminSystem = new AdminSystem();

  adminSystem.setGameEngine(gameEngine);

  initNavigation();
  initDefenseControls();
  subscribeStateChanges();

  stateManager.load();

  farmSystem.init();
  hatcherySystem.init();
  inventorySystem.init();
  deckSystem.init();
  enhanceSystem.init();
  shopSystem.init();
  adminSystem.init();

  gameEngine.resetMatch();
  gameEngine.start();
  // 웨이브 1은 스테이지 소개 화면에서 '플레이' 버튼을 눌러야 시작됨
  renderDefenseDeck();
});
