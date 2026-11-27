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
const SHEET_SOLAR_M = 'Solar_Monthly';
const SHEET_LEDGER = 'Driver_Ledger';
const LEDGER_HEADERS = ['Date', 'Grab', 'Bolt', 'GoPlus', 'SwiftGo', 'Dier', 'inDrive', 'TADA', 'Lalamove', 'Other', 'Tip', 'Total', 'Power', 'Net'];
const LEDGER_FIELDS = [
  { key: 'grab',     col: 1,  label: 'Grab',     rx: 'grab|แกร็บ|แกรบ' },
  { key: 'bolt',     col: 2,  label: 'Bolt',     rx: 'bolt|โบลท์|โบลต์' },
  { key: 'goplus',   col: 3,  label: 'GoPlus',   rx: 'goplus|go\\+|โกพลัส' },
  { key: 'swiftgo',  col: 4,  label: 'SwiftGo',  rx: 'swiftgo|สวิฟท์โก|สวิฟโก' },
  { key: 'dier',     col: 5,  label: 'Dier',     rx: 'dier|เดียร์' },
  { key: 'indrive',  col: 6,  label: 'inDrive',  rx: 'indrive|in-drive|อินไดรฟ์' },
  { key: 'tada',     col: 7,  label: 'TADA',     rx: 'tada|ทาดา' },
  { key: 'lalamove', col: 8,  label: 'Lalamove', rx: 'lalamove|ลาล่ามูฟ|ลาลามูฟ' },
  { key: 'other',    col: 9,  label: 'Other',    rx: 'other|อื่นๆ|อื่น' },
  { key: 'tip',      col: 10, label: 'Tip',      rx: 'tip|ทิป' },
  { key: 'power',    col: 12, label: 'Power',    rx: 'power|ค่าไฟ|ค่าชาร์จ|ชาร์จ|ไฟ' }
];
// อัตราค่าไฟ TOU กฟน. ประเภท 1.3.2 (อิงบิลจริง Ft 0.1623 + VAT 7%): On-Peak 6.38 ฿, Off-Peak 3.00 ฿, เฉลี่ยโซลาร์ 5.41 ฿/หน่วย
const TOU_ON_PEAK = 6.38;
const TOU_OFF_PEAK = 3.00;
const TOU_SOLAR_BLEND = 5.41;
const SOLAR_SUB_FEE = 699;   // ค่าบริการรายเดือน BlueRing (บาท/เดือน)

function ensureSolarHistory_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sm = modEnsureSheet_(ss, SHEET_SOLAR_M, ['Month', 'Produced_kWh', 'Usage_kWh', 'NetGrid_kWh', 'Saved_THB', 'SelfPowered_Pct', 'Note']);
  if (sm.getLastRow() <= 1) {
    sm.getRange(2, 1, 7, 7).setValues([
      ['2026-05', 0, 1871, 1871, 0, 0, 'ประวัติ กฟน. (ก่อนติดโซลาร์)'],
      ['2026-06', 0, 1779, 1779, 0, 0, 'ประวัติ กฟน. (ก่อนติดโซลาร์)'],
      ['2026-07', 0, 1369, 1369, 0, 0, 'ประวัติ กฟน. (ก่อนติดโซลาร์)'],
      ['2026-08', 0, 1986, 1986, 0, 0, 'ประวัติ กฟน. (ก่อนติดโซลาร์)'],
      ['2026-09', 0, 1775, 1775, 0, 0, 'ประวัติ กฟน. (ก่อนติดโซลาร์)'],
      ['2026-10', 178.44, 1960.44, 1782, 1125.96, 9.1, 'บิลจริง กฟน. 6,067.27 ฿ (On 208 / Off 1,574 · 3.40 ฿/หน่วย) · สุทธิ +427 ฿'],
      ['2026-11', 233, 1983, 1750, 1274, 11.7, 'คาดการณ์เต็มเดือน: บิล กฟน. ~5,960 ฿ · ประหยัด TOU ~1,274 ฿ · สุทธิ +575 ฿']
    ]);
  }
  // ถ้า Modules_State ของ solar ยังเป็นค่าว่าง/0 ให้ใส่ค่าจริงล่าสุดจาก BlueRing
  const st = ss.getSheetByName(SHEET_MSTATE);
  if (st) {
    const rows = st.getDataRange().getValues();
    let curProd = null;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === 'solar' && String(rows[i][1]) === 'solarKw') curProd = Number(rows[i][2]);
    }
    if (curProd === 0) {
      const now = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
      const seed = { battery: '19', solarKw: '8.88', loadKw: '46.8', savedThb: '875.5' };
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === 'solar' && seed[String(rows[i][1])] !== undefined) {
          st.getRange(i + 1, 3, 1, 2).setValues([[seed[String(rows[i][1])], now]]);
        }
      }
    }
  }
  return sm;
}

function setupModuleSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  modEnsureSheet_(ss, SHEET_CAPTAIN, ['Timestamp', 'Date', 'Customer', 'Type', 'Premium', 'RenewalDate', 'Status']);
  modEnsureSheet_(ss, SHEET_HEALTH, ['Timestamp', 'Date', 'Activity', 'Minutes', 'Note']);
  ensureSolarHistory_();
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
      ['solar', 'battery', '19', now],
      ['solar', 'solarKw', '8.88', now],
      ['solar', 'loadKw', '46.8', now],
      ['solar', 'savedThb', '875.5', now]
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

  if (/^\/(solar|home)\b/i.test(low)) {
    ensureSolarHistory_();
    const s = solarStatus_();
    if (!s) { send_(chat, '☀️ ยังไม่มีข้อมูล Solar'); return true; }
    const arg = t.replace(/^\/(?:solar|home)\s*/i, '').trim();

    // ดูย้อนหลังทุกเดือน: /solar all
    if (/^(all|ย้อนหลัง|ทั้งหมด)$/i.test(arg)) {
      const lines = ['<b>📅 ย้อนหลัง Solar & กฟน.</b>'];
      (s.monthly || []).slice().reverse().forEach(function (m) {
        const netM = m.saved > 0 ? Math.round(m.saved - SOLAR_SUB_FEE) : 0;
        const savTxt = m.saved > 0 ? (' · ประหยัด ' + modFmtNum_(m.saved) + ' ฿ (' + (netM >= 0 ? '+' : '') + modFmtNum_(netM) + ')') : '';
        lines.push('• <b>' + m.m + '</b>: กฟน. ' + modFmtNum_(m.net) + ' น.' + savTxt);
      });
      send_(chat, lines.join('\n'));
      return true;
    }

    // เจาะจงดูเดือนที่เลือก: /solar 2026-10
    if (/^\d{4}-\d{2}$/.test(arg)) {
      const found = (s.monthly || []).find(function (m) { return m.m === arg; });
      if (!found) {
        const avail = (s.monthly || []).map(function (m) { return m.m; }).join(', ');
        send_(chat, 'ไม่พบเดือน <b>' + esc_(arg) + '</b>\nมีข้อมูล: ' + (avail || 'ยังไม่มี'));
        return true;
      }
      const netM = found.saved > 0 ? Math.round(found.saved - SOLAR_SUB_FEE) : 0;
      const lines = [
        '<b>☀️ Solar ' + esc_(found.m) + '</b>',
        '• ผลิต ' + found.prod + ' kWh · กฟน. ' + modFmtNum_(found.net) + ' หน่วย'
      ];
      if (found.saved > 0) {
        lines.push('• ประหยัด <b>' + modFmtNum_(found.saved) + ' ฿</b> (สุทธิ <b>' + (netM >= 0 ? '+' : '') + modFmtNum_(netM) + ' ฿</b>)');
      }
      if (found.note) lines.push('• ' + esc_(found.note));
      send_(chat, lines.join('\n'));
      return true;
    }

    const lines = [
      '<b>☀️ Solar ล่าสุด: ' + s.battery + '%</b> (ผลิต ' + s.solarKw + ' / ใช้ ' + s.loadKw + ' kWh)',
      '💰 รอบบิลนี้ประหยัด <b>' + modFmtNum_(s.savedThb) + ' ฿</b> (สุทธิ <b>' + (s.netSaved >= 0 ? '+' : '') + modFmtNum_(s.netSaved) + ' ฿</b>)',
      '🔮 คาด พ.ย.: บิล ~' + modFmtNum_(s.forecast.estBill) + ' ฿ · ประหยัด ~' + modFmtNum_(s.forecast.estSaved) + ' ฿ (สุทธิ +' + modFmtNum_(s.forecast.estNet) + ' ฿)',
      '👇 แตะปุ่มด้านล่างเพื่อดูเดือนอื่น'
    ];
    send_(chat, lines.join('\n'));
    return true;
  }

  if (t.indexOf('โซลาร์เดือน ') === 0) {
    // รูปแบบ: โซลาร์เดือน <YYYY-MM> <ผลิต kWh> <ใช้ไฟ kWh> [<ประหยัดจริง ฿>]
    const rest = t.slice(12).trim();
    const m = rest.match(/^(\d{4}-\d{2})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?$/);
    if (!m) {
      send_(chat, 'รูปแบบไม่ถูกต้อง ตัวอย่าง:\n<code>โซลาร์เดือน 2026-11 210 1350</code> (คำนวณประหยัด TOU อัตโนมัติ)\nหรือระบุยอดจริง: <code>โซลาร์เดือน 2026-10 178.44 1395.53 1125.96</code>');
      return true;
    }
    const ym = m[1], prod = Number(m[2]), use = Number(m[3]);
    const net = Math.max(0, Math.round((use - prod) * 100) / 100);
    const pct = use > 0 ? Math.round((prod / use) * 1000) / 10 : 0;
    const isEst = !m[4];
    const saved = isEst ? Math.round(prod * TOU_SOLAR_BLEND * 100) / 100 : Number(m[4]);
    const note = isEst ? ('ประเมิน TOU ~' + TOU_SOLAR_BLEND + ' ฿/หน่วย') : 'ยอดจริงจาก BlueRing';

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = modEnsureSheet_(ss, SHEET_SOLAR_M, ['Month', 'Produced_kWh', 'Usage_kWh', 'NetGrid_kWh', 'Saved_THB', 'SelfPowered_Pct', 'Note']);
    const rows = sh.getDataRange().getValues();
    let updated = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === ym) {
        sh.getRange(i + 1, 1, 1, 7).setValues([[ym, prod, use, net, saved, pct, note]]);
        updated = true;
        break;
      }
    }
    if (!updated) sh.appendRow([ym, prod, use, net, saved, pct, note]);
    if (typeof clearStatusCache_ === 'function') clearStatusCache_();
    if (typeof logEvent_ === 'function') logEvent_('Solar รายเดือน ' + ym + ': ประหยัด ' + modFmtNum_(saved) + ' ฿');
    const estFullBillNoSolar = Math.round((prod * TOU_SOLAR_BLEND + net * 4.2) * 100) / 100;
    send_(chat, '☀️ บันทึก <b>Solar รายเดือน ' + ym + '</b> แล้ว:\n• ผลิตได้: ' + prod + ' kWh · ใช้ไฟ: ' + use + ' kWh · Net Grid: ' + net + ' kWh\n• Self-powered: <b>' + pct + '%</b>\n• ประหยัดค่าไฟ (' + (isEst ? 'ประเมิน TOU' : 'ยอดจริง') + '): <b>' + modFmtNum_(saved) + ' บาท</b>\n• ค่าไฟประเมินแบบไม่มีโซลาร์: ~' + modFmtNum_(estFullBillNoSolar) + ' บาท');
    return true;
  }

  if (t.indexOf('โซลาร์ ') === 0) {
    // รูปแบบ: โซลาร์ <Self-powered%> <ผลิต kWh> <ใช้ไฟ kWh> <ประหยัดบาท>
    const rest = t.slice(7).trim();
    const m = rest.match(/^(\d+(?:\.\d+)?)%?\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?$/);
    if (!m) {
      send_(chat, 'รูปแบบไม่ถูกต้อง ตัวอย่าง: <code>โซลาร์ 19 8.88 46.8 875.5</code>\n(Self-powered% / ผลิต kWh / ใช้ไฟ kWh / ประหยัดบาท)');
      return true;
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = modEnsureSheet_(ss, SHEET_MSTATE, ['Module', 'Key', 'Value', 'UpdatedAt']);
    const rows = sh.getDataRange().getValues();
    const now = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
    const vals = { battery: m[1], solarKw: m[2], loadKw: m[3], savedThb: m[4] || '0' };
    Object.keys(vals).forEach(function (k) {
      let found = false;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === 'solar' && String(rows[i][1]) === k) {
          sh.getRange(i + 1, 3, 1, 2).setValues([[String(vals[k]), now]]);
          found = true;
          break;
        }
      }
      if (!found) sh.appendRow(['solar', k, String(vals[k]), now]);
    });
    if (typeof clearStatusCache_ === 'function') clearStatusCache_();
    if (typeof logEvent_ === 'function') logEvent_('BlueRing Solar: ' + vals.battery + '% · ' + vals.solarKw + ' kWh');
    send_(chat, '☀️ อัปเดต <b>BlueRing Solar</b> แล้ว:\n• Self-powered: <b>' + vals.battery + '%</b>\n• ผลิตได้: ' + vals.solarKw + ' kWh · ใช้ไฟ: ' + vals.loadKw + ' kWh\n• ประหยัดรอบบิล: <b>' + modFmtNum_(vals.savedThb) + ' บาท</b>');
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

  // ===================== DRIVER LEDGER (ตารางรายได้ขับรถรายวัน) =====================
  if (/^(\/ledger|สรุปขับรถ|ยอดขับรถ)(\s+\d{4}-\d{2})?$/i.test(t)) {
    const ymMatch = t.match(/(\d{4}-\d{2})/);
    send_(chat, formatDriverLedgerSummary_(ymMatch ? ymMatch[1] : ''));
    return true;
  }

  if (/^(ขับรถ|บันทึกขับรถ|แก้ยอดขับรถ|ตั้งยอดขับรถ)\b/i.test(t)) {
    const mode = /^(แก้ยอดขับรถ|ตั้งยอดขับรถ)/i.test(t) ? 'set' : 'add';
    const body = t.replace(/^(ขับรถ|บันทึกขับรถ|แก้ยอดขับรถ|ตั้งยอดขับรถ)\s*/i, '').trim();
    const parsed = parseDriverLedgerInput_(body);
    if (!parsed || !parsed.hasValues) {
      send_(chat,
        '🚘 <b>วิธีบันทึกยอดขับรถ (Driver_Ledger)</b>\n' +
        '• <code>ขับรถ Grab 1500 Bolt 600 ทิป 50 ไฟ 120</code>\n' +
        '• <code>ขับรถ 28/11 GoPlus 350 SwiftGo 420 Power 150</code>\n' +
        '• <code>แก้ยอดขับรถ 27/11 Other 5000</code> (เขียนทับยอด)\n' +
        '• <code>/ledger</code> หรือ <code>สรุปขับรถ 2026-10</code> (ดูสรุปรายเดือน)\n\n' +
        'รองรับทุกช่อง: Grab, Bolt, GoPlus, SwiftGo, Dier, inDrive, TADA, Lalamove, Other, Tip, Power/ไฟ'
      );
      return true;
    }
    const row = upsertDriverLedger_(parsed.date, parsed.values, mode);
    const parts = [];
    LEDGER_FIELDS.forEach(function (f) {
      if (f.key !== 'power' && row[f.key]) parts.push(f.label + ' ' + modFmtDec_(row[f.key]));
    });
    send_(chat,
      '✅ <b>บันทึก Driver_Ledger แล้ว</b> (' + (mode === 'set' ? 'ตั้งยอดใหม่' : 'บวกเพิ่ม') + ')\n' +
      '📅 วันที่: <b>' + row.date + '</b>\n' +
      (parts.length ? '🚘 ' + parts.join(' · ') + '\n' : '') +
      '💰 Total: <b>' + modFmtDec_(row.total) + ' ฿</b>\n' +
      '⚡ Power: <b>' + modFmtDec_(row.power) + ' ฿</b>\n' +
      '🟢 Net: <b>' + modFmtDec_(row.net) + ' ฿</b>'
    );
    return true;
  }

  return false;
}

