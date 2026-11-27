/**
 * office3d.js — Classic Zyra-World Style 2.5D Top-Down Pixel-Art Virtual Office for AboutMeProcess HQ
 * Features:
 * - Classic 2.5D top-down pixel-art floor plan (warm tiles, corkboards, posters, glass partitions, dark outlines)
 * - Full Build Mode (🛠️ แต่งออฟฟิศ): Drag & Drop 11 furniture + 4 partition types, Move, Rotate 90° (R), Recolor, Duplicate, Delete, Floor & Wall themes
 * - Zyra Left Vertical Icon Rail: Map, Team & Role Badges (OWNER / ADMIN / AGENT), Always-Open Office Chat, CEO Avatar Customizer
 * - Controllable CEO (Click-to-Walk / WASD / Arrows) + Proximity Chat Ring & Bar
 * - Exported window.getOfficeAvatar(id) for matching chibi pixel-art avatars in agent detail modals
 */
(function () {
  const canvas = document.getElementById('officeCanvas');
  const overlay = document.getElementById('moOverlay');
  if (!canvas || !overlay) return;
  const ctx = canvas.getContext('2d');

  const STORAGE_KEY = 'hq_office_zyra_v2';
  const CEO_AV_KEY = 'hq_ceo_avatar_v1';
  const TILE = 42; // 1 grid tile = 42px at 100% zoom
  const MAP_W = 24, MAP_H = 15; // 24x15 tiles classic office floor plan
  const CX = MAP_W / 2, CY = MAP_H / 2;
  const INK = '#263042';

  const cam = { x: 0, y: 0, z: 1.0, tx: 0, ty: 0, tz: 1.0 };
  const PRESETS = {
    overview: { x: 0, y: 0, z: 1.0 },
    ceo:      { x: -330, y: 120, z: 1.65 },
    desks:    { x: 10, y: -15, z: 1.55 },
    server:   { x: 330, y: 125, z: 1.65 },
    line:     { x: -330, y: -135, z: 1.65 }
  };

  let W = 960, H = 620, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let baseScale = 1.0;
  let isNight = false;
  let paused = false;
  let buildMode = false;
  let activeBTab = 'furn';
  let selectedId = null;
  let hoveredAgent = null;
  let draggingCam = false;
  let draggingItem = null;
  let dragStart = { x: 0, y: 0, cx: 0, cy: 0, ox: 0, oy: 0 };
  let dragMoved = false;
  let ghost = null;

  const CATALOG = {
    desk:       { label: '💻 โต๊ะทำงาน',       cat: 'furn', w: 2.2, d: 1.2, defColor: '#60a5fa' },
    ceo_desk:   { label: '👑 โต๊ะ CEO',        cat: 'furn', w: 2.8, d: 1.3, defColor: '#8c5230' },
    server:     { label: '🖥️ ตู้เซิร์ฟเวอร์',    cat: 'furn', w: 1.0, d: 1.0, defColor: '#334155' },
    meeting:    { label: '🤝 โต๊ะประชุม',       cat: 'furn', w: 2.8, d: 1.6, defColor: '#e4b97f' },
    sofa:       { label: '🛋️ โซฟา',            cat: 'furn', w: 2.0, d: 1.0, defColor: '#4f7cac' },
    bookshelf:  { label: '📚 ชั้นหนังสือ',       cat: 'furn', w: 1.6, d: 0.8, defColor: '#a67346' },
    vending:    { label: '🟣 ตู้กดน้ำ',          cat: 'furn', w: 1.0, d: 0.9, defColor: '#7c3aed' },
    coffee:     { label: '☕ บาร์กาแฟ',         cat: 'furn', w: 2.4, d: 0.9, defColor: '#b07d52' },
    treadmill:  { label: '🏃 ลู่วิ่ง',            cat: 'furn', w: 1.6, d: 0.9, defColor: '#ec4899' },
    plant:      { label: '🌿 ต้นไม้',           cat: 'furn', w: 0.85, d: 0.85, defColor: '#22c55e' },
    lamp:       { label: '💡 โคมไฟ',            cat: 'furn', w: 0.7, d: 0.7, defColor: '#f59e0b' },
    wall_glass: { label: '🪟 ฉากกระจกกรอบดำ',   cat: 'wall', w: 3.4, d: 0.25, defColor: '#93c5fd' },
    wall_wood:  { label: '🪵 ฉากไม้ระแนง',      cat: 'wall', w: 3.4, d: 0.28, defColor: '#a67346' },
    wall_solid: { label: '🧱 ผนังทึบคลาสสิก',    cat: 'wall', w: 3.4, d: 0.32, defColor: '#b8c7dc' },
    wall_half:  { label: '📏 ฉากกั้นครึ่งตัว',   cat: 'wall', w: 2.6, d: 0.25, defColor: '#94a3b8' }
  };

  const FLOOR_STYLES = [
    { name: 'ครีมคลาสสิก (Zyra)', day: '#ece5d8', line: '#dcd3c2', night: '#1f2937' },
    { name: 'ไม้โอ๊คอบอุ่น',      day: '#e6c99e', line: '#d4b282', night: '#3f2e1f' },
    { name: 'กระเบื้องฟ้าอ่อน',   day: '#d4e2f4', line: '#bfd2eb', night: '#1e2c42' },
    { name: 'กระเบื้องมิ้นต์',     day: '#d4f0df', line: '#bde2cc', night: '#173026' },
    { name: 'หินอ่อนขาว',         day: '#f1f5f9', line: '#dde4ed', night: '#1b2434' },
    { name: 'พรมกรมท่า',          day: '#cbd5e1', line: '#b6c2d1', night: '#111827' }
  ];

  const WALL_COLORS = [
    { name: 'ฟ้าอมเทา (Zyra)', hex: '#b8c7dc' },
    { name: 'ขาวครีม',         hex: '#e8e2d5' },
    { name: 'เขียวมิ้นต์',      hex: '#bfe6cf' },
    { name: 'ไม้วอร์ม',        hex: '#d9b88c' },
    { name: 'เทาโมเดิร์น',     hex: '#cbd5e1' },
    { name: 'ชมพูพาสเทล',      hex: '#f3d1dc' }
  ];

  const ITEM_SWATCHES = ['#60a5fa', '#22c55e', '#f59e0b', '#ec4899', '#a855f7', '#e4b97f', '#8c5230', '#4f7cac', '#334155'];

  let uidCounter = 1;
  function mkItem(type, x, y, rot, color) {
    const def = CATALOG[type] || CATALOG.desk;
    return { id: 'it_' + (uidCounter++), type, x, y, rot: rot ? 1 : 0, color: color || def.defColor, on: true };
  }

  function defaultLayout() {
    uidCounter = 1;
    return {
      floorIdx: 0,
      wallColor: '#b8c7dc',
      items: [
        // === 1. SERVER & SOLAR ROOM (Top-Left: x 1..7.5, y 1.5..6.8) ===
        mkItem('server', 1.6, 2.0, 0, '#334155'),
        mkItem('server', 2.8, 2.0, 0, '#334155'),
        mkItem('server', 4.0, 2.0, 0, '#334155'),
        mkItem('server', 5.2, 2.0, 0, '#334155'),
        mkItem('desk', 1.8, 4.6, 0, '#eab308'),   // Solar
        mkItem('desk', 4.6, 4.6, 0, '#a855f7'),   // App Script
        mkItem('wall_solid', 7.3, 1.5, 1, '#b8c7dc'),
        mkItem('wall_glass', 1.2, 6.7, 0, '#93c5fd'),
        mkItem('wall_glass', 4.7, 6.7, 0, '#93c5fd'),

        // === 2. CEO EXECUTIVE OFFICE (Top-Right: x 16.5..22.8, y 1.5..7.0) ===
        mkItem('bookshelf', 17.6, 1.8, 0, '#8c5230'),
        mkItem('bookshelf', 20.4, 1.8, 0, '#8c5230'),
        mkItem('ceo_desk', 18.4, 3.6, 0, '#8c5230'),
        mkItem('sofa', 18.8, 5.6, 0, '#4f7cac'),
        mkItem('lamp', 17.2, 3.6, 0, '#f59e0b'),
        mkItem('plant', 21.8, 2.0, 0, '#22c55e'),
        mkItem('plant', 21.8, 5.6, 0, '#22c55e'),
        mkItem('wall_wood', 16.4, 1.5, 1, '#a67346'),
        mkItem('wall_glass', 16.5, 7.0, 0, '#93c5fd'),
        mkItem('wall_glass', 20.0, 7.0, 0, '#93c5fd'),

        // === 3. LINE OA HUB ROOM (Bottom-Right: x 16.5..22.8, y 8.2..13.6) ===
        mkItem('desk', 18.6, 9.6, 0, '#22c55e'),
        mkItem('sofa', 18.8, 12.1, 0, '#059669'),
        mkItem('plant', 17.2, 12.2, 0, '#22c55e'),
        mkItem('plant', 21.8, 9.2, 0, '#22c55e'),
        mkItem('wall_glass', 16.4, 8.6, 1, '#93c5fd'),

        // === 4. MAIN OPEN WORK HALL (Center: x 8..16, y 2..13.5) ===
        mkItem('desk', 8.6, 3.2, 0, '#22c55e'),   // Driver
        mkItem('desk', 12.4, 3.2, 0, '#f59e0b'),  // Finance
        mkItem('desk', 8.6, 6.4, 0, '#f97316'),   // Take Profit
        mkItem('desk', 12.4, 6.4, 0, '#3b82f6'),  // Captain
        mkItem('meeting', 10.2, 10.6, 0, '#e4b97f'), // Classic Meeting Table
        mkItem('plant', 8.0, 12.5, 0, '#22c55e'),
        mkItem('plant', 15.0, 12.5, 0, '#22c55e'),

        // === 5. WELLNESS & CAFE CORNER (Bottom-Left: x 1.2..7.2, y 8.2..13.6) ===
        mkItem('treadmill', 2.0, 9.0, 0, '#ec4899'), // Healthy
        mkItem('coffee', 2.0, 12.2, 0, '#b07d52'),
        mkItem('vending', 5.4, 12.1, 0, '#7c3aed'),
        mkItem('plant', 1.4, 12.3, 0, '#22c55e'),
        mkItem('lamp', 5.8, 8.8, 0, '#f59e0b')
      ]
    };
  }

  function loadLayout() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.items)) {
          p.items.forEach(it => {
            const n = parseInt(String(it.id || '').replace('it_', ''), 10);
            if (!isNaN(n) && n >= uidCounter) uidCounter = n + 1;
          });
          return p;
        }
      }
    } catch (e) {}
    return defaultLayout();
  }

  let layout = loadLayout();
  function saveLayout() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch (e) {} }

  function itemDims(it) {
    const def = CATALOG[it.type] || { w: 1, d: 1 };
    return it.rot ? { w: def.d, d: def.w } : { w: def.w, d: def.d };
  }

  // Per-character Custom Avatars (Zyra Avatar Studio — saved for all 9 characters!)
  const AVATARS_KEY = 'hq_avatars_zyra_v1';
  let savedAvatars = {};
  try { savedAvatars = JSON.parse(localStorage.getItem(AVATARS_KEY) || '{}') || {}; } catch (e) {}
  function saveAvatars() { try { localStorage.setItem(AVATARS_KEY, JSON.stringify(savedAvatars)); } catch (e) {} }

  // 9 Characters: CEO (OWNER) + LINE/Script (ADMIN) + 6 Agents (AGENT)
  const AGENT_DEFAULTS = [
    { id: 'ceo',     name: '👑 CEO',       roleTag: 'OWNER', home: { x: 19.8, y: 4.9 },  color: '#f59e0b', skin: '#fde0c2', hairStyle: 'short', hair: '#231710', shirt: '#334155', pants: '#1e293b', acc: 'crown',  stay: true },
    { id: 'tg',      name: 'LINE OA',      roleTag: 'ADMIN', home: { x: 19.7, y: 10.9 }, color: '#06c755', skin: '#fde0c2', hairStyle: 'bangs', hair: '#1f2937', shirt: '#10b981', pants: '#1e293b', acc: 'headphones', stay: true },
    { id: 'solar',   name: 'Solar',        roleTag: 'AGENT', home: { x: 2.9,  y: 5.9 },  color: '#eab308', skin: '#f5cba7', hairStyle: 'short', hair: '#eab308', shirt: '#2563eb', pants: '#334155', acc: 'helmet' },
    { id: 'script',  name: 'App Script',   roleTag: 'ADMIN', home: { x: 5.7,  y: 5.9 },  color: '#a855f7', skin: '#fde0c2', hairStyle: 'robot', hair: '#a855f7', shirt: '#7c3aed', pants: '#1e293b', acc: 'none' },
    { id: 'driver',  name: 'Driver',       roleTag: 'AGENT', home: { x: 9.7,  y: 4.5 },  color: '#22c55e', skin: '#f5cba7', hairStyle: 'short', hair: '#2c1c12', shirt: '#16a34a', pants: '#1e293b', acc: 'hat' },
    { id: 'finance', name: 'Finance',      roleTag: 'AGENT', home: { x: 13.5, y: 4.5 },  color: '#f59e0b', skin: '#fde0c2', hairStyle: 'short', hair: '#1e1b18', shirt: '#d97706', pants: '#334155', acc: 'glasses' },
    { id: 'profit',  name: 'Take Profit',  roleTag: 'AGENT', home: { x: 9.7,  y: 7.7 },  color: '#f97316', skin: '#fde0c2', hairStyle: 'spiky', hair: '#4a2c16', shirt: '#ea580c', pants: '#1e293b', acc: 'none' },
    { id: 'captain', name: 'Captain',      roleTag: 'AGENT', home: { x: 13.5, y: 7.7 },  color: '#3b82f6', skin: '#fde0c2', hairStyle: 'short', hair: '#111827', shirt: '#2563eb', pants: '#1e293b', acc: 'none' },
    { id: 'health',  name: 'Healthy',      roleTag: 'AGENT', home: { x: 3.1,  y: 10.1 }, color: '#ec4899', skin: '#fde0c2', hairStyle: 'long',  hair: '#4a2518', shirt: '#db2777', pants: '#334155', acc: 'headphones', sporty: true }
  ];
  const AGENT_DEF = AGENT_DEFAULTS.map(def => Object.assign({}, def, savedAvatars[def.id] || {}));

  const WAYPOINTS = [
    { x: 11.6, y: 10.2, label: 'ประชุมวางแผนทีม 🗣️' },
    { x: 3.6, y: 11.5, label: 'แวะชงกาแฟ ☕' },
    { x: 4.2, y: 3.6, label: 'ตรวจห้องเซิร์ฟเวอร์ 🖥️' },
    { x: 17.8, y: 6.2, label: 'รายงานผลห้อง CEO 👑' },
    { x: 17.6, y: 10.8, label: 'ซิงก์ข้อความห้อง LINE 💬' }
  ];

  const agents = AGENT_DEF.map((def, i) => ({
    ...def, x: def.home.x, y: def.home.y, tx: def.home.x, ty: def.home.y,
    state: 'work', timer: 3 + i * 1.5 + Math.random() * 5,
    bubbleText: '', bubbleUntil: 0,
    statusText: def.id === 'ceo' ? 'บริหาร AboutMeProcess HQ' : 'พร้อมทำงาน',
    screenX: 0, screenY: 0, elName: null, elBubble: null
  }));

  function initOverlays() {
    overlay.textContent = '';
    agents.forEach(a => {
      const np = document.createElement('button');
      np.type = 'button';
      np.className = 'mo3-np';
      np.style.setProperty('--c', a.color);
      np.innerHTML = '<i></i><span>' + a.name + '</span><span class="zyra-np-role">' + (a.roleTag || 'AGENT') + '</span>';
      np.onclick = ev => {
        ev.stopPropagation();
        if (buildMode) return;
        focusAgent(a.id);
        if (a.id === 'ceo') {
          if (typeof window.showMoToast === 'function') window.showMoToast('👑 ห้องผู้บริหาร CEO — คลิกพื้นหรือกด WASD เพื่อเดินคุยกับเอเจนต์');
        } else if (typeof window.openAgent === 'function') {
          window.openAgent(a.id);
        }
      };
      overlay.appendChild(np);
      a.elName = np;

      const bb = document.createElement('div');
      bb.className = 'mo3-bb zyra-pixel-bb';
      bb.style.setProperty('--c', a.color);
      overlay.appendChild(bb);
      a.elBubble = bb;
    });
  }
  initOverlays();

  // Orthogonal 2.5D Top-Down Projection (Classic Zyra World)
  function toScreen(gx, gy) {
    const s = cam.z * baseScale;
    return {
      x: W / 2 + ((gx - CX) * TILE + cam.x) * s,
      y: H / 2 + ((gy - CY) * TILE + cam.y) * s
    };
  }
  function screenToGrid(px, py) {
    const s = cam.z * baseScale;
    return {
      x: ((px - W / 2) / s - cam.x) / TILE + CX,
      y: ((py - H / 2) / s - cam.y) / TILE + CY
    };
  }
  function snap(v) { return Math.round(v * 2) / 2; }
  function clampToRoom(x, y, w, d) {
    return {
      x: Math.max(1.1, Math.min(MAP_W - 1.1 - w, snap(x))),
      y: Math.max(1.5, Math.min(MAP_H - 1.0 - d, snap(y)))
    };
  }

  function shade(hex, pct) {
    if (!hex || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + pct));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + pct));
    const b = Math.max(0, Math.min(255, (n & 255) + pct));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function pxRect(x, y, w, h, fill, stroke, lw) {
    const p = toScreen(x, y);
    const s = cam.z * baseScale * TILE;
    ctx.fillStyle = fill;
    ctx.fillRect(p.x, p.y, w * s, h * s);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw || Math.max(1.2, 1.6 * cam.z * baseScale);
      ctx.strokeRect(p.x, p.y, w * s, h * s);
    }
    return { px: p.x, py: p.y, pw: w * s, ph: h * s, u: s };
  }

  function drawChair(gx, gy, color) {
    const p = toScreen(gx, gy), u = cam.z * baseScale * TILE;
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 0.12 * u, 0.28 * u, 0.16 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, 1.5 * cam.z * baseScale);
    ctx.beginPath(); ctx.roundRect(p.x - 0.24 * u, p.y - 0.24 * u, 0.48 * u, 0.42 * u, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(color, -24);
    ctx.fillRect(p.x - 0.22 * u, p.y - 0.26 * u, 0.44 * u, 0.12 * u);
    ctx.strokeRect(p.x - 0.22 * u, p.y - 0.26 * u, 0.44 * u, 0.12 * u);
  }

  function drawWallDecor(gx, gy, kind) {
    const p = toScreen(gx, gy), u = cam.z * baseScale * TILE;
    const lw = Math.max(1.1, 1.4 * cam.z * baseScale);
    if (kind === 'corkboard') {
      // Classic Zyra corkboard with sticky notes
      ctx.fillStyle = '#b07d52'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
      ctx.fillRect(p.x, p.y, 1.5 * u, 0.65 * u); ctx.strokeRect(p.x, p.y, 1.5 * u, 0.65 * u);
      ctx.fillStyle = '#d8b082';
      ctx.fillRect(p.x + 0.08 * u, p.y + 0.08 * u, 1.34 * u, 0.49 * u);
      [['#fef08a', 0.16, 0.14], ['#93c5fd', 0.56, 0.18], ['#fca5a5', 0.96, 0.13], ['#bbf7d0', 0.36, 0.34]].forEach(([c, ox, oy]) => {
        ctx.fillStyle = c; ctx.fillRect(p.x + ox * u, p.y + oy * u, 0.24 * u, 0.19 * u);
      });
    } else if (kind === 'poster') {
      ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
      ctx.fillRect(p.x, p.y, 0.72 * u, 0.64 * u); ctx.strokeRect(p.x, p.y, 0.72 * u, 0.64 * u);
      ctx.fillStyle = '#60a5fa'; ctx.fillRect(p.x + 0.09 * u, p.y + 0.09 * u, 0.54 * u, 0.32 * u);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(p.x + 0.09 * u, p.y + 0.41 * u, 0.54 * u, 0.14 * u);
    } else if (kind === 'clock') {
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(p.x + 0.3 * u, p.y + 0.32 * u, 0.26 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x + 0.3 * u, p.y + 0.32 * u); ctx.lineTo(p.x + 0.3 * u, p.y + 0.16 * u);
      ctx.moveTo(p.x + 0.3 * u, p.y + 0.32 * u); ctx.lineTo(p.x + 0.43 * u, p.y + 0.36 * u); ctx.stroke();
    }
  }

  function drawItem(it, now) {
    const dm = itemDims(it);
    const x = it.x, y = it.y, w = dm.w, d = dm.d, c = it.color || '#60a5fa';
    const p = toScreen(x, y), u = cam.z * baseScale * TILE;
    const lw = Math.max(1.2, 1.6 * cam.z * baseScale);

    // Build mode selection highlight
    if (buildMode && selectedId === it.id) {
      ctx.save();
      ctx.fillStyle = 'rgba(249,115,22,0.22)';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 3]);
      ctx.fillRect(p.x - 3, p.y - 3, w * u + 6, d * u + 6);
      ctx.strokeRect(p.x - 3, p.y - 3, w * u + 6, d * u + 6);
      ctx.restore();
    }

    // Soft pixel shadow under furniture
    if (!it.type.startsWith('wall_')) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
      ctx.fillRect(p.x + 0.08 * u, p.y + 0.12 * u, w * u, d * u);
    }

    if (it.type === 'desk') {
      // Chairs behind/front
      drawChair(x + w * 0.5, y + d + 0.16, c);
      // Warm classic oak desk top + front lip
      pxRect(x, y, w, d * 0.82, isNight ? '#7c5c3e' : '#e4b97f', INK, lw);
      pxRect(x, y + d * 0.82, w, d * 0.22, isNight ? '#5c4128' : '#c9975b', INK, lw);
      // Dual monitors + keyboard + coffee mug
      ctx.fillStyle = '#1e293b'; ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.85;
      const mw = Math.min(0.62, w * 0.28);
      ctx.fillRect(p.x + 0.22 * u, p.y + 0.12 * u, mw * u, 0.34 * u);
      ctx.fillStyle = c; ctx.fillRect(p.x + 0.26 * u, p.y + 0.16 * u, (mw - 0.08) * u, 0.24 * u);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x + (w - mw - 0.22) * u, p.y + 0.12 * u, mw * u, 0.34 * u);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(p.x + (w - mw - 0.18) * u, p.y + 0.16 * u, (mw - 0.08) * u, 0.24 * u);
      // Keyboard
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(p.x + (w * 0.32) * u, p.y + 0.54 * u, (w * 0.36) * u, 0.14 * u);
      // Tiny cup
      ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.arc(p.x + (w - 0.24) * u, p.y + 0.62 * u, 0.08 * u, 0, Math.PI * 2); ctx.fill();
    } else if (it.type === 'ceo_desk') {
      drawChair(x + w * 0.5, y + d + 0.2, '#f59e0b');
      pxRect(x, y, w, d * 0.8, isNight ? shade(c, -30) : c, INK, lw);
      pxRect(x, y + d * 0.8, w, d * 0.26, shade(c, -28), INK, lw);
      // Gold nameplate + dual wide displays
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x + 0.45 * u, p.y + 0.14 * u, 0.85 * u, 0.36 * u);
      ctx.fillRect(p.x + (w - 1.3) * u, p.y + 0.14 * u, 0.85 * u, 0.36 * u);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(p.x + 0.5 * u, p.y + 0.18 * u, 0.75 * u, 0.26 * u);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(p.x + (w - 1.25) * u, p.y + 0.18 * u, 0.75 * u, 0.26 * u);
      ctx.fillStyle = '#fde047'; ctx.fillRect(p.x + (w * 0.4) * u, p.y + 0.62 * u, (w * 0.2) * u, 0.12 * u);
    } else if (it.type === 'server') {
      pxRect(x, y, w, d * 0.72, isNight ? '#1e293b' : c, INK, lw);
      pxRect(x, y + d * 0.72, w, d * 0.34, '#0f172a', INK, lw);
      const blink = Math.floor(now * 3 + x * 5) % 2 === 0;
      ctx.fillStyle = blink ? '#22c55e' : '#38bdf8';
      ctx.fillRect(p.x + 0.16 * u, p.y + 0.82 * u, 0.12 * u, 0.1 * u);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(p.x + 0.36 * u, p.y + 0.82 * u, 0.12 * u, 0.1 * u);
      ctx.fillStyle = '#475569';
      ctx.fillRect(p.x + 0.16 * u, p.y + 0.2 * u, (w - 0.32) * u, 0.12 * u);
      ctx.fillRect(p.x + 0.16 * u, p.y + 0.4 * u, (w - 0.32) * u, 0.12 * u);
    } else if (it.type === 'meeting') {
      // Multi-colored classic Zyra chairs around meeting table
      const cols = ['#60a5fa', '#4ade80', '#c084fc', '#f472b6', '#fbbf24', '#38bdf8'];
      drawChair(x + w * 0.22, y - 0.22, cols[0]);
      drawChair(x + w * 0.5,  y - 0.22, cols[1]);
      drawChair(x + w * 0.78, y - 0.22, cols[2]);
      drawChair(x + w * 0.22, y + d + 0.22, cols[3]);
      drawChair(x + w * 0.5,  y + d + 0.22, cols[4]);
      drawChair(x + w * 0.78, y + d + 0.22, cols[5]);
      pxRect(x, y, w, d * 0.86, isNight ? '#7c5c3e' : c, INK, lw);
      pxRect(x, y + d * 0.86, w, d * 0.18, shade(c, -28), INK, lw);
      // Center notepad & plant
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(p.x + 0.45 * u, p.y + 0.35 * u, 0.42 * u, 0.32 * u);
      ctx.fillStyle = '#93c5fd'; ctx.fillRect(p.x + (w - 0.9) * u, p.y + 0.7 * u, 0.46 * u, 0.3 * u);
      ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(p.x + w * 0.5 * u, p.y + d * 0.42 * u, 0.18 * u, 0, Math.PI * 2); ctx.fill();
    } else if (it.type === 'sofa') {
      pxRect(x, y, w, d * 0.35, shade(c, -22), INK, lw); // backrest
      pxRect(x, y + d * 0.35, w, d * 0.65, c, INK, lw);  // cushions
      ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.75;
      ctx.beginPath(); ctx.moveTo(p.x + w * 0.5 * u, p.y + d * 0.35 * u); ctx.lineTo(p.x + w * 0.5 * u, p.y + d * u); ctx.stroke();
    } else if (it.type === 'bookshelf') {
      pxRect(x, y, w, d, isNight ? shade(c, -25) : c, INK, lw);
      ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'].forEach((bc, bi) => {
        ctx.fillStyle = bc;
        ctx.fillRect(p.x + (0.14 + bi * (w - 0.28) / 5) * u, p.y + 0.18 * u, 0.18 * u, (d - 0.34) * u);
      });
    } else if (it.type === 'vending') {
      pxRect(x, y, w, d, c, INK, lw);
      ctx.fillStyle = '#e0f2fe'; ctx.fillRect(p.x + 0.14 * u, p.y + 0.14 * u, (w - 0.28) * u, (d * 0.45) * u);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(p.x + 0.2 * u, p.y + (d * 0.72) * u, (w - 0.4) * u, 0.16 * u);
    } else if (it.type === 'coffee') {
      pxRect(x, y, w, d, isNight ? shade(c, -25) : c, INK, lw);
      ctx.fillStyle = '#334155'; ctx.fillRect(p.x + 0.22 * u, p.y + 0.16 * u, 0.52 * u, 0.48 * u);
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(p.x + (w - 0.4) * u, p.y + 0.45 * u, 0.16 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x + (w - 0.85) * u, p.y + 0.45 * u, 0.12 * u, 0, Math.PI * 2); ctx.fill();
    } else if (it.type === 'treadmill') {
      pxRect(x, y, w, d, '#334155', INK, lw);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(p.x + 0.14 * u, p.y + 0.16 * u, (w - 0.52) * u, (d - 0.32) * u);
      ctx.fillStyle = c; ctx.fillRect(p.x + (w - 0.32) * u, p.y + 0.1 * u, 0.24 * u, (d - 0.2) * u);
    } else if (it.type === 'plant') {
      // Classic terracotta pot + pixel leafy bush
      const cx = p.x + w * 0.5 * u, cy = p.y + d * 0.52 * u;
      ctx.fillStyle = '#b45309'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
      ctx.fillRect(cx - 0.22 * u, cy + 0.04 * u, 0.44 * u, 0.32 * u); ctx.strokeRect(cx - 0.22 * u, cy + 0.04 * u, 0.44 * u, 0.32 * u);
      ctx.fillStyle = isNight ? '#15803d' : c;
      ctx.beginPath(); ctx.arc(cx, cy - 0.06 * u, 0.34 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = isNight ? '#16a34a' : '#86efac';
      ctx.beginPath(); ctx.arc(cx - 0.1 * u, cy - 0.14 * u, 0.14 * u, 0, Math.PI * 2); ctx.fill();
    } else if (it.type === 'lamp') {
      const cx = p.x + w * 0.5 * u, cy = p.y + d * 0.5 * u;
      if (it.on !== false) {
        const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, (isNight ? 2.4 : 1.1) * u);
        grd.addColorStop(0, 'rgba(254, 240, 138, 0.48)');
        grd.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(cx, cy, (isNight ? 2.4 : 1.1) * u, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = it.on !== false ? '#fde047' : '#64748b'; ctx.strokeStyle = INK; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(cx, cy, 0.24 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (it.type === 'wall_glass') {
      pxRect(x, y, w, d, 'rgba(147, 197, 253, 0.42)', INK, lw);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x + 0.15 * u, p.y + 0.06 * u); ctx.lineTo(p.x + (w - 0.15) * u, p.y + (d - 0.06) * u); ctx.stroke();
    } else if (it.type === 'wall_wood') {
      pxRect(x, y, w, d, isNight ? shade(c, -28) : c, INK, lw);
    } else if (it.type === 'wall_solid' || it.type === 'wall_half') {
      pxRect(x, y, w, d, isNight ? shade(c, -45) : c, INK, lw);
    }
  }

  // Classic Zyra-style Chibi Pixel-Art Character Renderer (shared by canvas & modal avatars!)
  function renderChibi(g, cx, cy, scale, a, walkPhase) {
    const u = scale;
    const lw = Math.max(1.2, 1.55 * (u / 42));
    const legOff = walkPhase ? Math.sin(walkPhase) * 0.09 * u : 0;

    // Ground shadow
    g.fillStyle = 'rgba(15, 23, 42, 0.24)';
    g.beginPath(); g.ellipse(cx, cy + 0.34 * u, 0.32 * u, 0.13 * u, 0, 0, Math.PI * 2); g.fill();

    // Cute tiny legs (customizable pants color)
    g.fillStyle = a.pants || '#334155'; g.strokeStyle = INK; g.lineWidth = lw;
    g.fillRect(cx - 0.17 * u, cy + 0.16 * u + legOff, 0.13 * u, 0.18 * u);
    g.strokeRect(cx - 0.17 * u, cy + 0.16 * u + legOff, 0.13 * u, 0.18 * u);
    g.fillRect(cx + 0.04 * u, cy + 0.16 * u - legOff, 0.13 * u, 0.18 * u);
    g.strokeRect(cx + 0.04 * u, cy + 0.16 * u - legOff, 0.13 * u, 0.18 * u);

    // Chibi torso / shirt
    g.fillStyle = a.shirt || '#3b82f6';
    g.beginPath(); g.roundRect(cx - 0.25 * u, cy - 0.12 * u, 0.5 * u, 0.32 * u, 0.09 * u); g.fill(); g.stroke();
    // Little white collar V
    g.fillStyle = '#f8fafc';
    g.beginPath(); g.moveTo(cx - 0.08 * u, cy - 0.11 * u); g.lineTo(cx, cy - 0.01 * u); g.lineTo(cx + 0.08 * u, cy - 0.11 * u); g.closePath(); g.fill();

    // Head
    const hy = cy - 0.36 * u;
    const hStyle = a.hairStyle || (a.robot ? 'robot' : 'short');
    const acc = a.acc || (a.crown ? 'crown' : a.helmet ? 'helmet' : a.hat ? 'hat' : a.glasses ? 'glasses' : 'none');

    if (hStyle === 'robot') {
      g.fillStyle = a.hair || '#7c3aed'; g.strokeStyle = INK; g.lineWidth = lw;
      g.beginPath(); g.roundRect(cx - 0.28 * u, hy - 0.24 * u, 0.56 * u, 0.48 * u, 0.1 * u); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx, hy - 0.24 * u); g.lineTo(cx, hy - 0.38 * u); g.stroke();
      g.fillStyle = '#38bdf8'; g.beginPath(); g.arc(cx, hy - 0.4 * u, 0.08 * u, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#1e1b4b'; g.fillRect(cx - 0.2 * u, hy - 0.1 * u, 0.4 * u, 0.2 * u);
      g.fillStyle = '#38bdf8';
      g.fillRect(cx - 0.13 * u, hy - 0.04 * u, 0.09 * u, 0.09 * u);
      g.fillRect(cx + 0.04 * u, hy - 0.04 * u, 0.09 * u, 0.09 * u);
    } else {
      // Back hair for 'long' style
      if (hStyle === 'long') {
        g.fillStyle = a.hair || '#231710'; g.strokeStyle = INK; g.lineWidth = lw;
        g.beginPath(); g.roundRect(cx - 0.31 * u, hy - 0.18 * u, 0.62 * u, 0.56 * u, 0.14 * u); g.fill(); g.stroke();
      }
      // Face
      g.fillStyle = a.skin || '#fde0c2'; g.strokeStyle = INK; g.lineWidth = lw;
      g.beginPath(); g.arc(cx, hy, 0.28 * u, 0, Math.PI * 2); g.fill(); g.stroke();

      // Hair / Hat / Helmet cap
      const capColor = acc === 'helmet' ? '#facc15' : acc === 'hat' ? (a.shirt || '#22c55e') : (a.hair || '#231710');
      g.fillStyle = capColor;
      if (hStyle === 'spiky' && acc !== 'helmet' && acc !== 'hat') {
        g.beginPath();
        g.arc(cx, hy - 0.04 * u, 0.29 * u, Math.PI * 0.95, Math.PI * 2.05);
        g.lineTo(cx + 0.22 * u, hy - 0.36 * u); g.lineTo(cx + 0.09 * u, hy - 0.28 * u);
        g.lineTo(cx, hy - 0.42 * u); g.lineTo(cx - 0.09 * u, hy - 0.28 * u);
        g.lineTo(cx - 0.22 * u, hy - 0.36 * u); g.closePath(); g.fill(); g.stroke();
      } else {
        g.beginPath(); g.arc(cx, hy - 0.04 * u, 0.29 * u, Math.PI * 0.92, Math.PI * 2.08); g.closePath(); g.fill(); g.stroke();
        if (hStyle === 'bangs' && acc !== 'helmet' && acc !== 'hat') {
          g.fillRect(cx - 0.22 * u, hy - 0.16 * u, 0.44 * u, 0.11 * u);
        }
      }
      if (acc === 'hat') {
        g.fillStyle = shade(capColor, -24);
        g.fillRect(cx - 0.24 * u, hy - 0.14 * u, 0.48 * u, 0.08 * u);
        g.strokeRect(cx - 0.24 * u, hy - 0.14 * u, 0.48 * u, 0.08 * u);
      }

      // Expressive pixel eyes + white sparkle + rosy cheeks
      g.fillStyle = '#111827';
      g.fillRect(cx - 0.12 * u, hy - 0.01 * u, 0.065 * u, 0.09 * u);
      g.fillRect(cx + 0.055 * u, hy - 0.01 * u, 0.065 * u, 0.09 * u);
      g.fillStyle = '#ffffff';
      g.fillRect(cx - 0.11 * u, hy, 0.025 * u, 0.03 * u);
      g.fillRect(cx + 0.065 * u, hy, 0.025 * u, 0.03 * u);
      g.fillStyle = 'rgba(244, 114, 182, 0.45)';
      g.fillRect(cx - 0.19 * u, hy + 0.07 * u, 0.07 * u, 0.04 * u);
      g.fillRect(cx + 0.12 * u, hy + 0.07 * u, 0.07 * u, 0.04 * u);

      // Accessories
      if (acc === 'crown') {
        g.fillStyle = '#facc15'; g.strokeStyle = INK; g.lineWidth = lw * 0.9;
        g.beginPath();
        g.moveTo(cx - 0.18 * u, hy - 0.26 * u); g.lineTo(cx - 0.12 * u, hy - 0.44 * u);
        g.lineTo(cx, hy - 0.32 * u); g.lineTo(cx + 0.12 * u, hy - 0.44 * u);
        g.lineTo(cx + 0.18 * u, hy - 0.26 * u); g.closePath(); g.fill(); g.stroke();
      } else if (acc === 'helmet') {
        g.fillStyle = 'rgba(56, 189, 248, 0.78)';
        g.fillRect(cx - 0.19 * u, hy - 0.06 * u, 0.38 * u, 0.11 * u);
        g.strokeRect(cx - 0.19 * u, hy - 0.06 * u, 0.38 * u, 0.11 * u);
      } else if (acc === 'glasses') {
        g.strokeStyle = INK; g.lineWidth = lw * 0.9;
        g.strokeRect(cx - 0.17 * u, hy - 0.04 * u, 0.14 * u, 0.12 * u);
        g.strokeRect(cx + 0.03 * u, hy - 0.04 * u, 0.14 * u, 0.12 * u);
        g.beginPath(); g.moveTo(cx - 0.03 * u, hy + 0.01 * u); g.lineTo(cx + 0.03 * u, hy + 0.01 * u); g.stroke();
      } else if (acc === 'headphones') {
        g.strokeStyle = '#38bdf8'; g.lineWidth = lw * 1.4;
        g.beginPath(); g.arc(cx, hy - 0.02 * u, 0.32 * u, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        g.fillStyle = '#1e293b'; g.strokeStyle = INK; g.lineWidth = lw * 0.9;
        g.fillRect(cx - 0.35 * u, hy - 0.06 * u, 0.09 * u, 0.18 * u); g.strokeRect(cx - 0.35 * u, hy - 0.06 * u, 0.09 * u, 0.18 * u);
        g.fillRect(cx + 0.26 * u, hy - 0.06 * u, 0.09 * u, 0.18 * u); g.strokeRect(cx + 0.26 * u, hy - 0.06 * u, 0.09 * u, 0.18 * u);
      }
    }
  }

  function drawCharacter(a, now) {
    const p = toScreen(a.x, a.y);
    const u = cam.z * baseScale * TILE;
    const walking = a.state === 'walk' || a.state === 'back';
    const bob = walking ? Math.abs(Math.sin(now * 10)) * 0.08 * u : Math.sin(now * 2.6 + a.x) * 0.02 * u;
    a.screenX = p.x;
    a.screenY = p.y - 0.36 * u - bob;

    if (!buildMode && hoveredAgent === a.id) {
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 0.34 * u, 0.44 * u, 0.2 * u, 0, 0, Math.PI * 2); ctx.stroke();
    }
    renderChibi(ctx, p.x, p.y - bob, u, a, walking ? now * 12 : 0);
  }

  function roomLabel(x, y, text, color) {
    const p = toScreen(x, y), s = cam.z * baseScale;
    ctx.save();
    ctx.font = '700 ' + Math.max(10, Math.round(11 * s)) + 'px var(--f), sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, p.x, p.y);
    ctx.restore();
  }

  function drawScene(now) {
    const s = cam.z * baseScale, u = s * TILE;
    ctx.fillStyle = isNight ? '#0f172a' : '#cfd8e3';
    ctx.fillRect(0, 0, W, H);

    // 1) Main Floor Slab (Classic Zyra Tile Floor)
    const fl = FLOOR_STYLES[layout.floorIdx || 0] || FLOOR_STYLES[0];
    pxRect(1.0, 1.4, MAP_W - 2.0, MAP_H - 2.0, isNight ? fl.night : fl.day, INK, 2.2);

    // Zone Floor Tints (Server cool-blue, CEO warm wood, LINE fresh mint)
    pxRect(1.1, 1.5, 6.2, 5.2, isNight ? 'rgba(30, 58, 138, 0.35)' : '#d4e2f4');
    pxRect(16.5, 1.5, 6.4, 5.5, isNight ? 'rgba(120, 53, 15, 0.38)' : '#e6c99e');
    pxRect(16.5, 8.2, 6.4, 5.1, isNight ? 'rgba(6, 78, 59, 0.38)' : '#d4f0df');

    // Classic Subtle Grid Tile Lines
    ctx.strokeStyle = buildMode ? 'rgba(249,115,22,0.28)' : (isNight ? 'rgba(255,255,255,0.06)' : fl.line);
    ctx.lineWidth = 1;
    for (let gx = 1; gx <= MAP_W - 1; gx++) {
      const a = toScreen(gx, 1.4), b = toScreen(gx, MAP_H - 0.6);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let gy = 2; gy <= MAP_H - 1; gy++) {
      const a = toScreen(1.0, gy), b = toScreen(MAP_W - 1.0, gy);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // 2) Classic 2.5D Top Wall Band (with front wall face + corkboards + posters + clock)
    const wc = layout.wallColor || '#b8c7dc';
    pxRect(0.8, 0.4, MAP_W - 1.6, 0.4, isNight ? '#334155' : '#8b9bb4', INK, 2); // wall top cap
    pxRect(1.0, 0.8, MAP_W - 2.0, 0.72, isNight ? shade(wc, -55) : wc, INK, 1.8); // front wall face
    // Side & bottom outer borders
    pxRect(0.8, 0.4, 0.25, MAP_H - 0.8, isNight ? '#334155' : '#8b9bb4', INK, 1.6);
    pxRect(MAP_W - 1.05, 0.4, 0.25, MAP_H - 0.8, isNight ? '#334155' : '#8b9bb4', INK, 1.6);
    pxRect(0.8, MAP_H - 0.65, MAP_W - 1.6, 0.28, isNight ? '#334155' : '#8b9bb4', INK, 1.6);

    // Wall Decorations (just like Zyra World!)
    drawWallDecor(8.4, 0.84, 'corkboard');
    drawWallDecor(10.6, 0.84, 'poster');
    drawWallDecor(12.2, 0.84, 'corkboard');
    drawWallDecor(14.6, 0.84, 'clock');
    drawWallDecor(18.6, 0.84, 'corkboard');
    drawWallDecor(20.6, 0.84, 'poster');

    // Solar Battery Monitor on Server Room Wall
    const sp = toScreen(6.0, 0.86);
    ctx.fillStyle = '#0f172a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.fillRect(sp.x, sp.y, 1.05 * u, 0.6 * u); ctx.strokeRect(sp.x, sp.y, 1.05 * u, 0.6 * u);
    const batt = (window.LASTD && window.LASTD.solar && window.LASTD.solar.battery) || 19;
    ctx.fillStyle = '#4ade80'; ctx.font = '700 ' + Math.max(9, Math.round(10 * s)) + 'px var(--f), sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('☀️ ' + batt + '%', sp.x + 0.52 * u, sp.y + 0.39 * u);

    // Room Labels
    roomLabel(4.2, 6.45, '🖥️ SERVER & SOLAR', isNight ? '#93c5fd' : '#1d4ed8');
    roomLabel(19.7, 6.75, '👑 CEO OFFICE', isNight ? '#fde047' : '#78350f');
    roomLabel(19.7, 13.05, '💬 LINE OA HUB', isNight ? '#4ade80' : '#15803d');
    roomLabel(11.6, 13.15, '🤝 TEAM & MEETING HALL', isNight ? '#cbd5e1' : '#475569');

    // 3) CEO Destination Marker & Zyra Proximity Connection Ring
    if (!buildMode && ceoTarget) {
      const tp = toScreen(ceoTarget.x, ceoTarget.y);
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tp.x, tp.y, 0.28 * u, 0, Math.PI * 2); ctx.stroke();
    }
    if (!buildMode && proxAgent) {
      const ceo = agents[0];
      const p1 = toScreen(ceo.x, ceo.y), p2 = toScreen(proxAgent.x, proxAgent.y);
      ctx.save();
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.14)';
      ctx.beginPath(); ctx.arc(p2.x, p2.y, 0.65 * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // 4) Depth-sorted Furniture + Characters (by Y coordinate for clean 2.5D overlap)
    const drawables = [];
    layout.items.forEach(it => {
      const dm = itemDims(it);
      drawables.push({ depth: it.y + dm.d, draw: () => drawItem(it, now) });
    });
    agents.forEach(a => drawables.push({ depth: a.y + 0.35, draw: () => drawCharacter(a, now) }));
    drawables.sort((a, b) => a.depth - b.depth);
    drawables.forEach(d => d.draw());

    // 5) Build Mode Ghost Preview
    if (buildMode && ghost && CATALOG[ghost.type]) {
      const def = CATALOG[ghost.type], gp = toScreen(ghost.x, ghost.y);
      ctx.save();
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5;
      ctx.fillRect(gp.x, gp.y, def.w * u, def.d * u);
      ctx.strokeRect(gp.x, gp.y, def.w * u, def.d * u);
      ctx.restore();
    }
  }

  // ---- Movement, Proximity Chat, and Animation Loop ----
  let lastTs = 0;
  let ceoTarget = null;
  let proxAgent = null;
  let lastProxId = null;
  const officeChatMsgs = [
    { who: 'LINE OA', color: '#06c755', text: 'ยินดีต้อนรับสู่ออฟฟิศ AboutMeProcess สไตล์คลาสสิก — คลิกพื้นหรือกด WASD เพื่อเดินคุยกับเอเจนต์ได้เลย!' }
  ];

  function addOfficeChat(who, color, text) {
    officeChatMsgs.push({ who, color, text });
    if (officeChatMsgs.length > 30) officeChatMsgs.shift();
    if (activeZTab === 'chat') renderZyraDrawer();
    else {
      const b = document.getElementById('zyraChatBadge');
      if (b) b.hidden = false;
    }
  }

  function walkCeoTo(gx, gy) {
    const pos = clampToRoom(gx, gy, 0.6, 0.6);
    ceoTarget = { x: pos.x, y: pos.y };
  }

  function updateProximity(now) {
    const ceo = agents[0];
    if (!ceo || buildMode) { proxAgent = null; return; }
    let nearest = null, minD = 2.35;
    for (let i = 1; i < agents.length; i++) {
      const d = Math.hypot(ceo.x - agents[i].x, ceo.y - agents[i].y);
      if (d < minD) { minD = d; nearest = agents[i]; }
    }
    proxAgent = nearest;
    const bar = document.getElementById('zyraProxBar');
    if (nearest && nearest.id !== lastProxId) {
      lastProxId = nearest.id;
      const msg = nearest.statusText || 'พร้อมรับคำสั่งครับ CEO!';
      nearest.bubbleText = msg;
      nearest.bubbleUntil = now + 4.5;
      addOfficeChat(nearest.name, nearest.color, 'เดินเข้ามาคุย: ' + msg);
    } else if (!nearest) {
      lastProxId = null;
    }
    if (bar) {
      if (nearest && !buildMode) {
        bar.hidden = false;
        bar.innerHTML = '<span>🟢 ใกล้ <b>' + nearest.name + '</b> · ' + (nearest.statusText || 'พร้อมทำงาน') + '</span>' +
          '<button type="button" id="zyraProxTalk">💬 คุย/สั่งงาน</button>';
        const btn = document.getElementById('zyraProxTalk');
        if (btn) btn.onclick = () => { if (typeof window.openAgent === 'function') window.openAgent(nearest.id); };
      } else {
        bar.hidden = true;
      }
    }
  }

  function frame(ts) {
    const now = ts / 1000, dt = Math.min(0.08, now - lastTs || 0.016);
    lastTs = now;
    cam.x += (cam.tx - cam.x) * 0.14; cam.y += (cam.ty - cam.y) * 0.14; cam.z += (cam.tz - cam.z) * 0.14;

    if (!paused && !buildMode) {
      const ceo = agents[0];
      if (ceo && ceoTarget) {
        const dx = ceoTarget.x - ceo.x, dy = ceoTarget.y - ceo.y, d = Math.hypot(dx, dy), st = 3.2 * dt;
        if (d <= st) { ceo.x = ceoTarget.x; ceo.y = ceoTarget.y; ceo.state = 'work'; ceoTarget = null; }
        else { ceo.x += (dx / d) * st; ceo.y += (dy / d) * st; ceo.state = 'walk'; }
      }
      const walkingCount = agents.filter(a => a.id !== 'ceo' && (a.state === 'walk' || a.state === 'back')).length;
      agents.forEach(a => {
        if (a.id === 'ceo') return;
        if (a.state === 'work') {
          if (now > a.timer) {
            if (walkingCount < 2 && Math.random() < 0.42 && !a.stay) {
              const wp = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
              a.tx = wp.x + (Math.random() - 0.5) * 0.8; a.ty = wp.y + (Math.random() - 0.5) * 0.8;
              a.state = 'walk'; a.bubbleText = wp.label; a.bubbleUntil = now + 4.5;
            } else {
              a.bubbleText = a.statusText || 'พร้อมทำงาน'; a.bubbleUntil = now + 3.6; a.timer = now + 8 + Math.random() * 10;
            }
          }
        } else if (a.state === 'walk' || a.state === 'back') {
          const gx = a.state === 'walk' ? a.tx : a.home.x, gy = a.state === 'walk' ? a.ty : a.home.y;
          const dx = gx - a.x, dy = gy - a.y, dist = Math.hypot(dx, dy), step = 1.9 * dt;
          if (dist <= step) {
            a.x = gx; a.y = gy;
            if (a.state === 'walk') { a.state = 'chat'; a.timer = now + 3.8; }
            else { a.state = 'work'; a.timer = now + 9 + Math.random() * 11; }
          } else { a.x += (dx / dist) * step; a.y += (dy / dist) * step; }
        } else if (a.state === 'chat' && now > a.timer) { a.state = 'back'; }
      });
      updateProximity(now);
    }

    drawScene(now);

    const s = cam.z * baseScale;
    agents.forEach(a => {
      if (a.elName) {
        a.elName.style.opacity = buildMode ? '0.35' : '1';
        a.elName.style.pointerEvents = buildMode ? 'none' : 'auto';
        a.elName.style.transform = `translate(${a.screenX.toFixed(1)}px, ${(a.screenY + 32 * s).toFixed(1)}px) translate(-50%, 0)`;
      }
      if (a.elBubble) {
        const show = !buildMode && now < a.bubbleUntil && a.bubbleText;
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
    H = Math.max(500, Math.min(680, Math.round(W * 0.65)));
    baseScale = Math.min(1.08, Math.min(W / (MAP_W * TILE + 24), H / (MAP_H * TILE + 24)));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function getPointer(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function findItemAtGrid(gx, gy) {
    for (let i = layout.items.length - 1; i >= 0; i--) {
      const it = layout.items[i], dm = itemDims(it);
      if (gx >= it.x - 0.2 && gx <= it.x + dm.w + 0.2 && gy >= it.y - 0.2 && gy <= it.y + dm.d + 0.2) return it;
    }
    return null;
  }
  function findAgentAt(px, py) {
    const s = cam.z * baseScale;
    let best = null, bestD = 26 * s;
    agents.forEach(a => { const d = Math.hypot(px - a.screenX, py - a.screenY); if (d < bestD) { bestD = d; best = a; } });
    return best;
  }

  canvas.addEventListener('pointerdown', ev => {
    const p = getPointer(ev);
    dragMoved = false;
    if (buildMode) {
      const g = screenToGrid(p.x, p.y);
      const hit = findItemAtGrid(g.x, g.y);
      if (hit) {
        selectItem(hit.id);
        draggingItem = hit;
        dragStart = { x: g.x, y: g.y, ox: hit.x, oy: hit.y };
        canvas.setPointerCapture(ev.pointerId);
        return;
      } else selectItem(null);
    }
    draggingCam = true;
    dragStart = { x: p.x, y: p.y, cx: cam.tx, cy: cam.ty };
    canvas.setPointerCapture(ev.pointerId);
  });

  canvas.addEventListener('pointermove', ev => {
    const p = getPointer(ev);
    if (draggingItem && buildMode) {
      const g = screenToGrid(p.x, p.y), dm = itemDims(draggingItem);
      const pos = clampToRoom(dragStart.ox + (g.x - dragStart.x), dragStart.oy + (g.y - dragStart.y), dm.w, dm.d);
      draggingItem.x = pos.x; draggingItem.y = pos.y;
      dragMoved = true;
      return;
    }
    if (draggingCam) {
      const s = cam.z * baseScale;
      const dx = (p.x - dragStart.x) / s, dy = (p.y - dragStart.y) / s;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      cam.tx = Math.max(-440, Math.min(440, dragStart.cx + dx));
      cam.ty = Math.max(-280, Math.min(280, dragStart.cy + dy));
      return;
    }
    if (buildMode) {
      const g = screenToGrid(p.x, p.y);
      canvas.style.cursor = findItemAtGrid(g.x, g.y) ? 'move' : 'grab';
    } else {
      const hit = findAgentAt(p.x, p.y);
      hoveredAgent = hit ? hit.id : null;
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
  });

  canvas.addEventListener('pointerup', ev => {
    if (draggingItem) { if (dragMoved) saveLayout(); draggingItem = null; return; }
    if (!draggingCam) return;
    draggingCam = false;
    if (!dragMoved && !buildMode) {
      const p = getPointer(ev);
      const hit = findAgentAt(p.x, p.y);
      if (hit) {
        focusAgent(hit.id);
        if (hit.id === 'ceo') {
          if (typeof window.showMoToast === 'function') window.showMoToast('👑 ห้องผู้บริหาร CEO — คลิกพื้นหรือกด WASD เพื่อเดินคุยกับเอเจนต์');
        } else if (typeof window.openAgent === 'function') window.openAgent(hit.id);
        return;
      }
      const g = screenToGrid(p.x, p.y);
      const lhit = findItemAtGrid(g.x, g.y);
      if (lhit && lhit.type === 'lamp') {
        lhit.on = lhit.on === false ? true : false;
        saveLayout();
        if (typeof window.showMoToast === 'function') window.showMoToast(lhit.on ? '💡 เปิดโคมไฟแล้ว' : '🌑 ปิดโคมไฟแล้ว');
      } else if (g.x >= 1.1 && g.x <= MAP_W - 1.1 && g.y >= 1.5 && g.y <= MAP_H - 1.0) {
        walkCeoTo(g.x, g.y);
      }
    }
  });

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    setZoom(cam.tz * (ev.deltaY < 0 ? 1.12 : 0.89));
  }, { passive: false });

  // HTML5 Drag & Drop from Build Palette
  canvas.addEventListener('dragover', ev => {
    if (!buildMode) return;
    ev.preventDefault();
    const type = ev.dataTransfer.getData('text/plain') || window._dragType;
    if (!type || !CATALOG[type]) return;
    const p = getPointer(ev), g = screenToGrid(p.x, p.y), def = CATALOG[type];
    const pos = clampToRoom(g.x - def.w / 2, g.y - def.d / 2, def.w, def.d);
    ghost = { type, x: pos.x, y: pos.y };
  });
  canvas.addEventListener('dragleave', () => { ghost = null; });
  canvas.addEventListener('drop', ev => {
    if (!buildMode) return;
    ev.preventDefault();
    const type = ev.dataTransfer.getData('text/plain') || window._dragType;
    ghost = null;
    if (!type || !CATALOG[type]) return;
    const p = getPointer(ev), g = screenToGrid(p.x, p.y), def = CATALOG[type];
    const pos = clampToRoom(g.x - def.w / 2, g.y - def.d / 2, def.w, def.d);
    const created = mkItem(type, pos.x, pos.y, 0);
    layout.items.push(created);
    selectItem(created.id);
    saveLayout();
    if (typeof window.showMoToast === 'function') window.showMoToast('✨ วาง ' + def.label + ' เรียบร้อย');
  });

  // ---- Build Mode Toolbar UI ----
  const buildBtn = document.getElementById('moBuildBtn');
  const buildBar = document.getElementById('moBuildBar');
  const bTabs = document.getElementById('moBTabs');
  const bPalette = document.getElementById('moBPalette');
  const bSel = document.getElementById('moBSel');
  const bSelName = document.getElementById('moBSelName');
  const bSwatches = document.getElementById('moBSwatches');

  function selectItem(id) {
    selectedId = id;
    const it = layout.items.find(x => x.id === id);
    if (!bSel) return;
    if (!it || !buildMode) { bSel.hidden = true; return; }
    bSel.hidden = false;
    if (bSelName) bSelName.textContent = (CATALOG[it.type] ? CATALOG[it.type].label : it.type) + (it.rot ? ' (หมุน 90°)' : '');
    if (bSwatches) {
      bSwatches.textContent = '';
      ITEM_SWATCHES.forEach(hex => {
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'mo-sw' + (it.color === hex ? ' on' : '');
        sw.style.background = hex;
        sw.onclick = () => { it.color = hex; saveLayout(); selectItem(it.id); };
        bSwatches.appendChild(sw);
      });
    }
  }

  function renderPalette() {
    if (!bPalette) return;
    bPalette.textContent = '';
    if (activeBTab === 'floor') {
      FLOOR_STYLES.forEach((f, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mo-b-item' + (layout.floorIdx === idx ? ' on' : '');
        b.innerHTML = '<i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:' + f.day + ';border:1px solid #263042;margin-right:5px;vertical-align:-2px"></i>' + f.name;
        b.onclick = () => { layout.floorIdx = idx; saveLayout(); renderPalette(); };
        bPalette.appendChild(b);
      });
      WALL_COLORS.forEach(wc => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mo-b-item' + (layout.wallColor === wc.hex ? ' on' : '');
        b.innerHTML = '<i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + wc.hex + ';border:1px solid #263042;margin-right:5px;vertical-align:-2px"></i>ผนัง: ' + wc.name;
        b.onclick = () => { layout.wallColor = wc.hex; saveLayout(); renderPalette(); };
        bPalette.appendChild(b);
      });
      return;
    }
    Object.keys(CATALOG).forEach(type => {
      const def = CATALOG[type];
      if (def.cat !== activeBTab) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mo-b-item';
      b.draggable = true;
      b.textContent = def.label;
      b.title = 'ลากไปวางบนแผนที่ หรือคลิกเพื่อเพิ่ม';
      b.addEventListener('dragstart', ev => { window._dragType = type; ev.dataTransfer.setData('text/plain', type); });
      b.addEventListener('dragend', () => { ghost = null; window._dragType = null; });
      b.onclick = () => {
        const pos = clampToRoom(CX - def.w / 2 + (Math.random() - 0.5) * 2, CY - def.d / 2 + (Math.random() - 0.5) * 2, def.w, def.d);
        const created = mkItem(type, pos.x, pos.y, 0);
        layout.items.push(created);
        selectItem(created.id);
        saveLayout();
      };
      bPalette.appendChild(b);
    });
  }

  if (buildBtn && buildBar) {
    buildBtn.onclick = () => {
      buildMode = !buildMode;
      buildBtn.classList.toggle('on', buildMode);
      buildBtn.setAttribute('aria-pressed', String(buildMode));
      buildBar.hidden = !buildMode;
      if (!buildMode) selectItem(null);
      else renderPalette();
      if (typeof window.showMoToast === 'function') {
        window.showMoToast(buildMode ? '🛠️ โหมดแต่งออฟฟิศ — ลากวาง ย้าย หมุน เปลี่ยนสีพื้น/ผนังได้ทันที' : '✅ บันทึกผังออฟฟิศแล้ว');
      }
    };
  }
  if (bTabs) {
    bTabs.querySelectorAll('[data-btab]').forEach(btn => {
      btn.onclick = () => {
        activeBTab = btn.dataset.btab;
        bTabs.querySelectorAll('[data-btab]').forEach(x => x.classList.toggle('on', x === btn));
        renderPalette();
      };
    });
  }
  const rotBtn = document.getElementById('moRotBtn');
  if (rotBtn) rotBtn.onclick = () => {
    const it = layout.items.find(x => x.id === selectedId);
    if (!it) return;
    it.rot = it.rot ? 0 : 1;
    const dm = itemDims(it);
    const pos = clampToRoom(it.x, it.y, dm.w, dm.d);
    it.x = pos.x; it.y = pos.y;
    saveLayout(); selectItem(it.id);
  };
  const dupBtn = document.getElementById('moDupBtn');
  if (dupBtn) dupBtn.onclick = () => {
    const it = layout.items.find(x => x.id === selectedId);
    if (!it) return;
    const dm = itemDims(it);
    const pos = clampToRoom(it.x + 1, it.y + 1, dm.w, dm.d);
    const copy = mkItem(it.type, pos.x, pos.y, it.rot, it.color);
    layout.items.push(copy);
    selectItem(copy.id); saveLayout();
  };
  const delBtn = document.getElementById('moDelBtn');
  if (delBtn) delBtn.onclick = () => {
    layout.items = layout.items.filter(x => x.id !== selectedId);
    selectItem(null); saveLayout();
  };
  const resetBtn = document.getElementById('moResetLayout');
  if (resetBtn) resetBtn.onclick = () => {
    if (!confirm('รีเซ็ตผังออฟฟิศกลับเป็นค่าเริ่มต้น?')) return;
    layout = defaultLayout();
    selectItem(null); saveLayout(); renderPalette();
    if (typeof window.showMoToast === 'function') window.showMoToast('↩️ รีเซ็ตผังออฟฟิศเรียบร้อยแล้ว');
  };

  document.addEventListener('keydown', ev => {
    if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) return;
    if (buildMode && selectedId) {
      if (ev.key === 'r' || ev.key === 'R') { ev.preventDefault(); if (rotBtn) rotBtn.click(); }
      if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); if (delBtn) delBtn.click(); }
      return;
    }
    if (!buildMode && !paused) {
      const ceo = agents[0];
      if (!ceo) return;
      const step = 0.85;
      if (ev.key === 'w' || ev.key === 'W' || ev.key === 'ArrowUp') { ev.preventDefault(); walkCeoTo(ceo.x, ceo.y - step); }
      else if (ev.key === 's' || ev.key === 'S' || ev.key === 'ArrowDown') { ev.preventDefault(); walkCeoTo(ceo.x, ceo.y + step); }
      else if (ev.key === 'a' || ev.key === 'A' || ev.key === 'ArrowLeft') { ev.preventDefault(); walkCeoTo(ceo.x - step, ceo.y); }
      else if (ev.key === 'd' || ev.key === 'D' || ev.key === 'ArrowRight') { ev.preventDefault(); walkCeoTo(ceo.x + step, ceo.y); }
    }
  });

  // ---- Zyra-style Left Vertical Icon Rail & Floating Drawer ----
  let activeZTab = 'map';
  const zRail = document.getElementById('zyraRail');
  const zDrawer = document.getElementById('zyraDrawer');
  const zTitle = document.getElementById('zyraDrawerTitle');
  const zBody = document.getElementById('zyraDrawerBody');
  const zClose = document.getElementById('zyraDrawerClose');

  function setZTab(tab) {
    activeZTab = tab;
    if (zRail) zRail.querySelectorAll('.zyra-rbtn').forEach(b => b.classList.toggle('on', b.dataset.ztab === tab));
    if (!zDrawer) return;
    if (tab === 'map') { zDrawer.hidden = true; return; }
    zDrawer.hidden = false;
    if (tab === 'chat') {
      const b = document.getElementById('zyraChatBadge');
      if (b) b.hidden = true;
    }
    renderZyraDrawer();
  }

  function renderZyraDrawer() {
    if (!zBody || !zTitle) return;
    zBody.textContent = '';
    if (activeZTab === 'team') {
      zTitle.textContent = '👥 ทีม & บทบาทในออฟฟิศ';
      agents.forEach(a => {
        const card = document.createElement('div');
        card.className = 'zyra-tcard';
        const roleCls = (a.roleTag || 'AGENT').toLowerCase();
        card.innerHTML =
          '<div class="zyra-tcard-h" style="--c:' + a.color + '">' +
            '<i class="zyra-dot"></i><strong>' + a.name + '</strong>' +
            '<span class="zyra-role ' + roleCls + '">' + (a.roleTag || 'AGENT') + '</span>' +
          '</div><small>' + (a.statusText || 'พร้อมทำงาน') + '</small>';
        const acts = document.createElement('div');
        acts.className = 'zyra-tacts';
        if (a.id !== 'ceo') {
          const walkBtn = document.createElement('button');
          walkBtn.type = 'button';
          walkBtn.textContent = '🚶 เดินไปหา';
          walkBtn.onclick = () => { walkCeoTo(a.x - 1.1, a.y + 0.4); focusAgent(a.id); setZTab('map'); };
          acts.appendChild(walkBtn);
        }
        const infoBtn = document.createElement('button');
        infoBtn.type = 'button';
        infoBtn.textContent = a.id === 'ceo' ? '🎭 แต่งอวาตาร์' : '📋 สั่งงาน';
        infoBtn.onclick = () => {
          if (a.id === 'ceo') setZTab('avatar');
          else if (typeof window.openAgent === 'function') window.openAgent(a.id);
        };
        acts.appendChild(infoBtn);
        card.appendChild(acts);
        zBody.appendChild(card);
      });
    } else if (activeZTab === 'chat') {
      zTitle.textContent = '💬 แชทในออฟฟิศ (Always-Open)';
      const log = document.createElement('div');
      log.className = 'zyra-chat-log';
      officeChatMsgs.forEach(m => {
        const item = document.createElement('div');
        item.className = 'zyra-msg';
        item.style.setProperty('--c', m.color || '#22c55e');
        const b = document.createElement('b'); b.textContent = m.who;
        const t = document.createElement('span'); t.textContent = m.text;
        item.appendChild(b); item.appendChild(t);
        log.appendChild(item);
      });
      zBody.appendChild(log);
      const form = document.createElement('form');
      form.className = 'zyra-chat-form';
      const inp = document.createElement('input');
      inp.type = 'text'; inp.placeholder = 'พิมพ์คำสั่ง (เช่น /brief, /ledger, /solar)...';
      const btn = document.createElement('button'); btn.type = 'submit'; btn.textContent = 'ส่ง';
      form.onsubmit = async ev => {
        ev.preventDefault();
        const v = inp.value.trim();
        if (!v) return;
        addOfficeChat('👑 CEO', '#f59e0b', v);
        inp.value = '';
        if (typeof window.sendCmd === 'function') {
          const dummy = document.createElement('div');
          await window.sendCmd(v, { out: dummy });
          const reply = (dummy.textContent || '').trim();
          if (reply) addOfficeChat('LINE OA', '#06c755', reply.slice(0, 220));
        }
      };
      form.appendChild(inp); form.appendChild(btn);
      zBody.appendChild(form);
      zBody.scrollTop = zBody.scrollHeight;
    } else if (activeZTab === 'avatar') {
      zTitle.textContent = '🎭 ปรับแต่งอวาตาร์ (Zyra Studio)';
      if (!window._avEditId) window._avEditId = 'ceo';
      const target = agents.find(x => x.id === window._avEditId) || agents[0];

      // 1) Character selector
      const selBox = document.createElement('div'); selBox.className = 'zyra-tcard';
      const selRow = document.createElement('div'); selRow.className = 'zyra-av-row';
      agents.forEach(ag => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'zyra-av-opt' + (ag.id === target.id ? ' on' : '');
        b.textContent = ag.name;
        b.onclick = () => { window._avEditId = ag.id; renderZyraDrawer(); };
        selRow.appendChild(b);
      });
      selBox.appendChild(selRow);
      zBody.appendChild(selBox);

      // 2) Live Chibi Preview + Randomize / Reset
      delete avatarCache[target.id];
      const prevCard = document.createElement('div'); prevCard.className = 'zyra-av-prev';
      const prevImg = document.createElement('img');
      prevImg.src = renderAgentAvatar(target.id);
      prevImg.alt = target.name;
      const prevBtns = document.createElement('div'); prevBtns.className = 'zyra-av-pbtns';
      const lblName = document.createElement('strong'); lblName.textContent = target.name;
      const rndBtn = document.createElement('button'); rndBtn.type = 'button'; rndBtn.className = 'zyra-av-opt'; rndBtn.textContent = '🎲 สุ่มลุค';
      const rstBtn = document.createElement('button'); rstBtn.type = 'button'; rstBtn.className = 'zyra-av-opt'; rstBtn.textContent = '↩️ ค่าเริ่มต้น';
      const applyProp = patch => {
        Object.assign(target, patch);
        savedAvatars[target.id] = {
          skin: target.skin, hairStyle: target.hairStyle, hair: target.hair,
          shirt: target.shirt, pants: target.pants, acc: target.acc
        };
        saveAvatars();
        delete avatarCache[target.id];
        renderZyraDrawer();
      };
      const SKINS = ['#fde0c2', '#f5cba7', '#e5b288', '#c68642', '#8d5524'];
      const HAIRS = ['#231710', '#5c3a21', '#a67346', '#eab308', '#991b1b', '#94a3b8'];
      const SHIRTS = ['#334155', '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777', '#dc2626', '#f8fafc'];
      const PANTS = ['#1e293b', '#0f172a', '#78350f', '#1d4ed8'];
      const HSTYLES = [['short', 'สั้น'], ['bangs', 'ผมม้า'], ['spiky', 'ผมตั้ง'], ['long', 'ผมยาว'], ['robot', '🤖 หุ่นยนต์']];
      const ACCS = [['crown', '👑 มงกุฎ'], ['glasses', '🕶️ แว่น'], ['hat', '🧢 หมวก'], ['helmet', '🪖 นิรภัย'], ['headphones', '🎧 หูฟัง'], ['none', '✨ ไม่มี']];
      const pick = arr => arr[Math.floor(Math.random() * arr.length)];
      rndBtn.onclick = () => applyProp({
        skin: pick(SKINS), hairStyle: pick(HSTYLES)[0], hair: pick(HAIRS),
        shirt: pick(SHIRTS), pants: pick(PANTS), acc: pick(ACCS)[0]
      });
      rstBtn.onclick = () => {
        const def = AGENT_DEFAULTS.find(x => x.id === target.id);
        if (!def) return;
        delete savedAvatars[target.id];
        saveAvatars();
        Object.assign(target, { skin: def.skin, hairStyle: def.hairStyle, hair: def.hair, shirt: def.shirt, pants: def.pants, acc: def.acc });
        delete avatarCache[target.id];
        renderZyraDrawer();
      };
      prevBtns.appendChild(lblName); prevBtns.appendChild(rndBtn); prevBtns.appendChild(rstBtn);
      prevCard.appendChild(prevImg); prevCard.appendChild(prevBtns);
      zBody.appendChild(prevCard);

      const mkSwatches = (lbl, cols, curVal, key) => {
        const box = document.createElement('div'); box.className = 'zyra-tcard';
        const h = document.createElement('small'); h.textContent = lbl; box.appendChild(h);
        const row = document.createElement('div'); row.className = 'mo-swatches';
        cols.forEach(hex => {
          const sw = document.createElement('button');
          sw.type = 'button';
          sw.className = 'mo-sw' + (curVal === hex ? ' on' : '');
          sw.style.background = hex;
          sw.onclick = () => applyProp({ [key]: hex });
          row.appendChild(sw);
        });
        box.appendChild(row); zBody.appendChild(box);
      };
      const mkChips = (lbl, items, curVal, key) => {
        const box = document.createElement('div'); box.className = 'zyra-tcard';
        const h = document.createElement('small'); h.textContent = lbl; box.appendChild(h);
        const row = document.createElement('div'); row.className = 'zyra-av-row';
        items.forEach(([val, text]) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'zyra-av-opt' + (curVal === val ? ' on' : '');
          b.textContent = text;
          b.onclick = () => applyProp({ [key]: val });
          row.appendChild(b);
        });
        box.appendChild(row); zBody.appendChild(box);
      };

      mkChips('ทรงผม', HSTYLES, target.hairStyle || 'short', 'hairStyle');
      mkChips('เครื่องประดับ', ACCS, target.acc || 'none', 'acc');
      mkSwatches('สีผิว', SKINS, target.skin || '#fde0c2', 'skin');
      mkSwatches('สีผม / สีหัวหุ่นยนต์', HAIRS, target.hair || '#231710', 'hair');
      mkSwatches('สีเสื้อ / สูท', SHIRTS, target.shirt || '#334155', 'shirt');
      mkSwatches('สีกางเกง', PANTS, target.pants || '#1e293b', 'pants');
    }
  }
  if (zRail) zRail.querySelectorAll('.zyra-rbtn').forEach(b => { b.onclick = () => setZTab(b.dataset.ztab === activeZTab && b.dataset.ztab !== 'map' ? 'map' : b.dataset.ztab); });
  if (zClose) zClose.onclick = () => setZTab('map');

  function updateZoomLabel() {
    const zv = document.getElementById('moZoomVal');
    if (zv) zv.textContent = Math.round(cam.tz * 100) + '%';
  }
  function setZoom(z) { cam.tz = Math.max(0.75, Math.min(2.4, z)); updateZoomLabel(); }
  function setPreset(name) {
    const p = PRESETS[name] || PRESETS.overview;
    cam.tx = p.x; cam.ty = p.y; cam.tz = p.z;
    updateZoomLabel();
    document.querySelectorAll('.mo-dbtn[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === name));
  }
  function focusAgent(id) {
    const a = agents.find(x => x.id === id);
    if (!a) return;
    cam.tx = -(a.x - CX) * TILE;
    cam.ty = -(a.y - CY) * TILE;
    cam.tz = 1.65;
    a.bubbleText = a.statusText || 'พร้อมทำงาน';
    a.bubbleUntil = performance.now() / 1000 + 4.5;
    updateZoomLabel();
    document.querySelectorAll('.mo-dbtn[data-cam]').forEach(b => b.classList.remove('on'));
  }

  // Export crisp Zyra-style chibi avatar PNG for Agent Modals
  const avatarCache = {};
  function renderAgentAvatar(id) {
    if (avatarCache[id]) return avatarCache[id];
    const a = agents.find(x => x.id === id) || AGENT_DEF.find(x => x.id === id);
    if (!a) return '';
    const dpr = 2, w = 160, h = 200;
    const c = document.createElement('canvas');
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    renderChibi(g, w / 2, 134, 132, a, 0);
    avatarCache[id] = c.toDataURL('image/png');
    return avatarCache[id];
  }

  window.getOfficeAvatar = renderAgentAvatar;
  window.OFFICE3D = {
    setPreset,
    zoomIn: () => setZoom(cam.tz * 1.2),
    zoomOut: () => setZoom(cam.tz * 0.83),
    setNight: n => { isNight = !!n; },
    setPaused: p => { paused = !!p; },
    focusAgent,
    getAvatar: renderAgentAvatar,
    syncStatus: map => { agents.forEach(a => { if (map && map[a.id]) a.statusText = map[a.id]; }); },
    resize
  };

  requestAnimationFrame(frame);
})();
