/* Bird Tower Defense - SVG Assets, Canvas Rendering & Web Audio Synthesizer */

import { BIRD_TEMPLATES, GRADE_COLORS } from './state.js';

// --- Web Audio API 사운드 합성기 ---
class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playShot() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playExplosion() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playCoin() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playHatch() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.50, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

export const soundEngine = new SoundEngine();

// --- 42종 새 커스텀 스타일 및 주 색상 테이블 ---
export const BIRD_VISUALS = {
  sparrow: { body: '#d2b48c', wing: '#8b5a2b', belly: '#f5f5dc', beak: '#ffa500' },
  heavy_bird: { body: '#707070', wing: '#404040', belly: '#a0a0a0', beak: '#333333' },
  fire_bird: { body: '#e53e3e', wing: '#dd6b20', belly: '#feebc8', beak: '#d69e2e' },
  black_bird: { body: '#2d3748', wing: '#1a202c', belly: '#4a5568', beak: '#718096' },
  
  bird2: { body: '#38a169', wing: '#276749', belly: '#c6f6d5', beak: '#ecc94b' },
  hard_bird: { body: '#4a5568', wing: '#2d3748', belly: '#cbd5e0', beak: '#1a202c' },
  gunslinger_bird: { body: '#d69e2e', wing: '#9b2c2c', belly: '#fefcbf', beak: '#744210' },
  fast_bird: { body: '#319795', wing: '#234e52', belly: '#e6fffa', beak: '#ed8936' },
  
  flame_bird: { body: '#c53030', wing: '#9b2c2c', belly: '#fff5f5', beak: '#d69e2e' },
  poison_bird: { body: '#6b46c1', wing: '#44337a', belly: '#e9d8fd', beak: '#319795' },
  farmer_bird: { body: '#dd6b20', wing: '#9c4221', belly: '#feebc8', beak: '#d69e2e' },
  summoner_bird: { body: '#3182ce', wing: '#2b6cb0', belly: '#ebf8ff', beak: '#ed8936' },
  soldier_bird: { body: '#2f855a', wing: '#22543d', belly: '#c6f6d5', beak: '#4a5568' },
  brave_bird: { body: '#b83280', wing: '#702459', belly: '#fed7e2', beak: '#d69e2e' },
  strange_bird: { body: '#805ad5', wing: '#553c9a', belly: '#faf5ff', beak: '#319795' },
  
  fancy_bird: { body: '#d69e2e', wing: '#b7791f', belly: '#fefcbf', beak: '#d69e2e' },
  miner_bird: { body: '#744210', wing: '#521b10', belly: '#feebc8', beak: '#ecc94b' },
  sniper_bird: { body: '#2c5282', wing: '#1a365d', belly: '#ebf8ff', beak: '#4a5568' },
  woodpecker: { body: '#e53e3e', wing: '#2d3748', belly: '#ffffff', beak: '#1a202c' },
  explosive_bird: { body: '#dd6b20', wing: '#c53030', belly: '#feebc8', beak: '#744210' },
  architect_bird: { body: '#319795', wing: '#285e61', belly: '#e6fffa', beak: '#d69e2e' },
  hasty_bird: { body: '#3182ce', wing: '#1a365d', belly: '#ebf8ff', beak: '#ecc94b' },
  infector_bird: { body: '#553c9a', wing: '#322659', belly: '#e9d8fd', beak: '#38a169' },
  
  party_bird: { body: '#d69e2e', wing: '#ed64a6', belly: '#fff5f5', beak: '#3182ce' },
  ice_bird: { body: '#63b3ed', wing: '#3182ce', belly: '#ebf8ff', beak: '#90cdf4' },
  gambler_bird: { body: '#ecc94b', wing: '#b7791f', belly: '#fefcbf', beak: '#c53030' },
  accurate_bird: { body: '#2b6cb0', wing: '#1a365d', belly: '#ebf8ff', beak: '#e53e3e' },
  hot_bird: { body: '#9b2c2c', wing: '#742a2a', belly: '#fff5f5', beak: '#dd6b20' },
  minigun_bird: { body: '#4a5568', wing: '#1a202c', belly: '#e2e8f0', beak: '#d69e2e' },
  commander_bird: { body: '#2c5282', wing: '#1a202c', belly: '#ebf8ff', beak: '#ecc94b' },
  musician_bird: { body: '#805ad5', wing: '#44337a', belly: '#faf5ff', beak: '#ed64a6' },
  assassin_bird: { body: '#1a202c', wing: '#000000', belly: '#4a5568', beak: '#e53e3e' },
  
  bird_o_tron: { body: '#4a5568', wing: '#3182ce', belly: '#e2e8f0', beak: '#ecc94b' },
  engineer_bird: { body: '#dd6b20', wing: '#744210', belly: '#feebc8', beak: '#319795' },
  pelican: { body: '#e2e8f0', wing: '#a0aec0', belly: '#ffffff', beak: '#dd6b20' },
  cursed_bird: { body: '#742a2a', wing: '#4a154b', belly: '#fff5f5', beak: '#9b2c2c' },
  hacker_bird: { body: '#22543d', wing: '#1c4532', belly: '#c6f6d5', beak: '#38a169' },
  duck: { body: '#ecc94b', wing: '#d69e2e', belly: '#fefcbf', beak: '#dd6b20' },
  pigeon: { body: '#a0aec0', wing: '#718096', belly: '#edf2f7', beak: '#ed64a6' },
  firebug: { body: '#c53030', wing: '#9b2c2c', belly: '#feebc8', beak: '#e53e3e' },
  charged_bird: { body: '#3182ce', wing: '#2b6cb0', belly: '#ebf8ff', beak: '#ecc94b' },
  hen: { body: '#ffffff', wing: '#e2e8f0', belly: '#feebc8', beak: '#dd6b20' }
};

