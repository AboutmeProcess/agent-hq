// ================== ข้อมูลเอเจนต์และฉากออฟฟิศ (AboutMeProcess) ==================
const S = [
  { id: 'driver', n: 'Driver', role: 'Driver Intelligence Agent', d: 'ช่วยวางแผนเส้นทาง ดูแลคอมมูนิตี้ The Driver Thailand และข้อมูลที่เกี่ยวกับงานขับรถรับจ้าง', st: 'ซิงก์ข้อมูลแล้ว', c: '#5ee08a', x: 290, y: 215, h: '#2b1b12', sh: '#2f6b4a' },
  { id: 'captain', n: 'Captain', role: 'Insurance CRM Agent', d: 'งานแบรนด์ Captain ประกันภัย ดูแลพอร์ตกรมธรรม์ ทำใบเสนอราคา และประสานงานกับแพลตฟอร์มนายหน้า', st: 'เคสวันนี้: 18', c: '#6ea8ff', x: 520, y: 215, h: '#111', sh: '#2c4a8a' },
  { id: 'profit', n: 'Take Profit', role: 'Forex Trading Agent', d: 'ดูแล EA บน MT5 กลยุทธ์ Grid Trading คู่เงิน XAUUSD ระบบ Partial Hedging และแจ้งเตือนผ่าน Telegram', st: 'EA ทำงานอยู่', c: '#ffb347', x: 205, y: 310, h: '#3a2a10', sh: '#7a4a1c' },
  { id: 'solar', n: 'Solar', role: 'Smart Home & Solar Agent', d: 'ดูแลระบบอัตโนมัติในบ้าน Apple HomeKit โซลาร์รูฟท็อป อินเวอร์เตอร์ และการประหยัดพลังงาน', st: 'แบตเตอรี่: 94%', c: '#ffe066', x: 600, y: 310, h: '#222', sh: '#8a7a1c' },
  { id: 'health', n: 'Healthy', role: 'Health Analytics Agent', d: 'บันทึกและติดตามผลออกกำลังกายประจำวัน เช่น เดินลู่วิ่งและเล่นดัมเบลล์ ภายใต้โปรเจกต์ take profit', st: 'สำเร็จ 3/3 วัน', c: '#ff8ad8', x: 292, y: 410, h: '#4a2a1a', sh: '#8a3a6a' },
  { id: 'script', n: 'App Script', role: 'ระบบอัตโนมัติ', d: 'สคริปต์อัตโนมัติที่เชื่อมงานต่างๆ เข้าด้วยกัน', st: 'พร้อมใช้งาน', c: '#9b7bff', x: 530, y: 405, h: '#1a1a2a', sh: '#4a3a8a' },
  { id: 'finance', n: 'Finance', role: 'Personal Finance Agent', d: 'ติดตามธุรกรรม การโอนเงิน บิลชำระเงิน และความเคลื่อนไหวผ่านแอปธนาคารต่างๆ', st: 'ตรวจสอบแล้ว', c: '#f2c94c', x: 400, y: 448, h: '#222', sh: '#555' },
  { id: 'tg', n: 'LINE OA', role: 'ศูนย์สั่งการและแจ้งเตือนกลาง', d: 'ช่องทางหลักในการรับคำสั่งและส่งแจ้งเตือนจากทุกระบบผ่าน LINE Official Account (@025nqoxp)', st: 'ออนไลน์', c: '#06c755', x: 400, y: 300, h: '#2b1b12', sh: '#059669', hub: 1 }
];

const POS = {
  driver: [700, 312],
  captain: [870, 432],
  profit: [520, 652],
  solar: [1050, 512],
  health: [185, 612],
  script: [440, 692],
  finance: [680, 692],
  tg: [720, 522]
};

const SC = {
  driver: 100,
  captain: 100,
  tg: 100,
  finance: 100,
  solar: 104,
  script: 104,
  profit: 140,
  health: 140
};

const el = document.getElementById('scene');
let o = `<image href="${BG}" x="0" y="0" width="1312" height="816"/>`;

S.slice().sort((a, b) => POS[a.id][1] - POS[b.id][1]).forEach((s, i) => {
  const [x, y] = POS[s.id];
  const av3d = typeof window.getOfficeAvatar === 'function' ? window.getOfficeAvatar(s.id) : '';
  const im = av3d ? { u: av3d, w: 160, h: 200 } : IMG[s.id];
  const c = s.c;
  const H = im ? (SC[s.id] || 104) : 110;
  let g = `<g class="st" tabindex="0" role="button" aria-label="${s.n}: ${s.role}" data-id="${s.id}"><g id="mv-${s.id}">`;
  g += `<ellipse class="glow" cx="${x}" cy="${y - H / 2}" rx="${H * .5}" ry="${H / 2 + 16}" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-width="3"/>`;
  g += `<ellipse cx="${x}" cy="${y + 2}" rx="${H * .22}" ry="8" fill="#000" opacity=".4"/>`;
  g += `<g class="bd" style="--d:${(i * .37).toFixed(2)}s"><g id="fl-${s.id}">`;
  if (im) {
    const k = H / im.h;
    const w = im.w * k;
    g += `<image id="im-${s.id}" href="${im.u}" x="${x - w / 2}" y="${y - H}" width="${w}" height="${H}"/>`;
    if (!av3d && WK[s.id]) {
      const q = WK[s.id];
      g += `<image id="wk-${s.id}" display="none" href="${q.f[0]}" x="${x - q.w / 2}" y="${y - q.h}" width="${q.w}" height="${q.h}"/>`;
    }
  } else {
    g += `<g opacity=".55" stroke="${c}" stroke-width="2" stroke-dasharray="5 4" fill="${c}" fill-opacity=".25"><circle cx="${x}" cy="${y - H + 26}" r="20"/><path d="M${x - 30} ${y} v-52 q0-22 30-22 q30 0 30 22 v52z"/></g><text class="lab" x="${x}" y="${y - H / 2}" style="font-size:20px">?</text>`;
  }
  g += `</g></g><circle class="dot" cx="${x + H * .27}" cy="${y - H + 8}" r="6" fill="${c}" stroke="#0b0f17" stroke-width="2"/>`;
  const nw = Math.max(76, s.n.length * 8.5 + 30);
  g += `<g class="np" pointer-events="none"><rect x="${x - nw / 2}" y="${y + 8}" width="${nw}" height="24" rx="12" fill="rgba(15,20,30,0.88)" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><circle cx="${x - nw / 2 + 13}" cy="${y + 20}" r="4" fill="${c}"/><text class="np-txt" x="${x + 6}" y="${y + 24}">${s.n}</text></g>`;
  const bw = Math.max(90, s.st.length * 8 + 28);
  g += `<g class="bb" id="bb-${s.id}"><rect x="${x - bw / 2}" y="${y - H - 38}" width="${bw}" height="28" rx="10" fill="rgba(17,24,39,0.94)" stroke="${c}" stroke-width="2"/><polygon points="${x - 6},${y - H - 10} ${x + 6},${y - H - 10} ${x},${y - H - 2}" fill="rgba(17,24,39,0.94)"/><text x="${x}" y="${y - H - 20}">${s.st}</text></g></g></g>`;
  o += g;
});
el.innerHTML = o;

// ---- ตัวละครขยับ: หายใจ เดินไปคุยกับเพื่อน แล้วกลับที่เดิม ----
const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
let OFFICE_ON = true;
let USER_PAUSE = false;

const C = S.map(s => ({
  s,
  hx: POS[s.id][0],
  hy: POS[s.id][1],
  x: 0,
  y: 0,
  st: 'idle',
  t: 3 + Math.random() * 9,
  bt: 2 + Math.random() * 10,
  bo: 0,
  face: 1,
  tx: 0,
  ty: 0,
  mv: document.getElementById('mv-' + s.id),
  bb: document.getElementById('bb-' + s.id),
  fl: document.getElementById('fl-' + s.id),
  wk: document.getElementById('wk-' + s.id),
  im: document.getElementById('im-' + s.id)
}));

const say = (c, sec, now) => { c.bb.classList.add('on'); c.bo = now + sec; };
const turn = (c, f) => {
  if (c.face !== f) {
    c.face = f;
    c.fl.setAttribute('transform', f < 0 ? `translate(${2 * c.hx} 0) scale(-1 1)` : '');
  }
};

let lt = 0;
let order = '';

function tick(ms) {
  if (!OFFICE_ON || USER_PAUSE) {
    lt = ms / 1000;
    requestAnimationFrame(tick);
    return;
  }
  const now = ms / 1000;
  const dt = Math.min(.1, now - lt);
  lt = now;
  const walking = () => C.filter(c => c.st === 'go' || c.st === 'back').length;

  C.forEach(c => {
    if (c.bo && now > c.bo) { c.bb.classList.remove('on'); c.bo = 0; }
    if (c.st === 'idle') {
      if (now > c.bt && !c.bo) { say(c, 3, now); c.bt = now + 10 + Math.random() * 12; }
      if (now > c.t && walking() < 2) {
        const o2 = C[Math.floor(Math.random() * C.length)];
        if (o2 !== c) {
          c.tx = o2.hx - c.hx + (o2.hx < c.hx ? 64 : -64);
          c.ty = o2.hy - c.hy + 4;
          c.st = 'go';
          turn(c, c.tx > c.x ? 1 : -1);
          c.bb.classList.remove('on');
        } else {
          c.t = now + 4;
        }
      }
    } else if (c.st === 'go' || c.st === 'back') {
      const gx = c.st === 'go' ? c.tx : 0;
      const gy = c.st === 'go' ? c.ty : 0;
      const dx = gx - c.x;
      const dy = gy - c.y;
      const d = Math.hypot(dx, dy);
      const step = 60 * dt;
      if (d <= step) {
        c.x = gx;
        c.y = gy;
        if (c.st === 'go') {
          c.st = 'talk';
          c.t = now + 4.5;
          say(c, 3.5, now);
          turn(c, c.tx > 0 ? -1 : 1);
        } else {
          c.st = 'idle';
          c.t = now + 9 + Math.random() * 12;
          turn(c, 1);
        }
      } else {
        c.x += dx / d * step;
        c.y += dy / d * step;
        turn(c, dx >= 0 ? 1 : -1);
      }
    } else if (c.st === 'talk' && now > c.t) {
      c.st = 'back';
      c.bb.classList.remove('on');
      turn(c, c.x > 0 ? -1 : 1);
    }

    const wlk = (c.st === 'go' || c.st === 'back');
    if (c.wk) {
      c.wk.setAttribute('display', wlk ? 'inline' : 'none');
      c.im.setAttribute('display', wlk ? 'none' : 'inline');
      if (wlk) c.wk.setAttribute('href', WK[c.s.id].f[[0, 1, 2, 1][Math.floor(now * 5) % 4]]);
    }
    const bob = wlk ? Math.abs(Math.sin(now * 10)) * (c.wk ? 2 : 4) : 0;
    c.mv.setAttribute('transform', `translate(${c.x.toFixed(1)} ${(c.y - bob).toFixed(1)})`);
  });

  const ord = C.slice().sort((a, b) => (a.hy + a.y) - (b.hy + b.y));
  const key = ord.map(c => c.s.id).join();
  if (key !== order) {
    order = key;
    ord.forEach(c => el.appendChild(c.mv.parentNode));
  }
  requestAnimationFrame(tick);
}
if (!RM) requestAnimationFrame(tick);

// ================== ชั้นหน้าตา/การทำงาน (AboutMeProcess) ==================
let LASTD = null;
let LAST_MODE = true;
let SEL = null;
let busy = false;
let lastFocus = null;

