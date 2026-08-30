/* Bird Tower Defense - Hatchery & Gacha System (Full GDD Specification) */

import { stateManager, EGG_GACHA_PROBS, SEED_BOX_GACHA_PROBS, BIRD_TEMPLATES, CROPS, GRADES, GRADE_NAMES, GRADE_COLORS } from './state.js';
import { getEggSVG, getBirdSVG, soundEngine } from './assets.js';

export class HatcherySystem {
  constructor() {
    this.container = document.getElementById('egg-inventory-list');
    this.bgm = new Audio('Hatchery Rush.mp3');
    this.bgm.loop = true;
    this.isPlaying = false;
  }

  init() {
    this.render();
    this.initBGMControls();
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
            <div class="egg-icon" style="font-size: 48px;">🎁</div>
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

    // 해당 등급 내의 작물 무작위 선택
    const matchingCrops = Object.keys(CROPS).filter(cKey => CROPS[cKey].grade === rolledGrade);
    if (matchingCrops.length === 0) {
      // 해당 등급 작물이 없으면 전체에서 선택
      const allCrops = Object.keys(CROPS);
      const chosenCropId = allCrops[Math.floor(Math.random() * allCrops.length)];
      state.inventory.seeds[chosenCropId] = (state.inventory.seeds[chosenCropId] || 0) + 1;
      const crop = CROPS[chosenCropId];
      alert(`🎁 [${GRADE_NAMES[boxGrade]} 씨앗 상자] 개봉!\n\n🌱 등급: ${GRADE_NAMES[crop.grade]}\n ${crop.icon} ${crop.name} 씨앗 1개 획득!\n\n농장에서 재배하세요!`);
    } else {
      const chosenCropId = matchingCrops[Math.floor(Math.random() * matchingCrops.length)];
      state.inventory.seeds[chosenCropId] = (state.inventory.seeds[chosenCropId] || 0) + 1;
      const crop = CROPS[chosenCropId];
      alert(`🎁 [${GRADE_NAMES[boxGrade]} 씨앗 상자] 개봉!\n\n🌱 등급: ${GRADE_NAMES[rolledGrade]}\n ${crop.icon} ${crop.name} 씨앗 1개 획득!\n\n농장에서 재배하세요!`);
    }

    soundEngine.playHatch();
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
    soundEngine.playHatch();

    // 부화 결과 모달 팝업
    alert(`🎉 [${GRADE_NAMES[eggGrade]} 알] 부화 성공!\n\n🦅 등급: ${GRADE_NAMES[rolledGrade]}\n 이름: ${chosenBird.name}\n설명: ${chosenBird.desc}`);

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
