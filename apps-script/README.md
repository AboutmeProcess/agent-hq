# คู่มือติดตั้ง Google Apps Script (Backend ของ AboutMeProcess)

ไฟล์ [Code.gs](Code.gs) เป็นหลังบ้านชุดใหม่ที่ออกแบบให้สื่อสารกับหน้าแดชบอร์ดครบทั้ง 8 เอเจนต์ (**Driver, Finance, Flights, Telegram, App Script, Captain, Take Profit, Solar, Healthy**)

## ขั้นตอนการติดตั้ง (ทำครั้งเดียว ~5 นาที)

1. **สร้าง Google Sheet ใหม่** ชื่อ `AboutMeProcess DB`
2. ไปที่เมนู **Extensions → Apps Script**
3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดจาก [Code.gs](Code.gs) ลงไป จากนั้นกด **Save**
4. **สร้างชีตอัตโนมัติ:** เลือกฟังก์ชัน `setupSheets` ที่แถบด้านบน แล้วกด **Run** (กดอนุญาตสิทธิ์ Google Sheets ครั้งแรก)
   - ระบบจะสร้างชีตให้ครบ 7 แท็บ: `Daily_Jobs`, `Bills`, `Cash_Log`, `Captain_Cases`, `Health_Log`, `Modules_State`, `System_Log`
5. **ตั้งค่า Script Properties** (เมนู **Project Settings ⚙️ → Script Properties → Add script property**):
   | Property | ตัวอย่างค่า | จำเป็น? |
   |---|---|---|
   | `DASH_KEY` | รหัสลับของคุณเอง (ยาวอย่างน้อย 16 ตัวอักษร) | จำเป็น |
   | `DASH_ALLOW_CMD` | `true` | จำเป็น (เพื่อให้สั่งงานจากหน้าเว็บได้) |
   | `DASH_URL` | `https://aboutmeprocess.github.io/agent-hq/` | แนะนำ |
   | `TG_BOT_TOKEN` | Token จาก `@BotFather` | ถ้าใช้ Telegram |
   | `TG_CHAT_ID` | ตัวเลข Chat ID ของคุณ | แนะนำ (กันคนอื่นสั่งบอท) |
   | `AERODATABOX_KEY` | RapidAPI Key สำหรับเที่ยวบิน | ไม่บังคับ |
6. **Deploy เป็น Web App:**
   - กด **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - กด **Deploy** แล้วคัดลอกลิงก์ที่ลงท้ายด้วย `/exec`
7. **เชื่อมกับหน้าแดชบอร์ด:**
   - เปิดหน้าแดชบอร์ด กดปุ่ม **เชื่อมข้อมูลจริง ⚙️** มุมขวาบน
   - วางลิงก์ `/exec` และ `DASH_KEY` แล้วกด **บันทึกและเชื่อม**

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