const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);
function E(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
const ST0 = 'ยังไม่เชื่อมข้อมูล';
const ORDER = ['driver', 'captain', 'profit', 'solar', 'health', 'finance', 'script', 'tg'];
const sOf = id => S.find(v => v.id === id);

const AG = {
  driver: {
    role: 'Driver Intelligence Agent',
    duty: 'ผู้ช่วยงานขับรถรับจ้าง ดูเที่ยวบินขาเข้าสุวรรณภูมิ (BKK) และดอนเมือง (DMK) ช่วยวางแผนเส้นทาง และบันทึกรายได้แยกตามแอป ตามแผนยังดูแลคอมมูนิตี้ The Driver Thailand ด้วย',
    can: [
      'กระดานเที่ยวบิน: ลงแล้ว 5 เที่ยวล่าสุด และกำลังจะลง 2 เที่ยว พร้อมสถานะและความล่าช้า',
      'ค้นเส้นทางไปปลายทาง และเปิดแผนที่จราจรสดใน Google Maps',
      'บันทึกรายได้ทีละรายการ แยกตามแอป (Grab, Bolt, inDrive, LINE MAN ฯลฯ)'
    ],
    cmds: [['/bkk', '✈️ BKK'], ['/dmk', '✈️ DMK'], ['/ledger', '🚘 สรุป Driver Ledger'], ['/summary', '📊 สรุปรายได้']],
    with: ['finance', 'tg', 'script'],
    collab: 'ทำงานร่วมกัน: รายได้ที่ Driver บันทึกไว้ ถูก Finance นำไปรวมในเงินสดและเป้าหมายประจำวันทุกครั้งที่คำนวณ',
    conn: 'เชื่อมแล้วเมื่อมีข้อมูล: เที่ยวบิน (AeroDataBox) และชีต Daily_Jobs ส่วนการดูแลคอมมูนิตี้ยังไม่ได้พัฒนา'
  },
  captain: {
    role: 'Insurance CRM Agent',
    duty: 'ดูแลงานแบรนด์ Captain ประกันภัย ดูแลพอร์ตกรมธรรม์ จัดทำใบเสนอราคา ติดตามวันต่ออายุ และประสานงานผ่านแพลตฟอร์มนายหน้าต่างๆ',
    can: [
      'แสดงสรุปเคสวันนี้ กรมธรรม์ใกล้หมดอายุ และยอดเบี้ยรอปิดการขาย (พร้อมรองรับข้อมูลจาก Apps Script: d.captain)',
      'ส่งคำสั่งเช็กเคสและบันทึกเคสประกันใหม่เข้าระบบผ่านบอท'
    ],
    cmds: [['/captain', '🛡️ สรุปเคส Captain'], ['/renewals', '📅 ใกล้ต่ออายุ']],
    with: ['finance', 'tg', 'script'],
    collab: 'ทำงานร่วมกัน: รายรับและค่าคอมมิชชันจากงานประกันส่งให้ Finance รวมในแผนเงินได้ทันที',
    conn: 'พร้อมรับข้อมูลจาก Apps Script (ฟิลด์ d.captain) · หากยังไม่ส่งข้อมูลจะแสดงสถานะรอเชื่อม'
  },
  profit: {
    role: 'Forex Trading Agent',
    duty: 'ดูแล Expert Advisor บน MetaTrader 5 กลยุทธ์ Grid Trading คู่เงิน XAUUSD ระบบ Partial Hedging และการแจ้งเตือนผ่าน Telegram Webhook',
    can: [
      'ติดตามสถานะ EA, กำไรวันนี้, Floating P/L และระดับ Grid/Drawdown (รองรับฟิลด์ d.profit)',
      'ส่งคำสั่งเช็กสถานะ EA ผ่านบอท Telegram'
    ],
    cmds: [['/profit', '📈 สถานะ Take Profit'], ['/ea', '🤖 เช็ก EA MT5']],
    with: ['tg', 'finance', 'script'],
    collab: 'ทำงานร่วมกัน: EA ส่งสรุปผลผ่าน Telegram Webhook เข้า App Script แล้วแสดงผลบนหน้านี้',
    conn: 'พร้อมรับข้อมูลจาก Apps Script (ฟิลด์ d.profit) · หากยังไม่ส่งข้อมูลจะแสดงสถานะรอเชื่อม'
  },
  solar: {
    role: 'Smart Home & Solar Agent',
    duty: 'ดูแลข้อมูลและระบบอัตโนมัติภายในบ้าน เช่น Apple HomeKit โซลาร์รูฟท็อป อินเวอร์เตอร์ แบตเตอรี่ และการประหยัดพลังงาน',
    can: [
      'ติดตามระดับแบตเตอรี่ กำลังผลิตโซลาร์ โหลดไฟฟ้าในบ้าน และสถานะ HomeKit (รองรับฟิลด์ d.solar)',
      'ส่งคำสั่งดึงสถานะโซลาร์/แบตเตอรี่ล่าสุดผ่านบอท'
    ],
    cmds: [['/solar', '☀️ สถานะโซลาร์'], ['/home', '🏠 HomeKit']],
    with: ['script', 'tg'],
    collab: 'ทำงานร่วมกัน: ข้อมูลพลังงานและแจ้งเตือนไฟบ้านส่งผ่าน App Script มาแสดงในหน้านี้',
    conn: 'พร้อมรับข้อมูลจาก Apps Script (ฟิลด์ d.solar) · เพิ่มภาพตัวละคร Solar ในออฟฟิศเรียบร้อยแล้ว'
  },
  health: {
    role: 'Health Analytics Agent',
    duty: 'บันทึกและติดตามผลออกกำลังกายประจำวัน เช่น เดินลู่วิ่งและเล่นดัมเบลล์ ภายใต้โปรเจกต์ take profit',
    can: [
      'แสดงสถิติความต่อเนื่อง (Streak), เวลาออกกำลังกายสัปดาห์นี้ และเป้าหมายประจำวัน (รองรับฟิลด์ d.health)',
      'บันทึกการออกกำลังกายจากฟอร์มในหน้าเว็บได้ทันที'
    ],
    cmds: [['/health', '💪 สรุปสุขภาพ']],
    with: ['tg', 'script'],
    collab: 'ทำงานร่วมกัน: บันทึกออกกำลังกายผ่านเว็บหรือ Telegram แล้วสรุปรายสัปดาห์ในหน้านี้',
    conn: 'พร้อมรับข้อมูลจาก Apps Script (ฟิลด์ d.health) · หากยังไม่ส่งข้อมูลจะแสดงสถานะรอเชื่อม'
  },
  finance: {
    role: 'Personal Finance Agent',
    duty: 'ติดตามภาระรายเดือน เงินสด และยอดค้าง คำนวณว่าวันนี้ต้องหาเท่าไรให้จ่ายทันตามกำหนด และส่งแผนเงินเช้า/ค่ำผ่าน Telegram',
    can: [
      'คำนวณเป้าวันนี้ และเป้าเฉลี่ยต่อวันจนถึงจุดที่ตึงที่สุด',
      'จัดการเงินสด ติ๊กจ่ายแล้ว บันทึกยอดค้างพิเศษ',
      'พยากรณ์หยาบว่าเงินจะไม่พอวันไหน (เมื่อมีรายได้บันทึกพอ)'
    ],
    cmds: [['วันนี้ต้องหาเท่าไร', '🎯 วันนี้ต้องหา'], ['/bills', '🧾 รายการจ่าย'], ['/summary', '📊 สรุปรายได้']],
    with: ['driver', 'tg', 'script'],
    collab: 'ทำงานร่วมกัน: ใช้รายได้ที่ Driver บันทึกมาหักลบกับภาระรายเดือนทุกครั้งที่คำนวณ',
    conn: 'เชื่อมแล้วเมื่อมีตารางรายจ่ายและบันทึกเงินสด'
  },
  script: {
    role: 'Automation (Google Apps Script)',
    duty: 'ตัวเชื่อมกลางของระบบ รับคำสั่งจาก Telegram อ่านและเขียนชีต เรียก API เที่ยวบิน ตั้งเวลาแจ้งเตือน และส่งข้อมูลสถานะมาแสดงในหน้านี้',
    can: [
      'รับและตอบคำสั่งของทุกเอเจนต์',
      'ตั้งเวลาแจ้งเตือนเช้า 07:00 และค่ำ 20:00',
      'เป็นแหล่งข้อมูลของหน้านี้ (ต้องมีรหัส DASH_KEY)'
    ],
    cmds: [['/help', '📖 เมนูคำสั่ง']],
    with: ['tg', 'driver', 'finance'],
    collab: 'จุดที่ทำให้เอเจนต์ทำงานร่วมกัน: ทุกเอเจนต์ที่มีข้อมูลจริงอ่านเขียนชีตเดียวกันผ่านตัวนี้',
    conn: 'เชื่อมแล้วเมื่อหน้านี้ดึงข้อมูลได้ · เพิ่มภาพตัวละคร App Script ในออฟฟิศเรียบร้อยแล้ว'
  },
  tg: {
    role: 'LINE Official Account (@025nqoxp)',
    duty: 'ช่องทางหลักในการพิมพ์ถามและสั่งงานของคุณบน LINE รวมถึงรับแจ้งเตือนสรุปเช้าจากทุกเอเจนต์ (ใช้ Reply API ฟรีไม่จำกัด + ล็อกโควตา Push รายเดือน)',
    can: [
      'พิมพ์คำสั่งหรือประโยคภาษาไทยเรื่องรายได้และการเงินได้ฟรีไม่จำกัด',
      'มีปุ่ม Quick Reply ด้านล่างแชทและส่งสรุปเช้า 07:00 น. อัตโนมัติ',
      'เปิดแดชบอร์ด 3D แบบเชื่อมข้อมูลจริงด้วย /dash'
    ],
    cmds: [['/brief', '🌅 สรุปเช้า'], ['/help', '📖 เมนูคำสั่ง'], ['/bkk', '✈️ BKK']],
    with: ['script', 'finance', 'driver'],
    collab: 'เป็นประตูหน้าบ้านของทุกเอเจนต์ ส่งต่อไปที่ App Script (line.gs)',
    conn: 'เชื่อมแล้วกับ LINE Official Account @025nqoxp'
  }
};

// ---------- การเชื่อมข้อมูล ----------
const CFG = { url: '', key: '' };
try {
  CFG.url = localStorage.getItem('hq_url') || '';
  CFG.key = localStorage.getItem('hq_key') || '';
} catch (e) {}

(function () {
  try {
    const hp = new URLSearchParams(location.hash.replace(/^#/, ''));
    const u = hp.get('u') || '';
    const k = hp.get('k') || '';
    if (u.indexOf('https://script.google.com/macros/s/') === 0 && /\/exec$/.test(u) && k.length >= 16) {
      CFG.url = u;
      CFG.key = k;
      try {
        localStorage.setItem('hq_url', u);
        localStorage.setItem('hq_key', k);
      } catch (e2) {}
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch (e3) {}
    }
  } catch (e) {}
})();

function setBubble(id, t) {
  const g = document.getElementById('bb-' + id);
  if (!g) return;
  const x = g.querySelector('text');
  const r = g.querySelector('rect');
  if (!x || !r) return;
  const cx = Number(x.getAttribute('x'));
  const w = Math.max(76, t.length * 7.8 + 24);
  r.setAttribute('width', w);
  r.setAttribute('x', cx - w / 2);
  x.textContent = t;
}

function setSt(map) {
  S.forEach(s => {
    const t = map[s.id] || ST0;
    s.st = t;
    const e = $('ms-' + s.id);
    if (e) e.textContent = t;
    setBubble(s.id, t);
  });
  if (window.OFFICE3D) window.OFFICE3D.syncStatus(map);
}

function chip(color, t) {
  const s = E('span');
  const i = E('i');
  i.style.background = color;
  s.appendChild(i);
  s.appendChild(document.createTextNode(t));
  return s;
}

function setEv(list) {
  const e = $('evp');
  e.textContent = '';
  list.forEach(c => e.appendChild(chip(c[0], c[1])));
}

function setLog(list, msg) {
  const lg = $('log');
  lg.textContent = '';
  if (!list || !list.length) {
    lg.appendChild(E('li', '', msg || 'ยังไม่มีเหตุการณ์'));
    return;
  }
  list.slice().reverse().forEach(r => {
    const li = E('li');
    const t = E('time', '', r.t);
    const i = E('i');
    const sp = E('span', '', r.m);
    i.style.background = '#4fd1ff';
    li.append(t, i, sp);
    lg.appendChild(li);
  });
}

function setConn(kind, t) {
  $('conn').textContent = kind === 'on' ? 'เชื่อมแล้ว ' + t : kind === 'err' ? 'เชื่อมไม่สำเร็จ' : 'เชื่อมข้อมูลจริง';
  $('connDot').className = 'cdot ' + kind;
  const tt = kind === 'err'
    ? 'เชื่อมไม่สำเร็จ: ' + t
    : kind === 'on'
      ? 'เชื่อมแล้ว อัปเดตล่าสุด ' + t + ' น.'
      : 'ยังไม่ได้เชื่อมข้อมูลจริง';
  $('cfgBtn').title = tt;
  $('cfgBtn').setAttribute('aria-label', tt + ' กดเพื่อตั้งค่า');
}

function fl(k, f) {
  if (!f || f.live === null) return ['#8b97b8', k + ': ยังไม่มีข้อมูลล่าสุด (พิมพ์ /' + k.toLowerCase() + ' ในบอทเพื่ออัปเดต)'];
  return [
    f.live ? '#5ee08a' : '#ffb347',
    k + ': ลงแล้ว ' + f.landed + ' · กำลังจะลง ' + f.upcoming + (f.next ? ' (ถัดไป ' + f.next + ')' : '') + (f.live ? ' · ข้อมูลสด' : ' · ข้อมูลสำรองจากชีต')
  ];
}

function showOff() {
  setSt({
    driver: 'ตัวอย่าง · 7 เที่ยว',
    captain: 'ตัวอย่าง · 18 เคส',
    profit: 'ตัวอย่าง · XAUUSD',
    solar: 'ตัวอย่าง · แบต 94%',
    health: 'ตัวอย่าง · 3/3 วัน',
    finance: 'ตัวอย่าง · เป้า 4,760',
    script: 'โหมดตัวอย่าง',
    tg: 'ยังไม่เชื่อมข้อมูล'
  });
  setEv([['#8b97b8', 'ยังไม่เชื่อมข้อมูล (กดปุ่มขวาบนเพื่อเชื่อม)']]);
  setLog(SAMPLE.log, 'ยังไม่เชื่อมข้อมูล');
  setConn('off');
  renderTabs(SAMPLE, true);
}

function applyData(d) {
  const j = d.jobs;
  const b = d.bot;
  const e = d.errors;
  const inc = d.income && d.income.today;
  const st = {};
  st.driver = inc && inc.length
    ? 'วันนี้ ' + inc.reduce((a, x) => a + x.n, 0) + ' รายการ · ' + fmt(inc.reduce((a, x) => a + x.gross, 0)) + ' บาท'
    : (j ? 'วันนี้ ' + j.count + ' เที่ยว' : 'ยังไม่มีชีตบันทึกงาน');
  st.finance = d.budget && !d.budget.err
    ? (d.budget.target > 0 ? 'เป้าวันนี้ ' + fmt(d.budget.target) + ' บาท' : (d.budget.shortNow > 0 ? 'ขาด ' + fmt(d.budget.shortNow) + ' บาท' : 'ไม่มียอดตึง'))
    : 'ยังไม่มีแผนเงิน';
  st.tg = b && b.lastSeenMin != null
    ? (b.lastSeenMin < 60 ? 'ข้อความล่าสุด ' + b.lastSeenMin + ' นาทีที่แล้ว' : 'เงียบมา ' + Math.floor(b.lastSeenMin / 60) + ' ชม.')
    : 'ยังไม่มีข้อความ';
  st.script = e && e.ageMin < 1440 ? 'มีข้อผิดพลาดล่าสุด ' + e.t + ' น.' : 'ตอบสนองปกติ';
  if (d.captain) st.captain = 'เคสวันนี้: ' + (d.captain.casesToday ?? 0) + ' · ต่ออายุ ' + (d.captain.renewals ?? 0);
  if (d.profit) st.profit = (d.profit.eaOn ? 'EA ทำงาน' : 'EA หยุด') + (d.profit.dayPl != null ? ' · ' + (d.profit.dayPl >= 0 ? '+' : '') + d.profit.dayPl + '$' : '');
  if (d.solar) st.solar = 'Self-powered ' + (d.solar.battery ?? '—') + '% · ผลิต ' + (d.solar.solarKw ?? '—') + ' kWh';
  if (d.health) st.health = 'ต่อเนื่อง ' + (d.health.streak ?? 0) + ' วัน' + (d.health.todayDone ? ' · สำเร็จแล้ว' : '');

  setSt(st);
  const ev = [fl('BKK', d.flights && d.flights.BKK), fl('DMK', d.flights && d.flights.DMK)];
  ev.push(e ? ['#ff6b6b', 'ข้อผิดพลาดล่าสุด ' + e.t + ' น.: ' + e.m] : ['#5ee08a', 'ไม่มีข้อผิดพลาดที่บันทึกไว้']);
  setEv(ev);
  setLog(d.log, 'ยังไม่มีเหตุการณ์ (ลองสั่งงานในบอท)');
  renderTabs(d, false);
}

function jsonp(u) {
  return new Promise((res, rej) => {
    const cb = 'hq_cb_' + Date.now();
    const sc = document.createElement('script');
    const t = setTimeout(() => { cleanup(); rej(new Error('หมดเวลา')); }, 12000);
    function cleanup() { clearTimeout(t); delete window[cb]; sc.remove(); }
    window[cb] = d => { cleanup(); res(d); };
    sc.onerror = () => { cleanup(); rej(new Error('โหลดไม่ได้')); };
    sc.src = u + '&callback=' + cb;
    document.head.appendChild(sc);
  });
}

let lastPull = 0;
async function pull(force) {
  if (!CFG.url || !CFG.key) { showOff(); return; }
  if (!force && Date.now() - lastPull < 20000) return;
  lastPull = Date.now();
  const rb = $('refreshBtn');
  if (rb) rb.classList.add('spin');
  const u = CFG.url + (CFG.url.indexOf('?') >= 0 ? '&' : '?') + 'action=status&k=' + encodeURIComponent(CFG.key);
  let d = null;
  let err = '';
  try {
    const r = await fetch(u, { redirect: 'follow' });
    d = await r.json();
  } catch (e1) {
    try { d = await jsonp(u); } catch (e2) { err = e2.message || 'เชื่อมต่อไม่ได้'; }
  } finally {
    if (rb) rb.classList.remove('spin');
  }
  if (d && d.ok) { applyData(d); setConn('on', d.now); return; }
  const msg = d
    ? (d.error === 'unauthorized' ? 'รหัส DASH_KEY ไม่ถูกต้อง หรือยังไม่ได้ตั้งใน Script properties' : d.error || 'ตอบกลับไม่ถูกต้อง')
    : err;
  setSt({});
  setEv([['#ff6b6b', msg]]);
  setLog(null, msg);
  setConn('err', msg);
  renderTabs(null, msg);
}

let timer = null;
function startPoll() {
  clearInterval(timer);
  pull(true);
  // รีเฟรชอัตโนมัติทุก 5 นาที (ประหยัดโควตา Apps Script กว่าเดิม 60% และยังกด 🔄 รีเฟรชได้ทันที)
  timer = setInterval(() => { if (document.visibilityState === 'visible') pull(); }, 300000);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && CFG.url && Date.now() - lastPull > 60000) pull();
});

// Config dialog
const cd = $('cfgd');
function cfgOpen() {
  $('cfgUrl').value = CFG.url;
  $('cfgKey').value = '';
  $('cfgMsg').textContent = CFG.key ? 'มีรหัสบันทึกไว้แล้ว (เว้นว่างช่องรหัสถ้าไม่ต้องการเปลี่ยน)' : '';
  cd.classList.add('on');
  $('cfgUrl').focus();
}
function cfgClose() { cd.classList.remove('on'); $('cfgBtn').focus(); }
$('cfgBtn').onclick = cfgOpen;
$('cfgClose').onclick = cfgClose;
$('cfgSave').onclick = () => {
  const u = $('cfgUrl').value.trim();
  const k = $('cfgKey').value.trim() || CFG.key;
  if (u.indexOf('https://script.google.com/macros/s/') !== 0 || !/\/exec$/.test(u)) {
    $('cfgMsg').textContent = 'ลิงก์ต้องขึ้นต้นด้วย https://script.google.com/macros/s/ และลงท้ายด้วย /exec';
    return;
  }
  if (k.length < 16) {
    $('cfgMsg').textContent = 'รหัสสั้นเกินไป (ควรยาวอย่างน้อย 16 ตัวอักษร)';
    return;
  }
  CFG.url = u;
  CFG.key = k;
  try { localStorage.setItem('hq_url', u); localStorage.setItem('hq_key', k); } catch (e) {}
  cfgClose();
  startPoll();
};
$('cfgOff').onclick = () => {
  CFG.url = '';
  CFG.key = '';
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  try { localStorage.removeItem('hq_url'); localStorage.removeItem('hq_key'); } catch (e) {}
  clearInterval(timer);
  cfgClose();
  showOff();
};

// ---------- วาดหน้า ----------
function none(box, t) { box.textContent = ''; box.appendChild(E('p', 'muted', t)); }

function drawHero(d) {
  const h = $('hero');
  const b = d.budget;
  h.textContent = '';
  h.appendChild(E('small', '', '🎯 วันนี้ต้องหา'));
  if (!b || b.err) {
    h.appendChild(E('div', 'big', '—'));
    h.appendChild(E('small', '', b && b.err ? b.err : 'ยังไม่มีข้อมูลแผนเงิน (อัปเดตสคริปต์เป็น v10 และมีตารางรายจ่าย)'));
    return;
  }
  const big = b.target > 0 ? b.target : (b.shortNow > 0 ? b.shortNow : 0);
  h.appendChild(E('div', 'big', big > 0 ? fmt(big) : 'พอแล้ว 🎉'));
  h.appendChild(E('small', '', b.target > 0 && b.best
    ? 'บาท/วัน ให้ครบทุกรายการตรงเวลาถึง ' + b.best.label
    : (b.shortNow > 0 ? 'บาท เพื่อปิดยอดค้างวันนี้' : 'เงินสดพอจ่ายทุกรายการที่ประเมินได้')));
  if (b.target > 0 && b.shortNow > 0) {
    h.appendChild(E('div', '', '')).appendChild(E('small', '', 'ปิดยอดค้างวันนี้ต้องหา ' + fmt(b.shortNow) + ' บาท'));
  }
  const goal = b.shortNow > 0 ? b.shortNow : b.target;
  if (goal > 0) {
    const pct = Math.min(100, Math.round((b.earned || 0) / goal * 100));
    const bar = E('div', 'bar');
    const i = E('i');
    i.style.width = pct + '%';
    bar.appendChild(i);
    h.appendChild(bar);
    h.appendChild(E('small', '', 'หาได้วันนี้ ' + fmt(b.earned || 0) + ' / ' + fmt(goal) + ' บาท (' + pct + '%)'));
  }
  const c = E('div', 'hchips');
  c.appendChild(E('span', '', 'ค้าง/ครบวันนี้ ' + fmt(b.nowSum)));
  c.appendChild(E('span', b.noCash ? 'w' : '', b.noCash ? 'ยังไม่บันทึกเงินสด' : 'เงินสด ' + fmt(b.cash)));
  h.appendChild(c);
}

function frow(f, ap) {
  const isSoon = typeof f.d === 'number' && f.d >= 0 && f.d <= 30;
  const r = E('div', 'row' + (isSoon ? ' soon' : ''));
  r.appendChild(E('div', 't', f.est || '--:--'));
  const m = E('div');
  m.appendChild(E('div', '', f.code + ' · ' + ap + (f.route ? ' · ' + f.route : '')));
  m.appendChild(E('div', 's',
    (f.st || '') +
    (f.dl ? '  ' + f.dl : '') +
    (typeof f.d === 'number' ? (f.d > 0 ? '  · อีก ' + f.d + ' นาที' : '  · ผ่านมา ' + (-f.d) + ' นาที') : '')
  ));
  r.appendChild(m);
  return r;
}

function kpi(icon, label, val, sub, cls, k) {
  const e = E('div', 'kpi' + (cls ? ' ' + cls : ''));
  e.dataset.k = k;
  e.tabIndex = 0;
  e.setAttribute('role', 'button');
  e.appendChild(E('div', 'kl', icon + ' ' + label));
  e.appendChild(E('div', 'kv', val));
  if (sub) e.appendChild(E('div', 'ks', sub));
  e.onclick = () => showDetail(SEL === k ? null : k);
  e.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); e.onclick(); } };
  return e;
}

