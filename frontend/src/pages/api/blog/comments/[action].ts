import type { NextApiRequest, NextApiResponse } from 'next';
import proxyToBackend, { ProxyRoute } from '@/utils/api/proxyToBackend';

/** Acción del frontend → método y ruta del backend. */
const ROUTES: Record<string, ProxyRoute> = {
  list: { method: 'GET', path: '/api/blog/post/comments/', auth: false },
  replies: { method: 'GET', path: '/api/blog/post/comment/replies/', auth: false },
  create: { method: 'POST', path: '/api/blog/post/comment/', auth: true },
  reply: { method: 'POST', path: '/api/blog/post/comment/reply/', auth: true },
  update: { method: 'PUT', path: '/api/blog/post/comment/', auth: true },
  delete: { method: 'DELETE', path: '/api/blog/post/comment/', auth: true },
  moderate: { method: 'POST', path: '/api/blog/post/comment/moderate/', auth: true },
  report: { method: 'POST', path: '/api/blog/post/comment/report/', auth: true },
  reports: { method: 'GET', path: '/api/blog/post/comment/reports/', auth: true },
  dismiss: { method: 'POST', path: '/api/blog/post/comment/reports/dismiss/', auth: true },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return proxyToBackend(req, res, ROUTES);
}
