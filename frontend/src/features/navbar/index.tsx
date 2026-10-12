import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { UnknownAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

import DarkModeButton from '@/components/DarkModeButton';
import SearchDialog from '@/components/SearchDialog';
import Avatar from '@/components/ui/Avatar';
import Logo from '@/components/ui/Logo';
import { logout } from '@/redux/actions/auth/actions';
import { RootState } from '@/redux/reducers';

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contacto' },
];

const iconButton =
  'inline-flex size-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-dark-txt dark:hover:bg-dark-second dark:hover:text-white';

export default function Navbar() {
  const router = useRouter();
  const dispatch: ThunkDispatch<any, any, UnknownAction> = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.auth.profile);

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  // Cierra el menú móvil al navegar
  useEffect(() => {
    const close = () => setMenuOpen(false);
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);

  // Atajos: "/" o Ctrl+K abren el buscador
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;
      if ((e.key === '/' && !typing) || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  const username = user?.username;
  const pictureUrl = profile?.profile_picture?.url;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 backdrop-blur-md dark:border-dark-third dark:bg-dark-main/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-dark-txt dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 lg:inline-flex dark:border-dark-third dark:text-gray-400 dark:hover:text-dark-txt"
          >
            <MagnifyingGlassIcon className="size-4" aria-hidden="true" />
            Buscar
            <kbd className="ml-4 font-mono text-xs text-gray-400">/</kbd>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar"
            className={`${iconButton} lg:hidden`}
          >
            <MagnifyingGlassIcon className="size-5" />
          </button>
          <DarkModeButton />

          {isAuthenticated ? (
            <Menu as="div" className="relative ml-1">
              <MenuButton className="flex rounded-full" aria-label="Menú de usuario">
                <Avatar name={username} src={pictureUrl} />
              </MenuButton>
              <MenuItems
                transition
                anchor="bottom end"
                className="z-50 mt-2 w-56 origin-top-right rounded-xl bg-white p-1 shadow-lg ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-dark-bg dark:ring-dark-third"
              >
                <div className="px-3 py-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sesión iniciada como</p>
                  <p className="truncate text-sm font-semibold">{username}</p>
                </div>
                {[
                  ...(user?.role && user.role !== 'customer'
                    ? [
                        { href: '/profile/posts/new', label: 'Escribir artículo' },
                        { href: '/profile/posts', label: 'Mis artículos' },
                      ]
                    : []),
                  { href: `/@/${username}`, label: 'Perfil público' },
                  { href: '/profile', label: 'Configuración' },
                ].map((item) => (
                  <MenuItem key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-sm data-[focus]:bg-gray-100 dark:data-[focus]:bg-dark-second"
                    >
                      {item.label}
                    </Link>
                  </MenuItem>
                ))}
                <MenuItem>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 data-[focus]:bg-rose-50 dark:text-rose-400 dark:data-[focus]:bg-rose-500/10"
                  >
                    Cerrar sesión
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          ) : (
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/login" className="btn-ghost">
                Ingresar
              </Link>
              <Link href="/register" className="btn-primary">
                Crear cuenta
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className={`${iconButton} md:hidden`}
          >
            {menuOpen ? <XMarkIcon className="size-6" /> : <Bars3Icon className="size-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Menú móvil"
          className="border-t border-gray-200 bg-white px-4 pb-6 pt-2 md:hidden dark:border-dark-third dark:bg-dark-main"
        >
          <ul className="space-y-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-3 text-base font-medium ${
                    isActive(link.href)
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-dark-txt dark:hover:bg-dark-second'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {!isAuthenticated && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-200 pt-4 dark:border-dark-third">
              <Link href="/login" className="btn border border-gray-300 dark:border-dark-third">
                Ingresar
              </Link>
              <Link href="/register" className="btn-primary">
                Crear cuenta
              </Link>
            </div>
          )}
        </nav>
      )}

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
