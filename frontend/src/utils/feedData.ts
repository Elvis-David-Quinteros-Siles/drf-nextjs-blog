import { IPostList } from '@/interfaces/blog/IPost';
import { ISeriesBrief, ITag } from '@/interfaces/blog/ITaxonomy';

/** Datos públicos para sitemap.xml y rss.xml, leídos del backend en el servidor. */
async function api<T>(path: string): Promise<T | null> {
  const res = await fetch(`${process.env.API_URL}/api/blog/${path}`, {
    headers: { Accept: 'application/json', 'API-Key': `${process.env.BACKEND_API_KEY}` },
  });
  if (res.status !== 200) return null;
  return res.json();
}

export async function allPublishedPosts(): Promise<IPostList[]> {
  const posts: IPostList[] = [];
  for (let page = 1; page <= 20; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const data = await api<{ results: IPostList[]; next: string | null }>(
      `posts/?sorting=newest&page_size=100&p=${page}`,
    );
    if (!data) break;
    posts.push(...data.results);
    if (!data.next) break;
  }
  return posts;
}

export async function allCategories(): Promise<{ slug: string }[]> {
  return (await api<{ results: { slug: string }[] }>('categories/list/'))?.results || [];
}

export async function allTags(): Promise<ITag[]> {
  return (await api<{ results: ITag[] }>('tags/'))?.results || [];
}

export async function allSeries(): Promise<ISeriesBrief[]> {
  return (await api<{ results: ISeriesBrief[] }>('series/'))?.results || [];
}

export const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
