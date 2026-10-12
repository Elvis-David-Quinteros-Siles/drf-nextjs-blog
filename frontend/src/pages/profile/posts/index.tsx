import { useMemo, useState } from 'react';
import Link from 'next/link';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useSelector } from 'react-redux';
import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import DeletePostModal from '@/components/pages/blog/DeletePostModal';
import Container from '@/components/pages/profile/Container';
import SEO from '@/components/SEO';
import Layout from '@/hocs/Layout';
import usePostsAuthor from '@/hooks/usePostsAuthor';
import { IPostList } from '@/interfaces/blog/IPost';
import { RootState } from '@/redux/reducers';
import verifyAccess from '@/utils/api/auth/VerifyAccess';
import { formatDate } from '@/utils/format';

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const { verified } = await verifyAccess(context);
  if (!verified) {
    return { redirect: { destination: '/login?next=/profile/posts', permanent: false } };
  }
  return { props: {} };
};

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft', label: 'Borradores' },
];

export default function Page() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { posts, loading, loadMore, nextUrl, loadingMore, handleDelete, loadingDelete } =
    usePostsAuthor({ isOwner: true });
  const [filter, setFilter] = useState<string>('all');
  const [toDelete, setToDelete] = useState<IPostList | null>(null);

  const visible = useMemo(
    () => (filter === 'all' ? posts : posts.filter((post) => post.status === filter)),
    [posts, filter],
  );
  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((p) => p.status === 'published').length,
      draft: posts.filter((p) => p.status === 'draft').length,
    }),
    [posts],
  );

  const newButton = (
    <Link href="/profile/posts/new" className="btn-primary">
      <PlusIcon className="size-4" aria-hidden="true" />
      Nuevo artículo
    </Link>
  );

  if (user?.role === 'customer') {
    return (
      <Container title="Mis artículos">
        <p className="text-gray-600 dark:text-dark-txt-secondary">
          Tu cuenta no tiene permiso para publicar artículos.
        </p>
      </Container>
    );
  }

  return (
    <>
      <SEO title="Mis artículos" description="Gestiona tus artículos." robots="noindex" />
      <Container title="Mis artículos" description="Crea, edita y publica tus artículos." actions={newButton}>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`chip ${filter === f.value ? 'chip-active' : ''}`}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-70">{counts[f.value as keyof typeof counts]}</span>
            </button>
          ))}
        </div>

        {loading && posts.length === 0 && (
          <ul className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-dark-second" />
            ))}
          </ul>
        )}

        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-dark-third">
            <DocumentTextIcon className="size-10 text-gray-400" aria-hidden="true" />
            <p className="mt-3 font-medium text-gray-900 dark:text-white">
              {filter === 'draft' ? 'No tienes borradores' : 'Aún no hay artículos aquí'}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Empieza a escribir el primero.</p>
            <div className="mt-6">{newButton}</div>
          </div>
        )}

        {visible.length > 0 && (
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-dark-third dark:border-dark-third dark:bg-dark-bg">
            {visible.map((post) => (
              <li key={post.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <Link href={`/profile/posts/edit/${post.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
                  {post.thumbnail?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnail.url}
                      alt=""
                      className="aspect-[1200/630] w-24 shrink-0 rounded-lg object-cover sm:w-32"
                    />
                  ) : (
                    <span className="aspect-[1200/630] w-24 shrink-0 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 sm:w-32 dark:from-indigo-500/20 dark:to-violet-500/20" />
                  )}
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          post.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                        }`}
                      >
                        {post.status === 'published' ? 'Publicado' : 'Borrador'}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {post.category?.name} · {formatDate(post.updated_at)}
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 block font-semibold text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300">
                      {post.title}
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  {post.status === 'published' && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ver «${post.title}»`}
                      title="Ver"
                      className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-dark-second dark:hover:text-white"
                    >
                      <ArrowTopRightOnSquareIcon className="size-5" />
                    </a>
                  )}
                  <Link
                    href={`/profile/posts/edit/${post.slug}`}
                    aria-label={`Editar «${post.title}»`}
                    title="Editar"
                    className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-dark-second dark:hover:text-white"
                  >
                    <PencilSquareIcon className="size-5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setToDelete(post)}
                    aria-label={`Eliminar «${post.title}»`}
                    title="Eliminar"
                    className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {nextUrl && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="btn border border-gray-300 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second"
            >
              {loadingMore ? 'Cargando…' : 'Cargar más'}
            </button>
          </div>
        )}
      </Container>

      <DeletePostModal
        open={Boolean(toDelete)}
        setOpen={(open) => !open && setToDelete(null)}
        post={toDelete}
        handleDelete={handleDelete}
        loadingDelete={loadingDelete}
      />
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
