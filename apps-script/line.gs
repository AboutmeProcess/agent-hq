/**
 * line.gs — ตัวเชื่อม LINE Official Account (Messaging API) สำหรับ AboutMeProcess HQ
 * ใช้สมองเดียวกับ driver_hq_bot.gs, budget.js และ modules.js
 *
 * จุดเด่นด้านความประหยัด (0 บาท):
 * - การตอบกลับตอนคุณพิมพ์สั่งงานทั้งหมดใช้ Reply API (ฟรีไม่จำกัดข้อความ)
 * - การแจ้งเตือนอัตโนมัติ (Push) มีตัวนับโควตารายเดือน (ค่าเริ่มต้นล็อกไม่เกิน 180 ข้อความ/เดือน กันเกินโควตาฟรี 200)
 *
 * Script Properties ที่ต้องตั้งค่าใน Apps Script:
 * - LINE_CHANNEL_TOKEN : Channel Access Token (long-lived) จาก LINE Developers Console
 * - LINE_USER_ID       : User ID ของคุณ (ถ้ายังไม่ตั้ง ให้ลองทักบอทใน LINE บอทจะตอบ User ID กลับมาให้)
 * - LINE_PUSH_LIMIT    : (ไม่บังคับ) เพดาน Push ต่อเดือน ค่าเริ่มต้น 180
 *
 * Webhook URL ที่นำไปวางใน LINE Developers Console:
 *   <WEBAPP_EXEC_URL>?action=line
 */

const LINE_API_BASE = 'https://api.line.me/v2/bot/message/';

function lineToken_() { return String(prop_('LINE_CHANNEL_TOKEN') || '').trim(); }
function lineOwner_() { return String(prop_('LINE_USER_ID') || '').trim(); }

// เปรียบเทียบรหัสลับแบบ Constant-time ลดความเสี่ยง Timing Attack
function lineSafeEq_(a, b) {
  const s1 = String(a || ''), s2 = String(b || '');
  if (!s1 || s1.length !== s2.length) return false;
  let diff = 0;
  for (let i = 0; i < s1.length; i++) diff |= s1.charCodeAt(i) ^ s2.charCodeAt(i);
  return diff === 0;
}

// แปลง HTML ที่บอทเดิมสร้างสำหรับ Telegram ให้เป็นข้อความอ่านง่ายบน LINE
function htmlToLineText_(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:b|strong|i|em|code|pre|u)>/gi, '')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '$2\n$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ปุ่ม Quick Reply ด้านล่างแชท LINE (กดสั่งงานไว หรือเลือกดูเดือนย้อนหลังได้ทันที)
function lineQuickReply_(ctxText) {
  let items;
  if (/^\/solar\b|^โซลาร์/i.test(String(ctxText || '').trim())) {
    items = [
      ['📊 ดูทุกเดือน', '/solar all'],
      ['📅 พ.ย. 2026', '/solar 2026-11'],
      ['📅 ต.ค. 2026', '/solar 2026-10'],
      ['📅 ก.ย. 2026', '/solar 2026-09'],
      ['📅 ส.ค. 2026', '/solar 2026-08'],
      ['🌅 สรุปเช้า', '/brief'],
      ['🏢 แดชบอร์ด 3D', '/dash']
    ];
  } else {
    items = [
      ['🌅 สรุปเช้า', '/brief'],
      ['🎯 วันนี้ต้องหา', 'วันนี้ต้องหาเท่าไร'],
      ['☀️ โซลาร์', '/solar'],
      ['✈️ BKK', '/bkk'],
      ['✈️ DMK', '/dmk'],
      ['📊 สรุปรายได้', '/summary'],
      ['🧾 รายการจ่าย', '/bills'],
      ['🛡️ ประกัน', '/captain'],
      ['💪 สุขภาพ', '/health'],
      ['🏢 แดชบอร์ด 3D', '/dash']
    ];
  }
  const qr = items.map(function (x) {
    return { type: 'action', action: { type: 'message', label: x[0], text: x[1] } };
  });
  if (!/^\/solar\b|^โซลาร์/i.test(String(ctxText || '').trim())) {
    qr.push({ type: 'action', action: { type: 'location', label: '📍 แชร์พิกัด' } });
  }
  return { items: qr };
}

