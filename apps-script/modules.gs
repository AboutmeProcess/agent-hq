/**
 * modules.gs — ส่วนเสริม 4 เอเจนต์สำหรับ AboutMeProcess (วางคู่กับ driver_hq_bot.gs และ budget.gs)
 * รองรับ: Captain (ประกันภัย), Take Profit (MT5 EA), Solar (Smart Home), Healthy (ออกกำลังกาย)
 *
 * วิธีติดตั้ง:
 * 1. สร้างไฟล์ชื่อ modules.gs ในโปรเจกต์ Apps Script เดิม แล้ววางโค้ดนี้ลงไป
 * 2. รันฟังก์ชัน setupModuleSheets() 1 ครั้ง เพื่อสร้างแท็บ Captain_Cases, Health_Log, Modules_State
 * 3. Deploy เวอร์ชันใหม่ — ไม่กระทบชีต Daily_Jobs, รายจ่าย หรือ budget.gs เดิม
 */

const SHEET_CAPTAIN = 'Captain_Cases';
const SHEET_HEALTH = 'Health_Log';
const SHEET_MSTATE = 'Modules_State';

function setupModuleSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  modEnsureSheet_(ss, SHEET_CAPTAIN, ['Timestamp', 'Date', 'Customer', 'Type', 'Premium', 'RenewalDate', 'Status']);
  modEnsureSheet_(ss, SHEET_HEALTH, ['Timestamp', 'Date', 'Activity', 'Minutes', 'Note']);
  const st = modEnsureSheet_(ss, SHEET_MSTATE, ['Module', 'Key', 'Value', 'UpdatedAt']);
  if (st.getLastRow() <= 1) {
    const now = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
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
  if (typeof logEvent_ === 'function') logEvent_('ตั้งค่าแท็บโมดูลเสริมทั้ง 4 เอเจนต์แล้ว');
}

function modEnsureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (typeof sh.setFrozenRows === 'function') sh.setFrozenRows(1);
  }
  return sh;
}

function modReadRows_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() <= 1) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

function modFmtNum_(n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); }
function modFmtDate_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function modFmtMonth_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM'); }

