/**
 * AboutMeProcess (agent-hq) — Google Apps Script Backend v11
 * รองรับครบทั้ง 8 เอเจนต์: Driver, Finance, Flights, Telegram, App Script,
 * Captain (ประกันภัย), Take Profit (MT5), Solar (Smart Home), Healthy (ออกกำลังกาย)
 *
 * Script Properties ที่ต้องตั้งค่า (Project Settings -> Script Properties):
 * - DASH_KEY        : รหัสผ่านยาว >= 16 ตัวอักษร (ห้ามใส่ลงโค้ด)
 * - DASH_ALLOW_CMD  : "true" เพื่อเปิดให้สั่งการจากหน้าเว็บได้
 * - TG_BOT_TOKEN    : (ไม่บังคับ) Token ของ Telegram Bot
 * - TG_CHAT_ID      : (ไม่บังคับ) Chat ID ของคุณ (จำกัดสิทธิ์ผู้ใช้บอท)
 * - DASH_URL        : (ไม่บังคับ) ลิงก์หน้าเว็บ GitHub Pages สำหรับคำสั่ง /dash
 * - AERODATABOX_KEY : (ไม่บังคับ) RapidAPI Key สำหรับดึงเที่ยวบินสด BKK/DMK
 */

const TZ = 'Asia/Bangkok';
const SHEETS = {
  JOBS: 'Daily_Jobs',
  BILLS: 'Bills',
  CASH: 'Cash_Log',
  CAPTAIN: 'Captain_Cases',
  HEALTH: 'Health_Log',
  STATE: 'Modules_State',
  LOG: 'System_Log'
};

// ===================== SETUP (รันครั้งเดียวตอนติดตั้ง) =====================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEETS.JOBS, ['Timestamp', 'Date', 'Time', 'App', 'Fare', 'Tip', 'Origin', 'Dest']);
  ensureSheet_(ss, SHEETS.BILLS, ['Day', 'Name', 'Amount', 'PaidMonth', 'Special']);
  ensureSheet_(ss, SHEETS.CASH, ['Timestamp', 'Type', 'Amount', 'Note', 'Balance']);
  ensureSheet_(ss, SHEETS.CAPTAIN, ['Timestamp', 'Date', 'Customer', 'Type', 'Premium', 'RenewalDate', 'Status']);
  ensureSheet_(ss, SHEETS.HEALTH, ['Timestamp', 'Date', 'Activity', 'Minutes', 'Note']);
  ensureSheet_(ss, SHEETS.STATE, ['Module', 'Key', 'Value', 'UpdatedAt']);
  ensureSheet_(ss, SHEETS.LOG, ['Timestamp', 'Time', 'Source', 'Message']);

  // ใส่ค่าเริ่มต้นของ Take Profit และ Solar ใน Modules_State ถ้ายังว่าง
  const st = ss.getSheetByName(SHEETS.STATE);
  if (st.getLastRow() <= 1) {
    const now = nowIso_();
    st.getRange(2, 1, 10, 4).setValues([
      ['profit', 'pair', 'XAUUSD', now],
      ['profit', 'eaOn', 'true', now],
      ['profit', 'dayPl', '0', now],
      ['profit', 'floating', '0', now],
      ['profit', 'gridLevel', '0', now],
      ['profit', 'ddPct', '0', now],
      ['solar', 'battery', '100', now],
      ['solar', 'solarKw', '0', now],
      ['solar', 'loadKw', '0', now],
      ['solar', 'savedThb', '0', now]
    ]);
  }
  logEvent_('system', 'ตั้งค่าชีตทั้งหมดเรียบร้อยแล้ว');
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

