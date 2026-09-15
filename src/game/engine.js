/* Bird Tower Defense - Game Engine (Full GDD Mechanics & CUBIC Boss) */

import { stateManager, BIRD_TEMPLATES, WAVE_CONFIG, MONSTER_TEMPLATES, PLACEMENT_COSTS, rollStageMaterialDrops, rollStageGemDrop, STAGES } from '../state.js';
import { Enemy, Tower, Projectile, Minion } from './objects.js';
import { soundEngine, drawBirdCanvas } from '../assets.js';

export class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.isRunning = false;
    this.timeScale = 1.0;

    // BGM 오디오 로드 및 상태
    this.bgm = new Audio('Hatchery Mayhem.mp3');
    this.bgm.loop = true;
    this.isPlaying = false;

    // 현재 플레이 중인 스테이지(챕터) 및 그에 따른 경로
    this.currentStage = stateManager.state.selectedStage || 1;
    this.path = this.getStageConfig().path;

    // 마우스 추적 (배치용 실루엣 프리뷰)
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseInCanvas = false;

    // 드래그 앤 드롭 배치 상태
    this.isDragging = false;
    this.dragBirdId = null;

    this.canvas.addEventListener('mousemove', (e) => {
      const p = this.getCanvasCoords(e);
      this.mouseX = p.x;
      this.mouseY = p.y;
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.mouseInCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseInCanvas = false;
    });

    // mouseup on canvas: 드래그 중이면 배치 시도
    this.canvas.addEventListener('mouseup', (e) => this.handleCanvasDrop(e));

    // 전역 mouseup (캔버스 밖에서 놓으면 드래그 취소)
    document.addEventListener('mouseup', (e) => {
      if (this.isDragging && !this.mouseInCanvas) {
        this.cancelDrag();
      }
    });

    // 전역 mousemove (캔버스 밖에서도 드래그 프리뷰 좌표 추적)
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const p = this.getCanvasCoords(e);
        this.mouseX = p.x;
        this.mouseY = p.y;
      }
    });

    this.resetMatch();
    this.initBGMControls();

    // 입력 이벤트 리스너
    this.selectedPlacementBird = null;
    this.selectedTower = null;

    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
  }

  initBGMControls() {
    this.btnPlay = document.getElementById('btn-defense-bgm-play');
    this.volumeSlider = document.getElementById('defense-bgm-volume');
    this.iconPlay = document.getElementById('defense-bgm-icon');

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
    // 이미 재생 중이면 다시 play()를 호출하지 않는다.
    // (웨이브 전환마다 무조건 호출되다 보니, 재생 중인 트랙에 play()를 또 걸어서
    //  브라우저에 따라 아주 짧게 끊기는 소리가 나는 경우가 있었다)
    if (this.isPlaying && !this.bgm.paused) return;

    this.bgm.play()
      .then(() => {
        this.isPlaying = true;
        if (this.btnPlay) this.btnPlay.textContent = '일시정지';
        if (this.iconPlay) this.iconPlay.classList.add('playing');
      })
      .catch((err) => {
        console.log("Wave BGM autoplay blocked or audio error:", err);
        this.isPlaying = false;
        if (this.btnPlay) this.btnPlay.textContent = '재생';
        if (this.iconPlay) this.iconPlay.classList.remove('playing');
      });
  }

  pauseBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
    this.isPlaying = false;
    if (this.btnPlay) this.btnPlay.textContent = '재생';
    if (this.iconPlay) this.iconPlay.classList.remove('playing');
  }

  resetMatch() {
    this.pauseBGM();

    // 시작 화면에서 선택된 스테이지를 반영
    this.currentStage = stateManager.state.selectedStage || 1;
    this.path = this.getStageConfig().path;

    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.damageTexts = [];
    this.gasClouds = [];
    this.minions = [];

    this.inRunCoins = 150; // 기본 시작 코인
    this.castleHp = 20;
    this.maxCastleHp = 20;
    this.currentWave = 0;
    this.isWaveActive = false;
    this.waveSkipped = false;

    this.enemiesToSpawn = [];
    this.spawnTimer = 0;
    this.selectedTower = null;
    this.selectedPlacementBird = null;

    // 배치 결과 화면 플래시 피드백 효과
    this.flashColor = null;
    this.flashTimer = 0;

    // 큐빅 보스 패턴용 상태
    this.cubicHealed = false;
    this.cubicAwakened = false;
    this.cubicSummonTimer = 12.0;

    // 자동 웨이브 시작 딜레이 (웨이브 종료 후 다음 웨이브 자동 시작)
    this.autoStartDelay = 0;
    this.pendingAutoStart = false;

    // 1분(60초) 웨이브 타이머 & 30초 스킵 투표 상태
    this.waveTimer = 60.0;
    this.votePromptShown = false;
    this.voteRejected = false;

    this.hideSkipVoteModal();
    this.renderSelectedTowerPanel(); // 선택 해제된 타워 패널을 확실히 닫음
    this.updateUI();
  }

  // --- 웨이브 자동 시작 (GDD 2-4) ---
  startWave() {
    if (this.currentWave >= 25) return;

    this.currentWave++;
    this.isWaveActive = true;
    this.waveSkipped = false;
    
    // 1분(60초) 타이머 & 투표 상태 초기화
    this.waveTimer = 60.0;
    this.votePromptShown = false;
    this.voteRejected = false;
    this.hideSkipVoteModal();

    // 웨이브 몬스터 대기열 생성 (현재 스테이지의 구성표 사용)
    const cfg = this.getStageConfig().waveConfig[this.currentWave - 1];
    this.enemiesToSpawn = [];
    if (cfg) {
      cfg.mobs.forEach(m => {
        for (let i = 0; i < m.count; i++) {
          this.enemiesToSpawn.push(m.type);
        }
      });
    }

    soundEngine.playHatch();
    this.playBGM();
    this.updateUI();
  }

  // --- 웨이브 넘기기 (스킵) — 현재 몬스터 전멸 → 다음 웨이브 ---
  skipWave() {
    if (!this.isWaveActive) return;
    this.hideSkipVoteModal();
    // 현재 웨이브의 모든 몬스터를 즉시 제거 (전멸 보너스 포기)
    this.waveSkipped = true;
    this.enemies.forEach(e => { e.isDead = true; });
    this.enemies = [];
    this.enemiesToSpawn = [];
  }

  // 전투 진행 중 여부 (웨이브 사이 자동 시작 대기 시간도 전투 중으로 취급)
  isBattleInProgress() {
    return this.isWaveActive || this.pendingAutoStart;
  }

  getStageConfig() {
    return STAGES[this.currentStage] || STAGES[1];
  }

  // 웨이브 진행도 배율 × 스테이지 체력 배율
  getEnemyLevelMult() {
    return (1.0 + this.currentWave * 0.05) * (this.getStageConfig().hpMult || 1.0);
  }

  // 스테이지 소개 화면에서 스테이지를 바꿀 때 호출 (전투 중이 아닐 때만 유효)
  setStage(stageId) {
    if (this.isBattleInProgress()) return;
    if (!STAGES[stageId]) return;
    this.currentStage = stageId;
    this.path = this.getStageConfig().path;
  }

  // --- 어드민 전용: 현재 웨이브를 즉시 종료하고 다음 웨이브로 진행 ---
  forceNextWave() {
    this.hideSkipVoteModal();

    // 현재 웨이브 잔여 몬스터/투사체/장판 정리
    this.enemies.forEach(e => { e.isDead = true; });
    this.enemies = [];
    this.enemiesToSpawn = [];
    this.projectiles = [];
    this.gasClouds = [];

    // 진행 중이던 웨이브 상태 종료 (보상/자동 시작 로직을 타지 않도록 직접 정리)
    this.isWaveActive = false;
    this.waveSkipped = false;
    this.pendingAutoStart = false;
    this.autoStartDelay = 0;

    if (this.currentWave >= 25) {
      this.stageClear();
      return;
    }

    // 딜레이 없이 곧바로 다음 웨이브 시작
    this.startWave();
  }

  // --- 30초 스킵 투표 제어 ---
  showSkipVoteModal() {
    const modal = document.getElementById('skip-vote-modal');
    if (modal) modal.classList.remove('hidden');
  }

  hideSkipVoteModal() {
    const modal = document.getElementById('skip-vote-modal');
    if (modal) modal.classList.add('hidden');
  }

  acceptSkipVote() {
    this.skipWave();
  }

  rejectSkipVote() {
    this.voteRejected = true;
    this.hideSkipVoteModal();
  }

  // --- 드래그 앤 드롭 배치 시스템 ---
  startDrag(birdId) {
    const template = BIRD_TEMPLATES[birdId];
    if (!template) return;
    const cost = PLACEMENT_COSTS[template.grade] || 15;
    if (this.inRunCoins < cost) return; // 코인 부족시 드래그 불가

    this.isDragging = true;
    this.dragBirdId = birdId;
    this.selectedPlacementBird = birdId;
    this.canvas.style.cursor = 'grabbing';
  }

  cancelDrag() {
    this.isDragging = false;
    this.dragBirdId = null;
    this.selectedPlacementBird = null;
    this.canvas.style.cursor = 'default';
    // 덱 슬롯 selected 클래스 제거
    const deckContainer = document.getElementById('defense-deck');
    if (deckContainer) deckContainer.querySelectorAll('.deck-slot').forEach(s => s.classList.remove('selected'));
  }

  // 캔버스는 CSS로 실제 표시 크기가 늘어나거나 줄어들 수 있어서(width:100%),
  // 클릭 좌표(CSS 픽셀)를 내부 캔버스 좌표(800x480 기준)로 정확히 환산해야 클릭이 어긋나지 않는다
  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  handleCanvasDrop(e) {
    if (!this.isDragging || !this.dragBirdId) return;

    const { x, y } = this.getCanvasCoords(e);
    const birdId = this.dragBirdId;
    const template = BIRD_TEMPLATES[birdId];
    const cost = PLACEMENT_COSTS[template.grade] || 15;

    // 유효성 검사
    if (this.inRunCoins < cost) {
      this.cancelDrag();
      return;
    }
    if (this.isOnPath(x, y, 28)) {
      this.cancelDrag();
      return;
    }
    if (this.towers.some(t => Math.hypot(t.x - x, t.y - y) < 32)) {
      this.cancelDrag();
      return;
    }

    // 배치 성공
    this.inRunCoins -= cost;
    // 모이를 먹은 개체가 있으면 우선 배치 (없으면 일반 개체)
    const owned = stateManager.state.ownedBirds.filter(b => b.birdId === birdId && b.count > 0);
    const ownedData = owned.find(b => b.feed) || owned[0] || {};
    const newTower = new Tower(birdId, x, y, 1, ownedData);
    this.towers.push(newTower);

    soundEngine.playCoin();

    // 배치 후 자동 리셋
    this.cancelDrag();
    this.updateUI();
  }

  // --- 배치된 타워 클릭 선택 (업그레이드/판매 패널) ---
  handleCanvasClick(e) {
    // 드래그 중이면 클릭 무시 (mouseup이 처리)
    if (this.isDragging) return;

    const { x, y } = this.getCanvasCoords(e);

    // 배치된 타워 클릭 선택 (반응성을 위해 넉넉한 히트박스 + 가장 가까운 타워 우선)
    const TOWER_CLICK_RADIUS = 42;
    let clickedTower = null;
    let closestDist = Infinity;
    for (const t of this.towers) {
      const dist = Math.hypot(t.x - x, t.y - y);
      if (dist <= TOWER_CLICK_RADIUS && dist < closestDist) {
        closestDist = dist;
        clickedTower = t;
      }
    }
    if (clickedTower) {
      if (this.selectedTower) this.selectedTower.isSelected = false;
      this.selectedTower = clickedTower;
      this.selectedTower.isSelected = true;
      this.renderSelectedTowerPanel();
      return;
    }

    // 빈 공간 클릭시 선택 해제
    if (this.selectedTower) {
      this.selectedTower.isSelected = false;
      this.selectedTower = null;
      this.renderSelectedTowerPanel();
    }
  }

  isOnPath(x, y, padding = 24) {
    for (let i = 0; i < this.path.length - 1; i++) {
      const p1 = this.path[i];
      const p2 = this.path[i + 1];

      const dist = this.distToSegment({ x, y }, { x: p1[0], y: p1[1] }, { x: p2[0], y: p2[1] });
      if (dist < padding) return true;
    }
    return false;
  }

  distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // --- 메인 루프 ---
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    let lastTime = performance.now();

    const loop = (now) => {
      if (!this.isRunning) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1) * this.timeScale;
      lastTime = now;

      this.update(dt);
      this.draw();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
  }

  update(dt) {
    // 1. 몬스터 스폰
    if (this.isWaveActive && this.enemiesToSpawn.length > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= 0.8) {
        this.spawnTimer = 0;
        const typeKey = this.enemiesToSpawn.shift();
        const enemy = new Enemy(typeKey, this.path, this.getEnemyLevelMult());
        this.enemies.push(enemy);
      }
    }

    // 2. 몬스터 업데이트 & 성 피해 판정 (GDD 2-2)
    this.enemies.forEach(e => {
      e.update(dt, this);
      if (e.reachedEnd && !e.isDead) {
        e.isDead = true;
        // 남은 HP만큼 성 피해!
        const dmg = Math.ceil(e.hp);
        this.castleHp -= dmg;
        soundEngine.playExplosion();

        if (this.castleHp <= 0) {
          this.castleHp = 0;
          this.gameOver();
        }
      }
    });
    this.enemies = this.enemies.filter(e => !e.isDead);

    // 3. 오라 재계산 후 타워 업데이트
    this.applyAuras();
    this.towers.forEach(t => t.update(dt, this));

    // 3-1. 소환물/설치물 업데이트
    this.minions.forEach(m => m.update(dt, this));
    this.minions = this.minions.filter(m => !m.isDead);

    // 4. 투사체 업데이트
    this.projectiles.forEach(p => p.update(dt, this));
    this.projectiles = this.projectiles.filter(p => !p.isHit);

    // 4-1. 독가스 지역 효과 업데이트 (비둘기 등)
    this.gasClouds.forEach(g => {
      g.duration -= dt;
      this.findTargetsInRange(g.x, g.y, g.radius).forEach(m => m.takeDamage(g.dps * dt, this));
    });
    this.gasClouds = this.gasClouds.filter(g => g.duration > 0);

    // 5. 데미지 텍스트 업데이트
    this.damageTexts.forEach(d => {
      d.y -= 20 * dt;
      d.life -= dt;
    });
    this.damageTexts = this.damageTexts.filter(d => d.life > 0);

    // 6. CUBIC 최종 보스 패턴 업데이트 (GDD 12-5-3)
    const cubic = this.enemies.find(e => e.isCubic && !e.isDead);
    if (cubic) {
      // 패턴 1: 소환 (3마리 무작위 보스)
      this.cubicSummonTimer -= dt;
      if (this.cubicSummonTimer <= 0) {
        this.cubicSummonTimer = 15.0;
        this.spawnSubMob('special_boss', cubic.x - 20, cubic.y, cubic.pathIndex);
        this.spawnSubMob('swift_boss', cubic.x, cubic.y, cubic.pathIndex);
        this.spawnSubMob('splitter_boss', cubic.x + 20, cubic.y, cubic.pathIndex);
        this.addDamageText(cubic.x, cubic.y - 30, '⚡ 소환 패턴!', '#f6e05e');
      }

      // 패턴 3: 리젠 (HP 1,000 회복)
      if (!this.cubicHealed && cubic.hp <= 7000) {
        this.cubicHealed = true;
        cubic.hp = Math.min(cubic.maxHp, cubic.hp + 1000);
        this.addDamageText(cubic.x, cubic.y - 30, '💚 +1,000 HP 리젠!', '#48bb78');
      }

      // 패턴 4: 각성 (HP < 5,000시 스피드 2배 + 3초 전범위 타워 스턴)
      if (!this.cubicAwakened && cubic.hp <= 5000) {
        this.cubicAwakened = true;
        cubic.baseSpeed *= 2.0;
        this.towers.forEach(t => t.cooldownTimer = 3.0);
        this.spawnSubMob('special_boss', cubic.x, cubic.y, cubic.pathIndex);
        this.addDamageText(cubic.x, cubic.y - 30, '🔥 큐빅 각성! 스피드 2배!', '#e53e3e');
      }
    }

    // 7. 웨이브 종료 체크 및 전멸 클리어 보상 (GDD 2-4)
    if (this.isWaveActive) {
      // 1분(60초) 타이머 차감
      this.waveTimer -= dt;

      // 30초 경과 시 스킵 투표 창 팝업 (거부하지 않은 상태일 때만)
      if (this.waveTimer <= 30.0 && !this.votePromptShown && !this.voteRejected) {
        this.votePromptShown = true;
        this.showSkipVoteModal();
      }

      // 1분이 지나면(또는 몬스터 전멸 시) 자동 종료 및 다음 웨이브
      const timerExpired = this.waveTimer <= 0;
      const mobsCleared = this.enemiesToSpawn.length === 0 && this.enemies.length === 0;

      if (timerExpired || mobsCleared) {
        this.isWaveActive = false;
        this.hideSkipVoteModal();
        // BGM은 웨이브 사이에도 계속 재생 (전투 종료/게임오버 때만 정지)

        // 전멸 클리어 보상 (수동 넘기기를 안 했을 때만 코인 추가!)
        if (!this.waveSkipped) {
          const bonusCoins = 30 + this.currentWave * 10;
          this.inRunCoins += bonusCoins;
          this.addDamageText(400, 200, `웨이브 전멸 보너스 +${bonusCoins}🪙!`, '#ecc94b');
        }
        this.waveSkipped = false;

        // 25웨이브 완료시 깃털 보상
        stateManager.addFeathers(20 + this.currentWave * 5);

        if (this.currentWave >= 25) {
          this.stageClear();
        } else {
          // 다음 웨이브 자동 시작 (2초 딜레이)
          this.pendingAutoStart = true;
          this.autoStartDelay = 2.0;
        }
      }
    }

    // 8. 자동 웨이브 시작 타이머
    if (this.pendingAutoStart && !this.isWaveActive) {
      this.autoStartDelay -= dt;
      if (this.autoStartDelay <= 0) {
        this.pendingAutoStart = false;
        this.startWave();
      }
    }

    this.updateUI();
  }

  // --- 헬퍼 메소드 ---
  spawnSubMob(typeKey, x, y, pathIdx) {
    const mob = new Enemy(typeKey, this.path, this.getEnemyLevelMult());
    mob.x = x;
    mob.y = y;
    mob.pathIndex = Math.max(0, pathIdx);
    this.enemies.push(mob);
  }

  findTargetForTower(tower, stats) {
    let best = null;
    let maxDist = -1;

    for (let e of this.enemies) {
      if (e.isDead || e.reachedEnd) continue;
      const d = Math.hypot(e.x - tower.x, e.y - tower.y);
      if (d <= stats.range) {
        if (stats.targetClosestToCastle) {
          if (e.pathIndex > maxDist) {
            maxDist = e.pathIndex;
            best = e;
          }
        } else {
          return e; // 첫 대상
        }
      }
    }
    return best;
  }

  findTargetsInRange(x, y, range, limit = 999) {
    return this.enemies.filter(e => !e.isDead && !e.reachedEnd && Math.hypot(e.x - x, e.y - y) <= range).slice(0, limit);
  }

  spawnProjectile(tower, target, stats) {
    this.projectiles.push(new Projectile(tower, target, stats));
  }

  spawnGasCloud(x, y, radius, dps, duration) {
    this.gasClouds.push({ x, y, radius, dps, duration, color: 'rgba(154, 230, 180, 0.35)' });
  }

  // 범용 장판(용암/함정 등) 생성
  spawnHazard(x, y, radius, dps, duration, color) {
    this.gasClouds.push({ x, y, radius, dps, duration, color: color || 'rgba(229,62,62,0.35)' });
  }

  // 소환물/설치물 생성 (병아리, 임시 포탑, 터렛)
  spawnMinion(opts) {
    this.minions.push(new Minion(opts));
  }

  // 경로 위 임의 지점 (엔지니어 새 함정 설치용)
  randomPathPoint() {
    if (!this.path || this.path.length < 2) return null;
    const i = Math.floor(Math.random() * (this.path.length - 1));
    const a = this.path[i], b = this.path[i + 1];
    const t = Math.random();
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
  }

  // 지정 위치에서 사거리 내 가장 가까운 경로 지점 (뜨거운 새 용암 설치용)
  nearestPathPoint(x, y, maxDist) {
    if (!this.path || this.path.length < 2) return null;
    let best = null, bestD = Infinity;
    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.path[i], b = this.path[i + 1];
      for (let t = 0; t <= 1; t += 0.1) {
        const px = a[0] + (b[0] - a[0]) * t;
        const py = a[1] + (b[1] - a[1]) * t;
        const d = Math.hypot(px - x, py - y);
        if (d < bestD) { bestD = d; best = { x: px, y: py }; }
      }
    }
    if (maxDist != null && bestD > maxDist) return null;
    return best;
  }

  // 오라형 타워(파티광/급한/지휘관 새)의 버프를 주변 타워에 매 프레임 적용
  applyAuras() {
    this.towers.forEach(t => t.resetAura());

    this.towers.forEach(src => {
      const s = src.getStats();
      const hasAura = s.auraAtk || s.auraSpd || s.auraCrit || s.auraAoe;
      if (!hasAura) return;
      const radius = s.auraRange || 130;

      this.towers.forEach(dst => {
        if (dst === src) return;
        if (Math.hypot(dst.x - src.x, dst.y - src.y) > radius) return;
        dst.auraBuff.atk += (s.auraAtk || 0);
        dst.auraBuff.spd += (s.auraSpd || 0);
        dst.auraBuff.crit += (s.auraCrit || 0);
        dst.auraBuff.aoe += (s.auraAoe || 0);
      });
    });
  }

  addInRunCoins(amt) {
    this.inRunCoins += amt;
    this.updateUI();
  }

  addFeathers(amt) {
    stateManager.addFeathers(amt);
  }

  addDamageText(x, y, text, color = '#ffffff') {
    this.damageTexts.push({ x, y, text, color, life: 1.2 });
  }

  gameOver() {
    this.stop();
    this.pauseBGM();
    // 웨이브 종료 처리 (전투 중 이동 잠금 해제)
    this.isWaveActive = false;
    this.pendingAutoStart = false;
    this.hideSkipVoteModal();

    const overlay = document.getElementById('game-overlay');
    if (overlay) {
      overlay.className = 'game-overlay-visible';
      document.getElementById('overlay-title').textContent = 'STAGE FAILED';
      // 실패 시에는 부가 설명 없이 STAGE FAILED만 표시
      const subtitle = document.getElementById('overlay-subtitle');
      subtitle.textContent = '';
      subtitle.classList.add('hidden');
    }
  }

  stageClear() {
    this.stop();
    this.pauseBGM();
    const stars = this.castleHp >= 15 ? 3 : (this.castleHp >= 8 ? 2 : 1);
    stateManager.state.stars = Math.max(stateManager.state.stars, stars);

    // 다음 스테이지 해금
    stateManager.unlockStage(this.currentStage + 1);

    // 스테이지 클리어 재료 드롭 (모이 제작에 사용)
    const drops = rollStageMaterialDrops(this.currentStage);
    drops.forEach(d => stateManager.addMaterial(d.id, d.qty));

    // 암시장 재화(이상한 보석) 드롭
    const gemQty = rollStageGemDrop(this.currentStage);
    if (gemQty > 0) stateManager.state.strangeGems = (stateManager.state.strangeGems || 0) + gemQty;
    stateManager.save();

    const overlay = document.getElementById('game-overlay');
    if (overlay) {
      overlay.className = 'game-overlay-visible';
      document.getElementById('overlay-title').textContent = '🎉 STAGE CLEAR!';
      const dropList = drops.map(d => `${d.icon} ${d.name} x${d.qty}`);
      if (gemQty > 0) dropList.push(`💜 이상한 보석 x${gemQty}`);
      const dropText = dropList.length > 0
        ? '<br><br>🎁 드롭: ' + dropList.join(' · ')
        : '<br><br>이번엔 아무것도 드롭되지 않았습니다.';
      const nextStageText = STAGES[this.currentStage + 1] ? '<br>다음 스테이지가 해금되었습니다!' : '';
      const subtitle = document.getElementById('overlay-subtitle');
      subtitle.classList.remove('hidden');
      subtitle.innerHTML = `축하합니다! ⭐ ${stars}성으로 ${this.getStageConfig().name}를 클리어하셨습니다!${nextStageText}${dropText}`;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 맵 경로 그리기 (S자 커브)
    this.ctx.strokeStyle = '#4a5568';
    this.ctx.lineWidth = 40;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.path.forEach((p, i) => {
      if (i === 0) this.ctx.moveTo(p[0], p[1]);
      else this.ctx.lineTo(p[0], p[1]);
    });
    this.ctx.stroke();

    this.ctx.strokeStyle = '#cbd5e0';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    // 성(Gate) 아이콘
    const gatePos = this.path[this.path.length - 1];
    this.ctx.font = '32px sans-serif';
    this.ctx.fillText('🏰', gatePos[0] - 20, gatePos[1] + 10);

    // 1-1. 독가스 지역 그리기
    this.gasClouds.forEach(g => {
      this.ctx.save();
      this.ctx.fillStyle = g.color || 'rgba(154, 230, 180, 0.35)';
      this.ctx.strokeStyle = (g.color || 'rgba(154, 230, 180, 0.35)').replace(/0\.35\)$/, '0.7)');
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    });

    // 1-2. 선택된 타워의 사거리를 원으로 표시 (범위 감이 안 잡힐 때 확인용)
    if (this.selectedTower) {
      const st = this.selectedTower;
      const stStats = st.getStats();
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 4]);
      this.ctx.beginPath();
      this.ctx.arc(st.x, st.y, stStats.range, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.fill();
      this.ctx.restore();
    }

    // 2. 타워 그리기
    this.towers.forEach(t => t.draw(this.ctx));

    // 2-1. 소환물/설치물 그리기
    this.minions.forEach(m => m.draw(this.ctx));

    // 3. 몬스터 그리기
    this.enemies.forEach(e => e.draw(this.ctx));

    // 4. 투사체 그리기
    this.projectiles.forEach(p => p.draw(this.ctx));

    // 5. 데미지 텍스트 그리기
    this.damageTexts.forEach(d => {
      this.ctx.save();
      this.ctx.fillStyle = d.color;
      this.ctx.font = 'bold 14px Outfit, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(d.text, d.x, d.y);
      this.ctx.restore();
    });

    // 6. 드래그 프리뷰 렌더링
    if (this.isDragging && this.dragBirdId && this.mouseInCanvas) {
      const template = BIRD_TEMPLATES[this.dragBirdId];
      if (template) {
        const lvlInfo = template.levels[0];
        const range = lvlInfo.range || 120;
        const onPath = this.isOnPath(this.mouseX, this.mouseY, 28);
        const tooClose = this.towers.some(t => Math.hypot(t.x - this.mouseX, t.y - this.mouseY) < 32);
        const isValid = !onPath && !tooClose;

        // 사거리 원 프리뷰
        this.ctx.save();
        this.ctx.strokeStyle = isValid ? 'rgba(66, 153, 225, 0.4)' : 'rgba(245, 101, 101, 0.4)';
        this.ctx.fillStyle = isValid ? 'rgba(66, 153, 225, 0.08)' : 'rgba(245, 101, 101, 0.08)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.mouseX, this.mouseY, range, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.restore();

        // 반투명 새 실루엣
        this.ctx.save();
        this.ctx.globalAlpha = isValid ? 0.6 : 0.3;
        drawBirdCanvas(this.ctx, this.dragBirdId, this.mouseX, this.mouseY, 40, 0, { level: 1 });
        this.ctx.restore();

        // 배치 불가 표시
        if (!isValid) {
          this.ctx.save();
          this.ctx.strokeStyle = '#f56565';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(this.mouseX, this.mouseY, 18, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.beginPath();
          this.ctx.moveTo(this.mouseX - 12, this.mouseY - 12);
          this.ctx.lineTo(this.mouseX + 12, this.mouseY + 12);
          this.ctx.stroke();
          this.ctx.restore();
        }
      }
    }
  }

  updateUI() {
    const elWave = document.getElementById('current-wave');
    const elHp = document.getElementById('gate-hp');
    const elHpBar = document.getElementById('gate-hp-bar');
    const elCoins = document.getElementById('player-coins');
    const elFeathers = document.getElementById('player-feathers');
    const elTimer = document.getElementById('wave-timer');

    if (elWave) elWave.textContent = `${this.currentWave} / 25`;
    if (elHp) elHp.textContent = `${Math.max(0, this.castleHp)} / ${this.maxCastleHp}`;
    if (elHpBar) elHpBar.style.width = `${(Math.max(0, this.castleHp) / this.maxCastleHp) * 100}%`;
    if (elCoins) elCoins.textContent = Math.floor(this.inRunCoins);
    if (elFeathers) elFeathers.textContent = stateManager.state.feathers;
    if (elTimer) elTimer.textContent = Math.max(0, Math.ceil(this.waveTimer));

    // 코인이 바뀔 때마다 덱 패널(배치 가능 여부 표시)도 갱신하도록 알림
    // (gameEngine.inRunCoins는 stateManager.state에 없어 subscribe 기반 재렌더링을 못 받음)
    document.dispatchEvent(new CustomEvent('coins-changed'));
  }

  renderSelectedTowerPanel() {
    const panel = document.getElementById('selected-tower-panel');
    if (!panel) return;
    if (!this.selectedTower) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    const t = this.selectedTower;
    const stats = t.getStats();

    document.getElementById('sel-tower-name').textContent = t.name;
    document.getElementById('sel-tower-level').textContent = t.runLevel;
    // 공격력이 낮은 새는 반올림하면 버프가 안 보이므로 10 미만은 소수 1자리까지 표시
    const fmtDmg = (v) => v < 10 ? v.toFixed(1) : Math.round(v);
    document.getElementById('sel-tower-dmg').textContent = fmtDmg(stats.atk);
    document.getElementById('sel-tower-speed').textContent = stats.interval.toFixed(2);
    document.getElementById('sel-tower-range').textContent = Math.round(stats.range);

    // 직접 공격(atk)이 아예 없는 새(경제형/소환형/특수형 등)는 "공격력: 0.0"이 오해를 사므로
    // 공격력·공격속도 항목을 숨기고 대신 실제 효과 설명(effectDesc)을 보여준다
    const hasDirectAttack = stats.atk > 0;
    const dmgRow = document.getElementById('sel-tower-dmg-row');
    const speedRow = document.getElementById('sel-tower-speed-row');
    const effectRow = document.getElementById('sel-tower-effect-row');
    if (dmgRow) dmgRow.classList.toggle('hidden', !hasDirectAttack);
    if (speedRow) speedRow.classList.toggle('hidden', !hasDirectAttack);
    if (effectRow) {
      if (hasDirectAttack) {
        effectRow.classList.add('hidden');
      } else {
        effectRow.textContent = `✨ ${stats.effectDesc || '특수 효과'}`;
        effectRow.classList.remove('hidden');
      }
    }

    // 다음 레벨로 강화하면 능력치가 얼마나 오르는지 미리보기(하양 화살표 → 초록 다음 수치)
    const nextLvl = t.runLevel + 1;
    const showUpgradePreview = (id, curVal, nextVal, fmt) => {
      const wrap = document.getElementById(`sel-tower-${id}-upgrade`);
      const nextEl = document.getElementById(`sel-tower-${id}-next`);
      if (!wrap || !nextEl) return;
      if (nextVal == null || Math.abs(nextVal - curVal) < 0.001) {
        wrap.classList.add('hidden');
        return;
      }
      nextEl.textContent = fmt(nextVal);
      wrap.classList.remove('hidden');
    };

    if (nextLvl <= t.template.levels.length) {
      const savedLevel = t.runLevel;
      t.runLevel = nextLvl;
      const nextStats = t.getStats();
      t.runLevel = savedLevel;

      showUpgradePreview('dmg', stats.atk, nextStats.atk, fmtDmg);
      showUpgradePreview('speed', stats.interval, nextStats.interval, (v) => v.toFixed(2));
      showUpgradePreview('range', stats.range, nextStats.range, (v) => Math.round(v));
    } else {
      ['dmg', 'speed', 'range'].forEach(id => {
        const wrap = document.getElementById(`sel-tower-${id}-upgrade`);
        if (wrap) wrap.classList.add('hidden');
      });
    }

    // 모이를 먹은 개체면 효과 표기
    const feedEl = document.getElementById('sel-tower-feed');
    if (feedEl) {
      if (t.feed) {
        feedEl.innerHTML = `${t.feed.icon} <b>${t.feed.name}</b><br><small>${t.feed.desc || ''}</small>`;
        feedEl.classList.remove('hidden');
      } else {
        feedEl.classList.add('hidden');
      }
    }

    const upgradeBtn = document.getElementById('btn-upgrade-tower');
    if (upgradeBtn) {
      if (t.runLevel >= t.template.levels.length) {
        upgradeBtn.textContent = '최대 레벨';
        upgradeBtn.disabled = true;
      } else {
        // 다음 레벨의 비용을 표시 (현재 레벨이 아닌 업그레이드 대상 레벨의 cost)
        const nextLevelStats = t.template.levels[t.runLevel]; // runLevel is 1-based, so levels[1] = level 2
        const upgradeCost = nextLevelStats.cost || 0;
        upgradeBtn.textContent = `업그레이드 (${upgradeCost}🪙)`;
        upgradeBtn.disabled = this.inRunCoins < upgradeCost;
      }
    }
  }

  upgradeSelectedTower() {
    if (!this.selectedTower) return;
    const t = this.selectedTower;
    const nextLvl = t.runLevel + 1;
    if (nextLvl > t.template.levels.length) return;

    const nextStats = t.template.levels[nextLvl - 1];
    if (this.inRunCoins >= nextStats.cost) {
      this.inRunCoins -= nextStats.cost;
      t.totalSpent += nextStats.cost; // 투자 비용 누적
      t.runLevel = nextLvl;
      soundEngine.playCoin();
      this.updateUI();
      this.renderSelectedTowerPanel();
    }
  }

  sellSelectedTower() {
    if (!this.selectedTower) return;
    // 판매가 = 총 투자 비용 (배치비용 + 업그레이드비용) × 50%
    const refund = Math.floor(this.selectedTower.totalSpent * 0.5);
    this.inRunCoins += refund;

    // 폭발성 새: 회수 시 주변에 대폭발
    const sellStats = this.selectedTower.getStats();
    if (sellStats.deathExplode) {
      const near = this.findTargetsInRange(this.selectedTower.x, this.selectedTower.y, sellStats.aoeRadius || 48);
      near.forEach(m => m.takeDamage(sellStats.deathExplode, this, this.selectedTower));
      this.addDamageText(this.selectedTower.x, this.selectedTower.y - 20, '💥 대폭발!', '#dd6b20');
    }

    this.towers = this.towers.filter(t => t !== this.selectedTower);
    this.selectedTower = null;
    soundEngine.playCoin();
    this.updateUI();
    this.renderSelectedTowerPanel();
  }
}
