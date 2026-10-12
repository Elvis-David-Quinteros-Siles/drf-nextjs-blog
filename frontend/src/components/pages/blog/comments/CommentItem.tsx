import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { ChatBubbleLeftIcon, ChevronDownIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ToastError } from '@/components/toast/alerts';
import Avatar from '@/components/ui/Avatar';
import { IComment } from '@/interfaces/blog/IComment';
import { RootState } from '@/redux/reducers';
import {
  deleteComment,
  htmlToText,
  listReplies,
  replyToComment,
  textToHtml,
  updateComment,
} from '@/utils/api/blog/comments';
import sanitizeContent from '@/utils/sanitizeContent';
import CommentForm from './CommentForm';

/** A partir de esta profundidad las respuestas ya no se sangran más (columnas estrechas en móvil). */
const MAX_INDENT_DEPTH = 3;

interface ComponentProps {
  comment: IComment;
  postAuthor: string;
  depth?: number;
  onDeleted: (id: string) => void;
  /** Avisa a la sección de que la conversación ganó o perdió comentarios */
  onCountChange?: (delta: number) => void;
}

export default function CommentItem({
  comment: initial,
  postAuthor,
  depth = 0,
  onDeleted,
  onCountChange = () => {},
}: ComponentProps) {
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const me = useSelector((state: RootState) => state.auth.user);

  const [comment, setComment] = useState<IComment>(initial);
  const [replies, setReplies] = useState<IComment[]>([]);
  const [repliesCount, setRepliesCount] = useState<number>(initial.replies_count);
  const [repliesNext, setRepliesNext] = useState<string | null>(null);
  const [repliesPage, setRepliesPage] = useState<number>(1);
  const [showReplies, setShowReplies] = useState<boolean>(false);
  const [loadingReplies, setLoadingReplies] = useState<boolean>(false);
  const [replying, setReplying] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const { author } = comment;
  const name =
    [author?.first_name, author?.last_name].filter(Boolean).join(' ') || author?.username || comment.user;
  const username = author?.username || comment.user;
  const isMine = me?.username === username;
  const edited = moment(comment.updated_at).diff(moment(comment.created_at), 'seconds') > 60;

  const requireLogin = () => {
    router.push(`/login?next=${encodeURIComponent(`${router.asPath.split('#')[0]}#comentarios`)}`);
  };

  const loadReplies = async (page = 1) => {
    try {
      setLoadingReplies(true);
      const data = await listReplies(comment.id, page);
      setReplies((prev) => (page === 1 ? data.results : [...prev, ...data.results]));
      setRepliesCount(data.count);
      setRepliesNext(data.next);
      setRepliesPage(page);
    } catch (e) {
      ToastError('No se pudieron cargar las respuestas');
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    if (!showReplies && replies.length === 0) loadReplies(1);
    setShowReplies(!showReplies);
  };

  const handleReply = async (text: string) => {
    try {
      const created = await replyToComment(comment.id, textToHtml(text));
      setReplies((prev) => [...prev, created]);
      setRepliesCount((n) => n + 1);
      onCountChange(1);
      setShowReplies(true);
      setReplying(false);
      return true;
    } catch (e: any) {
      if (e?.status === 401) requireLogin();
      else ToastError(e?.message || 'No se pudo publicar la respuesta');
      return false;
    }
  };

  const handleEdit = async (text: string) => {
    try {
      const updated = await updateComment(comment.id, textToHtml(text));
      setComment(updated);
      setEditing(false);
      return true;
    } catch (e) {
      ToastError('No se pudo editar el comentario');
      return false;
    }
  };

  const handleDelete = async () => {
    try {
      await deleteComment(comment.id);
      onDeleted(comment.id);
    } catch (e) {
      ToastError('No se pudo eliminar el comentario');
      setConfirmDelete(false);
    }
  };

  const actionClass =
    'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-second dark:hover:text-white';

  return (
    <article id={`comentario-${comment.id}`} className="scroll-mt-24">
      <div className="flex gap-3">
        <Link href={`/@/${username}`} className="shrink-0">
          <Avatar name={name} src={author?.profile_picture?.url} className={depth > 0 ? 'size-8' : 'size-10'} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            <Link href={`/@/${username}`} className="font-semibold text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300">
              {name}
            </Link>
            {username === postAuthor && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                Autor
              </span>
            )}
            <time
              dateTime={comment.created_at}
              title={moment(comment.created_at).format('LLL')}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {moment(comment.created_at).fromNow()}
              {edited && ' · editado'}
            </time>
          </div>

          {editing ? (
            <div className="mt-2">
              <CommentForm
                initialValue={htmlToText(comment.content)}
                onSubmit={handleEdit}
                onCancel={() => setEditing(false)}
                submitLabel="Guardar"
                autoFocus
                compact
              />
            </div>
          ) : (
            <div
              className="prose prose-sm prose-gray mt-1 max-w-none break-words dark:prose-invert prose-p:my-1.5"
              // El contenido viene saneado del backend y se vuelve a sanear aquí
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: sanitizeContent(comment.content) }}
            />
          )}

          {!editing && (
            <div className="-ml-2 mt-1 flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => (isAuthenticated ? setReplying(!replying) : requireLogin())}
                className={actionClass}
              >
                <ChatBubbleLeftIcon className="size-4" aria-hidden="true" />
                Responder
              </button>
              {repliesCount > 0 && (
                <button type="button" onClick={toggleReplies} aria-expanded={showReplies} className={actionClass}>
                  <ChevronDownIcon
                    className={`size-4 transition-transform ${showReplies ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                  {showReplies
                    ? 'Ocultar respuestas'
                    : `Ver ${repliesCount} ${repliesCount === 1 ? 'respuesta' : 'respuestas'}`}
                </button>
              )}
              {isMine && !confirmDelete && (
                <>
                  <button type="button" onClick={() => setEditing(true)} className={actionClass}>
                    <PencilIcon className="size-4" aria-hidden="true" />
                    Editar
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(true)} className={actionClass}>
                    <TrashIcon className="size-4" aria-hidden="true" />
                    Eliminar
                  </button>
                </>
              )}
              {confirmDelete && (
                <span className="flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                  {repliesCount > 0 ? '¿Eliminar el comentario y sus respuestas?' : '¿Eliminar el comentario?'}
                  <button type="button" onClick={handleDelete} className="font-semibold underline">
                    Eliminar
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="font-semibold">
                    Cancelar
                  </button>
                </span>
              )}
            </div>
          )}

          {replying && (
            <div className="mt-3">
              <CommentForm
                onSubmit={handleReply}
                onCancel={() => setReplying(false)}
                placeholder={`Responder a ${name}`}
                submitLabel="Responder"
                autoFocus
                compact
              />
            </div>
          )}
        </div>
      </div>

      {showReplies && (replies.length > 0 || loadingReplies) && (
        <div
          className={`mt-4 space-y-5 ${
            depth < MAX_INDENT_DEPTH
              ? 'ml-5 border-l-2 border-gray-100 pl-4 sm:ml-5 sm:pl-6 dark:border-dark-third'
              : ''
          }`}
        >
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postAuthor={postAuthor}
              depth={depth + 1}
              onCountChange={onCountChange}
              onDeleted={(id) => {
                setReplies((prev) => prev.filter((r) => r.id !== id));
                setRepliesCount((n) => Math.max(0, n - 1));
                onCountChange(-1);
              }}
            />
          ))}
          {loadingReplies && <p className="text-xs text-gray-500">Cargando respuestas…</p>}
          {repliesNext && !loadingReplies && (
            <button type="button" onClick={() => loadReplies(repliesPage + 1)} className={actionClass}>
              Ver más respuestas
            </button>
          )}
        </div>
      )}
    </article>
  );
}

CommentItem.defaultProps = {
  depth: 0,
  onCountChange: () => {},
};
