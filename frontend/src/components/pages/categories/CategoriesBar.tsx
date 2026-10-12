import Link from 'next/link';
import { ICategoryList } from '@/interfaces/blog/ICategory';

interface ComponentProps {
  categories: ICategoryList[];
  loading: boolean;
  /** slug de la categoría actual; vacío = "Todos" */
  active?: string;
}

/** Chips de categorías. En móvil se desplazan en horizontal en lugar de envolver. */
export default function CategoriesBar({ categories, loading, active }: ComponentProps) {
  return (
    <nav aria-label="Categorías" className="-mx-4 sm:mx-0">
      <ul className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
        <li>
          <Link href="/blog" className={`chip ${!active ? 'chip-active' : ''}`}>
            Todos
          </Link>
        </li>
        {loading && categories.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={i} className="h-9 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-dark-second" />
            ))
          : categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  aria-current={active === category.slug ? 'page' : undefined}
                  className={`chip ${active === category.slug ? 'chip-active' : ''}`}
                >
                  {category.name}
                </Link>
              </li>
            ))}
      </ul>
    </nav>
  );
}

CategoriesBar.defaultProps = {
  active: '',
};
