import { useEffect, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { IHeading } from '@/interfaces/blog/IHeading';

function useActiveHeading(headings: IHeading[]) {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.slug))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return undefined;

    // El encabezado activo es el último que ya pasó por la parte superior de la pantalla
    const onScroll = () => {
      let current = elements[0].id;
      elements.forEach((el) => {
        if (el.getBoundingClientRect().top < 120) current = el.id;
      });
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  return active;
}

function HeadingLinks({ headings, active }: { headings: IHeading[]; active: string }) {
  return (
    <ol className="space-y-1 border-l border-gray-200 dark:border-dark-third">
      {headings.map((heading) => (
        <li key={heading.id}>
          <a
            href={`#${heading.slug}`}
            className={`-ml-px block border-l-2 py-1.5 text-sm transition-colors ${
              Number(heading.level) > 2 ? 'pl-7' : 'pl-4'
            } ${
              active === heading.slug
                ? 'border-indigo-600 font-medium text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-dark-txt-secondary dark:hover:text-white'
            }`}
          >
            {heading.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

interface ComponentProps {
  headings: IHeading[];
  /** "mobile": desplegable plegado; "desktop": lista fija en la columna lateral */
  variant: 'mobile' | 'desktop';
}

export default function TableOfContents({ headings, variant }: ComponentProps) {
  const active = useActiveHeading(headings);
  const sorted = [...headings].sort((a, b) => a.order - b.order);

  if (variant === 'mobile') {
    return (
      <details className="group rounded-xl border border-gray-200 dark:border-dark-third">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          En este artículo
          <ChevronDownIcon className="size-5 text-gray-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4">
          <HeadingLinks headings={sorted} active={active} />
        </div>
      </details>
    );
  }

  return (
    <nav aria-label="Índice del artículo">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        En este artículo
      </p>
      <HeadingLinks headings={sorted} active={active} />
    </nav>
  );
}
