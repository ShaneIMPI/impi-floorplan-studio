import { getUser, send } from './_lib.js';

// Signed-in-only relay for NGI aerial tiles (25 cm national imagery, mirrored by OpenStreetMap South Africa).
// The browser fetches tiles through here when it stitches a venue image, so the canvas is never blocked
// by cross-origin rules, and the community tile server sees a small, cached, identified client.
const UPSTREAM = 'https://aerial.openstreetmap.org.za/layer/ngi-aerial';

export default async function handler(req, res) {
  try {
    const me = await getUser(req);
    if (!me) return send(res, 401, { error: 'Sign in required' });
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

    const q = req.query || {};
    const z = Number(q.z), x = Number(q.x), y = Number(q.y);
    const n = 2 ** z;
    if (![z, x, y].every(Number.isInteger) || z < 0 || z > 21 || x < 0 || y < 0 || x >= n || y >= n) {
      return send(res, 400, { error: 'Bad tile' });
    }

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);
    let up;
    try {
      up = await fetch(`${UPSTREAM}/${z}/${x}/${y}.jpg`, {
        signal: ctl.signal,
        headers: { 'User-Agent': 'IMPI-FloorPlan-Studio/1.0 (event site plans; staff tool)', Accept: 'image/jpeg,image/*' },
      });
    } finally { clearTimeout(timer); }

    if (!up.ok) return send(res, up.status === 404 ? 404 : 502, { error: 'Tile unavailable' });
    const buf = Buffer.from(await up.arrayBuffer());
    res.setHeader('Content-Type', up.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=604800');
    return res.status(200).send(buf);
  } catch (e) {
    console.error(e);
    return send(res, 502, { error: 'Tile relay failed' });
  }
}
