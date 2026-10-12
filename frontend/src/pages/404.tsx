import Link from 'next/link';
import SEO from '@/components/SEO';
import Layout from '@/hocs/Layout';

export default function Page() {
  return (
    <>
      <SEO title="Página no encontrada" description="La página que buscas no existe." robots="noindex" />
      <section className="container-page flex flex-col items-center py-24 text-center sm:py-32">
        <p className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
          Esta página no existe
        </h1>
        <p className="mt-4 max-w-md text-gray-600 dark:text-dark-txt-secondary">
          Puede que el enlace esté roto o que el artículo se haya movido.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn-primary px-5 py-3">
            Ir al inicio
          </Link>
          <Link
            href="/blog"
            className="btn border border-gray-300 px-5 py-3 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second"
          >
            Ver los artículos
          </Link>
        </div>
      </section>
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
