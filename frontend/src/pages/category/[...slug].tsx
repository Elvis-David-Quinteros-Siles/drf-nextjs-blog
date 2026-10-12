import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { useMemo } from 'react';
import PageHeader from '@/components/pages/blog/PageHeader';
import PostsList from '@/components/pages/blog/PostsList';
import CategoriesBar from '@/components/pages/categories/CategoriesBar';
import SEO from '@/components/SEO';
import Layout from '@/hocs/Layout';
import usePostCategories from '@/hooks/usePostCategories';
import usePosts from '@/hooks/usePosts';
import { ICategory } from '@/interfaces/blog/ICategory';
import { SITE_URL } from '@/utils/site';

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { slug } = context.params as { slug: string[] };
  const categorySlug = Array.isArray(slug) ? slug[0] : slug;

  let category: ICategory | null = null;

  try {
    const apiRes = await fetch(`${process.env.API_URL}/api/blog/category/?slug=${categorySlug}`, {
      headers: {
        Accept: 'application/json',
        'API-Key': `${process.env.BACKEND_API_KEY}`,
      },
    });
    const data = await apiRes.json();
    if (apiRes.status === 200) {
      category = data.results;
    }
  } catch (e) {
    category = null;
  }

  if (!category) {
    return { notFound: true };
  }

  return {
    props: {
      slug: categorySlug,
      category,
    },
  };
};

export default function Page({
  slug,
  category,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const categories = useMemo(() => [slug], [slug]);
  const { posts, loading, nextUrl, loadMore, loadingMore } = usePosts({ categories });
  const { categories: allCategories, loading: loadingCategories } = usePostCategories();

  return (
    <>
      <SEO
        title={category?.title || category?.name}
        description={category?.description || `Artículos sobre ${category?.name}.`}
        href={`${SITE_URL}/category/${slug}`}
      />
      <PageHeader
        eyebrow="Categoría"
        title={category?.title || category?.name}
        description={category?.description}
      >
        <CategoriesBar categories={allCategories} loading={loadingCategories} active={slug} />
      </PageHeader>
      <div className="container-page py-12">
        <PostsList
          posts={posts}
          loading={loading}
          emptyMessage="Todavía no hay artículos en esta categoría."
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
