/* Bird Tower Defense - Admin Panel System */

import { stateManager, GRADES, GRADE_NAMES } from './state.js';
import { soundEngine } from './assets.js';

export class AdminSystem {
  constructor() {
    this.adminContainer = document.getElementById('tab-admin');
    this.gameEngine = null;
  }

  setGameEngine(engine) {
    this.gameEngine = engine;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // 1. 모든 등급 알 10개 획득
    const btnAddEggs = document.getElementById('admin-btn-add-eggs');
    if (btnAddEggs) {
      btnAddEggs.addEventListener('click', () => {
        stateManager.addEggsOfAllGrades(10);
        soundEngine.playHatch();
        this.showNotice('🥚 모든 등급의 알 10개(총 60개)를 획득했습니다!');
      });
    }

    // 2. 깃털 무한개 즉시 획득
    const btnInfFeathers = document.getElementById('admin-btn-inf-feathers');
    if (btnInfFeathers) {
      btnInfFeathers.addEventListener('click', () => {
        stateManager.setInfiniteFeathers();
        soundEngine.playCoin();
        this.showNotice('🪶 깃털 무한개(999,999,999개)를 획득했습니다!');
      });
    }

    // 3. 인런 코인 10,000개 획득
    const btnAddCoins = document.getElementById('admin-btn-add-coins');
    if (btnAddCoins) {
      btnAddCoins.addEventListener('click', () => {
        if (this.gameEngine) {
          this.gameEngine.inRunCoins += 10000;
          const elCoins = document.getElementById('player-coins');
          if (elCoins) elCoins.textContent = this.gameEngine.inRunCoins.toLocaleString();
          soundEngine.playCoin();
          this.showNotice('🪙 인런 코인 +10,000을 획득했습니다!');
        } else {
          this.showNotice('⚠️ 방어전 게임이 시작되지 않았습니다.');
        }
      });
    }

    // 4. 모든 새 42종 획득 (각 10마리)
    const btnUnlockBirds = document.getElementById('admin-btn-unlock-birds');
    if (btnUnlockBirds) {
      btnUnlockBirds.addEventListener('click', () => {
        stateManager.unlockAllBirds(10);
        soundEngine.playHatch();
        this.showNotice('🦅 모든 종류의 새 42종 (각 10마리씩)을 획득했습니다!');
      });
    }

    // 5. 농장 밭 전체 해제
    const btnUnlockPlots = document.getElementById('admin-btn-unlock-plots');
    if (btnUnlockPlots) {
      btnUnlockPlots.addEventListener('click', () => {
        stateManager.unlockAllFarmPlots();
        soundEngine.playCoin();
        this.showNotice('🌱 농장의 모든 밭이 잠금해제 되었습니다!');
      });
    }

    // 5-2. 모든 씨앗 28종 획득
    const btnAddSeeds = document.getElementById('admin-btn-add-seeds');
    if (btnAddSeeds) {
      btnAddSeeds.addEventListener('click', () => {
        stateManager.addAllSeeds(10);
        soundEngine.playCoin();
        this.showNotice('🌾 모든 작물의 씨앗 28종(각 10개)을 획득했습니다!');
      });
    }

    // 6. 현재 웨이브 강제 클리어
    const btnSkipWave = document.getElementById('admin-btn-skip-wave');
    if (btnSkipWave) {
      btnSkipWave.addEventListener('click', () => {
        if (this.gameEngine) {
          this.gameEngine.enemies = [];
          this.gameEngine.enemiesToSpawn = [];
          this.showNotice('⚡ 현재 웨이브를 강제 클리어 처리했습니다!');
        }
      });
    }

    // 7. 세이브 데이터 초기화
    const btnResetData = document.getElementById('admin-btn-reset-data');
    if (btnResetData) {
      btnResetData.addEventListener('click', () => {
        if (confirm('정말로 게임 데이터를 초기화하시겠습니까?')) {
          stateManager.reset();
          location.reload();
        }
      });
    }
  }

  showNotice(msg) {
    const noticeEl = document.getElementById('admin-notice');
    if (noticeEl) {
      noticeEl.textContent = msg;
      noticeEl.classList.remove('hidden');
      noticeEl.style.opacity = '1';
      setTimeout(() => {
        noticeEl.style.opacity = '0';
        setTimeout(() => noticeEl.classList.add('hidden'), 300);
      }, 3000);
    } else {
      alert(msg);
    }
  }
}
