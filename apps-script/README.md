# คู่มืออัปเกรด Google Apps Script (v12 — AboutMeProcess)

โฟลเดอร์นี้เก็บโค้ดหลังบ้านรุ่นอัปเกรด **v12** ที่ต่อยอดจากบอทจริง (`driver_hq_bot.gs` v11) โดย**ไม่มีข้อมูลส่วนตัวหรือรหัสลับฝังอยู่**

## ไฟล์ในโฟลเดอร์นี้
- [driver_hq_bot.gs](driver_hq_bot.gs) — บอทหลัก v12:
  - แก้บั๊กอ่านชีตเที่ยวบินสำรอง ให้รองรับทั้ง `Airport_Flights` และแท็บแยก `BKK_Flights` / `DMK_Flights` ที่มีอยู่ในชีตจริง
  - เชื่อมต่ออัตโนมัติกับ [modules.gs](modules.gs) สำหรับ 4 เอเจนต์ใหม่ (`captain`, `profit`, `solar`, `health`) และ Webhook `?action=webhook`
  - **หมายเหตุ:** บรรทัด `WEBAPP_URL` ตั้งเป็น `'PASTE_EXEC_URL'` เพื่อความปลอดภัย ให้วางลิงก์ `/exec` จริงของคุณเองใน Apps Script
- [modules.gs](modules.gs) — โมดูลเสริมสำหรับ **Captain (ประกันภัย), Take Profit (MT5), Solar (Smart Home), Healthy (ออกกำลังกาย)** วางคู่กับ `driver_hq_bot.gs` และ `budget.gs` เดิมได้เลยโดยไม่กระทบข้อมูลการเงินเดิม
- [backup.gs](backup.gs) — ตัวช่วยสำรองสถานะ (`backupState()`)
- [worker.js](worker.js) — Cloudflare Worker ตัวกลาง Telegram Webhook (ห้ามรัน `setupWebhookDirect`)

## ขั้นตอนอัปเกรดบน Apps Script เดิมของคุณ (~3 นาที)
1. เปิดโปรเจกต์ Apps Script เดิมในชีต **"Driver HQ Management System"**
2. **เก็บไฟล์ `budget.gs` เดิมไว้เหมือนเดิม** (ไม่ต้องแก้)
3. อัปเดตไฟล์หลักด้วยโค้ดจาก [driver_hq_bot.gs](driver_hq_bot.gs) แล้วแก้ `WEBAPP_URL` เป็นลิงก์ `/exec` จริงของคุณ
4. สร้างไฟล์ใหม่ใน Apps Script ชื่อ **`modules.gs`** แล้ววางโค้ดจาก [modules.gs](modules.gs)
5. กดรันฟังก์ชัน **`setupModuleSheets`** 1 ครั้ง เพื่อสร้างแท็บ `Captain_Cases`, `Health_Log`, `Modules_State`
6. กด **Deploy → Manage deployments → Edit (ไอคอนดินสอ) → New version → Deploy**
   - ตรวจใน Project Settings → Script Properties ว่าตั้ง `DASH_KEY` และ `DASH_ALLOW_CMD = true` แล้ว

## การส่งข้อมูลเข้าจาก MT5 EA หรือ Solar/HomeKit (Webhook)
ส่ง HTTP `POST` ไปที่:
```text
<EXEC_URL>?action=webhook&k=<DASH_KEY>&source=profit
```
ตัวอย่าง JSON สำหรับ **Take Profit (MT5)**:
```json
{ "pair": "XAUUSD", "eaOn": true, "dayPl": 42.8, "floating": -6.4, "gridLevel": 2, "ddPct": 1.8 }
```
ตัวอย่าง JSON สำหรับ **Solar (HomeKit / Inverter)** (`source=solar`):
```json
{ "battery": 94, "solarKw": 3.6, "loadKw": 1.4, "savedThb": 145 }
```
