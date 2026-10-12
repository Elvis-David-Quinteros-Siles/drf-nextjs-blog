import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { IPostList } from '@/interfaces/blog/IPost';

interface ComponentProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  post: IPostList | null;
  handleDelete: (slug: string) => Promise<void>;
  loadingDelete: boolean;
}

export default function DeletePostModal({
  open,
  setOpen,
  post,
  handleDelete,
  loadingDelete,
}: ComponentProps) {
  return (
    <Dialog open={open} onClose={setOpen} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity data-[closed]:opacity-0 dark:bg-black/60"
      />
      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition data-[closed]:translate-y-4 data-[closed]:opacity-0 sm:data-[closed]:translate-y-0 sm:data-[closed]:scale-95 dark:bg-dark-bg dark:ring-1 dark:ring-dark-third"
        >
          <div className="flex gap-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <ExclamationTriangleIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                ¿Eliminar este artículo?
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-600 dark:text-dark-txt-secondary">
                «{post?.title}» se eliminará junto con sus estadísticas. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn border border-gray-300 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loadingDelete || !post}
              onClick={async () => {
                if (!post) return;
                await handleDelete(post.slug);
                setOpen(false);
              }}
              className="btn bg-rose-600 text-white hover:bg-rose-500"
            >
              {loadingDelete ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
