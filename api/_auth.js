import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'mesas_session';
const TTL = 60 * 60 * 24 * 14;
const secret = () => process.env.SESSION_SECRET || '';
const digest = value => createHmac('sha256', secret()).update(value).digest('hex');
const equal = (a, b) => {
  const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};
export function validPassword(value) {
  const stored = process.env.SHARED_PASSWORD || '';
  return !!stored && equal(digest(value), digest(stored));
}
export function authorized(req) {
  if (!secret()) return false;
  const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  const [expiry, sig] = raw?.slice(COOKIE.length + 1).split('.') || [];
  return /^\d+$/.test(expiry || '') && Number(expiry) > Date.now() && /^[a-f0-9]{64}$/.test(sig || '') && equal(digest(expiry), sig);
}
export function setLoginCookie(res) {
  const expiry = String(Date.now() + TTL * 1000);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${expiry}.${digest(expiry)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TTL}${secure}`);
}
export function clearCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure`);
}
export function error(res, status, message) { return res.status(status).json({ error: message }); }
export function verifyOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // e.g. same-origin non-browser clients; still require secret cookie
  try { return new URL(origin).host === (req.headers['x-forwarded-host'] || req.headers.host); }
  catch { return false; }
}
