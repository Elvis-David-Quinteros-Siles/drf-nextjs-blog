import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import EmailForm from '@/components/cta/EmailForm';
import { AUTHOR_NAME, GITHUB_URL, PORTFOLIO_URL, REPO_URL } from '@/utils/site';

const COLUMNS = [
  {
    title: 'Blog',
    links: [
      { name: 'Todos los artículos', href: '/blog' },
      { name: 'Backend', href: '/category/backend' },
      { name: 'DevOps', href: '/category/devops' },
      { name: 'Seguridad', href: '/category/seguridad' },
    ],
  },
  {
    title: 'Autor',
    links: [
      { name: 'Portafolio', href: PORTFOLIO_URL },
      { name: 'GitHub', href: GITHUB_URL },
      { name: 'Código del blog', href: REPO_URL },
      { name: 'Contacto', href: '/contact' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-gray-200 bg-gray-50/60 dark:border-dark-third dark:bg-dark-bg/40">
      <div className="container-page py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-600 dark:text-dark-txt-secondary">
              Notas de ingeniería sobre backend, DevOps y seguridad, escritas desde proyectos reales.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 lg:col-span-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{column.title}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => {
                    const external = link.href.startsWith('http');
                    return (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          {...(external && { target: '_blank', rel: 'noreferrer' })}
                          className="text-sm text-gray-600 transition-colors hover:text-indigo-600 dark:text-dark-txt-secondary dark:hover:text-indigo-400"
                        >
                          {link.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="lg:col-span-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Newsletter</h3>
            <p className="mb-4 mt-2 text-sm text-gray-600 dark:text-dark-txt-secondary">
              Un correo por cada artículo nuevo.
            </p>
            <EmailForm />
          </div>
        </div>
        <p className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-dark-third dark:text-gray-400">
          © {new Date().getFullYear()} {AUTHOR_NAME}. Hecho con Django REST Framework y Next.js.
        </p>
      </div>
    </footer>
  );
}
