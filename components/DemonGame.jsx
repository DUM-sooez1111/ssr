"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const W = 1600;
const H = 900;
const THRONE = { x: 800, y: 154 };
const LANES = [515, 650, 800, 950, 1085];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const SAVE_KEY = "demon-king-final-stand-save-v1";
const PROGRESS_KEY = "demon-king-final-stand-progress-v1";
const SETTINGS_KEY = "demon-king-final-stand-settings-v1";
const DRAW_COST = 10;
const MINION_BASE_CAP = 12;
const STRUCTURES = {
  turret: { label: "영혼 포탑", cost: 25, hp: 180, icon: "▲" },
  wall: { label: "망자의 벽", cost: 18, hp: 420, icon: "▰" },
  factory: { label: "영혼 공장", cost: 40, hp: 240, icon: "◆" },
};

const LOOT_TABLE = {
  weapon: {
    label: "무기",
    names: {
      common: "검은 칼날", uncommon: "강철 참검", rare: "지옥 룬검", heroic: "영웅 파쇄검",
      epic: "심연 대검", unique: "혼식검", legendary: "군주의 대검", mythic: "신살검",
      ancient: "태고의 마검", demonic: "마왕의 종말검",
    },
  },
  armor: {
    label: "방어구",
    names: {
      common: "흑철 판갑", uncommon: "강철 중갑", rare: "영혼 방벽", heroic: "영웅의 파갑",
      epic: "심연 갑주", unique: "혼식 장갑", legendary: "불멸 갑주", mythic: "신화 마갑",
      ancient: "태고의 성벽", demonic: "마왕의 절대갑",
    },
  },
  undead: {
    label: "망자",
    names: {
      common: "해골 계약", uncommon: "망자 서약", rare: "망령 핵", heroic: "기사의 유골",
      epic: "심연의 뼈", unique: "혼식 심장", legendary: "죽음의 인장", mythic: "사령왕의 핵",
      ancient: "태고의 유해", demonic: "마왕의 불사령",
    },
  },
};

const RARITY = {
  common: { label: "일반", power: 1, chance: 35, color: "#b8c5c7", skinTier: 0 },
  uncommon: { label: "고급", power: 2, chance: 22, color: "#7edb8c", skinTier: 0 },
  rare: { label: "희귀", power: 3, chance: 15, color: "#63dceb", skinTier: 0 },
  heroic: { label: "영웅", power: 4, chance: 10, color: "#6f91ff", skinTier: 1 },
  epic: { label: "에픽", power: 5, chance: 7, color: "#b66cff", skinTier: 1 },
  unique: { label: "유일", power: 7, chance: 4.5, color: "#ef64c7", skinTier: 1 },
  legendary: { label: "전설", power: 9, chance: 3, color: "#f1bb4e", skinTier: 2 },
  mythic: { label: "신화", power: 12, chance: 1.8, color: "#ff704d", skinTier: 2 },
  ancient: { label: "태고", power: 16, chance: 1.2, color: "#f7f0b1", skinTier: 2 },
  demonic: { label: "마왕", power: 22, chance: .5, color: "#ff304c", skinTier: 2 },
};
const RARITY_ORDER = Object.keys(RARITY);

const SKILL_BRANCHES = [
  {
    id: "attack", label: "공격", icon: "⚔", color: "#e6573f",
    nodes: [
      { id: "rage", name: "마왕의 격노", icon: "🔥", max: 5, description: "기본 공격 피해 +8%" },
      { id: "blade", name: "파멸의 검", icon: "🗡", max: 3, requires: ["rage", 2], description: "마왕검 피해 +12" },
      { id: "inferno", name: "지옥의 핵", icon: "☄", max: 3, requires: ["blade", 2], description: "지옥불 피해 +20" },
      { id: "execution", name: "처형자", icon: "☠", max: 3, requires: ["inferno", 2], description: "약한 적에게 추가 피해" },
      { id: "haste", name: "광란", icon: "⚡", max: 3, requires: ["rage", 3], description: "기본 공격 속도 증가" },
    ],
  },
  {
    id: "defense", label: "방어", icon: "◆", color: "#4a9fdd",
    nodes: [
      { id: "vitality", name: "불멸의 육체", icon: "✚", max: 5, description: "최대 체력 +10" },
      { id: "guard", name: "어둠의 방벽", icon: "⬟", max: 3, requires: ["vitality", 2], description: "받는 피해 4% 감소" },
      { id: "fortress", name: "왕좌의 수호자", icon: "♜", max: 1, requires: ["guard", 3], description: "최대 체력 +50" },
      { id: "recovery", name: "불사 재생", icon: "♥", max: 3, requires: ["vitality", 3], description: "초당 체력 회복" },
      { id: "thorns", name: "가시 갑주", icon: "✹", max: 3, requires: ["guard", 2], description: "근접 공격자에게 반사 피해" },
    ],
  },
  {
    id: "support", label: "보조", icon: "♣", color: "#72b957",
    nodes: [
      { id: "harvest", name: "영혼 수확", icon: "◈", max: 5, description: "영혼 획득량 +10%" },
      { id: "commander", name: "망자의 지휘관", icon: "♟", max: 3, requires: ["harvest", 2], description: "망자 공격·체력 증가" },
      { id: "fortune", name: "마왕의 행운", icon: "✦", max: 3, requires: ["commander", 1], description: "고등급 뽑기 확률 증가" },
      { id: "legion", name: "불사의 군단", icon: "♚", max: 3, requires: ["commander", 2], description: "망자 상한 +3" },
      { id: "architect", name: "지옥 건축술", icon: "⌂", max: 3, requires: ["harvest", 3], description: "구조물 효율 증가" },
    ],
  },
];

const makeSkillTree = () => Object.fromEntries(SKILL_BRANCHES.flatMap(branch => branch.nodes.map(node => [node.id, 0])));
const xpNeeded = level => 80 + (level - 1) * 45;

const SKILLS = [
  { id: "sword", key: "R / 우클릭", name: "마왕검 휘두르기", sub: "전방 · 0.8초", color: "#73d7ff", icon: "⚔" },
  { id: "slash", key: "SPACE", name: "파멸의 낫", sub: "근접 · 2초", color: "#f3d18a", icon: "☾" },
  { id: "fire", key: "Q", name: "지옥불 폭발", sub: "범위 · 7초", color: "#ff5b28", icon: "♨" },
  { id: "summon", key: "E", name: "망자 소환", sub: "영혼 8 · 쿨타임 없음", color: "#b889ff", icon: "♟" },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const arenaXBounds = (y) => {
  const depth = clamp((y - 180) / 675, 0, 1);
  const inset = 305 - depth * 175;
  return { min: inset, max: W - inset };
};

function keepInArena(entity, maxY = 855) {
  entity.y = clamp(entity.y, 180, maxY);
  const bounds = arenaXBounds(entity.y);
  entity.x = clamp(entity.x, bounds.min, bounds.max);
}

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    if (saved?.version !== 1) return null;
    return {
      souls: Math.max(0, Math.floor(Number(saved.souls) || 0)),
      swordLevel: Math.max(0, Math.floor(Number(saved.swordLevel) || 0)),
      magicLevel: Math.max(0, Math.floor(Number(saved.magicLevel) || 0)),
      minionLevel: Math.max(0, Math.floor(Number(saved.minionLevel) || 0)),
      healLevel: Math.max(0, Math.floor(Number(saved.healLevel) || 0)),
      playerLevel: Math.max(1, Math.floor(Number(saved.playerLevel) || 1)),
      xp: Math.max(0, Math.floor(Number(saved.xp) || 0)),
      skillPoints: Math.max(0, Math.floor(Number(saved.skillPoints) || 0)),
      skillTree: Object.fromEntries(Object.keys(makeSkillTree()).map(key => [key, Math.max(0, Math.floor(Number(saved.skillTree?.[key]) || 0))])),
      maxHp: Math.max(100, Math.floor(Number(saved.maxHp) || 100)),
      equippedWeapon: RARITY[saved.equippedWeapon] ? saved.equippedWeapon : null,
      equippedArmor: RARITY[saved.equippedArmor] ? saved.equippedArmor : null,
      equippedUndead: RARITY[saved.equippedUndead] ? saved.equippedUndead : null,
      inventory: Array.isArray(saved.inventory)
        ? saved.inventory
          .filter(item => LOOT_TABLE[item?.category] && RARITY[item?.rarity])
          .map(item => ({
            category: item.category,
            rarity: item.rarity,
            name: String(item.name || LOOT_TABLE[item.category].names[item.rarity]),
            count: Math.max(1, Math.floor(Number(item.count) || 1)),
          }))
        : [],
    };
  } catch {
    localStorage.removeItem(PROGRESS_KEY);
    return null;
  }
}

function saveProgress(s) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      version: 1,
      souls: s.souls,
      swordLevel: s.swordLevel,
      magicLevel: s.magicLevel,
      minionLevel: s.minionLevel,
      healLevel: s.healLevel,
      playerLevel: s.playerLevel,
      xp: s.xp,
      skillPoints: s.skillPoints,
      skillTree: s.skillTree,
      maxHp: s.player.maxHp,
      equippedWeapon: RARITY[s.equippedWeapon] ? s.equippedWeapon : null,
      equippedArmor: RARITY[s.equippedArmor] ? s.equippedArmor : null,
      equippedUndead: RARITY[s.equippedUndead] ? s.equippedUndead : null,
      inventory: Array.isArray(s.inventory) ? s.inventory : [],
    }));
  } catch {
    // The active run can continue even when browser storage is unavailable.
  }
}

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return {
      motion: saved?.motion !== false,
      screenShake: saved?.screenShake !== false,
      autoOpenInventory: saved?.autoOpenInventory !== false,
    };
  } catch {
    return { motion: true, screenShake: true, autoOpenInventory: true };
  }
}

function inventoryPower(inventory, category) {
  return (inventory || [])
    .filter(item => item.category === category)
    .reduce((total, item) => total + (RARITY[item.rarity]?.power || 1) * (item.count || 1), 0);
}

function equippedUndeadPower(s) {
  return RARITY[s.equippedUndead]?.power || 0;
}

function equippedItemPower(s, category) {
  const key = category === "weapon" ? "equippedWeapon" : category === "armor" ? "equippedArmor" : "equippedUndead";
  return RARITY[s[key]]?.power || 0;
}

function makeState() {
  return {
    started: false,
    over: false,
    win: false,
    time: 0,
    wave: 1,
    waveTimer: 0,
    restTimer: 0,
    spawnTimer: 0,
    bossSpawnedWave: 0,
    kills: 0,
    score: 0,
    souls: 0,
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    equippedUndead: null,
    nextEntityId: 1,
    summonCount: 0,
    swordLevel: 0,
    minionLevel: 0,
    healLevel: 0,
    playerLevel: 1,
    xp: 0,
    skillPoints: 0,
    skillTree: makeSkillTree(),
    shake: 0,
    flash: 0,
    player: { x: 800, y: 265, hp: 100, maxHp: 100, angle: Math.PI / 2, hurt: 0, moving: false },
    magicLevel: 0,
    cooldowns: { sword: 0, slash: 0, fire: 0, shot: 0 },
    enemies: [],
    shots: [],
    enemyShots: [],
    minions: [],
    particles: [],
    rings: [],
    swings: [],
    soulOrbs: [],
    xpOrbs: [],
    structures: [],
    structureBeams: [],
  };
}

function addParticles(s, x, y, color, count = 12, power = 1) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (40 + Math.random() * 130) * power;
    s.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: .35 + Math.random() * .5, max: .85, color,
      size: 2 + Math.random() * 5,
    });
  }
}

