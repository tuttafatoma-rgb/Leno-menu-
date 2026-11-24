const crypto = require('crypto');

function env() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
    pass: String(process.env.ADMIN_PASSWORD || '').trim(),
  };
}

async function redis(cmd) {
  const e = env();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(e.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + e.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      signal: ctl.signal,
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  try {
    const e = env();
    if (req.method === 'GET') {
      const id = String((req.query && req.query.id) || '');
      if (!/^[a-f0-9]{12}$/.test(id) || !e.url) return res.status(404).end();
      const v = await redis(['GET', 'img:' + id]);
      if (!v) return res.status(404).end();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      return res.status(200).send(Buffer.from(v, 'base64'));
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') {
      const given = String((req.headers && req.headers['x-admin-password']) || '').trim();
      if (!e.pass || given !== e.pass) return res.status(401).json({ error: 'wrong password' });
      if (!e.url) return res.status(500).json({ error: 'database not connected' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const d = body && body.data;
      if (typeof d !== 'string' || d.length > 600000 || !d.startsWith('/9j/')) {
        return res.status(400).json({ error: 'invalid image' });
      }
      const id = crypto.randomBytes(6).toString('hex');
      await redis(['SET', 'img:' + id, d]);
      return res.status(200).json({ id });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
};
