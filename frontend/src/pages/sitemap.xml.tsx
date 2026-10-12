import { GetServerSideProps } from 'next';
import { allCategories, allPublishedPosts, allSeries, allTags, escapeXml } from '@/utils/feedData';
import { SITE_URL } from '@/utils/site';

const url = (loc: string, lastmod?: string, priority = '0.5') =>
  `<url><loc>${escapeXml(SITE_URL + loc)}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}<priority>${priority}</priority></url>`;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const [posts, categories, tags, series] = await Promise.all([
    allPublishedPosts(),
    allCategories(),
    allTags(),
    allSeries(),
  ]);
  const authors = Array.from(new Set(posts.map((p) => p.user?.username).filter(Boolean)));
  const latest = posts[0]?.updated_at;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  url('/', latest, '1.0'),
  url('/blog', latest, '0.9'),
  url('/contact', undefined, '0.3'),
  ...posts.map((p) => url(`/blog/${p.slug}`, p.updated_at, '0.8')),
  ...categories.map((c) => url(`/category/${c.slug}`, undefined, '0.6')),
  ...series.map((s) => url(`/series/${s.slug}`, undefined, '0.6')),
  ...tags.map((t) => url(`/tag/${t.slug}`, undefined, '0.4')),
  ...authors.map((a) => url(`/@/${a}`, undefined, '0.4')),
].join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
