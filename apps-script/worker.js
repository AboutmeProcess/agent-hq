// Cloudflare Worker: ตัวกลางรับ webhook จาก Telegram แล้วตอบ 200 ทันที จากนั้นส่งต่อให้ Apps Script
// (แก้ปัญหา Apps Script ตอบ 302 ทำให้ Telegram ส่งซ้ำและช้า)
// ตัวแปรที่ต้องตั้งใน Cloudflare (Settings > Variables):
//   SECRET  รหัสสุ่มยาวๆ  (ต้องตรงกับ Script property WEBHOOK_SECRET ที่ใช้ตอนรัน setupWebhookWorker)
//   GAS_URL ลิงก์ /exec ของ Apps Script  (ถ้าตั้ง Script property GAS_SECRET ให้ใส่ ?s=รหัสเดียวกันต่อท้าย)
export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') return new Response('ok');
    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.SECRET) return new Response('forbidden', { status: 403 });
    const body = await request.text();
    ctx.waitUntil(fetch(env.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, redirect: 'follow' }));
    return new Response('ok', { status: 200 });
  }
};
