import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import EmailInput from '@/components/cta/EmailInput';
import PostCard from '@/components/pages/blog/PostCard';
import PostsList from '@/components/pages/blog/PostsList';
import CategoriesBar from '@/components/pages/categories/CategoriesBar';
import JsonLd from '@/components/JsonLd';
import SEO from '@/components/SEO';
import LoadingPostCard from '@/components/loaders/LoadingPostCard';
import Layout from '@/hocs/Layout';
import usePostCategories from '@/hooks/usePostCategories';
import usePosts from '@/hooks/usePosts';
import { AUTHOR_NAME, PORTFOLIO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/utils/site';

const TOPICS = ['Django REST', 'Next.js', 'Docker', 'Nginx', 'PostgreSQL', 'Celery', 'MinIO'];

export default function Home() {
  const { categories, loading: loadingCategories } = usePostCategories();
  const { posts: featured, loading: loadingFeatured } = usePosts({ showFeatured: true });
  const { posts, loading } = usePosts({});

  const [mainFeatured] = featured;
  const latest = posts.filter((post) => post.id !== mainFeatured?.id).slice(0, 6);

  return (
    <>
      <SEO title={SITE_NAME} description={SITE_DESCRIPTION} href={`${SITE_URL}/`} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          inLanguage: 'es',
          description: SITE_DESCRIPTION,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/search/{search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-200 dark:border-dark-third">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_80%_0%,rgba(99,102,241,0.14),transparent),radial-gradient(40%_50%_at_0%_100%,rgba(139,92,246,0.10),transparent)]"
        />
        <div className="container-page relative py-16 sm:py-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs font-medium text-gray-600 dark:border-dark-third dark:bg-dark-bg/70 dark:text-dark-txt-secondary">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Por {AUTHOR_NAME}
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
            Ingeniería backend y DevOps,{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              explicada desde proyectos reales
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-dark-txt-secondary">
            Cómo diseño, despliego y opero aplicaciones en mi propio servidor: APIs con Django,
            frontends con Next.js, contenedores, bases de datos y seguridad.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/blog" className="btn-primary px-5 py-3">
              Leer los artículos
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
            <a
              href={PORTFOLIO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn border border-gray-300 bg-white px-5 py-3 text-gray-800 hover:bg-gray-50 dark:border-dark-third dark:bg-dark-bg dark:text-dark-txt dark:hover:bg-dark-second"
            >
              Ver mi portafolio
            </a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Temas">
            {TOPICS.map((topic) => (
              <li
                key={topic}
                className="rounded-md bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-600 dark:bg-dark-second dark:text-dark-txt-secondary"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-page space-y-16 py-12 sm:space-y-20 sm:py-16">
        {/* Destacado */}
        {(loadingFeatured || mainFeatured) && (
          <section aria-labelledby="destacado">
            <h2
              id="destacado"
              className="mb-6 text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400"
            >
              Destacado
            </h2>
            {mainFeatured ? <PostCard post={mainFeatured} featured /> : <LoadingPostCard />}
          </section>
        )}

        {/* Últimos */}
        <div>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                Últimos artículos
              </h2>
              <p className="mt-2 text-gray-600 dark:text-dark-txt-secondary">
                Explora por categoría o revisa lo más reciente.
              </p>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Ver todos <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mb-8">
            <CategoriesBar categories={categories} loading={loadingCategories} />
          </div>
          <PostsList posts={latest} loading={loading} />
        </div>

        <EmailInput />
      </div>
    </>
  );
}

Home.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
