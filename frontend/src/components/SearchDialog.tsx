import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface ComponentProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchDialog({ open, onClose }: ComponentProps) {
  const router = useRouter();
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    onClose();
    router.push(`/search/${encodeURIComponent(term)}`);
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity data-[closed]:opacity-0 dark:bg-black/60"
      />
      <div className="fixed inset-0 overflow-y-auto px-4 pt-[12vh]">
        <DialogPanel
          transition
          className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-dark-bg dark:ring-dark-third"
        >
          <form onSubmit={handleSubmit} role="search" className="flex items-center gap-3 px-4">
            <MagnifyingGlassIcon className="size-5 shrink-0 text-gray-400" aria-hidden="true" />
            <input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artículos…"
              aria-label="Buscar artículos"
              className="h-14 w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white"
            />
            <kbd className="hidden rounded border border-gray-200 px-1.5 text-xs text-gray-400 sm:block dark:border-dark-third">
              Esc
            </kbd>
          </form>
          <p className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-dark-third dark:text-gray-400">
            Pulsa Enter para buscar por título, descripción o palabras clave.
          </p>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