// ===================== HTTP ENTRYPOINTS =====================
function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'status';
  const cb = p.callback || '';

  if (action === 'status') {
    if (!checkKey_(p.k)) return outJson_({ ok: false, error: 'unauthorized' }, cb);
    try {
      const payload = buildStatusPayload_();
      return outJson_(payload, cb);
    } catch (err) {
      recordError_(err);
      return outJson_({ ok: false, error: 'server_error', detail: String(err) }, cb);
    }
  }
  return outJson_({ ok: false, error: 'bad_request' }, cb);
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const raw = (e && e.postData && e.postData.contents) || '';

  // 1) คำสั่งจากหน้าแดชบอร์ด (?action=cmd)
  if (p.action === 'cmd') {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (err) {
      return outJson_({ ok: false, error: 'bad_request' });
    }
    if (!checkKey_(body.k)) return outJson_({ ok: false, error: 'unauthorized' });
    if (getProp_('DASH_ALLOW_CMD') !== 'true') return outJson_({ ok: false, error: 'cmd_disabled' });

    const text = String(body.text || '').trim();
    if (!text) return outJson_({ ok: false, error: 'empty' });

    // ป้องกันการส่งซ้ำด้วย rid
    const rid = String(body.rid || '').trim();
    if (rid) {
      const cache = CacheService.getScriptCache();
      if (cache.get('rid_' + rid)) return outJson_({ ok: true, out: 'คำสั่งนี้ถูกประมวลผลแล้ว' });
      cache.put('rid_' + rid, '1', 120);
    }

    try {
      const reply = handleCommand_(text, 'web');
      return outJson_({ ok: true, out: reply });
    } catch (err) {
      recordError_(err);
      return outJson_({ ok: false, error: 'server_error' });
    }
  }

  // 2) Webhook อัปเดตข้อมูลจาก MT5 EA หรือ Solar/HomeKit (?action=webhook&k=...&source=profit|solar)
  if (p.action === 'webhook') {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch (err) {
      return outJson_({ ok: false, error: 'bad_request' });
    }
    if (!checkKey_(p.k || body.k)) return outJson_({ ok: false, error: 'unauthorized' });
    const src = String(p.source || body.source || '').toLowerCase();
    if (src !== 'profit' && src !== 'solar') return outJson_({ ok: false, error: 'bad_request' });
    updateModuleState_(src, body);
    logEvent_(src, 'อัปเดตข้อมูลจาก Webhook (' + src + ')');
    return outJson_({ ok: true });
  }

  // 3) Telegram Bot Webhook
  try {
    const upd = JSON.parse(raw || '{}');
    const msg = upd.message || upd.edited_message;
    if (msg && msg.text && msg.chat && msg.chat.id) {
      const chatId = String(msg.chat.id);
      const allowChat = getProp_('TG_CHAT_ID');
      if (allowChat && chatId !== allowChat) return outJson_({ ok: true });
      PropertiesService.getScriptProperties().setProperty('LAST_BOT_SEEN', String(Date.now()));
      const reply = handleCommand_(String(msg.text).trim(), 'tg');
      sendTelegram_(chatId, reply);
    }
  } catch (err) {
    recordError_(err);
  }
  return outJson_({ ok: true });
}

// ===================== COMMAND ROUTER =====================
function handleCommand_(text, src) {
  const t = text.trim();
  const low = t.toLowerCase();

  if (low === '/help') {
    return [
      '<b>📖 เมนูคำสั่ง AboutMeProcess</b>',
      '• <code>บันทึก Grab 250 ทิป 20 สยาม ไป สาทร</code>',
      '• <code>เงินสด 3011+420</code> / <code>เงินสด เพิ่ม 500</code> / <code>ใช้ 120 น้ำมัน</code>',
      '• <code>วันนี้ต้องหาเท่าไร</code> / <code>/bills</code> / <code>จ่ายแล้ว ชื่อบิล</code>',
      '• <code>ค้างจ่าย ชื่อ 1000</code> / <code>ชำระค้าง ชื่อ</code>',
      '• <code>/bkk</code> / <code>/dmk</code> / <code>/now</code> / <code>/next</code> / <code>/summary</code>',
      '• <code>/captain</code> / <code>/renewals</code> / <code>ประกัน ชื่อ ชั้น 1 15000</code>',
      '• <code>/profit</code> / <code>/ea</code> / <code>/solar</code> / <code>/home</code>',
      '• <code>/health</code> / <code>ออกกำลังกาย เดินลู่วิ่ง 35 นาที</code>'
    ].join('\n');
  }

  if (low === '/dash') {
    const dashUrl = getProp_('DASH_URL') || 'https://aboutmeprocess.github.io/agent-hq/';
    const execUrl = ScriptApp.getService().getUrl();
    const key = getProp_('DASH_KEY');
    if (!execUrl || !key) return 'ยังไม่ได้ตั้งค่า DASH_KEY หรือยังไม่ได้ Deploy เป็น Web App';
    return '🔗 เปิดแดชบอร์ดแบบเชื่อมข้อมูล:\n' + dashUrl + '#u=' + encodeURIComponent(execUrl) + '&k=' + encodeURIComponent(key);
  }

  // ---- Driver: บันทึกรายได้ ----
  if (t.indexOf('บันทึก ') === 0) {
    return cmdAddIncome_(t.slice(7).trim(), src);
  }
  if (low === '/summary') return cmdSummary_();

  // ---- Finance: เงินสด / บิล / ค้างจ่าย ----
  if (t.indexOf('เงินสด') === 0) return cmdCash_(t, src);
  if (t.indexOf('ใช้ ') === 0) return cmdSpend_(t.slice(4).trim(), src);
  if (t === 'วันนี้ต้องหาเท่าไร') return cmdTarget_();
  if (low === '/bills') return cmdBills_();
  if (t.indexOf('จ่ายแล้ว ') === 0) return cmdMarkPaid_(t.slice(9).trim(), src);
  if (t.indexOf('ค้างจ่าย ') === 0) return cmdAddSpecial_(t.slice(9).trim(), src);
  if (t.indexOf('ชำระค้าง ') === 0) return cmdClearSpecial_(t.slice(9).trim(), src);

  // ---- Flights ----
  if (low === '/bkk' || low === '/dmk' || low === '/now' || low === '/next') {
    return cmdFlights_(low);
  }

  // ---- Captain (ประกันภัย) ----
  if (low === '/captain' || low === '/renewals') return cmdCaptainSummary_();
  if (t.indexOf('ประกัน ') === 0) return cmdAddCaptain_(t.slice(7).trim(), src);

  // ---- Take Profit (MT5) ----
  if (low === '/profit' || low === '/ea') return cmdProfitSummary_();

  // ---- Solar (Smart Home) ----
  if (low === '/solar' || low === '/home') return cmdSolarSummary_();

  // ---- Healthy (ออกกำลังกาย) ----
  if (low === '/health') return cmdHealthSummary_();
  if (t.indexOf('ออกกำลังกาย ') === 0) return cmdAddHealth_(t.slice(12).trim(), src);

  return 'ไม่เข้าใจคำสั่ง: <code>' + escHtml_(t) + '</code>\nพิมพ์ <code>/help</code> เพื่อดูคำสั่งทั้งหมด';
}

