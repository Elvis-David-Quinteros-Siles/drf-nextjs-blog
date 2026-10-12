import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import PostEditor from '@/components/pages/editor/PostEditor';
import SEO from '@/components/SEO';
import Layout from '@/hocs/Layout';
import usePostCategories from '@/hooks/usePostCategories';
import verifyAccess from '@/utils/api/auth/VerifyAccess';

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const { verified } = await verifyAccess(context);
  if (!verified) {
    return { redirect: { destination: '/login?next=/profile/posts/new', permanent: false } };
  }
  return { props: {} };
};

export default function Page() {
  const { categories, loading } = usePostCategories();
  return (
    <>
      <SEO title="Nuevo artículo" description="Escribe un nuevo artículo." robots="noindex" />
      <PostEditor categories={categories} loadingCategories={loading} />
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
