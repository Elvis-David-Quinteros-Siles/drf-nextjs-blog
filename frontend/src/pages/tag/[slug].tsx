import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import PageHeader from '@/components/pages/blog/PageHeader';
import PostsList from '@/components/pages/blog/PostsList';
import TagList from '@/components/pages/blog/TagList';
import SEO from '@/components/SEO';
import Layout from '@/hocs/Layout';
import { IPostList } from '@/interfaces/blog/IPost';
import { ITag } from '@/interfaces/blog/ITaxonomy';
import { SITE_URL } from '@/utils/site';

const api = (path: string) =>
  fetch(`${process.env.API_URL}/api/blog/${path}`, {
    headers: { Accept: 'application/json', 'API-Key': `${process.env.BACKEND_API_KEY}` },
  });

export const getServerSideProps: GetServerSideProps<{ tag: ITag; posts: IPostList[]; related: ITag[] }> = async (
  context: GetServerSidePropsContext,
) => {
  const slug = String(context.params?.slug || '');
  try {
    const [postsRes, tagsRes] = await Promise.all([
      api(`posts/?tag=${encodeURIComponent(slug)}&page_size=50`),
      api('tags/'),
    ]);
    const posts: IPostList[] = postsRes.status === 200 ? (await postsRes.json()).results : [];
    const tags: ITag[] = tagsRes.status === 200 ? (await tagsRes.json()).results : [];
    const tag = tags.find((t) => t.slug === slug);
    if (!tag || posts.length === 0) return { notFound: true };
    const related = tags.filter((t) => t.slug !== slug).slice(0, 12);
    return { props: { tag, posts, related } };
  } catch (e) {
    return { notFound: true };
  }
};

export default function Page({ tag, posts, related }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <SEO
        title={`#${tag.name}`}
        description={`Artículos sobre ${tag.name}.`}
        href={`${SITE_URL}/tag/${tag.slug}`}
      />
      <PageHeader
        eyebrow="Etiqueta"
        title={`#${tag.name}`}
        description={`${posts.length} ${posts.length === 1 ? 'artículo' : 'artículos'} con esta etiqueta.`}
      >
        <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Otras etiquetas</p>
        <TagList tags={related} showCount />
      </PageHeader>
      <div className="container-page py-12">
        <PostsList posts={posts} loading={false} />
      </div>
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