function drawDiamond(ctx, x, y, r, fill, stroke = "#111") {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawPlayerEquipment(ctx, equipment, time) {
  const armor = RARITY[equipment?.armor];
  const weapon = RARITY[equipment?.weapon];
  if (armor) {
    const tier = armor.skinTier || 0;
    ctx.save();
    ctx.globalAlpha = .82;
    ctx.shadowColor = armor.color;
    ctx.shadowBlur = 12 + tier * 8;
    ctx.fillStyle = `${armor.color}aa`;
    ctx.strokeStyle = armor.color;
    ctx.lineWidth = 2 + tier;
    ctx.beginPath();
    ctx.moveTo(-29 - tier * 3, -52);
    ctx.lineTo(-18, -17);
    ctx.lineTo(0, -7 - tier * 2);
    ctx.lineTo(18, -17);
    ctx.lineTo(29 + tier * 3, -52);
    ctx.lineTo(15, -65 - tier * 3);
    ctx.lineTo(0, -55);
    ctx.lineTo(-15, -65 - tier * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-30, -52, 9 + tier * 3, 0, Math.PI * 2);
    ctx.arc(30, -52, 9 + tier * 3, 0, Math.PI * 2);
    ctx.fill();
    if (tier >= 2) {
      ctx.fillStyle = "#17100d";
      ctx.beginPath();
      ctx.moveTo(-40, -61); ctx.lineTo(-53, -76); ctx.lineTo(-32, -68); ctx.closePath();
      ctx.moveTo(40, -61); ctx.lineTo(53, -76); ctx.lineTo(32, -68); ctx.closePath();
      ctx.fill();
      drawDiamond(ctx, 0, -39, 8, armor.color, "#fff0bf");
    }
    ctx.restore();
  }
  if (weapon) {
    const tier = weapon.skinTier || 0;
    const pulse = 1 + Math.sin(time * 6) * .04;
    ctx.save();
    ctx.translate(37 + tier * 3, -29);
    ctx.rotate(.53);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = weapon.color;
    ctx.shadowBlur = 12 + tier * 10;
    ctx.strokeStyle = weapon.color;
    ctx.lineWidth = 7 + tier * 2;
    ctx.beginPath();
    ctx.moveTo(0, 16); ctx.lineTo(0, -39 - tier * 8); ctx.stroke();
    ctx.strokeStyle = "#f5f3e8";
    ctx.lineWidth = 2 + tier;
    ctx.beginPath();
    ctx.moveTo(0, 12); ctx.lineTo(0, -38 - tier * 8); ctx.stroke();
    ctx.fillStyle = weapon.color;
    ctx.beginPath();
    ctx.moveTo(0, -53 - tier * 9); ctx.lineTo(8 + tier * 2, -35); ctx.lineTo(-8 - tier * 2, -35); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d8aa4d";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-13 - tier * 2, 10); ctx.lineTo(13 + tier * 2, 10); ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(ctx, p, time, sprite, equipment) {
  ctx.save();
  const stride = p.moving ? Math.sin(time * 13) : Math.sin(time * 4) * .18;
  const stepLift = p.moving ? Math.abs(Math.sin(time * 13)) : 0;
  const attackMotion = clamp((p.attackMotion || 0) / .28, 0, 1);
  ctx.translate(p.x + stride * (p.moving ? 3.5 : .4) + attackMotion * 5, p.y - stepLift * 4 - Math.sin(attackMotion * Math.PI) * 3);
  ctx.rotate(stride * (p.moving ? .045 : .006) + Math.sin(attackMotion * Math.PI) * .1);
  ctx.scale(1 + stepLift * .018, 1 - stepLift * .025);
  if (sprite?.complete && sprite.naturalWidth > 0) {
    const size = 158;
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath();
    ctx.ellipse(0, 27 + stepLift * 4, 48 - stepLift * 4, 13 - stepLift * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.moving) {
      ctx.fillStyle = "rgba(210,65,41,.42)";
      ctx.beginPath();
      ctx.ellipse(-16 + stride * 9, 25, 12, 5, -.2, 0, Math.PI * 2);
      ctx.ellipse(16 - stride * 9, 25, 12, 5, .2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = p.hurt > 0 ? "#fff3d2" : "#d64129";
    ctx.lineWidth = 4;
    ctx.globalAlpha = .82;
    ctx.beginPath();
    ctx.ellipse(0, 24, 42, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowColor = p.hurt > 0 ? "#fff5d0" : "#ff3928";
    ctx.shadowBlur = p.hurt > 0 ? 32 : 20;
    ctx.drawImage(sprite, -size / 2, 32 - size, size, size);
    ctx.shadowBlur = 0;
    drawPlayerEquipment(ctx, equipment, time);
    ctx.restore();
    return;
  }
  ctx.rotate(p.angle - Math.PI / 2);
  ctx.shadowColor = "#ff2f22";
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fillStyle = p.hurt > 0 ? "#fff" : "#180b12";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#cf9c36";
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f5c64f";
  ctx.beginPath();
  ctx.moveTo(-18, -13); ctx.lineTo(-30, -32); ctx.lineTo(-7, -22);
  ctx.lineTo(0, -38); ctx.lineTo(7, -22); ctx.lineTo(30, -32);
  ctx.lineTo(18, -13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f13a27";
  ctx.beginPath(); ctx.arc(-8, -2, 4, 0, 7); ctx.arc(8, -2, 4, 0, 7); ctx.fill();
  ctx.strokeStyle = "#e9d49d";
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(34, 23); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 4, 6, .2, 2.9); ctx.stroke();
  ctx.restore();
}

function drawEnemy(ctx, e, sprites, time) {
  ctx.save();
  const walkSpeed = e.type === "boss" ? 6 : e.type === "tank" || e.type === "paladin" ? 8 : 10;
  const stride = e.moving ? Math.sin(time * walkSpeed + (e.phase || 0)) : Math.sin(time * 3 + (e.phase || 0)) * .12;
  const stepLift = e.moving ? Math.abs(Math.sin(time * walkSpeed + (e.phase || 0))) : 0;
  const attackProgress = clamp((e.attackMotion || 0) / .28, 0, 1);
  const attackKick = Math.sin(attackProgress * Math.PI) * (e.type === "boss" ? .15 : .1);
  ctx.translate(e.x + stride * (e.moving ? 2.5 : .3) + attackProgress * 5, e.y - stepLift * (e.type === "boss" ? 3 : 2.5));
  ctx.rotate(stride * (e.moving ? .035 : .006) + attackKick);
  ctx.scale(1 + stepLift * .014, 1 - stepLift * .018);

  if (sprites?.complete && sprites.naturalWidth > 0) {
    const spriteCells = {
      knight: [0, 0],
      mage: [1, 0],
      tank: [2, 0],
      archer: [3, 0],
      assassin: [0, 1],
      paladin: [1, 1],
      boss: [2, 1],
    };
    const [col, row] = spriteCells[e.type] || spriteCells.knight;
    const cellWidth = sprites.naturalWidth / 4;
    const cellHeight = sprites.naturalHeight / 2;
    const size = e.type === "boss" ? 178 : Math.max(112, e.r * 4.8);

    ctx.fillStyle = "rgba(0,0,0,.38)";
    ctx.beginPath();
    ctx.ellipse(0, e.r + 12 + stepLift * 3, size * (.25 - stepLift * .018), size * (.09 - stepLift * .01), 0, 0, Math.PI * 2);
    ctx.fill();
    if (e.moving) {
      ctx.fillStyle = e.type === "boss" ? "rgba(255,64,38,.38)" : "rgba(218,188,112,.3)";
      ctx.beginPath();
      ctx.ellipse(-e.r * .38 + stride * e.r * .22, e.r + 8, e.r * .34, e.r * .13, -.15, 0, Math.PI * 2);
      ctx.ellipse(e.r * .38 - stride * e.r * .22, e.r + 8, e.r * .34, e.r * .13, .15, 0, Math.PI * 2);
      ctx.fill();
    }
    const reinforced = (e.tier || 0) > 0;
    ctx.shadowColor = e.type === "boss" ? "#ff3c25" : reinforced ? "#ffd25c" : e.color;
    ctx.shadowBlur = e.type === "boss" ? 22 : reinforced ? 15 : 9;
    ctx.drawImage(
      sprites,
      col * cellWidth, row * cellHeight, cellWidth, cellHeight,
      -size / 2, e.r + 18 - size, size, size,
    );
    ctx.shadowBlur = 0;

    const barWidth = e.type === "boss" ? 110 : Math.max(42, e.r * 2.2);
    const barY = -size * .69;
    ctx.fillStyle = "rgba(15,8,8,.9)";
    ctx.fillRect(-barWidth / 2, barY, barWidth, e.type === "boss" ? 9 : 6);
    ctx.fillStyle = e.type === "boss" ? "#ff3525" : reinforced ? "#f2bd3f" : "#e34736";
    ctx.fillRect(-barWidth / 2, barY, barWidth * clamp(e.hp / e.maxHp, 0, 1), e.type === "boss" ? 9 : 6);
    if (reinforced && e.type !== "boss") {
      ctx.fillStyle = "#ffe49a";
      ctx.font = "700 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`★${e.tier}`, 0, barY - 7);
    }
    if (attackProgress > 0 && e.type !== "archer") {
      ctx.save();
      ctx.rotate((e.attackAngle || 0) - Math.PI / 2);
      ctx.globalAlpha = attackProgress;
      ctx.strokeStyle = e.type === "boss" ? "#ff3b28" : reinforced ? "#ffe078" : "#f4dfb0";
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = e.type === "boss" ? 24 : 12;
      ctx.lineWidth = e.type === "boss" ? 11 : 5;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + (e.type === "boss" ? 62 : 34), -1, .85);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  ctx.shadowColor = e.color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = e.type === "boss" ? "#351016" : "#d7d4c9";
  ctx.beginPath();
  ctx.arc(0, 0, e.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = e.color;
  ctx.fillRect(-e.r + 2, -2, (e.r - 2) * 2, e.r + 3);
  ctx.fillStyle = "#151922";
  ctx.fillRect(-8, -8, 5, 4);
  ctx.fillRect(3, -8, 5, 4);
  if (e.type === "boss") {
    ctx.fillStyle = "#e2ad45";
    ctx.beginPath();
    ctx.moveTo(-30, -20); ctx.lineTo(-45, -48); ctx.lineTo(-12, -32);
    ctx.lineTo(0, -55); ctx.lineTo(12, -32); ctx.lineTo(45, -48);
    ctx.lineTo(30, -20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff3b26";
    ctx.beginPath(); ctx.arc(-12, -7, 6, 0, Math.PI * 2); ctx.arc(12, -7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f2d78c"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-18, 12); ctx.quadraticCurveTo(0, 26, 18, 12); ctx.stroke();
  } else if (e.type === "archer") {
    ctx.fillStyle = "#3e7d46";
    ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(0, -31); ctx.lineTo(18, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#d8ad65"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(18, 2, 16, -1.3, 1.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, -14); ctx.lineTo(22, 18); ctx.stroke();
  } else if (e.type === "assassin") {
    ctx.fillStyle = "#342342";
    ctx.beginPath(); ctx.arc(0, -4, e.r + 3, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "#d9c8ed"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(-7, -2); ctx.moveTo(20, 10); ctx.lineTo(7, -2); ctx.stroke();
    ctx.fillStyle = "#cf4cff"; ctx.fillRect(-8, -8, 5, 3); ctx.fillRect(3, -8, 5, 3);
  } else if (e.type === "paladin") {
    ctx.fillStyle = "#e2bf55";
    ctx.beginPath(); ctx.moveTo(-23, -22); ctx.lineTo(0, -32); ctx.lineTo(23, -22); ctx.lineTo(20, 20); ctx.lineTo(0, 31); ctx.lineTo(-20, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f4e9be"; ctx.fillRect(-4, -23, 8, 43); ctx.fillRect(-17, -8, 34, 8);
  } else if (e.type === "mage") {
    ctx.fillStyle = "#3c67d5";
    ctx.beginPath(); ctx.moveTo(-17, -10); ctx.lineTo(0, -35); ctx.lineTo(17, -10); ctx.closePath(); ctx.fill();
  } else if (e.type === "tank") {
    ctx.strokeStyle = "#e4b94c"; ctx.lineWidth = 5; ctx.strokeRect(-20, -22, 40, 40);
  }
  const barWidth = e.type === "boss" ? 100 : 40;
  ctx.fillStyle = "#1a1515";
  ctx.fillRect(-barWidth / 2, -e.r - 17, barWidth, e.type === "boss" ? 9 : 5);
  ctx.fillStyle = "#e33d32";
  ctx.fillRect(-barWidth / 2, -e.r - 17, barWidth * (e.hp / e.maxHp), e.type === "boss" ? 9 : 5);
  ctx.restore();
}

function drawMinion(ctx, m, sprites, time) {
  ctx.save();
  const stride = m.moving ? Math.sin(time * 11 + (m.phase || 0)) : Math.sin(time * 3.5 + (m.phase || 0)) * .12;
  const stepLift = m.moving ? Math.abs(Math.sin(time * 11 + (m.phase || 0))) : 0;
  const attackProgress = clamp((m.attackMotion || 0) / .24, 0, 1);
  const attackKick = Math.sin(attackProgress * Math.PI) * .13;
  ctx.translate(m.x + stride * (m.moving ? 2.8 : .25), m.y - stepLift * 3);
  ctx.rotate(stride * (m.moving ? .04 : .006) + attackKick);
  ctx.scale(1 + stepLift * .016, 1 - stepLift * .02);

  const visualLevel = Math.max(0, m.level || 0);
  const equipment = RARITY[m.equippedRarity];
  const growthTier = visualLevel + Math.floor((m.kills || 0) / 3) >= 6 ? 2 : visualLevel + Math.floor((m.kills || 0) / 3) >= 3 ? 1 : 0;
  const tier = m.elite ? 2 : Math.max(growthTier, equipment?.skinTier || 0);
  const sprite = sprites?.[tier];
  const size = (82 + tier * 13 + Math.min(18, visualLevel * 1.5 + (m.kills || 0) * .7)) * (m.elite ? 1.28 : 1);

  ctx.fillStyle = "rgba(0,0,0,.5)";
  ctx.beginPath();
  ctx.ellipse(0, 18 + stepLift * 3, size * (.27 - stepLift * .02), size * (.09 - stepLift * .012), 0, 0, Math.PI * 2);
  ctx.fill();
  if (m.moving) {
    ctx.fillStyle = "rgba(70,239,231,.35)";
    ctx.beginPath();
    ctx.ellipse(-11 + stride * 7, 17, 9, 4, -.2, 0, Math.PI * 2);
    ctx.ellipse(11 - stride * 7, 17, 9, 4, .2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (sprite?.complete && sprite.naturalWidth > 0) {
    ctx.shadowColor = m.elite ? "#ff2d21" : equipment?.color || (tier === 2 ? "#ff9d32" : "#63eaff");
    ctx.shadowBlur = (m.elite ? 34 : 10 + tier * 7) + Math.min(14, (m.kills || 0));
    ctx.globalAlpha = m.hurt > 0 ? .58 : 1;
    ctx.drawImage(sprite, -size / 2, 23 - size, size, size);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  } else {
    ctx.shadowColor = "#70efa4";
    ctx.shadowBlur = 8;
    ctx.fillStyle = m.hurt > 0 ? "#d9ffff" : "#b9d8c2";
    ctx.strokeStyle = "#1a3024";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#151515";
    ctx.fillRect(-8, -5, 5, 5);
    ctx.fillRect(3, -5, 5, 5);
  }

  if (attackProgress > 0) {
    ctx.save();
    ctx.rotate((m.attackAngle || 0) - Math.PI / 2);
    ctx.globalAlpha = attackProgress;
    ctx.shadowColor = equipment?.color || "#69f3ed";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = equipment?.color || "#bffcff";
    ctx.lineWidth = 5 + tier * 2;
    ctx.beginPath();
    ctx.arc(0, 0, 38 + tier * 8, -.95, .9);
    ctx.stroke();
    ctx.restore();
  }

  const barWidth = 48 + tier * 7;
  const barY = 28;
  ctx.fillStyle = "rgba(5,13,16,.9)";
  ctx.fillRect(-barWidth / 2, barY, barWidth, 6);
  ctx.fillStyle = m.hurt > 0 ? "#d5ffff" : "#58e5d8";
  ctx.fillRect(-barWidth / 2, barY, barWidth * clamp(m.hp / m.maxHp, 0, 1), 6);
  ctx.fillStyle = equipment?.color || (tier === 2 ? "#ffd66d" : "#b7fbff");
  ctx.font = "800 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${m.elite ? "★ 엘리트 " : ""}망자 LV.${visualLevel} · 처치 ${m.kills || 0}`, 0, barY + 18);
  ctx.restore();
}

function drawStructure(ctx, structure, time) {
  ctx.save();
  ctx.translate(structure.x, structure.y);
  const pulse = 1 + Math.sin(time * 3 + (structure.phase || 0)) * .04;
  ctx.fillStyle = "rgba(0,0,0,.5)";
  ctx.beginPath(); ctx.ellipse(0, 20, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
  if (structure.type === "wall") {
    ctx.shadowColor = "#54c7d4"; ctx.shadowBlur = 10;
    ctx.fillStyle = structure.hurt > 0 ? "#d9ffff" : "#26373e";
    ctx.strokeStyle = "#6eb7c1"; ctx.lineWidth = 3;
    ctx.fillRect(-38, -22, 76, 40); ctx.strokeRect(-38, -22, 76, 40);
    ctx.fillStyle = "#10191d";
    for (let x = -30; x <= 26; x += 14) ctx.fillRect(x, -30, 9, 12);
  } else if (structure.type === "turret") {
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#d768ff"; ctx.shadowBlur = 18;
    ctx.fillStyle = structure.hurt > 0 ? "#fff" : "#242033";
    ctx.strokeStyle = "#b45be1"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(structure.angle || -Math.PI / 2);
    ctx.fillStyle = "#d6a9f3"; ctx.fillRect(0, -7, 42, 14);
    drawDiamond(ctx, 43, 0, 10, "#f0c8ff", "#8c36b8");
  } else {
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#5be9e5"; ctx.shadowBlur = 20;
    ctx.fillStyle = structure.hurt > 0 ? "#fff" : "#172d30";
    drawDiamond(ctx, 0, -2, 31, ctx.fillStyle, "#64d9dc");
    ctx.fillStyle = "#9df8f4"; ctx.font = "900 20px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("◈", 0, 5);
  }
  ctx.shadowBlur = 0;
  const width = structure.type === "wall" ? 74 : 58;
  ctx.fillStyle = "rgba(3,8,10,.9)"; ctx.fillRect(-width / 2, 31, width, 6);
  ctx.fillStyle = structure.type === "factory" ? "#54e8dd" : structure.type === "turret" ? "#c05fea" : "#70c3ce";
  ctx.fillRect(-width / 2, 31, width * clamp(structure.hp / structure.maxHp, 0, 1), 6);
  ctx.restore();
}

function updateGame(s, dt, keys, mouse, canvas) {
  if (!s.started || s.over) return;
  s.time += dt;
  if (s.restTimer > 0) {
    s.restTimer = Math.max(0, s.restTimer - dt);
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + dt * 2.5);
  } else {
    s.waveTimer += dt;
  }
  s.spawnTimer -= dt;
  s.shake = Math.max(0, s.shake - dt * 18);
  s.flash = Math.max(0, s.flash - dt * 3);
  s.player.hurt = Math.max(0, s.player.hurt - dt);
  s.player.attackMotion = Math.max(0, (s.player.attackMotion || 0) - dt);
  for (const k in s.cooldowns) s.cooldowns[k] = Math.max(0, s.cooldowns[k] - dt);
  const weaponPower = inventoryPower(s.inventory, "weapon") + equippedItemPower(s, "weapon") * 2;
  const armorPower = inventoryPower(s.inventory, "armor") + equippedItemPower(s, "armor") * 2;
  const undeadPower = inventoryPower(s.inventory, "undead") + equippedUndeadPower(s) * 2;
  const skillTree = { ...makeSkillTree(), ...(s.skillTree || {}) };
  const playerDamageMultiplier = 1 - Math.min(.65, armorPower * .015 + skillTree.guard * .04);
  if (skillTree.recovery > 0) s.player.hp = Math.min(s.player.maxHp, s.player.hp + skillTree.recovery * .7 * dt);

  if (s.waveTimer > 24) {
    const completedWave = s.wave;
    s.wave++;
    s.waveTimer = 0;
    if (completedWave % 5 === 0) {
      s.restTimer = 10;
      s.enemies = [];
      s.enemyShots = [];
      s.rings.push({ x: s.player.x, y: s.player.y, r: 18, life: 1.1, color: "#65eaff" });
      addParticles(s, s.player.x, s.player.y, "#65eaff", 16, .65);
    }
    s.flash = 1;
    s.rings.push({ x: THRONE.x, y: THRONE.y, r: 20, life: 1.5, color: "#ffcc52" });
  }

  if (s.wave % 10 === 0 && s.bossSpawnedWave !== s.wave) {
    const heroTier = Math.floor(s.wave / 10);
    const maxHp = Math.round((1200 + s.wave * 110) * (1 + heroTier * .22));
    s.enemies.push({
      x: 800, y: 870, r: 42, hp: maxHp, maxHp,
      speed: (38 + Math.min(24, s.wave * .45)) * (1 + Math.min(.2, heroTier * .035)),
      damage: Math.round((34 + Math.floor(s.wave * .7)) * (1 + heroTier * .16)),
      type: "boss", color: "#ff3425", attack: 0, tier: heroTier, phase: Math.random() * Math.PI * 2,
    });
    s.bossSpawnedWave = s.wave;
    s.flash = 1.4;
    s.shake = 14;
    s.rings.push({ x: 800, y: 790, r: 30, life: 1.4, color: "#ff3425" });
  }

  const moveX = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  const moveY = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;
  s.player.moving = moveX !== 0 || moveY !== 0;
  s.player.x += moveX / len * 255 * dt;
  s.player.y += moveY / len * 255 * dt;
  keepInArena(s.player, 840);
  s.player.angle = Math.atan2(mouse.y - s.player.y, mouse.x - s.player.x);

  const shoot = () => {
    if (s.cooldowns.shot > 0) return;
    s.cooldowns.shot = Math.max(.12, .28 - skillTree.haste * .035);
    s.player.attackMotion = .18;
    s.player.attackKind = "shot";
    const a = s.player.angle;
    s.shots.push({
      x: s.player.x + Math.cos(a) * 30,
      y: s.player.y + Math.sin(a) * 30,
      vx: Math.cos(a) * 620,
      vy: Math.sin(a) * 620,
      life: 1.35,
      damage: (24 + s.magicLevel * 6 + s.swordLevel * 5 + weaponPower * 2) * (1 + skillTree.rage * .08),
      execution: skillTree.execution,
    });
    addParticles(s, s.player.x, s.player.y, "#d574ff", 5, .4);
  };
  if (mouse.down || keys.has("KeyF")) shoot();

  if (s.spawnTimer <= 0 && s.restTimer <= 0) {
    const count = Math.min(4, 1 + Math.floor(s.wave / 5));
    const heroTier = Math.floor(s.wave / 10);
    const hpMultiplier = 1 + heroTier * .35;
    const damageMultiplier = 1 + heroTier * .2;
    const speedMultiplier = 1 + Math.min(.3, heroTier * .05);
    const availableTypes = ["knight"];
    if (s.wave >= 2) availableTypes.push("mage");
    if (s.wave >= 3) availableTypes.push("tank");
    if (s.wave >= 4) availableTypes.push("archer");
    if (s.wave >= 6) availableTypes.push("assassin");
    if (s.wave >= 8) availableTypes.push("paladin");
    for (let i = 0; i < count; i++) {
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const baseStats = {
        knight: { hp: 84 + s.wave * 12, r: 20, speed: 78, damage: 10, color: "#3268bb" },
        mage: { hp: 68 + s.wave * 9, r: 20, speed: 64, damage: 10, color: "#426ee9" },
        tank: { hp: 150 + s.wave * 18, r: 25, speed: 45, damage: 18, color: "#bd8435" },
        archer: { hp: 72 + s.wave * 10, r: 19, speed: 68, damage: 9 + Math.floor(s.wave * .35), color: "#3f8b4f" },
        assassin: { hp: 62 + s.wave * 8, r: 17, speed: 136, damage: 16 + Math.floor(s.wave * .4), color: "#633477" },
        paladin: { hp: 225 + s.wave * 22, r: 28, speed: 42, damage: 24 + Math.floor(s.wave * .45), color: "#d1a83f" },
      }[type];
      const stats = {
        ...baseStats,
        hp: Math.round(baseStats.hp * hpMultiplier),
        speed: baseStats.speed * speedMultiplier,
        damage: Math.round(baseStats.damage * damageMultiplier),
      };
      s.enemies.push({
        x: LANES[Math.floor(Math.random() * LANES.length)] + (Math.random() - .5) * 45,
        y: 870 + i * 35, r: stats.r,
        hp: stats.hp, maxHp: stats.hp, speed: stats.speed,
        damage: stats.damage, type, color: stats.color,
        attack: 0, tier: heroTier, phase: Math.random() * Math.PI * 2,
      });
    }
    s.spawnTimer = Math.max(.58, 2.05 - s.wave * .095);
  }

  const hurtEnemy = (e, dmg, color = "#ff653d") => {
    e.hp -= dmg;
    addParticles(s, e.x, e.y, color, 7, .55);
  };

  for (const shot of s.shots) {
    shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
    for (const e of s.enemies) {
      if (shot.life > 0 && dist(shot, e) < e.r + 10) {
        const executeMultiplier = shot.execution > 0 && e.hp / e.maxHp < .35 ? 1 + shot.execution * .18 : 1;
        hurtEnemy(e, shot.damage * executeMultiplier, "#d87cff"); shot.life = 0;
      }
    }
  }

  for (const shot of s.enemyShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life > 0 && shot.targetId) {
      const target = s.minions.find(m => m.id === shot.targetId && !m.dead);
      if (target && dist(shot, target) < 24) {
        shot.life = 0;
        target.hp -= shot.damage;
        target.hurt = .18;
        addParticles(s, target.x, target.y, "#68e8ef", 8, .5);
      }
    } else if (shot.life > 0 && shot.structureId) {
      const target = s.structures.find(structure => structure.id === shot.structureId && structure.hp > 0);
      if (target && dist(shot, target) < 35) {
        shot.life = 0;
        target.hp -= shot.damage;
        target.hurt = .18;
        addParticles(s, target.x, target.y, "#8cced6", 8, .5);
      }
    } else if (shot.life > 0 && dist(shot, s.player) < 25) {
      shot.life = 0;
      s.player.hp -= shot.damage * playerDamageMultiplier;
      s.player.hurt = .18;
      s.shake = 5;
      addParticles(s, s.player.x, s.player.y, "#e9bc72", 9, .55);
    }
  }

  for (const m of s.minions) {
    m.hurt = Math.max(0, (m.hurt || 0) - dt);
    m.attackMotion = Math.max(0, (m.attackMotion || 0) - dt);
    m.moving = false;
    if (m.hp <= 0 || m.dead) continue;
    const previousX = m.x;
    const previousY = m.y;
    let target = null;
    let targetDistance = Infinity;
    let bestScore = Infinity;
    for (const e of s.enemies) {
      const d = dist(m, e);
      if (e.hp <= 0 || d > 320) continue;
      const score = d - (e.type === "knight" ? 110 : 0);
      if (score < bestScore) {
        bestScore = score;
        targetDistance = d;
        target = e;
      }
    }
    if (target) {
      const a = Math.atan2(target.y - m.y, target.x - m.x);
      const minionSpeed = 125 + m.level * 8;
      m.x += Math.cos(a) * minionSpeed * dt; m.y += Math.sin(a) * minionSpeed * dt;
      m.attack -= dt;
      if (targetDistance < 35 + m.level * 2 && m.attack <= 0) {
        const knightAdvantage = target.type === "knight";
        const damage = (knightAdvantage ? 70 + m.level * 15 : 22 + m.level * 10)
          + undeadPower * 4 + (m.kills || 0) * 2 + skillTree.commander * 10 + (m.elite ? 320 : 0);
        const wasAlive = target.hp > 0;
        hurtEnemy(target, damage, knightAdvantage ? "#f5d56a" : "#90e2b1");
        m.attackMotion = .24;
        m.attackAngle = a;
        if (wasAlive && target.hp <= 0 && !target.minionKillClaimed) {
          target.minionKillClaimed = true;
          m.kills = (m.kills || 0) + 1;
          m.maxHp += 4;
          m.hp = Math.min(m.maxHp, m.hp + 12);
          addParticles(s, m.x, m.y, RARITY[m.equippedRarity]?.color || "#70efa4", 12, .65);
          s.rings.push({ x: m.x, y: m.y, r: 6, life: .38, color: RARITY[m.equippedRarity]?.color || "#70efa4" });
        }
        m.attack = knightAdvantage ? .55 : Math.max(.38, .75 - m.level * .035);
      }
    } else {
      const a = Math.atan2(s.player.y - m.y, s.player.x - m.x);
      if (dist(m, s.player) > 70) {
        m.x += Math.cos(a) * 70 * dt;
        m.y += Math.sin(a) * 70 * dt;
      }
    }
    keepInArena(m);
    m.moving = Math.hypot(m.x - previousX, m.y - previousY) > .1;
  }

  const livingMinions = s.minions.filter(m => !m.dead && m.hp > 0);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < livingMinions.length; i++) {
      for (let j = i + 1; j < livingMinions.length; j++) {
        const a = livingMinions[i];
        const b = livingMinions[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        const minDistance = 38 + Math.min(18, ((a.level || 0) + (b.level || 0)) * 1.2);
        if (distance >= minDistance) continue;
        if (distance < .01) {
          const angle = ((a.id || i) * 2.399 + (b.id || j)) % (Math.PI * 2);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const push = (minDistance - distance) * .52;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        a.moving = true;
        b.moving = true;
        keepInArena(a);
        keepInArena(b);
      }
    }
  }

  for (const m of s.minions) {
    if (m.hp > 0 || m.dead) continue;
    m.dead = true;
    s.soulOrbs.push({
      x: m.x,
      y: m.y,
      value: 4,
      life: 14,
      phase: Math.random() * Math.PI * 2,
    });
    addParticles(s, m.x, m.y, "#65eaff", 18, .9);
    s.rings.push({ x: m.x, y: m.y, r: 8, life: .55, color: "#65eaff" });
  }

  for (const structure of s.structures) {
    structure.hurt = Math.max(0, (structure.hurt || 0) - dt);
    if (structure.hp <= 0) continue;
    const architect = skillTree.architect || 0;
    if (structure.type === "turret") {
      structure.cooldown = Math.max(0, (structure.cooldown || 0) - dt);
      let target = null;
      let nearest = 460;
      for (const enemy of s.enemies) {
        if (enemy.hp <= 0) continue;
        const d = dist(structure, enemy);
        if (d < nearest) { nearest = d; target = enemy; }
      }
      if (target) {
        structure.angle = Math.atan2(target.y - structure.y, target.x - structure.x);
        if (structure.cooldown <= 0) {
          const damage = 34 + architect * 15;
          hurtEnemy(target, damage, "#d768ff");
          s.structureBeams.push({ x1: structure.x, y1: structure.y, x2: target.x, y2: target.y, life: .13, maxLife: .13 });
          structure.cooldown = Math.max(.35, .82 - architect * .1);
        }
      }
    }
    if (structure.type === "factory") {
      structure.production = (structure.production || 0) - dt;
      if (structure.production <= 0) {
        s.soulOrbs.push({ x: structure.x, y: structure.y - 25, value: 2 + architect, life: 18, phase: Math.random() * Math.PI * 2 });
        structure.production = Math.max(5, 11 - architect * 1.5);
        addParticles(s, structure.x, structure.y, "#5be9e5", 10, .55);
      }
    }
  }
  for (const beam of s.structureBeams) beam.life -= dt;
  s.structureBeams = s.structureBeams.filter(beam => beam.life > 0);

  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    e.attack -= dt;
    e.attackMotion = Math.max(0, (e.attackMotion || 0) - dt);
    const previousX = e.x;
    const previousY = e.y;
    let target = s.player;
    let targetIsMinion = false;
    let targetIsStructure = false;
    let nearestMinionDistance = Infinity;
    for (const minion of s.minions) {
      if (minion.dead || minion.hp <= 0) continue;
      const d = dist(e, minion);
      if (d < nearestMinionDistance) {
        nearestMinionDistance = d;
        target = minion;
        targetIsMinion = true;
      }
    }
    if (!targetIsMinion) {
      let bestStructureScore = Infinity;
      for (const structure of s.structures) {
        if (structure.hp <= 0) continue;
        const d = dist(e, structure);
        const score = d - (structure.type === "wall" ? 150 : 0);
        if (score < bestStructureScore) {
          bestStructureScore = score;
          target = structure;
          targetIsStructure = true;
        }
      }
    }
    const dp = dist(e, target);
    const a = Math.atan2(target.y - e.y, target.x - e.x);
    if (e.type === "archer") {
      if (dp > 340) {
        e.x += Math.cos(a) * e.speed * dt;
        e.y += Math.sin(a) * e.speed * dt;
      } else if (dp < 225) {
        e.x -= Math.cos(a) * e.speed * .75 * dt;
        e.y -= Math.sin(a) * e.speed * .75 * dt;
      }
      if (dp < 480 && e.attack <= 0) {
        const arrowSpeed = 340;
        s.enemyShots.push({
          x: e.x, y: e.y, vx: Math.cos(a) * arrowSpeed, vy: Math.sin(a) * arrowSpeed,
          life: 2.1, damage: e.damage, type: "arrow",
          targetId: targetIsMinion ? target.id : null,
          structureId: targetIsStructure ? target.id : null,
        });
        e.attackMotion = .28;
        e.attackAngle = a;
        e.attack = 1.55;
      }
    } else if (dp > e.r + (targetIsMinion ? 22 : targetIsStructure ? 34 : 27)) {
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
    } else if (e.attack <= 0) {
      if (targetIsMinion || targetIsStructure) {
        target.hp -= e.damage;
        target.hurt = .18;
        addParticles(s, target.x, target.y, targetIsStructure ? "#8cced6" : "#65eaff", 9, .6);
      } else {
        s.player.hp -= e.damage * playerDamageMultiplier;
        if (skillTree.thorns > 0) e.hp -= skillTree.thorns * 9;
        s.player.hurt = .18;
        s.shake = 7;
        addParticles(s, s.player.x, s.player.y, "#ff3333", 10, .7);
      }
      e.attackMotion = .28;
      e.attackAngle = a;
      e.attack = 1.05;
    }
    keepInArena(e);
    e.moving = Math.hypot(e.x - previousX, e.y - previousY) > .1;
  }

  for (const structure of s.structures) {
    if (structure.hp <= 0 && !structure.dead) {
      structure.dead = true;
      addParticles(s, structure.x, structure.y, "#6bbcc7", 22, 1);
      s.rings.push({ x: structure.x, y: structure.y, r: 8, life: .6, color: "#6bbcc7" });
    }
  }
  s.structures = s.structures.filter(structure => !structure.dead);

  for (const e of s.enemies) {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; s.kills++;
      const rewards = {
        boss: { score: 5000 + s.wave * 100, souls: 30 },
        paladin: { score: 420, souls: 4 },
        assassin: { score: 240, souls: 2 },
        archer: { score: 190, souls: 2 },
        tank: { score: 300, souls: 3 },
        mage: { score: 180, souls: 2 },
        knight: { score: 100, souls: 1 },
      }[e.type];
      s.score += rewards.score;
      const baseSoulValue = e.type === "boss"
        ? rewards.souls + (e.tier || 0) * 10
        : rewards.souls * (1 + (e.tier || 0));
      const soulValue = Math.max(1, Math.round(baseSoulValue * (1 + skillTree.harvest * .1)));
      const xpValue = Math.round(({
        boss: 180, paladin: 42, assassin: 28, archer: 22, tank: 32, mage: 20, knight: 14,
      }[e.type] + s.wave * 1.5) * (1 + (e.tier || 0) * .35));
      s.soulOrbs.push({
        x: e.x, y: e.y, value: soulValue, life: 14,
        phase: Math.random() * Math.PI * 2,
      });
      s.xpOrbs.push({
        x: e.x + (Math.random() - .5) * 20,
        y: e.y + (Math.random() - .5) * 20,
        value: xpValue,
        life: 16,
        phase: Math.random() * Math.PI * 2,
      });
      addParticles(s, e.x, e.y, "#ff8a38", 18, 1);
    }
  }
  s.enemies = s.enemies.filter(e => !e.dead);
  s.shots = s.shots.filter(x => x.life > 0);
  s.enemyShots = s.enemyShots.filter(x => x.life > 0);
  s.minions = s.minions.filter(x => !x.dead);
  for (const swing of s.swings) swing.life -= dt;
  s.swings = s.swings.filter(x => x.life > 0);
  for (const soul of s.soulOrbs) {
    soul.life -= dt;
    soul.phase += dt * 5;
    const d = dist(soul, s.player);
    if (d < 230 || soul.life < 10) {
      const a = Math.atan2(s.player.y - soul.y, s.player.x - soul.x);
      const speed = 110 + (230 - Math.min(230, d)) * 1.8;
      soul.x += Math.cos(a) * speed * dt;
      soul.y += Math.sin(a) * speed * dt;
    }
    if (d < 30 && !soul.collected) {
      soul.collected = true;
      s.souls += soul.value;
      addParticles(s, s.player.x, s.player.y, "#65eaff", 8 + soul.value, .65);
    }
  }
  s.soulOrbs = s.soulOrbs.filter(x => x.life > 0 && !x.collected);
  for (const orb of s.xpOrbs) {
    orb.life -= dt;
    orb.phase += dt * 4;
    const d = dist(orb, s.player);
    if (d < 210 || orb.life < 11) {
      const a = Math.atan2(s.player.y - orb.y, s.player.x - orb.x);
      const speed = 100 + (210 - Math.min(210, d)) * 1.6;
      orb.x += Math.cos(a) * speed * dt;
      orb.y += Math.sin(a) * speed * dt;
    }
    if (d < 30 && !orb.collected) {
      orb.collected = true;
      s.xp += orb.value;
      addParticles(s, s.player.x, s.player.y, "#7d8dff", 9, .6);
      while (s.xp >= xpNeeded(s.playerLevel)) {
        s.xp -= xpNeeded(s.playerLevel);
        s.playerLevel++;
        s.skillPoints++;
        s.player.maxHp += 5;
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + 25);
        s.rings.push({ x: s.player.x, y: s.player.y, r: 8, life: .8, color: "#8e9dff" });
        addParticles(s, s.player.x, s.player.y, "#d4d8ff", 22, .9);
      }
    }
  }
  s.xpOrbs = s.xpOrbs.filter(x => x.life > 0 && !x.collected);
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt; }
  s.particles = s.particles.filter(p => p.life > 0);
  for (const r of s.rings) { r.r += 420 * dt; r.life -= dt; }
  s.rings = s.rings.filter(r => r.life > 0);

  if (s.player.hp <= 0) { s.over = true; s.win = false; }
}

export default function DemonGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeState());
  const keysRef = useRef(new Set());
  const mouseRef = useRef({ x: 800, y: 450, down: false });
  const [ui, setUi] = useState({ started: false, over: false, win: false, wave: 1, rest: 0, hp: 100, maxHp: 100, kills: 0, score: 0, souls: 0, swordLevel: 0, magicLevel: 0, minionLevel: 0, healLevel: 0, playerLevel: 1, xp: 0, xpNeeded: 80, skillPoints: 0, skillTree: makeSkillTree(), inventory: [], equippedWeapon: null, equippedArmor: null, equippedUndead: null, minions: [], minionCap: MINION_BASE_CAP, structures: [], summonCost: 8, cooldowns: {}, boss: null });
  const [muted, setMuted] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryTab, setInventoryTab] = useState("undead");
  const [drawNotice, setDrawNotice] = useState("");
  const [indexOpen, setIndexOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [skillTreeOpen, setSkillTreeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ motion: true, screenShake: true, autoOpenInventory: true });
  const settingsRef = useRef(settings);
  const [buildMode, setBuildMode] = useState(null);

  const syncUi = useCallback(() => {
    const s = stateRef.current;
    const boss = s.enemies.find(e => e.type === "boss");
    setUi({
      started: s.started, over: s.over, win: s.win, wave: s.wave, rest: s.restTimer,
      hp: Math.max(0, s.player.hp), maxHp: s.player.maxHp,
      kills: s.kills, score: s.score, souls: s.souls, swordLevel: s.swordLevel, magicLevel: s.magicLevel, minionLevel: s.minionLevel, healLevel: s.healLevel || 0,
      playerLevel: s.playerLevel || 1, xp: s.xp || 0, xpNeeded: xpNeeded(s.playerLevel || 1),
      skillPoints: s.skillPoints || 0, skillTree: { ...makeSkillTree(), ...(s.skillTree || {}) },
      inventory: Array.isArray(s.inventory) ? s.inventory.map(item => ({ ...item })) : [],
      equippedWeapon: s.equippedWeapon,
      equippedArmor: s.equippedArmor,
      equippedUndead: s.equippedUndead,
      minions: s.minions.filter(m => !m.dead).map(m => ({ id: m.id, hp: m.hp, maxHp: m.maxHp, kills: m.kills || 0, level: m.level || 0 })),
      minionCap: MINION_BASE_CAP + (s.skillTree?.legion || 0) * 3,
      structures: s.structures.filter(structure => !structure.dead).map(structure => ({ id: structure.id, type: structure.type, hp: structure.hp, maxHp: structure.maxHp })),
      summonCost: 8 + (s.summonCount || 0) * 2,
      cooldowns: { ...s.cooldowns },
      boss: boss ? { hp: Math.max(0, boss.hp), maxHp: boss.maxHp } : null,
    });
  }, []);

  const saveGame = useCallback((silent = false) => {
    const s = stateRef.current;
    if (!s.started || s.over) return;
    const snapshot = {
      ...s,
      particles: [],
      rings: [],
      swings: [],
      shots: [],
      enemyShots: [],
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), state: snapshot }));
      saveProgress(s);
      setHasSave(true);
      if (!silent) {
        setSaveNotice("저장됨");
        window.setTimeout(() => setSaveNotice(""), 1200);
      }
    } catch {
      if (!silent) setSaveNotice("저장 실패");
    }
  }, []);

  const continueGame = useCallback(() => {
    try {
      const payload = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!payload?.state || payload.version !== 1) throw new Error("invalid save");
      const base = makeState();
      const loaded = payload.state;
      const inventory = Array.isArray(loaded.inventory) ? loaded.inventory : [];
      const equippedWeapon = RARITY[loaded.equippedWeapon] ? loaded.equippedWeapon : null;
      const equippedArmor = RARITY[loaded.equippedArmor] ? loaded.equippedArmor : null;
      const equippedUndead = RARITY[loaded.equippedUndead] ? loaded.equippedUndead : null;
      const minionPower = inventoryPower(inventory, "undead") + (RARITY[equippedUndead]?.power || 0) * 2;
      const minionMaxHp = 80 + (loaded.minionLevel || 0) * 30 + minionPower * 15;
      let nextEntityId = Math.max(1, Number(loaded.nextEntityId) || 1);
      const minions = Array.isArray(loaded.minions)
        ? loaded.minions.map(minion => ({
          ...minion,
          id: minion.id || nextEntityId++,
          level: Number.isFinite(minion.level) ? minion.level : (loaded.minionLevel || 0),
          maxHp: Math.max(1, Number(minion.maxHp) || minionMaxHp),
          hp: Math.max(1, Number(minion.hp) || minionMaxHp),
          hurt: Number(minion.hurt) || 0,
          kills: Math.max(0, Math.floor(Number(minion.kills) || 0)),
          equippedRarity: RARITY[minion.equippedRarity] ? minion.equippedRarity : equippedUndead,
          phase: Number.isFinite(minion.phase) ? minion.phase : Math.random() * Math.PI * 2,
        }))
        : [];
      stateRef.current = {
        ...base,
        ...loaded,
        started: true,
        over: false,
        inventory,
        equippedWeapon,
        equippedArmor,
        equippedUndead,
        nextEntityId,
        player: { ...base.player, ...loaded.player },
        cooldowns: { ...base.cooldowns, ...loaded.cooldowns },
        enemies: Array.isArray(loaded.enemies) ? loaded.enemies : [],
        minions,
        soulOrbs: Array.isArray(loaded.soulOrbs) ? loaded.soulOrbs : [],
        xpOrbs: Array.isArray(loaded.xpOrbs) ? loaded.xpOrbs : [],
        structures: Array.isArray(loaded.structures) ? loaded.structures : [],
        structureBeams: [],
      };
      syncUi();
      canvasRef.current?.focus();
    } catch {
      localStorage.removeItem(SAVE_KEY);
      setHasSave(false);
      setSaveNotice("저장 파일 오류");
    }
  }, [syncUi]);

  const useSkill = useCallback((skill) => {
    const s = stateRef.current;
    if (!s.started || s.over) return;
    if (skill === "sword" && s.cooldowns.sword <= 0) {
      s.cooldowns.sword = .75;
      s.player.attackMotion = .28;
      s.player.attackKind = "sword";
      const tree = { ...makeSkillTree(), ...(s.skillTree || {}) };
      const weaponPower = inventoryPower(s.inventory, "weapon") + equippedItemPower(s, "weapon") * 2;
      const angle = Math.atan2(mouseRef.current.y - s.player.y, mouseRef.current.x - s.player.x);
      s.player.angle = angle;
      s.swings.push({ x: s.player.x, y: s.player.y, angle, life: .26, maxLife: .26 });
      for (const e of s.enemies) {
        const targetAngle = Math.atan2(e.y - s.player.y, e.x - s.player.x);
        if (dist(s.player, e) < 165 + e.r && Math.abs(angleDelta(targetAngle, angle)) < .95) {
          e.hp -= 52 + s.swordLevel * 14 + weaponPower * 4 + tree.blade * 12;
          e.x += Math.cos(angle) * 32;
          e.y += Math.sin(angle) * 32;
          addParticles(s, e.x, e.y, "#8ee6ff", 11, .8);
        }
      }
      s.shake = 4;
    }
    if (skill === "slash" && s.cooldowns.slash <= 0) {
      s.player.attackMotion = .3;
      s.player.attackKind = "slash";
      const slashCooldown = Math.max(1.1, 2 - s.magicLevel * .08);
      const slashRadius = 135 + s.magicLevel * 4;
      const slashDamage = 58 + s.magicLevel * 12;
      s.cooldowns.slash = slashCooldown;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 20, life: .42, color: "#f8d78e" });
      for (const e of s.enemies) {
        if (dist(s.player, e) < slashRadius) {
          e.hp -= slashDamage;
          addParticles(s, e.x, e.y, "#ffe1a2", 10, .8);
        }
      }
      s.shake = 5;
    }
    if (skill === "fire" && s.cooldowns.fire <= 0) {
      s.player.attackMotion = .32;
      s.player.attackKind = "fire";
      const tree = { ...makeSkillTree(), ...(s.skillTree || {}) };
      const fireCooldown = Math.max(4, 7 - s.magicLevel * .25);
      const fireRadius = 170 + s.magicLevel * 6;
      s.cooldowns.fire = fireCooldown;
      s.rings.push({ x: mouseRef.current.x, y: mouseRef.current.y, r: 15, life: .65, color: "#ff4f25" });
      for (const e of s.enemies) {
        if (dist(mouseRef.current, e) < fireRadius) {
          e.hp -= 95 + s.magicLevel * 18 + tree.inferno * 20;
          addParticles(s, e.x, e.y, "#ff4a22", 15, 1);
        }
      }
      s.shake = 10; s.flash = .55;
    }
    if (skill === "summon") {
      const summonCost = 8 + (s.summonCount || 0) * 2;
      if (s.souls < summonCost) return;
      const minionCap = MINION_BASE_CAP + (s.skillTree?.legion || 0) * 3;
      const availableSlots = minionCap - s.minions.filter(minion => !minion.dead && minion.hp > 0).length;
      if (availableSlots <= 0) return;
      s.souls -= summonCost;
      s.summonCount = (s.summonCount || 0) + 1;
      const undeadPower = inventoryPower(s.inventory, "undead") + equippedUndeadPower(s) * 2;
      const commanderLevel = s.skillTree?.commander || 0;
      const maxHp = 80 + s.minionLevel * 30 + undeadPower * 15 + commanderLevel * 25;
      const summonAmount = Math.min(3, availableSlots);
      for (let i = 0; i < summonAmount; i++) {
        const a = i / 3 * Math.PI * 2;
        const elite = Math.random() < .00001;
        const finalMaxHp = elite ? maxHp * 10 : maxHp;
        s.minions.push({
          id: s.nextEntityId++,
          x: s.player.x + Math.cos(a) * 55,
          y: s.player.y + Math.sin(a) * 55,
          attack: 0,
          level: s.minionLevel,
          kills: 0,
          elite,
          equippedRarity: s.equippedUndead,
          hp: finalMaxHp,
          maxHp: finalMaxHp,
          hurt: 0,
          phase: Math.random() * Math.PI * 2,
        });
      }
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .7, color: "#b889ff" });
    }
  }, []);

  const buySoulItem = useCallback((item) => {
    const s = stateRef.current;
    if (!s.started || s.over) return;
    let purchased = false;
    if (item === "sword") {
      const cost = 15 + s.swordLevel * 10;
      if (s.souls < cost) return;
      s.souls -= cost;
      s.swordLevel++;
      purchased = true;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .7, color: "#72ddff" });
      addParticles(s, s.player.x, s.player.y, "#72ddff", 18, .8);
    }
    if (item === "heal") {
      const level = s.healLevel || 0;
      const cost = 12 + level * 8;
      if (s.souls < cost) return;
      const healAmount = 35 + level * 10;
      const maxHpGain = 10 + level * 2;
      s.souls -= cost;
      s.player.maxHp += maxHpGain;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + healAmount);
      s.healLevel = level + 1;
      purchased = true;
      addParticles(s, s.player.x, s.player.y, "#65f0a0", 16, .7);
    }
    if (item === "magic") {
      const cost = 18 + s.magicLevel * 12;
      if (s.souls < cost) return;
      s.souls -= cost;
      s.magicLevel++;
      purchased = true;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .75, color: "#c077ff" });
      addParticles(s, s.player.x, s.player.y, "#c077ff", 18, .7);
    }
    if (item === "minion") {
      const cost = 20 + s.minionLevel * 15;
      if (s.souls < cost) return;
      s.souls -= cost;
      s.minionLevel++;
      for (const minion of s.minions) {
        minion.level = s.minionLevel;
        minion.maxHp += 30;
        minion.hp += 30;
      }
      purchased = true;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .75, color: "#70efa4" });
      addParticles(s, s.player.x, s.player.y, "#70efa4", 20, .75);
    }
    if (purchased) {
      syncUi();
      saveGame(true);
      setSaveNotice("강화 저장됨");
      window.setTimeout(() => setSaveNotice(""), 1200);
    }
  }, [saveGame, syncUi]);

  const drawLoot = useCallback((category) => {
    const s = stateRef.current;
    if (!s.started || s.over || s.restTimer <= 0) {
      setDrawNotice("뽑기는 휴식 시간에만 가능합니다");
      window.setTimeout(() => setDrawNotice(""), 1600);
      return;
    }
    if (s.souls < DRAW_COST) {
      setDrawNotice("영혼이 부족합니다");
      window.setTimeout(() => setDrawNotice(""), 1600);
      return;
    }
    const luckBonus = (s.skillTree?.fortune || 0) * 1.5;
    const roll = Math.min(99.999, Math.random() * 100 + luckBonus);
    let cumulativeChance = 0;
    const rarity = RARITY_ORDER.find(key => {
      cumulativeChance += RARITY[key].chance;
      return roll < cumulativeChance;
    }) || "common";
    const itemName = LOOT_TABLE[category].names[rarity];
    const power = RARITY[rarity].power;
    s.souls -= DRAW_COST;
    const owned = s.inventory.find(item => item.category === category && item.rarity === rarity);
    if (owned) owned.count += 1;
    else s.inventory.push({ category, rarity, name: itemName, count: 1 });

    if (category === "armor") {
      s.player.maxHp += power * 5;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + power * 5);
    }
    if (category === "undead") {
      for (const minion of s.minions) {
        minion.maxHp += power * 15;
        minion.hp += power * 15;
      }
    }
    setInventoryTab(category);
    setDrawNotice(`${RARITY[rarity].label} · ${itemName} 획득!`);
    window.setTimeout(() => setDrawNotice(""), 1800);
    syncUi();
    saveGame(true);
  }, [saveGame, syncUi]);

  const equipInventoryItem = useCallback((category, rarity) => {
    const s = stateRef.current;
    if (!s.started || s.over || !LOOT_TABLE[category] || !RARITY[rarity]) return;
    const owned = s.inventory.some(item => item.category === category && item.rarity === rarity);
    if (!owned) return;
    const oldPower = equippedItemPower(s, category);
    if (category === "weapon") s.equippedWeapon = rarity;
    if (category === "armor") s.equippedArmor = rarity;
    if (category === "undead") s.equippedUndead = rarity;
    const powerGain = (equippedItemPower(s, category) - oldPower) * 2;
    if (category === "armor") {
      s.player.maxHp = Math.max(100, s.player.maxHp + powerGain * 5);
      s.player.hp = clamp(s.player.hp + Math.max(0, powerGain * 5), 1, s.player.maxHp);
    }
    if (category === "undead") {
      for (const minion of s.minions) {
        minion.equippedRarity = rarity;
        minion.maxHp = Math.max(1, minion.maxHp + powerGain * 15);
        minion.hp = clamp(minion.hp + Math.max(0, powerGain * 15), 1, minion.maxHp);
      }
    }
    setDrawNotice(`${RARITY[rarity].label} ${LOOT_TABLE[category].label} 장착 완료`);
    window.setTimeout(() => setDrawNotice(""), 1600);
    syncUi();
    saveGame(true);
  }, [saveGame, syncUi]);

  const placeStructure = useCallback((type) => {
    const s = stateRef.current;
    const definition = STRUCTURES[type];
    if (!s.started || s.over || !definition) return;
    const architect = s.skillTree?.architect || 0;
    const cost = Math.max(8, Math.round(definition.cost * (1 - architect * .08)));
    const structureCap = 12 + architect * 3;
    if (s.souls < cost || s.structures.length >= structureCap) return;
    const position = { x: mouseRef.current.x, y: mouseRef.current.y };
    keepInArena(position, 825);
    if (dist(position, s.player) < 65 || s.structures.some(structure => dist(position, structure) < 75)) {
      setSaveNotice("배치 공간이 부족합니다");
      window.setTimeout(() => setSaveNotice(""), 1300);
      return;
    }
    const maxHp = Math.round(definition.hp * (1 + architect * .25));
    s.souls -= cost;
    s.structures.push({
      id: s.nextEntityId++, type, x: position.x, y: position.y,
      hp: maxHp, maxHp, cooldown: 0, production: 3,
      phase: Math.random() * Math.PI * 2, hurt: 0,
    });
    s.rings.push({ x: position.x, y: position.y, r: 8, life: .55, color: "#65eaff" });
    addParticles(s, position.x, position.y, "#65eaff", 16, .7);
    setBuildMode(null);
    syncUi();
    saveGame(true);
  }, [saveGame, syncUi]);

  const buySkillNode = useCallback((nodeId) => {
    const s = stateRef.current;
    if (!s.started || s.over || s.skillPoints <= 0) return;
    const node = SKILL_BRANCHES.flatMap(branch => branch.nodes).find(item => item.id === nodeId);
    if (!node) return;
    const tree = { ...makeSkillTree(), ...(s.skillTree || {}) };
    if (tree[nodeId] >= node.max) return;
    if (node.requires && tree[node.requires[0]] < node.requires[1]) return;
    tree[nodeId]++;
    s.skillTree = tree;
    s.skillPoints--;
    if (nodeId === "vitality") {
      s.player.maxHp += 10;
      s.player.hp += 10;
    }
    if (nodeId === "fortress") {
      s.player.maxHp += 50;
      s.player.hp += 50;
    }
    if (nodeId === "commander") {
      for (const minion of s.minions) {
        minion.maxHp += 25;
        minion.hp += 25;
      }
    }
    syncUi();
    saveGame(true);
  }, [saveGame, syncUi]);

  const resetSkillTree = useCallback(() => {
    const s = stateRef.current;
    if (!s.started || s.over) return;
    const tree = { ...makeSkillTree(), ...(s.skillTree || {}) };
    const spent = Object.values(tree).reduce((total, level) => total + level, 0);
    if (spent <= 0) return;
    const hpReduction = tree.vitality * 10 + tree.fortress * 50;
    const minionHpReduction = tree.commander * 25;
    s.player.maxHp = Math.max(100, s.player.maxHp - hpReduction);
    s.player.hp = Math.min(s.player.hp, s.player.maxHp);
    for (const minion of s.minions) {
      minion.maxHp = Math.max(1, minion.maxHp - minionHpReduction);
      minion.hp = Math.min(minion.hp, minion.maxHp);
    }
    s.skillPoints += spent;
    s.skillTree = makeSkillTree();
    syncUi();
    saveGame(true);
  }, [saveGame, syncUi]);

  const start = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setHasSave(false);
    const fresh = makeState();
    const progress = readProgress();
    if (progress) {
      fresh.souls = progress.souls;
      fresh.swordLevel = progress.swordLevel;
      fresh.magicLevel = progress.magicLevel;
      fresh.minionLevel = progress.minionLevel;
      fresh.healLevel = progress.healLevel;
      fresh.playerLevel = progress.playerLevel;
      fresh.xp = progress.xp;
      fresh.skillPoints = progress.skillPoints;
      fresh.skillTree = progress.skillTree;
      fresh.inventory = progress.inventory;
      fresh.equippedWeapon = progress.equippedWeapon;
      fresh.equippedArmor = progress.equippedArmor;
      fresh.equippedUndead = progress.equippedUndead;
      fresh.player.maxHp = progress.maxHp;
      fresh.player.hp = progress.maxHp;
    }
    fresh.started = true;
    stateRef.current = fresh;
    syncUi();
    canvasRef.current?.focus();
  }, [syncUi]);

  useEffect(() => {
    setHasSave(Boolean(localStorage.getItem(SAVE_KEY)));
    const savedSettings = readSettings();
    settingsRef.current = savedSettings;
    setSettings(savedSettings);
    const interval = window.setInterval(() => saveGame(true), 3000);
    const beforeUnload = () => saveGame(true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [saveGame]);

  useEffect(() => {
    if (!ui.over) return;
    saveProgress(stateRef.current);
    localStorage.removeItem(SAVE_KEY);
    setHasSave(false);
  }, [ui.over]);

  useEffect(() => {
    if (ui.rest > 0 && settings.autoOpenInventory) {
      setInventoryOpen(true);
      setIndexOpen(false);
      setSkillTreeOpen(false);
      setSettingsOpen(false);
    }
  }, [ui.rest > 0, settings.autoOpenInventory]);

  const updateSetting = useCallback((key) => {
    setSettings(current => {
      const next = { ...current, [key]: !current[key] };
      settingsRef.current = next;
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* Continue without persistence. */ }
      return next;
    });
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setSaveNotice("전체화면을 지원하지 않습니다");
      window.setTimeout(() => setSaveNotice(""), 1500);
    }
  }, []);

  useEffect(() => {
    const down = (e) => {
      keysRef.current.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "Space") useSkill("slash");
      if (e.code === "KeyR") useSkill("sword");
      if (e.code === "KeyQ") useSkill("fire");
      if (e.code === "KeyE") useSkill("summon");
      if (e.code === "Digit1") buySoulItem("sword");
      if (e.code === "Digit2") buySoulItem("heal");
      if (e.code === "Digit3") buySoulItem("magic");
      if (e.code === "Digit4") buySoulItem("minion");
      if (e.code === "Escape") setBuildMode(null);
    };
    const up = (e) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [buySoulItem, useSkill]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = `${BASE_PATH}/demon-castle-map.png`;
    const enemySprites = new Image();
    enemySprites.src = `${BASE_PATH}/enemy-sprites.png`;
    const playerSprite = new Image();
    playerSprite.src = `${BASE_PATH}/demon-king-sprite.png`;
    const minionSprites = [1, 2, 3].map(tier => {
      const sprite = new Image();
      sprite.src = `${BASE_PATH}/undead-minion-tier${tier}.png`;
      return sprite;
    });
    let raf;
    let last = performance.now();
    let uiClock = 0;

    const render = (now) => {
      const dt = Math.min(.033, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      updateGame(s, dt, keysRef.current, mouseRef.current, canvas);
      uiClock += dt;
      if (uiClock > .08) { uiClock = 0; syncUi(); }

      ctx.save();
      if (s.shake > 0 && settingsRef.current.screenShake) ctx.translate((Math.random() - .5) * s.shake, (Math.random() - .5) * s.shake);
      if (img.complete && img.naturalWidth) {
        ctx.drawImage(
          img,
          0, 0, img.naturalWidth, img.naturalHeight,
          0, 0, W, H,
        );
      } else {
        ctx.fillStyle = "#142029";
        ctx.fillRect(0, 0, W, H);
      }
      const shade = ctx.createLinearGradient(0, 0, 0, H);
      shade.addColorStop(0, "rgba(4,2,9,.14)");
      shade.addColorStop(.32, "rgba(9,3,10,.28)");
      shade.addColorStop(1, "rgba(3,6,10,.68)");
      ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);

      for (const r of s.rings) {
        ctx.globalAlpha = clamp(r.life * 1.8, 0, 1);
        ctx.strokeStyle = r.color; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const shot of s.shots) {
        ctx.shadowColor = "#d879ff"; ctx.shadowBlur = 18;
        drawDiamond(ctx, shot.x, shot.y, 9, "#f1c2ff", "#7d2caf");
        ctx.shadowBlur = 0;
      }
      for (const shot of s.enemyShots) {
        ctx.save();
        ctx.translate(shot.x, shot.y);
        ctx.rotate(Math.atan2(shot.vy, shot.vx));
        ctx.shadowColor = "#f2c26c";
        ctx.shadowBlur = 9;
        ctx.strokeStyle = "#f0d39a";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(11, 0); ctx.stroke();
        ctx.fillStyle = "#d8943e";
        ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(5, -5); ctx.lineTo(5, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      const animationTime = settingsRef.current.motion ? s.time : 0;
      for (const structure of s.structures) drawStructure(ctx, structure, animationTime);
      for (const beam of s.structureBeams) {
        ctx.save();
        ctx.globalAlpha = clamp(beam.life / beam.maxLife, 0, 1);
        ctx.shadowColor = "#d768ff"; ctx.shadowBlur = 18;
        ctx.strokeStyle = "#f0c8ff"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
        ctx.restore();
      }
      for (const m of s.minions) drawMinion(ctx, m, minionSprites, animationTime);
      for (const e of s.enemies) drawEnemy(ctx, e, enemySprites, animationTime);
      if (s.started) drawPlayer(ctx, s.player, animationTime, playerSprite, { weapon: s.equippedWeapon, armor: s.equippedArmor });
      for (const swing of s.swings) {
        const alpha = clamp(swing.life / swing.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = "#7fe4ff";
        ctx.shadowBlur = 24;
        ctx.strokeStyle = "#d9f8ff";
        ctx.lineWidth = 7 + alpha * 12;
        ctx.beginPath();
        ctx.arc(swing.x, swing.y, 115, swing.angle - .95, swing.angle + .95);
        ctx.stroke();
        ctx.strokeStyle = "#61cfff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(swing.x, swing.y, 138, swing.angle - .78, swing.angle + .78);
        ctx.stroke();
        ctx.restore();
      }
      for (const soul of s.soulOrbs) {
        const pulse = 1 + Math.sin(soul.phase) * .18;
        ctx.save();
        ctx.translate(soul.x, soul.y);
        ctx.scale(pulse, pulse);
        ctx.shadowColor = "#4defff";
        ctx.shadowBlur = 22;
        ctx.fillStyle = "#c9fbff";
        ctx.beginPath();
        ctx.arc(0, 0, soul.value >= 20 ? 15 : 8 + soul.value, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#31b9e5";
        ctx.beginPath();
        ctx.moveTo(0, -16); ctx.lineTo(7, 0); ctx.lineTo(0, 13); ctx.lineTo(-7, 0); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      for (const orb of s.xpOrbs) {
        const pulse = 1 + Math.sin(orb.phase) * .16;
        ctx.save();
        ctx.translate(orb.x, orb.y);
        ctx.scale(pulse, pulse);
        ctx.shadowColor = "#7285ff";
        ctx.shadowBlur = 20;
        drawDiamond(ctx, 0, 0, 9, "#dce0ff", "#6576ed");
        ctx.fillStyle = "#687aff";
        ctx.font = "900 7px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("XP", 0, 2.5);
        ctx.restore();
      }
      for (const p of s.particles) {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,82,35,${s.flash * .14})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [syncUi]);

  const canvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = (e.clientX - rect.left) / rect.width * W;
    mouseRef.current.y = (e.clientY - rect.top) / rect.height * H;
  };

  const inventoryItems = ui.inventory
    .filter(item => item.category === inventoryTab)
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));
  const inventoryPowerTotal = inventoryPower(ui.inventory, inventoryTab);
  const inventoryEffect = {
    weapon: "전투력당 기본 공격 +2 · 장착 시 검 외형/추가 2배",
    armor: "피해 감소 1.5% · 장착 시 갑옷 외형/추가 2배",
    undead: "전투력당 HP +15 · 공격 +4 · 장착 시 추가 2배",
  }[inventoryTab];
  const architectLevel = ui.skillTree.architect || 0;

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">♛</span>
          <div><strong>마왕의 최종 방어선</strong><small>DEMON KING&apos;S LAST STAND</small></div>
        </div>
        <div className="wave-label">
          <span>{ui.rest > 0 ? "마력 회복 중" : ui.wave >= 10 ? `영웅 강화 ★${Math.floor(ui.wave / 10)}` : "무한 침공"}</span>
          <b>{ui.rest > 0 ? `REST ${Math.ceil(ui.rest)}` : `WAVE ${ui.wave} ∞`}</b>
        </div>
        <div className="top-actions">
          {ui.started && !ui.over && (
            <button className="inventory-button" onClick={() => { setInventoryOpen(open => !open); setIndexOpen(false); setSkillTreeOpen(false); setSettingsOpen(false); }}>
              {inventoryOpen ? "인벤토리 닫기" : "인벤토리"}
            </button>
          )}
          {ui.started && !ui.over && (
            <button className="index-button" onClick={() => { setIndexOpen(open => !open); setInventoryOpen(false); setSkillTreeOpen(false); setSettingsOpen(false); }}>
              {indexOpen ? "인덱스 닫기" : "인덱스"}
            </button>
          )}
          {ui.started && !ui.over && (
            <button className="tree-button" onClick={() => { setSkillTreeOpen(open => !open); setInventoryOpen(false); setIndexOpen(false); setSettingsOpen(false); }}>
              스킬 트리 {ui.skillPoints > 0 ? `+${ui.skillPoints}` : ""}
            </button>
          )}
          <button className="settings-button" onClick={() => { setSettingsOpen(open => !open); setInventoryOpen(false); setIndexOpen(false); setSkillTreeOpen(false); }}>설정</button>
          <button className="fullscreen-button" onClick={toggleFullscreen}>{fullscreen ? "화면 복귀" : "전체화면"}</button>
          {ui.started && !ui.over && <button className="save-button" onClick={() => saveGame(false)}>{saveNotice || "진행 저장"}</button>}
          <button className="sound" onClick={() => setMuted(v => !v)} aria-label="소리 전환">{muted ? "소리 꺼짐" : "소리 켜짐"}</button>
        </div>
      </header>

      <section className="game-wrap">
        <canvas
          ref={canvasRef} width={W} height={H} tabIndex={0}
          onMouseMove={canvasPoint}
          onMouseDown={(e) => {
            canvasPoint(e);
            if (buildMode) {
              placeStructure(buildMode);
              return;
            }
            if (e.button === 2) useSkill("sword");
            else mouseRef.current.down = true;
          }}
          onMouseUp={(e) => { if (e.button !== 2) mouseRef.current.down = false; }}
          onMouseLeave={() => { mouseRef.current.down = false; }}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="마왕의 최종 방어선 게임 화면"
          className={buildMode ? "building" : ""}
        />

        <div className="hud top-left">
          <div className="portrait">♛</div>
          <div className="bars">
            <div className="bar-row"><span>마왕 LV.{ui.playerLevel}</span><b>{Math.ceil(ui.hp)} / {ui.maxHp}</b></div>
            <div className="bar"><i className="hp" style={{ width: `${ui.hp / ui.maxHp * 100}%` }} /></div>
            <div className="xp-row"><span>EXP</span><b>{ui.xp} / {ui.xpNeeded}</b></div>
            <div className="xp-bar"><i style={{ width: `${ui.xp / ui.xpNeeded * 100}%` }} /></div>
          </div>
        </div>

        <div className="score-card">
          <span>처치 <b>{ui.kills}</b></span><i />
          <span className="soul-score">영혼 <b>{ui.souls}</b></span><i />
          <span>악명 <b>{String(ui.score).padStart(5, "0")}</b></span>
        </div>

        {ui.boss && (
          <div className="boss-hud">
            <span>10웨이브 강적</span>
            <b>심연의 용사왕</b>
            <div><i style={{ width: `${ui.boss.hp / ui.boss.maxHp * 100}%` }} /></div>
          </div>
        )}

        {ui.rest > 0 && (
          <div className="rest-hud">
            <span>BREATHING ROOM</span>
            <b>휴식 시간</b>
            <strong>{Math.ceil(ui.rest)}</strong>
            <small>영웅 전원 철수 · 체력 회복 · 3종 뽑기 가능</small>
          </div>
        )}

        {ui.started && !ui.over && (
          <div className="soul-shop">
            <div className="shop-title"><span>영혼 상점</span><b>◈ {ui.souls}</b></div>
            <button onClick={() => buySoulItem("sword")} disabled={ui.souls < 15 + ui.swordLevel * 10}>
              <kbd>1</kbd><span>마왕검 강화 <small>LV.{ui.swordLevel} · 기본 공격 +5</small></span><b>{15 + ui.swordLevel * 10}</b>
            </button>
            <button onClick={() => buySoulItem("heal")} disabled={ui.souls < 12 + ui.healLevel * 8}>
              <kbd>2</kbd><span>마왕 회복 <small>HP+{35 + ui.healLevel * 10} · MAX+{10 + ui.healLevel * 2}</small></span><b>{12 + ui.healLevel * 8}</b>
            </button>
            <button onClick={() => buySoulItem("magic")} disabled={ui.souls < 18 + ui.magicLevel * 12}>
              <kbd>3</kbd><span>마력 강화 <small>LV.{ui.magicLevel} · 스킬 피해/범위/쿨</small></span><b>{18 + ui.magicLevel * 12}</b>
            </button>
            <button onClick={() => buySoulItem("minion")} disabled={ui.souls < 20 + ui.minionLevel * 15}>
              <kbd>4</kbd><span>망자 강화 <small>LV.{ui.minionLevel} · 체력/공격/외형</small></span><b>{20 + ui.minionLevel * 15}</b>
            </button>
          </div>
        )}

        {ui.started && !ui.over && (
          <aside className="build-panel">
            <div className="build-head"><span>지옥 건축</span><b>{ui.structures.length}/{12 + architectLevel * 3}</b></div>
            {Object.entries(STRUCTURES).map(([type, definition]) => {
              const cost = Math.max(8, Math.round(definition.cost * (1 - architectLevel * .08)));
              return (
                <button
                  key={type}
                  className={buildMode === type ? "active" : ""}
                  disabled={ui.souls < cost || ui.structures.length >= 12 + architectLevel * 3}
                  onClick={() => setBuildMode(current => current === type ? null : type)}
                >
                  <i>{definition.icon}</i><span>{definition.label}</span><b>◈ {cost}</b>
                </button>
              );
            })}
            <small>{buildMode ? "맵을 클릭해 배치 · ESC 취소" : "영혼으로 방어 시설 건설"}</small>
          </aside>
        )}

        {ui.started && !ui.over && inventoryOpen && (
          <aside className="inventory-panel">
            <div className="inventory-head">
              <div><span>SOUL INVENTORY</span><b>인벤토리</b></div>
              <strong>◈ {ui.souls}</strong>
            </div>
            <div className="inventory-tabs">
              {["armor", "weapon", "undead"].map(category => (
                <button
                  key={category}
                  className={inventoryTab === category ? "active" : ""}
                  onClick={() => setInventoryTab(category)}
                >
                  {LOOT_TABLE[category].label}
                </button>
              ))}
            </div>
            <div className="inventory-summary">
              <span>총 전투력 <b>{inventoryPowerTotal}</b></span>
              <small>{inventoryEffect}</small>
            </div>
            <div className="inventory-list">
              {inventoryItems.length === 0 && <p>아직 획득한 장비가 없습니다.</p>}
              {inventoryItems.map(item => {
                const equippedRarity = item.category === "weapon" ? ui.equippedWeapon : item.category === "armor" ? ui.equippedArmor : ui.equippedUndead;
                const equipped = equippedRarity === item.rarity;
                return (
                  <button
                    type="button"
                    key={`${item.category}-${item.rarity}`}
                    className={`inventory-item ${equipped ? "equipped" : ""}`}
                    onClick={() => equipInventoryItem(item.category, item.rarity)}
                  >
                    <i style={{ background: RARITY[item.rarity].color }} />
                    <span>
                      <small style={{ color: RARITY[item.rarity].color }}>{RARITY[item.rarity].label}</small>
                      <b>{item.name}{equipped ? " · 장착" : ""}</b>
                    </span>
                    <strong>×{item.count}</strong>
                  </button>
                );
              })}
            </div>
            <div className="draw-zone">
              <div className="draw-buttons">
                {["undead", "weapon", "armor"].map(category => (
                  <button
                    key={category}
                    onClick={() => drawLoot(category)}
                    disabled={ui.rest <= 0 || ui.souls < DRAW_COST}
                  >
                    {LOOT_TABLE[category].label} 뽑기 <b>◈ {DRAW_COST}</b>
                  </button>
                ))}
              </div>
              <small className={drawNotice ? "notice" : ""}>
                {drawNotice || (ui.rest > 0 ? "10등급 · 최고 마왕 등급 0.5%" : "뽑기는 휴식 시간에만 가능합니다")}
              </small>
            </div>
          </aside>
        )}

        {ui.started && !ui.over && indexOpen && (
          <aside className="index-panel">
            <div className="index-head"><span>BATTLE INDEX</span><b>전투 인덱스</b></div>
            <section>
              <h3>망자 부대 <small>{ui.minions.length}명 생존</small></h3>
              <p>시간 제한 없이 유지 · 서로 겹치지 않음 · 영웅 처치마다 공격 +2, 최대 HP +4</p>
              <p>소환 상한 {ui.minionCap}명 · 소환 시 개별 0.001% 확률로 엘리트 망자 등장</p>
              <div className="minion-index-list">
                {ui.minions.length === 0 && <small>소환된 망자가 없습니다.</small>}
                {ui.minions.slice(0, 8).map((minion, index) => (
                  <span key={minion.id}>#{index + 1} HP {Math.ceil(minion.hp)}/{minion.maxHp} · 처치 {minion.kills}</span>
                ))}
              </div>
            </section>
            <section>
              <h3>영웅 등급</h3>
              <p>10웨이브마다 별이 오르며 체력·공격력·속도가 증가합니다. 별이 높을수록 영혼 보상도 배수로 증가합니다.</p>
              <div className="enemy-index-grid">
                <span>기사 · 근접</span><span>마법사 · 마법</span><span>중갑병 · 방어</span>
                <span>궁수 · 원거리</span><span>암살자 · 고속</span><span>성기사 · 정예</span>
              </div>
            </section>
            <section>
              <h3>뽑기 10등급</h3>
              <div className="rarity-index">
                {RARITY_ORDER.map(key => (
                  <span key={key} style={{ color: RARITY[key].color }}>{RARITY[key].label} {RARITY[key].chance}%</span>
                ))}
              </div>
            </section>
          </aside>
        )}

        {settingsOpen && (
          <aside className="settings-panel">
            <div className="settings-head"><span>GAME OPTIONS</span><b>설정</b></div>
            <button onClick={() => updateSetting("motion")}><span>걷기 모션</span><b>{settings.motion ? "켜짐" : "꺼짐"}</b></button>
            <button onClick={() => updateSetting("screenShake")}><span>화면 흔들림</span><b>{settings.screenShake ? "켜짐" : "꺼짐"}</b></button>
            <button onClick={() => updateSetting("autoOpenInventory")}><span>휴식 인벤토리 자동 열기</span><b>{settings.autoOpenInventory ? "켜짐" : "꺼짐"}</b></button>
            <button onClick={() => setMuted(value => !value)}><span>효과음</span><b>{muted ? "꺼짐" : "켜짐"}</b></button>
          </aside>
        )}

        {ui.started && !ui.over && skillTreeOpen && (
          <section className="skill-tree-panel">
            <div className="skill-tree-head">
              <div><span>DEMONIC ASCENSION</span><h2>스킬 트리</h2></div>
              <strong>스킬 포인트 ◈ {ui.skillPoints}</strong>
              <button onClick={resetSkillTree}>초기화 ↻</button>
              <button onClick={() => setSkillTreeOpen(false)}>닫기 ×</button>
            </div>
            <div className="skill-branches">
              {SKILL_BRANCHES.map(branch => (
                <div className={`skill-branch ${branch.id}`} key={branch.id} style={{ "--branch": branch.color }}>
                  <h3><i>{branch.icon}</i>{branch.label}</h3>
                  <div className="skill-nodes">
                    {branch.nodes.map((node, index) => {
                      const level = ui.skillTree[node.id] || 0;
                      const locked = node.requires && (ui.skillTree[node.requires[0]] || 0) < node.requires[1];
                      return (
                        <button
                          key={node.id}
                          className={`${level > 0 ? "learned" : ""} ${locked ? "locked" : ""}`}
                          onClick={() => buySkillNode(node.id)}
                          disabled={locked || level >= node.max || ui.skillPoints <= 0}
                        >
                          {index > 0 && <i className="skill-connector" />}
                          <span className="node-icon">{locked ? "🔒" : node.icon}</span>
                          <b>{node.name}</b>
                          <small>{node.description}</small>
                          <strong>{level}/{node.max}</strong>
                          {locked && <em>{node.requires[0]} {node.requires[1]} 필요</em>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="skill-tree-foot">영웅이 떨어뜨린 경험치를 모아 레벨업하면 스킬 포인트 1을 얻습니다.</div>
          </section>
        )}

        {!ui.started && (
          <div className="overlay">
            <div className="sigil">♛</div>
            <p className="eyebrow">THE THRONE MUST STAND</p>
            <h1>이번엔 네가<br /><em>최종 보스</em>다</h1>
            <p className="lead">용사의 영혼을 모아 강화와 회복에 사용하며 왕좌를 지켜라.<br />10웨이브마다 강력한 용사왕이 등장한다.</p>
            <div className="start-actions">
              {hasSave && (
                <button className="start-btn" onClick={continueGame}><span>이어하기</span><small>CONTINUE SAVED BATTLE</small></button>
              )}
              <button className={`start-btn ${hasSave ? "secondary" : ""}`} onClick={start}>
                <span>{hasSave ? "새 게임" : "전투 시작"}</span><small>ENTER THE THRONE ROOM</small>
              </button>
            </div>
            <div className="quick-controls"><span><kbd>WASD</kbd> 이동</span><span><kbd>클릭</kbd> 암흑탄</span><span><kbd>R / 우클릭</kbd> 마왕검</span></div>
          </div>
        )}

        {ui.over && (
          <div className="overlay result">
            <div className="sigil">{ui.win ? "♛" : "†"}</div>
            <p className="eyebrow">{ui.win ? "THE CASTLE ENDURES" : "THE THRONE HAS FALLEN"}</p>
            <h1>{ui.win ? <>침공군을<br /><em>전멸시켰다</em></> : <>마왕이<br /><em>쓰러졌다</em></>}</h1>
            <p className="lead">도달 웨이브 {ui.wave} · 영혼 {ui.souls} · 처치 {ui.kills} · 악명 {ui.score}</p>
            <button className="start-btn" onClick={start}><span>다시 도전</span><small>RECLAIM YOUR THRONE</small></button>
          </div>
        )}

        {ui.started && !ui.over && (
          <div className="skillbar">
            {SKILLS.map((x) => {
              const cd = ui.cooldowns[x.id] || 0;
              return (
                <button
                  key={x.id}
                  className="skill"
                  onClick={() => useSkill(x.id)}
                  disabled={x.id === "summon" && (ui.souls < ui.summonCost || ui.minions.length >= ui.minionCap)}
                  style={{ "--skill": x.color }}
                >
                  <kbd>{x.key}</kbd>
                  <span className="skill-icon">{x.icon}</span>
                  <span className="skill-copy"><b>{x.name}</b><small>{x.id === "summon" ? `영혼 ${ui.summonCost} · ${ui.minions.length}/${ui.minionCap}` : x.sub}</small></span>
                  {cd > 0 && <i className="cooldown">{cd.toFixed(1)}</i>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer>
        <span><i className="red-dot" /> 적은 망자가 있으면 망자를 먼저 공격합니다</span>
        <p><kbd>W A S D</kbd> 이동 <b>·</b> <kbd>F / 클릭</kbd> 암흑탄 <b>·</b> <kbd>R / 우클릭</kbd> 마왕검</p>
        <span className="map-credit">원본 이미지 기반 왕좌의 방</span>
      </footer>
    </main>
  );
}
