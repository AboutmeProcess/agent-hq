/**
 * Driver HQ – Telegram Bot (Google Apps Script) v12
 * เที่ยวบินสด (AeroDataBox) · จราจรจาก GPS · ค้นหาเส้นทาง · สถานที่โปรด · บันทึกงาน · สรุปรายได้
 *
 * Script Properties: BOT_TOKEN, OWNER_CHAT_ID, AERODATABOX_KEY
 * หน้า AGENT HQ (แดชบอร์ด): DASH_KEY = รหัสลับยาวๆ (ตั้งเองแล้วกรอกในหน้าแดชบอร์ด ห้ามฝังใน GitHub)
 * สั่งงานจากหน้าเว็บ: ตั้ง DASH_ALLOW_CMD = true (ปิดไว้เป็นค่าเริ่มต้น เพราะสั่งแก้ข้อมูลในชีตได้)
 * ไม่บังคับ: GOOGLE_MAPS_KEY (ใช้เฉพาะค้นเส้นทางไปปลายทาง ไม่ตั้งก็ได้ บอทจะส่งปุ่มเปิด Google Maps แทน) · MAPS_DAILY_LIMIT (เพดานเรียก API ต่อวัน ค่าเริ่มต้น 100) · EV_COST_PER_DAY (ต้นทุนชาร์จ EV ต่อวัน, บาท) · GAS_SECRET (รหัสลับป้องกันคนยิงลิงก์ตรง)
 * ถ้าใช้ Cloudflare Worker: WORKER_URL, WEBHOOK_SECRET (ใส่ใน Script properties เท่านั้น ห้ามวางในโค้ด)
 */
const SETUP_TOKEN = '';   // วางโทเคนใหม่ชั่วคราวตอนรัน setupAll แล้วลบทิ้งทันที
const WEBAPP_URL = 'PASTE_EXEC_URL';

const SHEET_FLIGHTS = 'Airport_Flights';
const SHEET_HOT = 'Events_Hotspots';
const HEADER_ROW = 7;
const TZ = 'Asia/Bangkok';
let OUT_ = null;   // ถ้าไม่เป็น null ข้อความตอบกลับจะถูกเก็บไว้ส่งให้หน้าเว็บ แทนการส่งเข้า Telegram

