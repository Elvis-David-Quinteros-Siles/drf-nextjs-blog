import Link from 'next/link';
import { IPostList } from '@/interfaces/blog/IPost';
import Avatar from '@/components/ui/Avatar';
import { formatDate } from '@/utils/format';

interface ComponentProps {
  post: IPostList;
  /** Tarjeta grande: imagen a un lado y texto al otro desde md */
  featured?: boolean;
}

export default function PostCard({ post, featured = false }: ComponentProps) {
  const authorName =
    [post?.user?.first_name, post?.user?.last_name].filter(Boolean).join(' ') || post?.user?.username;

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-dark-third dark:bg-dark-bg dark:hover:border-indigo-500/40 ${
        featured ? 'md:flex-row' : ''
      }`}
    >
      <div
        className={`relative aspect-[1200/630] overflow-hidden bg-gray-100 dark:bg-dark-second ${
          featured ? 'md:aspect-auto md:w-3/5' : ''
        }`}
      >
        {post?.thumbnail?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail.url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-indigo-500 to-violet-600" />
        )}
      </div>

      <div className={`flex flex-1 flex-col p-5 sm:p-6 ${featured ? 'md:w-2/5 md:justify-center lg:p-8' : ''}`}>
        <div className="flex items-center gap-3 text-xs">
          <Link
            href={`/category/${post?.category?.slug}`}
            className="relative z-10 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          >
            {post?.category?.name}
          </Link>
          <time dateTime={post?.created_at} className="text-gray-500 dark:text-gray-400">
            {formatDate(post?.created_at)}
          </time>
        </div>

        <h3
          className={`mt-3 font-semibold tracking-tight text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300 ${
            featured ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-lg leading-snug'
          }`}
        >
          <Link href={`/blog/${post?.slug}`}>
            <span className="absolute inset-0" aria-hidden="true" />
            {post?.title}
          </Link>
        </h3>
        <p
          className={`mt-2 text-sm leading-6 text-gray-600 dark:text-dark-txt-secondary ${
            featured ? 'sm:text-base sm:leading-7' : 'line-clamp-3'
          }`}
        >
          {post?.description}
        </p>

        <div className="mt-auto flex items-center gap-2.5 pt-5 text-sm">
          <Avatar name={authorName} src={post?.user?.profile_picture?.url} className="size-7" />
          <span className="font-medium text-gray-700 dark:text-dark-txt">{authorName}</span>
        </div>
      </div>
    </article>
  );
}

PostCard.defaultProps = {
  featured: false,
};
