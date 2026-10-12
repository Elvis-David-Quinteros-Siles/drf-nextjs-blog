import { ISeries, ISeriesBrief, ITag } from '@/interfaces/blog/ITaxonomy';

async function request(action: string, init: RequestInit = {}, query = '') {
  const res = await fetch(`/api/blog/meta/${action}${query}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init.body && { 'Content-Type': 'application/json' }) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.detail || 'Error en la petición');
  return data.results;
}

export const listTags = (): Promise<ITag[]> => request('tags');
export const listSeries = (): Promise<ISeriesBrief[]> => request('series');
export const getSeries = (slug: string): Promise<ISeries> => request('series', {}, `?slug=${encodeURIComponent(slug)}`);
export const listMySeries = (): Promise<ISeriesBrief[]> => request('my-series');
export const createSeries = (title: string, description = ''): Promise<ISeriesBrief> =>
  request('my-series', { method: 'POST', body: JSON.stringify({ title, description }) });
