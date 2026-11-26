/**
 * office3d.js — Interactive 3D Isometric Cutaway Diorama Engine for AboutMeProcess HQ
 * Inspired by My Office: cozy isometric architecture, glass meeting room, server & solar alcove,
 * Director's corner office, animated city street with scooters, clickable desk lamps,
 * Day/Night lighting with warm amber pools, and 8 autonomous chibi AI agents.
 */
(function () {
  const canvas = document.getElementById('officeCanvas');
  const overlay = document.getElementById('moOverlay');
  if (!canvas || !overlay) return;
  const ctx = canvas.getContext('2d');

  // Isometric projection constants (world grid: 18 x 15 tiles)
  const TW = 38;   // half tile width
  const TH = 19;   // half tile height
  const ZH = 24;   // height per z unit

  // Camera state (smoothly interpolated)
  const cam = { x: 0, y: 20, z: 1.0, tx: 0, ty: 20, tz: 1.0 };
  const PRESETS = {
    overview: { x: 0, y: 18, z: 1.0 },
    desks: { x: 18, y: -34, z: 1.68 },
    trade: { x: 165, y: -62, z: 1.78 },
    solar: { x: -160, y: 16, z: 1.75 }
  };

  let W = 900, H = 560, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let baseScale = 1.0;
  let isNight = false;
  let paused = false;
  let hoveredAgent = null;
  let dragging = false;
  let dragStart = { x: 0, y: 0, cx: 0, cy: 0 };
  let dragMoved = false;

  // Clickable desk lamps
  const lamps = [
    { id: 'lamp1', x: 7.4, y: 7.2, z: 0.9, on: true, agent: 'driver' },
    { id: 'lamp2', x: 10.4, y: 7.2, z: 0.9, on: true, agent: 'finance' },
    { id: 'lamp3', x: 7.4, y: 10.2, z: 0.9, on: true, agent: 'profit' },
    { id: 'lamp4', x: 14.3, y: 2.3, z: 0.9, on: true, agent: 'tg' }
  ];

  // Animated delivery scooters / cars on the exterior street
  const vehicles = [
    { x: -1.5, y: 1.5, speed: 1.35, color: '#22c55e', accent: '#bbf7d0', type: 'scooter' }, // Grab
    { x: 6.0, y: 1.5, speed: 1.15, color: '#38bdf8', accent: '#bae6fd', type: 'scooter' },  // Bolt
    { x: 13.5, y: 1.5, speed: 1.5, color: '#f97316', accent: '#fed7aa', type: 'scooter' }   // LINE MAN
  ];

  // 8 AboutMeProcess Agents in 3D world coordinates
  const AGENT_DEF = [
    { id: 'driver', name: 'Driver', home: { x: 7.5, y: 8.1 }, desk: { x: 7.5, y: 7.4 }, color: '#22c55e', shirt: '#15803d', hair: '#231710', hat: '#22c55e', role: 'Driver' },
    { id: 'finance', name: 'Finance', home: { x: 10.5, y: 8.1 }, desk: { x: 10.5, y: 7.4 }, color: '#f59e0b', shirt: '#b45309', hair: '#1e1b18', glasses: true, role: 'Finance' },
    { id: 'captain', name: 'Captain', home: { x: 10.5, y: 11.1 }, desk: { x: 10.5, y: 10.4 }, color: '#3b82f6', shirt: '#1d4ed8', hair: '#111827', role: 'Captain' },
    { id: 'profit', name: 'Take Profit', home: { x: 7.5, y: 11.1 }, desk: { x: 7.5, y: 10.4 }, color: '#f97316', shirt: '#c2410c', hair: '#3b2412', role: 'MT5 EA' },
    { id: 'solar', name: 'Solar', home: { x: 4.5, y: 5.8 }, desk: { x: 4.2, y: 5.0 }, color: '#eab308', shirt: '#1e3a5f', hair: '#eab308', helmet: '#facc15', role: 'Solar' },
    { id: 'health', name: 'Healthy', home: { x: 4.6, y: 11.4 }, desk: { x: 4.6, y: 11.4 }, color: '#ec4899', shirt: '#be185d', hair: '#3f2318', sporty: true, role: 'Healthy' },
    { id: 'script', name: 'App Script', home: { x: 4.5, y: 8.2 }, desk: { x: 4.5, y: 7.4 }, color: '#a855f7', shirt: '#5b21b6', hair: '#a855f7', robot: true, role: 'Apps Script' },
    { id: 'tg', name: 'LINE OA', home: { x: 14.2, y: 3.8 }, desk: { x: 14.2, y: 3.0 }, color: '#06c755', shirt: '#059669', hair: '#1f2937', director: true, role: 'LINE Hub' }
  ];

  const WAYPOINTS = [
    { x: 13.4, y: 8.8, label: 'ประชุมวางแผนทีม 🗣️' },   // Meeting room
    { x: 13.8, y: 12.2, label: 'แวะชงกาแฟ ☕' },          // Coffee / vending
    { x: 3.8, y: 4.6, label: 'ตรวจตู้เซิร์ฟเวอร์ 🖥️' }, // Server rack
    { x: 9.0, y: 9.2, label: 'อัปเดตงานกับทีม 📋' }       // Center aisle
  ];

  const agents = AGENT_DEF.map((def, i) => ({
    ...def,
    x: def.home.x,
    y: def.home.y,
    z: 0,
    tx: def.home.x,
    ty: def.home.y,
    state: 'work', // work | walk | chat | back
    timer: 3 + i * 1.7 + Math.random() * 5,
    bubbleText: '',
    bubbleUntil: 0,
    statusText: 'พร้อมทำงาน',
    screenX: 0,
    screenY: 0,
    elName: null,
    elBubble: null
  }));

  // Create crisp HTML overlay pills for each agent
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
        if (typeof window.openAgent === 'function') window.openAgent(a.id);
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

  // World -> Screen projection
  function iso(x, y, z) {
    const cx = x - 8.5;
    const cy = y - 7.5;
    const sx = (cx - cy) * TW;
    const sy = (cx + cy) * TH - (z || 0) * ZH;
    const s = cam.z * baseScale;
    return {
      x: W / 2 + (sx + cam.x) * s,
      y: H / 2 + (sy + cam.y) * s
    };
  }

  // Draw isometric 3D box (top, left, right faces)
  function box(x, y, z, w, d, h, cTop, cLeft, cRight, stroke) {
    const p001 = iso(x, y, z + h);
    const p101 = iso(x + w, y, z + h);
    const p111 = iso(x + w, y + d, z + h);
    const p011 = iso(x, y + d, z + h);
    const p100 = iso(x + w, y, z);
    const p110 = iso(x + w, y + d, z);
    const p010 = iso(x, y + d, z);

    // Top face
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
      // Right face (facing +X)
      ctx.beginPath();
      ctx.moveTo(p101.x, p101.y);
      ctx.lineTo(p111.x, p111.y);
      ctx.lineTo(p110.x, p110.y);
      ctx.lineTo(p100.x, p100.y);
      ctx.closePath();
      ctx.fillStyle = cRight;
      ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke(); }

      // Left face (facing +Y)
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

  // Draw flat tile
  function tile(x, y, w, d, color, stroke) {
    box(x, y, 0, w, d, 0, color, color, color, stroke);
  }

  // Draw glass partition wall with black mullions (like My Office meeting room!)
  function glassWall(x1, y1, x2, y2, h) {
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
    ctx.lineWidth = Math.max(1.5, 2.1 * cam.z);
    ctx.stroke();

    // Vertical mullions
    const steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) * 0.9));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const mx = x1 + (x2 - x1) * t;
      const my = y1 + (y2 - y1) * t;
      const m0 = iso(mx, my, 0), m1 = iso(mx, my, h);
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y);
      ctx.lineTo(m1.x, m1.y);
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.72)';
      ctx.lineWidth = Math.max(1, 1.4 * cam.z);
      ctx.stroke();
    }
  }

  // Draw glowing warm radial light pool
  function lightPool(x, y, z, radius, rgbaInner) {
    const p = iso(x, y, z);
    const r = radius * cam.z;
    const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
    grd.addColorStop(0, rgbaInner);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw stylized potted plant
  function drawPlant(x, y) {
    box(x, y, 0, 0.55, 0.55, 0.45, '#c27849', '#a35d34', '#8a4c28');
    const p = iso(x + 0.28, y + 0.28, 0.65);
    const r = 11 * cam.z;
    ctx.fillStyle = isNight ? '#15803d' : '#22c55e';
    [[-6, -2], [6, -3], [0, -8], [-4, 3], [5, 2]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.ellipse(p.x + ox * cam.z, p.y + oy * cam.z, r * 0.65, r * 0.42, ox * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Draw exterior tree
  function drawTree(x, y) {
    box(x + 0.2, y + 0.2, 0, 0.3, 0.3, 0.8, '#784828', '#5c351c', '#4a2a16');
    const p = iso(x + 0.35, y + 0.35, 1.35);
    ctx.fillStyle = isNight ? '#14532d' : '#2f855a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17 * cam.z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isNight ? '#166534' : '#38a169';
    ctx.beginPath();
    ctx.arc(p.x - 4 * cam.z, p.y - 4 * cam.z, 12 * cam.z, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw animated scooter on street
  function drawScooter(v) {
    box(v.x, v.y, 0.12, 0.85, 0.42, 0.36, v.color, v.color, '#1e293b');
    box(v.x + 0.05, v.y + 0.05, 0.48, 0.38, 0.32, 0.36, v.accent, v.color, v.color);
    // Rider head
    const hp = iso(v.x + 0.55, v.y + 0.2, 0.95);
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 6 * cam.z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.arc(hp.x, hp.y - 2 * cam.z, 6.2 * cam.z, Math.PI, Math.PI * 2);
    ctx.fill();
    if (isNight) lightPool(v.x + 1.0, v.y + 0.2, 0.2, 34, 'rgba(254, 240, 138, 0.45)');
  }

  // Draw white modular desk with dual glowing monitors & optional lamp
  function drawDesk(x, y, monitorColor, lampObj) {
    // Desk surface & legs
    box(x, y, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
    box(x + 1.65, y, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
    box(x, y + 0.85, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
    box(x + 1.65, y + 0.85, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
    box(x, y, 0.65, 1.8, 1.0, 0.12, isNight ? '#cbd5e1' : '#f8fafc', '#cbd5e1', '#94a3b8');

    // Dual Monitors
    box(x + 0.25, y + 0.15, 0.77, 0.58, 0.08, 0.46, '#1e293b', monitorColor, '#0f172a');
    box(x + 0.95, y + 0.15, 0.77, 0.58, 0.08, 0.46, '#1e293b', '#38bdf8', '#0f172a');
    // Keyboard
    box(x + 0.55, y + 0.55, 0.77, 0.65, 0.22, 0.05, '#334155', '#1e293b', '#0f172a');

    // Chair behind desk
    box(x + 0.6, y + 1.15, 0.05, 0.55, 0.55, 0.35, '#475569', '#334155', '#1e293b');
    box(x + 0.6, y + 1.55, 0.4, 0.55, 0.12, 0.55, '#64748b', '#475569', '#334155');

    // Clickable Desk Lamp
    if (lampObj) {
      box(lampObj.x, lampObj.y, 0.77, 0.18, 0.18, 0.42, '#f97316', '#ea580c', '#c2410c');
      if (lampObj.on) {
        lightPool(lampObj.x + 0.1, lampObj.y + 0.1, 1.15, isNight ? 66 : 30, isNight ? 'rgba(251, 191, 36, 0.42)' : 'rgba(253, 224, 71, 0.18)');
      }
    }
    if (isNight) {
      lightPool(x + 0.85, y + 0.45, 0.9, 44, 'rgba(56, 189, 248, 0.18)');
    }
  }

  // Draw 3D Chibi Character (glossy toy aesthetic like My Office)
  function drawCharacter(a, now) {
    const walking = a.state === 'walk' || a.state === 'back';
    const bob = walking ? Math.abs(Math.sin(now * 10)) * 0.18 : Math.sin(now * 2.5 + a.x) * 0.03;
    const baseZ = (a.state === 'work' && !a.sporty) ? 0.22 : 0;

    // Ground shadow
    const sh = iso(a.x, a.y, 0.02);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, 12 * cam.z, 6 * cam.z, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hover highlight ring
    if (hoveredAgent === a.id) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, 18 * cam.z, 9 * cam.z, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body (3D torso box)
    const bx = a.x - 0.25, by = a.y - 0.2;
    box(bx, by, baseZ + 0.15 + bob, 0.5, 0.4, 0.58, a.shirt, a.shirt, '#111827');

    // Head (chibi sphere)
    const hp = iso(a.x, a.y, baseZ + 1.05 + bob);
    const hr = 11.5 * cam.z;
    a.screenX = hp.x;
    a.screenY = hp.y;

    if (a.robot) {
      // App Script cute violet robot head + glowing cyan antenna
      box(bx - 0.04, by - 0.04, baseZ + 0.74 + bob, 0.58, 0.48, 0.52, '#7c3aed', '#5b21b6', '#4c1d95');
      const ant = iso(a.x, a.y, baseZ + 1.48 + bob);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ant.x, ant.y, 4 * cam.z, 0, Math.PI * 2);
      ctx.fill();
      // Glowing robot eyes
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(hp.x - 5 * cam.z, hp.y - 2 * cam.z, 3.5 * cam.z, 3.5 * cam.z);
      ctx.fillRect(hp.x + 1.5 * cam.z, hp.y - 2 * cam.z, 3.5 * cam.z, 3.5 * cam.z);
    } else {
      // Skin sphere
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, hr, 0, Math.PI * 2);
      ctx.fill();

      // Hair / Helmet cap
      ctx.fillStyle = a.helmet || a.hat || a.hair;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y - 2 * cam.z, hr * 1.03, Math.PI * 0.92, Math.PI * 2.08);
      ctx.fill();

      // Expressive eyes
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(hp.x - 3.6 * cam.z, hp.y + 1.2 * cam.z, 1.7 * cam.z, 0, Math.PI * 2);
      ctx.arc(hp.x + 3.6 * cam.z, hp.y + 1.2 * cam.z, 1.7 * cam.z, 0, Math.PI * 2);
      ctx.fill();

      // Solar blue visor or Finance glasses
      if (a.helmet) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.fillRect(hp.x - 7 * cam.z, hp.y - 1.5 * cam.z, 14 * cam.z, 4 * cam.z);
      } else if (a.glasses) {
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(hp.x - 6.5 * cam.z, hp.y - 1 * cam.z, 5 * cam.z, 4 * cam.z);
        ctx.strokeRect(hp.x + 1.5 * cam.z, hp.y - 1 * cam.z, 5 * cam.z, 4 * cam.z);
      }
    }

    // Typing sparkles when working at desk
    if (a.state === 'work' && Math.floor(now * 3 + a.x) % 2 === 0) {
      const tp = iso(a.x, a.y - 0.35, baseZ + 0.72);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 2.6 * cam.z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw full 3D isometric office scene
  function drawScene(now) {
    // Sky / backdrop
    ctx.fillStyle = isNight ? '#070b14' : '#1b2434';
    ctx.fillRect(0, 0, W, H);

    // 1) Exterior city road & sidewalk (y = 0..3)
    tile(0, 0, 17, 3.0, isNight ? '#1e293b' : '#475569');
    // Crosswalk stripes
    for (let i = 0; i < 4; i++) {
      tile(5.2 + i * 0.45, 0.4, 0.22, 2.0, isNight ? '#475569' : '#cbd5e1');
    }
    tile(0, 2.7, 17, 0.6, isNight ? '#334155' : '#94a3b8'); // Sidewalk curb

    // Street trees & streetlamps
    drawTree(1.2, 0.4);
    drawTree(15.2, 0.4);
    [3.5, 11.5].forEach(lx => {
      box(lx, 2.75, 0, 0.14, 0.14, 2.2, '#64748b', '#475569', '#334155');
      if (isNight) lightPool(lx + 0.1, 2.5, 2.1, 80, 'rgba(253, 224, 71, 0.35)');
    });

    // Animated delivery scooters
    vehicles.forEach(drawScooter);

    // 2) Cutaway Office Floor Slab (x = 2..16, y = 3.3..13.8)
    box(2, 3.3, -0.35, 14, 10.5, 0.35, isNight ? '#cbd5e1' : '#f1f5f9', '#64748b', '#475569');
    // Subtle floor grid tiles
    for (let gx = 2; gx < 16; gx += 1.4) {
      const a = iso(gx, 3.3, 0.01), b = iso(gx, 13.8, 0.01);
      ctx.strokeStyle = isNight ? 'rgba(15,23,42,0.12)' : 'rgba(148,163,184,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Director's Corner Office warm wood floor (x = 12.2..16, y = 3.3..6.8)
    tile(12.2, 3.3, 3.8, 3.5, isNight ? '#92623a' : '#c89563');

    // Meeting room rug (x = 12.2..15.8, y = 7.0..10.8)
    tile(12.4, 7.2, 3.2, 3.3, isNight ? '#334155' : '#e2e8f0');

    // Back Cutaway Walls (x = 2..16 at y = 3.3, and x = 2 at y = 3.3..13.8)
    box(2, 3.1, 0, 14, 0.25, 2.6, isNight ? '#94a3b8' : '#ffffff', isNight ? '#64748b' : '#e2e8f0', '#cbd5e1');
    box(1.8, 3.1, 0, 0.25, 10.7, 2.6, isNight ? '#94a3b8' : '#ffffff', '#cbd5e1', isNight ? '#475569' : '#cbd5e1');

    // Director wood accent back wall
    box(12.2, 3.32, 0.02, 3.7, 0.08, 2.4, '#784828', '#8b5a2b', '#5c351c');

    // 3) Server & Solar Wall Alcove (x = 2.4..6.2, y = 3.6..4.8)
    [2.5, 3.4, 4.3].forEach((sx, idx) => {
      box(sx, 3.6, 0, 0.72, 0.72, 1.9, '#1e293b', '#0f172a', '#090d16');
      // Blinking LEDs
      for (let l = 0; l < 4; l++) {
        const lp = iso(sx + 0.2 + l * 0.14, 4.33, 1.55 - (l % 2) * 0.35);
        const on = Math.floor(now * 4 + idx + l) % 3 !== 0;
        ctx.fillStyle = on ? (l === 0 ? '#22c55e' : l === 1 ? '#38bdf8' : '#f59e0b') : '#1e293b';
        ctx.fillRect(lp.x, lp.y, 3.2 * cam.z, 2.4 * cam.z);
      }
    });
    // Large Solar / System Wall Monitor
    box(5.4, 3.36, 0.9, 1.9, 0.12, 1.1, '#0f172a', '#111827', '#090d16');
    const mp = iso(6.35, 3.5, 1.45);
    ctx.fillStyle = '#22c55e';
    ctx.font = '700 ' + Math.round(11 * cam.z) + 'px var(--f), sans-serif';
    ctx.textAlign = 'center';
    const batt = (window.LASTD && window.LASTD.solar && window.LASTD.solar.battery) || 94;
    ctx.fillText(batt + '%', mp.x, mp.y);

    // 4) Director's Office Furniture (Telegram Hub)
    box(13.3, 3.9, 0, 1.9, 0.95, 0.75, '#92400e', '#78350f', '#451a03');
    box(13.8, 4.05, 0.75, 0.65, 0.1, 0.45, '#1e293b', '#06c755', '#0f172a');
    if (lamps[3].on) lightPool(14.3, 4.0, 1.2, isNight ? 78 : 34, isNight ? 'rgba(251, 191, 36, 0.45)' : 'rgba(253, 224, 71, 0.18)');
    // Bookshelf
    box(15.2, 3.6, 0, 0.65, 1.3, 1.85, '#78350f', '#92400e', '#451a03');
    // Glass partition separating Director's office
    glassWall(12.2, 3.3, 12.2, 6.8, 2.2);
    glassWall(12.2, 6.8, 14.4, 6.8, 2.2);

    // 5) Meeting Room Furniture
    box(13.1, 8.1, 0, 1.8, 1.3, 0.68, isNight ? '#cbd5e1' : '#ffffff', '#e2e8f0', '#cbd5e1');
    glassWall(12.2, 7.0, 12.2, 10.6, 2.2);

    // 6) Lounge: Purple Vending Machine (Signature My Office prop!) + Coffee Bar + Healthy Treadmill
    box(2.4, 12.1, 0, 0.95, 0.8, 1.85, '#7e22ce', '#a855f7', '#581c87');
    box(2.55, 12.91, 0.55, 0.65, 0.04, 0.95, '#e9d5ff', '#f3e8ff', '#d8b4fe');
    if (isNight) lightPool(2.9, 13.0, 1.0, 70, 'rgba(168, 85, 247, 0.42)');

    // Coffee kitchenette counter
    box(13.2, 12.4, 0, 2.2, 0.85, 0.85, '#d6b28d', '#b08968', '#7f5539');
    box(13.5, 12.6, 0.85, 0.45, 0.4, 0.42, '#334155', '#1e293b', '#0f172a'); // Espresso machine

    // Healthy Treadmill corner (x = 4.0, y = 11.4)
    box(3.9, 11.1, 0, 1.4, 0.65, 0.14, '#334155', '#1e293b', '#0f172a');
    box(3.9, 11.1, 0.14, 0.16, 0.65, 0.95, '#ec4899', '#be185d', '#831843');

    // Potted indoor plants
    drawPlant(2.5, 6.2);
    drawPlant(11.4, 3.6);
    drawPlant(11.4, 12.6);

    // 7) Depth-sorted desks + 8 chibi characters
    const drawables = [
      { depth: 6.7 + 7.0, draw: () => drawDesk(6.7, 7.0, '#22c55e', lamps[0]) },
      { depth: 9.7 + 7.0, draw: () => drawDesk(9.7, 7.0, '#f59e0b', lamps[1]) },
      { depth: 6.7 + 10.0, draw: () => drawDesk(6.7, 10.0, '#f97316', lamps[2]) },
      { depth: 9.7 + 10.0, draw: () => drawDesk(9.7, 10.0, '#3b82f6', null) },
      { depth: 3.7 + 7.0, draw: () => drawDesk(3.7, 7.0, '#a855f7', null) }
    ];
    agents.forEach(a => drawables.push({ depth: a.x + a.y + 0.4, draw: () => drawCharacter(a, now) }));
    drawables.sort((a, b) => a.depth - b.depth);
    drawables.forEach(d => d.draw());

    // 8) Night mode warm string lights across office
    if (isNight) {
      for (let i = 0; i < 6; i++) {
        const lx = 4 + i * 2;
        const lp = iso(lx, 6.4, 2.55);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 2.8 * cam.z, 0, Math.PI * 2);
        ctx.fill();
        lightPool(lx, 6.4, 2.5, 28, 'rgba(253, 224, 71, 0.22)');
      }
    }
  }

  // Update autonomous agents, vehicles, camera & HTML overlays
  let lastTs = 0;
  function frame(ts) {
    const now = ts / 1000;
    const dt = Math.min(0.08, now - lastTs || 0.016);
    lastTs = now;

    // Smooth camera interpolation
    cam.x += (cam.tx - cam.x) * 0.14;
    cam.y += (cam.ty - cam.y) * 0.14;
    cam.z += (cam.tz - cam.z) * 0.14;

    if (!paused) {
      // Scooters cruise along street
      vehicles.forEach(v => {
        v.x += v.speed * dt;
        if (v.x > 17.5) v.x = -1.8;
      });

      // Agents autonomous behavior
      const walkingCount = agents.filter(a => a.state === 'walk' || a.state === 'back').length;
      agents.forEach(a => {
        if (a.state === 'work') {
          if (now > a.timer) {
            if (walkingCount < 2 && Math.random() < 0.45 && !a.director) {
              const wp = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
              a.tx = wp.x + (Math.random() - 0.5) * 0.8;
              a.ty = wp.y + (Math.random() - 0.5) * 0.8;
              a.state = 'walk';
              a.bubbleText = wp.label;
              a.bubbleUntil = now + 4.5;
            } else {
              a.bubbleText = a.statusText || 'พร้อมทำงาน';
              a.bubbleUntil = now + 3.8;
              a.timer = now + 7 + Math.random() * 9;
            }
          }
        } else if (a.state === 'walk' || a.state === 'back') {
          const gx = a.state === 'walk' ? a.tx : a.home.x;
          const gy = a.state === 'walk' ? a.ty : a.home.y;
          const dx = gx - a.x, dy = gy - a.y;
          const dist = Math.hypot(dx, dy);
          const step = 1.65 * dt;
          if (dist <= step) {
            a.x = gx; a.y = gy;
            if (a.state === 'walk') {
              a.state = 'chat';
              a.timer = now + 3.8;
            } else {
              a.state = 'work';
              a.timer = now + 8 + Math.random() * 10;
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

    // Sync projected HTML nameplates & speech bubbles
    agents.forEach(a => {
      if (a.elName) {
        a.elName.style.transform = `translate(${a.screenX.toFixed(1)}px, ${(a.screenY + 24 * cam.z).toFixed(1)}px) translate(-50%, 0)`;
      }
      if (a.elBubble) {
        const show = now < a.bubbleUntil && a.bubbleText;
        a.elBubble.classList.toggle('on', !!show);
        if (show) {
          a.elBubble.textContent = a.bubbleText;
          a.elBubble.style.transform = `translate(${a.screenX.toFixed(1)}px, ${(a.screenY - 22 * cam.z).toFixed(1)}px) translate(-50%, -100%)`;
        }
      }
    });

    requestAnimationFrame(frame);
  }

  // Responsive HiDPI canvas sizing
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(440, Math.min(580, Math.round(W * 0.68)));
    baseScale = Math.min(1.0, Math.min(W / 1040, H / 560));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Mouse / Touch Drag to Pan + Scroll to Zoom + Click to Inspect Agent or Desk Lamp
  function getPointer(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function findAgentAt(px, py) {
    let best = null, bestD = 28 * cam.z;
    agents.forEach(a => {
      const d = Math.hypot(px - a.screenX, py - a.screenY);
      if (d < bestD) { bestD = d; best = a; }
    });
    return best;
  }

  function findLampAt(px, py) {
    for (const l of lamps) {
      const p = iso(l.x + 0.1, l.y + 0.1, 1.0);
      if (Math.hypot(px - p.x, py - p.y) < 18 * cam.z) return l;
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
      const dx = (p.x - dragStart.x) / cam.z;
      const dy = (p.y - dragStart.y) / cam.z;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      cam.tx = Math.max(-280, Math.min(280, dragStart.cx + dx));
      cam.ty = Math.max(-220, Math.min(220, dragStart.cy + dy));
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
        if (typeof window.openAgent === 'function') window.openAgent(hit.id);
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
          window.showMoToast(lhit.on ? '💡 เปิดโคมไฟโต๊ะทำงานแล้ว' : '🌑 ปิดโคมไฟโต๊ะ (เอเจนต์ตกใจเลย!)');
        }
      }
    }
  });

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? 1.12 : 0.89;
    setZoom(cam.tz * factor);
  }, { passive: false });

  function updateZoomLabel() {
    const zv = document.getElementById('moZoomVal');
    if (zv) zv.textContent = Math.round(cam.tz * 100) + '%';
  }

  function setZoom(z) {
    cam.tz = Math.max(0.75, Math.min(2.4, z));
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
    const cx = a.x - 8.5, cy = a.y - 7.5;
    cam.tx = -(cx - cy) * TW;
    cam.ty = -(cx + cy) * TH + 18;
    cam.tz = 1.75;
    a.bubbleText = a.statusText || 'พร้อมทำงาน';
    a.bubbleUntil = performance.now() / 1000 + 4.5;
    updateZoomLabel();
    document.querySelectorAll('.mo-dbtn[data-cam]').forEach(b => b.classList.remove('on'));
  }

  // Public API for app.js
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
