import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import moment from 'moment';
import { CheckCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Container from '@/components/pages/profile/Container';
import SEO from '@/components/SEO';
import { ToastError, ToastSuccess } from '@/components/toast/alerts';
import Avatar from '@/components/ui/Avatar';
import Layout from '@/hocs/Layout';
import { IReportedComment } from '@/interfaces/blog/IComment';
import verifyAccess from '@/utils/api/auth/VerifyAccess';
import { deleteComment, dismissReports, listReportedComments, moderateComment } from '@/utils/api/blog/comments';
import sanitizeContent from '@/utils/sanitizeContent';

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const { verified } = await verifyAccess(context);
  if (!verified) {
    return { redirect: { destination: '/login?next=/profile/moderation', permanent: false } };
  }
  return { props: {} };
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  offensive: 'Ofensivo',
  off_topic: 'Fuera de tema',
  other: 'Otro',
};

export default function Page() {
  const [items, setItems] = useState<IReportedComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems((await listReportedComments()).results);
    } catch (e) {
      // Sin reportes el backend responde con lista vacía
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (comment: IReportedComment, action: 'hide' | 'dismiss' | 'delete') => {
    try {
      setBusy(comment.id);
      if (action === 'hide') await moderateComment(comment.id, 'hide');
      if (action === 'dismiss') await dismissReports(comment.id);
      if (action === 'delete') await deleteComment(comment.id);
      setItems((prev) => prev.filter((c) => c.id !== comment.id));
      ToastSuccess(
        { hide: 'Comentario ocultado', dismiss: 'Reportes descartados', delete: 'Comentario eliminado' }[action],
      );
    } catch (e) {
      ToastError('No se pudo completar la acción');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <SEO title="Moderación" description="Comentarios reportados." robots="noindex" />
      <Container
        title="Moderación"
        description="Comentarios reportados en tus artículos (o en todo el blog si eres administrador)."
      >
        {loading && (
          <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-dark-second" aria-hidden="true" />
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-dark-third">
            <ShieldCheckIcon className="size-10 text-emerald-500" aria-hidden="true" />
            <p className="mt-3 font-medium text-gray-900 dark:text-white">No hay reportes pendientes</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Cuando un lector reporte un comentario, aparecerá aquí.
            </p>
          </div>
        )}

        <ul className="space-y-4">
          {items.map((item) => {
            const name =
              [item.author?.first_name, item.author?.last_name].filter(Boolean).join(' ') || item.user;
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-dark-third dark:bg-dark-bg"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    {item.reports.length} {item.reports.length === 1 ? 'reporte' : 'reportes'}
                  </span>
                  {!item.is_active && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      Oculto automáticamente
                    </span>
                  )}
                  en
                  <Link
                    href={`/blog/${item.post_slug}#comentario-${item.id}`}
                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {item.post_title}
                  </Link>
                </div>

                <div className="mt-4 flex gap-3">
                  <Avatar name={name} src={item.author?.profile_picture?.url} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">{name}</span>{' '}
                      <span className="text-xs text-gray-500">{moment(item.created_at).fromNow()}</span>
                    </p>
                    <div
                      className="prose prose-sm prose-gray mt-1 max-w-none break-words rounded-lg bg-gray-50 p-3 dark:prose-invert dark:bg-dark-second"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: sanitizeContent(item.content) }}
                    />
                  </div>
                </div>

                <ul className="mt-4 space-y-1 text-sm text-gray-600 dark:text-dark-txt-secondary">
                  {item.reports.map((r) => (
                    <li key={r.id}>
                      <span className="font-medium">{r.user}</span>: {REASON_LABELS[r.reason] || r.reason}
                      {r.details && <span className="text-gray-500"> — «{r.details}»</span>}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => act(item, 'dismiss')}
                    className="btn border border-gray-300 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second"
                  >
                    <CheckCircleIcon className="size-4" aria-hidden="true" />
                    Está bien, descartar
                  </button>
                  {item.is_active && (
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => act(item, 'hide')}
                      className="btn bg-amber-500 text-white hover:bg-amber-400"
                    >
                      Ocultar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => act(item, 'delete')}
                    className="btn bg-rose-600 text-white hover:bg-rose-500"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