// ===================== WEBHOOK (MT5 EA & Solar HomeKit — ประหยัดโควตาด้วย Throttle + Dirty-check) =====================
function modulesWebhook_(e) {
  const json = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  let body = {};
  try { body = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (err) { return json({ ok: false, error: 'bad_request' }); }
  const key = prop_('DASH_KEY');
  const provided = (e.parameter && e.parameter.k) || body.k || '';
  if (!key || provided !== key) return json({ ok: false, error: 'unauthorized' });
  const src = String((e.parameter && e.parameter.source) || body.source || '').toLowerCase();
  if (src !== 'profit' && src !== 'solar') return json({ ok: false, error: 'bad_request' });

  // 1) Throttle: กันระบบภายนอกยิงถี่เกิน 1 ครั้ง/60 วินาที (ยกเว้นส่ง force: true สำหรับแจ้งเตือนด่วน)
  const cache = CacheService.getScriptCache();
  const force = String((e.parameter && e.parameter.force) || body.force || '') === 'true';
  if (!force && cache.get('wh_cool_' + src)) {
    return json({ ok: true, skipped: 'throttled' });
  }

  // 2) Dirty-check: ถ้าค่าเหมือนเดิมเป๊ะ ข้ามการเขียน Google Sheet เพื่อประหยัดโควตารายวัน
  const cleanPayload = {};
  Object.keys(body).sort().forEach(function (k) {
    if (k !== 'k' && k !== 'source' && k !== 'force') cleanPayload[k] = String(body[k]);
  });
  const sig = JSON.stringify(cleanPayload);
  if (!force && cache.get('wh_sig_' + src) === sig) {
    cache.put('wh_cool_' + src, '1', 60);
    return json({ ok: true, skipped: 'unchanged' });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = modEnsureSheet_(ss, SHEET_MSTATE, ['Module', 'Key', 'Value', 'UpdatedAt']);
  const rows = sh.getDataRange().getValues();
  const now = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
  const toAppend = [];

  Object.keys(cleanPayload).forEach(function (k) {
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === src && String(rows[i][1]) === k) {
        if (String(rows[i][2]) !== cleanPayload[k]) {
          sh.getRange(i + 1, 3, 1, 2).setValues([[cleanPayload[k], now]]);
        }
        found = true;
        break;
      }
    }
    if (!found) toAppend.push([src, k, cleanPayload[k], now]);
  });
  toAppend.forEach(function (r) { sh.appendRow(r); });

  cache.put('wh_cool_' + src, '1', 60);
  cache.put('wh_sig_' + src, sig, 3600);
  if (typeof clearStatusCache_ === 'function') clearStatusCache_();
  if (typeof logEvent_ === 'function') logEvent_('Webhook อัปเดต ' + src);
  return json({ ok: true, updated: Object.keys(cleanPayload).length });
}