const LANDED_COUNT = 5;      // จำนวนเที่ยวบินที่ลงแล้วที่แสดง
const UPCOMING_COUNT = 2;    // จำนวนเที่ยวบินที่กำลังจะลง
const LIVE_BACK = 240;       // ดึงข้อมูลย้อนหลังกี่นาที
const LIVE_SPAN = 480;       // ความยาวช่วงที่ดึง (นาที) 240+480 = ย้อน 4 ชม. ถึงล่วงหน้า 4 ชม.
const LIVE_CACHE_SEC = 180;  // เก็บผล API ไว้กี่วินาที (ประหยัดโควตา)
const STALE_MIN = 90;        // เที่ยวบินที่ยังไม่ลงแต่เลยเวลาคาดการณ์เกินกี่นาที ถือว่าข้อมูลค้าง ไม่แสดง
// จุดสแตนด์บายตั้งต้น ใช้เมื่อเที่ยวบินไม่มีในชีต (ข้อความนี้มาจากโค้ดเดิมของคุณ ผมไม่ได้ตรวจสอบสถานที่จริง แก้หรือเว้นว่างได้)
const DEFAULT_STANDBY = { BKK: 'ลานจอดระยะยาว BKK / PTT กม.14', DMK: 'ปั๊ม ปตท. วิภาวดี / ลานจอดเจเลิศ' };
const T_LANDING = 15, T_JUST = 10, T_BAGGAGE = 45, T_DELAY = 15, T_SLIGHT = 5;
const SHEET_JOBS = 'Daily_Jobs';
// ปุ่มใช้เลขลำดับแทนข้อความ เพราะ callback_data ของ Telegram จำกัด 64 ไบต์ (ภาษาไทย 1 ตัว = 3 ไบต์)
const DESTS = [
  { t: '✈️ สุวรรณภูมิ (BKK)', q: 'สุวรรณภูมิ (BKK)' }, { t: '✈️ ดอนเมือง (DMK)', q: 'ท่าอากาศยานดอนเมือง' },
  { t: '🛍️ เซ็นทรัลลาดพร้าว', q: 'Central Ladprao' }, { t: '🛍️ ฟิวเจอร์พาร์ค รังสิต', q: 'Future Park Rangsit' },
  { t: '🏢 สาทร / สีลม', q: 'สาทร กรุงเทพ' }, { t: '🛍️ สยามพารากอน', q: 'Siam Paragon' },
  { t: '🅿️ ปั๊ม PTT กม.14', q: 'ปั๊ม ปตท บางนาตราด กม.14' }
];
const QUICK = [
  { t: '🚖 Grab 200 (สุวรรณภูมิ)', p: 'Grab', f: 200, o: 'สุวรรณภูมิ' }, { t: '🚖 Grab 300 (ในเมือง)', p: 'Grab', f: 300, o: 'ในเมือง' },
  { t: '🚗 Bolt 150 (สั้น)', p: 'Bolt', f: 150, o: 'ทั่วไป' }, { t: '🚗 Bolt 250 (ยาว)', p: 'Bolt', f: 250, o: 'ชานเมือง' }
];

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function ok_() { return ContentService.createTextOutput('ok'); }
function doGet(e) {   // ?action=status&k=DASH_KEY → ข้อมูลสถานะให้หน้าแดชบอร์ด (ไม่เรียก API เที่ยวบิน ไม่เสียโควตา)
  const p = (e && e.parameter) || {};
  if (p.action === 'line') return ok_();   // ให้ LINE Developers กด Verify Webhook ผ่านทันที
  if (p.action !== 'status') return ContentService.createTextOutput('Driver HQ bot is running');
  const key = prop_('DASH_KEY');
  let out;
  if (!key || p.k !== key) out = { ok: false, error: 'unauthorized' };
  else {
    try {
      const cache = CacheService.getScriptCache();
      const cached = p.nocache ? null : cache.get('status_json_v12');
      if (cached) {
        if (p.callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(p.callback)) {
          return ContentService.createTextOutput(p.callback + '(' + cached + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
      }
      out = statusJson_();
      const freshJson = JSON.stringify(out);
      try { cache.put('status_json_v12', freshJson, 45); } catch (ce) {}
      if (p.callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(p.callback)) {
        return ContentService.createTextOutput(p.callback + '(' + freshJson + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(freshJson).setMimeType(ContentService.MimeType.JSON);
    } catch (err) { console.error(err); out = { ok: false, error: 'server error' }; }
  }
  const json = JSON.stringify(out);
  if (p.callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// ---------- รับข้อความจาก Telegram ----------
function owner_() { return String(prop_('OWNER_CHAT_ID') || '').trim(); }

function doPost(e) {
  if (!e || !e.postData) return ok_();
  if (e.parameter && e.parameter.action === 'cmd') return webCmd_(e);   // คำสั่งจากหน้าเว็บ (ตรวจ DASH_KEY ในนั้น)
  if (e.parameter && e.parameter.action === 'webhook' && typeof modulesWebhook_ === 'function') return modulesWebhook_(e);   // Webhook จาก MT5 EA / Solar
  if (e.parameter && e.parameter.action === 'line' && typeof lineWebhook_ === 'function') return lineWebhook_(e);   // Webhook จาก LINE OA (Messaging API)
  try {
    const need = prop_('GAS_SECRET');   // ถ้าตั้งไว้ ต้องมี ?s=รหัส ต่อท้ายลิงก์ที่ Worker เรียก
    if (need && (!e.parameter || e.parameter.s !== need)) return ok_();
    const u = JSON.parse(e.postData.contents);
    const cache = CacheService.getScriptCache();
    if (cache.get('u' + u.update_id)) return ok_();
    cache.put('u' + u.update_id, '1', 600);

    if (u.callback_query) { handleCallback_(u.callback_query); return ok_(); }

    const m = u.message || u.edited_message;
    if (!m) return ok_();
    const chat = String(m.chat.id), owner = owner_();
    if (!owner) {
      send_(chat, 'ยังไม่ได้ตั้ง OWNER_CHAT_ID\nChat ID ของคุณคือ: <code>' + chat + '</code>\nนำไปใส่ใน Script properties แล้วลองใหม่');
      return ok_();
    }
    if (chat !== owner) { console.log('ข้อความจากแชทที่ไม่ใช่เจ้าของ: ' + chat); return ok_(); }
    touch_();

    if (m.location) {
      cache.put('lat_' + chat, String(m.location.latitude), 1800);
      cache.put('lng_' + chat, String(m.location.longitude), 1800);
      if (u.edited_message) return ok_();   // Live Location ส่งอัปเดตถี่ๆ: บันทึกพิกัดเงียบๆ ไม่ตอบ ไม่เรียก API
      sendTrafficLinks_(chat, m.location.latitude, m.location.longitude);
      sendDestinationsMenu_(chat);
      return ok_();
    }
    if (m.text) handleText_(chat, m.text.trim());
  } catch (err) { console.error(err); noteError_(err); }
  return ok_();
}

function handleCallback_(cq) {
  if (!cq.message) return;
  const chat = String(cq.message.chat.id);
  tg_('answerCallbackQuery', { callback_query_id: cq.id });
  if (chat !== owner_()) return;           // ปุ่มกดก็ต้องเป็นเจ้าของเท่านั้น
  touch_();
  const data = String(cq.data || '');      // ฟิลด์ของ Telegram คือ data (ไม่ใช่ callback_data)
  let m;
  if (data === 'fav_clear') { saveFavs_([]); send_(chat, '🗑️ ล้างรายการสถานที่โปรดเรียบร้อยแล้วครับ'); }
  else if ((m = data.match(/^fav_(\d+)$/))) { const p = favs_()[Number(m[1])]; if (p) sendRoute_(chat, p); else send_(chat, 'ไม่พบสถานที่นี้แล้ว'); }
  else if ((m = data.match(/^d_(\d+)$/))) { const d = DESTS[Number(m[1])]; if (d) sendRoute_(chat, d.q); }
  else if ((m = data.match(/^q_(\d+)$/))) { const q = QUICK[Number(m[1])]; if (q) send_(chat, recordJobToSheet_(chat, 'บันทึก ' + q.p + ' ' + q.f + ' ' + q.o)); }
}

function clearStatusCache_() {
  try { CacheService.getScriptCache().remove('status_json_v12'); } catch (e) {}
}

function handleText_(chat, text) {
  clearStatusCache_();   // ล้างแคชสถานะทันทีเมื่อมีการสั่งงาน เพื่อให้หน้าเว็บเห็นค่าล่าสุดทันที
  if (/^\/dash|แดชบอร์ด/i.test(text.trim())) return sendDashLink_(chat);   // ลิงก์เปิดหน้า AGENT HQ แบบเชื่อมข้อมูลแล้ว
  if (/^\/brief|สรุปเช้า|สรุปรวม/i.test(text.trim()) && typeof sendMorningBriefing_ === 'function') return sendMorningBriefing_(chat);
  if (typeof budgetCommand_ === 'function' && budgetCommand_(chat, text)) return;   // แผนเงินรายวัน (ไฟล์ budget.gs)
  if (typeof modulesCommand_ === 'function' && modulesCommand_(chat, text)) return;   // โมดูล Captain / Take Profit / Solar / Healthy (ไฟล์ modules.gs)
  const s = text.toLowerCase();
  if (/\/fav|โปรด/.test(s)) return sendFavoritesMenu_(chat);
  if (/\/dest|ปลายทาง|เลือกสถานที่/.test(s)) return sendDestinationsMenu_(chat);
  if (/\/quick|เมนูด่วน/.test(s)) return sendQuickJobMenu_(chat);
  if (/\/traffic|จราจร|รถติด/.test(s)) { const c = CacheService.getScriptCache(); return sendTrafficLinks_(chat, Number(c.get('lat_' + chat)), Number(c.get('lng_' + chat))); }
  if (/\/summary|สรุป|รายได้|ยอดรวม/.test(s)) return send_(chat, getDailySummary_());
  if (/^บันทึก/.test(text)) {
    const body = text.replace(/^บันทึกงาน\s*|^บันทึก\s*/, '').trim();
    if (!body) return send_(chat, 'พิมพ์ได้สองแบบ\n• <code>บันทึก Grab 250 ทิป 20 สยาม ไป สาทร</code> (บันทึกงาน)\n• <code>บันทึก ชื่อสถานที่</code> (เพิ่มสถานที่โปรด)');
    const isJob = /^บันทึกงาน/.test(text) || /^\d/.test(body) || /^(grab|bolt|indrive|in-drive|line\s?man|lalamove|maxim)\s*\d/i.test(body) || /^\S+\s+\d{2,}(\s|$)/.test(body);   // ขึ้นต้นด้วยตัวเลข หรือ ชื่อแอป+ตัวเลข = บันทึกงาน
    if (isJob) return send_(chat, recordJobToSheet_(chat, text));
    addFavorite_(body);
    return send_(chat, '⭐ บันทึก <b>"' + esc_(body) + '"</b> ลงในสถานที่โปรดเรียบร้อยครับ!');
  }
  if (/^ไป\s+|^เส้นทางไป\s+|^วิ่งไป\s+/.test(s)) return sendRoute_(chat, text.replace(/^ไป\s+|^เส้นทางไป\s+|^วิ่งไป\s+/, '').trim());
  send_(chat, route_(text, chat));
}

function tg_(method, payload) {
  if (OUT_ !== null) {   // โหมดสั่งจากเว็บ: เก็บข้อความ ไม่ส่งเข้า Telegram
    if (method === 'sendMessage') OUT_.push(String(payload.text || ''));
    return { getResponseCode: function () { return 200; }, getContentText: function () { return '{"ok":true}'; } };
  }
  return UrlFetchApp.fetch('https://api.telegram.org/bot' + prop_('BOT_TOKEN') + '/' + method, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify(payload)
  });
}

function send_(chat, text) {
  if (OUT_ !== null) { OUT_.push(String(text)); return; }
  const parts = [];
  let cur = '';
  String(text).split('\n\n').forEach(function (p) {
    if ((cur + '\n\n' + p).length > 3800) { parts.push(cur); cur = p; } else { cur = cur ? cur + '\n\n' + p : p; }
  });
  if (cur) parts.push(cur);
  parts.forEach(function (t) {
    const r = tg_('sendMessage', { chat_id: chat, text: t, parse_mode: 'HTML', disable_web_page_preview: true });
    if (r.getResponseCode() !== 200) {   // ถ้า HTML มีปัญหา ส่งซ้ำเป็นข้อความธรรมดา
      console.log('sendMessage ผิดพลาด: ' + r.getContentText());
      tg_('sendMessage', { chat_id: chat, text: t.replace(/<[^>]+>/g, ''), disable_web_page_preview: true });
    }
  });
}

// ---------- ฟังก์ชันช่วย ----------
function mins_(v) { const m = String(v).match(/(\d{1,2})[:.](\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function diff_(a, b) { return ((a - b + 720 + 1440) % 1440) - 720; }
function nowMin_() { return mins_(Utilities.formatDate(new Date(), TZ, 'HH:mm')); }
function stamp_() { return Utilities.formatDate(new Date(), TZ, 'HH:mm'); }
function hhmm_(x) { return x && x.local ? String(x.local).slice(11, 16) : ''; }
function esc_(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function ln_(icon, label, v) {
  v = String(v == null ? '' : v).trim();
  return (!v || v === '-') ? '' : icon + ' <b>' + label + ':</b> ' + esc_(v) + '\n';
}
function dur_(m) { if (m < 60) return m + ' นาที'; const h = Math.floor(m / 60), r = m % 60; return h + ' ชม.' + (r ? ' ' + r + ' นาที' : ''); }
const GONE = /^(canceled|diverted)/i;

// ---------- ข้อมูลจากชีต (ข้อมูลเสริมและสำรอง) ----------
function parseFlightSheet_(sh, forcedAp) {
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const cols = Math.min(12, Math.max(6, sh.getLastColumn()));
  const rows = sh.getRange(1, 1, last, cols).getDisplayValues();
  return rows
    .filter(function (r) { return /^[A-Za-z0-9]{2}\s?\d{2,4}$/.test(String(r[0] || '').trim()); })
    .map(function (r) {
      const ap = forcedAp || (/dmk|ดอนเมือง/i.test(String(r[1] || '')) ? 'DMK' : 'BKK');
      const apName = r[1] || (ap === 'DMK' ? 'ดอนเมือง (DMK)' : 'สุวรรณภูมิ (BKK)');
      return {
        code: String(r[0]).trim().toUpperCase().replace(/\s/g, ''),
        ap: ap,
        apName: apName, type: r[2] || 'ขาเข้า', route: r[3] || '-', sched: r[4] || '-', est: r[5] || r[4] || '-', airline: r[6] || '-', craft: r[7] || '-',
        pax: r[8] || '-', gate: r[9] || '-', standby: r[10] || DEFAULT_STANDBY[ap] || '-', tip: r[11] || '-',
        sm: mins_(r[4]), em: mins_(r[5] || r[4]), api: '', where: '', belt: '', src: 'sheet'
      };
    });
}

function flights_() {
  const ss = SpreadsheetApp.getActive();
  const main = parseFlightSheet_(ss.getSheetByName(SHEET_FLIGHTS), null);
  if (main.length) return main;
  // รองรับชีตแยก BKK_Flights และ DMK_Flights ที่มีอยู่ในชีตจริง
  return parseFlightSheet_(ss.getSheetByName('BKK_Flights'), 'BKK')
    .concat(parseFlightSheet_(ss.getSheetByName('DMK_Flights'), 'DMK'));
}

// ---------- ข้อมูลสดจาก AeroDataBox (เก็บแคช) ----------
function liveFlights_(ap, cacheOnly) {
  const cache = CacheService.getScriptCache(), ck = 'live_' + ap;
  const hit = cache.get(ck);
  if (hit) return JSON.parse(hit);
  if (cacheOnly) return { live: null, why: 'ยังไม่มีข้อมูลล่าสุด', list: [] };   // แดชบอร์ดอ่านแคชอย่างเดียว ไม่เรียก API
  const sheetList = flights_().filter(function (f) { return f.ap === ap; });
  const key = prop_('AERODATABOX_KEY');
  if (!key) return { live: false, why: 'ไม่ได้ตั้ง API key', list: sheetList };
  try {
    const url = 'https://aerodatabox.p.rapidapi.com/flights/airports/iata/' + ap +
      '?offsetMinutes=-' + LIVE_BACK + '&durationMinutes=' + LIVE_SPAN + '&direction=Arrival' +
      '&withLeg=false&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false';
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' } });
    if (r.getResponseCode() !== 200) return { live: false, why: 'API ตอบ ' + r.getResponseCode(), list: sheetList };
    const info = {};
    sheetList.forEach(function (f) { info[f.code] = f; });
    const list = (JSON.parse(r.getContentText()).arrivals || []).map(function (f) {
      const m = f.movement || {}, code = String(f.number || '').replace(/\s/g, '').toUpperCase(), s = info[code] || {};
      const sch = hhmm_(m.scheduledTime), rev = hhmm_(m.revisedTime), run = hhmm_(m.runwayTime);
      const est = run || rev || sch;
      if (!code || !est) return null;
      const o = (m.airport && (m.airport.name || m.airport.iata)) ||
        (f.departure && f.departure.airport && f.departure.airport.name) || s.route || '-';
      const status = String(f.status || '');
      return {
        code: code, ap: ap, apName: ap === 'BKK' ? 'สุวรรณภูมิ (BKK)' : 'ดอนเมือง (DMK)', type: 'ขาเข้า', route: o, sched: sch || est, est: est,
        airline: (f.airline && f.airline.name) || s.airline || '-', craft: (f.aircraft && f.aircraft.model) || s.craft || '-',
        pax: s.pax || '-', gate: s.gate || '-', standby: s.standby || DEFAULT_STANDBY[ap] || '-', tip: s.tip || '-',
        sm: mins_(sch || est), em: mins_(est), api: status, landed: /^arrived/i.test(status) || !!run,
        where: [m.terminal ? 'Terminal ' + m.terminal : '', m.gate ? 'ประตู ' + m.gate : ''].filter(String).join(' '),
        belt: m.baggageBelt ? String(m.baggageBelt) : '', src: 'live'
      };
    }).filter(Boolean);
    const out = { live: true, why: '', list: list };
    cache.put(ck, JSON.stringify(out), LIVE_CACHE_SEC);
    return out;
  } catch (err) {
    console.error(err);
    return { live: false, why: 'เรียก API ไม่สำเร็จ', list: sheetList };
  }
}

function prep_(list, n, live) {
  return list.filter(function (f) { return f.em !== null; }).map(function (f) {
    f.d = diff_(f.em, n);
    if (!live) f.landed = f.d <= 0;
    return f;
  });
}

// ---------- สถานะและรูปแบบข้อความ ----------
function status_(f) {
  const s = f.api || '', d = f.d;
  if (/^canceled/i.test(s)) return '❌ ยกเลิกเที่ยวบิน';
  if (/diverted/i.test(s)) return '↪️ เปลี่ยนเส้นทางไปลงที่อื่น';
  if (f.landed) {
    if (d >= -T_JUST) return '🛬 เพิ่งลงจอด';
    if (d >= -T_BAGGAGE) return f.belt ? '🧳 รับกระเป๋าสายพาน ' + f.belt : '🧳 ประเมินว่ากำลังรอรับกระเป๋า';
    return '🚶 ผู้โดยสารทยอยออกแล้ว';
  }
  if (/approaching/i.test(s)) return '🛬 กำลังลงจอด';
  if (d < 0) return '⏳ เลยเวลาคาดการณ์ ยังไม่มีข้อมูลลงจอด';
  if (!s && d <= T_LANDING) return '🛬 กำลังลงจอด';
  if (/delayed/i.test(s)) return '⚠️ เครื่องล่าช้า';
  return '✈️ กำลังบินมา';
}

function delay_(f) {
  if (f.sm === null || f.em === null) return '';
  let x = diff_(f.em, f.sm);
  if (!f.landed && f.d < 0) x = x - f.d;   // ยังไม่ลงแต่เลยเวลาคาดการณ์แล้ว: ใช้เวลาปัจจุบันเทียบกับตาราง ไม่แสดง "ตรงเวลา"
  if (x >= T_DELAY) return '⚠️ ล่าช้า ' + x + ' น.';
  if (x >= T_SLIGHT) return '🟡 ช้ากว่าตาราง ' + x + ' น.';
  if (x <= -T_SLIGHT) return '🟢 ก่อนเวลา ' + (-x) + ' น.';
  return '🟢 ตรงเวลา';
}

// ค่าประเมินอัตโนมัติ ใช้เมื่อเที่ยวบินไม่มีในชีต เป็นการเดาจากต้นทาง/เวลา ไม่ใช่ข้อมูลจริง (ข้อความจะมีคำว่า "ประเมิน" กำกับ)
const DOMESTIC = /chiang mai|chiang rai|phuket|samui|ubon|hat yai|krabi|surat thani|udon thani|khon kaen|nakhon si|phitsanulok|lampang|trang|เชียงใหม่|เชียงราย|ภูเก็ต|สมุย|อุบล|หาดใหญ่|กระบี่|สุราษฎร์|อุดร|ขอนแก่น|นครศรี|พิษณุโลก|ลำปาง|ตรัง/i;
const LONGHAUL = /seoul|korea|japan|tokyo|osaka|london|frankfurt|dubai|doha|abu dhabi|singapore|china|shanghai|paris|zurich|istanbul/i;
function getAutoPax_(f) {
  const route = String(f.route || '');
  if (DOMESTIC.test(route)) return 'คนไทย / นักท่องเที่ยวในประเทศ (ประเมินจากต้นทาง)';
  if (LONGHAUL.test(route)) return 'นักท่องเที่ยวต่างชาติ / Expat / นักธุรกิจ (ประเมินจากต้นทาง)';
  return 'ยังประเมินไม่ได้ (กรอกในชีตเพื่อให้แสดงข้อมูลจริง)';
}
function getAutoTip_(f) {
  const h = f.em ? Math.floor(f.em / 60) : 12;
  if (f.ap === 'BKK') {
    if (h >= 5 && h <= 9) return 'ช่วงเช้า: วิ่งทางราบหรือมอเตอร์เวย์มุ่งหน้าสุขุมวิท/สาทร (ประเมินตามช่วงเวลา)';
    if (h >= 16 && h <= 19) return 'ช่วงเย็นรถหนาแน่น: พิจารณามอเตอร์เวย์ต่อทางด่วนศรีรัช/บูรพาวิถี (ประเมินตามช่วงเวลา)';
    if (h >= 22 || h <= 4) return 'ช่วงดึก: รถไฟปิด งานระยะไกลมีโอกาสมากขึ้น (ประเมินตามช่วงเวลา)';
    return 'มอเตอร์เวย์เชื่อมทางด่วนศรีรัชเข้าเมือง (ประเมินตามช่วงเวลา)';
  }
  if (h >= 7 && h <= 10) return 'ช่วงเช้า: วิภาวดีติด พิจารณาทางยกระดับดอนเมืองโทลล์เวย์ (ประเมินตามช่วงเวลา)';
  if (h >= 17 && h <= 20) return 'ช่วงเย็นรถหนาแน่น: โทลล์เวย์มุ่งหน้ารัชดา/จตุจักร/ประตูน้ำ (ประเมินตามช่วงเวลา)';
  if (h >= 22 || h <= 4) return 'ช่วงดึก: ผู้โดยสารพึ่งแอปมาก งานเข้าเมืองมีโอกาส (ประเมินตามช่วงเวลา)';
  return 'ทางยกระดับดอนเมืองโทลล์เวย์มุ่งหน้าจตุจักร/รัชดา/ประตูน้ำ (ประเมินตามช่วงเวลา)';
}

function bc_(f) {   // แสดงครบ 12 หัวข้อตามลำดับคอลัมน์ในชีต + แถวสถานะ
  const v = function (x) { x = String(x == null ? '' : x).trim(); return esc_(x || '-'); };
  const when = f.landed ? 'ลงแล้ว ' + dur_(Math.max(0, -f.d)) + ' ที่แล้ว' : (f.d >= 0 ? 'อีก ' + dur_(f.d) : 'เลยเวลา ' + dur_(-f.d));
  const real = (f.src === 'live' && f.landed) ? ' (ลงจริง)' : '';
  const pickup = [f.gate, f.where, f.belt ? 'สายพาน ' + f.belt : ''].filter(function (x) { return x && x !== '-'; }).join(' · ') || '-';
  const pax = (!f.pax || f.pax === '-') ? getAutoPax_(f) : f.pax;
  const tip = (!f.tip || f.tip === '-') ? getAutoTip_(f) : f.tip;
  return '<b>✈️ รหัสเที่ยวบิน:</b> ' + v(f.code) + '\n' +
    '<b>🏢 สนามบิน:</b> ' + v(f.apName) + '\n' +
    '<b>🛬 ประเภท:</b> ' + v(f.type) + '\n' +
    '<b>🛫 ต้นทาง / ปลายทาง:</b> ' + v(f.route) + '\n' +
    '<b>🕐 เวลาตามตาราง:</b> ' + v(f.sched) + '\n' +
    '<b>⏰ เวลาคาดการณ์:</b> ' + v(f.est) + real + '\n' +
    '<b>📌 สถานะ:</b> ' + status_(f) + ' · ' + when + (delay_(f) ? ' · ' + delay_(f) : '') + '\n' +
    '<b>🏷 สายการบิน:</b> ' + v(f.airline) + '\n' +
    '<b>🛩 ประเภทเครื่องบิน / ความจุ:</b> ' + v(f.craft) + '\n' +
    '<b>👥 กลุ่มเป้าหมายผู้โดยสาร:</b> ' + v(pax) + '\n' +
    '<b>🚪 จุดนัดรับ / ประตูทางออก:</b> ' + v(pickup) + '\n' +
    '<b>🅿️ จุดสแตนด์บายรถรอเรียก:</b> ' + v(f.standby) + '\n' +
    '<b>💡 กลยุทธ์และเส้นทางแนะนำ:</b> ' + v(tip);
}

const SEP = '\n\n───────────────────\n\n';

function board_(ap) {
  const n = nowMin_(), name = ap === 'BKK' ? 'สุวรรณภูมิ (BKK)' : 'ดอนเมือง (DMK)';
  const L = liveFlights_(ap), all = prep_(L.list, n, L.live);
  const gone = all.filter(function (f) { return GONE.test(f.api || ''); });
  const ok = all.filter(function (f) { return !GONE.test(f.api || ''); });
  const landed = ok.filter(function (f) { return f.landed; }).sort(function (a, b) { return b.d - a.d; }).slice(0, LANDED_COUNT);
  const coming = ok.filter(function (f) { return !f.landed && f.d >= -STALE_MIN; }).sort(function (a, b) { return a.d - b.d; }).slice(0, UPCOMING_COUNT);
  const src = L.live ? '🟢 ข้อมูลสดจาก AeroDataBox' : '⚪ ข้อมูลสำรองจากชีต (' + L.why + ') ไม่ใช่ข้อมูลสด';
  return '<b>🛬 ' + name + '</b> · เวลาไทย ' + stamp_() + '\n' + src + '\n\n' +
    '<b>ลงแล้ว ' + landed.length + ' เที่ยวล่าสุด</b>\n\n' + (landed.length ? landed.map(bc_).join(SEP) : 'ไม่มีข้อมูลเที่ยวบินช่วงนี้') + '\n\n' +
    '<b>กำลังจะลง ' + coming.length + ' เที่ยวถัดไป</b>\n\n' + (coming.length ? coming.map(bc_).join(SEP) : 'ไม่มีข้อมูลเที่ยวบินช่วงนี้') +
    (gone.length ? '\n\n❌ <b>ยกเลิก/เปลี่ยนเส้นทาง:</b> ' + gone.map(function (f) { return f.code + ' (' + esc_(f.route) + ')'; }).join(', ') : '');
}

// ---------- คำสั่งบอท ----------
function help_() {
  return '<b>🚖 Driver HQ</b>\n\n' +
    '/bkk – กระดานเที่ยวบินสุวรรณภูมิ\n/dmk – กระดานเที่ยวบินดอนเมือง\n/now – ทั้งสองสนามบิน\n/next – 3 เที่ยวบินถัดไป\n' +
    '/traffic – เปิดแผนที่จราจรสดรอบตัวใน Google Maps (ส่ง Location ก่อน)\n/dest – ปุ่มเลือกปลายทาง\n/fav – สถานที่โปรด\n/quick – ปุ่มบันทึกงานด่วน\n/dash – เปิดหน้า About Me Process (เชื่อมข้อมูลให้อัตโนมัติ)\n/summary – สรุปรายได้วันนี้\n/budget – วันนี้ต้องหาเท่าไร\n/bills – รายการรายจ่ายเดือนนี้\n\n' +
    'พิมพ์ได้: รหัสเที่ยวบิน เช่น <code>TG404</code> · <code>ไป สยามพารากอน</code> · <code>บันทึก Grab 250 ทิป 20 สยาม ไป สาทร</code> · <code>บันทึก ชื่อสถานที่</code> (เพิ่มรายการโปรด)\n\n' +
    '💡 <i>แชร์ Location (ปกติหรือ Live) เพื่อค้นเส้นทางจากจุดปัจจุบัน</i>';
}

function route_(t, chat) {
  const s = t.toLowerCase().replace(/@\w+/, '').trim();
  const ap = /bkk|สุวรรณภูมิ/.test(s) ? 'BKK' : /dmk|ดอนเมือง/.test(s) ? 'DMK' : '';
  if (/^\/(start|help)|^ช่วย|^เมนู/.test(s)) return help_();
  if (/\/hot|ฮอต|อีเวนต์|event/.test(s)) return hot_();
  if (/\/peak|พีค|peak/.test(s)) return peak_();
  if (/\/all|ทั้งหมด/.test(s)) return list_(ap);
  if (/\/next|ถัดไป/.test(s)) return next_(ap);
  const c2 = s.match(/\b([a-z][a-z0-9]|[0-9][a-z])\s?(\d{2,4})\b/);
  if (c2) return detail_((c2[1] + c2[2]).toUpperCase());
  if (/\/now|ตอนนี้|ใกล้ลง|ลงแล้ว|สถานะ/.test(s) || ap) return now_(ap);
  return '🤔 ยังไม่เข้าใจข้อความนี้: “' + esc_(t.slice(0, 60)) + '”\n\nลองพิมพ์แบบนี้ได้ เช่น\n• <code>วันนี้ต้องหาเท่าไร</code>\n• <code>ฉันมีเงิน 3011+420+3041</code>\n• <code>ฉันจ่ายหนี้ 4000 แล้ว ด้วยเงินสด</code>\n• <code>จ่ายแล้ว honda</code>\n• <code>บันทึก Grab 250 ทิป 20</code>\n• <code>/help</code> ดูเมนูทั้งหมด';
}

function now_(ap) {
  logEvent_('ดูกระดานเที่ยวบิน ' + (ap || 'BKK+DMK'));
  return (ap ? board_(ap) : board_('BKK') + '\n\n' + board_('DMK')) +
    '\n\nℹ️ ถ้า API ไม่ส่งเลขสายพาน ข้อความ "รอรับกระเป๋า" เป็นการประเมินจากเวลาลงจริง';
}

function next_(ap) {
  const n = nowMin_(), aps = ap ? [ap] : ['BKK', 'DMK'];
  let all = [], live = true;
  aps.forEach(function (a) { const L = liveFlights_(a); if (!L.live) live = false; all = all.concat(prep_(L.list, n, L.live)); });
  const l = all.filter(function (f) { return !f.landed && !GONE.test(f.api || '') && f.d >= -STALE_MIN; })
    .sort(function (a, b) { return a.d - b.d; }).slice(0, 3);
  return '<b>⏭ 3 เที่ยวบินถัดไป' + (ap ? ' ' + ap : '') + '</b> · เวลาไทย ' + stamp_() + '\n' +
    (live ? '🟢 ข้อมูลสดจาก AeroDataBox' : '⚪ มีข้อมูลสำรองจากชีตปนอยู่') + '\n\n' +
    (l.length ? l.map(bc_).join(SEP) : 'ไม่พบเที่ยวบินที่กำลังจะลง');
}

function list_(ap) {
  const l = flights_().filter(function (f) { return !ap || f.ap === ap; }).sort(function (a, b) { return (a.sm || 0) - (b.sm || 0); });
  if (!l.length) return 'ไม่พบข้อมูลเที่ยวบิน';
  return '<b>📋 เที่ยวบิน' + (ap ? ' ' + ap : 'ทั้งหมด') + ' ตามชีต (' + l.length + ')</b>\n\n' +
    l.map(function (f) { return '<b>' + esc_(f.est) + '</b> ' + f.code + ' · ' + esc_(f.route) + ' · ' + f.ap; }).join('\n') +
    '\n\nรายการนี้มาจากชีต ไม่ใช่ข้อมูลสด พิมพ์รหัสเที่ยวบินเพื่อดูรายละเอียด';
}

function detail_(code) {
  const n = nowMin_();
  let f = null;
  ['BKK', 'DMK'].some(function (a) {
    const L = liveFlights_(a);
    const x = prep_(L.list, n, L.live).filter(function (v) { return v.code === code; })[0];
    if (x) { f = x; return true; }
    return false;
  });
  if (!f) f = prep_(flights_(), n, false).filter(function (v) { return v.code === code; })[0];
  if (!f) return 'ไม่พบเที่ยวบิน ' + code + ' ในข้อมูลสดหรือชีต พิมพ์ /all เพื่อดูรายการตามชีต';
  return bc_(f) + '\n' +
    (f.src === 'live' ? '🟢 ข้อมูลสดจาก AeroDataBox' : '⚪ ข้อมูลจากชีต ไม่ใช่ข้อมูลสด');
}

function peak_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_FLIGHTS);
  if (!sh) return 'ไม่พบชีต ' + SHEET_FLIGHTS;
  const w = sh.getLastColumn();
  const hh = sh.getRange(4, 1, 1, w).getDisplayValues()[0].filter(String), vv = sh.getRange(5, 1, 1, w).getDisplayValues()[0].filter(String);
  return '<b>📊 ช่วงเวลาพีคและกลยุทธ์</b>\n\n' + hh.map(function (x, i) { return '• <b>' + esc_(x) + '</b>\n   ' + esc_(vv[i] || '-'); }).join('\n\n');
}

function hot_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_HOT);
  if (!sh) return 'ไม่พบชีต ' + SHEET_HOT;
  const rows = sh.getDataRange().getDisplayValues().map(function (r) { return r.filter(String).map(esc_).join(' | '); }).filter(String).slice(0, 30);
  return '<b>🔥 อีเวนต์และจุดฮอตสปอต</b>\n\n' + (rows.join('\n') || 'ชีตว่าง');
}

// ---------- ตั้งค่า (รันจากเมนู Run) ----------
function setupAll() {   // เก็บโทเคน ตรวจโทเคน ตั้งเมนูคำสั่ง (ไม่แตะ webhook เพื่อไม่ทับ Worker)
  const P = PropertiesService.getScriptProperties();
  if (SETUP_TOKEN) P.setProperty('BOT_TOKEN', SETUP_TOKEN.trim());
  if (!prop_('BOT_TOKEN')) { console.log('ยังไม่มีโทเคน: วางใน SETUP_TOKEN แล้วรันอีกครั้ง'); return; }
  const me = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + prop_('BOT_TOKEN') + '/getMe', { muteHttpExceptions: true }).getContentText());
  if (!me.ok) { console.log('โทเคนใช้ไม่ได้: ' + me.description); return; }
  console.log('โทเคนถูกต้อง: @' + me.result.username);
  setupCommands();
  console.log('เสร็จ: ลบโทเคนออกจาก SETUP_TOKEN แล้วเลือกรัน setupWebhookDirect หรือ setupWebhookWorker อย่างใดอย่างหนึ่ง');
}
function setupWebhookDirect() {   // ส่งตรงเข้า Apps Script (อาจช้าเพราะ 302)
  console.log(UrlFetchApp.fetch('https://api.telegram.org/bot' + prop_('BOT_TOKEN') + '/setWebhook?drop_pending_updates=true&url=' + encodeURIComponent(WEBAPP_URL), { muteHttpExceptions: true }).getContentText());
}
function setupWebhookWorker() {   // ผ่าน Cloudflare Worker (อ่าน WORKER_URL และ WEBHOOK_SECRET จาก Script properties)
  const url = prop_('WORKER_URL'), secret = prop_('WEBHOOK_SECRET');
  if (!url || !secret) { console.log('ตั้ง WORKER_URL และ WEBHOOK_SECRET ใน Script properties ก่อน'); return; }
  console.log(UrlFetchApp.fetch('https://api.telegram.org/bot' + prop_('BOT_TOKEN') + '/setWebhook?drop_pending_updates=true&secret_token=' + encodeURIComponent(secret) + '&url=' + encodeURIComponent(url), { muteHttpExceptions: true }).getContentText());
}
function setupCommands() {
  const cmds = [['bkk', 'เที่ยวบินสุวรรณภูมิ'], ['dmk', 'เที่ยวบินดอนเมือง'], ['now', 'ทั้งสองสนามบิน'], ['next', '3 เที่ยวบินถัดไป'],
    ['traffic', 'สภาพการจราจร'], ['dest', 'เลือกปลายทาง'], ['fav', 'สถานที่โปรด'], ['quick', 'บันทึกงานด่วน'], ['dash', 'เปิดแดชบอร์ด About Me Process'], ['summary', 'สรุปรายได้วันนี้'], ['budget', 'วันนี้ต้องหาเท่าไร'], ['bills', 'รายการรายจ่าย'], ['help', 'เมนูช่วยเหลือ']]
    .map(function (c) { return { command: c[0], description: c[1] }; });
  console.log(tg_('setMyCommands', { commands: cmds }).getContentText());
}
function checkWebhook() { console.log(UrlFetchApp.fetch('https://api.telegram.org/bot' + prop_('BOT_TOKEN') + '/getWebhookInfo').getContentText()); }
function testRoute() { console.log(route_('/bkk').replace(/<[^>]+>/g, '')); }
function testAeroDataBox() {   // ดูข้อมูลดิบจาก API เพื่อตรวจโครงสร้าง
  const key = prop_('AERODATABOX_KEY');
  if (!key) { console.log('ยังไม่มี AERODATABOX_KEY'); return; }
  const r = UrlFetchApp.fetch('https://aerodatabox.p.rapidapi.com/flights/airports/iata/BKK?offsetMinutes=-180&durationMinutes=240&direction=Arrival&withLeg=false&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false',
    { muteHttpExceptions: true, headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' } });
  console.log('HTTP ' + r.getResponseCode());
  const h = r.getAllHeaders();
  Object.keys(h).filter(function (k) { return /ratelimit|quota/i.test(k); }).forEach(function (k) { console.log(k + ': ' + h[k]); });
  const d = JSON.parse(r.getContentText());
  console.log('arrivals: ' + (d.arrivals || []).length);
  if (d.arrivals && d.arrivals[0]) console.log(JSON.stringify(d.arrivals[0]).slice(0, 1500));
}

// ==========================================
// จราจร / เส้นทาง (ลิงก์ Google Maps ไม่เสียค่า API + ค้นเส้นทางแบบมีเพดาน)
// ==========================================



// ==========================================
// สถานที่โปรด + เมนูปุ่ม (เก็บใน Script properties ไม่หายเอง)
// ==========================================
function favs_() { try { return JSON.parse(prop_('FAVS') || '[]'); } catch (e) { return []; } }
function saveFavs_(a) { PropertiesService.getScriptProperties().setProperty('FAVS', JSON.stringify(a)); }
function addFavorite_(name) {
  const a = favs_();
  if (a.indexOf(name) === -1) { a.push(name); saveFavs_(a.slice(-12)); }
}

function sendFavoritesMenu_(chat) {
  const f = favs_();
  if (!f.length) { send_(chat, '⭐ <b>ยังไม่มีสถานที่โปรด</b>\n\nพิมพ์ <code>บันทึก ชื่อสถานที่</code> เพื่อเพิ่ม'); return; }
  const rows = f.map(function (p, i) { return [{ text: '⭐ ' + p, callback_data: 'fav_' + i }]; });
  rows.push([{ text: '🗑️ ล้างรายการโปรดทั้งหมด', callback_data: 'fav_clear' }]);
  tg_('sendMessage', { chat_id: chat, text: '⭐ <b>สถานที่โปรดของคุณ:</b>', parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } });
}

function sendDestinationsMenu_(chat) {
  const rows = [];
  for (let i = 0; i < DESTS.length; i += 2) {
    const r = [{ text: DESTS[i].t, callback_data: 'd_' + i }];
    if (DESTS[i + 1]) r.push({ text: DESTS[i + 1].t, callback_data: 'd_' + (i + 1) });
    rows.push(r);
  }
  tg_('sendMessage', { chat_id: chat, text: '📍 <b>เลือกปลายทางด่วน:</b>', parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } });
}

function sendQuickJobMenu_(chat) {
  const rows = [];
  for (let i = 0; i < QUICK.length; i += 2) {
    const r = [{ text: QUICK[i].t, callback_data: 'q_' + i }];
    if (QUICK[i + 1]) r.push({ text: QUICK[i + 1].t, callback_data: 'q_' + (i + 1) });
    rows.push(r);
  }
  tg_('sendMessage', { chat_id: chat, text: '⚡ <b>บันทึกงานด่วน (ลงชีต Daily_Jobs):</b>', parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } });
}

// ==========================================
// บันทึกงานและสรุปรายได้ (Daily_Jobs)
// ==========================================
function recordJobToSheet_(chat, text) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_JOBS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_JOBS);
      sheet.appendRow(['วัน-เวลา', 'แพลตฟอร์ม', 'ต้นทาง', 'ปลายทาง', 'ค่าโดยสาร (บาท)', 'ทิป (บาท)', 'รวมรายได้', 'หมายเหตุ']);
    }
    let body = text.replace(/^บันทึกงาน\s*|^บันทึก\s*/, '').trim();
    let platform = 'Grab', fare = 0, tip = 0, origin = '-', destination = '-';
    const am = body.match(/^(line\s?man|\S+)\s+(\d[\d,\.]*)(?=\s|$)/i);   // ชื่อแอป (คำเดียว) ตามด้วยจำนวนเงิน เช่น inDrive 180
    if (am && !/^\d/.test(am[1])) { platform = normApp_(am[1]); body = body.slice(am[1].length).trim(); }
    const parts = body.split(/\s+/);
    if (parts.length && !isNaN(parseFloat(parts[0]))) fare = parseFloat(parts.shift());
    if (!fare) return '⚠️ ไม่พบค่าโดยสาร ตัวอย่าง: <code>บันทึก Grab 250 ทิป 20 สยาม ไป สาทร</code>';
    let rest = parts.join(' ');
    const tm = rest.match(/ทิป\s*(\d+)/i);
    if (tm) { tip = parseFloat(tm[1]); rest = rest.replace(/ทิป\s*\d+/i, '').trim(); }
    if (/->|\sไป\s/.test(rest)) {                       // ต้องมีเว้นวรรครอบคำว่า "ไป" กันตัดผิดในชื่อสถานที่
      const locs = rest.split(/\s*->\s*|\s+ไป\s+/);
      origin = locs[0] ? locs[0].trim() : '-'; destination = locs[1] ? locs[1].trim() : '-';
    } else if (rest) origin = rest;
    const total = fare + tip, nowStr = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([nowStr, platform, origin, destination, fare, tip, total, '']);
    logEvent_('บันทึกงาน ' + platform + ' ' + total + ' บาท');
    return '✅ <b>บันทึกงานลง Daily_Jobs แล้ว</b>\n\n📅 ' + nowStr + '\n🚘 ' + platform + '\n💵 ค่าโดยสาร ' + fare + ' บาท' +
      (tip > 0 ? '\n🎁 ทิป ' + tip + ' บาท' : '') + '\n💰 <b>รวม ' + total + ' บาท</b>' +
      (origin !== '-' ? '\n📍 ' + esc_(origin) + (destination !== '-' ? ' ➔ ' + esc_(destination) : '') : '');
  } catch (err) {
    console.error(err);
    return '❌ เกิดข้อผิดพลาดในการบันทึกลง Google Sheets';
  }
}