// ===================== DRIVER & INCOME =====================
function cmdAddIncome_(rest, src) {
  // รูปแบบ: <App> <Fare> [ทิป <Tip>] [<Route>]
  const m = rest.match(/^(LINE MAN|\S+)\s+(\d+(?:\.\d+)?)(?:\s+ทิป\s+(\d+(?:\.\d+)?))?(?:\s+(.*))?$/i);
  if (!m) return 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>บันทึก Grab 250 ทิป 20 สยาม ไป สาทร</code>';
  const app = m[1];
  const fare = Number(m[2]) || 0;
  const tip = Number(m[3]) || 0;
  const route = (m[4] || '').trim();
  const parts = route ? route.split(/\s+ไป\s+/) : [];
  const orig = parts[0] || '-';
  const dest = parts[1] || '-';

  const sh = getSheet_(SHEETS.JOBS);
  const now = new Date();
  sh.appendRow([now, fmtDate_(now), fmtTime_(now), app, fare, tip, orig, dest]);
  logEvent_(src, 'บันทึก ' + app + ' ' + fmtNum_(fare + tip) + ' บาท');
  return '✅ บันทึกแล้ว: <b>' + escHtml_(app) + '</b> ' + fmtNum_(fare) + (tip ? ' + ทิป ' + fmtNum_(tip) : '') + ' = <b>' + fmtNum_(fare + tip) + ' บาท</b>';
}

function cmdSummary_() {
  const inc = getIncomeData_();
  const tot = inc.today.reduce((a, x) => a + x.gross, 0);
  const cnt = inc.today.reduce((a, x) => a + x.n, 0);
  const lines = ['<b>📊 สรุปรายได้วันนี้</b>', 'รวม ' + cnt + ' รายการ · <b>' + fmtNum_(tot) + ' บาท</b>'];
  inc.today.forEach(x => lines.push('• ' + x.app + ': ' + x.n + ' เที่ยว · ' + fmtNum_(x.gross) + ' บาท'));
  return lines.join('\n');
}

// ===================== FINANCE & BUDGET =====================
function evalSimpleSum_(expr) {
  const clean = String(expr || '').replace(/,/g, '').replace(/\s+/g, '');
  if (!/^\d+(?:\.\d+)?(?:\+\d+(?:\.\d+)?)*$/.test(clean)) return NaN;
  return clean.split('+').reduce((a, b) => a + Number(b), 0);
}