// ===================== CROSS-AGENT MORNING BRIEFING (/brief) =====================
function sendMorningBriefing_(chat) {
  const b = typeof budgetStatus_ === 'function' ? safe_(budgetStatus_) : null;
  const j = typeof todayJobs_ === 'function' ? safe_(todayJobs_) : null;
  const c = safe_(captainStatus_);
  const p = safe_(profitStatus_);
  const s = safe_(solarStatus_);
  const h = safe_(healthStatus_);

  const lines = ['<b>🌅 สรุปรวมทีมเอเจนต์ AboutMeProcess</b>'];
  const alerts = [];
  if (b && !b.err) {
    if (b.shortNow > 0) alerts.push('⚠️ เงินสดขาดปิดยอดค้างวันนี้ ' + modFmtNum_(b.shortNow) + ' บาท');
    lines.push('💰 <b>Finance:</b> เป้าวันนี้ ' + (b.target > 0 ? modFmtNum_(b.target) + ' บาท/วัน' : 'พอจ่ายแล้ว 🎉') + ' · เงินสด ' + modFmtNum_(b.cash) + ' บาท');
  }
  if (j) {
    lines.push('🚖 <b>Driver:</b> วันนี้ ' + j.count + ' เที่ยว · รายได้ ' + modFmtNum_(j.gross) + ' บาท');
  }
  if (c) {
    lines.push('🛡️ <b>Captain:</b> เคสวันนี้ ' + c.casesToday + ' · รอปิด ' + c.quotesPending + ' · ใกล้ต่ออายุ ' + c.renewals);
    if (c.renewals > 0) alerts.push('🛡️ มีกรมธรรม์ใกล้ต่ออายุ ' + c.renewals + ' ราย');
  }
  if (p) {
    lines.push('📈 <b>Take Profit:</b> ' + esc_(p.pair) + ' (' + (p.eaOn ? 'ON' : 'OFF') + ') · วันนี้ ' + (p.dayPl >= 0 ? '+' : '') + p.dayPl + '$ · DD ' + p.ddPct + '%');
  }
  if (s) {
    lines.push('☀️ <b>Solar:</b> แบต ' + s.battery + '% · ผลิต ' + s.solarKw + ' kW · ประหยัด ' + modFmtNum_(s.savedThb) + ' ฿');
    if (s.battery > 0 && s.battery < 25) alerts.push('🪫 แบตโซลาร์ต่ำ (' + s.battery + '%)');
  }
  if (h) {
    lines.push('💪 <b>Healthy:</b> ต่อเนื่อง ' + h.streak + ' วัน · สัปดาห์นี้ ' + h.weekDays + '/' + h.weekGoal + ' วัน (' + h.weekMin + ' น.)');
  }
  if (alerts.length) {
    lines.splice(1, 0, '<b>🔔 จุดที่ต้องดูแล:</b>\n' + alerts.join('\n'));
  }
  send_(chat, lines.join('\n'));
}

