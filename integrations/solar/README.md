# เชื่อมต่อ Solar & Smart Home เข้า AboutMeProcess HQ

รองรับทั้ง **Apple HomeKit (iOS Shortcuts)**, **Home Assistant** และ **สคริปต์ทดสอบจาก Mac** โดยส่งผ่าน Webhook เดียวกัน (มีระบบ Throttle 60 วิ + Dirty-check ประหยัดโควตาอัตโนมัติ)

---

## วิธีที่ 1: Home Assistant (แนะนำ — อัตโนมัติ 100% และฟรี)

เพิ่มลงใน `configuration.yaml`:
```yaml
rest_command:
  aboutme_solar_push:
    url: "https://script.google.com/macros/s/YOUR_EXEC_ID/exec?action=webhook&k=YOUR_DASH_KEY&source=solar"
    method: POST
    content_type: "application/json"
    payload: >
      {
        "battery": {{ states('sensor.solar_battery_soc') | float(0) | round(0) }},
        "solarKw": {{ states('sensor.solar_power_kw') | float(0) | round(2) }},
        "loadKw": {{ states('sensor.home_load_kw') | float(0) | round(2) }},
        "savedThb": {{ (states('sensor.solar_daily_kwh') | float(0) * 4.5) | round(0) }}
      }
```

ตั้ง Automation ให้ส่งทุก **10 นาที** (ประหยัดโควตา Apps Script):
```yaml
alias: "Push Solar to AboutMeProcess HQ"
trigger:
  - platform: time_pattern
    minutes: "/10"
action:
  - service: rest_command.aboutme_solar_push
```

---

## วิธีที่ 2: Apple HomeKit / iOS Shortcuts (สำหรับ iPhone / iPad)
1. เปิดแอป **Shortcuts (คำสั่งลัด)** → สร้าง Shortcut ใหม่ชื่อ `อัปเดต Solar HQ`
2. เพิ่ม Action: **Get Contents of URL (รับเนื้อหาของ URL)**
   - URL: `https://script.google.com/macros/s/YOUR_EXEC_ID/exec?action=webhook&k=YOUR_DASH_KEY&source=solar`
   - Method: **POST**
   - Request Body: **JSON** → ใส่คีย์ `battery`, `solarKw`, `loadKw`, `savedThb` (ดึงค่าจากแอปอินเวอร์เตอร์/HomeKit หรือกรอกอัตโนมัติ)
3. ตั้ง **Personal Automation** ให้รันตามช่วงเวลา (เช่น เช้า 09:00, เที่ยง 12:00, เย็น 17:00)

---

## วิธีที่ 3: ทดสอบยิงข้อมูลจาก Mac Terminal ทันที
```bash
EXEC_URL="https://script.google.com/macros/s/YOUR_EXEC_ID/exec" \
DASH_KEY="YOUR_DASH_KEY" \
bash integrations/solar/solar_push.sh 92 3.8 1.3 150
```
