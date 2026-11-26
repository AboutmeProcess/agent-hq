#!/usr/bin/env bash
# สคริปต์ส่งค่า Solar & Smart Home เข้า AboutMeProcess HQ (ใช้ทดสอบหรือตั้ง cron บน Mac)
# วิธีใช้:
#   EXEC_URL="https://script.google.com/macros/s/.../exec" DASH_KEY="..." bash integrations/solar/solar_push.sh 94 3.6 1.4 145

set -euo pipefail

if [[ -z "${EXEC_URL:-}" || -z "${DASH_KEY:-}" ]]; then
  echo "กรุณากำหนดตัวแปร EXEC_URL และ DASH_KEY ก่อนรัน"
  echo "ตัวอย่าง: EXEC_URL='https://script.google.com/macros/s/.../exec' DASH_KEY='...' bash $0 94 3.6 1.4 145"
  exit 1
fi

BATTERY="${1:-94}"
SOLAR_KW="${2:-3.6}"
LOAD_KW="${3:-1.4}"
SAVED_THB="${4:-145}"

PAYLOAD=$(printf '{"battery":%s,"solarKw":%s,"loadKw":%s,"savedThb":%s}' "$BATTERY" "$SOLAR_KW" "$LOAD_KW" "$SAVED_THB")

curl -sSL -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${EXEC_URL}?action=webhook&k=${DASH_KEY}&source=solar"
echo ""
