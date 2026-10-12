import type { NextApiRequest, NextApiResponse } from 'next';
import buildQueryString from '@/utils/buildQuerystring';
import parseCookies from '@/utils/cookies/parseCookies';

export interface ProxyRoute {
  method: string;
  path: string;
  /** Exige sesión (cookie access) antes de llamar al backend */
  auth: boolean;
}

/**
 * Reenvía la petición al backend con la API key y, si hay sesión, el JWT.
 * El parámetro dinámico de la ruta ([action]) no se reenvía.
 */
export default async function proxyToBackend(
  req: NextApiRequest,
  res: NextApiResponse,
  routes: Record<string, ProxyRoute>,
) {
  const action = String(req.query.action);
  const route = routes[`${req.method} ${action}`] || routes[action];

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
