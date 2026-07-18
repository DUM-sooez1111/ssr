"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const W = 1600;
const H = 900;
const THRONE = { x: 800, y: 154 };
const LANES = [515, 650, 800, 950, 1085];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const SKILLS = [
  { key: "SPACE", name: "파멸의 낫", sub: "근접 · 2초", color: "#f3d18a" },
  { key: "Q", name: "지옥불 폭발", sub: "범위 · 7초", color: "#ff5b28" },
  { key: "E", name: "망자 소환", sub: "부하 · 12초", color: "#b889ff" },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makeState() {
  return {
    started: false,
    over: false,
    win: false,
    time: 0,
    wave: 1,
    waveTimer: 0,
    spawnTimer: 0,
    kills: 0,
    score: 0,
    shake: 0,
    flash: 0,
    throneHp: 100,
    player: { x: 800, y: 265, hp: 100, angle: Math.PI / 2, hurt: 0 },
    cooldowns: { slash: 0, fire: 0, summon: 0, shot: 0 },
    enemies: [],
    shots: [],
    minions: [],
    particles: [],
    rings: [],
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

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#d7d4c9";
  ctx.beginPath();
  ctx.arc(0, 0, e.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = e.color;
  ctx.fillRect(-e.r + 2, -2, (e.r - 2) * 2, e.r + 3);
  ctx.fillStyle = "#151922";
  ctx.fillRect(-8, -8, 5, 4);
  ctx.fillRect(3, -8, 5, 4);
  if (e.type === "mage") {
    ctx.fillStyle = "#3c67d5";
    ctx.beginPath(); ctx.moveTo(-17, -10); ctx.lineTo(0, -35); ctx.lineTo(17, -10); ctx.closePath(); ctx.fill();
  } else if (e.type === "tank") {
    ctx.strokeStyle = "#e4b94c"; ctx.lineWidth = 5; ctx.strokeRect(-20, -22, 40, 40);
  }
  ctx.fillStyle = "#1a1515";
  ctx.fillRect(-20, -e.r - 13, 40, 5);
  ctx.fillStyle = "#e33d32";
  ctx.fillRect(-20, -e.r - 13, 40 * (e.hp / e.maxHp), 5);
  ctx.restore();
}

function updateGame(s, dt, keys, mouse, canvas) {
  if (!s.started || s.over) return;
  s.time += dt;
  s.waveTimer += dt;
  s.spawnTimer -= dt;
  s.shake = Math.max(0, s.shake - dt * 18);
  s.flash = Math.max(0, s.flash - dt * 3);
  s.player.hurt = Math.max(0, s.player.hurt - dt);
  for (const k in s.cooldowns) s.cooldowns[k] = Math.max(0, s.cooldowns[k] - dt);

  if (s.waveTimer > 24 && s.wave < 5) {
    s.wave++;
    s.waveTimer = 0;
    s.flash = 1;
    s.rings.push({ x: THRONE.x, y: THRONE.y, r: 20, life: 1.5, color: "#ffcc52" });
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
    s.shots.push({ x: s.player.x + Math.cos(a) * 30, y: s.player.y + Math.sin(a) * 30, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 1.35, damage: 24 });
    addParticles(s, s.player.x, s.player.y, "#d574ff", 5, .4);
  };
  if (mouse.down || keys.has("KeyF")) shoot();

  if (s.spawnTimer <= 0 && !(s.wave === 5 && s.waveTimer > 24)) {
    const count = 1 + Math.floor(s.wave / 3);
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      const type = s.wave >= 3 && roll > .78 ? "tank" : s.wave >= 2 && roll > .55 ? "mage" : "knight";
      const maxHp = type === "tank" ? 150 + s.wave * 18 : type === "mage" ? 68 + s.wave * 9 : 84 + s.wave * 12;
      s.enemies.push({
        x: LANES[Math.floor(Math.random() * LANES.length)] + (Math.random() - .5) * 45,
        y: 870 + i * 35, r: type === "tank" ? 25 : 20,
        hp: maxHp, maxHp, speed: type === "tank" ? 45 : type === "mage" ? 64 : 78,
        damage: type === "tank" ? 18 : 10, type,
        color: type === "mage" ? "#426ee9" : type === "tank" ? "#bd8435" : "#3268bb",
        attack: 0,
      });
    }
    s.spawnTimer = Math.max(.65, 2.05 - s.wave * .22);
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

  for (const m of s.minions) {
    m.life -= dt;
    let target = null, best = 240;
    for (const e of s.enemies) {
      const d = dist(m, e);
      if (d < best) { best = d; target = e; }
    }
    if (target) {
      const a = Math.atan2(target.y - m.y, target.x - m.x);
      m.x += Math.cos(a) * 125 * dt; m.y += Math.sin(a) * 125 * dt;
      m.attack -= dt;
      if (best < 35 && m.attack <= 0) { hurtEnemy(target, 22, "#90e2b1"); m.attack = .75; }
    } else {
      const a = Math.atan2(s.player.y - m.y, s.player.x - m.x);
      if (best > 70) { m.x += Math.cos(a) * 70 * dt; m.y += Math.sin(a) * 70 * dt; }
    }
  }

  for (const e of s.enemies) {
    e.attack -= dt;
    const dp = dist(e, s.player);
    if (dp < 210 && e.y < 780) {
      const a = Math.atan2(s.player.y - e.y, s.player.x - e.x);
      if (dp > e.r + 27) { e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; }
      else if (e.attack <= 0) {
        s.player.hp -= e.damage; s.player.hurt = .18; s.shake = 7; e.attack = 1.05;
        addParticles(s, s.player.x, s.player.y, "#ff3333", 10, .7);
      }
    } else {
      const a = Math.atan2(THRONE.y - e.y, THRONE.x - e.x);
      if (dist(e, THRONE) > 80) { e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; }
      else if (e.attack <= 0) {
        s.throneHp -= e.damage * .75; s.shake = 8; e.attack = 1.2;
        addParticles(s, THRONE.x, THRONE.y, "#ff4632", 10, .8);
      }
    }
  }

  for (const e of s.enemies) {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; s.kills++; s.score += e.type === "tank" ? 300 : e.type === "mage" ? 180 : 100;
      addParticles(s, e.x, e.y, "#ff8a38", 18, 1);
    }
  }
  s.enemies = s.enemies.filter(e => !e.dead);
  s.shots = s.shots.filter(x => x.life > 0);
  s.minions = s.minions.filter(x => x.life > 0);
  for (const p of s.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt; }
  s.particles = s.particles.filter(p => p.life > 0);
  for (const r of s.rings) { r.r += 420 * dt; r.life -= dt; }
  s.rings = s.rings.filter(r => r.life > 0);

  if (s.player.hp <= 0 || s.throneHp <= 0) { s.over = true; s.win = false; }
  if (s.wave === 5 && s.waveTimer > 24 && s.enemies.length === 0) { s.over = true; s.win = true; }
}

export default function DemonGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeState());
  const keysRef = useRef(new Set());
  const mouseRef = useRef({ x: 800, y: 450, down: false });
  const [ui, setUi] = useState({ started: false, over: false, win: false, wave: 1, hp: 100, throne: 100, kills: 0, score: 0, cooldowns: {} });
  const [muted, setMuted] = useState(false);

  const syncUi = useCallback(() => {
    const s = stateRef.current;
    setUi({
      started: s.started, over: s.over, win: s.win, wave: s.wave,
      hp: Math.max(0, s.player.hp), throne: Math.max(0, s.throneHp),
      kills: s.kills, score: s.score, cooldowns: { ...s.cooldowns },
    });
  }, []);

  const useSkill = useCallback((skill) => {
    const s = stateRef.current;
    if (!s.started || s.over) return;
    if (skill === "slash" && s.cooldowns.slash <= 0) {
      s.cooldowns.slash = 2;
      s.rings.push({ x: s.player.x, y: s.player.y, r: 20, life: .42, color: "#f8d78e" });
      for (const e of s.enemies) if (dist(s.player, e) < 135) { e.hp -= 58; addParticles(s, e.x, e.y, "#ffe1a2", 10, .8); }
      s.shake = 5;
    }
    if (skill === "fire" && s.cooldowns.fire <= 0) {
      s.cooldowns.fire = 7;
      s.rings.push({ x: mouseRef.current.x, y: mouseRef.current.y, r: 15, life: .65, color: "#ff4f25" });
      for (const e of s.enemies) if (dist(mouseRef.current, e) < 170) { e.hp -= 95; addParticles(s, e.x, e.y, "#ff4a22", 15, 1); }
      s.shake = 10; s.flash = .55;
    }
    if (skill === "summon" && s.cooldowns.summon <= 0) {
      s.cooldowns.summon = 12;
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI * 2;
        s.minions.push({ x: s.player.x + Math.cos(a) * 55, y: s.player.y + Math.sin(a) * 55, life: 14, attack: 0 });
      }
      s.rings.push({ x: s.player.x, y: s.player.y, r: 10, life: .7, color: "#b889ff" });
    }
  }, []);

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
      if (e.code === "KeyQ") useSkill("fire");
      if (e.code === "KeyE") useSkill("summon");
    };
    const up = (e) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [useSkill]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = `${BASE_PATH}/demon-castle-map.png`;
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
      for (const m of s.minions) {
        ctx.save(); ctx.translate(m.x, m.y);
        ctx.fillStyle = "#b9d8c2"; ctx.strokeStyle = "#1a3024"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#151515"; ctx.fillRect(-8, -5, 5, 5); ctx.fillRect(3, -5, 5, 5);
        ctx.restore();
      }
      for (const e of s.enemies) drawEnemy(ctx, e);
      if (s.started) drawPlayer(ctx, s.player, s.time);
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
        <div className="wave-label"><span>침공 단계</span><b>WAVE {ui.wave} / 5</b></div>
        <button className="sound" onClick={() => setMuted(v => !v)} aria-label="소리 전환">{muted ? "소리 꺼짐" : "소리 켜짐"}</button>
      </header>

      <section className="game-wrap">
        <canvas
          ref={canvasRef} width={W} height={H} tabIndex={0}
          onMouseMove={canvasPoint}
          onMouseDown={(e) => { canvasPoint(e); mouseRef.current.down = true; }}
          onMouseUp={() => { mouseRef.current.down = false; }}
          onMouseLeave={() => { mouseRef.current.down = false; }}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="마왕의 최종 방어선 게임 화면"
        />

        <div className="hud top-left">
          <div className="portrait">♛</div>
          <div className="bars">
            <div className="bar-row"><span>마왕</span><b>{Math.ceil(ui.hp)}</b></div>
            <div className="bar"><i className="hp" style={{ width: `${ui.hp}%` }} /></div>
            <div className="bar-row throne-row"><span>왕좌</span><b>{Math.ceil(ui.throne)}</b></div>
            <div className="bar throne"><i style={{ width: `${ui.throne}%` }} /></div>
          </div>
        </div>

        <div className="score-card">
          <span>처치 <b>{ui.kills}</b></span><i />
          <span>악명 <b>{String(ui.score).padStart(5, "0")}</b></span>
        </div>

        {!ui.started && (
          <div className="overlay">
            <div className="sigil">♛</div>
            <p className="eyebrow">THE THRONE MUST STAND</p>
            <h1>이번엔 네가<br /><em>최종 보스</em>다</h1>
            <p className="lead">성문을 뚫고 들어온 용사들을 쓰러뜨리고<br />5번의 침공으로부터 왕좌를 지켜라.</p>
            <button className="start-btn" onClick={start}><span>전투 시작</span><small>ENTER THE THRONE ROOM</small></button>
            <div className="quick-controls"><span><kbd>WASD</kbd> 이동</span><span><kbd>마우스</kbd> 조준 · 공격</span><span><kbd>Q E</kbd> 스킬</span></div>
          </div>
        )}

        {ui.over && (
          <div className="overlay result">
            <div className="sigil">{ui.win ? "♛" : "†"}</div>
            <p className="eyebrow">{ui.win ? "THE CASTLE ENDURES" : "THE THRONE HAS FALLEN"}</p>
            <h1>{ui.win ? <>침공군을<br /><em>전멸시켰다</em></> : <>왕좌가<br /><em>함락되었다</em></>}</h1>
            <p className="lead">처치 {ui.kills} · 악명 {ui.score}</p>
            <button className="start-btn" onClick={start}><span>다시 도전</span><small>RECLAIM YOUR THRONE</small></button>
          </div>
        )}

        {ui.started && !ui.over && (
          <div className="skillbar">
            {SKILLS.map((x, i) => {
              const id = i === 0 ? "slash" : i === 1 ? "fire" : "summon";
              const cd = ui.cooldowns[id] || 0;
              return (
                <button key={x.key} className="skill" onClick={() => useSkill(id)} style={{ "--skill": x.color }}>
                  <kbd>{x.key}</kbd>
                  <span className="skill-icon">{i === 0 ? "☾" : i === 1 ? "♨" : "♟"}</span>
                  <span className="skill-copy"><b>{x.name}</b><small>{x.sub}</small></span>
                  {cd > 0 && <i className="cooldown">{cd.toFixed(1)}</i>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer>
        <span><i className="red-dot" /> 왕좌가 파괴되면 패배합니다</span>
        <p><kbd>W A S D</kbd> 이동 <b>·</b> <kbd>F / 클릭</kbd> 암흑탄 <b>·</b> <kbd>SPACE</kbd> 파멸의 낫</p>
        <span className="map-credit">원본 이미지 기반 왕좌의 방</span>
      </footer>
    </main>
  );
}
