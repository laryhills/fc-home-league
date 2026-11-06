// Vercel serverless function: /api/fd?path=/competitions/PL/teams
// Calls football-data.org from the server, because the API blocks direct browser requests
// from any origin except http://localhost.
//
// Token: the page sends it in the X-Auth-Token header, or set FOOTBALL_DATA_TOKEN in the
// Vercel project settings and nobody needs to paste a token in the browser.

const ALLOWED = /^\/competitions(\/[A-Z0-9]{2,6}\/teams)?$/; // only what the app needs
const PASS = ['x-requestsavailable', 'x-requestcounter-reset', 'x-authenticated-client', 'x-api-version'];

module.exports = async (req, res) => {
  const path = String((req.query && req.query.path) || '');
  if (!ALLOWED.test(path)) {
    res.status(400).json({ error: 'Path not allowed' });
    return;
  }
  const token = String(req.headers['x-auth-token'] || process.env.FOOTBALL_DATA_TOKEN || '').trim();
  try {
    const r = await fetch('https://api.football-data.org/v4' + path, {
      headers: token ? { 'X-Auth-Token': token } : {},
    });
    const body = await r.text();
    PASS.forEach((h) => {
      const v = r.headers.get(h);
      if (v) res.setHeader(h, v);
    });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Team lists change rarely: keep the saved copy for a year. The page adds &r=<time> when you
    // press Refresh, which skips the saved copy and stores a new one.
    res.setHeader(
      'Cache-Control',
      r.ok && path.endsWith('/teams') ? 'public, s-maxage=31536000' : 'no-store'
    );
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: 'Could not reach football-data.org' });
  }
};
