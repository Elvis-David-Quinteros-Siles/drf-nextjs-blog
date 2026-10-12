import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RectangleStackIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/pages/blog/PageHeader';
import TagList from '@/components/pages/blog/TagList';
import { ISeriesBrief, ITag } from '@/interfaces/blog/ITaxonomy';
import { listSeries, listTags } from '@/utils/api/blog/meta';
import PostsList from '@/components/pages/blog/PostsList';
import CategoriesBar from '@/components/pages/categories/CategoriesBar';
import SEO from '@/components/SEO';
import Layout from '@/hocs/Layout';
import usePostCategories from '@/hooks/usePostCategories';
import usePosts from '@/hooks/usePosts';
import { SITE_URL } from '@/utils/site';

export default function Page() {
  const { posts, loading, count, nextUrl, loadMore, loadingMore } = usePosts({});
  const { categories, loading: loadingCategories } = usePostCategories();
  const [tags, setTags] = useState<ITag[]>([]);
  const [series, setSeries] = useState<ISeriesBrief[]>([]);

  useEffect(() => {
    listTags().then((t) => setTags(t.slice(0, 15))).catch(() => setTags([]));
    listSeries().then(setSeries).catch(() => setSeries([]));
  }, []);

  return (
    <>
      <SEO
        title="Blog"
        description="Todos los artículos sobre backend, DevOps y seguridad."
        href={`${SITE_URL}/blog`}
      />
      <PageHeader
        eyebrow="Blog"
        title="Todos los artículos"
        description={
          count > 0
            ? `${count} ${count === 1 ? 'artículo' : 'artículos'} sobre backend, DevOps y seguridad.`
            : 'Artículos sobre backend, DevOps y seguridad.'
        }
      >
        <CategoriesBar categories={categories} loading={loadingCategories} />
      </PageHeader>
      <div className="container-page py-12">
        {(series.length > 0 || tags.length > 0) && (
          <div className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            {series.length > 0 && (
              <section aria-labelledby="series-titulo">
                <h2 id="series-titulo" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Series
                </h2>
                <ul className="space-y-2">
                  {series.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/series/${s.slug}`}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-indigo-300 dark:border-dark-third dark:hover:border-indigo-500/50"
                      >
                        <RectangleStackIcon className="size-5 shrink-0 text-indigo-500" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-gray-900 dark:text-white">{s.title}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{s.posts_count} partes</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {tags.length > 0 && (
              <section aria-labelledby="tags-titulo">
                <h2 id="tags-titulo" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Temas populares
                </h2>
                <TagList tags={tags} showCount />
              </section>
            )}
          </div>
        )}
        <PostsList
          posts={posts}
          loading={loading}
          hasMore={Boolean(nextUrl)}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </div>
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
