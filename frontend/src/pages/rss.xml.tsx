import { GetServerSideProps } from 'next';
import { allPublishedPosts, escapeXml } from '@/utils/feedData';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/utils/site';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const posts = (await allPublishedPosts()).slice(0, 30);

  const items = posts
    .map((p) => {
      const author = [p.user?.first_name, p.user?.last_name].filter(Boolean).join(' ') || p.user?.username;
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <description>${escapeXml(p.description)}</description>
      <dc:creator>${escapeXml(author || '')}</dc:creator>
      <category>${escapeXml(p.category?.name || '')}</category>
${(p.tags || []).map((t) => `      <category>${escapeXml(t.name)}</category>`).join('\n')}
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>es</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${posts[0] ? `    <lastBuildDate>${new Date(posts[0].updated_at).toUTCString()}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
  res.write(xml);
  res.end();
  return { props: {} };
};

export default function Rss() {
  return null;
}