function drawSummary(d) {
  const box = $('kpis');
  box.textContent = '';
  const b = d.budget;
  const j = d.jobs;
  const ok = b && !b.err;
  const inc = d.income && d.income.today;
  box.appendChild(kpi('⚠️', 'ค้าง/ครบวันนี้', ok ? fmt(b.nowSum) : '—', ok ? (b.shortNow > 0 ? 'ขาดเงินสด ' + fmt(b.shortNow) : 'เงินสดพอจ่าย') : '', ok && b.nowSum > 0 ? 'bad' : '', 'late'));
  box.appendChild(kpi('💵', 'เงินสด', ok ? (b.noCash ? 'ยังไม่บันทึก' : fmt(b.cash)) : '—', ok && b.noCash ? 'พิมพ์ เงินสด ... ในบอท' : '', '', 'cash'));
  const tot = inc ? inc.reduce((a, x) => a + x.gross, 0) : (j ? j.gross : null);
  const n = inc ? inc.reduce((a, x) => a + x.n, 0) : (j ? j.count : 0);
  box.appendChild(kpi('📥', 'รายได้วันนี้', tot === null ? '—' : fmt(tot), tot === null ? 'ยังไม่มีชีตบันทึกงาน' : (inc && inc.length ? inc.map(x => x.app + ' ' + x.n).join(' · ') : n + ' รายการ'), '', 'income'));
  let nf = null;
  ['BKK', 'DMK'].forEach(ap => {
    const f = d.flights && d.flights[ap];
    if (f && f.list) f.list.up.forEach(x => { if (!nf || x.d < nf[1].d) nf = [ap, x]; });
  });
  box.appendChild(kpi('✈️', 'เที่ยวบินถัดไป', nf ? nf[1].est + ' ' + nf[1].code : '—', nf ? nf[0] + (typeof nf[1].d === 'number' ? ' · อีก ' + nf[1].d + ' นาที' : '') : 'พิมพ์ /bkk ในบอทเพื่ออัปเดต', '', 'flight'));
  const n1 = ok && b.up && b.up[0];
  box.appendChild(kpi('📅', 'ภาระถัดไป', n1 ? fmt(n1.sum) : '—', n1 ? n1.label + ' · ' + n1.items[0].n : '', '', 'due'));
  const bot = d.bot;
  const e = d.errors;
  let sv = '—';
  let ss = 'ยังไม่เชื่อมข้อมูล';
  let cls = '';
  if (bot) {
    sv = bot.lastSeenMin == null ? 'ยังไม่มีข้อความ' : (bot.lastSeenMin < 60 ? bot.lastSeenMin + ' นาที' : Math.floor(bot.lastSeenMin / 60) + ' ชม.');
    ss = 'ข้อความล่าสุดถึงบอท';
    if (e && e.ageMin < 1440) { ss = 'ข้อผิดพลาดล่าสุด ' + e.t + ' น.'; cls = 'bad'; }
  }
  box.appendChild(kpi('🤖', 'บอท', sv, ss, cls, 'bot'));
}

function drawFlights(d) {
  const box = $('flBoards');
  const cbox = $('flCards');
  box.textContent = '';
  if (cbox) cbox.textContent = '';
  const names = { BKK: 'สุวรรณภูมิ (BKK)', DMK: 'ดอนเมือง (DMK)' };
  ['BKK', 'DMK'].forEach(ap => {
    const f = d.flights && d.flights[ap];
    const pn = E('div', 'pn');
    const b = E('b', '', names[ap]);
    if (f && f.live !== null && f.live !== undefined) b.appendChild(E('span', 'tag', f.live ? 'ข้อมูลสด' : 'ข้อมูลสำรองจากชีต'));
    pn.appendChild(b);
    if (!f || !f.list) {
      pn.appendChild(E('p', 'muted', 'ยังไม่มีข้อมูลล่าสุด กดปุ่ม ＋ เพื่ออัปเดต'));
    } else {
      pn.appendChild(E('div', 'muted', 'กำลังจะลง (ไฮไลต์ฟ้า = ภายใน 30 นาที)'));
      f.list.up.forEach(x => pn.appendChild(frow(x, ap)));
      if (!f.list.up.length) pn.appendChild(E('p', 'muted', 'ไม่มี'));
      pn.appendChild(E('div', 'muted', 'ลงแล้วล่าสุด'));
      f.list.landed.forEach(x => pn.appendChild(frow(x, ap)));
      if (!f.list.landed.length) pn.appendChild(E('p', 'muted', 'ไม่มี'));
    }
    box.appendChild(pn);

    // การ์ดรายละเอียดเที่ยวบิน (ก่อนหน้าเวลาปัจจุบัน 4 ลำ + ถัดไป 2 ลำ)
    if (cbox) {
      const cpn = E('div', 'pn');
      const cb = E('b', '', names[ap] + ' · การ์ดเที่ยวบิน');
      if (f && f.live !== null && f.live !== undefined) cb.appendChild(E('span', 'tag', f.live ? 'ข้อมูลสด' : 'สำรอง'));
      cpn.appendChild(cb);
      if (!f || !f.list) {
        cpn.appendChild(E('p', 'muted', 'ยังไม่มีข้อมูลล่าสุด กดปุ่มอัปเดตเที่ยวบินก่อน'));
      } else {
        const makeCard = (x, isLanded) => {
          const card = E('div', 'fl-card' + (isLanded ? ' landed' : ''));
          const rel = typeof x.d === 'number'
            ? (x.d <= 0 ? ('ลงแล้ว ' + Math.abs(x.d) + ' นาที ที่แล้ว') : ('อีก ' + x.d + ' นาที'))
            : '';
          const stFull = [x.st || '-', rel, x.dl || ''].filter(Boolean).join(' · ');
          const estTxt = (x.est || '-') + (isLanded ? ' (ลงจริง)' : '');
          const rows = [
            ['✈️ รหัสเที่ยวบิน :', x.code || '-'],
            ['🏢 สนามบิน :', names[ap]],
            ['🛫 ต้นทาง :', x.route || '-'],
            ['🕐 เวลาตามตาราง :', x.sched || '-'],
            ['⏰ เวลาคาดการณ์ :', estTxt],
            ['📌 สถานะ :', stFull],
            ['🏷 สายการบิน :', x.airline || '-'],
            ['🛩 ประเภทเครื่องบิน :', x.craft || '-']
          ];
          rows.forEach(([k, v]) => {
            const ln = E('div', 'fl-card-ln');
            ln.appendChild(E('b', '', k));
            ln.appendChild(E('span', '', v));
            card.appendChild(ln);
          });
          return card;
        };

        cpn.appendChild(E('div', 'muted', 'ลงแล้วก่อนหน้า (4 ลำล่าสุด)'));
        const lWrap = E('div', 'fl-cards-list');
        const landed4 = (f.list.landed || []).slice(0, 4);
        if (landed4.length) landed4.forEach(x => lWrap.appendChild(makeCard(x, true)));
        else lWrap.appendChild(E('p', 'muted', 'ไม่มี'));
        cpn.appendChild(lWrap);

        const upHead = E('div', 'muted', 'กำลังจะลงถัดไป (2 ลำ)');
        upHead.style.marginTop = '12px';
        cpn.appendChild(upHead);
        const uWrap = E('div', 'fl-cards-list');
        const up2 = (f.list.up || []).slice(0, 2);
        if (up2.length) up2.forEach(x => uWrap.appendChild(makeCard(x, false)));
        else uWrap.appendChild(E('p', 'muted', 'ไม่มี'));
        cpn.appendChild(uWrap);
      }
      cbox.appendChild(cpn);
    }
  });
}

function svgEl(svg, n, at, t) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', n);
  for (const k in at) e.setAttribute(k, at[k]);
  if (t != null) e.textContent = t;
  svg.appendChild(e);
  return e;
}

function drawMoney(d) {
  const b = d.budget;
  const pb = $('planBox');
  const tl = $('tl');
  const inc = $('inc');
  const bl = $('bills');
  [pb, tl, inc, bl].forEach(x => { x.textContent = ''; });

  if (!b || b.err) {
    none(pb, b && b.err ? b.err : 'ยังไม่มีข้อมูลแผนเงิน');
    none(tl, '—');
  } else {
    pb.appendChild(E('div', 'ln2', '💵 เงินสดตั้งต้น ' + fmt(b.cash) + ' บาท' + (b.noCash ? ' (ยังไม่ได้บันทึก คิดเป็น 0)' : '')));
    b.overdue.forEach(o => pb.appendChild(E('div', 'ln2', '⚠️ ' + o.name + ' ' + fmt(o.amt) + (o.late ? ' (เลยกำหนด)' : ' (ครบวันนี้)'))));
    if (b.shortNow > 0) pb.appendChild(E('div', 'ln2', '🔻 ขาดเพื่อปิดยอดค้างวันนี้ ' + fmt(b.shortNow) + ' บาท'));
    if (b.target > 0 && b.best) pb.appendChild(E('div', 'ln2', '🎯 เฉลี่ยวันละ ' + fmt(b.target) + ' บาท ถึง ' + b.best.label + ' (สะสม ' + fmt(b.best.cum) + ' · เหลือ ' + b.best.days + ' วัน)'));
    if (b.avg) pb.appendChild(E('div', 'ln2', '📈 รายได้เฉลี่ยที่บันทึก ' + fmt(b.avg) + ' บาท/วัน' + (b.fc ? ' → ถ้าเท่าเดิม เงินไม่พอครั้งแรก ' + b.fc.label + ' (ขาด ~' + fmt(b.fc.short) + ')' : ' → พอจ่ายครบในช่วงที่ประเมิน')));
    pb.appendChild(E('p', 'muted', 'ไม่รวมค่าน้ำมัน/ชาร์จ EV/อาหาร และไม่ใช่คำแนะนำทางการเงิน'));

    const mx = Math.max(b.nowSum || 0, ...b.up.map(x => x.sum), 1);
    const row = (lab, sum, cls, txt) => {
      const r = E('div', 'tl');
      r.appendChild(E('span', '', lab));
      const bar = E('div', 'tlb' + (cls ? ' ' + cls : ''), txt);
      bar.style.width = Math.max(22, Math.round(sum / mx * 100)) + '%';
      r.appendChild(bar);
      tl.appendChild(r);
    };
    if (b.nowSum > 0) row('ค้างตอนนี้', b.nowSum, 'bad', fmt(b.nowSum));
    b.up.forEach(x => row(x.label, x.sum, b.best && x.label === b.best.label ? 'hot' : '', fmt(x.sum) + ' · ' + x.items.slice(0, 2).map(i => i.n).join(', ') + (x.items.length > 2 ? ' +' + (x.items.length - 2) : '')));
    if (!b.nowSum && !b.up.length) none(tl, 'ไม่มีภาระใน 30 วันข้างหน้า');
  }

  const a = d.daily;
  if (!a) {
    none(inc, 'ยังไม่มีข้อมูล');
  } else {
    const tgt = (b && b.target) || 0;
    const mx = Math.max(tgt, ...a.map(x => x.v), 1);
    const svg = svgEl({ appendChild() {} }, 'svg', {});
    svg.setAttribute('viewBox', '0 0 320 130');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'รายได้ 7 วันล่าสุด');
    svg.style.width = '100%';
    a.forEach((x, i) => {
      const bh = Math.round(x.v / mx * 88);
      const X = 8 + i * 44;
      svgEl(svg, 'rect', { x: X, y: 100 - bh, width: 34, height: bh || 1, fill: i === 6 ? '#5ee08a' : '#3a4d94' });
      svgEl(svg, 'text', { x: X + 17, y: 114, 'text-anchor': 'middle', 'font-size': 10, fill: '#8b97b8' }, x.d);
      if (x.v) svgEl(svg, 'text', { x: X + 17, y: 96 - bh, 'text-anchor': 'middle', 'font-size': 9, fill: '#e8eefc' }, fmt(x.v));
    });
    if (tgt) {
      const y = 100 - Math.round(tgt / mx * 88);
      svgEl(svg, 'line', { x1: 0, x2: 320, y1: y, y2: y, stroke: '#ffd166', 'stroke-dasharray': '4 3' });
      svgEl(svg, 'text', { x: 318, y: y - 3, 'text-anchor': 'end', 'font-size': 9, fill: '#ffd166' }, 'เป้า ' + fmt(tgt));
    }
    inc.appendChild(svg);
  }

  if (!d.bills) none(bl, 'ยังไม่มีตารางรายจ่าย');
  else d.bills.forEach(x => {
    const r = E('div', 'row');
    const t = E('div', 't', 'วันที่ ' + x.day);
    t.style.fontSize = '11px';
    r.appendChild(t);
    r.appendChild(E('div', '', (x.paid ? '✅ ' : x.late ? '🔴 ' : '🟡 ') + x.name + ' · ' + fmt(x.amt)));
    bl.appendChild(r);
  });
}

