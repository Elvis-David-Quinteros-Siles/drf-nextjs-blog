import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { IPostList } from '@/interfaces/blog/IPost';
import LoadingPostCard from '@/components/loaders/LoadingPostCard';
import PostCard from './PostCard';

interface ComponentProps {
  posts: IPostList[];
  title?: string;
  description?: string;
  loading: boolean;
  emptyMessage?: string;
  /** Si hay más páginas, muestra el botón "Cargar más" */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function PostsList({
  posts,
  loading,
  title,
  description,
  emptyMessage,
  hasMore,
  loadingMore,
  onLoadMore,
}: ComponentProps) {
  return (
    <section>
      {title && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-gray-600 dark:text-dark-txt-secondary">{description}</p>
          )}
        </div>
      )}

      {loading && posts.length === 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <LoadingPostCard key={index} />
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-dark-third">
          <DocumentTextIcon className="size-10 text-gray-400" aria-hidden="true" />
          <p className="mt-3 text-gray-600 dark:text-dark-txt-secondary">{emptyMessage}</p>
        </div>
      )}

      {posts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {hasMore && onLoadMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="btn border border-gray-300 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second"
          >
            {loadingMore ? 'Cargando…' : 'Cargar más artículos'}
          </button>
        </div>
      )}
    </section>
  );
}

PostsList.defaultProps = {
  title: '',
  description: '',
  emptyMessage: 'Todavía no hay artículos aquí.',
  hasMore: false,
  loadingMore: false,
  onLoadMore: undefined,
};