function getDailySummary_() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_JOBS);
    if (!sheet) return '📊 <b>ยังไม่มีข้อมูลการรับงาน</b>';
    const data = sheet.getDataRange().getValues(), today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    let jobs = 0, fare = 0, tip = 0;
    const apps = {};
    for (let i = 1; i < data.length; i++) {
      const d = data[i][0], ds = (d instanceof Date) ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd') : String(d).substring(0, 10);
      if (ds !== today) continue;
      jobs++; fare += parseFloat(data[i][4]) || 0; tip += parseFloat(data[i][5]) || 0;
      const ap = String(data[i][1] || 'อื่นๆ').trim() || 'อื่นๆ'; const a0 = apps[ap] || (apps[ap] = { n: 0, g: 0 }); a0.n++; a0.g += (parseFloat(data[i][4]) || 0) + (parseFloat(data[i][5]) || 0);
    }
    if (!jobs) return '📊 <b>สรุปรายได้ ' + today + '</b>\n\nยังไม่มีรายการบันทึกงานวันนี้';
    const gross = fare + tip, ev = parseFloat(prop_('EV_COST_PER_DAY'));
    let msg = '📊 <b>สรุปรายได้ (' + today + ')</b>\n───────────────────\n🚖 งานทั้งหมด ' + jobs + ' รายการ\n' + Object.keys(apps).map(function (k) { return '   • ' + esc_(k) + ' ' + apps[k].n + ' รายการ · ' + Math.round(apps[k].g).toLocaleString() + ' บาท\n'; }).join('') +
      '💵 ค่าโดยสาร ' + fare.toLocaleString() + ' บาท\n🎁 ทิป ' + tip.toLocaleString() + ' บาท\n📥 <b>รายรับรวม ' + gross.toLocaleString() + ' บาท</b>\n';
    if (ev > 0) {
      const net = gross - ev;
      msg += '⚡ หักค่าชาร์จ EV (ตามที่ตั้งไว้) -' + ev.toLocaleString() + ' บาท\n💰 <b>คงเหลือ ' + net.toLocaleString() + ' บาท</b> (เฉลี่ย ' + Math.round(net / jobs) + ' บาท/เที่ยว)\n';
    } else {
      msg += '💡 <i>ยังไม่ได้ตั้งต้นทุน EV: ตั้ง EV_COST_PER_DAY ใน Script properties เพื่อให้หักค่าชาร์จ (ตอนนี้แสดงเฉพาะรายรับรวม ไม่ใช่กำไร)</i>\n';
    }
    return msg + '───────────────────\nยังไม่รวมค่าใช้จ่ายอื่น เช่น น้ำมัน/ค่าทางด่วน/ค่าเสื่อม';
  } catch (err) {
    console.error(err);
    return '❌ ไม่สามารถคำนวณสรุปรายได้ในขณะนี้';
  }
}

