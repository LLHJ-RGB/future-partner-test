import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, session } = body;

  if (!token || !session) {
    return Response.json({ error: 'Missing token or session' }, { status: 400 });
  }

  try {
    const lockedSession = await kv.get(`lock:${token}`);
    if (lockedSession !== session) {
      return Response.json({ error: 'Session mismatch' }, { status: 403 });
    }

    await kv.set(`token:${token}`, 'used');
    await kv.del(`lock:${token}`);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
