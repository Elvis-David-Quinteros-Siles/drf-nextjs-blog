import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import SearchPage from '@/components/pages/search/SearchPage';
import Layout from '@/hocs/Layout';

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { slug } = context.params as { slug: string[] };
  const term = (Array.isArray(slug) ? slug.join(' ') : slug) || '';
  return { props: { term } };
};

export default function Page({ term }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <SearchPage key={term} term={term} />;
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