// ตอบกลับผ่าน Reply API (ฟรีไม่จำกัดข้อความ!)
function lineReply_(replyToken, text, ctxText) {
  const token = lineToken_();
  if (!token || !replyToken) return;
  const clean = htmlToLineText_(text).slice(0, 4800) || 'รับทราบครับ';
  UrlFetchApp.fetch(LINE_API_BASE + 'reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: clean, quickReply: lineQuickReply_(ctxText) }]
    }),
    muteHttpExceptions: true
  });
}

// ส่งแจ้งเตือนผ่าน Push API (มีตัวคุมโควตาไม่ให้เกินแพ็กเกจฟรี 200 ข้อความ/เดือน)
function sendLinePush_(text) {
  const token = lineToken_();
  const uid = lineOwner_();
  if (!token || !uid) return { ok: false, error: 'missing_line_config' };

  const P = PropertiesService.getScriptProperties();
  const ym = Utilities.formatDate(new Date(), TZ, 'yyyyMM');
  const countKey = 'LINE_PUSH_' + ym;
  const used = Number(P.getProperty(countKey) || 0);
  const limit = Number(prop_('LINE_PUSH_LIMIT') || 180);

  if (used >= limit) {
    if (typeof logEvent_ === 'function') logEvent_('ข้าม LINE Push (ใช้ครบเพดานฟรี ' + used + '/' + limit + ')');
    return { ok: false, error: 'monthly_push_limit_reached', used: used, limit: limit };
  }

  const clean = htmlToLineText_(text).slice(0, 4800);
  const res = UrlFetchApp.fetch(LINE_API_BASE + 'push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      to: uid,
      messages: [{ type: 'text', text: clean, quickReply: lineQuickReply_() }]
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() === 200) {
    P.setProperty(countKey, String(used + 1));
    return { ok: true, used: used + 1, limit: limit };
  }
  return { ok: false, code: res.getResponseCode(), body: res.getContentText() };
}

