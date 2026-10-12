import { useState } from 'react';
import { useRouter } from 'next/router';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/pages/blog/PageHeader';
import PostsList from '@/components/pages/blog/PostsList';
import SEO from '@/components/SEO';
import usePostCategories from '@/hooks/usePostCategories';
import usePosts from '@/hooks/usePosts';

function Results({ term, categories }: { term: string; categories: string[] }) {
  const { posts, loading, count, nextUrl, loadMore, loadingMore } = usePosts({
    searchBy: term,
    categories,
  });
  return (
    <>
      {!loading && (
        <p className="mb-6 text-sm text-gray-600 dark:text-dark-txt-secondary" aria-live="polite">
          {count} {count === 1 ? 'resultado' : 'resultados'}
        </p>
      )}
      <PostsList
        posts={posts}
        loading={loading}
        emptyMessage="No encontramos artículos con esos términos. Prueba con otras palabras."
        hasMore={Boolean(nextUrl)}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
    </>
  );
}

export default function SearchPage({ term }: { term: string }) {
  const router = useRouter();
  const [query, setQuery] = useState<string>(term);
  const [selected, setSelected] = useState<string[]>([]);
  const { categories } = usePostCategories();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = query.trim();
    router.push(value ? `/search/${encodeURIComponent(value)}` : '/search');
  };

  const toggle = (slug: string) =>
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  return (
    <>
      <SEO title={term ? `Buscar: ${term}` : 'Buscar'} description="Busca artículos del blog." robots="noindex" />
      <PageHeader eyebrow="Buscar" title={term ? `Resultados para “${term}”` : 'Buscar artículos'}>
        <form onSubmit={handleSubmit} role="search" className="flex max-w-xl gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Django, Docker, seguridad…"
              aria-label="Términos de búsqueda"
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            Buscar
          </button>
        </form>
        {categories.length > 0 && (
          <div className="-mx-4 mt-4 sm:mx-0">
            <ul className="scrollbar-none flex gap-2 overflow-x-auto px-4 sm:flex-wrap sm:px-0">
              {categories.map((category) => (
                <li key={category.slug}>
                  <button
                    type="button"
                    aria-pressed={selected.includes(category.slug)}
                    onClick={() => toggle(category.slug)}
                    className={`chip ${selected.includes(category.slug) ? 'chip-active' : ''}`}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PageHeader>
      <div className="container-page py-12">
        {/* key: al cambiar los filtros o el término se reinicia la búsqueda */}
        <Results key={`${term}|${selected.join(',')}`} term={term} categories={selected} />
      </div>
    </>
  );
}
