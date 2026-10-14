import parseCookies from '@/utils/cookies/parseCookies';
import type { NextApiRequest, NextApiResponse } from 'next';
import { OAUTH_PROVIDERS, oauthCookie } from '.';

/**
 * Vuelta desde Google o GitHub: el backend canjea el código y devuelve los tokens
 * (o pide el código de 2FA). La sesión se termina de cargar en /login, porque las
 * cookies SameSite=Strict no viajan en esta redirección que viene de otro sitio.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const provider = String(req.query.provider);
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies.oauth_session;
  const next = decodeURIComponent(cookies.oauth_next || '%2F');
  const nextQuery = next.startsWith('/') && next !== '/' ? `&next=${encodeURIComponent(next)}` : '';

  const clearCookies = [oauthCookie('oauth_session', '', 0), oauthCookie('oauth_next', '', 0)];

  const { code, state } = req.query;
  if (!OAUTH_PROVIDERS.includes(provider) || typeof code !== 'string' || typeof state !== 'string' || !sessionId) {
    res.setHeader('Set-Cookie', clearCookies);
    return res.redirect(302, '/login?social_error=1');
  }

  try {
    const params = new URLSearchParams({ code, state });
    const apiRes = await fetch(`${process.env.API_URL}/auth/o/${provider}/?${params}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'API-Key': `${process.env.BACKEND_API_KEY}`,
        Cookie: `sessionid=${sessionId}`,
      },
    });

    const data = await apiRes.json();

    if (apiRes.status !== 201) {
      res.setHeader('Set-Cookie', clearCookies);
      return res.redirect(302, '/login?social_error=1');
    }

    // Con 2FA activado el backend envió un código al correo en vez de los tokens
    if (data.otp_required) {
      res.setHeader('Set-Cookie', clearCookies);
      return res.redirect(302, `/login?otp_email=${encodeURIComponent(data.email)}${nextQuery}`);
    }

    res.setHeader('Set-Cookie', [
      ...clearCookies,
      `access=${data.access}; HttpOnly; Path=/; SameSite=Strict; Secure=${process.env.NODE_ENV === 'production' ? 'true' : 'false'}; Max-Age=2592000`,
      `refresh=${data.refresh}; HttpOnly; Path=/; SameSite=Strict; Secure=${process.env.NODE_ENV === 'production' ? 'true' : 'false'}; Max-Age=5184000`,
    ]);

    return res.redirect(302, `/login?social=1${nextQuery}`);
  } catch (err) {
    res.setHeader('Set-Cookie', clearCookies);
    return res.redirect(302, '/login?social_error=1');
  }
}