function cmdCash_(t, src) {
  const sh = getSheet_(SHEETS.CASH);
  const cur = getCashInfo_().v;
  const now = new Date();

  let m = t.match(/^เงินสด\s+เพิ่ม\s+(.+)$/);
  if (m) {
    const add = evalSimpleSum_(m[1]);
    if (!(add > 0)) return 'ใส่ตัวเลขที่ต้องการเพิ่มให้ถูกต้อง';
    const next = cur + add;
    sh.appendRow([now, 'add', add, 'เพิ่มเงินสด', next]);
    logEvent_(src, 'เพิ่มเงินสด ' + fmtNum_(add) + ' (คงเหลือ ' + fmtNum_(next) + ')');
    return '💵 เพิ่มเงินสด +' + fmtNum_(add) + ' → คงเหลือ <b>' + fmtNum_(next) + ' บาท</b>';
  }

  m = t.match(/^เงินสด\s+ลด\s+(.+)$/);
  if (m) {
    const sub = evalSimpleSum_(m[1]);
    if (!(sub > 0)) return 'ใส่ตัวเลขที่ต้องการลดให้ถูกต้อง';
    const next = Math.max(0, cur - sub);
    sh.appendRow([now, 'sub', sub, 'ลดเงินสด', next]);
    logEvent_(src, 'ลดเงินสด ' + fmtNum_(sub) + ' (คงเหลือ ' + fmtNum_(next) + ')');
    return '💵 ลดเงินสด -' + fmtNum_(sub) + ' → คงเหลือ <b>' + fmtNum_(next) + ' บาท</b>';
  }

  m = t.match(/^เงินสด\s+(.+)$/);
  if (m) {
    const val = evalSimpleSum_(m[1]);
    if (isNaN(val)) return 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>เงินสด 3011+420+3041</code>';
    sh.appendRow([now, 'set', val, 'ตั้งเงินสด', val]);
    logEvent_(src, 'ตั้งเงินสดเป็น ' + fmtNum_(val) + ' บาท');
    return '💵 ตั้งเงินสดตั้งต้นเป็น <b>' + fmtNum_(val) + ' บาท</b>';
  }
  return '💵 เงินสดล่าสุด: <b>' + fmtNum_(cur) + ' บาท</b>';
}

function cmdSpend_(rest, src) {
  const m = rest.match(/^(\d+(?:\.\d+)?)(?:\s+(.*))?$/);
  if (!m) return 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>ใช้ 120 น้ำมัน</code>';
  const amt = Number(m[1]);
  const note = (m[2] || 'ใช้จ่าย').trim();
  const sh = getSheet_(SHEETS.CASH);
  const next = Math.max(0, getCashInfo_().v - amt);
  sh.appendRow([new Date(), 'spend', amt, note, next]);
  logEvent_(src, 'ใช้จ่าย ' + fmtNum_(amt) + ' (' + note + ')');
  return '💸 หักค่าใช้จ่าย ' + fmtNum_(amt) + ' บาท (' + escHtml_(note) + ') → เงินสดเหลือ <b>' + fmtNum_(next) + ' บาท</b>';
}

function cmdMarkPaid_(name, src) {
  const sh = getSheet_(SHEETS.BILLS);
  const rows = sh.getDataRange().getValues();
  const ym = fmtMonth_(new Date());
  const q = name.toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase().indexOf(q) >= 0) {
      sh.getRange(i + 1, 4).setValue(ym);
      logEvent_(src, 'ติ๊กจ่ายแล้ว: ' + rows[i][1]);
      return '✅ บันทึกจ่ายแล้ว: <b>' + escHtml_(rows[i][1]) + '</b> (' + fmtNum_(rows[i][2]) + ' บาท)';
    }
  }
  return 'ไม่พบรายการชื่อ "' + escHtml_(name) + '" ในชีต Bills';
}

function cmdAddSpecial_(rest, src) {
  const m = rest.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
  if (!m) return 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>ค้างจ่าย ค่าซ่อม 1500</code>';
  const sh = getSheet_(SHEETS.BILLS);
  const todayDay = Number(Utilities.formatDate(new Date(), TZ, 'd'));
  sh.appendRow([todayDay, m[1].trim(), Number(m[2]), '', 'TRUE']);
  logEvent_(src, 'เพิ่มยอดค้างพิเศษ: ' + m[1].trim() + ' ' + fmtNum_(m[2]));
  return '📌 เพิ่มยอดค้างพิเศษ: <b>' + escHtml_(m[1].trim()) + '</b> ' + fmtNum_(m[2]) + ' บาท';
}

