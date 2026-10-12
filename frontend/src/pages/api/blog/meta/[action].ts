import type { NextApiRequest, NextApiResponse } from 'next';
import proxyToBackend, { ProxyRoute } from '@/utils/api/proxyToBackend';

/** Etiquetas y series. "GET x" / "POST x" permiten dos métodos para la misma acción. */
const ROUTES: Record<string, ProxyRoute> = {
  tags: { method: 'GET', path: '/api/blog/tags/', auth: false },
  series: { method: 'GET', path: '/api/blog/series/', auth: false },
  'GET my-series': { method: 'GET', path: '/api/blog/series/mine/', auth: true },
  'POST my-series': { method: 'POST', path: '/api/blog/series/mine/', auth: true },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return proxyToBackend(req, res, ROUTES);
}