// SVG 내부 참조용 고유 ID 생성기
// (같은 id가 문서에 중복되면 브라우저가 첫 번째 정의만 사용하고,
//  그 정의를 가진 탭이 다시 렌더링될 때 참조가 끊겨 이미지가 사라진다)
let svgUidCounter = 0;
function nextSvgUid(prefix) {
  svgUidCounter++;
  return `${prefix}-${svgUidCounter}`;
}

// --- Egg SVG Renderer ---
export function getEggSVG(type, size = 40) {
  const gradeColor = GRADE_COLORS[type] || '#ffffff';
  const gradId = nextSvgUid(`egg-grad-${type}`);
  return `
    <svg width="${size}" height="${size * 1.2}" viewBox="0 0 40 48" style="display:inline-block; overflow:visible; filter: drop-shadow(0 0 6px ${gradeColor});">
      <defs>
        <radialGradient id="${gradId}" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
          <stop offset="50%" stop-color="${gradeColor}"/>
          <stop offset="100%" stop-color="#1a202c"/>
        </radialGradient>
      </defs>
      <path d="M20,4 C30,4 36,20 36,32 C36,42 29,46 20,46 C11,46 4,42 4,32 C4,20 10,4 20,4 Z" fill="url(#${gradId})" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
    </svg>
  `;
}

// --- Seed Packet(씨앗 봉투) SVG Renderer ---
export function getSeedPacketSVG(type, size = 40) {
  const gradeColor = GRADE_COLORS[type] || '#ffffff';
  const gradId = nextSvgUid(`packet-paper-${type}`);
  return `
    <svg width="${size}" height="${size * 1.15}" viewBox="0 0 44 50" style="display:inline-block; overflow:visible; filter: drop-shadow(0 0 6px ${gradeColor});">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f3e6c8"/>
          <stop offset="100%" stop-color="#e2cf9e"/>
        </linearGradient>
      </defs>
      <!-- 봉투 몸통 -->
      <path d="M4,14 L40,14 L40,44 C40,46.2 38.2,48 36,48 L8,48 C5.8,48 4,46.2 4,44 Z" fill="url(#${gradId})" stroke="${gradeColor}" stroke-width="2"/>
      <!-- 접힌 상단 플랩 -->
      <path d="M4,14 L22,2 L40,14 Z" fill="${gradeColor}"/>
      <path d="M4,14 L22,2 L40,14" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>
      <!-- 박음질 스티치 라인 -->
      <line x1="8" y1="19" x2="36" y2="19" stroke="${gradeColor}" stroke-width="1" stroke-dasharray="2,2" opacity="0.7"/>
      <!-- 씨앗 라벨 원 -->
      <circle cx="22" cy="33" r="12" fill="#fffdf7" stroke="${gradeColor}" stroke-width="2"/>
      <text x="22" y="38" font-size="14" text-anchor="middle">🌱</text>
    </svg>
  `;
}