// ---------- การ์ดโมดูลเอเจนต์อื่นๆ (Captain, Take Profit, Solar, Healthy) ----------
function agMetric(label, val, cls) {
  const m = E('div', 'ag-m');
  m.appendChild(E('small', '', label));
  m.appendChild(E('b', cls || '', val));
  return m;
}

function drawExtendedAgents(d, mode) {
  const box = $('agentBoards');
  if (!box) return;
  box.textContent = '';
  const isSample = mode === true;

  const cards = [
    {
      id: 'captain',
      icon: '🛡️',
      title: 'Captain · ประกันภัย',
      color: '#6ea8ff',
      data: d.captain,
      render(c, body) {
        const g = E('div', 'ag-metrics');
        g.appendChild(agMetric('เคสวันนี้', String(c.casesToday ?? 0) + ' เคส'));
        g.appendChild(agMetric('ใกล้ต่ออายุ (30 วัน)', String(c.renewals ?? 0) + ' ราย'));
        g.appendChild(agMetric('ใบเสนอราคารอปิด', String(c.quotesPending ?? 0)));
        g.appendChild(agMetric('เบี้ยสะสมเดือนนี้', fmt(c.premiumMonth || 0) + ' ฿'));
        body.appendChild(g);
        if (c.note) body.appendChild(E('p', 'muted', c.note));
      },
      actions: [['/captain', '🔄 เช็กเคส'], ['f:captain', '➕ เพิ่มเคส']]
    },
    {
      id: 'profit',
      icon: '📈',
      title: 'Take Profit · MT5',
      color: '#ffb347',
      data: d.profit,
      render(p, body) {
        const g = E('div', 'ag-metrics');
        const pl = Number(p.dayPl || 0);
        const flt = Number(p.floating || 0);
        g.appendChild(agMetric('คู่เงิน / สถานะ', (p.pair || 'XAUUSD') + ' · ' + (p.eaOn ? 'ON' : 'OFF'), p.eaOn ? 'pos' : 'neg'));
        g.appendChild(agMetric('กำไรวันนี้', (pl >= 0 ? '+' : '') + pl.toFixed(2) + ' $', pl >= 0 ? 'pos' : 'neg'));
        g.appendChild(agMetric('Floating P/L', (flt >= 0 ? '+' : '') + flt.toFixed(2) + ' $', flt >= 0 ? 'pos' : 'neg'));
        g.appendChild(agMetric('Grid / Drawdown', 'L' + (p.gridLevel ?? 0) + ' · DD ' + (p.ddPct ?? 0) + '%'));
        body.appendChild(g);
        if (p.note) body.appendChild(E('p', 'muted', p.note));
      },
      actions: [['/profit', '🔄 อัปเดต EA'], ['/ea', '🤖 สถานะ MT5']]
    },
    {
      id: 'solar',
      icon: '☀️',
      title: 'Solar · BlueRing',
      color: '#ffe066',
      data: d.solar,
      render(s, body) {
        const pct = Math.max(0, Math.min(100, Number(s.battery || 0)));
        const g = E('div', 'ag-metrics');
        const subFee = s.subFee != null ? Number(s.subFee) : 699;
        const netSav = s.netSaved != null ? Number(s.netSaved) : (Number(s.savedThb || 0) - subFee);
        g.appendChild(agMetric('Self-powered', pct + '%', pct >= 20 ? 'pos' : ''));
        g.appendChild(agMetric('ผลิต / ใช้ไฟ (kWh)', (s.solarKw ?? 0) + ' / ' + (s.loadKw ?? 0)));
        g.appendChild(agMetric('ประหยัดรอบบิล', fmt(s.savedThb || 0) + ' ฿', 'pos'));
        g.appendChild(agMetric('สุทธิหลังหัก ' + subFee + ' ฿', (netSav >= 0 ? '+' : '') + fmt(netSav) + ' ฿', netSav >= 0 ? 'pos' : 'neg'));
        body.appendChild(g);
        const bar = E('div', 'ag-bar');
        const fill = E('i');
        fill.style.width = pct + '%';
        bar.appendChild(fill);
        body.appendChild(bar);
        if (s.monthly && s.monthly.length) {
          const list = s.monthly.slice().reverse();
          const row = E('div', 'frow');
          row.style.margin = '4px 0';
          const sel = E('select');
          sel.setAttribute('aria-label', 'เลือกดูเดือนย้อนหลัง Solar');
          list.forEach((m, idx) => {
            const opt = E('option', '', '📅 เดือน ' + m.m + (m.saved > 0 ? ' · ประหยัด ' + fmt(m.saved) + ' ฿' : ' · กฟน. ' + fmt(m.net) + ' หน่วย'));
            opt.value = String(idx);
            sel.appendChild(opt);
          });
          const mBox = E('div', 'note');
          const showM = idx => {
            const m = list[idx] || list[0];
            const netM = m.saved > 0 ? (m.saved - subFee) : 0;
            mBox.textContent = m.saved > 0
              ? ('ผลิต ' + m.prod + ' kWh · กฟน. ' + fmt(m.net) + ' หน่วย · ประหยัด ' + fmt(m.saved) + ' ฿ (สุทธิ ' + (netM >= 0 ? '+' : '') + fmt(netM) + ' ฿)' + (m.note ? ' · ' + m.note : ''))
              : ('กฟน. ' + fmt(m.net) + ' หน่วย' + (m.note ? ' · ' + m.note : ''));
          };
          sel.onchange = () => showM(Number(sel.value));
          showM(0);
          row.appendChild(sel);
          body.appendChild(row);
          body.appendChild(mBox);
        }
        if (s.forecast) {
          body.appendChild(E('div', 'note', '🔮 คาดการณ์ ' + s.forecast.month + ': บิลไฟ ~' + fmt(s.forecast.estBill) + ' ฿ · ประหยัด TOU ~' + fmt(s.forecast.estSaved) + ' ฿ (สุทธิ +' + fmt(s.forecast.estNet) + ' ฿)'));
        }
        if (s.note) body.appendChild(E('p', 'muted', s.note));
      },
      actions: [['/solar', '🔄 เช็กโซลาร์'], ['f:solar', '✏️ อัปเดต BlueRing']]
    },
    {
      id: 'health',
      icon: '💪',
      title: 'Healthy · ออกกำลังกาย',
      color: '#ff8ad8',
      data: d.health,
      render(h, body) {
        const g = E('div', 'ag-metrics');
        g.appendChild(agMetric('ต่อเนื่อง (Streak)', (h.streak ?? 0) + ' วัน', 'pos'));
        g.appendChild(agMetric('สัปดาห์นี้', (h.weekDays ?? 0) + '/' + (h.weekGoal ?? 5) + ' วัน'));
        g.appendChild(agMetric('เวลารวมสัปดาห์นี้', (h.weekMin ?? 0) + ' นาที'));
        g.appendChild(agMetric('วันนี้', h.todayDone ? '✅ ' + (h.todayActivity || 'สำเร็จ') : '⏳ ยังไม่ได้บันทึก'));
        body.appendChild(g);
        const pct = Math.min(100, Math.round(((h.weekDays || 0) / Math.max(1, h.weekGoal || 5)) * 100));
        const bar = E('div', 'ag-bar');
        const fill = E('i');
        fill.style.width = pct + '%';
        bar.appendChild(fill);
        body.appendChild(bar);
        if (h.note) body.appendChild(E('p', 'muted', h.note));
      },
      actions: [['/health', '🔄 สรุปสุขภาพ'], ['f:health', '➕ บันทึกออกกำลังกาย']]
    }
  ];

  cards.forEach(cfg => {
    const card = E('div', 'ag-card');
    card.style.setProperty('--k', cfg.color);
    const head = E('div', 'ag-ch');
    const title = E('strong', '', cfg.icon + ' ' + cfg.title);
    const hasData = !!cfg.data;
    const badge = E('span', 'ag-badge ' + (isSample ? 'sample' : (hasData ? 'live' : '')),
      isSample ? 'ตัวอย่าง' : (hasData ? 'เชื่อมแล้ว' : 'รอเชื่อมข้อมูล'));
    head.append(title, badge);
    card.appendChild(head);

    if (hasData) {
      cfg.render(cfg.data, card);
    } else {
      card.appendChild(E('p', 'muted', 'ยังไม่มีข้อมูลจาก Apps Script (รองรับฟิลด์ d.' + cfg.id + ' ใน JSON ตอบกลับของ action=status)'));
    }

    const foot = E('div', 'ag-foot');
    cfg.actions.forEach(a => {
      if (a[0].startsWith('f:')) {
        const fk = a[0].slice(2);
        const btn = E('button', 'pill', a[1]);
        btn.onclick = () => mountCard($('actAgents'), fk, FORMS[fk][0], FORMS[fk][1]);
        foot.appendChild(btn);
      } else {
        const btn = E('button', 'pill', a[1]);
        btn.onclick = () => mountCard($('actAgents'), 'q' + a[0], a[1], quick(a[0]));
        foot.appendChild(btn);
      }
    });
    const detailBtn = E('button', 'pill', 'ℹ️ รายละเอียด');
    detailBtn.onclick = () => openAgent(cfg.id);
    foot.appendChild(detailBtn);
    card.appendChild(foot);
    box.appendChild(card);
  });
}

// ---------- ข้อมูลตัวอย่าง (Sample Data) ----------
const SAMPLE = {
  bot: { lastSeenMin: 3 },
  jobs: { count: 7, grab: 4, bolt: 3, gross: 1250 },
  income: {
    today: [
      { app: 'Grab', n: 4, fare: 700, tip: 50, gross: 750 },
      { app: 'Bolt', n: 2, fare: 350, tip: 0, gross: 350 },
      { app: 'inDrive', n: 1, fare: 150, tip: 0, gross: 150 }
    ],
    week: [
      { app: 'Grab', n: 19, gross: 4200 },
      { app: 'Bolt', n: 9, gross: 1900 },
      { app: 'inDrive', n: 3, gross: 450 }
    ],
    list: [
      { t: '18:40', p: 'Grab', o: 'ตัวอย่าง A', d: 'ตัวอย่าง B', fare: 250, tip: 20 },
      { t: '17:05', p: 'Bolt', o: '-', d: '-', fare: 150, tip: 0 }
    ]
  },
  budget: {
    cash: 6472,
    cashInfo: { v: 6472, ts: 'ตัวอย่าง', since: 0 },
    nowSum: 16088,
    shortNow: 9616,
    target: 4760,
    best: { label: 'อ. 1 ธ.ค.', cum: 77788, days: 15 },
    earned: 1250,
    overdue: [
      { name: 'ค่าผ่อนรถ (ตัวอย่าง)', amt: 12088, late: true },
      { name: 'หนี้ค้าง (ตัวอย่าง)', amt: 4000, late: true }
    ],
    up: [
      { dn: 9, label: 'พ. 25 พ.ย.', sum: 9700, items: [{ n: 'ค่าคอนโด (ตัวอย่าง)', a: 9700 }] },
      { dn: 15, label: 'อ. 1 ธ.ค.', sum: 52000, items: [{ n: 'รายการ A', a: 30000 }, { n: 'รายการ B', a: 12000 }, { n: 'รายการ C', a: 10000 }] },
      { dn: 17, label: 'พฤ. 3 ธ.ค.', sum: 4556, items: [{ n: 'รายการ D', a: 3000 }, { n: 'รายการ E', a: 1556 }] }
    ],
    avg: 1500,
    fc: { label: 'จ. 23 พ.ย.', short: 3200 }
  },
  daily: [
    { d: '10/11', v: 900 }, { d: '11/11', v: 1400 }, { d: '12/11', v: 0 },
    { d: '13/11', v: 1800 }, { d: '14/11', v: 2100 }, { d: '15/11', v: 1500 }, { d: '16/11', v: 1250 }
  ],
  bills: [
    { day: 1, name: 'รายการ A (ตัวอย่าง)', amt: 23000, paid: true },
    { day: 15, name: 'ค่าผ่อนรถ (ตัวอย่าง)', amt: 12088, paid: false, late: true },
    { day: 25, name: 'ค่าคอนโด (ตัวอย่าง)', amt: 9700, paid: false }
  ],
  captain: { casesToday: 18, renewals: 5, quotesPending: 4, premiumMonth: 148500, note: 'ตัวอย่าง: งานประกันภัยแบรนด์ Captain' },
  profit: { pair: 'XAUUSD', eaOn: true, dayPl: 42.8, floating: -6.4, gridLevel: 2, ddPct: 1.8, note: 'ตัวอย่าง: Grid + Partial Hedging บน MT5' },
  solar: {
    battery: 19,
    solarKw: 8.88,
    loadKw: 46.8,
    savedThb: 875.5,
    subFee: 699,
    netSaved: 176.5,
    forecast: { month: '2026-11', estProd: 233, estGrid: 1750, estBill: 5960, estSaved: 1274, estNet: 575 },
    monthly: [
      { m: '2026-05', prod: 0, use: 1871, net: 1871, saved: 0, pct: 0, note: 'ก่อนติดโซลาร์' },
      { m: '2026-06', prod: 0, use: 1779, net: 1779, saved: 0, pct: 0, note: 'ก่อนติดโซลาร์' },
      { m: '2026-07', prod: 0, use: 1369, net: 1369, saved: 0, pct: 0, note: 'ก่อนติดโซลาร์' },
      { m: '2026-08', prod: 0, use: 1986, net: 1986, saved: 0, pct: 0, note: 'ก่อนติดโซลาร์' },
      { m: '2026-09', prod: 0, use: 1775, net: 1775, saved: 0, pct: 0, note: 'ก่อนติดโซลาร์' },
      { m: '2026-10', prod: 178.44, use: 1960.44, net: 1782, saved: 1125.96, pct: 9.1, note: 'บิลจริง กฟน. 6,067.27 ฿' },
      { m: '2026-11', prod: 233, use: 1983, net: 1750, saved: 1274, pct: 11.7, note: 'คาดการณ์เต็มเดือน' }
    ],
    note: 'BlueRing 699 ฿/ด. · กฟน. TOU 1.3.2 (เฉลี่ยจริง 3.40 ฿/หน่วย · Off-Peak 88.3%)'
  },
  health: { streak: 3, weekDays: 3, weekGoal: 5, weekMin: 115, todayDone: true, todayActivity: 'เดินลู่วิ่ง 35 น.', note: 'ตัวอย่าง: โปรเจกต์ take profit สุขภาพ' },
  errors: null,
  log: [
    { t: '18:40', m: 'บันทึกงาน Grab 270 บาท (ตัวอย่าง)' },
    { t: '18:15', m: 'Take Profit แจ้งปิดไม้ XAUUSD +14.20$ (ตัวอย่าง)' },
    { t: '17:30', m: 'Solar แบตเตอรี่ชาร์จเต็ม 94% (ตัวอย่าง)' }
  ],
  flights: {
    BKK: {
      live: false,
      list: {
        landed: [
          { code: 'FD4103', route: 'Chiangmai', sched: '22:05', est: '22:04', d: 0, st: '🛬 เพิ่งลงจอด', dl: '🟢 ตรงเวลา', airline: 'Thai AirAsia', craft: 'Airbus A320', landed: true },
          { code: 'VZ2305', route: 'Phuket', sched: '21:10', est: '21:54', d: -7, st: '🛬 เพิ่งลงจอด', dl: '⚠️ ล่าช้า 44 น.', airline: 'Thai Vietjet Air', craft: 'Airbus A320', landed: true },
          { code: 'PG278', route: 'Phuket', sched: '21:25', est: '21:44', d: -17, st: '🧳 ประเมินว่ากำลังรอรับกระเป๋า', dl: '⚠️ ล่าช้า 19 น.', airline: 'Bangkok Airways', craft: 'Airbus A319', landed: true },
          { code: 'TG360', route: 'Chennai', sched: '21:30', est: '21:43', d: -18, st: '🧳 ประเมินว่ากำลังรอรับกระเป๋า', dl: '🟡 ช้ากว่าตาราง 13 น.', airline: 'Thai Airways', craft: 'Airbus A320', landed: true }
        ],
        up: [
          { code: 'TG673', route: 'Osaka', sched: '22:15', est: '22:20', d: 17, st: '🛬 กำลังลงจอด', dl: '🟡 ช้า 5 น.', airline: 'Thai Airways', craft: 'Boeing 787-9', landed: false },
          { code: 'EK372', route: 'Dubai', sched: '22:45', est: '22:45', d: 42, st: '✈️ กำลังบินมา', dl: '🟢 ตรงเวลา', airline: 'Emirates', craft: 'Airbus A380', landed: false }
        ]
      }
    },
    DMK: {
      live: false,
      list: {
        landed: [
          { code: 'SL617', route: 'Udon Thani', sched: '21:45', est: '21:39', d: -22, st: '🧳 ประเมินว่ากำลังรอรับกระเป๋า', dl: '🟢 ก่อนเวลา 6 น.', airline: 'Thai Lion Air', craft: 'Boeing 737-800', landed: true },
          { code: 'SL545', route: 'Chiang Rai', sched: '22:00', est: '21:29', d: -32, st: '🧳 ประเมินว่ากำลังรอรับกระเป๋า', dl: '🟢 ก่อนเวลา 31 น.', airline: 'Thai Lion Air', craft: 'Boeing 737-800', landed: true },
          { code: 'FD3569', route: 'Roi Et', sched: '21:35', est: '21:27', d: -34, st: '🧳 ประเมินว่ากำลังรอรับกระเป๋า', dl: '🟢 ก่อนเวลา 8 น.', airline: 'Thai AirAsia', craft: 'Airbus A320', landed: true },
          { code: 'FD254', route: 'Yangon', sched: '20:30', est: '21:26', d: -35, st: '🧳 ประเมินว่ากำลังรอรับกระเป๋า', dl: '⚠️ ล่าช้า 56 น.', airline: 'Thai AirAsia', craft: 'Airbus A320', landed: true }
        ],
        up: [
          { code: 'DD311', route: 'Udon Thani', sched: '22:02', est: '22:02', d: 1, st: '✈️ กำลังบินมา', dl: '🟢 ตรงเวลา', airline: 'Nok Air', craft: 'Boeing 737-800', landed: false },
          { code: 'FD3024', route: 'Phuket', sched: '22:30', est: '22:30', d: 29, st: '✈️ กำลังบินมา', dl: '🟢 ตรงเวลา', airline: 'Thai AirAsia', craft: 'Airbus A320', landed: false }
        ]
      }
    }
  }
};

