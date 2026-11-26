/**
 * backup.gs – สำรองสถานะการทำงานของระบบ (วางเป็นไฟล์เสริมใน Apps Script ร่วมกับไฟล์อื่น)
 * รัน backupState() แล้วจะได้แท็บใหม่ "Backup_วันที่_เวลา" ในชีต: ค่าตั้งค่าและข้อมูลสถานะที่ระบบเก็บเอง
 * (เงินสด ยอดค้างพิเศษ สถานที่โปรด บันทึกเหตุการณ์) และรายชื่อแท็บ
 * รหัสลับ (ชื่อมีคำว่า KEY / TOKEN / SECRET / PASSWORD) จะไม่ถูกบันทึก ต้องคัดลอกเก็บเอง
 */
const BACKUP_SECRET = /KEY|TOKEN|SECRET|PASSWORD/i;

function safeCell_(v) {   // กันค่าที่ขึ้นต้นด้วย = + - @ ถูกตีเป็นสูตร
  v = String(v == null ? '' : v).slice(0, 4000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function stateRows_() {
  const P = PropertiesService.getScriptProperties().getProperties(), rows = [['ชนิด', 'ชื่อ', 'ค่า']];
  Object.keys(P).sort().forEach(function (k) {
    rows.push(['property', k, BACKUP_SECRET.test(k) ? '(รหัสลับ: ไม่ถูกบันทึก คัดลอกเก็บเอง)' : safeCell_(P[k])]);
  });
  SpreadsheetApp.getActive().getSheets().forEach(function (s) {
    rows.push(['sheet', s.getName(), s.getLastRow() + ' แถว x ' + s.getLastColumn() + ' คอลัมน์']);
  });
  return rows;
}

function backupState() {
  const ss = SpreadsheetApp.getActive();
  const name = 'Backup_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd_HHmm');
  const rows = stateRows_(), sh = ss.insertSheet(name);
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.autoResizeColumns(1, 3);
  console.log('สร้างแท็บ ' + name + ' แล้ว (' + (rows.length - 1) + ' รายการ) อย่าลืมดาวน์โหลดไฟล์ชีตเป็น .xlsx ด้วย (File > Download)');
}

function backupStateJson() {   // พิมพ์เป็น JSON ใน Execution log ไว้คัดลอกไปวางที่อื่น
  const out = {};
  stateRows_().slice(1).forEach(function (r) { out[r[0] + ':' + r[1]] = r[2]; });
  console.log(JSON.stringify(out, null, 2));
}
