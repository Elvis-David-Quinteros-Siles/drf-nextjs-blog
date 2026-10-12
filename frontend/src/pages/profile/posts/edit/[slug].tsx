import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import PostEditor from '@/components/pages/editor/PostEditor';
import SEO from '@/components/SEO';
import Layout from '@/hocs/Layout';
import usePostCategories from '@/hooks/usePostCategories';
import { IPost } from '@/interfaces/blog/IPost';
import { RootState } from '@/redux/reducers';
import verifyAccess from '@/utils/api/auth/VerifyAccess';

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const slug = String(context.params?.slug || '');
  const { verified, accessToken } = await verifyAccess(context);
  if (!verified) {
    return { redirect: { destination: `/login?next=/profile/posts/edit/${slug}`, permanent: false } };
  }

  let post: IPost | null = null;
  try {
    const apiRes = await fetch(`${process.env.API_URL}/api/blog/post/get/?slug=${encodeURIComponent(slug)}`, {
      // Con la sesión del autor: el backend solo entrega borradores a su dueño
      headers: {
        Accept: 'application/json',
        'API-Key': `${process.env.BACKEND_API_KEY}`,
        Authorization: `JWT ${accessToken}`,
      },
    });
    if (apiRes.status === 200) {
      post = (await apiRes.json()).results;
    }
  } catch (e) {
    post = null;
  }

  if (!post) return { notFound: true };
  return { props: { post } };
};

export default function Page({ post }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const user = useSelector((state: RootState) => state.auth.user);
  const { categories, loading } = usePostCategories();

  // El backend solo deja editar al autor; aquí se avisa antes de intentarlo
  if (user && user.username !== post.user) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-lg font-semibold">No puedes editar este artículo</p>
        <Link href="/profile/posts" className="btn-primary mt-6">
          Ir a mis artículos
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO title={`Editar: ${post.title}`} description="Editar artículo." robots="noindex" />
      {/* key: si cambia el slug tras guardar, el editor se reinicia con los datos nuevos */}
      <PostEditor key={post.slug} post={post} categories={categories} loadingCategories={loading} />
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