function renderAgents(d, mode) {
  $$('.ag').forEach(b => {
    const id = b.dataset.id;
    let on = false;
    if (mode !== true && mode !== undefined && typeof mode !== 'string') {
      on = id === 'driver' ? !!(d.income || d.flights)
        : id === 'finance' ? !!(d.budget && !d.budget.err)
          : id === 'tg' ? !!d.bot
            : id === 'script' ? d.ok !== false
              : id === 'captain' ? !!d.captain
                : id === 'profit' ? !!d.profit
                  : id === 'solar' ? !!d.solar
                    : id === 'health' ? !!d.health
                      : false;
    }
    b.className = 'ag' + (mode === true ? ' sm' : (on ? ' on' : ''));
  });
}

function renderTabs(d, mode) {
  const bn = $('banner');
  LAST_MODE = mode;
  if (mode === true) {
    bn.hidden = false;
    bn.className = 'banner';
    bn.textContent = 'โหมดตัวอย่าง: ตัวเลขในทุกส่วนเป็นข้อมูลสมมติ ไม่ใช่ข้อมูลจริง (กดปุ่มขวาบน หรือเปิดจากปุ่ม /dash ในบอทเพื่อเชื่อมข้อมูลจริง)';
  } else if (typeof mode === 'string') {
    bn.hidden = false;
    bn.className = 'banner err';
    bn.textContent = 'เชื่อมไม่สำเร็จ: ' + mode;
    d = {};
  } else {
    bn.hidden = true;
  }
  d = d || {};
  LASTD = d;
  drawHero(d);
  drawSummary(d);
  drawFlights(d);
  drawMoney(d);
  drawDriverLedger(d);
  drawExtendedAgents(d, mode);
  renderAgents(d, mode);
  if (typeof renderOfficeHud === 'function') renderOfficeHud(d, mode);
  if (SEL) showDetail(SEL);
}

// ---------- ส่งคำสั่ง ----------
const CMD_ERR = {
  unauthorized: 'รหัสไม่ถูกต้อง',
  cmd_disabled: 'ยังไม่เปิดสั่งการจากเว็บ: ตั้ง Script property ชื่อ DASH_ALLOW_CMD เป็น true ใน Apps Script แล้ว Deploy เวอร์ชันใหม่',
  rate_limited: 'ส่งถี่เกินไป รอสักครู่',
  empty: 'คำสั่งว่างหรือไม่รองรับ',
  bad_request: 'รูปแบบคำขอไม่ถูกต้อง',
  server_error: 'เกิดข้อผิดพลาดในบอท ดู Executions ใน Apps Script'
};

function showOut(el, s, isHtml) {
  el.textContent = '';
  if (isHtml) el.innerHTML = String(s).replace(/<(?!\/?(?:b|i|code)>)[^>]*>/g, '');
  else el.textContent = s;
}

async function sendCmd(text, o) {
  o = o || {};
  text = String(text || '').trim();
  const out = o.out || $('cmdOut');
  if (!text || busy) return false;
  if (!CFG.url || !CFG.key) {
    showOut(out, 'ยังไม่ได้เชื่อมข้อมูล กดปุ่มขวาบน หรือเปิดจากปุ่ม /dash ในบอทก่อน');
    return false;
  }
  if (!o.noConfirm && text.charAt(0) !== '/' && !confirm('ส่งคำสั่งนี้เข้าระบบ?\n\n' + text)) return false;
  busy = true;
  showOut(out, 'กำลังส่ง…');
  let ok = false;
  const rid = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  try {
    const r = await fetch(CFG.url + '?action=cmd', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ k: CFG.key, text: text, rid: rid }),
      redirect: 'follow'
    });
    const d = await r.json();
    if (d && d.ok) {
      ok = true;
      showOut(out, d.out, true);
      setTimeout(() => pull(true), 1500);
    } else {
      showOut(out, 'ส่งไม่สำเร็จ: ' + (CMD_ERR[d && d.error] || (d && d.error) || 'ไม่ทราบสาเหตุ'));
    }
  } catch (e) {
    showOut(out, 'ไม่ได้รับคำตอบจากระบบ คำสั่งอาจถูกส่งไปแล้ว ตรวจในบอทหรือ /bills ก่อนส่งซ้ำ เพื่อไม่ให้บันทึกซ้ำ');
  }
  busy = false;
  return ok;
}

function qbtn(label, text, out) {
  const b = E('button', 'pill', label);
  b.onclick = () => sendCmd(text, { out: out, noConfirm: true });
  return b;
}

const inp = (ph, type) => {
  const i = E('input');
  i.placeholder = ph;
  if (type === 'number') { i.type = 'number'; i.min = '0'; i.setAttribute('inputmode', 'decimal'); }
  else i.type = 'text';
  i.maxLength = 80;
  return i;
};
const frm = (...els) => { const r = E('div', 'frow'); els.forEach(e => r.appendChild(e)); return r; };
const okText = v => /\d/.test(v);

function fIncome(c, out) {
  const sel = E('select');
  sel.setAttribute('aria-label', 'แอป');
  ['Grab', 'Bolt', 'inDrive', 'LINE MAN', 'Lalamove', 'Maxim'].forEach(a => {
    const o = E('option', '', a); o.value = a; sel.appendChild(o);
  });
  const oo = E('option', '', 'อื่นๆ…'); oo.value = '*'; sel.appendChild(oo);
  const other = inp('ชื่อแอป (คำเดียว)');
  const amt = inp('ยอด (บาท)', 'number');
  const tip = inp('ทิป', 'number');
  const trips = inp('เที่ยว (1)', 'number');
  trips.style.maxWidth = '92px';
  const route = inp('เส้นทาง เช่น สยาม ไป สาทร (ไม่บังคับ)');
  const msg = E('p', 'note');
  const go = E('button', 'pri g', 'บันทึก');
  other.hidden = true;
  sel.onchange = () => { other.hidden = sel.value !== '*'; if (!other.hidden) other.focus(); };

  // Quick amount chips for faster mobile logging
  const qc = E('div', 'qchips');
  [100, 150, 200, 300, 500].forEach(v => {
    const b = E('button', 'qchip', '+' + v + ' ฿');
    b.type = 'button';
    b.onclick = () => { amt.value = String((Number(amt.value) || 0) + v); amt.focus(); };
    qc.appendChild(b);
  });

  go.onclick = async () => {
    const app = (sel.value === '*' ? other.value : sel.value).trim().replace(/\s+/g, ' ').slice(0, 20);
    const appT = app === 'LINE MAN' ? app : app.replace(/\s+/g, '');
    const a = Number(amt.value);
    const t = Number(tip.value) || 0;
    const nTrips = Math.max(1, Math.round(Number(trips.value) || 1));
    const rBase = route.value.trim();
    const r = nTrips > 1 ? (rBase ? rBase + ' (' + nTrips + ' เที่ยว)' : nTrips + ' เที่ยว') : rBase;
    if (!appT || /^\d/.test(appT) || /[<>&]/.test(appT)) {
      msg.textContent = 'ใส่ชื่อแอปให้ถูกต้อง (คำเดียว ห้ามขึ้นต้นด้วยตัวเลข)';
      return;
    }
    if (!(a > 0)) { msg.textContent = 'ใส่ยอดเป็นตัวเลขมากกว่า 0'; return; }
    msg.textContent = '';
    if (await sendCmd('บันทึก ' + appT + ' ' + a + (t > 0 ? ' ทิป ' + t : '') + (r ? ' ' + r : ''), { out: out })) {
      amt.value = ''; tip.value = ''; trips.value = ''; route.value = '';
    }
  };
  c.appendChild(frm(sel, other, amt, tip, trips));
  c.appendChild(qc);
  c.appendChild(frm(route, go));
  c.appendChild(msg);
}

function fCash(c, out) {
  const mk = (ph, label, fn, type) => {
    const i = inp(ph, type);
    const b = E('button', 'pri', label);
    b.onclick = async () => {
      const v = i.value.trim();
      if (!okText(v)) { out.textContent = 'ใส่ตัวเลขก่อน'; return; }
      if (await sendCmd(fn(v), { out: out })) i.value = '';
    };
    c.appendChild(frm(i, b));
    return i;
  };
  mk('ตั้งเงินสดเป็น เช่น 3011+420+3041', 'ตั้ง', v => 'เงินสด ' + v);
  mk('เพิ่มเงินสด (บาท)', 'เพิ่ม', v => 'เงินสด เพิ่ม ' + v);
  const amt = inp('ใช้จ่าย (บาท)', 'number');
  const note = inp('หมายเหตุ เช่น น้ำมัน');
  const b = E('button', 'pri', 'หัก');
  b.onclick = async () => {
    const a = Number(amt.value);
    if (!(a > 0)) { out.textContent = 'ใส่ยอดที่ใช้'; return; }
    if (await sendCmd('ใช้ ' + a + ' ' + note.value.trim(), { out: out })) { amt.value = ''; note.value = ''; }
  };
  c.appendChild(frm(amt, note, b));
}

function fPay(c, out) {
  const d = LASTD || {};
  const un = (d.bills || []).filter(x => !x.paid);
  const sel = E('select');
  sel.setAttribute('aria-label', 'รายการที่ยังไม่จ่าย');
  un.forEach(x => {
    const o = E('option', '', 'วันที่ ' + x.day + ' · ' + x.name + ' · ' + fmt(x.amt));
    o.value = x.name;
    o.dataset.a = x.amt;
    sel.appendChild(o);
  });
  const ck = E('input');
  ck.type = 'checkbox';
  ck.checked = true;
  const lab = E('label', 'chk');
  lab.appendChild(ck);
  lab.appendChild(document.createTextNode('หักเงินสดด้วย'));
  const go = E('button', 'pri g', 'จ่ายแล้ว');
  if (!un.length) {
    c.appendChild(E('p', 'note', 'ไม่มีรายการค้างในตารางรายจ่าย (หรือยังไม่เชื่อมข้อมูล)'));
  } else {
    go.onclick = async () => {
      const o = sel.options[sel.selectedIndex];
      if (await sendCmd('จ่ายแล้ว ' + o.value, { out: out }) && ck.checked) {
        await sendCmd('เงินสด ลด ' + Math.round(Number(o.dataset.a)), { out: out, noConfirm: true });
      }
    };
    c.appendChild(frm(sel, lab, go));
  }
  const nm = inp('ชื่อยอดค้างพิเศษ');
  const am = inp('ยอด (บาท)', 'number');
  const add = E('button', 'pri', 'เพิ่มยอดค้าง');
  add.onclick = async () => {
    const a = Number(am.value);
    const n = nm.value.trim();
    if (!n || !(a > 0)) { out.textContent = 'ใส่ชื่อและยอดให้ครบ'; return; }
    if (await sendCmd('ค้างจ่าย ' + n + ' ' + a, { out: out })) { nm.value = ''; am.value = ''; }
  };
  c.appendChild(frm(nm, am, add));

  const pn = inp('ชำระยอดค้างพิเศษ: ชื่อ');
  const pb = E('button', 'pri g', 'ชำระแล้ว');
  pb.onclick = async () => {
    const n = pn.value.trim();
    if (!n) { out.textContent = 'ใส่ชื่อยอดค้าง'; return; }
    if (await sendCmd('ชำระค้าง ' + n, { out: out })) pn.value = '';
  };
  c.appendChild(frm(pn, pb));
}

