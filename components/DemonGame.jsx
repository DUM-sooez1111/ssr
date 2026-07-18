"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const W = 1600;
const H = 900;
const THRONE = { x: 800, y: 154 };
const LANES = [515, 650, 800, 950, 1085];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const SKILLS = [
  { id: "sword", key: "R / 우클릭", name: "마왕검 휘두르기", sub: "전방 · 0.8초", color: "#73d7ff", icon: "⚔" },
  { id: "slash", key: "SPACE", name: "파멸의 낫", sub: "근접 · 2초", color: "#f3d18a", icon: "☾" },
  { id: "fire", key: "Q", name: "지옥불 폭발", sub: "범위 · 7초", color: "#ff5b28", icon: "♨" },
  { id: "summon", key: "E", name: "망자 소환", sub: "영혼 8 · 쿨타임 없음", color: "#b889ff", icon: "♟" },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

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
    swordLevel: 0,
    minionLevel: 0,
    shake: 0,
    flash: 0,
    player: { x: 800, y: 265, hp: 100, maxHp: 100, angle: Math.PI / 2, hurt: 0 },
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

function drawPlayer(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y + Math.sin(time * 5) * 2);
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

function drawEnemy(ctx, e, sprites) {
  ctx.save();
  ctx.translate(e.x, e.y);

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
    ctx.ellipse(0, e.r + 12, size * .25, size * .09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = e.type === "boss" ? "#ff3c25" : e.color;
    ctx.shadowBlur = e.type === "boss" ? 22 : 9;
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
    ctx.fillStyle = e.type === "boss" ? "#ff3525" : "#e34736";
    ctx.fillRect(-barWidth / 2, barY, barWidth * clamp(e.hp / e.maxHp, 0, 1), e.type === "boss" ? 9 : 6);
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
  for (const k in s.cooldowns) s.cooldowns[k] = Math.max(0, s.cooldowns[k] - dt);

  if (s.waveTimer > 24) {
    const completedWave = s.wave;
    s.wave++;
    s.waveTimer = 0;
    if (completedWave % 5 === 0) {
      s.restTimer = 10;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 18, life: 1.1, color: "#65eaff" });
      addParticles(s, s.player.x, s.player.y, "#65eaff", 16, .65);
    }
    s.flash = 1;
    s.rings.push({ x: THRONE.x, y: THRONE.y, r: 20, life: 1.5, color: "#ffcc52" });
  }

  if (s.wave % 10 === 0 && s.bossSpawnedWave !== s.wave) {
    const maxHp = 1200 + s.wave * 110;
    s.enemies.push({
      x: 800, y: 870, r: 42, hp: maxHp, maxHp,
      speed: 38 + Math.min(24, s.wave * .45),
      damage: 34 + Math.floor(s.wave * .7),
      type: "boss", color: "#ff3425", attack: 0,
    });
    s.bossSpawnedWave = s.wave;
    s.flash = 1.4;
    s.shake = 14;
    s.rings.push({ x: 800, y: 790, r: 30, life: 1.4, color: "#ff3425" });
  }

  const moveX = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  const moveY = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  const len = Math.hypot(moveX, moveY) || 1;
  s.player.x = clamp(s.player.x + moveX / len * 255 * dt, 270, 1330);
  s.player.y = clamp(s.player.y + moveY / len * 255 * dt, 180, 765);
  s.player.angle = Math.atan2(mouse.y - s.player.y, mouse.x - s.player.x);

  const shoot = () => {
    if (s.cooldowns.shot > 0) return;
    s.cooldowns.shot = .28;
    const a = s.player.angle;
    s.shots.push({ x: s.player.x + Math.cos(a) * 30, y: s.player.y + Math.sin(a) * 30, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 1.35, damage: 24 + s.magicLevel * 6 });
    addParticles(s, s.player.x, s.player.y, "#d574ff", 5, .4);
  };
  if (mouse.down || keys.has("KeyF")) shoot();

  if (s.spawnTimer <= 0 && s.restTimer <= 0) {
    const count = Math.min(4, 1 + Math.floor(s.wave / 5));
    const availableTypes = ["knight"];
    if (s.wave >= 2) availableTypes.push("mage");
    if (s.wave >= 3) availableTypes.push("tank");
    if (s.wave >= 4) availableTypes.push("archer");
    if (s.wave >= 6) availableTypes.push("assassin");
    if (s.wave >= 8) availableTypes.push("paladin");
    for (let i = 0; i < count; i++) {
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const stats = {
        knight: { hp: 84 + s.wave * 12, r: 20, speed: 78, damage: 10, color: "#3268bb" },
        mage: { hp: 68 + s.wave * 9, r: 20, speed: 64, damage: 10, color: "#426ee9" },
        tank: { hp: 150 + s.wave * 18, r: 25, speed: 45, damage: 18, color: "#bd8435" },
        archer: { hp: 72 + s.wave * 10, r: 19, speed: 68, damage: 9 + Math.floor(s.wave * .35), color: "#3f8b4f" },
        assassin: { hp: 62 + s.wave * 8, r: 17, speed: 136, damage: 16 + Math.floor(s.wave * .4), color: "#633477" },
        paladin: { hp: 225 + s.wave * 22, r: 28, speed: 42, damage: 24 + Math.floor(s.wave * .45), color: "#d1a83f" },
      }[type];
      s.enemies.push({
        x: LANES[Math.floor(Math.random() * LANES.length)] + (Math.random() - .5) * 45,
        y: 870 + i * 35, r: stats.r,
        hp: stats.hp, maxHp: stats.hp, speed: stats.speed,
        damage: stats.damage, type, color: stats.color,
        attack: 0,
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
        hurtEnemy(e, shot.damage, "#d87cff"); shot.life = 0;
      }
    }
  }

  for (const shot of s.enemyShots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life > 0 && dist(shot, s.player) < 25) {
      shot.life = 0;
      s.player.hp -= shot.damage;
      s.player.hurt = .18;
      s.shake = 5;
      addParticles(s, s.player.x, s.player.y, "#e9bc72", 9, .55);
    }
  }

  for (const m of s.minions) {
    m.life -= dt;
    let target = null, best = 240;
    for (const e of s.enemies) {
      const d = dist(m, e);
      if (d < best) { best = d; target = e; }
    }
    if (target) {
      const a = Math.atan2(target.y - m.y, target.x - m.x);
      const minionSpeed = 125 + m.level * 8;
      m.x += Math.cos(a) * minionSpeed * dt; m.y += Math.sin(a) * minionSpeed * dt;
      m.attack -= dt;
      if (best < 35 + m.level * 2 && m.attack <= 0) {
        hurtEnemy(target, 22 + m.level * 10, "#90e2b1");
        m.attack = Math.max(.38, .75 - m.level * .035);
      }
    } else {
      const a = Math.atan2(s.player.y - m.y, s.player.x - m.x);
      if (best > 70) { m.x += Math.cos(a) * 70 * dt; m.y += Math.sin(a) * 70 * dt; }
    }
  }

  for (const e of s.enemies) {
    e.attack -= dt;
    const dp = dist(e, s.player);
    const a = Math.atan2(s.player.y - e.y, s.player.x - e.x);
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
        });
        e.attack = 1.55;
      }
      e.x = clamp(e.x, 270, 1330);
      e.y = clamp(e.y, 180, 855);
    } else if (dp > e.r + 27) {
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
    } else if (e.attack <= 0) {
      s.player.hp -= e.damage; s.player.hurt = .18; s.shake = 7; e.attack = 1.05;
      addParticles(s, s.player.x, s.player.y, "#ff3333", 10, .7);
    }
  }

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
      const soulValue = rewards.souls;
      s.soulOrbs.push({
        x: e.x, y: e.y, value: soulValue, life: 14,
        phase: Math.random() * Math.PI * 2,
      });
      addParticles(s, e.x, e.y, "#ff8a38", 18, 1);
    }
  }
  s.enemies = s.enemies.filter(e => !e.dead);
  s.shots = s.shots.filter(x => x.life > 0);
  s.enemyShots = s.enemyShots.filter(x => x.life > 0);
  s.minions = s.minions.filter(x => x.life > 0);
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
  const [ui, setUi] = useState({ started: false, over: false, win: false, wave: 1, rest: 0, hp: 100, maxHp: 100, kills: 0, score: 0, souls: 0, swordLevel: 0, magicLevel: 0, minionLevel: 0, cooldowns: {}, boss: null });
  const [muted, setMuted] = useState(false);

  const syncUi = useCallback(() => {
    const s = stateRef.current;
    const boss = s.enemies.find(e => e.type === "boss");
    setUi({
      started: s.started, over: s.over, win: s.win, wave: s.wave, rest: s.restTimer,
      hp: Math.max(0, s.player.hp), maxHp: s.player.maxHp,
      kills: s.kills, score: s.score, souls: s.souls, swordLevel: s.swordLevel, magicLevel: s.magicLevel, minionLevel: s.minionLevel, cooldowns: { ...s.cooldowns },
      boss: boss ? { hp: Math.max(0, boss.hp), maxHp: boss.maxHp } : null,
    });
  }, []);

  const useSkill = useCallback((skill) => {
    const s = stateRef.current;
    if (!s.started || s.over) return;
    if (skill === "sword" && s.cooldowns.sword <= 0) {
      s.cooldowns.sword = .75;
      const angle = Math.atan2(mouseRef.current.y - s.player.y, mouseRef.current.x - s.player.x);
      s.player.angle = angle;
      s.swings.push({ x: s.player.x, y: s.player.y, angle, life: .26, maxLife: .26 });
      for (const e of s.enemies) {
        const targetAngle = Math.atan2(e.y - s.player.y, e.x - s.player.x);
        if (dist(s.player, e) < 165 + e.r && Math.abs(angleDelta(targetAngle, angle)) < .95) {
          e.hp -= 52 + s.swordLevel * 14;
          e.x += Math.cos(angle) * 32;
          e.y += Math.sin(angle) * 32;
          addParticles(s, e.x, e.y, "#8ee6ff", 11, .8);
        }
      }
      s.shake = 4;
    }
    if (skill === "slash" && s.cooldowns.slash <= 0) {
      s.cooldowns.slash = 2;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 20, life: .42, color: "#f8d78e" });
      for (const e of s.enemies) if (dist(s.player, e) < 135) { e.hp -= 58; addParticles(s, e.x, e.y, "#ffe1a2", 10, .8); }
      s.shake = 5;
    }
    if (skill === "fire" && s.cooldowns.fire <= 0) {
      s.cooldowns.fire = 7;
      s.rings.push({ x: mouseRef.current.x, y: mouseRef.current.y, r: 15, life: .65, color: "#ff4f25" });
      for (const e of s.enemies) if (dist(mouseRef.current, e) < 170) { e.hp -= 95 + s.magicLevel * 18; addParticles(s, e.x, e.y, "#ff4a22", 15, 1); }
      s.shake = 10; s.flash = .55;
    }
    if (skill === "summon" && s.souls >= 8) {
      s.souls -= 8;
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2;
        s.minions.push({
          x: s.player.x + Math.cos(a) * 55,
          y: s.player.y + Math.sin(a) * 55,
          life: 14 + s.minionLevel * 2,
          attack: 0,
          level: s.minionLevel,
        });
      }
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .7, color: "#b889ff" });
    }
  }, []);

  const buySoulItem = useCallback((item) => {
    const s = stateRef.current;
    if (!s.started || s.over) return;
    if (item === "sword") {
      const cost = 15 + s.swordLevel * 10;
      if (s.souls < cost) return;
      s.souls -= cost;
      s.swordLevel++;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .7, color: "#72ddff" });
      addParticles(s, s.player.x, s.player.y, "#72ddff", 18, .8);
    }
    if (item === "heal" && s.souls >= 12) {
      s.souls -= 12;
      s.player.maxHp += 10;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + 35);
      addParticles(s, s.player.x, s.player.y, "#65f0a0", 16, .7);
    }
    if (item === "magic") {
      const cost = 18 + s.magicLevel * 12;
      if (s.souls < cost) return;
      s.souls -= cost;
      s.magicLevel++;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .75, color: "#c077ff" });
      addParticles(s, s.player.x, s.player.y, "#c077ff", 18, .7);
    }
    if (item === "minion") {
      const cost = 20 + s.minionLevel * 15;
      if (s.souls < cost) return;
      s.souls -= cost;
      s.minionLevel++;
      for (const minion of s.minions) minion.level = s.minionLevel;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .75, color: "#70efa4" });
      addParticles(s, s.player.x, s.player.y, "#70efa4", 20, .75);
    }
    syncUi();
  }, [syncUi]);

  const start = useCallback(() => {
    const fresh = makeState();
    fresh.started = true;
    stateRef.current = fresh;
    syncUi();
    canvasRef.current?.focus();
  }, [syncUi]);

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
      if (s.shake > 0) ctx.translate((Math.random() - .5) * s.shake, (Math.random() - .5) * s.shake);
      if (img.complete) ctx.drawImage(img, 0, 0, W, H);
      else { ctx.fillStyle = "#142029"; ctx.fillRect(0, 0, W, H); }
      const shade = ctx.createLinearGradient(0, 0, 0, H);
      shade.addColorStop(0, "rgba(4,2,9,.14)");
      shade.addColorStop(.32, "rgba(9,3,10,.28)");
      shade.addColorStop(1, "rgba(3,6,10,.68)");
      ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = "rgba(255,65,41,.35)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 16]);
      ctx.beginPath(); ctx.moveTo(800, 220); ctx.lineTo(800, 860); ctx.stroke();
      ctx.setLineDash([]);

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
      for (const m of s.minions) {
        ctx.save(); ctx.translate(m.x, m.y);
        const minionScale = 1 + m.level * .06;
        ctx.scale(minionScale, minionScale);
        ctx.shadowColor = "#70efa4";
        ctx.shadowBlur = 5 + m.level * 3;
        ctx.fillStyle = "#b9d8c2"; ctx.strokeStyle = "#1a3024"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#151515"; ctx.fillRect(-8, -5, 5, 5); ctx.fillRect(3, -5, 5, 5);
        ctx.restore();
      }
      for (const e of s.enemies) drawEnemy(ctx, e, enemySprites);
      if (s.started) drawPlayer(ctx, s.player, s.time);
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

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">♛</span>
          <div><strong>마왕의 최종 방어선</strong><small>DEMON KING&apos;S LAST STAND</small></div>
        </div>
        <div className="wave-label">
          <span>{ui.rest > 0 ? "마력 회복 중" : "무한 침공"}</span>
          <b>{ui.rest > 0 ? `REST ${Math.ceil(ui.rest)}` : `WAVE ${ui.wave} ∞`}</b>
        </div>
        <button className="sound" onClick={() => setMuted(v => !v)} aria-label="소리 전환">{muted ? "소리 꺼짐" : "소리 켜짐"}</button>
      </header>

      <section className="game-wrap">
        <canvas
          ref={canvasRef} width={W} height={H} tabIndex={0}
          onMouseMove={canvasPoint}
          onMouseDown={(e) => {
            canvasPoint(e);
            if (e.button === 2) useSkill("sword");
            else mouseRef.current.down = true;
          }}
          onMouseUp={(e) => { if (e.button !== 2) mouseRef.current.down = false; }}
          onMouseLeave={() => { mouseRef.current.down = false; }}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="마왕의 최종 방어선 게임 화면"
        />

        <div className="hud top-left">
          <div className="portrait">♛</div>
          <div className="bars">
            <div className="bar-row"><span>마왕</span><b>{Math.ceil(ui.hp)} / {ui.maxHp}</b></div>
            <div className="bar"><i className="hp" style={{ width: `${ui.hp / ui.maxHp * 100}%` }} /></div>
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
            <small>새 적 생성 중지 · 체력 회복 · 영혼 상점 이용 가능</small>
          </div>
        )}

        {ui.started && !ui.over && (
          <div className="soul-shop">
            <div className="shop-title"><span>영혼 상점</span><b>◈ {ui.souls}</b></div>
            <button onClick={() => buySoulItem("sword")} disabled={ui.souls < 15 + ui.swordLevel * 10}>
              <kbd>1</kbd><span>마왕검 강화 <small>LV.{ui.swordLevel}</small></span><b>{15 + ui.swordLevel * 10}</b>
            </button>
            <button onClick={() => buySoulItem("heal")} disabled={ui.souls < 12}>
              <kbd>2</kbd><span>마왕 회복 <small>HP+35 · MAX+10</small></span><b>12</b>
            </button>
            <button onClick={() => buySoulItem("magic")} disabled={ui.souls < 18 + ui.magicLevel * 12}>
              <kbd>3</kbd><span>마력 강화 <small>LV.{ui.magicLevel}</small></span><b>{18 + ui.magicLevel * 12}</b>
            </button>
            <button onClick={() => buySoulItem("minion")} disabled={ui.souls < 20 + ui.minionLevel * 15}>
              <kbd>4</kbd><span>소환수 강화 <small>LV.{ui.minionLevel}</small></span><b>{20 + ui.minionLevel * 15}</b>
            </button>
          </div>
        )}

        {!ui.started && (
          <div className="overlay">
            <div className="sigil">♛</div>
            <p className="eyebrow">THE THRONE MUST STAND</p>
            <h1>이번엔 네가<br /><em>최종 보스</em>다</h1>
            <p className="lead">용사의 영혼을 모아 강화와 회복에 사용하며 왕좌를 지켜라.<br />10웨이브마다 강력한 용사왕이 등장한다.</p>
            <button className="start-btn" onClick={start}><span>전투 시작</span><small>ENTER THE THRONE ROOM</small></button>
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
                  disabled={x.id === "summon" && ui.souls < 8}
                  style={{ "--skill": x.color }}
                >
                  <kbd>{x.key}</kbd>
                  <span className="skill-icon">{x.icon}</span>
                  <span className="skill-copy"><b>{x.name}</b><small>{x.sub}</small></span>
                  {cd > 0 && <i className="cooldown">{cd.toFixed(1)}</i>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer>
        <span><i className="red-dot" /> 모든 적은 마왕만 공격합니다</span>
        <p><kbd>W A S D</kbd> 이동 <b>·</b> <kbd>F / 클릭</kbd> 암흑탄 <b>·</b> <kbd>R / 우클릭</kbd> 마왕검</p>
        <span className="map-credit">원본 이미지 기반 왕좌의 방</span>
      </footer>
    </main>
  );
}
