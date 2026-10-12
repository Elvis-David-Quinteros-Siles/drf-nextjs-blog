interface ComponentProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/** Tarjeta de sección para formularios y paneles. */
export default function Card({ title, description, children, className }: ComponentProps) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-dark-third dark:bg-dark-bg ${className}`}
    >
      {title && (
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-txt-secondary">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

Card.defaultProps = {
  title: '',
  description: '',
  className: '',
};