function fCaptain(c, out) {
  const name = inp('ชื่อลูกค้า / ทะเบียนรถ');
  const type = E('select');
  type.setAttribute('aria-label', 'ประเภทประกัน');
  ['ชั้น 1', '2+', '3+', 'พ.ร.บ.', 'อื่นๆ'].forEach(t => {
    const o = E('option', '', t); o.value = t; type.appendChild(o);
  });
  const prem = inp('เบี้ยประมาณ (บาท)', 'number');
  const go = E('button', 'pri g', 'บันทึกเคส');
  go.onclick = async () => {
    const n = name.value.trim();
    if (!n) { out.textContent = 'ใส่ชื่อลูกค้าหรือทะเบียนรถก่อน'; return; }
    const p = Number(prem.value) || 0;
    if (await sendCmd('ประกัน ' + n + ' ' + type.value + (p > 0 ? ' ' + p : ''), { out: out })) {
      name.value = ''; prem.value = '';
    }
  };
  c.appendChild(frm(name, type, prem, go));
}

function fHealth(c, out) {
  const act = E('select');
  act.setAttribute('aria-label', 'กิจกรรม');
  ['เดินลู่วิ่ง', 'ดัมเบลล์', 'เวทเทรนนิ่ง', 'วิ่ง', 'ยืดเหยียด'].forEach(t => {
    const o = E('option', '', t); o.value = t; act.appendChild(o);
  });
  const mins = inp('นาที', 'number');
  const note = inp('หมายเหตุ เช่น 3 กม. (ไม่บังคับ)');
  const go = E('button', 'pri g', 'บันทึก');
  go.onclick = async () => {
    const m = Number(mins.value);
    if (!(m > 0)) { out.textContent = 'ใส่จำนวนนาทีก่อน'; return; }
    const n = note.value.trim();
    if (await sendCmd('ออกกำลังกาย ' + act.value + ' ' + m + ' นาที' + (n ? ' ' + n : ''), { out: out })) {
      mins.value = ''; note.value = '';
    }
  };
  c.appendChild(frm(act, mins, note, go));
}

function fSolar(c, out) {
  const sp = inp('Self-powered % เช่น 19', 'number');
  const pr = inp('ผลิตวันนี้ kWh เช่น 8.88', 'number');
  const ld = inp('ใช้ไฟวันนี้ kWh เช่น 46.8', 'number');
  const sv = inp('ประหยัดรอบบิล (฿) เช่น 875.5', 'number');
  const go = E('button', 'pri g', 'บันทึกรายวัน');
  go.onclick = async () => {
    const a = Number(sp.value), b = Number(pr.value), d = Number(ld.value), s = Number(sv.value) || 0;
    if (isNaN(a) || !(b >= 0) || !(d >= 0) || sp.value === '' || pr.value === '' || ld.value === '') {
      out.textContent = 'กรอก Self-powered %, ผลิต kWh และใช้ไฟ kWh ให้ครบ';
      return;
    }
    if (await sendCmd('โซลาร์ ' + a + ' ' + b + ' ' + d + ' ' + s, { out: out })) {
      sp.value = ''; pr.value = ''; ld.value = ''; sv.value = '';
    }
  };
  c.appendChild(frm(sp, pr, ld, sv, go));

  const ym = inp('เดือน เช่น 2026-11');
  const mpr = inp('ผลิตทั้งเดือน kWh', 'number');
  const mld = inp('ใช้ไฟทั้งเดือน kWh', 'number');
  const msv = inp('ประหยัดจริง ฿ (เว้น=คำนวณ TOU)', 'number');
  const mgo = E('button', 'pri', 'บันทึกรายเดือน (TOU)');
  mgo.onclick = async () => {
    const yv = ym.value.trim(), bp = Number(mpr.value), bl = Number(mld.value), bs = msv.value.trim();
    if (!/^\d{4}-\d{2}$/.test(yv) || !(bp >= 0) || !(bl >= 0) || mpr.value === '' || mld.value === '') {
      out.textContent = 'ใส่เดือน (เช่น 2026-11), ยอดผลิต kWh และยอดใช้ไฟ kWh ให้ครบ';
      return;
    }
    if (await sendCmd('โซลาร์เดือน ' + yv + ' ' + bp + ' ' + bl + (bs ? ' ' + bs : ''), { out: out })) {
      ym.value = ''; mpr.value = ''; mld.value = ''; msv.value = '';
    }
  };
  c.appendChild(frm(ym, mpr, mld, msv, mgo));
}

const FORMS = {
  income: ['➕ บันทึกรายได้ (แยกตามแอป)', fIncome],
  cash: ['💵 เงินสด', fCash],
  pay: ['✅ จ่ายแล้ว / 📌 ค้างจ่าย', fPay],
  captain: ['🛡️ บันทึกเคสประกัน Captain', fCaptain],
  solar: ['☀️ อัปเดต BlueRing Solar', fSolar],
  health: ['💪 บันทึกออกกำลังกาย Healthy', fHealth]
};

function mountCard(host, key, title, build) {
  if (host.dataset.k === key) { host.textContent = ''; host.dataset.k = ''; return; }
  host.dataset.k = key;
  host.textContent = '';
  const c = E('div', 'act');
  const h = E('div', 'acth');
  const x = E('button', 'dx', '✕ ปิด');
  const out = E('div', 'cmdout');
  h.appendChild(E('b', '', title));
  h.appendChild(x);
  x.onclick = () => { host.textContent = ''; host.dataset.k = ''; };
  c.appendChild(h);
  build(c, out);
  c.appendChild(out);
  host.appendChild(c);
}

function tbBtn(tb, host, key, label, build, title) {
  const b = E('button', 'pill', label);
  b.onclick = () => mountCard(host, key, title || label, build);
  tb.appendChild(b);
}

function quick(text) {
  return (c, out) => { sendCmd(text, { out: out, noConfirm: true }); };
}

const tbF = $('tbFl'), hF = $('actFl'), tbM = $('tbMoney'), hM = $('actMoney'), tbA = $('tbAgents'), hA = $('actAgents');
[['/bkk', '🔄 อัปเดต BKK'], ['/dmk', '🔄 อัปเดต DMK'], ['/now', '🛬 ทั้งสองสนามบิน'], ['/next', '⏭ 3 เที่ยวบินถัดไป']]
  .forEach(a => tbBtn(tbF, hF, 'q' + a[0], a[1], quick(a[0])));

// ปุ่ม + สำหรับแสดงเฉพาะกระดาน 2 คอลัมน์ (รูปที่ 1) และอัปเดตเที่ยวบินเงียบๆ เบื้องหลัง
const flToggleBtn = $('flToggleBtn');
const flCardsBtn = $('flCardsBtn');
const flWrap = $('flWrap');
const flCardsWrap = $('flCardsWrap');
const flStatus = $('flStatus');

async function silentUpdateFlights() {
  if (!CFG.url || !CFG.key) {
    if (flStatus) flStatus.textContent = 'แสดงข้อมูลตัวอย่าง (เชื่อมข้อมูลจริงเพื่ออัปเดตสด)';
    return;
  }
  if (flStatus) flStatus.textContent = '🔄 กำลังอัปเดตเที่ยวบิน BKK และ DMK ล่าสุด…';
  const dummy = document.createElement('div');
  const ok = await sendCmd('/now', { out: dummy, noConfirm: true });
  if (flStatus) flStatus.textContent = ok ? '✅ อัปเดตเที่ยวบินล่าสุดแล้ว' : '⚠️ อัปเดตไม่สำเร็จ (แสดงข้อมูลล่าสุดที่มี)';
}

if (flToggleBtn && flWrap) {
  flToggleBtn.onclick = async () => {
    const opening = flWrap.hidden;
    flWrap.hidden = !opening;
    flToggleBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    flToggleBtn.textContent = opening ? '− ซ่อนกระดานเที่ยวบิน' : '＋ แสดงและอัปเดตเที่ยวบิน';
    if (opening) await silentUpdateFlights();
    else if (flStatus) flStatus.textContent = '';
  };
}

// ปุ่มแยกสำหรับแสดงผลแบบการ์ดรายละเอียด (ก่อนหน้า 4 ลำ + ถัดไป 2 ลำ)
if (flCardsBtn && flCardsWrap) {
  flCardsBtn.onclick = async () => {
    const opening = flCardsWrap.hidden;
    flCardsWrap.hidden = !opening;
    flCardsBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
    flCardsBtn.classList.toggle('active', opening);
    if (opening) await silentUpdateFlights();
    else if (flStatus) flStatus.textContent = '';
  };
}
[['วันนี้ต้องหาเท่าไร', '🎯 วันนี้ต้องหา'], ['/bills', '🧾 รายการจ่าย'], ['/summary', '📊 สรุปรายได้']]
  .forEach(a => tbBtn(tbM, hM, 'q' + a[0], a[1], quick(a[0])));
['income', 'cash', 'pay'].forEach(k => tbBtn(tbM, hM, k, FORMS[k][0].split(' (')[0], FORMS[k][1], FORMS[k][0]));
['captain', 'solar', 'health'].forEach(k => tbBtn(tbA, hA, k, FORMS[k][0], FORMS[k][1], FORMS[k][0]));

// ---------- รายละเอียดเมื่อกดช่องสรุป + เมนูของหมวดนั้น ----------
const ln = t => E('div', 'ln2', t);
function tbl(heads, rows, nc) {
  nc = nc || [];
  const wrap = E('div', 'tbl-wrap');
  const t = E('table');
  const r0 = E('tr');
  heads.forEach((x, i) => r0.appendChild(E('th', nc.indexOf(i) >= 0 ? 'n' : '', x)));
  t.appendChild(r0);
  rows.forEach(r => {
    const tr = E('tr');
    r.forEach((x, i) => tr.appendChild(E('td', nc.indexOf(i) >= 0 ? 'n' : '', String(x))));
    t.appendChild(tr);
  });
  wrap.appendChild(t);
  return wrap;
}
function nob(box, t) { box.appendChild(E('p', 'muted', t)); }

function dPlan(d, box) {
  const b = d.budget;
  if (!b || b.err) { nob(box, b && b.err ? b.err : 'ยังไม่มีข้อมูลแผนเงิน'); return; }
  box.appendChild(ln('วิธีคิด: รวมภาระที่ค้างและที่จะครบกำหนดสะสมทีละวัน ลบเงินสดตั้งต้น แล้วหารด้วยจำนวนวันที่เหลือ จุดที่ได้ตัวเลขสูงสุดคือเป้าต่อวัน'));
  if (b.best) box.appendChild(ln('จุดตึงสุด: ' + b.best.label + ' · ต้องมีเงินสะสม ' + fmt(b.best.cum) + ' บาท · เหลือ ' + b.best.days + ' วัน → ' + fmt(b.target) + ' บาท/วัน'));
  box.appendChild(ln('เงินสดตั้งต้น ' + fmt(b.cash) + ' บาท' + (b.noCash ? ' (ยังไม่ได้บันทึก)' : '')));
  if (b.shortNow > 0) box.appendChild(ln('ขาดเพื่อปิดยอดค้างวันนี้ ' + fmt(b.shortNow) + ' บาท'));
  if (b.avg) box.appendChild(ln('รายได้เฉลี่ยที่บันทึก ' + fmt(b.avg) + ' บาท/วัน' + (b.fc ? ' → ถ้าเท่าเดิม เงินไม่พอครั้งแรก ' + b.fc.label + ' (ขาด ~' + fmt(b.fc.short) + ')' : ' → พอจ่ายครบในช่วงที่ประเมิน')));
  nob(box, 'ไม่รวมค่าน้ำมัน/ชาร์จ EV/อาหาร และไม่ใช่คำแนะนำทางการเงิน');
}

function dLate(d, box) {
  const b = d.budget;
  if (!b || b.err) { nob(box, b && b.err ? b.err : 'ยังไม่มีข้อมูลแผนเงิน'); return; }
  if (!b.overdue.length) { nob(box, 'ไม่มีรายการค้างหรือครบกำหนดวันนี้'); return; }
  box.appendChild(tbl(['รายการ', 'สถานะ', 'บาท'], b.overdue.map(o => [o.name, o.late ? 'เลยกำหนด' : 'ครบวันนี้', fmt(o.amt)]), [2]));
  box.appendChild(ln('รวม ' + fmt(b.nowSum) + ' บาท · ' + (b.shortNow > 0 ? 'เงินสดขาด ' + fmt(b.shortNow) + ' บาท' : 'เงินสดพอจ่าย')));
}

function dCash(d, box) {
  const b = d.budget;
  if (!b || b.err) { nob(box, b && b.err ? b.err : 'ยังไม่มีข้อมูล'); return; }
  if (b.noCash || !b.cashInfo) {
    nob(box, 'ยังไม่ได้บันทึกเงินสด (คิดเป็น 0) พิมพ์ในบอทหรือใน ⌨️ สั่งการ: เงินสด 3011+420+3041');
    return;
  }
  const c = b.cashInfo;
  box.appendChild(tbl(['รายการ', 'บาท'], [
    ['เงินสดที่บันทึกไว้ (' + c.ts + ')', fmt(c.v)],
    ['รายได้ที่บันทึกหลังจากนั้น (ก่อนวันนี้)', fmt(c.since)],
    ['รวมเงินสดตั้งต้นวันนี้', fmt(b.cash)]
  ], [1]));
  nob(box, 'รายได้วันนี้แยกอยู่ในเป้าหมายประจำวัน อัปเดตเงินสดด้วยคำสั่ง เงินสด ... / ใช้ ... / เงินสด ลด ...');
}

function dIncome(d, box) {
  const i = d.income;
  if (!i) { nob(box, 'ยังไม่มีข้อมูลรายได้ (ยังไม่มีชีต Daily_Jobs)'); return; }
  box.appendChild(E('div', 'muted', 'วันนี้แยกตามแอป'));
  if (i.today.length) box.appendChild(tbl(['แอป', 'รายการ', 'ค่าโดยสาร', 'ทิป', 'รวม'], i.today.map(x => [x.app, x.n, fmt(x.fare), fmt(x.tip), fmt(x.gross)]), [1, 2, 3, 4]));
  else nob(box, 'ยังไม่มีรายการวันนี้');
  if (i.week.length) {
    box.appendChild(E('div', 'muted', '7 วันล่าสุดแยกตามแอป'));
    box.appendChild(tbl(['แอป', 'รายการ', 'รวม'], i.week.map(x => [x.app, x.n, fmt(x.gross)]), [1, 2]));
  }
  if (i.list.length) {
    box.appendChild(E('div', 'muted', 'รายการวันนี้ (ล่าสุดก่อน)'));
    box.appendChild(tbl(['เวลา', 'แอป', 'เส้นทาง', 'รวม'], i.list.map(x => [x.t, x.p, ((x.o && x.o !== '-' ? x.o : '') + (x.d && x.d !== '-' ? ' → ' + x.d : '')) || '-', fmt(x.fare + x.tip)]), [3]));
  }
  nob(box, 'บันทึกรายได้ได้จากฟอร์มด้านล่าง');
}

function dFlight(d, box) {
  let all = [];
  ['BKK', 'DMK'].forEach(ap => {
    const f = d.flights && d.flights[ap];
    if (f && f.list) f.list.up.forEach(x => all.push([ap, x]));
  });
  all.sort((a, b) => a[1].d - b[1].d);
  if (!all.length) { nob(box, 'ยังไม่มีข้อมูลล่าสุด (พิมพ์ /bkk หรือ /dmk ในบอทเพื่ออัปเดต)'); return; }
  const ap = all[0][0];
  const x = all[0][1];
  box.appendChild(tbl(['หัวข้อ', 'รายละเอียด'], [
    ['เที่ยวบิน', x.code + ' · ' + ap],
    ['ต้นทาง', x.route || '-'],
    ['เวลาตามตาราง', x.sched || '-'],
    ['เวลาคาดการณ์', x.est || '-'],
    ['สถานะ', x.st || '-'],
    ['เทียบตาราง', x.dl || '-'],
    ['อีก', x.d + ' นาที']
  ]));
  if (all.length > 1) {
    box.appendChild(E('div', 'muted', 'เที่ยวบินถัดไปอีก'));
    all.slice(1, 4).forEach(y => box.appendChild(frow(y[1], y[0])));
  }
}