// --- HTML용 Bird SVG Renderer ---
export function getBirdSVG(type, size = 60) {
  const vis = BIRD_VISUALS[type] || { body: '#3182ce', wing: '#2b6cb0', belly: '#ebf8ff', beak: '#ecc94b' };
  const template = BIRD_TEMPLATES[type];
  const gradeColor = template ? GRADE_COLORS[template.grade] : '#ffffff';

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 60 60" style="display:block; overflow:visible; filter: drop-shadow(0 0 4px ${gradeColor}88);">
      <circle cx="30" cy="52" r="16" fill="rgba(0,0,0,0.2)" />
      <!-- 몸통 -->
      <circle cx="30" cy="30" r="18" fill="${vis.body}" />
      <circle cx="30" cy="34" r="13" fill="${vis.belly}" />
      <!-- 날개 -->
      <path d="M12,30 C6,25 6,37 12,38 Z" fill="${vis.wing}" />
      <path d="M48,30 C54,25 54,37 48,38 Z" fill="${vis.wing}" />
      <!-- 눈 -->
      <circle cx="23" cy="20" r="3" fill="#1a202c" />
      <circle cx="24" cy="19" r="1" fill="#ffffff" />
      <circle cx="37" cy="20" r="3" fill="#1a202c" />
      <circle cx="38" cy="19" r="1" fill="#ffffff" />
      <!-- 부리 -->
      <polygon points="26,24 34,24 30,32" fill="${vis.beak}" />
    </svg>
  `;
}

// --- Canvas용 Bird Rendering ---
export function drawBirdCanvas(ctx, type, x, y, size, angle = 0, state = {}) {
  const vis = BIRD_VISUALS[type] || { body: '#3182ce', wing: '#2b6cb0', belly: '#ebf8ff', beak: '#ecc94b' };
  
  ctx.save();
  ctx.translate(x, y);
  
  // 선택시 사거리 원
  if (state.isSelected && state.range) {
    ctx.strokeStyle = 'rgba(66, 153, 225, 0.4)';
    ctx.fillStyle = 'rgba(66, 153, 225, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, state.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
  }

  // 그림자
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.45, size * 0.4, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(angle);

  // 몸통
  ctx.fillStyle = vis.body;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // 배
  ctx.fillStyle = vis.belly;
  ctx.beginPath();
  ctx.arc(0, size * 0.1, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // 부리
  ctx.fillStyle = vis.beak;
  ctx.beginPath();
  ctx.moveTo(size * 0.2, -size * 0.08);
  ctx.lineTo(size * 0.45, 0);
  ctx.lineTo(size * 0.2, size * 0.08);
  ctx.closePath();
  ctx.fill();

  // 눈
  ctx.fillStyle = '#1a202c';
  ctx.beginPath();
  ctx.arc(size * 0.12, -size * 0.15, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size * 0.14, -size * 0.17, size * 0.03, 0, Math.PI * 2);
  ctx.fill();

  // 레벨 표기
  if (state.level) {
    ctx.rotate(-angle);
    ctx.fillStyle = '#ecc94b';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Lv.' + state.level, 0, -size * 0.45);
  }

  ctx.restore();
}

// --- 암시장 NPC: 사신 새 (낫 + 사신 모자) ---
export function getReaperBirdSVG(size = 110) {
  const uid = nextSvgUid('reaper');
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 120 120" style="display:block; overflow:visible;">
      <defs>
        <linearGradient id="${uid}-hood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4a3f6b"/>
          <stop offset="100%" stop-color="#1a1526"/>
        </linearGradient>
        <linearGradient id="${uid}-blade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f7fafc"/>
          <stop offset="60%" stop-color="#a0aec0"/>
          <stop offset="100%" stop-color="#4a5568"/>
        </linearGradient>
        <radialGradient id="${uid}-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#e53e3e" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#e53e3e" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- 바닥 그림자 -->
      <ellipse cx="60" cy="112" rx="30" ry="6" fill="rgba(0,0,0,0.45)"/>

      <!-- 낫 자루 -->
      <line x1="97" y1="18" x2="82" y2="110" stroke="#5b4636" stroke-width="5" stroke-linecap="round"/>
      <!-- 낫 날 -->
      <path d="M97,18 C74,14 56,24 50,40 C64,30 82,28 95,34 C99,28 99,22 97,18 Z"
            fill="url(#${uid}-blade)" stroke="#2d3748" stroke-width="1.5" stroke-linejoin="round"/>

      <!-- 로브(몸통) -->
      <path d="M60,44 C78,44 88,62 88,86 C88,100 76,106 60,106 C44,106 32,100 32,86 C32,62 42,44 60,44 Z"
            fill="url(#${uid}-hood)"/>
      <!-- 로브 앞자락 주름 -->
      <path d="M46,96 L52,78 L60,96 L68,78 L74,96" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="2"/>

      <!-- 후드 그늘 -->
      <ellipse cx="60" cy="52" rx="24" ry="20" fill="#120e1c"/>

      <!-- 붉은 눈빛 -->
      <ellipse cx="60" cy="54" rx="20" ry="12" fill="url(#${uid}-glow)"/>
      <circle cx="52" cy="53" r="3.4" fill="#ff4d4d"/>
      <circle cx="68" cy="53" r="3.4" fill="#ff4d4d"/>
      <circle cx="52.8" cy="52.2" r="1.1" fill="#fff5f5"/>
      <circle cx="68.8" cy="52.2" r="1.1" fill="#fff5f5"/>

      <!-- 부리 -->
      <polygon points="55,60 65,60 60,70" fill="#d69e2e"/>

      <!-- 사신 모자(후드) 외곽 -->
      <path d="M60,20 C80,20 92,38 90,56 C86,44 74,36 60,36 C46,36 34,44 30,56 C28,38 40,20 60,20 Z"
            fill="url(#${uid}-hood)" stroke="#0d0a14" stroke-width="1.5"/>
      <!-- 모자 끝 늘어짐 -->
      <path d="M88,50 C96,58 96,70 90,76 C90,66 88,58 84,52 Z" fill="#2a2140"/>
    </svg>
  `;
}
