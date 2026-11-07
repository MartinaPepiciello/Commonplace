// Commonplace — Cloudflare Worker API.
// Static files in /public are served automatically; this handles /api/*.
//   GET  /api/data   -> all quotes + categories (public, read-only)
//   POST /api/auth   -> checks the passcode (Authorization: Bearer <passcode>)
//   POST /api/sync   -> applies a batch of offline changes (passcode required), returns fresh data

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function authorized(request, env) {
  const expected = env.PASSCODE || '';
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function getData(env) {
  const [quotes, categories] = await env.DB.batch([
    env.DB.prepare(
      'SELECT id, text, character, book, author, category, created_at, updated_at FROM quotes WHERE deleted = 0 ORDER BY created_at'
    ),
    env.DB.prepare('SELECT name, color1, color2, sort, updated_at FROM categories WHERE deleted = 0 ORDER BY sort, name'),
  ]);
  return { quotes: quotes.results, categories: categories.results, serverTime: Date.now() };
}

const str = (v, max = 5000) => String(v ?? '').trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : Date.now());

function opToStatement(env, op) {
  const now = Date.now();
  switch (op.type) {
    case 'upsertQuote': {
      const q = op.quote || {};
      if (!q.id || !str(q.text)) return null;
      const updated = num(q.updated_at);
      return env.DB.prepare(
        `INSERT INTO quotes (id, text, character, book, author, category, created_at, updated_at, deleted)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0)
         ON CONFLICT(id) DO UPDATE SET text = excluded.text, character = excluded.character, book = excluded.book,
           author = excluded.author, category = excluded.category, updated_at = excluded.updated_at, deleted = 0
         WHERE excluded.updated_at >= quotes.updated_at`
      ).bind(str(q.id, 100), str(q.text), str(q.character, 300), str(q.book, 300), str(q.author, 300),
        str(q.category, 100) || 'Misc', num(q.created_at ?? now), updated);
    }
    case 'deleteQuote':
      if (!op.id) return null;
      return env.DB.prepare('UPDATE quotes SET deleted = 1, updated_at = ?2 WHERE id = ?1 AND updated_at <= ?2').bind(
        str(op.id, 100), num(op.at)
      );
    case 'upsertCategory': {
      const c = op.category || {};
      if (!str(c.name)) return null;
      return env.DB.prepare(
        `INSERT INTO categories (name, color1, color2, sort, updated_at, deleted) VALUES (?1, ?2, ?3, ?4, ?5, 0)
         ON CONFLICT(name) DO UPDATE SET color1 = excluded.color1, color2 = excluded.color2, sort = excluded.sort,
           updated_at = excluded.updated_at, deleted = 0
         WHERE excluded.updated_at >= categories.updated_at`
      ).bind(str(c.name, 100), str(c.color1, 20) || '#eeeef3', str(c.color2, 20) || '#cfcfdc', num(c.sort ?? 99), num(c.updated_at));
    }
    case 'deleteCategory':
      if (!op.name) return null;
      return env.DB.prepare('UPDATE categories SET deleted = 1, updated_at = ?2 WHERE name = ?1 AND updated_at <= ?2').bind(
        str(op.name, 100), num(op.at)
      );
    default:
      return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      if (url.pathname === '/api/data' && request.method === 'GET') return json(await getData(env));

      if (url.pathname === '/api/auth' && request.method === 'POST') {
        return authorized(request, env) ? json({ ok: true }) : json({ ok: false, error: 'Wrong passcode' }, 401);
      }

      if (url.pathname === '/api/sync' && request.method === 'POST') {
        if (!authorized(request, env)) return json({ ok: false, error: 'Wrong passcode' }, 401);
        const body = await request.json().catch(() => ({}));
        const ops = Array.isArray(body.ops) ? body.ops.slice(0, 5000) : [];
        const statements = ops.map((op) => opToStatement(env, op)).filter(Boolean);
        // D1 batches run as a single transaction; chunk to stay well within limits.
        for (let i = 0; i < statements.length; i += 100) await env.DB.batch(statements.slice(i, i + 100));
        return json({ ok: true, applied: statements.length, ...(await getData(env)) });
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: String(err?.message || err) }, 500);
    }
  },
};