function mapsDirUrl_(lat, lng, dest) { return 'https://www.google.com/maps/dir/?api=1&origin=' + lat + ',' + lng + '&destination=' + encodeURIComponent(dest) + '&travelmode=driving'; }
function mapsTrafficUrl_(lat, lng) { return 'https://www.google.com/maps/@?api=1&map_action=map&center=' + lat + ',' + lng + '&zoom=14&layer=traffic'; }
const NEED_LOC = '⚠️ <b>ยังไม่พบพิกัดตำแหน่งของคุณ</b>\n\nกดปุ่ม <b>📎 → Location (ตำแหน่ง) → ส่งตำแหน่งปัจจุบันของฉัน</b> ก่อนครับ (พิกัดอยู่ได้ 30 นาที ถ้าส่ง Live Location จะอัปเดตเอง)';

function sendTrafficLinks_(chat, lat, lng) {   // ไม่เรียก API ใดๆ
  if (!lat || !lng) { send_(chat, NEED_LOC); return; }
  logEvent_('เปิดลิงก์จราจรรอบตัว');
  tg_('sendMessage', {
    chat_id: chat, parse_mode: 'HTML', disable_web_page_preview: true,
    text: '🚦 <b>จราจรสดรอบตัวคุณ</b> · ' + stamp_() + ' น.\n📍 <code>' + Number(lat).toFixed(4) + ', ' + Number(lng).toFixed(4) + '</code>\n\nกดปุ่มด้านล่างเพื่อดูสีจราจรจริงในแอป Google Maps',
    reply_markup: { inline_keyboard: [[{ text: '🚦 เปิดแผนที่จราจรรอบตัว', url: mapsTrafficUrl_(lat, lng) }]] }
  });
}

