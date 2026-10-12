import Sidebar from './Sidebar';

interface ComponentProps {
  title: string;
  description?: string;
  /** Botones a la derecha del título */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Estructura de "Mi cuenta": navegación lateral (horizontal en móvil) y contenido. */
export default function Container({ title, description, actions, children }: ComponentProps) {
  return (
    <div className="container-page py-8 sm:py-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-gray-600 dark:text-dark-txt-secondary">{description}</p>
              )}
            </div>
            {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
          </div>
          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

Container.defaultProps = {
  description: '',
  actions: null,
};
