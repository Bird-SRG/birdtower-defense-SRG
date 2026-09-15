/* Bird Tower Defense - Objects & Entities (Full GDD Engine Support) */

import { BIRD_TEMPLATES, MONSTER_TEMPLATES, PLACEMENT_COSTS, GRADE_COLORS, getEnhanceMult,
         FEED_DAMAGE_KEYS, FEED_COOLDOWN_KEYS, FEED_RANGE_KEYS } from '../state.js';
import { drawBirdCanvas, soundEngine } from '../assets.js';

// --- 몬스터 개체 클래스 ---
export class Enemy {
  constructor(typeKey, path, levelMultiplier = 1.0) {
    this.id = 'mob_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    this.typeKey = typeKey;
    const tmpl = MONSTER_TEMPLATES[typeKey] || MONSTER_TEMPLATES.basic;
    
    this.name = tmpl.name;
    this.icon = tmpl.icon || '👾';
    this.maxHp = tmpl.hp * levelMultiplier;
    this.hp = this.maxHp;
    this.baseSpeed = tmpl.speed;
    this.speed = tmpl.speed;
    this.isBoss = tmpl.isBoss || false;
    this.isCubic = tmpl.isCubic || false;
    this.isShaman = tmpl.isShaman || false;
    this.isSplitter = tmpl.isSplitter || false;
    this.isSplitterBoss = tmpl.isSplitterBoss || false;
    
    this.path = path;
    this.pathIndex = 0;
    this.x = path[0][0];
    this.y = path[0][1];
    this.radius = this.isCubic ? 30 : (this.isBoss ? 22 : 14);
    
    this.isDead = false;
    this.reachedEnd = false;
    
    // 디버프 및 상태
    this.stunTimer = 0;
    this.rootTimer = 0;
    this.slowRatio = 0;
    this.slowTimer = 0;
    this.burnDmg = 0;
    this.burnTimer = 0;
    this.poisonStacks = 0;
    this.poisonDmg = 0;
    this.poisonTimer = 0;
    this.pigeonStacks = 0; // 비둘기 감염 스택 (3스택 시 즉사)
    this.armorShred = 0; // % 방어 감소
    this.shredTimer = 0;
    this.curseAmp = 0; // % 받피증
    this.curseTimer = 0;
    this.mindControlAtk = 0;
    this.isMindControlled = false;
    this.mindControlTimer = 0;
    
    // Special Abilities CD
    this.shamanCD = 4.0;
  }

