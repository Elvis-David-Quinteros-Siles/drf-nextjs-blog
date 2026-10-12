import SearchPage from '@/components/pages/search/SearchPage';
import Layout from '@/hocs/Layout';

export default function Page() {
  return <SearchPage term="" />;
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