// จุดรับ Webhook จาก LINE Messaging API (POST ?action=line หรือ ?action=line&ls=SECRET)
function lineWebhook_(e) {
  try {
    // 1) ถ้าตั้ง LINE_WEBHOOK_SECRET ใน Script Properties ต้องส่ง ?ls=... ตรงกันเท่านั้น
    const whSecret = String(prop_('LINE_WEBHOOK_SECRET') || '').trim();
    if (whSecret && !lineSafeEq_(e && e.parameter && e.parameter.ls, whSecret)) {
      console.log('LINE webhook rejected: invalid secret');
      return ok_();
    }

    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    const events = body.events || [];
    if (!events.length) return ok_();   // LINE Verify webhook ส่ง events ว่าง -> ตอบ 200 ok ทันที

    const cache = CacheService.getScriptCache();
    // 2) Rate-limit ต่อนาที (สูงสุด 30 ข้อความ/นาที) ป้องกันการยิงถล่มโควตา Apps Script
    const rKey = 'line_rate_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHHmm');
    const rCnt = Number(cache.get(rKey) || 0);
    if (rCnt >= 30) return ok_();
    cache.put(rKey, String(rCnt + 1), 120);
    events.forEach(function (ev) {
      if (!ev || !ev.replyToken) return;
      const eid = ev.webhookEventId || ev.replyToken;
      if (cache.get('line_' + eid)) return;
      cache.put('line_' + eid, '1', 300);

      const uid = String((ev.source && ev.source.userId) || '').trim();
      const owner = lineOwner_();
      if (!owner) {
        lineReply_(ev.replyToken,
          '👋 เชื่อม LINE สำเร็จแล้ว!\n\nUser ID ของคุณคือ:\n' + uid +
          '\n\nให้นำค่านี้ไปใส่ใน Script Properties ชื่อ LINE_USER_ID เพื่อเปิดสิทธิ์สั่งงานเฉพาะคุณครับ');
        return;
      }
      if (uid !== owner) {
        console.log('ข้อความ LINE จากบุคคลอื่น: ' + uid);
        return;
      }

      if (typeof touch_ === 'function') touch_();
      const msg = ev.message || {};

      // รองรับส่ง Location จาก LINE
      if (ev.type === 'message' && msg.type === 'location') {
        const lat = Number(msg.latitude), lng = Number(msg.longitude);
        cache.put('lat_' + uid, String(lat), 1800);
        cache.put('lng_' + uid, String(lng), 1800);
        const link = typeof mapsTrafficUrl_ === 'function'
          ? mapsTrafficUrl_(lat, lng)
          : ('https://www.google.com/maps/@' + lat + ',' + lng + ',14z/data=!5m1!1e1');
        lineReply_(ev.replyToken, '📍 รับพิกัดแล้วครับ\n🗺️ ดูจราจรสดรอบตัวคุณ:\n' + link + '\n\nพิมพ์ "ไป <ชื่อสถานที่>" เพื่อค้นเส้นทางได้เลย');
        return;
      }

      // ข้อความปกติ -> ส่งเข้าสมองกลาง handleText_ โดยจับคำตอบผ่าน OUT_ แล้วตอบกลับด้วย Reply API (ฟรี!)
      if (ev.type === 'message' && msg.type === 'text') {
        const text = String(msg.text || '').trim();
        if (!text) return;

        // คำสั่งเฉพาะเจ้าของ: สร้างและติดตั้ง Rich Menu 6 ปุ่มสวยๆ บน LINE OA อัตโนมัติ
        if (/^\/setup_richmenu$/i.test(text)) {
          const res = setupLineRichMenu_();
          lineReply_(ev.replyToken, res.ok
            ? ('✅ ติดตั้ง Rich Menu 6 ปุ่มเรียบร้อยแล้วครับ!\n(ID: ' + res.id + ')\nลองปิดแล้วเปิดแชท LINE ใหม่จะเห็นแผงเมนูถาวรด้านล่างจอทันที')
            : ('⚠️ ติดตั้ง Rich Menu ไม่สำเร็จ: ' + res.error));
          return;
        }

        // คำสั่งตรวจสถานะความปลอดภัยของระบบ (ไม่แสดงค่ารหัสลับจริง)
        if (/^\/security$/i.test(text)) {
          const P = PropertiesService.getScriptProperties();
          const ym = Utilities.formatDate(new Date(), TZ, 'yyyyMM');
          const used = Number(P.getProperty('LINE_PUSH_' + ym) || 0);
          const lim = Number(prop_('LINE_PUSH_LIMIT') || 180);
          const report = [
            '🛡️ สถานะความปลอดภัย AboutMeProcess',
            '• ล็อกสิทธิ์เฉพาะ LINE User ID ของคุณ: ' + (lineOwner_() ? '✅ เปิดแล้ว' : '⚠️ ยังไม่ตั้ง'),
            '• LINE Webhook Secret (?ls=): ' + (prop_('LINE_WEBHOOK_SECRET') ? '✅ เปิดแล้ว' : 'ℹ️ ใช้ล็อก User ID อย่างเดียว'),
            '• รหัส DASH_KEY: ' + (String(prop_('DASH_KEY') || '').length >= 16 ? '✅ ปลอดภัย (≥16 ตัว)' : '⚠️ ควรตั้งยาว ≥16 ตัว'),
            '• สิทธิ์สั่งงานจากเว็บ (DASH_ALLOW_CMD): ' + (String(prop_('DASH_ALLOW_CMD') || '').toLowerCase() === 'true' ? 'เปิดอยู่' : 'ปิดอยู่'),
            '• คีย์ Telegram เก่า (BOT_TOKEN): ' + (P.getProperty('BOT_TOKEN') ? '⚠️ ยังค้างอยู่ (พิมพ์ /cleanup_telegram)' : '✅ ลบสะอาดแล้ว'),
            '• โควตา LINE Push เดือนนี้: ' + used + ' / ' + lim + ' ข้อความ (กันเกินฟรี 200)'
          ];
          lineReply_(ev.replyToken, report.join('\n'));
          return;
        }

        // คำสั่งเฉพาะเจ้าของ: ล้างค่า Telegram เก่า + สร้างชีต 4 โมดูล + ตั้งเวลาสรุปเช้า LINE ในคำสั่งเดียว
        if (/^\/cleanup_telegram$/i.test(text)) {
          const P = PropertiesService.getScriptProperties();
          const removedProps = [];
          ['BOT_TOKEN', 'OWNER_CHAT_ID', 'WORKER_URL', 'WEBHOOK_SECRET'].forEach(function (k) {
            if (P.getProperty(k) != null) { P.deleteProperty(k); removedProps.push(k); }
          });
          const removedTrigs = [];
          try {
            ScriptApp.getProjectTriggers().forEach(function (tr) {
              const fn = tr.getHandlerFunction();
              if (/budget|briefing|morning|evening/i.test(fn) && fn !== 'runLineDailyBriefing') {
                ScriptApp.deleteTrigger(tr);
                removedTrigs.push(fn);
              }
            });
          } catch (te) {}
          const notes = ['🧹 ล้างค่า Telegram เดิมเรียบร้อยครับ'];
          notes.push('• Properties ที่ลบ: ' + (removedProps.length ? removedProps.join(', ') : 'ไม่มีค้างแล้ว'));
          notes.push('• Triggers ที่ลบ: ' + (removedTrigs.length ? removedTrigs.join(', ') : 'ไม่มีค้างแล้ว'));
          try {
            if (typeof setupModuleSheets === 'function') { setupModuleSheets(); notes.push('• ✅ สร้างแท็บ 4 โมดูล (Captain_Cases, Health_Log, Modules_State) แล้ว'); }
          } catch (se) { notes.push('• ⚠️ setupModuleSheets: ' + String(se)); }
          try {
            installLineBriefingTrigger();
            notes.push('• ✅ ตั้งเวลาสรุปเช้า 07:00 น. เข้า LINE อัตโนมัติแล้ว');
          } catch (ie) { notes.push('• ⚠️ Trigger LINE (อาจต้องกด Run ใน Apps Script 1 ครั้ง): ' + String(ie)); }
          lineReply_(ev.replyToken, notes.join('\n'));
          return;
        }

        // กรณี /dash ส่งลิงก์เปิดแดชบอร์ด 3D โดยตรงในแชท LINE
        if (/^\/dash\b|แดชบอร์ด/i.test(text)) {
          const key = prop_('DASH_KEY');
          if (!key) {
            lineReply_(ev.replyToken, '⚠️ ยังไม่ได้ตั้ง DASH_KEY ใน Script Properties');
            return;
          }
          const page = String(prop_('DASH_PAGE_URL') || DASH_PAGE_DEFAULT).replace(/#.*$/, '');
          const api = prop_('DASH_API_URL') || WEBAPP_URL;
          const url = page + '#u=' + encodeURIComponent(api) + '&k=' + encodeURIComponent(key);
          lineReply_(ev.replyToken, '🏢 เปิด AboutMeProcess 3D (เชื่อมข้อมูลจริงแล้ว):\n' + url + '\n\n⚠️ ลิงก์นี้มีรหัสผ่านอยู่ในตัว อย่าส่งต่อให้ผู้อื่น');
          return;
        }

        OUT_ = [];
        try {
          handleText_(uid, text);
          const reply = OUT_.join('\n\n') || 'รับทราบครับ';
          lineReply_(ev.replyToken, reply, text);
        } catch (err) {
          console.error(err);
          if (typeof noteError_ === 'function') noteError_(err);
          lineReply_(ev.replyToken, '⚠️ เกิดข้อผิดพลาด: ' + String(err));
        } finally {
          OUT_ = null;
        }
      }
    });
  } catch (err) {
    console.error(err);
    if (typeof noteError_ === 'function') noteError_(err);
  }
  return ok_();
}