function dDue(d, box) {
  const b = d.budget;
  if (!b || b.err || !b.up.length) { nob(box, b && b.err ? b.err : 'ไม่มีภาระใน 30 วันข้างหน้า'); return; }
  b.up.slice(0, 3).forEach(g => {
    box.appendChild(E('div', 'muted', g.label + ' · อีก ' + g.dn + ' วัน · รวม ' + fmt(g.sum) + ' บาท'));
    box.appendChild(tbl(['รายการ', 'บาท'], g.items.map(i => [i.n, fmt(i.a)]), [1]));
  });
}

function dBot(d, box) {
  const bt = d.bot;
  const e = d.errors;
  box.appendChild(ln(bt && bt.lastSeenMin != null ? 'ข้อความล่าสุดถึงบอท ' + bt.lastSeenMin + ' นาทีที่แล้ว' : 'ยังไม่มีข้อความถึงบอท'));
  box.appendChild(ln(e ? 'ข้อผิดพลาดล่าสุด ' + e.t + ' น.: ' + e.m : 'ไม่มีข้อผิดพลาดที่บันทึกไว้'));
  if (d.log && d.log.length) {
    box.appendChild(E('div', 'muted', 'เหตุการณ์ล่าสุด'));
    box.appendChild(tbl(['เวลา', 'เหตุการณ์'], d.log.slice(-6).reverse().map(x => [x.t, x.m])));
  }
}

const DETAILS = {
  plan: ['🎯 วันนี้ต้องหา', dPlan],
  late: ['⚠️ ค้าง/ครบกำหนดวันนี้', dLate],
  cash: ['💵 เงินสด', dCash],
  income: ['📥 รายได้วันนี้ แยกตามแอป', dIncome],
  flight: ['✈️ เที่ยวบินถัดไป', dFlight],
  due: ['📅 ภาระถัดไป', dDue],
  bot: ['🤖 สถานะบอท', dBot]
};

const DACT = {
  plan: [['q', 'วันนี้ต้องหาเท่าไร', '🎯 คำนวณใหม่'], ['q', '/bills', '🧾 รายการจ่าย'], ['f', 'cash']],
  late: [['f', 'pay']],
  cash: [['f', 'cash']],
  income: [['f', 'income'], ['q', '/summary', '📊 สรุปรายได้']],
  flight: [['q', '/bkk', '🔄 BKK'], ['q', '/dmk', '🔄 DMK'], ['q', '/now', '🛬 ทั้งสอง']],
  due: [['q', '/bills', '🧾 รายการจ่ายเดือนนี้'], ['f', 'pay']],
  bot: [['q', '/help', '📖 เมนูคำสั่ง'], ['q', '/bills', '🧾 /bills']]
};

function showDetail(k) {
  const box = $('detail');
  SEL = k;
  $$('.kpi,.hero').forEach(x => x.classList.toggle('sel', !!k && x.dataset.k === k));
  if (!k || !DETAILS[k]) { box.hidden = true; return; }
  box.hidden = false;
  box.textContent = '';
  const x = E('button', 'dx', '✕ ปิด');
  x.onclick = () => showDetail(null);
  box.appendChild(x);
  box.appendChild(E('h3', '', DETAILS[k][0]));
  DETAILS[k][1](LASTD || {}, box);
  const acts = DACT[k] || [];
  if (acts.length) {
    const qs = acts.filter(a => a[0] === 'q');
    const fs = acts.filter(a => a[0] === 'f');
    if (qs.length) {
      const out = E('div', 'cmdout');
      const row = E('div', 'tb');
      row.style.marginTop = '10px';
      qs.forEach(a => row.appendChild(qbtn(a[2], a[1], out)));
      box.appendChild(row);
      box.appendChild(out);
    }
    fs.forEach(a => {
      const c = E('div', 'act');
      const out = E('div', 'cmdout');
      c.appendChild(E('b', '', FORMS[a[1]][0]));
      c.appendChild(E('div', '', '')).style.height = '6px';
      FORMS[a[1]][1](c, out);
      c.appendChild(out);
      box.appendChild(c);
    });
  }
}

const hero0 = $('hero');
hero0.dataset.k = 'plan';
hero0.tabIndex = 0;
hero0.setAttribute('role', 'button');
hero0.onclick = () => showDetail(SEL === 'plan' ? null : 'plan');
hero0.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); hero0.onclick(); } };

// ---------- เอเจนต์: แถบชื่อ, การ์ดโมดูล, หน้าต่างรายละเอียด ----------
const bar = $('agbar');
const mods = $('mods');
ORDER.forEach(id => {
  const s = sOf(id);
  if (!s) return;
  const b = E('button', 'ag sm');
  b.dataset.id = id;
  b.style.setProperty('--c', s.c);
  b.appendChild(E('i', 'sd'));
  b.appendChild(document.createTextNode(s.n));
  b.setAttribute('aria-label', 'รายละเอียดเอเจนต์ ' + s.n);
  b.onclick = () => openAgent(id);
  bar.appendChild(b);

  const m = E('button', 'mod');
  m.style.setProperty('--k', s.c);
  m.dataset.id = id;
  const st = E('strong');
  st.appendChild(E('i'));
  st.appendChild(document.createTextNode(s.n));
  m.appendChild(st);
  const sp = E('span', '', ST0);
  sp.id = 'ms-' + id;
  m.appendChild(sp);
  m.onclick = () => openAgent(id);
  mods.appendChild(m);
});

function openAgent(id) {
  const s = sOf(id);
  const a = AG[id];
  if (!s || !a) return;
  lastFocus = document.activeElement;
  const sh = $('sheet');
  sh.textContent = '';
  sh.style.setProperty('--c', s.c);
  const hd = E('div', 'ahead');
  const av3d = typeof window.getOfficeAvatar === 'function' ? window.getOfficeAvatar(id) : '';
  const im = av3d ? { u: av3d } : IMG[id];
  if (im) {
    const i = E('img', 'aimg');
    i.src = im.u;
    i.alt = s.n;
    hd.appendChild(i);
  } else {
    hd.appendChild(E('div', 'aimg q', '?'));
  }
  const t = E('div', 'atxt');
  t.appendChild(E('h2', '', s.n));
  t.appendChild(E('div', 'muted', a.role));
  t.appendChild(E('span', 'tag', s.st || ST0));
  hd.appendChild(t);
  const x = E('button', 'dx', '✕ ปิด');
  x.onclick = closeAgent;
  hd.appendChild(x);
  sh.appendChild(hd);

  sh.appendChild(E('div', 'sect', 'หน้าที่'));
  sh.appendChild(E('p', '', a.duty));
  sh.appendChild(E('div', 'sect', 'ทำอะไรได้ในตอนนี้'));
  const ul = E('ul');
  a.can.forEach(c => ul.appendChild(E('li', '', c)));
  sh.appendChild(ul);

  if (a.cmds.length) {
    const out = E('div', 'cmdout');
    const row = E('div', 'tb');
    sh.appendChild(E('div', 'sect', 'คำสั่งที่ใช้ได้ (กดเพื่อสั่งทันที)'));
    a.cmds.forEach(c => row.appendChild(qbtn(c[1], c[0], out)));
    sh.appendChild(row);
    sh.appendChild(out);
  }

  sh.appendChild(E('div', 'sect', 'ทำงานร่วมกับ'));
  const col = E('div', 'tb');
  a.with.forEach(w => {
    const b = E('button', 'pill', (sOf(w) || {}).n || w);
    b.onclick = () => openAgent(w);
    col.appendChild(b);
  });
  sh.appendChild(col);
  sh.appendChild(E('p', 'muted', a.collab));
  sh.appendChild(E('div', 'sect', 'การเชื่อมข้อมูล'));
  sh.appendChild(E('p', '', a.conn));

  // Direct composer at bottom of agent inspector (My Office style)
  sh.appendChild(E('div', 'sect', 'ส่งคำสั่งถึง ' + s.n));
  const compOut = E('div', 'cmdout');
  const compIn = inp('พิมพ์คำสั่งหรือข้อความถึง ' + s.n + '...');
  const compGo = E('button', 'pri', 'ส่ง');
  const runComp = async () => {
    const v = compIn.value.trim();
    if (!v) return;
    if (await sendCmd(v, { out: compOut })) compIn.value = '';
  };
  compGo.onclick = runComp;
  compIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); runComp(); } });
  sh.appendChild(frm(compIn, compGo));
  sh.appendChild(compOut);

  $('m').classList.add('on');
  sh.scrollTop = 0;
  x.focus({ preventScroll: true });
}

function closeAgent() {
  $('m').classList.remove('on');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

$('m').addEventListener('click', e => { if (e.target === $('m')) closeAgent(); });
cd.addEventListener('click', e => { if (e.target === cd) cfgClose(); });
el.addEventListener('click', e => { const g = e.target.closest('.st'); if (g) openAgent(g.dataset.id); });
el.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    const g = e.target.closest('.st');
    if (g) { e.preventDefault(); openAgent(g.dataset.id); }
  }
});

// ---------- แถบเมนูบน, รีเฟรช, สลับแอนิเมชัน และแผงสั่งการ ----------
const navPills = Array.from($$('.pill[data-go]'));
navPills.forEach(b => {
  b.onclick = () => {
    const t = document.getElementById(b.dataset.go);
    if (t) t.scrollIntoView({ block: 'start' });
  };
});

// Active section highlight in topbar
try {
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        navPills.forEach(p => p.classList.toggle('active', p.dataset.go === en.target.id));
      }
    });
  }, { rootMargin: '-25% 0px -60% 0px', threshold: 0.01 });
  ['s-office', 's-flights', 's-money', 's-agents', 's-log'].forEach(id => {
    const s = $(id);
    if (s) secObs.observe(s);
  });
} catch (e) {}

try {
  new IntersectionObserver(es => { OFFICE_ON = es[0].isIntersecting; }, { threshold: .05 }).observe(el);
} catch (e) { OFFICE_ON = true; }

$('refreshBtn').onclick = () => {
  if (CFG.url && CFG.key) pull(true);
  else showOff();
};

const themeBtn = $('themeBtn');
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  if (themeBtn) themeBtn.textContent = t === 'light' ? '🌙' : '☀️';
}
try {
  const savedTheme = localStorage.getItem('hq_theme');
  if (savedTheme === 'light' || savedTheme === 'dark') applyTheme(savedTheme);
} catch (e) {}
if (themeBtn) {
  themeBtn.onclick = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem('hq_theme', next); } catch (e) {}
  };
}

const animBtn = $('animBtn');
if (animBtn) {
  animBtn.onclick = () => {
    USER_PAUSE = !USER_PAUSE;
    animBtn.setAttribute('aria-pressed', USER_PAUSE ? 'true' : 'false');
    animBtn.textContent = USER_PAUSE ? '▶️ เล่นภาพ' : '⏸ พักภาพ';
    if (window.OFFICE3D) window.OFFICE3D.setPaused(USER_PAUSE);
  };
}

const cp = $('cmdPanel');
const cb = $('cmdBtn');
function cmdPos() { cp.style.top = Math.round($('topbar').getBoundingClientRect().bottom + 4) + 'px'; }
function cmdToggle(open) {
  const o = open === undefined ? cp.hidden : open;
  cp.hidden = !o;
  cb.setAttribute('aria-expanded', o ? 'true' : 'false');
  if (o) { cmdPos(); $('cmdIn').focus(); }
}
cb.onclick = () => cmdToggle();
document.addEventListener('click', e => { if (!cp.hidden && !cp.contains(e.target) && !cb.contains(e.target)) cmdToggle(false); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (cd.classList.contains('on')) cfgClose();
  else if ($('m').classList.contains('on')) closeAgent();
  else if (!cp.hidden) { cmdToggle(false); cb.focus(); }
});
window.addEventListener('scroll', () => { if (!cp.hidden) cmdPos(); }, { passive: true });

async function goCmd() {
  const i = $('cmdIn');
  if (await sendCmd(i.value, { out: $('cmdOut') })) i.value = '';
}
$('cmdGo').onclick = goCmd;
$('cmdIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); goCmd(); } });

[
  '/brief',
  'บันทึก Grab 250 ทิป 20 สยาม ไป สาทร',
  'เงินสด 3011+420+3041',
  'ฉันจ่ายหนี้ 4000 แล้ว ด้วยเงินสด',
  'จ่ายแล้ว honda',
  'วันนี้ต้องหาเท่าไร',
  '/bkk',
  '/captain',
  '/profit',
  '/solar',
  '/health'
].forEach(t => {
  const b = E('button', 'pill', t);
  b.onclick = () => { $('cmdIn').value = t; $('cmdIn').focus(); };
  $('exs').appendChild(b);
});

function clock() {
  try {
    $('clock').textContent = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date()) + ' น.';
  } catch (e) {}
}
clock();
setInterval(clock, 30000);

// ---------- My Office Ref: Camera Presets, Zoom, Day/Night, 2D List & Activity Feed ----------
const CAM_PRESETS = {
  overview: { x: 0, y: 0, w: 1312, h: 816 },
  desks: { x: 350, y: 170, w: 660, h: 410 },
  trade: { x: 60, y: 360, w: 660, h: 410 },
  solar: { x: 630, y: 210, w: 640, h: 398 }
};
let curCam = { x: 0, y: 0, w: 1312, h: 816 };
let tgtCam = { x: 0, y: 0, w: 1312, h: 816 };
let camAnim = null;

