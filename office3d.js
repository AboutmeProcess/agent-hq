/**
 * office3d.js — Spacious 3D Isometric Cutaway Diorama Engine for AboutMeProcess HQ
 * Floor plan (24 x 18 tiles):
 * - Dedicated Glass-Partitioned Server & Solar Room (Top-Left)
 * - Dedicated Walnut Wood CEO Executive Office with CEO character (Top-Right)
 * - Dedicated Glass-Partitioned LINE OA Hub Room (Mid-Right)
 * - Spacious Open Desk Bay for Driver, Finance, Take Profit, Captain (Center)
 * - Lounge, Purple Vending Machine, Coffee Bar & Healthy Treadmill Corner (Bottom-Left)
 * - Exterior City Street with Animated Delivery Scooters (Top)
 */
(function () {
  const canvas = document.getElementById('officeCanvas');
  const overlay = document.getElementById('moOverlay');
  if (!canvas || !overlay) return;
  const ctx = canvas.getContext('2d');

  // Isometric projection constants (spacious 24 x 18 world grid)
  const TW = 32;   // half tile width
  const TH = 16;   // half tile height
  const ZH = 22;   // height per z unit
  const CX = 12.2; // world center X
  const CY = 10.2; // world center Y

  // Camera state (smoothly interpolated)
  const cam = { x: 0, y: 12, z: 1.0, tx: 0, ty: 12, tz: 1.0 };
  const PRESETS = {
    overview: { x: 0, y: 12, z: 1.0 },
    ceo: { x: -340, y: 80, z: 1.85 },
    desks: { x: 18, y: -12, z: 1.65 },
    server: { x: 240, y: 105, z: 1.85 },
    line: { x: -230, y: -55, z: 1.85 }
  };

  let W = 960, H = 640, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let baseScale = 1.0;
  let isNight = false;
  let paused = false;
  let hoveredAgent = null;
  let dragging = false;
  let dragStart = { x: 0, y: 0, cx: 0, cy: 0 };
  let dragMoved = false;

  // Clickable desk lamps across rooms
  const lamps = [
    { id: 'lamp_drv', x: 9.0, y: 6.4, z: 0.9, on: true, agent: 'driver' },
    { id: 'lamp_fin', x: 13.0, y: 6.4, z: 0.9, on: true, agent: 'finance' },
    { id: 'lamp_pro', x: 9.0, y: 10.8, z: 0.9, on: true, agent: 'profit' },
    { id: 'lamp_ceo', x: 19.6, y: 4.9, z: 0.9, on: true, agent: 'ceo' },
    { id: 'lamp_lin', x: 19.6, y: 10.9, z: 0.9, on: true, agent: 'tg' }
  ];

  // Animated delivery scooters on exterior street
  const vehicles = [
    { x: -1.5, y: 1.4, speed: 1.5, color: '#22c55e', accent: '#bbf7d0' },
    { x: 7.5, y: 1.4, speed: 1.25, color: '#38bdf8', accent: '#bae6fd' },
    { x: 16.5, y: 1.4, speed: 1.65, color: '#f97316', accent: '#fed7aa' }
  ];

  // 9 Characters: CEO (You) + 8 AboutMeProcess Agents with generous spacing
  const AGENT_DEF = [
    // CEO Room (Top-Right)
    { id: 'ceo', name: '👑 CEO', home: { x: 19.5, y: 6.1 }, color: '#ffd166', shirt: '#1e293b', hair: '#18181b', crown: true, stay: true, role: 'Founder & CEO' },
    // LINE OA Room (Mid-Right)
    { id: 'tg', name: 'LINE OA', home: { x: 19.5, y: 12.1 }, color: '#06c755', shirt: '#059669', hair: '#1f2937', stay: true, role: 'LINE Hub' },
    // Dedicated Server & Solar Room (Top-Left)
    { id: 'solar', name: 'Solar', home: { x: 4.0, y: 6.6 }, color: '#eab308', shirt: '#1e3a5f', hair: '#eab308', helmet: '#facc15', role: 'BlueRing Solar' },
    { id: 'script', name: 'App Script', home: { x: 6.2, y: 7.4 }, color: '#a855f7', shirt: '#5b21b6', hair: '#a855f7', robot: true, role: 'Apps Script' },
    // Spacious Open Desk Bay (Center)
    { id: 'driver', name: 'Driver', home: { x: 9.5, y: 7.4 }, color: '#22c55e', shirt: '#15803d', hair: '#231710', hat: '#22c55e', role: 'Driver' },
    { id: 'finance', name: 'Finance', home: { x: 13.5, y: 7.4 }, color: '#f59e0b', shirt: '#b45309', hair: '#1e1b18', glasses: true, role: 'Finance' },
    { id: 'profit', name: 'Take Profit', home: { x: 9.5, y: 11.8 }, color: '#f97316', shirt: '#c2410c', hair: '#3b2412', role: 'MT5 EA' },
    { id: 'captain', name: 'Captain', home: { x: 13.5, y: 11.8 }, color: '#3b82f6', shirt: '#1d4ed8', hair: '#111827', role: 'Captain' },
    // Lounge & Healthy Zone (Bottom-Left)
    { id: 'health', name: 'Healthy', home: { x: 4.9, y: 14.3 }, color: '#ec4899', shirt: '#be185d', hair: '#3f2318', sporty: true, role: 'Healthy' }
  ];

  const WAYPOINTS = [
    { x: 11.6, y: 15.6, label: 'ประชุมวางแผนทีม 🗣️' },
    { x: 6.4, y: 15.6, label: 'แวะชงกาแฟ ☕' },
    { x: 4.8, y: 5.5, label: 'ตรวจห้องเซิร์ฟเวอร์ 🖥️' },
    { x: 16.0, y: 7.2, label: 'รายงานผลห้อง CEO 👑' },
    { x: 16.0, y: 12.2, label: 'ซิงก์ข้อความห้อง LINE 💬' }
  ];

  const agents = AGENT_DEF.map((def, i) => ({
    ...def,
    x: def.home.x,
    y: def.home.y,
    z: 0,
    tx: def.home.x,
    ty: def.home.y,
    state: 'work',
    timer: 3 + i * 1.6 + Math.random() * 5,
    bubbleText: '',
    bubbleUntil: 0,
    statusText: def.id === 'ceo' ? 'บริหาร AboutMeProcess HQ' : 'พร้อมทำงาน',
    screenX: 0,
    screenY: 0,
    elName: null,
    elBubble: null
  }));

  function initOverlays() {
    overlay.textContent = '';
    agents.forEach(a => {
      const np = document.createElement('button');
      np.type = 'button';
      np.className = 'mo3-np';
      np.style.setProperty('--c', a.color);
      np.innerHTML = '<i></i><span>' + a.name + '</span>';
      np.onclick = ev => {
        ev.stopPropagation();
        focusAgent(a.id);
        if (a.id === 'ceo') {
          if (typeof window.showMoToast === 'function') window.showMoToast('👑 ห้องผู้บริหาร CEO — AboutMeProcess HQ');
        } else if (typeof window.openAgent === 'function') {
          window.openAgent(a.id);
        }
      };
      overlay.appendChild(np);
      a.elName = np;

      const bb = document.createElement('div');
      bb.className = 'mo3-bb';
      bb.style.setProperty('--c', a.color);
      overlay.appendChild(bb);
      a.elBubble = bb;
    });
  }
  initOverlays();

  function iso(x, y, z) {
    const cx = x - CX;
    const cy = y - CY;
    const sx = (cx - cy) * TW;
    const sy = (cx + cy) * TH - (z || 0) * ZH;
    const s = cam.z * baseScale;
    return {
      x: W / 2 + (sx + cam.x) * s,
      y: H / 2 + (sy + cam.y) * s
    };
  }

  function box(x, y, z, w, d, h, cTop, cLeft, cRight, stroke) {
    const p001 = iso(x, y, z + h);
    const p101 = iso(x + w, y, z + h);
    const p111 = iso(x + w, y + d, z + h);
    const p011 = iso(x, y + d, z + h);
    const p100 = iso(x + w, y, z);
    const p110 = iso(x + w, y + d, z);
    const p010 = iso(x, y + d, z);

    ctx.beginPath();
    ctx.moveTo(p001.x, p001.y);
    ctx.lineTo(p101.x, p101.y);
    ctx.lineTo(p111.x, p111.y);
    ctx.lineTo(p011.x, p011.y);
    ctx.closePath();
    ctx.fillStyle = cTop;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke(); }

    if (h > 0.001) {
      ctx.beginPath();
      ctx.moveTo(p101.x, p101.y);
      ctx.lineTo(p111.x, p111.y);
      ctx.lineTo(p110.x, p110.y);
      ctx.lineTo(p100.x, p100.y);
      ctx.closePath();
      ctx.fillStyle = cRight;
      ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke(); }

      ctx.beginPath();
      ctx.moveTo(p011.x, p011.y);
      ctx.lineTo(p111.x, p111.y);
      ctx.lineTo(p110.x, p110.y);
      ctx.lineTo(p010.x, p010.y);
      ctx.closePath();
      ctx.fillStyle = cLeft;
      ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke(); }
    }
  }

  function tile(x, y, w, d, color, stroke) {
    box(x, y, 0, w, d, 0, color, color, color, stroke);
  }

  function glassWall(x1, y1, x2, y2, h) {
    const s = cam.z * baseScale;
    const a0 = iso(x1, y1, 0), a1 = iso(x1, y1, h);
    const b0 = iso(x2, y2, 0), b1 = iso(x2, y2, h);
    ctx.beginPath();
    ctx.moveTo(a0.x, a0.y);
    ctx.lineTo(b0.x, b0.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(a1.x, a1.y);
    ctx.closePath();
    ctx.fillStyle = isNight ? 'rgba(147, 197, 253, 0.14)' : 'rgba(186, 230, 253, 0.24)';
    ctx.fill();
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = Math.max(1.3, 2.0 * s);
    ctx.stroke();

    const steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) * 0.8));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const mx = x1 + (x2 - x1) * t;
      const my = y1 + (y2 - y1) * t;
      const m0 = iso(mx, my, 0), m1 = iso(mx, my, h);
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y);
      ctx.lineTo(m1.x, m1.y);
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.72)';
      ctx.lineWidth = Math.max(1, 1.3 * s);
      ctx.stroke();
    }
  }

  function roomLabel(x, y, text, accent) {
    const p = iso(x, y, 0.04);
    const s = cam.z * baseScale;
    ctx.save();
    ctx.font = '700 ' + Math.max(9, Math.round(11 * s)) + 'px var(--f), sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = accent || (isNight ? 'rgba(226,232,240,0.72)' : 'rgba(51,65,85,0.65)');
    ctx.fillText(text, p.x, p.y);
    ctx.restore();
  }

  function lightPool(x, y, z, radius, rgbaInner) {
    const s = cam.z * baseScale;
    const p = iso(x, y, z);
    const r = radius * s;
    const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
    grd.addColorStop(0, rgbaInner);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlant(x, y) {
    const s = cam.z * baseScale;
    box(x, y, 0, 0.6, 0.6, 0.48, '#c27849', '#a35d34', '#8a4c28');
    const p = iso(x + 0.3, y + 0.3, 0.68);
    const r = 11 * s;
    ctx.fillStyle = isNight ? '#15803d' : '#22c55e';
    [[-6, -2], [6, -3], [0, -8], [-4, 3], [5, 2]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.ellipse(p.x + ox * s, p.y + oy * s, r * 0.65, r * 0.42, ox * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawTree(x, y) {
    const s = cam.z * baseScale;
    box(x + 0.2, y + 0.2, 0, 0.32, 0.32, 0.85, '#784828', '#5c351c', '#4a2a16');
    const p = iso(x + 0.36, y + 0.36, 1.4);
    ctx.fillStyle = isNight ? '#14532d' : '#2f855a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isNight ? '#166534' : '#38a169';
    ctx.beginPath();
    ctx.arc(p.x - 4 * s, p.y - 4 * s, 12 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawScooter(v) {
    const s = cam.z * baseScale;
    box(v.x, v.y, 0.12, 0.9, 0.45, 0.36, v.color, v.color, '#1e293b');
    box(v.x + 0.06, v.y + 0.06, 0.48, 0.4, 0.34, 0.36, v.accent, v.color, v.color);
    const hp = iso(v.x + 0.58, v.y + 0.22, 0.95);
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.arc(hp.x, hp.y - 2 * s, 6.2 * s, Math.PI, Math.PI * 2);
    ctx.fill();
    if (isNight) lightPool(v.x + 1.05, v.y + 0.22, 0.2, 34, 'rgba(254, 240, 138, 0.45)');
  }

  function drawDesk(x, y, monitorColor, lampObj) {
    box(x, y, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
    box(x + 1.8, y, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
    box(x, y + 0.9, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
    box(x + 1.8, y + 0.9, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
    box(x, y, 0.65, 1.95, 1.05, 0.12, isNight ? '#cbd5e1' : '#f8fafc', '#cbd5e1', '#94a3b8');

    // Dual Monitors
    box(x + 0.28, y + 0.15, 0.77, 0.62, 0.08, 0.48, '#1e293b', monitorColor, '#0f172a');
    box(x + 1.02, y + 0.15, 0.77, 0.62, 0.08, 0.48, '#1e293b', '#38bdf8', '#0f172a');
    box(x + 0.6, y + 0.58, 0.77, 0.7, 0.24, 0.05, '#334155', '#1e293b', '#0f172a');

    // Chair
    box(x + 0.68, y + 1.25, 0.05, 0.58, 0.58, 0.36, '#475569', '#334155', '#1e293b');
    box(x + 0.68, y + 1.68, 0.41, 0.58, 0.12, 0.56, '#64748b', '#475569', '#334155');

    if (lampObj) {
      box(lampObj.x, lampObj.y, 0.77, 0.18, 0.18, 0.44, '#f97316', '#ea580c', '#c2410c');
      if (lampObj.on) {
        lightPool(lampObj.x + 0.1, lampObj.y + 0.1, 1.2, isNight ? 72 : 30, isNight ? 'rgba(251, 191, 36, 0.42)' : 'rgba(253, 224, 71, 0.18)');
      }
    }
    if (isNight) lightPool(x + 0.95, y + 0.45, 0.9, 46, 'rgba(56, 189, 248, 0.18)');
  }

  function drawCharacter(a, now) {
    const s = cam.z * baseScale;
    const walking = a.state === 'walk' || a.state === 'back';
    const bob = walking ? Math.abs(Math.sin(now * 10)) * 0.18 : Math.sin(now * 2.5 + a.x) * 0.03;
    const baseZ = (a.state === 'work' && !a.sporty) ? 0.22 : 0;

    const sh = iso(a.x, a.y, 0.02);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, 12 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hoveredAgent === a.id) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, 18 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const bx = a.x - 0.26, by = a.y - 0.22;
    box(bx, by, baseZ + 0.15 + bob, 0.52, 0.42, 0.6, a.shirt, a.shirt, '#111827');

    const hp = iso(a.x, a.y, baseZ + 1.08 + bob);
    const hr = 11.5 * s;
    a.screenX = hp.x;
    a.screenY = hp.y;

    if (a.robot) {
      box(bx - 0.04, by - 0.04, baseZ + 0.76 + bob, 0.6, 0.5, 0.54, '#7c3aed', '#5b21b6', '#4c1d95');
      const ant = iso(a.x, a.y, baseZ + 1.52 + bob);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ant.x, ant.y, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(hp.x - 5 * s, hp.y - 2 * s, 3.5 * s, 3.5 * s);
      ctx.fillRect(hp.x + 1.5 * s, hp.y - 2 * s, 3.5 * s, 3.5 * s);
    } else {
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, hr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = a.helmet || a.hat || a.hair;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y - 2 * s, hr * 1.03, Math.PI * 0.92, Math.PI * 2.08);
      ctx.fill();

      // CEO gold crown accent
      if (a.crown) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(hp.x - 7 * s, hp.y - 10 * s);
        ctx.lineTo(hp.x - 4 * s, hp.y - 17 * s);
        ctx.lineTo(hp.x, hp.y - 12 * s);
        ctx.lineTo(hp.x + 4 * s, hp.y - 17 * s);
        ctx.lineTo(hp.x + 7 * s, hp.y - 10 * s);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(hp.x - 3.6 * s, hp.y + 1.2 * s, 1.7 * s, 0, Math.PI * 2);
      ctx.arc(hp.x + 3.6 * s, hp.y + 1.2 * s, 1.7 * s, 0, Math.PI * 2);
      ctx.fill();

      if (a.helmet) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.fillRect(hp.x - 7 * s, hp.y - 1.5 * s, 14 * s, 4 * s);
      } else if (a.glasses) {
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(hp.x - 6.5 * s, hp.y - 1 * s, 5 * s, 4 * s);
        ctx.strokeRect(hp.x + 1.5 * s, hp.y - 1 * s, 5 * s, 4 * s);
      }
    }

    if (a.state === 'work' && Math.floor(now * 3 + a.x) % 2 === 0) {
      const tp = iso(a.x, a.y - 0.35, baseZ + 0.72);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawScene(now) {
    const s = cam.z * baseScale;
    ctx.fillStyle = isNight ? '#070b14' : '#1b2434';
    ctx.fillRect(0, 0, W, H);

    // 1) Exterior Street (x = 0..24, y = 0..3.1)
    tile(0, 0, 24, 2.8, isNight ? '#1e293b' : '#475569');
    for (let i = 0; i < 5; i++) {
      tile(8.2 + i * 0.45, 0.35, 0.22, 1.9, isNight ? '#475569' : '#cbd5e1');
    }
    tile(0, 2.6, 24, 0.65, isNight ? '#334155' : '#94a3b8');

    drawTree(1.2, 0.35);
    drawTree(22.2, 0.35);
    [4.6, 13.0, 20.0].forEach(lx => {
      box(lx, 2.7, 0, 0.14, 0.14, 2.3, '#64748b', '#475569', '#334155');
      if (isNight) lightPool(lx + 0.1, 2.4, 2.1, 86, 'rgba(253, 224, 71, 0.35)');
    });
    vehicles.forEach(drawScooter);

    // 2) Spacious Office Floor Slab (x = 1.8..22.6, y = 3.3..17.6)
    box(1.8, 3.3, -0.4, 20.8, 14.3, 0.4, isNight ? '#cbd5e1' : '#f1f5f9', '#64748b', '#475569');
    for (let gx = 2.0; gx < 22.4; gx += 1.6) {
      const a = iso(gx, 3.3, 0.01), b = iso(gx, 17.6, 0.01);
      ctx.strokeStyle = isNight ? 'rgba(15,23,42,0.10)' : 'rgba(148,163,184,0.20)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Back Cutaway Perimeter Walls
    box(1.8, 3.05, 0, 20.8, 0.26, 2.8, isNight ? '#94a3b8' : '#ffffff', isNight ? '#64748b' : '#e2e8f0', '#cbd5e1');
    box(1.56, 3.05, 0, 0.26, 14.55, 2.8, isNight ? '#94a3b8' : '#ffffff', '#cbd5e1', isNight ? '#475569' : '#cbd5e1');

    // === ZONE A: DEDICATED SERVER & SOLAR ROOM (Top-Left: x = 2.0..7.6, y = 3.4..9.0) ===
    tile(2.0, 3.4, 5.6, 5.6, isNight ? '#1e293b' : '#dbeafe');
    roomLabel(4.8, 8.5, '🖥️ SERVER & SOLAR ROOM', isNight ? '#93c5fd' : '#1d4ed8');
    [2.4, 3.4, 4.4, 5.4].forEach((sx, idx) => {
      box(sx, 3.65, 0, 0.78, 0.78, 2.1, '#1e293b', '#0f172a', '#090d16');
      for (let l = 0; l < 4; l++) {
        const lp = iso(sx + 0.2 + l * 0.14, 4.44, 1.72 - (l % 2) * 0.38);
        const on = Math.floor(now * 4 + idx + l) % 3 !== 0;
        ctx.fillStyle = on ? (l === 0 ? '#22c55e' : l === 1 ? '#38bdf8' : '#f59e0b') : '#1e293b';
        ctx.fillRect(lp.x, lp.y, 3.2 * s, 2.4 * s);
      }
    });
    // Solar Wall Monitor inside Server Room
    box(6.4, 3.36, 1.0, 1.0, 0.12, 0.95, '#0f172a', '#111827', '#090d16');
    const mp = iso(6.9, 3.5, 1.5);
    ctx.fillStyle = '#22c55e';
    ctx.font = '700 ' + Math.round(10 * s) + 'px var(--f), sans-serif';
    ctx.textAlign = 'center';
    const batt = (window.LASTD && window.LASTD.solar && window.LASTD.solar.battery) || 19;
    ctx.fillText(batt + '%', mp.x, mp.y);
    // Server Room Glass Walls (with open doorway at x = 7.6, y = 7.2..9.0)
    glassWall(7.6, 3.35, 7.6, 7.0, 2.4);
    glassWall(2.0, 9.0, 5.8, 9.0, 2.4);

    // === ZONE B: DEDICATED CEO EXECUTIVE OFFICE (Top-Right: x = 16.4..22.4, y = 3.4..9.0) ===
    tile(16.4, 3.4, 6.0, 5.6, isNight ? '#7c4d25' : '#c69363');
    box(16.4, 3.32, 0.02, 5.9, 0.1, 2.6, '#78350f', '#92400e', '#451a03');
    roomLabel(19.4, 8.5, '👑 CEO OFFICE', '#fef08a');
    // Executive L-Desk + Dual Screens
    box(18.0, 4.7, 0, 2.8, 1.15, 0.78, '#78350f', '#5c2d0c', '#3e1d07');
    box(18.5, 4.9, 0.78, 0.75, 0.1, 0.48, '#1e293b', '#ffd166', '#0f172a');
    box(19.4, 4.9, 0.78, 0.75, 0.1, 0.48, '#1e293b', '#38bdf8', '#0f172a');
    // CEO Bookshelf + Lounge Sofa
    box(21.4, 3.7, 0, 0.75, 1.8, 2.1, '#78350f', '#92400e', '#451a03');
    box(17.0, 7.3, 0, 1.8, 0.85, 0.48, '#334155', '#1e293b', '#0f172a');
    // CEO Clickable Lamp
    box(lamps[3].x, lamps[3].y, 0.78, 0.18, 0.18, 0.48, '#ffd166', '#eab308', '#a16207');
    if (lamps[3].on) lightPool(lamps[3].x + 0.1, lamps[3].y + 0.1, 1.3, isNight ? 90 : 38, isNight ? 'rgba(251, 191, 36, 0.48)' : 'rgba(253, 224, 71, 0.20)');
    glassWall(16.4, 3.35, 16.4, 6.8, 2.4);
    glassWall(16.4, 9.0, 22.4, 9.0, 2.4);

    // === ZONE C: DEDICATED LINE OA HUB ROOM (Mid-Right: x = 16.4..22.4, y = 9.4..14.8) ===
    tile(16.4, 9.4, 6.0, 5.4, isNight ? '#133025' : '#dcfce7');
    roomLabel(19.4, 14.3, '💬 LINE OA HUB', isNight ? '#4ade80' : '#15803d');
    box(18.2, 10.7, 0, 2.4, 1.05, 0.75, isNight ? '#cbd5e1' : '#ffffff', '#cbd5e1', '#94a3b8');
    box(18.8, 10.88, 0.75, 0.85, 0.1, 0.5, '#1e293b', '#06c755', '#0f172a');
    box(lamps[4].x, lamps[4].y, 0.75, 0.18, 0.18, 0.44, '#06c755', '#16a34a', '#15803d');
    if (lamps[4].on) lightPool(lamps[4].x + 0.1, lamps[4].y + 0.1, 1.2, isNight ? 75 : 30, isNight ? 'rgba(34, 197, 94, 0.36)' : 'rgba(74, 222, 128, 0.18)');
    glassWall(16.4, 9.4, 16.4, 12.6, 2.4);
    glassWall(16.4, 14.8, 22.4, 14.8, 2.4);

    // === ZONE D: LOUNGE, COFFEE BAR, VENDING & HEALTHY CORNER (Bottom-Left) ===
    // Purple Vending Machine
    box(2.3, 10.6, 0, 1.0, 0.85, 2.0, '#7e22ce', '#a855f7', '#581c87');
    box(2.45, 11.46, 0.6, 0.7, 0.04, 1.0, '#e9d5ff', '#f3e8ff', '#d8b4fe');
    if (isNight) lightPool(2.8, 11.6, 1.1, 76, 'rgba(168, 85, 247, 0.42)');
    // Healthy Treadmill
    box(4.2, 13.9, 0, 1.5, 0.72, 0.15, '#334155', '#1e293b', '#0f172a');
    box(4.2, 13.9, 0.15, 0.18, 0.72, 1.0, '#ec4899', '#be185d', '#831843');
    // Coffee Bar
    box(5.8, 16.1, 0, 2.4, 0.85, 0.85, '#d6b28d', '#b08968', '#7f5539');
    box(6.1, 16.3, 0.85, 0.48, 0.42, 0.44, '#334155', '#1e293b', '#0f172a');
    // Open Collaboration Meeting Table (Bottom-Center)
    tile(9.6, 14.8, 4.8, 2.4, isNight ? '#334155' : '#e2e8f0');
    box(10.6, 15.3, 0, 2.6, 1.35, 0.68, isNight ? '#cbd5e1' : '#ffffff', '#e2e8f0', '#cbd5e1');

    // Plants placed generously around room corners
    drawPlant(8.0, 3.6);
    drawPlant(15.3, 3.6);
    drawPlant(2.3, 16.2);
    drawPlant(21.4, 16.0);

    // 3) Depth-sorted desks + all 9 characters
    const drawables = [
      { depth: 8.6 + 6.2, draw: () => drawDesk(8.6, 6.2, '#22c55e', lamps[0]) },
      { depth: 12.6 + 6.2, draw: () => drawDesk(12.6, 6.2, '#f59e0b', lamps[1]) },
      { depth: 8.6 + 10.6, draw: () => drawDesk(8.6, 10.6, '#f97316', lamps[2]) },
      { depth: 12.6 + 10.6, draw: () => drawDesk(12.6, 10.6, '#3b82f6', null) }
    ];
    agents.forEach(a => drawables.push({ depth: a.x + a.y + 0.4, draw: () => drawCharacter(a, now) }));
    drawables.sort((a, b) => a.depth - b.depth);
    drawables.forEach(d => d.draw());

    // 4) Night warm string lights across central open bay
    if (isNight) {
      for (let i = 0; i < 6; i++) {
        const lx = 8.4 + i * 1.4;
        const lp = iso(lx, 9.2, 2.7);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 2.6 * s, 0, Math.PI * 2);
        ctx.fill();
        lightPool(lx, 9.2, 2.65, 28, 'rgba(253, 224, 71, 0.20)');
      }
    }
  }

  let lastTs = 0;
  function frame(ts) {
    const now = ts / 1000;
    const dt = Math.min(0.08, now - lastTs || 0.016);
    lastTs = now;

    cam.x += (cam.tx - cam.x) * 0.14;
    cam.y += (cam.ty - cam.y) * 0.14;
    cam.z += (cam.tz - cam.z) * 0.14;

    if (!paused) {
      vehicles.forEach(v => {
        v.x += v.speed * dt;
        if (v.x > 24.5) v.x = -1.8;
      });

      const walkingCount = agents.filter(a => a.state === 'walk' || a.state === 'back').length;
      agents.forEach(a => {
        if (a.state === 'work') {
          if (now > a.timer) {
            if (walkingCount < 2 && Math.random() < 0.42 && !a.stay) {
              const wp = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
              a.tx = wp.x + (Math.random() - 0.5) * 0.8;
              a.ty = wp.y + (Math.random() - 0.5) * 0.8;
              a.state = 'walk';
              a.bubbleText = wp.label;
              a.bubbleUntil = now + 4.5;
            } else {
              a.bubbleText = a.statusText || 'พร้อมทำงาน';
              a.bubbleUntil = now + 3.6;
              a.timer = now + 8 + Math.random() * 10;
            }
          }
        } else if (a.state === 'walk' || a.state === 'back') {
          const gx = a.state === 'walk' ? a.tx : a.home.x;
          const gy = a.state === 'walk' ? a.ty : a.home.y;
          const dx = gx - a.x, dy = gy - a.y;
          const dist = Math.hypot(dx, dy);
          const step = 1.85 * dt;
          if (dist <= step) {
            a.x = gx; a.y = gy;
            if (a.state === 'walk') {
              a.state = 'chat';
              a.timer = now + 3.8;
            } else {
              a.state = 'work';
              a.timer = now + 9 + Math.random() * 11;
            }
          } else {
            a.x += (dx / dist) * step;
            a.y += (dy / dist) * step;
          }
        } else if (a.state === 'chat' && now > a.timer) {
          a.state = 'back';
        }
      });
    }

    drawScene(now);

    const s = cam.z * baseScale;
    agents.forEach(a => {
      if (a.elName) {
        a.elName.style.transform = `translate(${a.screenX.toFixed(1)}px, ${(a.screenY + 22 * s).toFixed(1)}px) translate(-50%, 0)`;
      }
      if (a.elBubble) {
        const show = now < a.bubbleUntil && a.bubbleText;
        a.elBubble.classList.toggle('on', !!show);
        if (show) {
          a.elBubble.textContent = a.bubbleText;
          a.elBubble.style.transform = `translate(${a.screenX.toFixed(1)}px, ${(a.screenY - 22 * s).toFixed(1)}px) translate(-50%, -100%)`;
        }
      }
    });

    requestAnimationFrame(frame);
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(500, Math.min(680, Math.round(W * 0.72)));
    baseScale = Math.min(1.05, Math.min(W / 1280, H / 680));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function getPointer(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function findAgentAt(px, py) {
    const s = cam.z * baseScale;
    let best = null, bestD = 28 * s;
    agents.forEach(a => {
      const d = Math.hypot(px - a.screenX, py - a.screenY);
      if (d < bestD) { bestD = d; best = a; }
    });
    return best;
  }

  function findLampAt(px, py) {
    const s = cam.z * baseScale;
    for (const l of lamps) {
      const p = iso(l.x + 0.1, l.y + 0.1, 1.0);
      if (Math.hypot(px - p.x, py - p.y) < 18 * s) return l;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', ev => {
    const p = getPointer(ev);
    dragging = true;
    dragMoved = false;
    dragStart = { x: p.x, y: p.y, cx: cam.tx, cy: cam.ty };
    canvas.setPointerCapture(ev.pointerId);
  });

  canvas.addEventListener('pointermove', ev => {
    const p = getPointer(ev);
    if (dragging) {
      const s = cam.z * baseScale;
      const dx = (p.x - dragStart.x) / s;
      const dy = (p.y - dragStart.y) / s;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      cam.tx = Math.max(-420, Math.min(420, dragStart.cx + dx));
      cam.ty = Math.max(-280, Math.min(280, dragStart.cy + dy));
      return;
    }
    const hit = findAgentAt(p.x, p.y);
    const lhit = findLampAt(p.x, p.y);
    hoveredAgent = hit ? hit.id : null;
    canvas.style.cursor = (hit || lhit) ? 'pointer' : 'grab';
  });

  canvas.addEventListener('pointerup', ev => {
    if (!dragging) return;
    dragging = false;
    if (!dragMoved) {
      const p = getPointer(ev);
      const hit = findAgentAt(p.x, p.y);
      if (hit) {
        focusAgent(hit.id);
        if (hit.id === 'ceo') {
          if (typeof window.showMoToast === 'function') window.showMoToast('👑 ห้องผู้บริหาร CEO — AboutMeProcess HQ');
        } else if (typeof window.openAgent === 'function') {
          window.openAgent(hit.id);
        }
        return;
      }
      const lhit = findLampAt(p.x, p.y);
      if (lhit) {
        lhit.on = !lhit.on;
        const owner = agents.find(a => a.id === lhit.agent);
        if (owner) {
          owner.bubbleText = lhit.on ? 'เปิดโคมไฟแล้ว 💡' : 'เอ๊ะ ใครปิดไฟโต๊ะ! 😅';
          owner.bubbleUntil = performance.now() / 1000 + 3.5;
        }
        if (typeof window.showMoToast === 'function') {
          window.showMoToast(lhit.on ? '💡 เปิดโคมไฟโต๊ะทำงานแล้ว' : '🌑 ปิดโคมไฟโต๊ะทำงาน');
        }
      }
    }
  });

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    setZoom(cam.tz * (ev.deltaY < 0 ? 1.12 : 0.89));
  }, { passive: false });

  function updateZoomLabel() {
    const zv = document.getElementById('moZoomVal');
    if (zv) zv.textContent = Math.round(cam.tz * 100) + '%';
  }

  function setZoom(z) {
    cam.tz = Math.max(0.75, Math.min(2.6, z));
    updateZoomLabel();
  }

  function setPreset(name) {
    const p = PRESETS[name] || PRESETS.overview;
    cam.tx = p.x; cam.ty = p.y; cam.tz = p.z;
    updateZoomLabel();
    document.querySelectorAll('.mo-dbtn[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === name));
  }

  function focusAgent(id) {
    const a = agents.find(x => x.id === id);
    if (!a) return;
    const cx = a.x - CX, cy = a.y - CY;
    cam.tx = -(cx - cy) * TW;
    cam.ty = -(cx + cy) * TH + 18;
    cam.tz = 1.85;
    a.bubbleText = a.statusText || 'พร้อมทำงาน';
    a.bubbleUntil = performance.now() / 1000 + 4.5;
    updateZoomLabel();
    document.querySelectorAll('.mo-dbtn[data-cam]').forEach(b => b.classList.remove('on'));
  }

  window.OFFICE3D = {
    setPreset,
    zoomIn: () => setZoom(cam.tz * 1.2),
    zoomOut: () => setZoom(cam.tz * 0.83),
    setNight: n => { isNight = !!n; },
    setPaused: p => { paused = !!p; },
    focusAgent,
    syncStatus: map => {
      agents.forEach(a => {
        if (map && map[a.id]) a.statusText = map[a.id];
      });
    },
    resize
  };

  requestAnimationFrame(frame);
})();
