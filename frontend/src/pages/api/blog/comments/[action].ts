import type { NextApiRequest, NextApiResponse } from 'next';
import buildQueryString from '@/utils/buildQuerystring';
import parseCookies from '@/utils/cookies/parseCookies';

/** Acción del frontend → método y ruta del backend. */
const ROUTES: Record<string, { method: string; path: string; auth: boolean }> = {
  list: { method: 'GET', path: '/api/blog/post/comments/', auth: false },
  replies: { method: 'GET', path: '/api/blog/post/comment/replies/', auth: false },
  create: { method: 'POST', path: '/api/blog/post/comment/', auth: true },
  reply: { method: 'POST', path: '/api/blog/post/comment/reply/', auth: true },
  update: { method: 'PUT', path: '/api/blog/post/comment/', auth: true },
  delete: { method: 'DELETE', path: '/api/blog/post/comment/', auth: true },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const action = String(req.query.action);
  const route = ROUTES[action];

  if (!route) {
    return res.status(404).json({ error: 'Acción no encontrada' });
  }
  if (req.method !== route.method) {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const accessToken = parseCookies(req.headers.cookie || '').access;
  if (route.auth && !accessToken) {
    return res.status(401).json({ error: 'Inicia sesión para continuar' });
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'API-Key': `${process.env.BACKEND_API_KEY}`,
  };
  if (accessToken) headers.Authorization = `JWT ${accessToken}`;

  // El parámetro de la ruta ([action]) no se reenvía al backend
  const query = Object.fromEntries(Object.entries(req.query).filter(([key]) => key !== 'action'));
  const hasBody = ['POST', 'PUT'].includes(route.method);
  if (hasBody) headers['Content-Type'] = 'application/json';

  try {
    const qs = buildQueryString(query as Record<string, any>);
    const apiRes = await fetch(`${process.env.API_URL}${route.path}${qs ? `?${qs}` : ''}`, {
      method: route.method,
      headers,
      ...(hasBody && { body: JSON.stringify(req.body) }),
    });
    const data = await apiRes.json();
    return res.status(apiRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