function mapsBudgetOk_() {   // เพดานเรียก Directions API ต่อวัน กันบิลบวมแม้เกิดบั๊กหรือกดรัว
  const P = PropertiesService.getScriptProperties(), today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const lim = Number(prop_('MAPS_DAILY_LIMIT') || 100);
  const cur = String(P.getProperty('MAPS_CALLS') || '').split(':');
  const n = cur[0] === today ? Number(cur[1]) || 0 : 0;
  if (n >= lim) return false;
  P.setProperty('MAPS_CALLS', today + ':' + (n + 1));
  return true;
}

function routeInfo_(chat, dest) {
  const cache = CacheService.getScriptCache(), lat = cache.get('lat_' + chat), lng = cache.get('lng_' + chat);
  if (!lat || !lng) return { text: NEED_LOC, url: '' };
  const url = mapsDirUrl_(lat, lng, dest), gKey = prop_('GOOGLE_MAPS_KEY');
  const head = '🏁 <b>ปลายทาง:</b> ' + esc_(dest) + '\n';
  if (!gKey) return { text: '🚗 <b>เส้นทางสู่จุดหมาย</b>\n' + head + '\nกดปุ่มด้านล่างเพื่อดูเวลาเดินทางตามจราจรสดและนำทางในแอป Google Maps', url: url };
  const ck = ('rt_' + Number(lat).toFixed(3) + ',' + Number(lng).toFixed(3) + '_' + dest).slice(0, 240);
  const hit = cache.get(ck);
  if (hit) return { text: hit, url: url };
  if (!mapsBudgetOk_()) return { text: '🚗 <b>เส้นทางสู่จุดหมาย</b>\n' + head + '\n⚠️ ครบเพดานการค้นหาอัตโนมัติของวันนี้แล้ว ใช้ปุ่มด้านล่างเปิดใน Google Maps แทนได้เลย (ปรับเพดานที่ MAPS_DAILY_LIMIT)', url: url };
  try {
    const q = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + lat + ',' + lng + '&destination=' + encodeURIComponent(dest) + '&departure_time=now&traffic_model=best_guess&key=' + gKey;
    const data = JSON.parse(UrlFetchApp.fetch(q, { muteHttpExceptions: true }).getContentText());
    if (data.status !== 'OK' || !data.routes || !data.routes.length) {
      console.log('Directions: ' + data.status + ' ' + (data.error_message || ''));
      return { text: '❌ ค้นเส้นทางไปยัง <b>"' + esc_(dest) + '"</b> ไม่สำเร็จ (' + esc_(data.status || '') + ') ลองกดปุ่มเปิดใน Google Maps แทน', url: url };
    }
    const leg = data.routes[0].legs[0], duration = leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text;
    let steps = '';
    if (leg.steps && leg.steps.length) {
      steps = '\n🛣️ <b>3 ช่วงแรก:</b>\n';
      for (let i = 0; i < Math.min(leg.steps.length, 3); i++) steps += '• ' + esc_(leg.steps[i].html_instructions.replace(/<[^>]+>/g, '')) + ' (' + leg.steps[i].distance.text + ')\n';
    }
    const text = '🚗 <b>เส้นทางสู่จุดหมาย</b>\n' + head + '📍 ' + esc_(leg.end_address) + '\n📏 <b>ระยะทาง:</b> ' + leg.distance.text + '\n⏱️ <b>เวลาเดินทางตอนนี้:</b> <b>' + duration + '</b>\n' + steps;
    cache.put(ck, text, 300);   // เก็บผล 5 นาที (ปัดพิกัดเหลือราว 100 ม.) ถามซ้ำไม่เสียโควตา
    return { text: text, url: url };
  } catch (err) {
    console.error(err);
    return { text: '❌ เชื่อมต่อระบบแผนที่ไม่สำเร็จ ลองกดปุ่มเปิดใน Google Maps แทน', url: url };
  }
}