// ===================== COMMAND ROUTER (เรียกจาก handleText_ ใน driver_hq_bot.gs) =====================
function modulesCommand_(chat, text) {
  const t = String(text || '').trim();
  const low = t.toLowerCase();

  if (low === '/captain' || low === '/renewals') {
    const c = captainStatus_();
    if (!c) { send_(chat, '🛡️ ยังไม่มีชีต <code>Captain_Cases</code> (รัน <code>setupModuleSheets()</code> ใน Apps Script ก่อน)'); return true; }
    send_(chat, '<b>🛡️ สรุป Captain ประกันภัย</b>\n• เคสวันนี้: ' + c.casesToday + ' เคส\n• ใบเสนอราคารอปิด: ' + c.quotesPending + '\n• ใกล้ต่ออายุ (30 วัน): ' + c.renewals + '\n• เบี้ยสะสมเดือนนี้: ' + modFmtNum_(c.premiumMonth) + ' บาท');
    return true;
  }

  if (t.indexOf('ประกัน ') === 0) {
    const rest = t.slice(7).trim();
    const m = rest.match(/^(.+?)\s+(ชั้น\s*1|2\+|3\+|พ\.ร\.บ\.|อื่นๆ)(?:\s+(\d+(?:\.\d+)?))?$/i);
    if (!m) {
      send_(chat, 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>ประกัน กข1234 ชั้น 1 14500</code>');
      return true;
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = modEnsureSheet_(ss, SHEET_CAPTAIN, ['Timestamp', 'Date', 'Customer', 'Type', 'Premium', 'RenewalDate', 'Status']);
    const customer = m[1].trim();
    const type = m[2].replace(/\s+/g, ' ');
    const prem = Number(m[3]) || 0;
    const now = new Date();
    sh.appendRow([now, modFmtDate_(now), customer, type, prem, '', 'open']);
    if (typeof logEvent_ === 'function') logEvent_('Captain เพิ่มเคส: ' + customer);
    send_(chat, '🛡️ บันทึกเคส Captain แล้ว: <b>' + esc_(customer) + '</b> (' + esc_(type) + ')' + (prem ? ' · เบี้ย ' + modFmtNum_(prem) + ' ฿' : ''));
    return true;
  }

  if (low === '/profit' || low === '/ea') {
    const p = profitStatus_();
    if (!p) { send_(chat, '📈 ยังไม่มีข้อมูล Take Profit (รัน <code>setupModuleSheets()</code> หรือส่ง Webhook เข้ามา)'); return true; }
    send_(chat, '<b>📈 Take Profit (MT5)</b>\n• คู่เงิน: ' + esc_(p.pair) + ' · สถานะ EA: ' + (p.eaOn ? 'ON' : 'OFF') + '\n• กำไรวันนี้: ' + (p.dayPl >= 0 ? '+' : '') + p.dayPl + ' $\n• Floating P/L: ' + (p.floating >= 0 ? '+' : '') + p.floating + ' $\n• Grid: L' + p.gridLevel + ' · DD: ' + p.ddPct + '%');
    return true;
  }

  if (low === '/solar' || low === '/home') {
    const s = solarStatus_();
    if (!s) { send_(chat, '☀️ ยังไม่มีข้อมูล Solar (รัน <code>setupModuleSheets()</code> หรือส่ง Webhook เข้ามา)'); return true; }
    send_(chat, '<b>☀️ Solar & Smart Home</b>\n• แบตเตอรี่: ' + s.battery + '%\n• ผลิตโซลาร์: ' + s.solarKw + ' kW · ใช้ไฟบ้าน: ' + s.loadKw + ' kW\n• ประหยัดวันนี้: ' + modFmtNum_(s.savedThb) + ' บาท');
    return true;
  }

  if (low === '/health') {
    const h = healthStatus_();
    if (!h) { send_(chat, '💪 ยังไม่มีชีต <code>Health_Log</code> (รัน <code>setupModuleSheets()</code> ก่อน)'); return true; }
    send_(chat, '<b>💪 สรุป Healthy</b>\n• ต่อเนื่อง (Streak): ' + h.streak + ' วัน\n• สัปดาห์นี้: ' + h.weekDays + '/' + h.weekGoal + ' วัน (' + h.weekMin + ' นาที)\n• วันนี้: ' + (h.todayDone ? '✅ ' + esc_(h.todayActivity) : '⏳ ยังไม่ได้บันทึก'));
    return true;
  }

  if (t.indexOf('ออกกำลังกาย ') === 0) {
    const rest = t.slice(12).trim();
    const m = rest.match(/^(\S+)\s+(\d+)(?:\s*นาที)?(?:\s+(.*))?$/);
    if (!m) {
      send_(chat, 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>ออกกำลังกาย เดินลู่วิ่ง 35 นาที 3 กม.</code>');
      return true;
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = modEnsureSheet_(ss, SHEET_HEALTH, ['Timestamp', 'Date', 'Activity', 'Minutes', 'Note']);
    const act = m[1];
    const mins = Number(m[2]) || 0;
    const note = (m[3] || '').trim();
    const now = new Date();
    sh.appendRow([now, modFmtDate_(now), act, mins, note]);
    if (typeof logEvent_ === 'function') logEvent_('Healthy: ' + act + ' ' + mins + ' น.');
    send_(chat, '💪 บันทึกออกกำลังกายแล้ว: <b>' + esc_(act) + '</b> ' + mins + ' นาที' + (note ? ' (' + esc_(note) + ')' : ''));
    return true;
  }

  return false;
}

// ===================== WEBHOOK (MT5 EA & Solar HomeKit) =====================
function modulesWebhook_(e) {
  const json = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  let body = {};
  try { body = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (err) { return json({ ok: false, error: 'bad_request' }); }
  const key = prop_('DASH_KEY');
  const provided = (e.parameter && e.parameter.k) || body.k || '';
  if (!key || provided !== key) return json({ ok: false, error: 'unauthorized' });
  const src = String((e.parameter && e.parameter.source) || body.source || '').toLowerCase();
  if (src !== 'profit' && src !== 'solar') return json({ ok: false, error: 'bad_request' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = modEnsureSheet_(ss, SHEET_MSTATE, ['Module', 'Key', 'Value', 'UpdatedAt']);
  const rows = sh.getDataRange().getValues();
  const now = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss'+07:00'");

  Object.keys(body).forEach(function (k) {
    if (k === 'k' || k === 'source') return;
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === src && String(rows[i][1]) === k) {
        sh.getRange(i + 1, 3, 1, 2).setValues([[String(body[k]), now]]);
        found = true;
        break;
      }
    }
    if (!found) sh.appendRow([src, k, String(body[k]), now]);
  });
  if (typeof logEvent_ === 'function') logEvent_('Webhook อัปเดต ' + src);
  return json({ ok: true });
}

// ===================== STATUS READERS (เรียกจาก statusJson_ ใน driver_hq_bot.gs) =====================
function modulesStatus_() {
  return {
    captain: captainStatus_(),
    profit: profitStatus_(),
    solar: solarStatus_(),
    health: healthStatus_()
  };
}

function captainStatus_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CAPTAIN);
  if (!sh) return null;
  const rows = modReadRows_(SHEET_CAPTAIN);
  const todayStr = modFmtDate_(new Date());
  const ym = modFmtMonth_(new Date());
  let casesToday = 0, quotesPending = 0, renewals = 0, premiumMonth = 0;
  const nowMs = Date.now();
  rows.forEach(function (r) {
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
  return { casesToday: casesToday, renewals: renewals, quotesPending: quotesPending, premiumMonth: premiumMonth, note: 'ข้อมูลจากชีต Captain_Cases' };
}

function modStateMap_(mod) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MSTATE);
  if (!sh) return null;
  const rows = modReadRows_(SHEET_MSTATE);
  const out = {};
  let has = false;
  rows.forEach(function (r) { if (String(r[0]) === mod) { out[String(r[1])] = r[2]; has = true; } });
  return has ? out : null;
}

function profitStatus_() {
  const m = modStateMap_('profit');
  if (!m) return null;
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

function solarStatus_() {
  const m = modStateMap_('solar');
  if (!m) return null;
  return {
    battery: Number(m.battery || 0),
    solarKw: Number(m.solarKw || 0),
    loadKw: Number(m.loadKw || 0),
    savedThb: Number(m.savedThb || 0),
    note: 'ข้อมูลจากชีต Modules_State (solar)'
  };
}

function healthStatus_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HEALTH);
  if (!sh) return null;
  const rows = modReadRows_(SHEET_HEALTH);
  const todayStr = modFmtDate_(new Date());
  const weekCutoff = Date.now() - 6 * 86400000;
  const daysSet = {};
  const weekDaysSet = {};
  let weekMin = 0;
  let todayActivity = '';

  rows.forEach(function (r) {
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

  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = modFmtDate_(new Date(Date.now() - i * 86400000));
    if (daysSet[d]) streak++;
    else if (i > 0) break;
  }

  return {
    streak: streak,
    weekDays: Object.keys(weekDaysSet).length,
    weekGoal: 5,
    weekMin: weekMin,
    todayDone: !!todayActivity,
    todayActivity: todayActivity,
    note: 'ข้อมูลจากชีต Health_Log'
  };
}
