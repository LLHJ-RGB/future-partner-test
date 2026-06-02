import { getStore } from '@netlify/blobs';

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
    const store = getStore('tokens');
    const lockedSession = await store.get(`lock:${token}`);
    if (lockedSession !== session) {
      return Response.json({ error: 'Session mismatch' }, { status: 403 });
    }

    await store.set(`token:${token}`, 'used');
    await store.delete(`lock:${token}`);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export const config = { path: '/api/complete' };