function sendRoute_(chat, dest) {
  logEvent_('ค้นเส้นทางไป ' + dest);
  const r = routeInfo_(chat, dest);
  const body = { chat_id: chat, text: r.text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (r.url) body.reply_markup = { inline_keyboard: [[{ text: '🧭 เปิดนำทางใน Google Maps', url: r.url }]] };
  const res = tg_('sendMessage', body);
  if (res.getResponseCode() !== 200) {
    console.log('sendMessage ผิดพลาด: ' + res.getContentText());
    tg_('sendMessage', { chat_id: chat, text: r.text.replace(/<[^>]+>/g, '') + (r.url ? '\n' + r.url : '') });
  }
}

// ==========================================
// ข้อมูลสถานะสำหรับหน้า AGENT HQ
// ==========================================
function touch_() { try { PropertiesService.getScriptProperties().setProperty('LAST_SEEN', String(Date.now())); } catch (e) {} }
function logEvent_(m) {
  try {
    const P = PropertiesService.getScriptProperties();
    let a = []; try { a = JSON.parse(P.getProperty('LOG') || '[]'); } catch (e) {}
    a.push({ ts: Date.now(), m: String(m).slice(0, 80) });
    P.setProperty('LOG', JSON.stringify(a.slice(-12)));
  } catch (e) {}
}
function noteError_(err) {
  try {
    const m = String((err && err.message) || err).slice(0, 100);
    PropertiesService.getScriptProperties().setProperty('LAST_ERR', JSON.stringify({ ts: Date.now(), m: m }));
    logEvent_('ข้อผิดพลาด: ' + m.slice(0, 50));
  } catch (e) {}
}
function todayJobs_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_JOBS);
  if (!sh) return null;
  const data = sh.getDataRange().getValues(), today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const o = { count: 0, grab: 0, bolt: 0, fare: 0, tip: 0, gross: 0 };
  for (let i = 1; i < data.length; i++) {
    const d = data[i][0], ds = (d instanceof Date) ? Utilities.formatDate(d, TZ, 'yyyy-MM-dd') : String(d).substring(0, 10);
    if (ds !== today) continue;
    o.count++; o.fare += parseFloat(data[i][4]) || 0; o.tip += parseFloat(data[i][5]) || 0;
    const p = String(data[i][1]).toLowerCase(); if (p.indexOf('grab') >= 0) o.grab++; if (p.indexOf('bolt') >= 0) o.bolt++;
  }
  o.gross = o.fare + o.tip;
  return o;
}
function flightsSummary_(ap) {
  const L = liveFlights_(ap, true);
  if (L.live === null) return { live: null };
  const all = prep_(L.list, nowMin_(), L.live).filter(function (f) { return !GONE.test(f.api || ''); });
  const up = all.filter(function (f) { return !f.landed && f.d >= -STALE_MIN; }).sort(function (a, b) { return a.d - b.d; });
  const landed = all.filter(function (f) { return f.landed; }).sort(function (a, b) { return b.d - a.d; });
  const row = function (f) { return { code: f.code, route: String(f.route || '').slice(0, 30), sched: f.sched, est: f.est, d: f.d, st: status_(f), dl: delay_(f), airline: f.airline || '-', craft: f.craft || '-', landed: !!f.landed }; };
  return { live: !!L.live, landed: landed.length, upcoming: up.length, next: up[0] ? up[0].code + ' ' + up[0].est : '',
    list: { landed: landed.slice(0, 5).map(row), up: up.slice(0, 5).map(row) } };
}
function safe_(fn) { try { return fn(); } catch (e) { console.error(e); return null; } }
function statusJson_() {
  const P = PropertiesService.getScriptProperties();
  const ls = Number(P.getProperty('LAST_SEEN')) || 0;
  let err = null, log = [];
  try { err = JSON.parse(P.getProperty('LAST_ERR') || 'null'); } catch (e) {}
  try { log = JSON.parse(P.getProperty('LOG') || '[]'); } catch (e) {}
  const hm = function (ts) { return Utilities.formatDate(new Date(ts), TZ, 'HH:mm'); };
  return {
    ok: true, now: stamp_(),
    bot: { lastSeenMin: ls ? Math.round((Date.now() - ls) / 60000) : null },
    jobs: todayJobs_(),
    budget: safe_(function () { return typeof budgetStatus_ === 'function' ? budgetStatus_() : null; }),
    income: safe_(function () { return typeof incomeDetail_ === 'function' ? incomeDetail_() : null; }),
    daily: safe_(function () { return typeof daily7_ === 'function' ? daily7_() : null; }),
    bills: safe_(function () { return typeof billsStatus_ === 'function' ? billsStatus_() : null; }),
    flights: { BKK: flightsSummary_('BKK'), DMK: flightsSummary_('DMK') },
    captain: safe_(function () { return typeof modulesStatus_ === 'function' ? modulesStatus_().captain : null; }),
    profit: safe_(function () { return typeof modulesStatus_ === 'function' ? modulesStatus_().profit : null; }),
    solar: safe_(function () { return typeof modulesStatus_ === 'function' ? modulesStatus_().solar : null; }),
    health: safe_(function () { return typeof modulesStatus_ === 'function' ? modulesStatus_().health : null; }),
    errors: err ? { m: err.m, t: hm(err.ts), ageMin: Math.round((Date.now() - err.ts) / 60000) } : null,
    log: log.map(function (x) { return { t: hm(x.ts), m: x.m }; })
  };
}
function genDashKey() { console.log('ใช้เป็น DASH_KEY: ' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8)); }

