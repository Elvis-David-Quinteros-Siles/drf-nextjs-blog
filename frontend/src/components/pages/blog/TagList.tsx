import Link from 'next/link';
import { HashtagIcon } from '@heroicons/react/20/solid';
import { ITag } from '@/interfaces/blog/ITaxonomy';

export default function TagList({ tags, showCount = false }: { tags: ITag[]; showCount?: boolean }) {
  if (!tags?.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Etiquetas">
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Link
            href={`/tag/${tag.slug}`}
            className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:bg-dark-second dark:text-dark-txt dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
          >
            <HashtagIcon className="size-3.5 opacity-60" aria-hidden="true" />
            {tag.name}
            {showCount && tag.posts_count !== undefined && (
              <span className="ml-1 text-xs tabular-nums opacity-60">{tag.posts_count}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

TagList.defaultProps = {
  showCount: false,
};
