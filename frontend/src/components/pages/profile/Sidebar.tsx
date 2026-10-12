import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import {
  DocumentTextIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { RootState } from '@/redux/reducers';

export default function Sidebar() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const canWrite = user && user.role !== 'customer';

  const items = [
    { name: 'Perfil', href: '/profile', icon: UserCircleIcon, match: (p: string) => p === '/profile' },
    ...(canWrite
      ? [
          {
            name: 'Mis artículos',
            href: '/profile/posts',
            icon: DocumentTextIcon,
            match: (p: string) => p.startsWith('/profile/posts'),
          },
          {
            name: 'Moderación',
            href: '/profile/moderation',
            icon: ShieldCheckIcon,
            match: (p: string) => p === '/profile/moderation',
          },
        ]
      : []),
    {
      name: 'Seguridad',
      href: '/profile/security',
      icon: FingerPrintIcon,
      match: (p: string) => p === '/profile/security',
    },
  ];

  return (
    <nav aria-label="Mi cuenta" className="-mx-4 sm:mx-0 lg:w-56 lg:flex-none">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto px-4 sm:px-0 lg:sticky lg:top-24 lg:flex-col">
        {items.map((item) => {
          const current = item.match(router.pathname);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  current
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-txt-secondary dark:hover:bg-dark-second dark:hover:text-white'
                }`}
              >
                <item.icon className="size-5 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
