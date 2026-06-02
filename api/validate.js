import { kv } from '@vercel/kv';

// Pre-generated tokens — valid on first use
const ALLOWLIST = new Set([
  "yczjgnpt","un3utr4y","gr4y5pzr","apedzaxf","2m6kwmvu","ycn5j4hv","ftm3k3bk","mjj3gj4t",
  "zw3gvsb6","6h92a5ff","ft8fy669","jv8mc3mp","h5ewaaax","rq6b4kjs","ccwymw54","z479ty4c",
  "7useztfe","sjzh94f8","krj9fwbv","ak7gcbe3","v3dh3d2u","7rgc7v56","x9xbq47j","s6epw8br",
  "d7wfz7fg","zzcyq9yp","ratdndn3","65z68n78","p28a8xfz","3rmz2h5t","g27wq8ca","u5k5gjhn",
  "3ejyaxq4","44k73wbw","9gygqjtr","y8qcmktt","h87v8fsu","kc3wweh7","4x6ava7s","w49cgmrs",
  "j3y4zqy4","ye7ms75t","ytjyqt8g","bp8efpm8","wkm5rpgp","9bkqcuaz","8rnyc3c2","4r2krtwj",
  "49zfuabj","m5yngsdr"
]);

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token || token.length < 4) {
    return Response.json({ valid: false, reason: 'missing_token' }, { status: 400 });
  }

  // Only serve tokens in the allowlist
  if (!ALLOWLIST.has(token)) {
    return Response.json({ valid: false, reason: 'invalid_token' }, { status: 403 });
  }

  try {
    const status = await kv.get(`token:${token}`);

    // First time: auto-register as unused
    if (!status) {
      await kv.set(`token:${token}`, 'unused');
    }

    const currentStatus = status || 'unused';

    if (currentStatus === 'used') {
      return Response.json({ valid: false, reason: 'already_used' }, { status: 403 });
    }

    if (currentStatus === 'unused') {
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await kv.set(`token:${token}`, 'locked');
      await kv.set(`lock:${token}`, sessionId);
      await kv.expire(`lock:${token}`, 3600);
      return Response.json({ valid: true, session: sessionId });
    }

    if (currentStatus === 'locked') {
      const lockedSession = await kv.get(`lock:${token}`);
      const reqSession = url.searchParams.get('session');
      if (reqSession && reqSession === lockedSession) {
        return Response.json({ valid: true, session: lockedSession });
      }
      return Response.json({ valid: false, reason: 'in_use' }, { status: 403 });
    }

    return Response.json({ valid: false, reason: 'unknown' }, { status: 500 });
  } catch (e) {
    return Response.json({ valid: false, reason: 'error', detail: e.message }, { status: 500 });
  }
}