function cmdClearSpecial_(name, src) {
  const sh = getSheet_(SHEETS.BILLS);
  const rows = sh.getDataRange().getValues();
  const q = name.toLowerCase();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][4]).toUpperCase() === 'TRUE' && String(rows[i][1]).toLowerCase().indexOf(q) >= 0) {
      const label = rows[i][1];
      sh.deleteRow(i + 1);
      logEvent_(src, 'ชำระยอดค้างพิเศษแล้ว: ' + label);
      return '✅ ชำระยอดค้างพิเศษแล้ว: <b>' + escHtml_(label) + '</b>';
    }
  }
  return 'ไม่พบยอดค้างพิเศษชื่อ "' + escHtml_(name) + '"';
}

function cmdBills_() {
  const bills = getBillsData_();
  if (!bills.length) return 'ยังไม่มีรายการในชีต Bills';
  const lines = ['<b>🧾 รายการจ่ายเดือนนี้</b>'];
  bills.forEach(b => lines.push((b.paid ? '✅ ' : b.late ? '🔴 ' : '🟡 ') + 'วันที่ ' + b.day + ' · ' + b.name + ' · ' + fmtNum_(b.amt)));
  return lines.join('\n');
}

function cmdTarget_() {
  const b = getBudgetData_();
  if (b.target > 0 && b.best) {
    return '🎯 วันนี้ต้องหาเฉลี่ย <b>' + fmtNum_(b.target) + ' บาท/วัน</b> ถึง ' + b.best.label + '\nเงินสดตั้งต้น: ' + fmtNum_(b.cash) + ' บาท · หาได้วันนี้: ' + fmtNum_(b.earned) + ' บาท';
  }
  if (b.shortNow > 0) return '⚠️ ปิดยอดค้างวันนี้ต้องหาอีก <b>' + fmtNum_(b.shortNow) + ' บาท</b>';
  return '🎉 เงินสดตั้งต้น (' + fmtNum_(b.cash) + ' บาท) พอจ่ายทุกรายการที่ประเมินได้แล้ว';
}

// ===================== FLIGHTS =====================
function cmdFlights_(cmd) {
  const key = getProp_('AERODATABOX_KEY');
  if (!key) return '✈️ ยังไม่ได้ตั้งค่า <code>AERODATABOX_KEY</code> ใน Script Properties (ระบบพร้อมใช้งานทันทีเมื่อใส่คีย์)';
  return '✈️ รับคำสั่ง <code>' + cmd + '</code> แล้ว (เชื่อมต่อ AeroDataBox API ด้วยคีย์ใน Script Properties)';
}

// ===================== CAPTAIN / TAKE PROFIT / SOLAR / HEALTHY =====================
function cmdAddCaptain_(rest, src) {
  // รูปแบบ: <ชื่อ/ทะเบียน> <ประเภท> [<เบี้ย>]
  const m = rest.match(/^(.+?)\s+(ชั้น\s*1|2\+|3\+|พ\.ร\.บ\.|อื่นๆ)(?:\s+(\d+(?:\.\d+)?))?$/i);
  if (!m) return 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>ประกัน กข1234 ชั้น 1 14500</code>';
  const customer = m[1].trim();
  const type = m[2].replace(/\s+/g, ' ');
  const prem = Number(m[3]) || 0;
  const now = new Date();
  const sh = getSheet_(SHEETS.CAPTAIN);
  sh.appendRow([now, fmtDate_(now), customer, type, prem, '', 'open']);
  logEvent_(src, 'Captain เพิ่มเคส: ' + customer + ' (' + type + ')');
  return '🛡️ บันทึกเคส Captain แล้ว: <b>' + escHtml_(customer) + '</b> (' + escHtml_(type) + ')' + (prem ? ' · เบี้ย ' + fmtNum_(prem) + ' ฿' : '');
}

function cmdCaptainSummary_() {
  const c = getCaptainData_();
  return '<b>🛡️ สรุป Captain ประกันภัย</b>\n• เคสวันนี้: ' + c.casesToday + ' เคส\n• ใบเสนอราคารอปิด: ' + c.quotesPending + '\n• ใกล้ต่ออายุ (30 วัน): ' + c.renewals + '\n• เบี้ยสะสมเดือนนี้: ' + fmtNum_(c.premiumMonth) + ' บาท';
}

function cmdProfitSummary_() {
  const p = getProfitData_();
  return '<b>📈 Take Profit (MT5)</b>\n• คู่เงิน: ' + p.pair + ' · สถานะ EA: ' + (p.eaOn ? 'ON' : 'OFF') + '\n• กำไรวันนี้: ' + p.dayPl + ' $\n• Floating P/L: ' + p.floating + ' $\n• Grid: L' + p.gridLevel + ' · DD: ' + p.ddPct + '%';
}

