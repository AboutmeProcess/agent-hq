/**
 * Cloudflare Worker (ฟรี 100,000 req/วัน): ตัวกลางรับ LINE Messaging API Webhook
 * ประโยชน์ด้านความปลอดภัยและความเร็ว:
 * 1. ตรวจลายเซ็นคริปโต X-Line-Signature (HMAC-SHA256) ด้วย LINE_CHANNEL_SECRET ก่อนส่งต่อ
 * 2. ตอบ 200 OK ให้ LINE ทันที (แก้ปัญหา Apps Script ตอบ 302 Found และกัน Timeout)
 * 3. ส่งต่อไปยัง Google Apps Script พร้อม ?action=line&ls=LINE_WEBHOOK_SECRET
 *
 * Environment Variables ที่ต้องตั้งใน Cloudflare Worker (Settings -> Variables & Secrets):
 * - LINE_CHANNEL_SECRET : Channel secret จาก LINE Developers Console (Basic settings)
 * - GAS_LINE_URL        : https://script.google.com/macros/s/<ID>/exec?action=line&ls=<LINE_WEBHOOK_SECRET>
 */
async function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'GET') return new Response('ok', { status: 200 });
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

    const rawBody = await request.text();
    const sig = request.headers.get('x-line-signature') || '';
    const valid = await verifyLineSignature(rawBody, sig, env.LINE_CHANNEL_SECRET);
    if (!valid) return new Response('invalid signature', { status: 403 });

    ctx.waitUntil(
      fetch(env.GAS_LINE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
        redirect: 'follow'
      })
    );
    return new Response('ok', { status: 200 });
  }
};
