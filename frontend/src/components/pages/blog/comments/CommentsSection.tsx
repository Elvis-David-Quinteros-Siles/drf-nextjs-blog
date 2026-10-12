import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { ToastError } from '@/components/toast/alerts';
import Avatar from '@/components/ui/Avatar';
import { IComment } from '@/interfaces/blog/IComment';
import { RootState } from '@/redux/reducers';
import { createComment, listComments, textToHtml } from '@/utils/api/blog/comments';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface ComponentProps {
  postSlug: string;
  postAuthor: string;
}

export default function CommentsSection({ postSlug, postAuthor }: ComponentProps) {
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const me = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.auth.profile);

  const [comments, setComments] = useState<IComment[]>([]);
  // Total de la conversación (comentarios + respuestas), para el título
  const [total, setTotal] = useState<number>(0);
  const [next, setNext] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(
    async (p: number) => {
      try {
        setLoading(true);
        const data = await listComments(postSlug, p);
        setComments((prev) => (p === 1 ? data.results : [...prev, ...data.results]));
        setTotal(data.extra_data?.total ?? data.count);
        setNext(data.next);
        setPage(p);
      } catch (e) {
        // Un post sin comentarios puede responder 404/400: se muestra vacío
        if (p === 1) setComments([]);
      } finally {
        setLoading(false);
      }
    },
    [postSlug],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const handleCreate = async (text: string) => {
    try {
      const created = await createComment(postSlug, textToHtml(text));
      setComments((prev) => [created, ...prev]);
      setTotal((n) => n + 1);
      return true;
    } catch (e: any) {
      if (e?.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`${router.asPath.split('#')[0]}#comentarios`)}`);
      } else {
        ToastError(e?.message || 'No se pudo publicar el comentario');
      }
      return false;
    }
  };

  const myName = [me?.first_name, me?.last_name].filter(Boolean).join(' ') || me?.username;

  return (
    <section id="comentarios" aria-labelledby="comentarios-titulo" className="scroll-mt-24">
      <h2 id="comentarios-titulo" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
        <ChatBubbleLeftRightIcon className="size-6 text-gray-400" aria-hidden="true" />
        Comentarios {total > 0 && <span className="text-gray-400">({total})</span>}
      </h2>

      <div className="mt-6">
        {isAuthenticated ? (
          <div className="flex gap-3">
            <Avatar name={myName} src={profile?.profile_picture?.url} className="hidden size-10 sm:inline-flex" />
            <div className="min-w-0 flex-1">
              <CommentForm onSubmit={handleCreate} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-gray-300 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-dark-third">
            <p className="text-sm text-gray-600 dark:text-dark-txt-secondary">
              Inicia sesión para comentar y responder a otros lectores.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`${router.asPath.split('#')[0]}#comentarios`)}`}
              className="btn-primary shrink-0"
            >
              Ingresar
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-8">
        {loading && comments.length === 0 &&
          [0, 1].map((i) => (
            <div key={i} className="flex gap-3" aria-hidden="true">
              <div className="size-10 animate-pulse rounded-full bg-gray-100 dark:bg-dark-second" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-100 dark:bg-dark-second" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-dark-second" />
              </div>
            </div>
          ))}

        {!loading && comments.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aún no hay comentarios. ¡Sé el primero!</p>
        )}

        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postAuthor={postAuthor}
            onCountChange={(delta) => setTotal((n) => Math.max(0, n + delta))}
            onDeleted={(id) => {
              setComments((prev) => prev.filter((c) => c.id !== id));
              // Recarga para recalcular el total (se borran también sus respuestas)
              load(1);
            }}
          />
        ))}

        {next && (
          <button
            type="button"
            onClick={() => load(page + 1)}
            disabled={loading}
            className="btn border border-gray-300 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second"
          >
            {loading ? 'Cargando…' : 'Ver más comentarios'}
          </button>
        )}
      </div>
    </section>
  );
}
