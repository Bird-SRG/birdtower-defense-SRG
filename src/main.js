/* Bird Tower Defense - Main Controller & Bootstrap */

import { stateManager, BIRD_TEMPLATES, PLACEMENT_COSTS, STAGES, ACHIEVEMENTS } from './state.js';
import { getBirdSVG } from './assets.js';
import { GameEngine } from './game/engine.js';
import { FarmSystem } from './farm.js';
import { HatcherySystem } from './hatchery.js';
import { InventorySystem } from './inventory.js';
import { DeckSystem } from './deck.js';
import { EnhanceSystem } from './enhance.js';
import { ShopSystem } from './shop.js';
import { AdminSystem } from './admin.js';


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
      else if (targetId === 'tab-achievements') renderAchievements();

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

// --- 달걀섬 지도: 첫 4개 스테이지가 있는 섬. 흰 배경을 투명하게 만든 이미지를 한 번만 만들어 재사용 ---
const EGG_ISLAND_NODES = [
  { stage: 1, x: 27.5, y: 35 },
  { stage: 2, x: 58, y: 39 },
  { stage: 3, x: 58, y: 68 },
  { stage: 4, x: 27, y: 66 }
];
let eggIslandUrl = null;
let eggIslandLoading = false;

function loadEggIslandImage() {
  if (eggIslandUrl || eggIslandLoading) return;
  eggIslandLoading = true;
  const img = new Image();
  img.onload = () => {
    const W = img.width, H = img.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const id = g.getImageData(0, 0, W, H), d = id.data;
    // 가장자리에서 시작해 바깥쪽 흰 배경만 투명으로 (달걀 흰자는 유지)
    const white = (i) => d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235;
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) stack.push(x, 0, x, H - 1);
    for (let y = 0; y < H; y++) stack.push(0, y, W - 1, y);
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const p = y * W + x;
      if (seen[p]) continue;
      seen[p] = 1;
      if (!white(p * 4)) continue;
      d[p * 4 + 3] = 0;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    g.putImageData(id, 0, 0);
    eggIslandUrl = c.toDataURL('image/png');
    renderStageIntro();
  };
  img.src = 'assets/maps/egg_island.png';
}

function selectStageNode(stageId) {
  if (!STAGES[stageId]) return;
  stateManager.state.selectedStage = stageId;
  stateManager.save();
  renderStageIntro();
}

function renderStageIntro() {
  const state = stateManager.state;
  const viewing = STAGE_IDS.includes(state.selectedStage) ? state.selectedStage : STAGE_IDS[0];
  const stage = STAGES[viewing];
  const unlocked = viewing <= (state.unlockedStage || 1);

  const imgEl = document.getElementById('stage-intro-image');
  if (imgEl) {
    loadEggIslandImage();
    imgEl.innerHTML = `
      <div class="egg-island">
        ${eggIslandUrl ? `<img src="${eggIslandUrl}" alt="달걀섬">` : ''}
        ${EGG_ISLAND_NODES.map(n => {
          const exists = !!STAGES[n.stage];
          const open = exists && n.stage <= (state.unlockedStage || 1);
          const cls = ['egg-node', n.stage === viewing ? 'egg-node-active' : '', open ? '' : 'egg-node-locked'].join(' ');
          return `<button type="button" class="${cls}" style="left:${n.x}%;top:${n.y}%" data-stage="${n.stage}" ${exists ? '' : 'disabled'}>${exists && open ? n.stage : '🔒'}</button>`;
        }).join('')}
      </div>`;
    imgEl.querySelectorAll('.egg-node').forEach(btn => {
      btn.addEventListener('click', () => selectStageNode(Number(btn.dataset.stage)));
    });
  }
  const labelEl = document.getElementById('stage-intro-label');
  if (labelEl) labelEl.textContent = `${stage.island ? stage.island + ' · ' : ''}${stage.badge}`;
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

function renderAchievements() {
  const list = document.getElementById('achievement-list');
  if (!list) return;
  const done = stateManager.state.achievements || {};
  list.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = !!done[a.id];
    return `
      <div class="achievement-card glass-panel ${unlocked ? 'achievement-done' : ''}">
        <div class="achievement-icon">${unlocked ? a.icon : '🔒'}</div>
        <div class="achievement-text">
          <h4>${a.name}</h4>
          <p>${a.desc}</p>
        </div>
        <div class="achievement-status">${unlocked ? '달성' : '미달성'}</div>
      </div>`;
  }).join('');
}

function subscribeStateChanges() {
  stateManager.subscribe((state) => {
    stateManager.consumeNewAchievements().forEach(id => {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) showToast(`🏆 업적 달성: ${a.name}`);
    });
    renderAchievements();
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
