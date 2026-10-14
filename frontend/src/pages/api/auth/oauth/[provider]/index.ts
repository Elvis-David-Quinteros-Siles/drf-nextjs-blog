import type { NextApiRequest, NextApiResponse } from 'next';

// Proveedores habilitados en el backend (nombres de social-auth)
export const OAUTH_PROVIDERS = ['google-oauth2', 'github'];

const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

// Cookies temporales del flujo OAuth: Lax para que lleguen en la vuelta desde el proveedor
export function oauthCookie(name: string, value: string, maxAge: number) {
  return `${name}=${value}; HttpOnly; Path=/api/auth/oauth; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function oauthRedirectUri(provider: string) {
  return `${process.env.DOMAIN}/api/auth/oauth/${provider}/callback`;
}

/**
 * Inicia el login con Google o GitHub: pide al backend la URL de autorización y
 * redirige al proveedor. djoser guarda el state en la sesión de Django, así que
 * la cookie de sesión del backend se conserva aquí hasta el callback.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const provider = String(req.query.provider);
  if (!OAUTH_PROVIDERS.includes(provider)) {
    return res.redirect(302, '/login?social_error=1');
  }

  try {
    const apiRes = await fetch(
      `${process.env.API_URL}/auth/o/${provider}/?redirect_uri=${encodeURIComponent(oauthRedirectUri(provider))}`,
      {
        headers: {
          Accept: 'application/json',
          'API-Key': `${process.env.BACKEND_API_KEY}`,
        },
      },
    );

    const data = await apiRes.json();
    const sessionId = apiRes.headers
      .getSetCookie()
      .map((cookie) => cookie.match(/^sessionid=([^;]+)/)?.[1])
      .find(Boolean);

    if (apiRes.status !== 200 || !data.authorization_url || !sessionId) {
      return res.redirect(302, '/login?social_error=1');
    }

    const next = typeof req.query.next === 'string' && req.query.next.startsWith('/') ? req.query.next : '/';
    res.setHeader('Set-Cookie', [
      oauthCookie('oauth_session', sessionId, 600),
      oauthCookie('oauth_next', encodeURIComponent(next), 600),
    ]);

    return res.redirect(302, data.authorization_url);
  } catch (err) {
    return res.redirect(302, '/login?social_error=1');
  }
}
