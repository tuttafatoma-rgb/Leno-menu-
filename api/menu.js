const KEY = 'leno_menu';

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

function authed(req) {
  const pass = env().pass;
  const given = String((req.headers && req.headers['x-admin-password']) || '').trim();
  return pass.length > 0 && given === pass;
}

function valid(m) {
  const okPrice = (p) =>
    (typeof p === 'number' && isFinite(p) && p >= 0) ||
    (p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length > 0 &&
      Object.values(p).every((v) => typeof v === 'number' && isFinite(v) && v >= 0));
  return Array.isArray(m) && m.length > 0 && m.length <= 100 &&
    m.every((c) => c && typeof c.name === 'string' && Array.isArray(c.items) && c.items.length <= 500 &&
      c.items.every((i) => i && typeof i.name === 'string' && okPrice(i.price)));
}

module.exports = async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const q = req.query || {};
    const e = env();

    if (req.method === 'GET' && q.debug) {
      return res.status(200).json({
        node: process.version,
        hasDbUrl: !!e.url,
        hasDbToken: !!e.token,
        hasAdminPassword: !!e.pass,
        passwordLength: e.pass.length,
      });
    }
    if (req.method === 'GET') {
      if (q.auth) {
        return authed(req) ? res.status(200).json({ ok: true }) : res.status(401).json({ error: 'wrong password' });
      }
      if (!e.url) return res.status(200).json([]);
      const v = await redis(['GET', KEY]);
      return res.status(200).json(v ? JSON.parse(v) : []);
    }
    if (req.method === 'POST') {
      if (!authed(req)) return res.status(401).json({ error: 'wrong password' });
      if (!e.url) return res.status(500).json({ error: 'database not connected' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!valid(body)) return res.status(400).json({ error: 'invalid menu data' });
      await redis(['SET', KEY, JSON.stringify(body)]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String((err && err.message) || err) });
  }
};