function setCam(next, presetName) {
  tgtCam = {
    w: Math.max(420, Math.min(1312, next.w)),
    h: Math.max(261, Math.min(816, next.h)),
    x: 0,
    y: 0
  };
  tgtCam.x = Math.max(0, Math.min(1312 - tgtCam.w, next.x));
  tgtCam.y = Math.max(0, Math.min(816 - tgtCam.h, next.y));

  if (presetName !== undefined) {
    $$('.mo-dbtn[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === presetName));
  }
  const zoomPct = Math.round((1312 / tgtCam.w) * 100);
  const zv = $('moZoomVal');
  if (zv) zv.textContent = zoomPct + '%';

  if (camAnim) cancelAnimationFrame(camAnim);
  function step() {
    let done = true;
    ['x', 'y', 'w', 'h'].forEach(k => {
      const diff = tgtCam[k] - curCam[k];
      if (Math.abs(diff) > 0.6) {
        curCam[k] += diff * 0.22;
        done = false;
      } else {
        curCam[k] = tgtCam[k];
      }
    });
    el.setAttribute('viewBox', `${curCam.x.toFixed(1)} ${curCam.y.toFixed(1)} ${curCam.w.toFixed(1)} ${curCam.h.toFixed(1)}`);
    if (!done) camAnim = requestAnimationFrame(step);
    else camAnim = null;
  }
  camAnim = requestAnimationFrame(step);
}

function focusAgentCam(id) {
  if (window.OFFICE3D) { window.OFFICE3D.focusAgent(id); return; }
  const pos = POS[id];
  if (!pos) return;
  const w = 680;
  const h = 423;
  setCam({ x: pos[0] - w / 2, y: pos[1] - h / 2 - 30, w, h }, '');
  const cObj = C.find(c => c.s.id === id);
  if (cObj) say(cObj, 4, performance.now() / 1000);
}

$$('.mo-dbtn[data-cam]').forEach(b => {
  b.onclick = () => {
    if (window.OFFICE3D) { window.OFFICE3D.setPreset(b.dataset.cam); return; }
    const p = CAM_PRESETS[b.dataset.cam];
    if (p) setCam(p, b.dataset.cam);
  };
});

if ($('moZoomIn')) {
  $('moZoomIn').onclick = () => {
    if (window.OFFICE3D) { window.OFFICE3D.zoomIn(); return; }
    const nw = Math.max(460, tgtCam.w * 0.8);
    const nh = nw * (816 / 1312);
    setCam({ x: tgtCam.x + (tgtCam.w - nw) / 2, y: tgtCam.y + (tgtCam.h - nh) / 2, w: nw, h: nh }, '');
  };
}
if ($('moZoomOut')) {
  $('moZoomOut').onclick = () => {
    if (window.OFFICE3D) { window.OFFICE3D.zoomOut(); return; }
    const nw = Math.min(1312, tgtCam.w * 1.25);
    const nh = nw * (816 / 1312);
    setCam({ x: tgtCam.x + (tgtCam.w - nw) / 2, y: tgtCam.y + (tgtCam.h - nh) / 2, w: nw, h: nh }, nw >= 1310 ? 'overview' : '');
  };
}

// Day / Night Office Lighting
const moShell = $('moShell');
const moLitBtn = $('moLitBtn');
if (moLitBtn && moShell) {
  moLitBtn.onclick = () => {
    const isNight = moShell.dataset.lit === 'night';
    moShell.dataset.lit = isNight ? 'day' : 'night';
    moLitBtn.textContent = isNight ? '🌙 กลางคืน' : '☀️ กลางวัน';
    if (window.OFFICE3D) window.OFFICE3D.setNight(!isNight);
    showMoToast(isNight ? '☀️ สลับเป็นแสงออฟฟิศกลางวัน' : '🌙 สลับเป็นบรรยากาศออฟฟิศกลางคืน');
  };
}
window.openAgent = openAgent;
window.showMoToast = showMoToast;

// 3D Office / 2D List View Switcher
const moCanvasWrap = $('moCanvasWrap');
const moListView = $('moListView');
const moDock = $('moDock');
const moStrip = $('moStrip');
function setOfficeView(v) {
  const isList = v === 'list';
  if (moShell) moShell.dataset.view = v;
  if (moCanvasWrap) moCanvasWrap.hidden = isList;
  if (moDock) moDock.hidden = isList;
  if (moStrip) moStrip.hidden = isList;
  if (moListView) moListView.hidden = !isList;
  if ($('moViewOffice')) $('moViewOffice').classList.toggle('on', !isList);
  if ($('moViewList')) $('moViewList').classList.toggle('on', isList);
}
if ($('moViewOffice')) $('moViewOffice').onclick = () => setOfficeView('office');
if ($('moViewList')) $('moViewList').onclick = () => setOfficeView('list');

// 2D List Search & Filter
let moFilterMode = 'all';
function applyMoListFilter() {
  const q = (($('moSearch') && $('moSearch').value) || '').trim().toLowerCase();
  $$('#mods .mod').forEach(card => {
    const id = card.dataset.id;
    const s = sOf(id);
    const a = AG[id];
    const txt = ((s ? s.n + ' ' + s.st : '') + ' ' + (a ? a.role + ' ' + a.duty : '')).toLowerCase();
    const isIdle = !s || s.st === ST0;
    const matchQ = !q || txt.includes(q);
    const matchF = moFilterMode === 'all' || (moFilterMode === 'active' ? !isIdle : isIdle);
    card.hidden = !(matchQ && matchF);
  });
}
if ($('moSearch')) $('moSearch').oninput = applyMoListFilter;
$$('.mo-fbtn').forEach(b => {
  b.onclick = () => {
    moFilterMode = b.dataset.f;
    $$('.mo-fbtn').forEach(x => x.classList.toggle('on', x === b));
    applyMoListFilter();
  };
});

// Toggle Integrated Summary Band inside Office HQ
if ($('moSumBtn') && $('moSumBand')) {
  $('moSumBtn').onclick = () => {
    const hidden = !$('moSumBand').hidden;
    $('moSumBand').hidden = hidden;
    $('moSumBtn').setAttribute('aria-pressed', hidden ? 'false' : 'true');
  };
}

// Toggle Right Activity Feed & Fullscreen
if ($('moFeedBtn') && $('moBody')) {
  $('moFeedBtn').onclick = () => {
    const hidden = $('moBody').classList.toggle('no-feed');
    $('moFeedBtn').setAttribute('aria-pressed', hidden ? 'false' : 'true');
    if (window.OFFICE3D) setTimeout(() => window.OFFICE3D.resize(), 40);
  };
}
if ($('moFullBtn') && moShell) {
  $('moFullBtn').onclick = () => {
    if (!document.fullscreenElement) {
      if (moShell.requestFullscreen) moShell.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };
}

let toastTimer = null;
function showMoToast(msg) {
  const t = $('moToast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

function renderOfficeHud(d, mode) {
  const isSample = mode === true;
  const chip = $('moModeChip');
  if (chip) {
    chip.textContent = isSample ? 'DEMO · ข้อมูลตัวอย่าง' : (typeof mode === 'string' ? 'ERR · เชื่อมไม่สำเร็จ' : 'LIVE · ข้อมูลจริง');
    chip.className = 'mo-chip' + (!isSample && typeof mode !== 'string' ? ' live' : '');
  }

  // Top floating agent strip
  if (moStrip) {
    moStrip.textContent = '';
    ORDER.forEach(id => {
      const s = sOf(id);
      if (!s) return;
      const b = E('button', 'mo-sp');
      b.style.setProperty('--c', s.c);
      b.appendChild(E('i'));
      b.appendChild(document.createTextNode(s.n + ' '));
      b.appendChild(E('small', '', (s.st || ST0).slice(0, 18)));
      b.onclick = () => { focusAgentCam(id); openAgent(id); };
      moStrip.appendChild(b);
    });
  }

  // Right sidebar mini KPIs
  const mk = $('moMiniKpis');
  if (mk) {
    mk.textContent = '';
    const inc = d.income && d.income.today;
    const rev = inc ? inc.reduce((a, x) => a + x.gross, 0) : (d.jobs ? d.jobs.gross : 0);
    const trips = inc ? inc.reduce((a, x) => a + x.n, 0) : (d.jobs ? d.jobs.count : 0);
    const kpiData = [
      ['รายได้วันนี้', fmt(rev) + ' ฿'],
      ['งานวันนี้', trips + ' เที่ยว'],
      ['เคส Captain', (d.captain ? d.captain.casesToday : '—') + ' เคส'],
      ['แบต Solar', (d.solar ? d.solar.battery + '%' : '—')]
    ];
    kpiData.forEach(pair => {
      const box = E('div', 'mo-kpi');
      box.appendChild(E('small', '', pair[0]));
      box.appendChild(E('b', '', pair[1]));
      mk.appendChild(box);
    });
  }

  // Right sidebar live activity feed
  const feed = $('moFeed');
  if (feed) {
    feed.textContent = '';
    const items = [];
    if (d.log && d.log.length) {
      d.log.slice(-6).reverse().forEach(r => {
        const agId = /grab|bolt|งาน|เที่ยวบิน|bkk|dmk/i.test(r.m) ? 'driver'
          : /เงิน|บิล|ค้าง|จ่าย/i.test(r.m) ? 'finance'
            : /profit|xau|ea|mt5/i.test(r.m) ? 'profit'
              : /solar|แบต|ไฟ/i.test(r.m) ? 'solar'
                : /captain|ประกัน/i.test(r.m) ? 'captain'
                  : /health|ออกกำลัง/i.test(r.m) ? 'health'
                    : 'script';
        items.push({ id: agId, t: r.t, m: r.m });
      });
    }
    if (!items.length) {
      ORDER.slice(0, 5).forEach(id => {
        const s = sOf(id);
        if (s) items.push({ id, t: 'ล่าสุด', m: s.st || ST0 });
      });
    }
    items.forEach(it => {
      const s = sOf(it.id) || { n: 'System', c: '#4fd1ff' };
      const card = E('div', 'mo-fitem');
      card.style.setProperty('--c', s.c);
      const h = E('div', 'mo-fitem-h');
      h.appendChild(E('strong', '', s.n));
      h.appendChild(E('time', '', it.t));
      card.appendChild(h);
      card.appendChild(E('p', '', it.m));
      card.onclick = () => { setOfficeView('office'); focusAgentCam(it.id); openAgent(it.id); };
      feed.appendChild(card);
    });
  }
  applyMoListFilter();
}

// ================== DRIVER LEDGER (ตารางรายได้ขับรถรายวัน) ==================
const DL_APPS = [
  ['grab', 'Grab'], ['bolt', 'Bolt'], ['goplus', 'GoPlus'], ['swiftgo', 'SwiftGo'],
  ['dier', 'Dier'], ['indrive', 'inDrive'], ['tada', 'TADA'], ['lalamove', 'Lalamove'],
  ['other', 'Other'], ['tip', 'Tip'], ['power', 'Power (ค่าไฟ)']
];
let dlSelectedMonth = '';
const fmtDec = n => {
  const v = Number(n) || 0;
  return v ? v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) : '-';
};

(function initDriverLedgerUI() {
  const inpBox = $('dlInputs');
  const dateEl = $('dlDate');
  const formBtn = $('dlFormBtn');
  const tableBtn = $('dlTableBtn');
  const formWrap = $('dlFormWrap');
  const tableWrap = $('dlTableWrap');
  const saveBtn = $('dlSaveBtn');
  if (!inpBox || !dateEl) return;

  const now = new Date();
  dateEl.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  const updatePreview = () => {
    let tot = 0, pwr = 0;
    DL_APPS.forEach(([k]) => {
      const el = $('dli-' + k);
      const v = parseFloat(el && el.value) || 0;
      if (k === 'power') pwr += v;
      else tot += v;
    });
    const net = tot - pwr;
    if ($('dlPrevTotal')) $('dlPrevTotal').textContent = 'Total: ' + tot.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ฿';
    if ($('dlPrevPower')) $('dlPrevPower').textContent = 'Power: ' + pwr.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ฿';
    if ($('dlPrevNet')) $('dlPrevNet').textContent = 'Net: ' + net.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ฿';
  };

  DL_APPS.forEach(([k, lbl]) => {
    const wrap = E('label', 'dl-inp-box');
    wrap.appendChild(document.createTextNode(lbl));
    const input = E('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.placeholder = '0';
    input.id = 'dli-' + k;
    input.addEventListener('input', updatePreview);
    wrap.appendChild(input);
    inpBox.appendChild(wrap);
  });

  if (formBtn && formWrap) {
    formBtn.onclick = () => {
      const open = formWrap.hidden;
      formWrap.hidden = !open;
      formBtn.setAttribute('aria-expanded', String(open));
      formBtn.textContent = open ? '− ซ่อนฟอร์มบันทึก' : '＋ บันทึกยอดขับรถ';
    };
  }
  if (tableBtn && tableWrap) {
    tableBtn.onclick = () => {
      const open = tableWrap.hidden;
      tableWrap.hidden = !open;
      tableBtn.setAttribute('aria-expanded', String(open));
      tableBtn.textContent = open ? '📋 ซ่อนตารางรายวัน' : '📋 ตารางรายวัน';
    };
  }
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const mode = ($('dlMode') && $('dlMode').value) || 'add';
      const dt = dateEl.value;
      const tokens = [];
      DL_APPS.forEach(([k]) => {
        const el = $('dli-' + k);
        const v = parseFloat(el && el.value) || 0;
        if (v > 0) tokens.push(k + ' ' + v);
      });
      if (!tokens.length) {
        if ($('dlCmdOut')) $('dlCmdOut').textContent = '⚠️ กรุณากรอกยอดอย่างน้อย 1 ช่องก่อนบันทึก';
        return;
      }
      const prefix = mode === 'set' ? 'แก้ยอดขับรถ ' : 'ขับรถ ';
      const cmd = prefix + (dt ? dt + ' ' : '') + tokens.join(' ');
      const ok = await sendCmd(cmd, { out: $('dlCmdOut') });
      if (ok) {
        DL_APPS.forEach(([k]) => { const el = $('dli-' + k); if (el) el.value = ''; });
        updatePreview();
      }
    };
  }
})();

function drawDriverLedger(d) {
  const mBox = $('dlMonths');
  const sBox = $('dlSummary');
  const tBox = $('dlTableWrap');
  if (!mBox || !sBox || !tBox) return;
  const dl = d && d.driverLedger;
  mBox.textContent = '';
  sBox.textContent = '';
  tBox.textContent = '';

  if (!dl || !dl.months || !dl.months.length) {
    sBox.appendChild(E('p', 'note', 'เชื่อมข้อมูลจริงเพื่อดูสรุปรายได้ขับรถรายเดือน (Driver_Ledger) หรือพิมพ์คำสั่ง "ขับรถ Grab 1200 Bolt 500 ไฟ 150" ใน LINE OA'));
    return;
  }

  if (!dlSelectedMonth || !dl.months.some(x => x.m === dlSelectedMonth)) {
    dlSelectedMonth = dl.months[dl.months.length - 1].m;
  }

  dl.months.forEach(bm => {
    const b = E('button', 'dl-mbtn' + (bm.m === dlSelectedMonth ? ' on' : ''), bm.m + ' (' + fmt(bm.net) + ' ฿)');
    b.type = 'button';
    b.onclick = () => { dlSelectedMonth = bm.m; drawDriverLedger(LASTD || d); };
    mBox.appendChild(b);
  });

  const cur = dl.months.find(x => x.m === dlSelectedMonth) || dl.months[dl.months.length - 1];
  const kpis = E('div', 'dl-kpis');
  [
    ['รายได้รวม (Total)', cur.total.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ฿', ''],
    ['ค่าชาร์จไฟ (Power)', cur.power.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ฿', 'pwr'],
    ['รายได้สุทธิ (Net)', cur.net.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ฿', 'net'],
    ['เฉลี่ย/วัน (' + cur.days + ' วัน)', fmt(cur.avgNet) + ' ฿/วัน', '']
  ].forEach(([lbl, val, cls]) => {
    const k = E('div', 'dl-kpi' + (cls ? ' ' + cls : ''));
    k.appendChild(E('small', '', lbl));
    k.appendChild(E('strong', '', val));
    kpis.appendChild(k);
  });
  sBox.appendChild(kpis);

  const appsGrid = E('div', 'dl-apps');
  DL_APPS.filter(([k]) => k !== 'power').forEach(([k, lbl]) => {
    const v = (cur.byApp && cur.byApp[k]) || 0;
    if (!v) return;
    const r = E('div', 'dl-app-row');
    r.appendChild(E('span', '', lbl));
    r.appendChild(E('strong', '', v.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ฿'));
    appsGrid.appendChild(r);
  });
  sBox.appendChild(appsGrid);

  const rows = (dl.rowsByMonth && dl.rowsByMonth[cur.m]) || [];
  if (rows.length) {
    const tbl = E('table', 'dl-tbl');
    const thead = E('thead');
    const hr = E('tr');
    ['Date', 'Grab', 'Bolt', 'GoPlus', 'SwiftGo', 'Dier', 'inDrive', 'TADA', 'Lalamove', 'Other', 'Tip', 'Total', 'Power', 'Net'].forEach(h => hr.appendChild(E('th', '', h)));
    thead.appendChild(hr);
    tbl.appendChild(thead);
    const tbody = E('tbody');
    rows.forEach(r => {
      const tr = E('tr', r.net < 0 ? 'neg' : '');
      tr.appendChild(E('td', '', r.date));
      ['grab', 'bolt', 'goplus', 'swiftgo', 'dier', 'indrive', 'tada', 'lalamove', 'other', 'tip'].forEach(k => tr.appendChild(E('td', '', fmtDec(r[k]))));
      tr.appendChild(E('td', 'tot', fmtDec(r.total)));
      tr.appendChild(E('td', 'pwr', fmtDec(r.power)));
      tr.appendChild(E('td', 'net', fmtDec(r.net)));
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    tBox.appendChild(tbl);
  }
}

if (CFG.url && CFG.key) startPoll();
else showOff();