// ===================== LINE RICH MENU (6 ปุ่มถาวรด้านล่างจอ) =====================
function setupLineRichMenu_() {
  const token = lineToken_();
  if (!token) return { ok: false, error: 'ไม่มี LINE_CHANNEL_TOKEN' };
  const headers = { Authorization: 'Bearer ' + token };

  // 1) สร้างโครง Rich Menu 2500x1686 (2 แถว x 3 คอลัมน์)
  const w1 = 833, w2 = 834, h = 843;
  const menuDef = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'AboutMeProcess_HQ_v1',
    chatBarText: 'เมนู AboutMeProcess',
    areas: [
      { bounds: { x: 0, y: 0, width: w1, height: h }, action: { type: 'message', text: 'วันนี้ต้องหาเท่าไร' } },
      { bounds: { x: w1, y: 0, width: w2, height: h }, action: { type: 'message', text: '/summary' } },
      { bounds: { x: w1 + w2, y: 0, width: w1, height: h }, action: { type: 'message', text: '/bkk' } },
      { bounds: { x: 0, y: h, width: w1, height: h }, action: { type: 'message', text: '/solar' } },
      { bounds: { x: w1, y: h, width: w2, height: h }, action: { type: 'message', text: '/brief' } },
      { bounds: { x: w1 + w2, y: h, width: w1, height: h }, action: { type: 'message', text: '/dash' } }
    ]
  };
  const r1 = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'post', contentType: 'application/json', headers: headers,
    payload: JSON.stringify(menuDef), muteHttpExceptions: true
  });
  if (r1.getResponseCode() !== 200) return { ok: false, error: 'create ' + r1.getResponseCode() + ': ' + r1.getContentText() };
  const menuId = JSON.parse(r1.getContentText()).richMenuId;

  // 2) ดึงภาพ Rich Menu จาก GitHub Pages ของคุณแล้วอัปโหลดขึ้น LINE (JPEG < 1 MB ตามข้อกำหนด LINE)
  const imgUrl = String(prop_('DASH_PAGE_URL') || DASH_PAGE_DEFAULT).replace(/\/?$/, '/') + 'assets/line-richmenu.jpg';
  const imgRes = UrlFetchApp.fetch(imgUrl, { muteHttpExceptions: true });
  if (imgRes.getResponseCode() !== 200) return { ok: false, error: 'download image ' + imgRes.getResponseCode() };
  const blob = imgRes.getBlob().getBytes();

  const r2 = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/richmenu/' + menuId + '/content', {
    method: 'post', contentType: 'image/jpeg', headers: headers,
    payload: blob, muteHttpExceptions: true
  });
  if (r2.getResponseCode() !== 200) return { ok: false, error: 'upload ' + r2.getResponseCode() + ': ' + r2.getContentText() };

  // 3) ตั้งเป็น Default Rich Menu ของ LINE OA
  const r3 = UrlFetchApp.fetch('https://api.line.me/v2/bot/user/all/richmenu/' + menuId, {
    method: 'post', headers: headers, muteHttpExceptions: true
  });
  if (r3.getResponseCode() !== 200) return { ok: false, error: 'set default ' + r3.getResponseCode() + ': ' + r3.getContentText() };
  return { ok: true, id: menuId };
}

// ทริกเกอร์ส่งสรุปรวมตอนเช้า 07:00 น. เข้า LINE OA (ใช้แค่ 1 Push/วัน = 30/เดือน อยู่ในโควตาฟรี 200 สบายๆ)
function runLineDailyBriefing() {
  OUT_ = [];
  try {
    if (typeof sendMorningBriefing_ === 'function') sendMorningBriefing_(lineOwner_());
    const msg = OUT_.join('\n\n');
    if (msg) sendLinePush_(msg);
  } finally {
    OUT_ = null;
  }
}

function installLineBriefingTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runLineDailyBriefing') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runLineDailyBriefing').timeBased().everyDays(1).atHour(7).create();
  console.log('ตั้งเวลาส่งสรุปเช้า 07:00 น. เข้า LINE OA แล้ว (ใช้ ~30 ข้อความ/เดือน)');
}
