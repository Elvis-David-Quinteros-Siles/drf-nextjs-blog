import Link from 'next/link';
import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import PageHeader from '@/components/pages/blog/PageHeader';
import PostCard from '@/components/pages/blog/PostCard';
import JsonLd from '@/components/JsonLd';
import SEO from '@/components/SEO';
import Avatar from '@/components/ui/Avatar';
import Layout from '@/hocs/Layout';
import { IPostList } from '@/interfaces/blog/IPost';
import { ISeries } from '@/interfaces/blog/ITaxonomy';
import { SITE_URL } from '@/utils/site';

const api = (path: string) =>
  fetch(`${process.env.API_URL}/api/blog/${path}`, {
    headers: { Accept: 'application/json', 'API-Key': `${process.env.BACKEND_API_KEY}` },
  });

export const getServerSideProps: GetServerSideProps<{ series: ISeries; posts: IPostList[] }> = async (
  context: GetServerSidePropsContext,
) => {
  const slug = String(context.params?.slug || '');
  try {
    const [seriesRes, postsRes] = await Promise.all([
      api(`series/?slug=${encodeURIComponent(slug)}`),
      api(`posts/?series=${encodeURIComponent(slug)}&page_size=50`),
    ]);
    if (seriesRes.status !== 200) return { notFound: true };
    const series: ISeries = (await seriesRes.json()).results;
    const posts: IPostList[] = postsRes.status === 200 ? (await postsRes.json()).results : [];
    return { props: { series, posts } };
  } catch (e) {
    return { notFound: true };
  }
};

export default function Page({ series, posts }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const authorName =
    [series.author?.first_name, series.author?.last_name].filter(Boolean).join(' ') || series.author?.username;
  return (
    <>
      <SEO
        title={series.title}
        description={series.description || `Serie de ${posts.length} artículos de ${authorName}.`}
        href={`${SITE_URL}/series/${series.slug}`}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWorkSeries',
          name: series.title,
          description: series.description,
          url: `${SITE_URL}/series/${series.slug}`,
          author: { '@type': 'Person', name: authorName },
          hasPart: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE_URL}/blog/${p.slug}` })),
        }}
      />
      <PageHeader
        eyebrow={`Serie · ${posts.length} partes`}
        title={series.title}
        description={series.description}
      >
        {series.author && (
          <Link href={`/@/${series.author.username}`} className="inline-flex items-center gap-2 text-sm font-medium">
            <Avatar name={authorName} src={series.author.profile_picture?.url} className="size-7" />
            {authorName}
          </Link>
        )}
      </PageHeader>
      <div className="container-page py-12">
        <ol className="space-y-6">
          {posts.map((post, i) => (
            <li key={post.id} className="flex gap-4">
              <span className="mt-4 hidden size-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white sm:inline-flex">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 sm:hidden dark:text-indigo-400">
                  Parte {i + 1}
                </p>
                <PostCard post={post} featured />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
