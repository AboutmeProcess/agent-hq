/**
 * office3d.js — The Sims-style Interactive 3D Isometric Cutaway Office Designer for AboutMeProcess HQ
 * Features:
 * - Full Build Mode (🛠️ แต่งออฟฟิศ): Drag & Drop furniture & 4 partition types onto the 3D isometric grid
 * - Move (drag), Rotate 90° (↻ / R key), Recolor (color swatches), Duplicate, Delete (Del), Reset
 * - Customizable Floor & Wall colors/materials, auto-saved to localStorage
 * - Separate Server & Solar Room, CEO Executive Office (with 👑 CEO), LINE OA Hub Room, Open Desk Bay
 */
(function () {
  const canvas = document.getElementById('officeCanvas');
  const overlay = document.getElementById('moOverlay');
  if (!canvas || !overlay) return;
  const ctx = canvas.getContext('2d');

  const STORAGE_KEY = 'hq_office_sims_v1';
  const TW = 32, TH = 16, ZH = 22, CX = 12.2, CY = 10.2;

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
  let buildMode = false;
  let activeBTab = 'furn';
  let selectedId = null;
  let hoveredAgent = null;
  let draggingCam = false;
  let draggingItem = null;
  let dragStart = { x: 0, y: 0, cx: 0, cy: 0, ox: 0, oy: 0 };
  let dragMoved = false;
  let ghost = null; // { type, x, y } while dragging from palette onto canvas

  // Furniture & Partition Catalog
  const CATALOG = {
    desk:       { label: '💻 โต๊ะทำงาน 2 จอ', cat: 'furn', w: 2.0, d: 1.1, h: 1.2, defColor: '#38bdf8' },
    ceo_desk:   { label: '👑 โต๊ะ CEO',      cat: 'furn', w: 2.8, d: 1.2, h: 1.3, defColor: '#78350f' },
    server:     { label: '🖥️ ตู้เซิร์ฟเวอร์',  cat: 'furn', w: 0.85, d: 0.85, h: 2.1, defColor: '#1e293b' },
    meeting:    { label: '🤝 โต๊ะประชุม',     cat: 'furn', w: 2.6, d: 1.35, h: 0.72, defColor: '#f8fafc' },
    sofa:       { label: '🛋️ โซฟา',          cat: 'furn', w: 1.8, d: 0.85, h: 0.65, defColor: '#334155' },
    bookshelf:  { label: '📚 ชั้นหนังสือ',     cat: 'furn', w: 0.75, d: 1.6, h: 2.0, defColor: '#78350f' },
    vending:    { label: '🟣 ตู้กดน้ำ',        cat: 'furn', w: 1.0, d: 0.85, h: 2.0, defColor: '#7e22ce' },
    coffee:     { label: '☕ บาร์กาแฟ',       cat: 'furn', w: 2.2, d: 0.85, h: 1.2, defColor: '#b08968' },
    treadmill:  { label: '🏃 ลู่วิ่ง',          cat: 'furn', w: 1.5, d: 0.75, h: 1.1, defColor: '#ec4899' },
    plant:      { label: '🌿 ต้นไม้',         cat: 'furn', w: 0.65, d: 0.65, h: 1.1, defColor: '#22c55e' },
    lamp:       { label: '💡 โคมไฟ',          cat: 'furn', w: 0.4, d: 0.4, h: 1.3, defColor: '#f97316' },
    wall_glass: { label: '🪟 ฉากกระจกกรอบดำ', cat: 'wall', w: 3.4, d: 0.18, h: 2.4, defColor: '#93c5fd' },
    wall_wood:  { label: '🪵 ฉากไม้ระแนง',    cat: 'wall', w: 3.4, d: 0.2, h: 2.4, defColor: '#92400e' },
    wall_solid: { label: '🧱 ฉากทึบสีขาว',    cat: 'wall', w: 3.4, d: 0.24, h: 2.4, defColor: '#e2e8f0' },
    wall_half:  { label: '📏 ฉากกั้นครึ่งตัว', cat: 'wall', w: 2.6, d: 0.2, h: 1.2, defColor: '#64748b' }
  };

  const FLOOR_STYLES = [
    { name: 'กระเบื้องขาว', day: '#f1f5f9', night: '#cbd5e1' },
    { name: 'ไม้โอ๊คอ่อน', day: '#e2c799', night: '#8f7249' },
    { name: 'ไม้วอลนัท', day: '#b88352', night: '#6b4222' },
    { name: 'เซิร์ฟเวอร์ฟ้า', day: '#dbeafe', night: '#1e293b' },
    { name: 'พรมเขียว LINE', day: '#dcfce7', night: '#133025' },
    { name: 'หินขัดเข้ม', day: '#475569', night: '#1e293b' }
  ];

  const WALL_COLORS = [
    { name: 'ขาว', c: '#ffffff' },
    { name: 'ครีม', c: '#fef3c7' },
    { name: 'เทา', c: '#cbd5e1' },
    { name: 'น้ำเงิน', c: '#334155' },
    { name: 'ไม้', c: '#c89563' },
    { name: 'มินต์', c: '#d1fae5' }
  ];

  const ITEM_SWATCHES = ['#38bdf8', '#22c55e', '#f97316', '#ffd166', '#ec4899', '#a855f7', '#78350f', '#f8fafc', '#1e293b'];

  let uidCounter = 1;
  function mkItem(type, x, y, rot, color) {
    const def = CATALOG[type];
    return { id: 'it_' + (uidCounter++), type, x, y, rot: rot ? 1 : 0, color: color || def.defColor, on: true };
  }

  function defaultLayout() {
    uidCounter = 1;
    return {
      floorIdx: 0,
      wallColor: '#ffffff',
      items: [
        // Server Room (Top-Left)
        mkItem('server', 2.4, 3.65, 0, '#1e293b'),
        mkItem('server', 3.4, 3.65, 0, '#1e293b'),
        mkItem('server', 4.4, 3.65, 0, '#1e293b'),
        mkItem('server', 5.4, 3.65, 0, '#1e293b'),
        mkItem('wall_glass', 7.6, 3.4, 1, '#93c5fd'),
        mkItem('wall_glass', 2.1, 9.0, 0, '#93c5fd'),
        // CEO Office (Top-Right)
        mkItem('ceo_desk', 18.0, 4.7, 0, '#78350f'),
        mkItem('bookshelf', 21.4, 3.7, 0, '#78350f'),
        mkItem('sofa', 17.0, 7.3, 0, '#334155'),
        mkItem('lamp', 20.4, 4.8, 0, '#ffd166'),
        mkItem('wall_glass', 16.4, 3.4, 1, '#93c5fd'),
        mkItem('wall_glass', 16.5, 9.0, 0, '#93c5fd'),
        mkItem('wall_glass', 19.3, 9.0, 0, '#93c5fd'),
        // LINE OA Room (Mid-Right)
        mkItem('desk', 18.4, 10.7, 0, '#06c755'),
        mkItem('lamp', 20.6, 10.8, 0, '#06c755'),
        mkItem('wall_glass', 16.4, 9.5, 1, '#4ade80'),
        mkItem('wall_glass', 16.5, 14.8, 0, '#4ade80'),
        mkItem('wall_glass', 19.3, 14.8, 0, '#4ade80'),
        // Main Open Desks (Center)
        mkItem('desk', 8.6, 6.2, 0, '#22c55e'),
        mkItem('desk', 12.6, 6.2, 0, '#f59e0b'),
        mkItem('desk', 8.6, 10.6, 0, '#f97316'),
        mkItem('desk', 12.6, 10.6, 0, '#3b82f6'),
        mkItem('lamp', 10.7, 6.3, 0, '#f97316'),
        // Lounge, Vending, Coffee, Meeting & Healthy
        mkItem('vending', 2.3, 10.6, 0, '#7e22ce'),
        mkItem('treadmill', 4.2, 13.9, 0, '#ec4899'),
        mkItem('coffee', 5.8, 16.1, 0, '#b08968'),
        mkItem('meeting', 10.6, 15.3, 0, '#f8fafc'),
        mkItem('plant', 8.0, 3.6, 0, '#22c55e'),
        mkItem('plant', 15.3, 3.6, 0, '#22c55e'),
        mkItem('plant', 2.3, 16.2, 0, '#22c55e'),
        mkItem('plant', 21.4, 16.0, 0, '#22c55e')
      ]
    };
  }

  let layout = defaultLayout();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Array.isArray(saved.items) && saved.items.length) {
      layout = saved;
      uidCounter = layout.items.length + 100;
    }
  } catch (e) {}

  function saveLayout() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch (e) {}
  }

  function itemDims(it) {
    const def = CATALOG[it.type] || { w: 1, d: 1, h: 1 };
    return it.rot ? { w: def.d, d: def.w, h: def.h } : { w: def.w, d: def.d, h: def.h };
  }

  // Animated delivery scooters on exterior street
  const vehicles = [
    { x: -1.5, y: 1.4, speed: 1.5, color: '#22c55e', accent: '#bbf7d0' },
    { x: 7.5, y: 1.4, speed: 1.25, color: '#38bdf8', accent: '#bae6fd' },
    { x: 16.5, y: 1.4, speed: 1.65, color: '#f97316', accent: '#fed7aa' }
  ];

  // 9 Characters: CEO + 8 Agents
  const AGENT_DEF = [
    { id: 'ceo', name: '👑 CEO', home: { x: 19.5, y: 6.1 }, color: '#ffd166', shirt: '#1e293b', hair: '#18181b', crown: true, stay: true },
    { id: 'tg', name: 'LINE OA', home: { x: 19.5, y: 12.1 }, color: '#06c755', shirt: '#059669', hair: '#1f2937', stay: true },
    { id: 'solar', name: 'Solar', home: { x: 4.0, y: 6.6 }, color: '#eab308', shirt: '#1e3a5f', hair: '#eab308', helmet: '#facc15' },
    { id: 'script', name: 'App Script', home: { x: 6.2, y: 7.4 }, color: '#a855f7', shirt: '#5b21b6', hair: '#a855f7', robot: true },
    { id: 'driver', name: 'Driver', home: { x: 9.5, y: 7.4 }, color: '#22c55e', shirt: '#15803d', hair: '#231710', hat: '#22c55e' },
    { id: 'finance', name: 'Finance', home: { x: 13.5, y: 7.4 }, color: '#f59e0b', shirt: '#b45309', hair: '#1e1b18', glasses: true },
    { id: 'profit', name: 'Take Profit', home: { x: 9.5, y: 11.8 }, color: '#f97316', shirt: '#c2410c', hair: '#3b2412' },
    { id: 'captain', name: 'Captain', home: { x: 13.5, y: 11.8 }, color: '#3b82f6', shirt: '#1d4ed8', hair: '#111827' },
    { id: 'health', name: 'Healthy', home: { x: 4.9, y: 14.3 }, color: '#ec4899', shirt: '#be185d', hair: '#3f2318', sporty: true }
  ];

  const WAYPOINTS = [
    { x: 11.6, y: 15.6, label: 'ประชุมวางแผนทีม 🗣️' },
    { x: 6.4, y: 15.6, label: 'แวะชงกาแฟ ☕' },
    { x: 4.8, y: 5.5, label: 'ตรวจห้องเซิร์ฟเวอร์ 🖥️' },
    { x: 16.0, y: 7.2, label: 'รายงานผลห้อง CEO 👑' },
    { x: 16.0, y: 12.2, label: 'ซิงก์ข้อความห้อง LINE 💬' }
  ];

  const agents = AGENT_DEF.map((def, i) => ({
    ...def, x: def.home.x, y: def.home.y, tx: def.home.x, ty: def.home.y,
    state: 'work', timer: 3 + i * 1.6 + Math.random() * 5,
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
      np.innerHTML = '<i></i><span>' + a.name + '</span>';
      np.onclick = ev => {
        ev.stopPropagation();
        if (buildMode) return;
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

  // Forward & Inverse Isometric Projection (for exact Drag & Drop!)
  function iso(x, y, z) {
    const cx = x - CX, cy = y - CY;
    const sx = (cx - cy) * TW;
    const sy = (cx + cy) * TH - (z || 0) * ZH;
    const s = cam.z * baseScale;
    return { x: W / 2 + (sx + cam.x) * s, y: H / 2 + (sy + cam.y) * s };
  }

  function screenToGrid(px, py) {
    const s = cam.z * baseScale;
    const sx = (px - W / 2) / s - cam.x;
    const sy = (py - H / 2) / s - cam.y;
    const cx = (sx / TW + sy / TH) / 2;
    const cy = (sy / TH - sx / TW) / 2;
    return { x: cx + CX, y: cy + CY };
  }

  function snap(v) { return Math.round(v * 2) / 2; }
  function clampToRoom(x, y, w, d) {
    return {
      x: Math.max(2.0, Math.min(22.4 - w, snap(x))),
      y: Math.max(3.4, Math.min(17.4 - d, snap(y)))
    };
  }

  function shade(hex, pct) {
    const n = parseInt(String(hex || '#64748b').replace('#', ''), 16);
    if (isNaN(n)) return hex;
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + pct));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + pct));
    const b = Math.max(0, Math.min(255, (n & 255) + pct));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function box(x, y, z, w, d, h, cTop, cLeft, cRight, stroke) {
    const p001 = iso(x, y, z + h), p101 = iso(x + w, y, z + h), p111 = iso(x + w, y + d, z + h), p011 = iso(x, y + d, z + h);
    const p100 = iso(x + w, y, z), p110 = iso(x + w, y + d, z), p010 = iso(x, y + d, z);
    ctx.beginPath();
    ctx.moveTo(p001.x, p001.y); ctx.lineTo(p101.x, p101.y); ctx.lineTo(p111.x, p111.y); ctx.lineTo(p011.x, p011.y);
    ctx.closePath(); ctx.fillStyle = cTop; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    if (h > 0.001) {
      ctx.beginPath();
      ctx.moveTo(p101.x, p101.y); ctx.lineTo(p111.x, p111.y); ctx.lineTo(p110.x, p110.y); ctx.lineTo(p100.x, p100.y);
      ctx.closePath(); ctx.fillStyle = cRight; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.beginPath();
      ctx.moveTo(p011.x, p011.y); ctx.lineTo(p111.x, p111.y); ctx.lineTo(p110.x, p110.y); ctx.lineTo(p010.x, p010.y);
      ctx.closePath(); ctx.fillStyle = cLeft; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    }
  }

  function tile(x, y, w, d, color, stroke) { box(x, y, 0, w, d, 0, color, color, color, stroke); }

  function lightPool(x, y, z, radius, rgbaInner) {
    const s = cam.z * baseScale, p = iso(x, y, z), r = radius * s;
    const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
    grd.addColorStop(0, rgbaInner); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  }

  function drawSelectionOutline(x, y, w, d, color) {
    const p0 = iso(x, y, 0.04), p1 = iso(x + w, y, 0.04), p2 = iso(x + w, y + d, 0.04), p3 = iso(x, y + d, 0.04);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
    ctx.fill();
    ctx.strokeStyle = color || '#f97316';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // Render any catalog furniture or partition item
  function drawItem(it, now) {
    const s = cam.z * baseScale;
    const { w, d, h } = itemDims(it);
    const x = it.x, y = it.y, c = it.color || '#38bdf8';
    const isSel = buildMode && selectedId === it.id;
    if (isSel) drawSelectionOutline(x - 0.1, y - 0.1, w + 0.2, d + 0.2, '#f97316');

    if (it.type === 'desk') {
      box(x, y, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
      box(x + w - 0.12, y, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
      box(x, y + d - 0.12, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
      box(x + w - 0.12, y + d - 0.12, 0, 0.12, 0.12, 0.65, '#94a3b8', '#64748b', '#475569');
      box(x, y, 0.65, w, d, 0.12, isNight ? '#cbd5e1' : '#f8fafc', '#cbd5e1', '#94a3b8');
      if (!it.rot) {
        box(x + 0.25, y + 0.15, 0.77, 0.62, 0.08, 0.46, '#1e293b', c, '#0f172a');
        box(x + 1.0, y + 0.15, 0.77, 0.62, 0.08, 0.46, '#1e293b', '#38bdf8', '#0f172a');
      } else {
        box(x + 0.15, y + 0.25, 0.77, 0.08, 0.62, 0.46, '#1e293b', '#0f172a', c);
        box(x + 0.15, y + 1.0, 0.77, 0.08, 0.62, 0.46, '#1e293b', '#0f172a', '#38bdf8');
      }
      if (isNight) lightPool(x + w / 2, y + d / 2, 0.9, 44, 'rgba(56, 189, 248, 0.16)');
    } else if (it.type === 'ceo_desk') {
      box(x, y, 0, w, d, 0.78, c, shade(c, -22), shade(c, -40));
      box(x + w * 0.2, y + d * 0.18, 0.78, w * 0.26, 0.1, 0.48, '#1e293b', '#ffd166', '#0f172a');
      box(x + w * 0.54, y + d * 0.18, 0.78, w * 0.26, 0.1, 0.48, '#1e293b', '#38bdf8', '#0f172a');
    } else if (it.type === 'server') {
      box(x, y, 0, w, d, h, c, shade(c, -18), shade(c, -32));
      for (let l = 0; l < 4; l++) {
        const lp = iso(x + 0.2 + l * 0.14, y + d + 0.01, 1.7 - (l % 2) * 0.36);
        const on = Math.floor(now * 4 + x + l) % 3 !== 0;
        ctx.fillStyle = on ? (l === 0 ? '#22c55e' : l === 1 ? '#38bdf8' : '#f59e0b') : '#1e293b';
        ctx.fillRect(lp.x, lp.y, 3.2 * s, 2.4 * s);
      }
    } else if (it.type === 'meeting') {
      box(x, y, 0, w, d, 0.68, isNight ? shade(c, -30) : c, shade(c, -20), shade(c, -35));
    } else if (it.type === 'sofa') {
      box(x, y, 0, w, d, 0.42, c, shade(c, -20), shade(c, -35));
      if (!it.rot) box(x, y, 0.42, w, 0.22, 0.38, shade(c, 12), c, shade(c, -22));
      else box(x, y, 0.42, 0.22, d, 0.38, shade(c, 12), c, shade(c, -22));
    } else if (it.type === 'bookshelf') {
      box(x, y, 0, w, d, h, c, shade(c, -18), shade(c, -36));
      box(x + 0.08, y + 0.12, 0.55, w - 0.16, d - 0.24, 0.25, '#38bdf8', '#f97316', '#22c55e');
      box(x + 0.08, y + 0.12, 1.25, w - 0.16, d - 0.24, 0.25, '#ffd166', '#ec4899', '#a855f7');
    } else if (it.type === 'vending') {
      box(x, y, 0, w, d, h, c, shade(c, 22), shade(c, -28));
      box(x + 0.15, y + d + 0.01, 0.6, Math.max(0.2, w - 0.3), 0.04, 1.0, '#e9d5ff', '#f3e8ff', '#d8b4fe');
      if (isNight) lightPool(x + w / 2, y + d + 0.1, 1.1, 72, 'rgba(168, 85, 247, 0.40)');
    } else if (it.type === 'coffee') {
      box(x, y, 0, w, d, 0.85, c, shade(c, -20), shade(c, -35));
      box(x + 0.25, y + 0.2, 0.85, 0.45, 0.4, 0.42, '#334155', '#1e293b', '#0f172a');
    } else if (it.type === 'treadmill') {
      box(x, y, 0, w, d, 0.15, '#334155', '#1e293b', '#0f172a');
      if (!it.rot) box(x, y, 0.15, 0.2, d, 0.95, c, shade(c, -22), shade(c, -40));
      else box(x, y, 0.15, w, 0.2, 0.95, c, shade(c, -22), shade(c, -40));
    } else if (it.type === 'plant') {
      box(x, y, 0, w, d, 0.48, '#c27849', '#a35d34', '#8a4c28');
      const p = iso(x + w / 2, y + d / 2, 0.68), r = 11 * s;
      ctx.fillStyle = isNight ? shade(c, -25) : c;
      [[-6, -2], [6, -3], [0, -8], [-4, 3], [5, 2]].forEach(([ox, oy]) => {
        ctx.beginPath(); ctx.ellipse(p.x + ox * s, p.y + oy * s, r * 0.65, r * 0.42, ox * 0.1, 0, Math.PI * 2); ctx.fill();
      });
    } else if (it.type === 'lamp') {
      box(x + 0.1, y + 0.1, 0, 0.2, 0.2, 1.05, c, shade(c, -18), shade(c, -32));
      if (it.on !== false) {
        lightPool(x + 0.2, y + 0.2, 1.2, isNight ? 80 : 34, isNight ? 'rgba(251, 191, 36, 0.44)' : 'rgba(253, 224, 71, 0.18)');
      }
    } else if (it.type === 'wall_glass') {
      const a0 = iso(x, y, 0), a1 = iso(x, y, h);
      const bx2 = it.rot ? x : x + w, by2 = it.rot ? y + d : y;
      const b0 = iso(bx2, by2, 0), b1 = iso(bx2, by2, h);
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(a1.x, a1.y); ctx.closePath();
      ctx.fillStyle = isNight ? 'rgba(147, 197, 253, 0.15)' : 'rgba(186, 230, 253, 0.28)';
      ctx.fill();
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = Math.max(1.4, 2.1 * s); ctx.stroke();
      for (let i = 1; i < 3; i++) {
        const t = i / 3;
        const m0 = iso(x + (bx2 - x) * t, y + (by2 - y) * t, 0);
        const m1 = iso(x + (bx2 - x) * t, y + (by2 - y) * t, h);
        ctx.beginPath(); ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y); ctx.stroke();
      }
    } else if (it.type === 'wall_wood') {
      const slats = 6;
      for (let i = 0; i < slats; i++) {
        const t = i / slats;
        if (!it.rot) box(x + w * t, y, 0, w / slats * 0.65, d, h, shade(c, 15), c, shade(c, -25));
        else box(x, y + d * t, 0, w, d / slats * 0.65, h, shade(c, 15), c, shade(c, -25));
      }
    } else if (it.type === 'wall_solid' || it.type === 'wall_half') {
      box(x, y, 0, w, d, h, isNight ? shade(c, -45) : c, shade(c, -18), shade(c, -35));
    }
  }

  function drawTree(x, y) {
    const s = cam.z * baseScale;
    box(x + 0.2, y + 0.2, 0, 0.32, 0.32, 0.85, '#784828', '#5c351c', '#4a2a16');
    const p = iso(x + 0.36, y + 0.36, 1.4);
    ctx.fillStyle = isNight ? '#14532d' : '#2f855a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 17 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isNight ? '#166534' : '#38a169';
    ctx.beginPath(); ctx.arc(p.x - 4 * s, p.y - 4 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
  }

  function drawScooter(v) {
    const s = cam.z * baseScale;
    box(v.x, v.y, 0.12, 0.9, 0.45, 0.36, v.color, v.color, '#1e293b');
    box(v.x + 0.06, v.y + 0.06, 0.48, 0.4, 0.34, 0.36, v.accent, v.color, v.color);
    const hp = iso(v.x + 0.58, v.y + 0.22, 0.95);
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(hp.x, hp.y, 6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = v.color; ctx.beginPath(); ctx.arc(hp.x, hp.y - 2 * s, 6.2 * s, Math.PI, Math.PI * 2); ctx.fill();
    if (isNight) lightPool(v.x + 1.05, v.y + 0.22, 0.2, 34, 'rgba(254, 240, 138, 0.45)');
  }

  function drawCharacter(a, now) {
    const s = cam.z * baseScale;
    const walking = a.state === 'walk' || a.state === 'back';
    const bob = walking ? Math.abs(Math.sin(now * 10)) * 0.18 : Math.sin(now * 2.5 + a.x) * 0.03;
    const baseZ = (a.state === 'work' && !a.sporty) ? 0.22 : 0;

    const sh = iso(a.x, a.y, 0.02);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 12 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();

    if (!buildMode && hoveredAgent === a.id) {
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 18 * s, 9 * s, 0, 0, Math.PI * 2); ctx.stroke();
    }

    const bx = a.x - 0.26, by = a.y - 0.22;
    box(bx, by, baseZ + 0.15 + bob, 0.52, 0.42, 0.6, a.shirt, a.shirt, '#111827');

    const hp = iso(a.x, a.y, baseZ + 1.08 + bob), hr = 11.5 * s;
    a.screenX = hp.x; a.screenY = hp.y;

    if (a.robot) {
      box(bx - 0.04, by - 0.04, baseZ + 0.76 + bob, 0.6, 0.5, 0.54, '#7c3aed', '#5b21b6', '#4c1d95');
      const ant = iso(a.x, a.y, baseZ + 1.52 + bob);
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(ant.x, ant.y, 4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(hp.x - 5 * s, hp.y - 2 * s, 3.5 * s, 3.5 * s);
      ctx.fillRect(hp.x + 1.5 * s, hp.y - 2 * s, 3.5 * s, 3.5 * s);
    } else {
      ctx.fillStyle = '#fed7aa'; ctx.beginPath(); ctx.arc(hp.x, hp.y, hr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = a.helmet || a.hat || a.hair;
      ctx.beginPath(); ctx.arc(hp.x, hp.y - 2 * s, hr * 1.03, Math.PI * 0.92, Math.PI * 2.08); ctx.fill();
      if (a.crown) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(hp.x - 7 * s, hp.y - 10 * s); ctx.lineTo(hp.x - 4 * s, hp.y - 17 * s);
        ctx.lineTo(hp.x, hp.y - 12 * s); ctx.lineTo(hp.x + 4 * s, hp.y - 17 * s);
        ctx.lineTo(hp.x + 7 * s, hp.y - 10 * s); ctx.closePath(); ctx.fill();
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
        ctx.strokeStyle = '#111827'; ctx.lineWidth = 1.2;
        ctx.strokeRect(hp.x - 6.5 * s, hp.y - 1 * s, 5 * s, 4 * s);
        ctx.strokeRect(hp.x + 1.5 * s, hp.y - 1 * s, 5 * s, 4 * s);
      }
    }
  }

  function roomLabel(x, y, text, accent) {
    const p = iso(x, y, 0.04), s = cam.z * baseScale;
    ctx.save();
    ctx.font = '700 ' + Math.max(9, Math.round(11 * s)) + 'px var(--f), sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = accent || (isNight ? 'rgba(226,232,240,0.72)' : 'rgba(51,65,85,0.65)');
    ctx.fillText(text, p.x, p.y);
    ctx.restore();
  }

  function drawScene(now) {
    const s = cam.z * baseScale;
    ctx.fillStyle = isNight ? '#070b14' : '#1b2434';
    ctx.fillRect(0, 0, W, H);

    // 1) Exterior Street
    tile(0, 0, 24, 2.8, isNight ? '#1e293b' : '#475569');
    for (let i = 0; i < 5; i++) tile(8.2 + i * 0.45, 0.35, 0.22, 1.9, isNight ? '#475569' : '#cbd5e1');
    tile(0, 2.6, 24, 0.65, isNight ? '#334155' : '#94a3b8');
    drawTree(1.2, 0.35); drawTree(22.2, 0.35);
    [4.6, 13.0, 20.0].forEach(lx => {
      box(lx, 2.7, 0, 0.14, 0.14, 2.3, '#64748b', '#475569', '#334155');
      if (isNight) lightPool(lx + 0.1, 2.4, 2.1, 86, 'rgba(253, 224, 71, 0.35)');
    });
    vehicles.forEach(drawScooter);

    // 2) Main Floor Slab (Customizable Floor!)
    const fl = FLOOR_STYLES[layout.floorIdx || 0] || FLOOR_STYLES[0];
    box(1.8, 3.3, -0.4, 20.8, 14.3, 0.4, isNight ? fl.night : fl.day, '#64748b', '#475569');

    // Zone Accent Rugs (Server, CEO, LINE)
    tile(2.0, 3.4, 5.6, 5.6, isNight ? 'rgba(30,41,59,0.65)' : 'rgba(219,234,254,0.68)');
    tile(16.4, 3.4, 6.0, 5.6, isNight ? 'rgba(124,77,37,0.75)' : 'rgba(198,147,99,0.78)');
    tile(16.4, 9.4, 6.0, 5.4, isNight ? 'rgba(19,48,37,0.72)' : 'rgba(220,252,231,0.72)');

    // Build Mode Snap Grid
    const gridStep = buildMode ? 1.0 : 2.0;
    ctx.strokeStyle = buildMode ? 'rgba(249,115,22,0.22)' : (isNight ? 'rgba(15,23,42,0.10)' : 'rgba(148,163,184,0.18)');
    ctx.lineWidth = 1;
    for (let gx = 2.0; gx <= 22.4; gx += gridStep) {
      const a = iso(gx, 3.3, 0.01), b = iso(gx, 17.6, 0.01);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    if (buildMode) {
      for (let gy = 3.4; gy <= 17.6; gy += 1.0) {
        const a = iso(1.8, gy, 0.01), b = iso(22.6, gy, 0.01);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // Perimeter Cutaway Walls (Customizable Wall Color!)
    const wc = layout.wallColor || '#ffffff';
    box(1.8, 3.05, 0, 20.8, 0.26, 2.8, isNight ? shade(wc, -55) : wc, shade(wc, -18), shade(wc, -32));
    box(1.56, 3.05, 0, 0.26, 14.55, 2.8, isNight ? shade(wc, -55) : wc, shade(wc, -24), shade(wc, -38));

    // Room Labels
    roomLabel(4.8, 8.5, '🖥️ SERVER & SOLAR', isNight ? '#93c5fd' : '#1d4ed8');
    roomLabel(19.4, 8.5, '👑 CEO OFFICE', '#fef08a');
    roomLabel(19.4, 14.3, '💬 LINE OA HUB', isNight ? '#4ade80' : '#15803d');

    // Solar Wall Monitor inside Server Room
    box(6.4, 3.36, 1.0, 1.0, 0.12, 0.95, '#0f172a', '#111827', '#090d16');
    const mp = iso(6.9, 3.5, 1.5);
    ctx.fillStyle = '#22c55e'; ctx.font = '700 ' + Math.round(10 * s) + 'px var(--f), sans-serif'; ctx.textAlign = 'center';
    const batt = (window.LASTD && window.LASTD.solar && window.LASTD.solar.battery) || 19;
    ctx.fillText(batt + '%', mp.x, mp.y);

    // 3) Depth-sorted Furniture + Partitions + Characters
    const drawables = [];
    layout.items.forEach(it => {
      const dm = itemDims(it);
      drawables.push({ depth: it.x + it.y + (dm.w + dm.d) * 0.45, draw: () => drawItem(it, now) });
    });
    agents.forEach(a => drawables.push({ depth: a.x + a.y + 0.4, draw: () => drawCharacter(a, now) }));
    drawables.sort((a, b) => a.depth - b.depth);
    drawables.forEach(d => d.draw());

    // 4) Ghost preview while dragging from Build Palette
    if (buildMode && ghost && CATALOG[ghost.type]) {
      const def = CATALOG[ghost.type];
      drawSelectionOutline(ghost.x, ghost.y, def.w, def.d, '#22c55e');
    }

    // 5) Night string lights
    if (isNight) {
      for (let i = 0; i < 6; i++) {
        const lx = 8.4 + i * 1.4, lp = iso(lx, 9.2, 2.7);
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(lp.x, lp.y, 2.6 * s, 0, Math.PI * 2); ctx.fill();
        lightPool(lx, 9.2, 2.65, 28, 'rgba(253, 224, 71, 0.20)');
      }
    }
  }

  let lastTs = 0;
  function frame(ts) {
    const now = ts / 1000, dt = Math.min(0.08, now - lastTs || 0.016);
    lastTs = now;
    cam.x += (cam.tx - cam.x) * 0.14; cam.y += (cam.ty - cam.y) * 0.14; cam.z += (cam.tz - cam.z) * 0.14;

    if (!paused && !buildMode) {
      vehicles.forEach(v => { v.x += v.speed * dt; if (v.x > 24.5) v.x = -1.8; });
      const walkingCount = agents.filter(a => a.state === 'walk' || a.state === 'back').length;
      agents.forEach(a => {
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
          const dx = gx - a.x, dy = gy - a.y, dist = Math.hypot(dx, dy), step = 1.85 * dt;
          if (dist <= step) {
            a.x = gx; a.y = gy;
            if (a.state === 'walk') { a.state = 'chat'; a.timer = now + 3.8; }
            else { a.state = 'work'; a.timer = now + 9 + Math.random() * 11; }
          } else { a.x += (dx / dist) * step; a.y += (dy / dist) * step; }
        } else if (a.state === 'chat' && now > a.timer) { a.state = 'back'; }
      });
    }

    drawScene(now);

    const s = cam.z * baseScale;
    agents.forEach(a => {
      if (a.elName) {
        a.elName.style.opacity = buildMode ? '0.35' : '1';
        a.elName.style.pointerEvents = buildMode ? 'none' : 'auto';
        a.elName.style.transform = `translate(${a.screenX.toFixed(1)}px, ${(a.screenY + 22 * s).toFixed(1)}px) translate(-50%, 0)`;
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
    H = Math.max(500, Math.min(680, Math.round(W * 0.72)));
    baseScale = Math.min(1.05, Math.min(W / 1280, H / 680));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Hit testing
  function getPointer(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function findItemAtGrid(gx, gy) {
    // Check top-most items first
    for (let i = layout.items.length - 1; i >= 0; i--) {
      const it = layout.items[i], dm = itemDims(it);
      if (gx >= it.x - 0.35 && gx <= it.x + dm.w + 0.35 && gy >= it.y - 0.35 && gy <= it.y + dm.d + 0.35) {
        return it;
      }
    }
    return null;
  }

  function findAgentAt(px, py) {
    const s = cam.z * baseScale;
    let best = null, bestD = 28 * s;
    agents.forEach(a => { const d = Math.hypot(px - a.screenX, py - a.screenY); if (d < bestD) { bestD = d; best = a; } });
    return best;
  }

  // Pointer Events: Drag Furniture in Build Mode OR Pan Camera / Click Agent/Lamp in Live Mode
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
      } else {
        selectItem(null);
      }
    }
    draggingCam = true;
    dragStart = { x: p.x, y: p.y, cx: cam.tx, cy: cam.ty };
    canvas.setPointerCapture(ev.pointerId);
  });

  canvas.addEventListener('pointermove', ev => {
    const p = getPointer(ev);
    if (draggingItem && buildMode) {
      const g = screenToGrid(p.x, p.y);
      const dm = itemDims(draggingItem);
      const pos = clampToRoom(dragStart.ox + (g.x - dragStart.x), dragStart.oy + (g.y - dragStart.y), dm.w, dm.d);
      draggingItem.x = pos.x; draggingItem.y = pos.y;
      dragMoved = true;
      return;
    }
    if (draggingCam) {
      const s = cam.z * baseScale;
      const dx = (p.x - dragStart.x) / s, dy = (p.y - dragStart.y) / s;
      if (Math.hypot(dx, dy) > 4) dragMoved = true;
      cam.tx = Math.max(-420, Math.min(420, dragStart.cx + dx));
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
    if (draggingItem) {
      if (dragMoved) saveLayout();
      draggingItem = null;
      return;
    }
    if (!draggingCam) return;
    draggingCam = false;
    if (!dragMoved && !buildMode) {
      const p = getPointer(ev);
      const hit = findAgentAt(p.x, p.y);
      if (hit) {
        focusAgent(hit.id);
        if (hit.id === 'ceo') {
          if (typeof window.showMoToast === 'function') window.showMoToast('👑 ห้องผู้บริหาร CEO — AboutMeProcess HQ');
        } else if (typeof window.openAgent === 'function') window.openAgent(hit.id);
        return;
      }
      // Clickable lamps in Live Mode
      const g = screenToGrid(p.x, p.y);
      const lhit = findItemAtGrid(g.x, g.y);
      if (lhit && lhit.type === 'lamp') {
        lhit.on = lhit.on === false ? true : false;
        saveLayout();
        if (typeof window.showMoToast === 'function') window.showMoToast(lhit.on ? '💡 เปิดโคมไฟแล้ว' : '🌑 ปิดโคมไฟแล้ว');
      }
    }
  });

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    setZoom(cam.tz * (ev.deltaY < 0 ? 1.12 : 0.89));
  }, { passive: false });

  // HTML5 Drag & Drop from Build Palette directly onto 3D Canvas!
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
    if (typeof window.showMoToast === 'function') window.showMoToast('✅ วาง ' + def.label + ' แล้ว (ลากย้ายหรือกดหมุน 90° ได้)');
  });

  // Build Mode UI Controls
  const bBtn = document.getElementById('moBuildBtn');
  const bBar = document.getElementById('moBuildBar');
  const bPal = document.getElementById('moBPalette');
  const bSel = document.getElementById('moBSel');
  const bSelName = document.getElementById('moBSelName');
  const bSwatches = document.getElementById('moBSwatches');

  function selectItem(id) {
    selectedId = id;
    const it = layout.items.find(x => x.id === id);
    if (!bSel) return;
    if (!it || !buildMode) { bSel.hidden = true; return; }
    bSel.hidden = false;
    const def = CATALOG[it.type];
    if (bSelName) bSelName.textContent = (def ? def.label : it.type) + (it.rot ? ' (หมุน 90°)' : '');
    if (bSwatches) {
      bSwatches.textContent = '';
      ITEM_SWATCHES.forEach(col => {
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'mo-sw' + (it.color === col ? ' on' : '');
        sw.style.background = col;
        sw.onclick = () => { it.color = col; saveLayout(); selectItem(it.id); };
        bSwatches.appendChild(sw);
      });
    }
  }

  function renderPalette() {
    if (!bPal) return;
    bPal.textContent = '';
    if (activeBTab === 'floor') {
      FLOOR_STYLES.forEach((f, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mo-b-item' + (layout.floorIdx === idx ? ' on' : '');
        b.innerHTML = '<span style="width:12px;height:12px;border-radius:3px;background:' + f.day + ';border:1px solid #64748b;display:inline-block"></span> พื้น: ' + f.name;
        b.onclick = () => { layout.floorIdx = idx; saveLayout(); renderPalette(); };
        bPal.appendChild(b);
      });
      WALL_COLORS.forEach(w => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mo-b-item' + (layout.wallColor === w.c ? ' on' : '');
        b.innerHTML = '<span style="width:12px;height:12px;border-radius:50%;background:' + w.c + ';border:1px solid #64748b;display:inline-block"></span> ผนัง: ' + w.name;
        b.onclick = () => { layout.wallColor = w.c; saveLayout(); renderPalette(); };
        bPal.appendChild(b);
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
      b.addEventListener('dragstart', ev => {
        window._dragType = type;
        ev.dataTransfer.setData('text/plain', type);
      });
      b.addEventListener('dragend', () => { ghost = null; window._dragType = null; });
      // Also allow 1-click spawn at center for mobile/touch users!
      b.onclick = () => {
        const created = mkItem(type, 11.0, 9.0, 0);
        layout.items.push(created);
        selectItem(created.id);
        saveLayout();
        if (typeof window.showMoToast === 'function') window.showMoToast('✅ เพิ่ม ' + def.label + ' กลางห้องแล้ว — ลากย้ายได้เลย!');
      };
      bPal.appendChild(b);
    });
  }

  if (bBtn && bBar) {
    bBtn.onclick = () => {
      buildMode = !buildMode;
      bBar.hidden = !buildMode;
      bBtn.setAttribute('aria-pressed', buildMode ? 'true' : 'false');
      bBtn.textContent = buildMode ? '✅ เสร็จสิ้นแต่งห้อง' : '🛠️ แต่งออฟฟิศ';
      if (!buildMode) selectItem(null);
      else {
        renderPalette();
        if (typeof window.showMoToast === 'function') window.showMoToast('🛠️ โหมดแต่งออฟฟิศแบบ The Sims: ลากเฟอร์นิเจอร์วาง/ย้าย/หมุนได้เลย!');
      }
    };
  }

  document.querySelectorAll('#moBTabs .mo-fbtn').forEach(tb => {
    tb.onclick = () => {
      activeBTab = tb.dataset.btab;
      document.querySelectorAll('#moBTabs .mo-fbtn').forEach(x => x.classList.toggle('on', x === tb));
      renderPalette();
    };
  });

  const rotBtn = document.getElementById('moRotBtn');
  if (rotBtn) rotBtn.onclick = () => {
    const it = layout.items.find(x => x.id === selectedId);
    if (!it) return;
    it.rot = it.rot ? 0 : 1;
    saveLayout();
    selectItem(it.id);
  };

  const dupBtn = document.getElementById('moDupBtn');
  if (dupBtn) dupBtn.onclick = () => {
    const it = layout.items.find(x => x.id === selectedId);
    if (!it) return;
    const dm = itemDims(it);
    const pos = clampToRoom(it.x + 1.0, it.y + 1.0, dm.w, dm.d);
    const copy = mkItem(it.type, pos.x, pos.y, it.rot, it.color);
    layout.items.push(copy);
    selectItem(copy.id);
    saveLayout();
  };

  const delBtn = document.getElementById('moDelBtn');
  if (delBtn) delBtn.onclick = () => {
    if (!selectedId) return;
    layout.items = layout.items.filter(x => x.id !== selectedId);
    selectItem(null);
    saveLayout();
  };

  const resetBtn = document.getElementById('moResetLayout');
  if (resetBtn) resetBtn.onclick = () => {
    if (!confirm('รีเซ็ตผังออฟฟิศกลับเป็นค่าเริ่มต้น?')) return;
    layout = defaultLayout();
    selectItem(null);
    saveLayout();
    renderPalette();
    if (typeof window.showMoToast === 'function') window.showMoToast('↩️ รีเซ็ตผังออฟฟิศเรียบร้อยแล้ว');
  };

  document.addEventListener('keydown', ev => {
    if (!buildMode || !selectedId || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) return;
    if (ev.key === 'r' || ev.key === 'R') { ev.preventDefault(); if (rotBtn) rotBtn.click(); }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); if (delBtn) delBtn.click(); }
  });

  function updateZoomLabel() {
    const zv = document.getElementById('moZoomVal');
    if (zv) zv.textContent = Math.round(cam.tz * 100) + '%';
  }
  function setZoom(z) { cam.tz = Math.max(0.75, Math.min(2.6, z)); updateZoomLabel(); }
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
    cam.tx = -(cx - cy) * TW; cam.ty = -(cx + cy) * TH + 18; cam.tz = 1.85;
    a.bubbleText = a.statusText || 'พร้อมทำงาน';
    a.bubbleUntil = performance.now() / 1000 + 4.5;
    updateZoomLabel();
    document.querySelectorAll('.mo-dbtn[data-cam]').forEach(b => b.classList.remove('on'));
  }

  const avatarCache = {};
  function renderAgentAvatar(id) {
    if (avatarCache[id]) return avatarCache[id];
    const a = AGENT_DEF.find(x => x.id === id);
    if (!a) return '';
    const dpr = 2, w = 160, h = 200, s = 3.15, ox = w / 2, oy = 152;
    const c = document.createElement('canvas');
    c.width = w * dpr; c.height = h * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);

    const pIso = (x, y, z) => ({
      x: ox + (x - y) * TW * s * 0.52,
      y: oy + (x + y) * TH * s * 0.52 - (z || 0) * ZH * s * 0.82
    });
    const pPoly = (pts, fill) => {
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath();
      g.fillStyle = fill;
      g.fill();
    };
    const pBox = (x, y, z, bw, bd, bh, topC, leftC, rightC) => {
      const p000 = pIso(x, y, z), p100 = pIso(x + bw, y, z), p110 = pIso(x + bw, y + bd, z), p010 = pIso(x, y + bd, z);
      const p001 = pIso(x, y, z + bh), p101 = pIso(x + bw, y, z + bh), p111 = pIso(x + bw, y + bd, z + bh), p011 = pIso(x, y + bd, z + bh);
      pPoly([p010, p110, p111, p011], leftC);
      pPoly([p100, p110, p111, p101], rightC);
      pPoly([p001, p101, p111, p011], topC);
    };

    // Ground shadow
    const sh = pIso(0, 0, 0.02);
    g.fillStyle = 'rgba(0,0,0,0.34)';
    g.beginPath();
    g.ellipse(sh.x, sh.y, 12 * s, 5.5 * s, 0, 0, Math.PI * 2);
    g.fill();

    // Isometric 3D Torso (exact match with drawCharacter)
    const bx = -0.34, by = -0.28;
    pBox(bx, by, 0.14, 0.68, 0.56, 0.68, a.shirt, shade(a.shirt, -14), '#111827');

    // Head
    const hp = pIso(0, 0, 1.15), hr = 11.5 * s;
    if (a.robot) {
      pBox(bx - 0.05, by - 0.05, 0.82, 0.78, 0.66, 0.58, '#7c3aed', '#5b21b6', '#4c1d95');
      const ant = pIso(0, 0, 1.62);
      g.fillStyle = '#38bdf8';
      g.beginPath(); g.arc(ant.x, ant.y, 4 * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e0f2fe';
      g.fillRect(hp.x - 5 * s, hp.y - 2 * s, 3.5 * s, 3.5 * s);
      g.fillRect(hp.x + 1.5 * s, hp.y - 2 * s, 3.5 * s, 3.5 * s);
    } else {
      g.fillStyle = '#fed7aa';
      g.beginPath(); g.arc(hp.x, hp.y, hr, 0, Math.PI * 2); g.fill();
      g.fillStyle = a.helmet || a.hat || a.hair;
      g.beginPath(); g.arc(hp.x, hp.y - 2 * s, hr * 1.03, Math.PI * 0.92, Math.PI * 2.08); g.fill();
      if (a.crown) {
        g.fillStyle = '#ffd166';
        g.beginPath();
        g.moveTo(hp.x - 7 * s, hp.y - 10 * s); g.lineTo(hp.x - 4 * s, hp.y - 17 * s);
        g.lineTo(hp.x, hp.y - 12 * s); g.lineTo(hp.x + 4 * s, hp.y - 17 * s);
        g.lineTo(hp.x + 7 * s, hp.y - 10 * s); g.closePath(); g.fill();
      }
      g.fillStyle = '#111827';
      g.beginPath();
      g.arc(hp.x - 3.6 * s, hp.y + 1.2 * s, 1.7 * s, 0, Math.PI * 2);
      g.arc(hp.x + 3.6 * s, hp.y + 1.2 * s, 1.7 * s, 0, Math.PI * 2);
      g.fill();
      if (a.helmet) {
        g.fillStyle = 'rgba(56, 189, 248, 0.85)';
        g.fillRect(hp.x - 7 * s, hp.y - 1.5 * s, 14 * s, 4 * s);
      } else if (a.glasses) {
        g.strokeStyle = '#111827'; g.lineWidth = 2.6;
        g.strokeRect(hp.x - 6.5 * s, hp.y - 1 * s, 5 * s, 4 * s);
        g.strokeRect(hp.x + 1.5 * s, hp.y - 1 * s, 5 * s, 4 * s);
      }
    }
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