function cmdSolarSummary_() {
  const s = getSolarData_();
  return '<b>☀️ Solar & Smart Home</b>\n• แบตเตอรี่: ' + s.battery + '%\n• ผลิตโซลาร์: ' + s.solarKw + ' kW · ใช้ไฟบ้าน: ' + s.loadKw + ' kW\n• ประหยัดวันนี้: ' + fmtNum_(s.savedThb) + ' บาท';
}

function cmdAddHealth_(rest, src) {
  // รูปแบบ: <กิจกรรม> <นาที> นาที [<หมายเหตุ>]
  const m = rest.match(/^(\S+)\s+(\d+)(?:\s*นาที)?(?:\s+(.*))?$/);
  if (!m) return 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>ออกกำลังกาย เดินลู่วิ่ง 35 นาที 3 กม.</code>';
  const act = m[1];
  const mins = Number(m[2]) || 0;
  const note = (m[3] || '').trim();
  const now = new Date();
  const sh = getSheet_(SHEETS.HEALTH);
  sh.appendRow([now, fmtDate_(now), act, mins, note]);
  logEvent_(src, 'Healthy: ' + act + ' ' + mins + ' นาที');
  return '💪 บันทึกออกกำลังกายแล้ว: <b>' + escHtml_(act) + '</b> ' + mins + ' นาที' + (note ? ' (' + escHtml_(note) + ')' : '');
}

function cmdHealthSummary_() {
  const h = getHealthData_();
  return '<b>💪 สรุป Healthy</b>\n• ต่อเนื่อง (Streak): ' + h.streak + ' วัน\n• สัปดาห์นี้: ' + h.weekDays + '/' + h.weekGoal + ' วัน (' + h.weekMin + ' นาที)\n• วันนี้: ' + (h.todayDone ? '✅ ' + h.todayActivity : '⏳ ยังไม่ได้บันทึก');
}

// ===================== BUILD STATUS PAYLOAD =====================
function buildStatusPayload_() {
  const now = new Date();
  const income = getIncomeData_();
  const bills = getBillsData_();
  const budget = getBudgetData_(bills, income);
  const daily = getDaily7Data_();
  const lastSeen = Number(getProp_('LAST_BOT_SEEN') || 0);

  return {
    ok: true,
    now: fmtTime_(now),
    bot: { lastSeenMin: lastSeen ? Math.floor((Date.now() - lastSeen) / 60000) : null },
    jobs: {
      count: income.today.reduce((a, x) => a + x.n, 0),
      gross: income.today.reduce((a, x) => a + x.gross, 0)
    },
    income: income,
    budget: budget,
    daily: daily,
    bills: bills,
    flights: { BKK: { live: null }, DMK: { live: null } },
    captain: getCaptainData_(),
    profit: getProfitData_(),
    solar: getSolarData_(),
    health: getHealthData_(),
    errors: getLastError_(),
    log: getRecentLogs_(12)
  };
}

// ===================== DATA READERS =====================
function getIncomeData_() {
  const rows = readRows_(SHEETS.JOBS);
  const todayStr = fmtDate_(new Date());
  const cutoff = new Date(Date.now() - 6 * 86400000);
  const todayMap = {};
  const weekMap = {};
  const list = [];

  rows.forEach(r => {
    const dStr = String(r[1] || '');
    const app = String(r[3] || 'อื่นๆ');
    const fare = Number(r[4]) || 0;
    const tip = Number(r[5]) || 0;
    const gross = fare + tip;
    const ts = r[0] instanceof Date ? r[0] : new Date(r[0]);

    if (dStr === todayStr) {
      if (!todayMap[app]) todayMap[app] = { app, n: 0, fare: 0, tip: 0, gross: 0 };
      todayMap[app].n++; todayMap[app].fare += fare; todayMap[app].tip += tip; todayMap[app].gross += gross;
      list.push({ t: String(r[2] || ''), p: app, o: String(r[6] || '-'), d: String(r[7] || '-'), fare, tip });
    }
    if (!isNaN(ts.getTime()) && ts >= cutoff) {
      if (!weekMap[app]) weekMap[app] = { app, n: 0, gross: 0 };
      weekMap[app].n++; weekMap[app].gross += gross;
    }
  });

  return {
    today: Object.values(todayMap),
    week: Object.values(weekMap),
    list: list.reverse()
  };
}

