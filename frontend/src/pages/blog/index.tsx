import PageHeader from '@/components/pages/blog/PageHeader';
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
