interface ComponentProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Cabecera de las páginas de listado (blog, categoría, búsqueda). */
export default function PageHeader({ eyebrow, title, description, children }: ComponentProps) {
  return (
    <header className="border-b border-gray-200 bg-gray-50/60 dark:border-dark-third dark:bg-dark-bg/40">
      <div className="container-page py-10 sm:py-14">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-base text-gray-600 sm:text-lg dark:text-dark-txt-secondary">
            {description}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}

PageHeader.defaultProps = {
  eyebrow: '',
  description: '',
  children: null,
};