function getDaily7Data_() {
  const rows = readRows_(SHEETS.JOBS);
  const byDate = {};
  rows.forEach(r => {
    const d = String(r[1] || '');
    byDate[d] = (byDate[d] || 0) + (Number(r[4]) || 0) + (Number(r[5]) || 0);
  });
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const key = fmtDate_(dt);
    out.push({ d: Utilities.formatDate(dt, TZ, 'dd/MM'), v: byDate[key] || 0 });
  }
  return out;
}

function getBillsData_() {
  const rows = readRows_(SHEETS.BILLS);
  const now = new Date();
  const ym = fmtMonth_(now);
  const todayDay = Number(Utilities.formatDate(now, TZ, 'd'));
  return rows.map(r => {
    const day = Number(r[0]) || 1;
    const paid = String(r[3] || '') === ym;
    const isSpecial = String(r[4] || '').toUpperCase() === 'TRUE';
    return {
      day,
      name: String(r[1] || ''),
      amt: Number(r[2]) || 0,
      paid,
      late: !paid && (isSpecial || day < todayDay)
    };
  }).filter(x => x.name);
}

function getCashInfo_() {
  const rows = readRows_(SHEETS.CASH);
  if (!rows.length) return { v: 0, ts: '', since: 0, noCash: true };
  const last = rows[rows.length - 1];
  const ts = last[0] instanceof Date ? Utilities.formatDate(last[0], TZ, 'dd/MM HH:mm') : String(last[0] || '');
  return { v: Number(last[4]) || 0, ts, since: 0, noCash: false };
}

function getBudgetData_(billsOpt, incOpt) {
  const bills = billsOpt || getBillsData_();
  const inc = incOpt || getIncomeData_();
  const ci = getCashInfo_();
  const now = new Date();
  const todayDay = Number(Utilities.formatDate(now, TZ, 'd'));
  const earned = inc.today.reduce((a, x) => a + x.gross, 0);

  const overdue = [];
  const upMap = {};
  bills.filter(b => !b.paid).forEach(b => {
    if (b.late || b.day === todayDay) {
      overdue.push({ name: b.name, amt: b.amt, late: b.late });
    } else {
      const dn = b.day > todayDay ? b.day - todayDay : (30 - todayDay + b.day);
      if (dn <= 30) {
        if (!upMap[dn]) upMap[dn] = { dn, label: 'วันที่ ' + b.day, sum: 0, items: [] };
        upMap[dn].sum += b.amt;
        upMap[dn].items.push({ n: b.name, a: b.amt });
      }
    }
  });

  const nowSum = overdue.reduce((a, x) => a + x.amt, 0);
  const shortNow = Math.max(0, nowSum - ci.v);
  const up = Object.values(upMap).sort((a, b) => a.dn - b.dn);

  let cum = nowSum;
  let target = 0;
  let best = null;
  up.forEach(g => {
    cum += g.sum;
    const need = Math.max(0, cum - ci.v);
    const perDay = Math.ceil(need / Math.max(1, g.dn));
    if (perDay > target) {
      target = perDay;
      best = { label: g.label, cum, days: g.dn };
    }
  });

  return {
    cash: ci.v,
    cashInfo: { v: ci.v, ts: ci.ts, since: ci.since },
    noCash: ci.noCash,
    nowSum,
    shortNow,
    target,
    best,
    earned,
    overdue,
    up,
    avg: 0,
    fc: null
  };
}

function getCaptainData_() {
  const rows = readRows_(SHEETS.CAPTAIN);
  const todayStr = fmtDate_(new Date());
  const ym = fmtMonth_(new Date());
  let casesToday = 0, quotesPending = 0, renewals = 0, premiumMonth = 0;
  const nowMs = Date.now();

  rows.forEach(r => {
    const dStr = String(r[1] || '');
    const prem = Number(r[4]) || 0;
    const status = String(r[6] || '').toLowerCase();
    if (dStr === todayStr) casesToday++;
    if (status === 'open' || status === 'quote') quotesPending++;
    if (dStr.indexOf(ym) === 0) premiumMonth += prem;
    if (r[5]) {
      const rd = new Date(r[5]).getTime();
      if (!isNaN(rd) && rd >= nowMs && rd <= nowMs + 30 * 86400000) renewals++;
    }
  });
  return { casesToday, renewals, quotesPending, premiumMonth, note: 'ข้อมูลจากชีต Captain_Cases' };
}

