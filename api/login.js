import { validPassword, setLoginCookie, clearCookie, error, verifyOrigin } from './_auth.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    if (!verifyOrigin(req)) return error(res, 403, 'Origen no permitido.');
    if (typeof req.body?.password !== 'string' || !validPassword(req.body.password))
      return error(res, 401, 'Contraseña incorrecta.');
    setLoginCookie(res);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') { clearCookie(res); return res.status(200).json({ ok: true }); }
  return error(res, 405, 'Método no permitido.');
}
