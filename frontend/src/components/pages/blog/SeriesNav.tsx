import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon, RectangleStackIcon } from '@heroicons/react/24/outline';
import { ISeries } from '@/interfaces/blog/ITaxonomy';

interface ComponentProps {
  series: ISeries;
  currentSlug: string;
  /** "box": índice de la serie; "pager": anterior / siguiente al final del artículo */
  variant: 'box' | 'pager';
}

export default function SeriesNav({ series, currentSlug, variant }: ComponentProps) {
  const index = series.posts.findIndex((p) => p.slug === currentSlug);
  const prev = index > 0 ? series.posts[index - 1] : null;
  const next = index >= 0 && index < series.posts.length - 1 ? series.posts[index + 1] : null;

  if (variant === 'pager') {
    if (!prev && !next) return null;
    return (
      <nav aria-label={`Serie ${series.title}`} className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/blog/${prev.slug}`}
            className="group rounded-xl border border-gray-200 p-4 transition-colors hover:border-indigo-300 dark:border-dark-third dark:hover:border-indigo-500/50"
          >
            <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" /> Parte anterior
            </span>
            <span className="mt-1 block font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next && (
          <Link
            href={`/blog/${next.slug}`}
            className="group rounded-xl border border-gray-200 p-4 text-right transition-colors hover:border-indigo-300 dark:border-dark-third dark:hover:border-indigo-500/50"
          >
            <span className="flex items-center justify-end gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              Siguiente parte <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </span>
            <span className="mt-1 block font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
              {next.title}
            </span>
          </Link>
        )}
      </nav>
    );
  }

  return (
    <aside
      aria-label={`Serie ${series.title}`}
      className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
        <RectangleStackIcon className="size-4" aria-hidden="true" />
        Serie · parte {index + 1} de {series.posts.length}
      </p>
      <Link
        href={`/series/${series.slug}`}
        className="mt-1 block font-semibold text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
      >
        {series.title}
      </Link>
      <ol className="mt-3 space-y-1.5 text-sm">
        {series.posts.map((p, i) => (
          <li key={p.slug} className="flex gap-2">
            <span
              className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                p.slug === currentSlug
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-500 ring-1 ring-gray-200 dark:bg-dark-bg dark:ring-dark-third'
              }`}
            >
              {i + 1}
            </span>
            {p.slug === currentSlug ? (
              <span className="font-medium text-gray-900 dark:text-white">{p.title}</span>
            ) : (
              <Link href={`/blog/${p.slug}`} className="text-gray-600 hover:text-indigo-600 dark:text-dark-txt-secondary dark:hover:text-indigo-300">
                {p.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