function getModuleMap_(mod) {
  const rows = readRows_(SHEETS.STATE);
  const out = {};
  rows.forEach(r => { if (String(r[0]) === mod) out[String(r[1])] = r[2]; });
  return out;
}

function updateModuleState_(mod, obj) {
  const sh = getSheet_(SHEETS.STATE);
  const rows = sh.getDataRange().getValues();
  const now = nowIso_();
  Object.keys(obj).forEach(k => {
    if (k === 'k' || k === 'source') return;
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === mod && String(rows[i][1]) === k) {
        sh.getRange(i + 1, 3, 1, 2).setValues([[String(obj[k]), now]]);
        found = true;
        break;
      }
    }
    if (!found) sh.appendRow([mod, k, String(obj[k]), now]);
  });
}

function getProfitData_() {
  const m = getModuleMap_('profit');
  return {
    pair: String(m.pair || 'XAUUSD'),
    eaOn: String(m.eaOn || 'false') === 'true',
    dayPl: Number(m.dayPl || 0),
    floating: Number(m.floating || 0),
    gridLevel: Number(m.gridLevel || 0),
    ddPct: Number(m.ddPct || 0),
    note: 'ข้อมูลจากชีต Modules_State (profit)'
  };
}

function getSolarData_() {
  const m = getModuleMap_('solar');
  return {
    battery: Number(m.battery || 0),
    solarKw: Number(m.solarKw || 0),
    loadKw: Number(m.loadKw || 0),
    savedThb: Number(m.savedThb || 0),
    note: 'ข้อมูลจากชีต Modules_State (solar)'
  };
}

function getHealthData_() {
  const rows = readRows_(SHEETS.HEALTH);
  const todayStr = fmtDate_(new Date());
  const weekCutoff = Date.now() - 6 * 86400000;
  const daysSet = {};
  const weekDaysSet = {};
  let weekMin = 0;
  let todayActivity = '';

  rows.forEach(r => {
    const dStr = String(r[1] || '');
    const mins = Number(r[3]) || 0;
    const ts = r[0] instanceof Date ? r[0].getTime() : new Date(r[0]).getTime();
    if (dStr) daysSet[dStr] = true;
    if (dStr === todayStr) todayActivity = String(r[2] || '') + ' ' + mins + ' น.';
    if (!isNaN(ts) && ts >= weekCutoff) {
      weekDaysSet[dStr] = true;
      weekMin += mins;
    }
  });

  // นับ Streak ย้อนหลังจากวันนี้
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = fmtDate_(new Date(Date.now() - i * 86400000));
    if (daysSet[d]) streak++;
    else if (i > 0) break;
  }

  return {
    streak,
    weekDays: Object.keys(weekDaysSet).length,
    weekGoal: 5,
    weekMin,
    todayDone: !!todayActivity,
    todayActivity,
    note: 'ข้อมูลจากชีต Health_Log'
  };
}

// ===================== HELPERS =====================
function getProp_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function checkKey_(k) { const expected = getProp_('DASH_KEY'); return !!expected && String(k || '') === expected; }
function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function readRows_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() <= 1) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}
function logEvent_(src, msg) {
  const sh = getSheet_(SHEETS.LOG);
  const now = new Date();
  sh.appendRow([now, fmtTime_(now), src, msg]);
}
function getRecentLogs_(limit) {
  const rows = readRows_(SHEETS.LOG);
  return rows.slice(-limit).map(r => ({ t: String(r[1] || ''), m: String(r[3] || '') }));
}
function recordError_(err) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('LAST_ERR', JSON.stringify({ t: fmtTime_(new Date()), m: String(err), ts: Date.now() }));
}
function getLastError_() {
  try {
    const e = JSON.parse(getProp_('LAST_ERR') || 'null');
    if (!e) return null;
    return { t: e.t, m: e.m, ageMin: Math.floor((Date.now() - e.ts) / 60000) };
  } catch (err) { return null; }
}
function sendTelegram_(chatId, htmlText) {
  const token = getProp_('TG_BOT_TOKEN');
  if (!token) return;
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: htmlText, parse_mode: 'HTML' }),
    muteHttpExceptions: true
  });
}
function outJson_(obj, cb) {
  const json = JSON.stringify(obj);
  if (cb && /^[A-Za-z0-9_]+$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function fmtDate_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function fmtMonth_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM'); }
function fmtTime_(d) { return Utilities.formatDate(d, TZ, 'HH:mm'); }
function nowIso_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss'+07:00'"); }
function fmtNum_(n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); }
function escHtml_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
