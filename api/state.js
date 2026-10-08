import { authorized, error, verifyOrigin } from './_auth.js';
const REST = () => `${(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/rest/v1`;
const KEY = () => process.env.SUPABASE_SECRET_KEY || '';
async function sb(path, init = {}) {
  const key = KEY();
  const headers = { apikey: key, 'Content-Type': 'application/json', ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }), ...(init.headers || {}) };
  const response = await fetch(REST() + path, { ...init, headers, signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (!response.ok) throw Error(`Supabase ${response.status}: ${(await response.text()).slice(0,200)}`);
  return response.json();
}
function validState(s) {
  if (!s || !Array.isArray(s.guests) || !Array.isArray(s.tables) || s.guests.length > 5000 || s.tables.length > 500 || !Number.isInteger(s.nextGuest) || !Number.isInteger(s.nextTable)) return false;
  const gids = new Set(), tids = new Set();
  for (const t of s.tables) {
    if (!t || typeof t.id !== 'string' || !/^t\d+$/.test(t.id) || tids.has(t.id) || !Number.isInteger(t.number) || !Number.isInteger(t.capacity) || t.capacity < 1 || t.capacity > 100) return false;
    tids.add(t.id);
  }
  for (const g of s.guests) {
    if (!g || typeof g.id !== 'string' || !/^g\d+$/.test(g.id) || gids.has(g.id) || typeof g.name !== 'string' || g.name.length > 500 || (g.tableId != null && typeof g.tableId !== 'string') || (g.tableId && !tids.has(g.tableId)) || (g.original != null && (typeof g.original !== 'object' || Array.isArray(g.original))) || (g.group != null && typeof g.group !== 'string')) return false;
    gids.add(g.id);
  }
  return true;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req)) return error(res, 401, 'Debes ingresar la contraseña.');
  if (!process.env.SUPABASE_URL || !KEY()) return error(res, 503, 'Falta configurar Supabase en Vercel.');
  try {
    if (req.method === 'GET') {
      const rows = await sb('/mesas_estado?id=eq.1&select=version,data');
      if (!rows.length) return error(res, 503, 'No existe la fila inicial. Ejecuta schema.sql en Supabase.');
      return res.status(200).json({ version: rows[0].version, state: rows[0].data });
    }
    if (req.method === 'POST') {
      if (!verifyOrigin(req)) return error(res, 403, 'Origen no permitido.');
      const { version, state } = req.body || {};
      if (!Number.isInteger(version) || version < 0 || !validState(state)) return error(res, 400, 'Datos inválidos.');
      if (Buffer.byteLength(JSON.stringify(state)) > 1500000) return error(res, 413, 'El archivo supera el límite de 1,5 MB.');
      const rows = await sb('/rpc/actualizar_mesas_si_version', { method: 'POST', body: JSON.stringify({ expected_version: version, new_data: state }) });
      // PostgREST returns a JSON number for scalar SQL RPC results.
      if (typeof rows !== 'number' || rows < 0) return error(res, 409, 'Otra persona guardó cambios primero. Actualiza para verlos.');
      return res.status(200).json({ version: rows });
    }
    return error(res, 405, 'Método no permitido.');
  } catch (e) { console.error('API state', e); return error(res, 502, 'No se pudo comunicar con la base de datos. Revisa la configuración.'); }
}