// ==========================================
// ลิงก์เปิดแดชบอร์ดแบบเชื่อมข้อมูลในตัว (ไม่ต้องกรอก/จำรหัส)
// ==========================================
const DASH_PAGE_DEFAULT = 'https://aboutmeprocess.github.io/agent-hq/';   // เปลี่ยนได้ที่ Script property DASH_PAGE_URL
function sendDashLink_(chat) {
  const key = prop_('DASH_KEY');
  if (!key) { send_(chat, '⚠️ ยังไม่ได้ตั้ง <code>DASH_KEY</code> ใน Script properties (รันฟังก์ชัน <code>genDashKey</code> เพื่อสร้างรหัส แล้วนำไปตั้ง จากนั้น Deploy เวอร์ชันใหม่)'); return; }
  const page = String(prop_('DASH_PAGE_URL') || DASH_PAGE_DEFAULT).replace(/#.*$/, '');
  const api = prop_('DASH_API_URL') || WEBAPP_URL;
  const url = page + '#u=' + encodeURIComponent(api) + '&k=' + encodeURIComponent(key);   // ส่วนหลัง # ไม่ถูกส่งไปที่เซิร์ฟเวอร์ GitHub
  tg_('sendMessage', {
    chat_id: chat, parse_mode: 'HTML', disable_web_page_preview: true,
    text: '🏢 <b>เปิด About Me Process แบบเชื่อมข้อมูลแล้ว</b>\n\nกดปุ่มด้านล่าง หน้าเว็บจะเชื่อมให้อัตโนมัติ ไม่ต้องกรอกรหัส\n⚠️ ลิงก์นี้มีรหัสผ่านอยู่ในตัว อย่าส่งต่อหรือแชร์',
    reply_markup: { inline_keyboard: [[{ text: '🏢 เปิด About Me Process', url: url }]] }
  });
}

// ==========================================
// สั่งการจากหน้าเว็บ About Me Process (ต้องตั้ง DASH_ALLOW_CMD = true)
// ==========================================
function webCmd_(e) {
  const json = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return json({ ok: false, error: 'bad_request' }); }
  const key = prop_('DASH_KEY');
  if (!key || b.k !== key) return json({ ok: false, error: 'unauthorized' });
  if (String(prop_('DASH_ALLOW_CMD') || '').toLowerCase() !== 'true') return json({ ok: false, error: 'cmd_disabled' });
  const text = String(b.text || '').trim().slice(0, 300);
  if (!text || /^\/dash\b|แดชบอร์ด/i.test(text)) return json({ ok: false, error: 'empty' });
  const cache = CacheService.getScriptCache(), rid = String(b.rid || '').slice(0, 40);
  if (rid && cache.get('rid_' + rid)) return json({ ok: true, out: '(คำสั่งนี้ถูกส่งไปแล้ว จึงไม่ทำซ้ำ)' });   // กันส่งซ้ำ/กดซ้ำ
  const minute = 'rate_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHHmm'), n = Number(cache.get(minute) || 0);
  if (n >= 30) return json({ ok: false, error: 'rate_limited' });
  cache.put(minute, String(n + 1), 120);
  if (rid) cache.put('rid_' + rid, '1', 600);
  OUT_ = [];
  try {
    logEvent_('สั่งจากเว็บ: ' + text.slice(0, 40));
    handleText_(owner_(), text);
    return json({ ok: true, out: OUT_.join('\n\n') || '(ไม่มีข้อความตอบกลับ)' });
  } catch (err) {
    console.error(err); noteError_(err);
    return json({ ok: false, error: 'server_error' });
  } finally { OUT_ = null; }
}

function normApp_(s) {   // ชื่อแอปให้เป็นรูปแบบเดียวกัน ถ้าไม่รู้จักใช้ตามที่พิมพ์
  const t = String(s).trim();
  if (/grab|แกร็บ/i.test(t)) return 'Grab';
  if (/bolt|โบลต์/i.test(t)) return 'Bolt';
  if (/in-?drive|อินไดรฟ์/i.test(t)) return 'inDrive';
  if (/line\s?man|ไลน์แมน/i.test(t)) return 'LINE MAN';
  if (/lalamove|ลาล่ามูฟ/i.test(t)) return 'Lalamove';
  if (/maxim|แมกซิม/i.test(t)) return 'Maxim';
  return t.slice(0, 20);
}