  update(dt, gameEngine) {
    if (this.isDead || this.reachedEnd) return;

    // 디버프 타이머 처리
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }
    if (this.rootTimer > 0) {
      this.rootTimer -= dt;
      return;
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowRatio = 0;
    }

    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.hp -= this.burnDmg * dt;
      if (this.hp <= 0) {
        this.die(gameEngine);
        return;
      }
    }

    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      if (this.poisonTimer <= 0) this.poisonStacks = 0;
      this.hp -= this.poisonDmg * dt;
      if (this.hp <= 0) {
        this.die(gameEngine);
        return;
      }
    }

    // 저주(받피증) / 방어 감소 지속시간 만료 처리
    if (this.curseTimer > 0) {
      this.curseTimer -= dt;
      if (this.curseTimer <= 0) this.curseAmp = 0;
    }
    if (this.shredTimer > 0) {
      this.shredTimer -= dt;
      if (this.shredTimer <= 0) this.armorShred = 0;
    }

    // 빙의(해커 새): 그 자리에 멈춰 주변 적을 공격
    if (this.mindControlTimer > 0) {
      this.mindControlTimer -= dt;
      if (this.mindControlTimer <= 0) {
        this.isMindControlled = false;
        this.mindControlAtk = 0;
      } else {
        const allies = gameEngine.findTargetsInRange(this.x, this.y, 70, 3);
        allies.forEach(m => {
          if (m !== this && !m.isMindControlled) m.takeDamage(this.mindControlAtk * dt, gameEngine);
        });
        return; // 빙의 중에는 이동하지 않음
      }
    }

    // 주술사 스킬 (해골 소환)
    if (this.isShaman) {
      this.shamanCD -= dt;
      if (this.shamanCD <= 0) {
        this.shamanCD = 5.0;
        const skelType = Math.random() < 0.5 ? 'skeleton' : 'fast_skeleton';
        gameEngine.spawnSubMob(skelType, this.x, this.y, this.pathIndex);
      }
    }

    // 이동 처리
    const target = this.path[this.pathIndex + 1];
    if (!target) {
      this.reachedEnd = true;
      return;
    }

    const dx = target[0] - this.x;
    const dy = target[1] - this.y;
    const dist = Math.hypot(dx, dy);
    
    const curSpeed = this.baseSpeed * (1 - this.slowRatio);
    const step = curSpeed * 45 * dt;

    if (dist <= step) {
      this.x = target[0];
      this.y = target[1];
      this.pathIndex++;
      if (this.pathIndex >= this.path.length - 1) {
        this.reachedEnd = true;
      }
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  takeDamage(amount, gameEngine, attacker = null) {
    if (this.isDead) return;
    
    // 방어 감소 및 저주 증폭 계산
    let finalDmg = amount * (1 + this.curseAmp) * (1 + this.armorShred);
    this.hp -= finalDmg;
    
    // 데미지 텍스트 파티클
    if (gameEngine) {
      gameEngine.addDamageText(this.x, this.y - 15, Math.round(finalDmg));
    }

    if (this.hp <= 0) {
      this.die(gameEngine, attacker);
    }
  }

  die(gameEngine, attacker = null) {
    if (this.isDead) return;
    this.isDead = true;
    
    // 적 처치시 코인 보상 (인런)
    const coinGain = this.isCubic ? 100 : (this.isBoss ? 30 : 2);
    if (gameEngine) {
      gameEngine.addInRunCoins(coinGain);
    }

    // 분열 몬스터 특수 사망
    if (this.isSplitter && gameEngine) {
      gameEngine.spawnSubMob('split_sub', this.x - 10, this.y, this.pathIndex);
      gameEngine.spawnSubMob('split_sub', this.x + 10, this.y, this.pathIndex);
    }
    
    // 분열자 보스 사망시 (1차/2차 분열)
    if (this.isSplitterBoss && gameEngine) {
      gameEngine.spawnSubMob('special_boss', this.x - 15, this.y, this.pathIndex);
      gameEngine.spawnSubMob('swift_boss', this.x + 15, this.y, this.pathIndex);
    }

    // 광부 새 깃털 드롭
    if (attacker && attacker.featherChance && Math.random() < attacker.featherChance && gameEngine) {
      gameEngine.addFeathers(1);
    }
  }

  draw(ctx) {
    if (this.isDead || this.reachedEnd) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 디버프 오라 표시
    if (this.stunTimer > 0) {
      ctx.fillStyle = '#f6e05e';
      ctx.font = '12px sans-serif';
      ctx.fillText('💫', -6, -this.radius - 12);
    } else if (this.rootTimer > 0) {
      ctx.fillStyle = '#68d391';
      ctx.font = '12px sans-serif';
      ctx.fillText('🌿', -6, -this.radius - 12);
    } else if (this.burnTimer > 0) {
      ctx.fillStyle = '#f56565';
      ctx.font = '12px sans-serif';
      ctx.fillText('🔥', -6, -this.radius - 12);
    } else if (this.poisonTimer > 0) {
      ctx.fillStyle = '#68d391';
      ctx.font = '12px sans-serif';
      ctx.fillText('☠️' + this.poisonStacks, -10, -this.radius - 12);
    } else if (this.pigeonStacks > 0) {
      ctx.fillStyle = '#9ae6b4';
      ctx.font = '12px sans-serif';
      ctx.fillText('🦠' + this.pigeonStacks, -10, -this.radius - 12);
    } else if (this.isMindControlled) {
      ctx.fillStyle = '#b794f4';
      ctx.font = '12px sans-serif';
      ctx.fillText('🧠', -6, -this.radius - 12);
    }

    // 아이콘 & 바디
    ctx.font = `${this.radius * 1.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.icon, 0, 0);

    // HP 바
    const barW = this.radius * 2.2;
    const barH = 4;
    const hpRatio = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-barW / 2, this.radius + 4, barW, barH);

    ctx.fillStyle = hpRatio > 0.5 ? '#48bb78' : (hpRatio > 0.2 ? '#ecc94b' : '#f56565');
    ctx.fillRect(-barW / 2, this.radius + 4, barW * hpRatio, barH);

    ctx.restore();
  }
}

// --- 타워(새) 개체 클래스 ---
export class Tower {
  constructor(birdId, x, y, runLevel = 1, birdData = {}) {
    this.id = 'tower_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
    this.birdId = birdId;
    this.x = x;
    this.y = y;
    this.runLevel = runLevel; // 인런 레벨 (1 ~ 3/4/5)
    this.buff = birdData.buff || null;
    this.feed = birdData.feed || null;
    this.enhanceLevel = birdData.enhanceLevel || 0;

    const template = BIRD_TEMPLATES[birdId];
    this.template = template;
    this.name = template.name;
    this.grade = template.grade;

    // 총 투자 코인 (배치비용 + 업그레이드 비용 누적) — 판매 환급 계산용
    const placementCost = PLACEMENT_COSTS[template.grade] || 15;
    this.totalSpent = placementCost;

    this.cooldownTimer = 0;
    this.isSelected = false;
    this.angle = 0;
    
    // 특수 스택/타이머
    this.chargedStacks = 0;
    this.henEggTimer = 0;
    this.henEggCount = 0;
    this.digestTimer = 0;
    this.devouredMobs = 0;

    // 소환/설치/장판/펄스 쿨다운
    this.summonTimer = 0;
    // 소환사 새 마지막 레벨: 원거리/근접 병아리를 번갈아 소환하기 위한 토글
    this.chickAlternate = false;
    this.turretTimer = 0;
    this.lavaTimer = 0;
    this.pulseTimer = 0;
    this.globalBurnTimer = 0;
    this.hackTimer = 0;
    this.healTimer = 0;

    // 버드-오-트론 모드 전환 (false=원거리, true=근접)
    this.switchTimer = 0;
    this.meleeMode = false;

    // 음악가 새 펄스로 누적되는 치명타 버프 (스택 상한까지 누적, 지속)
    this.musicStacks = 0;
    this.musicCritChance = 0;
    this.musicCritDmg = 0;
    this.auraBuff = { atk: 0, spd: 0, crit: 0, aoe: 0, critDmg: 0 };
  }

  // 매 프레임 오라 재계산 전에 초기화
  resetAura() {
    this.auraBuff = { atk: 0, spd: 0, crit: 0, aoe: 0, critDmg: 0 };
  }

  getStats() {
    const lvlIdx = Math.min(this.runLevel - 1, this.template.levels.length - 1);
    const lvlInfo = this.template.levels[lvlIdx];

    // 버드-오-트론: 근접/원거리 모드마다 독립적인 공격력·공격속도·사거리 사용
    const isMeleeMode = this.birdId === 'bird_o_tron' && this.meleeMode;
    let atk = (isMeleeMode && lvlInfo.meleeAtk != null) ? lvlInfo.meleeAtk : (lvlInfo.atk || 0);
    let interval = (isMeleeMode && lvlInfo.meleeInterval != null) ? lvlInfo.meleeInterval : (lvlInfo.interval || 1.0);
    let range = (isMeleeMode && lvlInfo.meleeRange != null) ? lvlInfo.meleeRange : (lvlInfo.range || 120);

    // 모이 버프 적용
    if (this.buff) {
      if (this.buff.type === 'power') atk *= (1 + this.buff.val);
      if (this.buff.type === 'speed') interval *= (1 - this.buff.val);
      if (this.buff.type === 'sight') range *= (1 + this.buff.val);
    }

    const enhanceMult = getEnhanceMult(this.enhanceLevel);
    atk *= enhanceMult;

    // 주변 오라 버프 적용 (파티광/급한/지휘관 새 등)
    const aura = this.auraBuff || { atk: 0, spd: 0, crit: 0, aoe: 0, critDmg: 0 };
    atk *= (1 + aura.atk);
    interval *= (1 - Math.min(0.8, aura.spd));

    const stats = { ...lvlInfo, atk, interval, range, enhanceMult };
    const dmgKeys = [
      'atkMin', 'atkMax', 'burnDmg', 'poisonDmg', 'explodeDmg', 'chickAtk',
      'deathExplode', 'turretAtk', 'dotDmg', 'lavaDmg', 'tAtk', 'trDmg',
      'gasDmg', 'globalBurn', 'atkPct'
    ];
    dmgKeys.forEach(key => {
      if (typeof stats[key] === 'number') stats[key] *= enhanceMult;
    });

    // --- 모이 버프 적용 (계열별로 특수 능력 수치까지 함께 강화) ---
    if (this.feed) {
      const dMult = this.feed.damage || 1;
      const cMult = this.feed.cooldown || 1;  // 1 미만이면 쿨타임 감소
      const rMult = this.feed.range || 1;

      if (dMult !== 1) {
        FEED_DAMAGE_KEYS.forEach(k => {
          if (typeof stats[k] === 'number') stats[k] *= dMult;
        });
      }
      if (cMult !== 1) {
        FEED_COOLDOWN_KEYS.forEach(k => {
          if (typeof stats[k] === 'number' && stats[k] > 0) stats[k] *= cMult;
        });
      }
      if (rMult !== 1) {
        FEED_RANGE_KEYS.forEach(k => {
          if (typeof stats[k] === 'number') stats[k] *= rMult;
        });
      }
    }

    // 광역 반경 오라 보정 (지휘관 새)
    if (stats.aoeRadius) stats.aoeRadius *= (1 + aura.aoe);

    // 치명타: 오라(지휘관) + 음악가 스택 누적치
    stats.critChance = (aura.crit || 0) + (this.musicCritChance || 0);
    stats.critDmgBonus = (this.musicCritDmg || 0);
    return stats;
  }

  update(dt, gameEngine) {
    const stats = this.getStats();

    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }
    if (this.digestTimer > 0) {
      this.digestTimer -= dt;
    }

    // 소환/경제 타워 업데이트
    if (this.birdId === 'farmer_bird' || this.birdId === 'fancy_bird') {
      if (stats.cps) {
        gameEngine.addInRunCoins(stats.cps * dt);
      }
    } else if (this.birdId === 'gambler_bird') {
      if (this.cooldownTimer <= 0) {
        this.cooldownTimer = stats.interval;
        const gain = Math.floor(Math.random() * (stats.coinMax - stats.coinMin + 1)) + stats.coinMin;
        gameEngine.addInRunCoins(gain);
        gameEngine.addDamageText(this.x, this.y - 20, `+${gain}🪙`, '#ecc94b');
      }
    } else if (this.birdId === 'hen') {
      this.henEggTimer += dt;
      if (this.henEggTimer >= stats.eggInterval) {
        this.henEggTimer = 0;
        this.henEggCount += stats.eggCount;
        let totalGain = stats.eggCount * stats.coinPerEgg;
        gameEngine.addInRunCoins(totalGain);

        let isGolden = Math.random() < stats.goldenChance;
        if (stats.pityGolden && this.henEggCount >= 10) {
          isGolden = true;
          this.henEggCount = 0;
        }
        if (isGolden) {
          gameEngine.addFeathers(stats.pityGolden ? 2 : 1);
          gameEngine.addDamageText(this.x, this.y - 25, '🪶 깃털!', '#f6e05e');
        }
      }
    }

    // --- 주기형 특수 능력 ---

    // 소환사 새: 병아리 소환
    if (stats.summonCD) {
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        this.summonTimer = stats.summonCD;
        // 병아리는 성에서 스폰되어 몬스터 출입구 쪽으로 돌진하는 유닛으로 소환된다
        // 마지막 레벨(근접형 병아리 스탯 보유)에서는 소환할 때마다 원거리/근접 병아리를 번갈아 낸다
        const isMaxLevel = this.runLevel >= this.template.levels.length;
        const useMelee = isMaxLevel && stats.chickMeleeAtk != null && this.chickAlternate;
        if (isMaxLevel && stats.chickMeleeAtk != null) this.chickAlternate = !this.chickAlternate;

        const chickHp = useMelee ? stats.chickMeleeHp : stats.chickHp;
        const chickAtk = useMelee ? stats.chickMeleeAtk : stats.chickAtk;
        const chickInterval = useMelee ? stats.chickMeleeInterval : stats.chickInterval;
        const chickRange = useMelee ? stats.chickMeleeRange : stats.chickRange;
        const chickIcon = useMelee ? '🐔' : '🐤';

        const gate = gameEngine.path[gameEngine.path.length - 1];
        for (let i = 0; i < (stats.chickCount || 1); i++) {
          gameEngine.spawnMinion({
            x: gate[0], y: gate[1] + (i * 14) - 7,
            hp: chickHp, atk: chickAtk, interval: chickInterval, range: chickRange,
            icon: chickIcon, owner: this,
            mode: 'charge', pathIndex: gameEngine.path.length - 1
          });
        }
        const hasAlternate = isMaxLevel && stats.chickMeleeAtk != null;
        const spawnLabel = hasAlternate ? (useMelee ? '🐔 근접 병아리!' : '🐤 원거리 병아리!') : '🐤 소환!';
        gameEngine.addDamageText(this.x, this.y - 20, spawnLabel, '#f6e05e');
      }
    }

    // 건축가 새: 임시 포탑 설치
    if (stats.turretCD) {
      this.turretTimer -= dt;
      if (this.turretTimer <= 0) {
        this.turretTimer = stats.turretCD;
        gameEngine.spawnMinion({
          x: this.x + 26, y: this.y - 4,
          atk: stats.turretAtk, range: 120, interval: 0.8, hp: stats.turretHp,
          duration: stats.turretDur, icon: '🔫', owner: this
        });
      }
    }

    // 엔지니어 새: 터렛 + 경로 함정 동시 설치
    if (this.birdId === 'engineer_bird' && stats.cd) {
      this.turretTimer -= dt;
      if (this.turretTimer <= 0) {
        this.turretTimer = stats.cd;
        gameEngine.spawnMinion({
          x: this.x + 26, y: this.y - 4,
          atk: stats.tAtk, range: 140, interval: 0.7, hp: stats.tHp,
          duration: stats.tDur, icon: '🔧', owner: this
        });
        const trap = gameEngine.randomPathPoint();
        if (trap) gameEngine.spawnHazard(trap.x, trap.y, 34, stats.trDmg, 6, 'rgba(246,173,85,0.35)');
      }
    }

    // 뜨거운 새: 경로 위 용암 장판 설치
    if (stats.lavaCD) {
      this.lavaTimer -= dt;
      if (this.lavaTimer <= 0) {
        this.lavaTimer = stats.lavaCD;
        const spot = gameEngine.nearestPathPoint(this.x, this.y, stats.range);
        if (spot) gameEngine.spawnHazard(spot.x, spot.y, stats.lavaRadius, stats.lavaDmg, stats.lavaDur, 'rgba(229,62,62,0.35)');
      }
    }

    // 방화광: 주기적으로 경로 전체에 화염 (모든 적에게 화상)
    if (stats.globalBurn && stats.intervalCD) {
      this.globalBurnTimer -= dt;
      if (this.globalBurnTimer <= 0) {
        this.globalBurnTimer = stats.intervalCD;
        gameEngine.enemies.forEach(e => {
          if (e.isDead) return;
          e.burnDmg = Math.max(e.burnDmg, stats.globalBurn);
          e.burnTimer = Math.max(e.burnTimer, 5);
        });
        gameEngine.addDamageText(this.x, this.y - 22, '🔥 경로 화염!', '#e53e3e');
      }
    }

    // 음악가 새: 펄스마다 주변 아군에게 치명타 스택 부여
    if (stats.pulseCD) {
      this.pulseTimer -= dt;
      if (this.pulseTimer <= 0) {
        this.pulseTimer = stats.pulseCD;
        const maxStack = stats.maxStack || 5;
        gameEngine.towers.forEach(t => {
          if (Math.hypot(t.x - this.x, t.y - this.y) > (stats.auraRange || 140)) return;
          if (t.musicStacks >= maxStack) return;
          t.musicStacks++;
          t.musicCritChance = (t.musicCritChance || 0) + stats.stackCritChance;
          t.musicCritDmg = (t.musicCritDmg || 0) + stats.stackCritDmg;
        });
        gameEngine.addDamageText(this.x, this.y - 20, '🎵', '#b794f4');
      }
    }

    // 해커 새: 적 1명을 일정 시간 아군화(빙의)
    if (this.birdId === 'hacker_bird' && stats.cd) {
      this.hackTimer -= dt;
      if (this.hackTimer <= 0) {
        const victims = gameEngine.findTargetsInRange(this.x, this.y, stats.range, stats.count || 1)
          .filter(e => !e.isBoss && !e.isCubic && !e.isMindControlled);
        if (victims.length > 0) {
          this.hackTimer = stats.cd;
          victims.forEach(v => {
            v.isMindControlled = true;
            v.mindControlTimer = stats.dur;
            v.mindControlAtk = (stats.atkBonus || 0.3) * 10;
          });
          gameEngine.addDamageText(this.x, this.y - 20, '🧠 빙의!', '#b794f4');
        }
      }
    }

    // 오리: 주기적으로 주변 아군 타워 강화 대신 성 내구도 회복
    if (this.birdId === 'duck' && stats.healCD) {
      this.healTimer -= dt;
      if (this.healTimer <= 0) {
        this.healTimer = stats.healCD;
        const heal = Math.max(1, Math.round(gameEngine.maxCastleHp * stats.healPct));
        if (gameEngine.castleHp < gameEngine.maxCastleHp) {
          gameEngine.castleHp = Math.min(gameEngine.maxCastleHp, gameEngine.castleHp + heal);
          gameEngine.addDamageText(this.x, this.y - 22, `💚 +${heal}`, '#48bb78');
        }
      }
    }

    // 버드-오-트론: 근/원거리 모드 주기 전환
    if (stats.switchCD) {
      this.switchTimer -= dt;
      if (this.switchTimer <= 0) {
        this.switchTimer = stats.switchCD;
        this.meleeMode = !this.meleeMode;
        gameEngine.addDamageText(this.x, this.y - 20, this.meleeMode ? '⚔️ 근접' : '🏹 원거리', '#63b3ed');
      }
    }

    // 공격 처리 (비둘기는 기본 공격력이 0이지만 감염 스택을 위해 계속 공격해야 함)
    const canAttack = stats.atk > 0 || stats.atkMin > 0 || stats.atkPct > 0 ||
      this.birdId === 'pigeon' || this.birdId === 'pelican';
    if (this.cooldownTimer <= 0 && canAttack && this.digestTimer <= 0) {
      const target = gameEngine.findTargetForTower(this, stats);
      if (target) {
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.attack(target, stats, gameEngine);
        this.cooldownTimer = stats.interval;
      }
    }
  }

  attack(target, stats, gameEngine) {
    soundEngine.playShot();

    // 펠리컨 (포획 즉사)
    if (this.birdId === 'pelican') {
      const targets = gameEngine.findTargetsInRange(this.x, this.y, stats.range, stats.devourCount);
      targets.forEach(m => m.die(gameEngine, this));
      this.digestTimer = stats.digestDur;
      return;
    }

    // 충전된 새: 공격마다 전기 스택 누적 (상한까지), 스택만큼 피해 증가
    if (stats.maxStackCap) {
      this.chargedStacks = Math.min(stats.maxStackCap, this.chargedStacks + 1);
    }

    // 미니건 새: 사거리 내 다수를 동시에 난사
    if (stats.multiTarget) {
      const targets = gameEngine.findTargetsInRange(this.x, this.y, stats.range, stats.multiTarget);
      targets.forEach(m => gameEngine.spawnProjectile(this, m, stats));
      return;
    }

    // 찌르기/발사체 생성
    gameEngine.spawnProjectile(this, target, stats);
  }

  draw(ctx) {
    const stats = this.getStats();
    drawBirdCanvas(ctx, this.birdId, this.x, this.y, 40, this.angle, {
      isSelected: this.isSelected,
      range: stats.range,
      level: this.runLevel
    });

    // 버프 오라 표시
    if (this.buff) {
      ctx.save();
      ctx.strokeStyle = '#ecc94b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// --- 투사체 클래스 ---
export class Projectile {
  constructor(tower, target, stats) {
    this.x = tower.x;
    this.y = tower.y;
    this.target = target;
    this.stats = stats;
    this.tower = tower;

    this.speed = 450;
    this.isHit = false;
  }

  update(dt, gameEngine) {
    if (this.isHit) return;

    if (!this.target || this.target.isDead) {
      this.isHit = true;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 15) {
      this.hit(gameEngine);
      this.isHit = true;
    } else {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
  }

  // 이번 타격의 실제 피해량 계산 (랜덤 딜 / 체력비례 / 전기 스택 / 치명타)
  computeDamage(gameEngine) {
    const s = this.stats;
    let dmg = s.atk || 0;

    // 이상한 새: 최소~최대 사이 무작위 피해
    if (s.atkMin != null && s.atkMax != null) {
      dmg = s.atkMin + Math.random() * (s.atkMax - s.atkMin);
    }

    // 오리: 대상 최대 체력 비례 피해
    if (s.atkPct && this.target) {
      dmg += this.target.maxHp * s.atkPct;
    }

    // 충전된 새: 누적 전기 스택만큼 피해 증가 (스택당 2%)
    if (this.tower && s.maxStackCap) {
      dmg *= (1 + (this.tower.chargedStacks || 0) * 0.02);
    }

    // 용감한 새: 성에 가까울수록 피해 증가
    if (s.castleBonus && this.tower && gameEngine.path) {
      const gate = gameEngine.path[gameEngine.path.length - 1];
      const d = Math.hypot(this.tower.x - gate[0], this.tower.y - gate[1]);
      const proximity = Math.max(0, 1 - d / 500); // 성에 가까울수록 1에 근접
      dmg *= (1 + s.castleBonus * proximity * 5);
    }

    // 치명타 (암살자는 확정, 그 외에는 오라/음악가 스택 확률)
    let isCrit = false;
    if (s.critMult) {
      isCrit = true;
      dmg *= s.critMult;
    } else if (s.critChance && Math.random() < s.critChance) {
      isCrit = true;
      dmg *= (1.5 + (s.critDmgBonus || 0));
    }
    return { dmg, isCrit };
  }

  hit(gameEngine) {
    if (!this.target || this.target.isDead) return;
    const s = this.stats;

    // 타격 데미지 (비둘기처럼 기본 공격력이 0인 경우는 생략)
    const { dmg, isCrit } = this.computeDamage(gameEngine);
    if (dmg > 0) {
      // 광부 새: 방어 무시 (방깎/저주 보정을 건너뛰고 그대로 적용)
      if (s.ignoreArmor) {
        this.target.hp -= dmg;
        gameEngine.addDamageText(this.target.x, this.target.y - 15, Math.round(dmg), '#ecc94b');
        if (this.target.hp <= 0) this.target.die(gameEngine, this.tower);
      } else {
        this.target.takeDamage(dmg, gameEngine, this.tower);
      }
      if (isCrit) gameEngine.addDamageText(this.target.x, this.target.y - 28, '치명타!', '#f6e05e');
    }

    // 저격수 새: 체력이 일정 % 이하인 적 즉시 처형
    if (s.execPct && !this.target.isDead && !this.target.isCubic) {
      if (this.target.hp / this.target.maxHp <= s.execPct) {
        gameEngine.addDamageText(this.target.x, this.target.y - 28, '☠️ 처형!', '#e53e3e');
        this.target.die(gameEngine, this.tower);
      }
    }

    // 부가 효과
    if (s.stunChance && Math.random() < s.stunChance) {
      this.target.stunTimer = s.stunTime || 1.0;
    }
    if (s.rootChance && Math.random() < s.rootChance) {
      this.target.rootTimer = s.rootDur || 1.0;
    }
    if (s.freezeChance && Math.random() < s.freezeChance) {
      this.target.stunTimer = Math.max(this.target.stunTimer, s.freezeDur || 1.0);
    }
    if (s.slowRate) {
      this.target.slowRatio = s.slowRate;
      this.target.slowTimer = s.slowDur || 2.0;
    }
    if (s.burnDmg) {
      this.target.burnDmg = s.burnDmg;
      this.target.burnTimer = s.burnDur || 3.0;
    }
    // 저주받은 새: 받는 피해 증폭
    if (s.amp) {
      this.target.curseAmp = s.amp;
      this.target.curseTimer = s.dur || 4.0;
    }
    // 딱다구리: 방어력 감소 스택 누적
    if (s.armorShred) {
      const cap = (s.maxShredStack || 5) * s.armorShred;
      this.target.armorShred = Math.min(cap, (this.target.armorShred || 0) + s.armorShred);
      this.target.shredTimer = 4.0;
    }
    // 감염자 새: 확률적으로 주변 적에게 도트 전파
    if (s.infectChance && Math.random() < s.infectChance) {
      const near = gameEngine.findTargetsInRange(this.target.x, this.target.y, 70);
      near.forEach(m => {
        m.poisonDmg = Math.max(m.poisonDmg, s.dotDmg);
        m.poisonTimer = Math.max(m.poisonTimer, s.dotDur || 4.0);
      });
      gameEngine.addDamageText(this.target.x, this.target.y - 22, '🦠 전염', '#68d391');
    }
    if (s.aoeRadius) {
      const near = gameEngine.findTargetsInRange(this.x, this.y, s.aoeRadius);
      near.forEach(m => {
        if (m !== this.target) m.takeDamage(dmg * 0.7, gameEngine, this.tower);
      });
    }
    // 총잡이/정확한 새: 주변 적을 추가로 관통 타격
    if (s.pierceCount && s.pierceCount > 1) {
      const near = gameEngine.findTargetsInRange(this.target.x, this.target.y, 110, s.pierceCount);
      let pierced = 0;
      near.forEach(m => {
        if (m === this.target || pierced >= s.pierceCount - 1) return;
        m.takeDamage(dmg, gameEngine, this.tower);
        pierced++;
      });
    }

    // 비둘기: 일반 몬스터(보스 제외)에게 감염 스택 부여, 3스택 시 즉시 처치 + 독가스 생성
    if (this.tower && this.tower.birdId === 'pigeon' && !this.target.isDead && !this.target.isBoss && !this.target.isCubic) {
      this.target.pigeonStacks = (this.target.pigeonStacks || 0) + 1;
      if (this.target.pigeonStacks >= 3) {
        const gasX = this.target.x, gasY = this.target.y;
        this.target.die(gameEngine, this.tower);
        gameEngine.spawnGasCloud(gasX, gasY, this.stats.gasRad, this.stats.gasDmg, this.stats.gasDur);
      }
    }

    // 중독된 새: 맹독 스택 부여(지속 피해 갱신), 최대 스택 도달 시 폭발 피해
    if (this.tower && this.tower.birdId === 'poison_bird' && !this.target.isDead) {
      const maxStack = this.stats.maxStack || 3;
      this.target.poisonStacks = Math.min((this.target.poisonStacks || 0) + 1, maxStack);
      this.target.poisonDmg = this.stats.poisonDmg * this.target.poisonStacks;
      this.target.poisonTimer = 3.0;

      if (this.target.poisonStacks >= maxStack) {
        const explodeX = this.target.x, explodeY = this.target.y;
        this.target.poisonStacks = 0;
        this.target.poisonDmg = 0;
        this.target.poisonTimer = 0;
        const near = gameEngine.findTargetsInRange(explodeX, explodeY, this.stats.explodeRadius || 45);
        near.forEach(m => m.takeDamage(this.stats.explodeDmg, gameEngine, this.tower));
      }
    }
  }

  draw(ctx) {
    if (this.isHit) return;
    ctx.save();
    ctx.fillStyle = '#ecc94b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- 소환물/설치물 클래스 (병아리, 임시 포탑, 터렛) ---
// mode: 'turret' (제자리 설치형, 건축가/엔지니어 새) | 'charge' (돌진형, 소환사 새 병아리)
export const CHARGE_UNIT_SPEED = 70; // 돌진 유닛 이동속도 (px/s)

export class Minion {
  constructor({ x, y, atk, range, interval, duration, icon, owner, mode, hp, pathIndex }) {
    this.x = x;
    this.y = y;
    this.icon = icon || '🐤';
    this.owner = owner || null;
    this.isDead = false;
    this.mode = mode || 'turret';

    if (this.mode === 'charge') {
      // 돌진형: 사거리 안에 몬스터가 들어오면 붙어서 공격속도마다 반복 공격한다.
      // 공격할 때마다 자신의 체력을 그만큼 소모하며(=체력이 곧 총 데미지 총량),
      // 체력이 0이 되면 소멸하고, 몬스터를 먼저 처치하면 남은 체력으로 계속 전진한다.
      this.hp = hp || 1;
      this.maxHp = this.hp;
      this.atk = atk || 1;
      this.range = range || 20;
      this.interval = interval || 1.0;
      this.cooldownTimer = 0;
      this.target = null;
      this.pathIndex = pathIndex;
    } else {
      // 설치형: 제자리에 고정되어 움직이지 않고 사거리 안의 몬스터만 원거리로 공격한다.
      this.atk = atk || 1;
      this.range = range || 100;
      this.interval = interval || 1.0;
      this.duration = duration == null ? Infinity : duration;
      this.cooldownTimer = 0;
      this.hp = hp || 1;
      this.maxHp = this.hp;
    }
  }

  update(dt, gameEngine) {
    if (this.mode === 'charge') {
      this.updateCharge(dt, gameEngine);
      return;
    }

    if (this.hp <= 0) {
      this.isDead = true;
      return;
    }

    if (this.duration !== Infinity) {
      this.duration -= dt;
      if (this.duration <= 0) {
        this.isDead = true;
        return;
      }
    }

    this.cooldownTimer -= dt;
    if (this.cooldownTimer <= 0) {
      const target = gameEngine.findTargetsInRange(this.x, this.y, this.range, 1)[0];
      if (target) {
        this.cooldownTimer = this.interval;
        target.takeDamage(this.atk, gameEngine, this.owner);
      }
    }
  }

  updateCharge(dt, gameEngine) {
    if (this.isDead || this.hp <= 0) {
      this.isDead = true;
      return;
    }

    // 기존 교전 대상이 죽었거나 사거리를 벗어났으면 대상 해제
    if (this.target && (this.target.isDead || this.target.hp <= 0 || this.target.reachedEnd ||
        Math.hypot(this.target.x - this.x, this.target.y - this.y) > (this.target.radius || 14) + this.range)) {
      this.target = null;
    }

    // 대상이 없으면 사거리 안의 가장 가까운 몬스터를 찾아 교전 시작
    if (!this.target) {
      let closest = null, closestDist = Infinity;
      for (const e of gameEngine.enemies) {
        if (e.isDead || e.reachedEnd) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d <= (e.radius || 14) + this.range && d < closestDist) {
          closest = e; closestDist = d;
        }
      }
      this.target = closest;
      this.cooldownTimer = 0; // 새 대상과 교전 시작하면 즉시 첫 공격
    }

    if (this.target) {
      // 붙어서 반복 공격: 이동하지 않고 공격속도(interval)마다 데미지를 준다
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0) {
        this.cooldownTimer = this.interval;
        const dmg = Math.min(this.atk, this.hp); // 체력만큼만 데미지(=체력이 총 데미지 총량)
        this.target.takeDamage(dmg, gameEngine, this.owner);
        this.hp -= dmg;
        if (this.hp <= 0) {
          this.isDead = true;
          return;
        }
        if (this.target.isDead || this.target.hp <= 0) {
          this.target = null; // 처치 성공 → 다음 프레임부터 새 대상을 찾거나 계속 전진
        }
      }
      return; // 교전 중에는 이동하지 않음
    }

    // 경로를 역방향으로 이동: 성(출구) → 몬스터 출입구(입구)
    if (this.pathIndex <= 0) {
      this.isDead = true;
      return;
    }
    const path = gameEngine.path;
    const nextPoint = path[this.pathIndex - 1];
    const dx = nextPoint[0] - this.x;
    const dy = nextPoint[1] - this.y;
    const dist = Math.hypot(dx, dy);
    const step = CHARGE_UNIT_SPEED * dt;

    if (dist <= step) {
      this.x = nextPoint[0];
      this.y = nextPoint[1];
      this.pathIndex--;
      if (this.pathIndex <= 0) this.isDead = true; // 입구에 도착 → 소멸
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    if (this.mode === 'charge') {
      ctx.save();
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.icon, this.x, this.y);
      // 체력 바
      const barW = 20, barH = 3;
      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.x - barW / 2, this.y + 10, barW, barH);
      ctx.fillStyle = '#f6e05e';
      ctx.fillRect(this.x - barW / 2, this.y + 10, barW * ratio, barH);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.icon, this.x, this.y);
    // 남은 시간 표시 (영구 소환물 제외)
    if (this.duration !== Infinity) {
      ctx.fillStyle = '#a0aec0';
      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.fillText(this.duration.toFixed(1) + 's', this.x, this.y + 12);
    }
    // 체력 바
    if (this.maxHp) {
      const barW = 24, barH = 3;
      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.x - barW / 2, this.y + 15, barW, barH);
      ctx.fillStyle = '#68d391';
      ctx.fillRect(this.x - barW / 2, this.y + 15, barW * ratio, barH);
    }
    ctx.restore();
  }
}
