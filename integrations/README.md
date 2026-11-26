# ศูนย์รวมตัวเชื่อมต่อระบบภายนอก (External Integrations)

โฟลเดอร์นี้รวมตัวเชื่อมต่อสำหรับดึงข้อมูลจากระบบภายนอกเข้าสู่ศูนย์กลาง **AboutMeProcess HQ** (ผ่าน Google Apps Script Webhook ที่ประหยัดโควตารายวันและไม่มีค่าใช้จ่ายเพิ่ม)

| เอเจนต์ | ระบบภายนอก | ไฟล์เชื่อมต่อ | สถานะ |
|---|---|---|---|
| **Take Profit** | MetaTrader 5 (XAUUSD EA) | [mt5/AboutMeProcess_Reporter.mq5](mt5/AboutMeProcess_Reporter.mq5) | พร้อม Compile & ใช้งาน |
| **Solar** | Home Assistant / Apple HomeKit / iOS Shortcuts | [solar/README.md](solar/README.md) · [solar/solar_push.sh](solar/solar_push.sh) | พร้อมใช้งาน |
| **Driver (Flights)** | AeroDataBox (RapidAPI) | ตั้ง `AERODATABOX_KEY` ใน Script Properties ของ Apps Script | เชื่อมแล้วใน `driver_hq_bot.gs` |
| **Telegram Hub** | Telegram Bot + Cloudflare Worker | [../apps-script/worker.js](../apps-script/worker.js) | เชื่อมแล้ว |
| **Captain & Healthy** | Google Sheets (ในระบบ HQ เอง) | [../apps-script/modules.gs](../apps-script/modules.gs) | พร้อม Deploy |

## หมายเหตุเรื่อง LINE OpenChat Manager
- ปัจจุบัน **LINE OpenChat ไม่มี Public Bot API ฟรี** สำหรับบัญชีบุคคลทั่วไป (มีเฉพาะ LINE Official Account / Messaging API สำหรับแชทปกติ)
- แนวทางที่ประหยัดและยั่งยืนที่สุดคือใช้ **Google Sheets + Telegram** ใน HQ วางแผนโพสต์/ประกาศคอมมูนิตี้ แล้วก๊อปปี้ไปลงใน OpenChat หรือหากอนาคตเปิด LINE Official Account ค่อยเพิ่ม Webhook รับ-ส่งผ่าน Cloudflare Worker ตัวเดิมได้ฟรี