function runDailyBriefingTrigger() {
  const owner = typeof owner_ === 'function' ? owner_() : '';
  if (owner) sendMorningBriefing_(owner);
}

function installBriefingTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runDailyBriefingTrigger') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runDailyBriefingTrigger').timeBased().everyDays(1).atHour(7).create();
  console.log('ตั้งเวลาส่งสรุปรวมทีมเอเจนต์ทุกเช้า ~07:00 น. แล้ว');
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
  const mRows = modReadRows_(SHEET_SOLAR_M);
  const monthly = mRows.slice(-12).map(function (r) {
    const rawM = r[0];
    const mStr = (rawM instanceof Date)
      ? Utilities.formatDate(rawM, TZ, 'yyyy-MM')
      : String(rawM || '').trim().slice(0, 7);
    return {
      m: mStr,
      prod: Number(r[1] || 0),
      use: Number(r[2] || 0),
      net: Number(r[3] || 0),
      saved: Number(r[4] || 0),
      pct: Number(r[5] || 0),
      note: String(r[6] || '')
    };
  }).filter(function (x) { return x.m; });
  if (!m && !monthly.length) return null;
  const s = m || {};
  return {
    battery: Number(s.battery || 0),
    solarKw: Number(s.solarKw || 0),
    loadKw: Number(s.loadKw || 0),
    savedThb: Number(s.savedThb || 0),
    subFee: SOLAR_SUB_FEE,
    netSaved: Math.round((Number(s.savedThb || 0) - SOLAR_SUB_FEE) * 100) / 100,
    forecast: { month: '2026-11', estProd: 233, estGrid: 1750, estBill: 5960, estSaved: 1274, estNet: 575 },
    tou: { onPeak: TOU_ON_PEAK, offPeak: TOU_OFF_PEAK, blend: TOU_SOLAR_BLEND, avgReal: 3.40 },
    monthly: monthly,
    note: 'BlueRing 699 ฿/ด. · กฟน. TOU 1.3.2 (เฉลี่ยจริง 3.40 ฿/หน่วย · Off-Peak 88.3%)'
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

// ===================== DRIVER LEDGER HELPERS =====================
function modFmtDec_(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

function ensureDriverLedgerSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = modEnsureSheet_(ss, SHEET_LEDGER, LEDGER_HEADERS);
  if (sh.getLastRow() <= 1 && typeof seedDriverLedgerPrivate_ === 'function') {
    seedDriverLedgerPrivate_(sh);
  }
  return sh;
}

function ledgerNormDate_(raw) {
  if (raw instanceof Date) return Utilities.formatDate(raw, TZ, 'yyyy-MM-dd');
  const s = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function parseDriverLedgerInput_(text) {
  let s = String(text || '').trim();
  if (!s) return null;
  let dateStr = modFmtDate_(new Date());
  const curYear = Number(dateStr.slice(0, 4));

  if (/เมื่อวาน/.test(s)) {
    dateStr = modFmtDate_(new Date(Date.now() - 86400000));
    s = s.replace(/เมื่อวาน/g, ' ');
  } else {
    let dm = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (dm) {
      dateStr = dm[1] + '-' + ('0' + dm[2]).slice(-2) + '-' + ('0' + dm[3]).slice(-2);
      s = s.replace(dm[0], ' ');
    } else {
      dm = s.match(/(?:วันที่\s*)?\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
      if (dm) {
        const y = dm[3] ? Number(dm[3]) : curYear;
        dateStr = y + '-' + ('0' + dm[2]).slice(-2) + '-' + ('0' + dm[1]).slice(-2);
        s = s.replace(dm[0], ' ');
      }
    }
  }

  const values = {};
  let hasValues = false;
  LEDGER_FIELDS.forEach(function (f) {
    const re = new RegExp('(?:' + f.rx + ')\\s*[:=]?\\s*([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)', 'gi');
    let m;
    let sum = 0;
    let found = false;
    while ((m = re.exec(s)) !== null) {
      sum += Number(m[1].replace(/,/g, '')) || 0;
      found = true;
    }
    if (found) {
      values[f.key] = Math.round(sum * 100) / 100;
      hasValues = true;
    }
  });

  return { date: dateStr, values: values, hasValues: hasValues };
}

function upsertDriverLedger_(dateStr, values, mode) {
  const sh = ensureDriverLedgerSheet_();
  const lastRow = sh.getLastRow();
  let rowIdx = -1;
  let cur = [dateStr, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  if (lastRow > 1) {
    const dates = sh.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < dates.length; i++) {
      if (ledgerNormDate_(dates[i][0]) === dateStr) {
        rowIdx = i + 2;
        cur = sh.getRange(rowIdx, 1, 1, 14).getValues()[0];
        cur[0] = dateStr;
        for (let c = 1; c < 14; c++) cur[c] = Number(cur[c]) || 0;
        break;
      }
    }
  }

  LEDGER_FIELDS.forEach(function (f) {
    if (values[f.key] !== undefined) {
      cur[f.col] = mode === 'set'
        ? Math.round((Number(values[f.key]) || 0) * 100) / 100
        : Math.round(((Number(cur[f.col]) || 0) + (Number(values[f.key]) || 0)) * 100) / 100;
    }
  });

  let total = 0;
  for (let c = 1; c <= 10; c++) total += Number(cur[c]) || 0;
  total = Math.round(total * 100) / 100;
  const power = Math.round((Number(cur[12]) || 0) * 100) / 100;
  const net = Math.round((total - power) * 100) / 100;
  cur[11] = total;
  cur[12] = power;
  cur[13] = net;

  if (rowIdx > 0) {
    sh.getRange(rowIdx, 1, 1, 14).setValues([cur]);
  } else {
    sh.appendRow(cur);
    const nr = sh.getLastRow();
    sh.getRange(nr, 1).setNumberFormat('@');
  }

  if (typeof logEvent_ === 'function') logEvent_('Driver Ledger ' + dateStr + ': Net ' + modFmtNum_(net) + ' ฿');
  return {
    date: dateStr, grab: cur[1], bolt: cur[2], goplus: cur[3], swiftgo: cur[4],
    dier: cur[5], indrive: cur[6], tada: cur[7], lalamove: cur[8], other: cur[9],
    tip: cur[10], total: total, power: power, net: net
  };
}

function driverLedgerStatus_() {
  const sh = ensureDriverLedgerSheet_();
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues() : [];
  const todayStr = modFmtDate_(new Date());
  const byMonth = {};
  const rowsByMonth = {};
  let todayRow = null;

  rows.forEach(function (r) {
    const dt = ledgerNormDate_(r[0]);
    if (!dt) return;
    const obj = {
      date: dt,
      grab: Number(r[1]) || 0, bolt: Number(r[2]) || 0, goplus: Number(r[3]) || 0,
      swiftgo: Number(r[4]) || 0, dier: Number(r[5]) || 0, indrive: Number(r[6]) || 0,
      tada: Number(r[7]) || 0, lalamove: Number(r[8]) || 0, other: Number(r[9]) || 0,
      tip: Number(r[10]) || 0, total: Number(r[11]) || 0, power: Number(r[12]) || 0,
      net: Number(r[13]) || 0
    };
    if (dt === todayStr) todayRow = obj;
    const ym = dt.slice(0, 7);
    if (!byMonth[ym]) {
      byMonth[ym] = { m: ym, days: 0, total: 0, power: 0, net: 0, byApp: { grab: 0, bolt: 0, goplus: 0, swiftgo: 0, dier: 0, indrive: 0, tada: 0, lalamove: 0, other: 0, tip: 0 } };
      rowsByMonth[ym] = [];
    }
    const bm = byMonth[ym];
    if (obj.total > 0 || obj.power > 0) bm.days++;
    bm.total = Math.round((bm.total + obj.total) * 100) / 100;
    bm.power = Math.round((bm.power + obj.power) * 100) / 100;
    bm.net = Math.round((bm.net + obj.net) * 100) / 100;
    Object.keys(bm.byApp).forEach(function (k) {
      bm.byApp[k] = Math.round((bm.byApp[k] + obj[k]) * 100) / 100;
    });
    rowsByMonth[ym].push(obj);
  });

  const months = Object.keys(byMonth).sort().map(function (ym) {
    const bm = byMonth[ym];
    bm.avgNet = bm.days ? Math.round((bm.net / bm.days) * 100) / 100 : 0;
    rowsByMonth[ym].sort(function (a, b) { return a.date.localeCompare(b.date); });
    return bm;
  });

  // Keep latest 6 months of daily rows in JSON payload for fast dashboard loading
  const recentRowsByMonth = {};
  months.slice(-6).forEach(function (bm) { recentRowsByMonth[bm.m] = rowsByMonth[bm.m]; });

  return {
    months: months,
    rowsByMonth: recentRowsByMonth,
    today: todayRow || { date: todayStr, grab: 0, bolt: 0, goplus: 0, swiftgo: 0, dier: 0, indrive: 0, tada: 0, lalamove: 0, other: 0, tip: 0, total: 0, power: 0, net: 0 }
  };
}

function formatDriverLedgerSummary_(ymOpt) {
  const st = driverLedgerStatus_();
  if (!st || !st.months.length) return '🚘 ยังไม่มีข้อมูลในชีต Driver_Ledger';
  const target = ymOpt ? st.months.find(function (x) { return x.m === ymOpt; }) : st.months[st.months.length - 1];
  if (!target) return '🚘 ไม่พบข้อมูล Driver_Ledger เดือน ' + esc_(ymOpt);
  const topApps = Object.keys(target.byApp)
    .map(function (k) { return { k: k, v: target.byApp[k] }; })
    .filter(function (x) { return x.v > 0; })
    .sort(function (a, b) { return b.v - a.v; });
  const appLines = topApps.map(function (x) {
    const f = LEDGER_FIELDS.find(function (ff) { return ff.key === x.k; });
    return '• ' + (f ? f.label : x.k) + ': ' + modFmtDec_(x.v) + ' ฿';
  }).join('\n');
  const histLines = st.months.slice(-5).map(function (bm) {
    return '• ' + bm.m + ': สุทธิ <b>' + modFmtNum_(bm.net) + ' ฿</b> (รวม ' + modFmtNum_(bm.total) + ' / ไฟ ' + modFmtNum_(bm.power) + ' · ' + bm.days + ' วัน)';
  }).join('\n');
  return '🚘 <b>สรุป Driver_Ledger เดือน ' + target.m + '</b>\n' +
    '• วิ่งทั้งหมด: <b>' + target.days + ' วัน</b>\n' +
    '• รายได้รวม (Total): <b>' + modFmtDec_(target.total) + ' ฿</b>\n' +
    '• ค่าชาร์จไฟ (Power): <b>' + modFmtDec_(target.power) + ' ฿</b>\n' +
    '• รายได้สุทธิ (Net): <b>' + modFmtDec_(target.net) + ' ฿</b> (เฉลี่ย ' + modFmtNum_(target.avgNet) + ' ฿/วัน)\n\n' +
    '<b>แยกตามแอป</b>\n' + appLines + '\n\n' +
    '<b>เทียบย้อนหลัง 5 เดือน</b>\n' + histLines;
}
