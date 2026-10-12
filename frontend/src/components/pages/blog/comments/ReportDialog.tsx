import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { FlagIcon } from '@heroicons/react/24/outline';
import { ToastError, ToastSuccess } from '@/components/toast/alerts';
import { reportComment } from '@/utils/api/blog/comments';

const REASONS = [
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'offensive', label: 'Ofensivo o acoso' },
  { value: 'off_topic', label: 'Fuera de tema' },
  { value: 'other', label: 'Otro motivo' },
];

interface ComponentProps {
  commentId: string;
  open: boolean;
  onClose: () => void;
}

export default function ReportDialog({ commentId, open, onClose }: ComponentProps) {
  const [reason, setReason] = useState<string>('spam');
  const [details, setDetails] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const submit = async () => {
    try {
      setSending(true);
      const message = await reportComment(commentId, reason, details.trim());
      ToastSuccess(message || 'Gracias, revisaremos el comentario.');
      onClose();
      setDetails('');
    } catch (e: any) {
      ToastError(e?.message || 'No se pudo enviar el reporte');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity data-[closed]:opacity-0 dark:bg-black/60"
      />
      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition data-[closed]:translate-y-4 data-[closed]:opacity-0 dark:bg-dark-bg dark:ring-1 dark:ring-dark-third"
        >
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <FlagIcon className="size-5 text-rose-500" aria-hidden="true" />
            Reportar comentario
          </DialogTitle>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Quien modera el artículo revisará el reporte. Con varios reportes, el comentario se oculta
            automáticamente.
          </p>
          <fieldset className="mt-5 space-y-2">
            <legend className="sr-only">Motivo</legend>
            {REASONS.map((r) => (
              <label
                key={r.value}
                htmlFor={`reason-${r.value}`}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  reason === r.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-gray-200 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second'
                }`}
              >
                <input
                  id={`reason-${r.value}`}
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-indigo-600"
                />
                {r.label}
              </label>
            ))}
          </fieldset>
          <label htmlFor="report-details" className="mt-4 block">
            <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-dark-txt">
              Detalles (opcional)
            </span>
            <textarea
              id="report-details"
              rows={2}
              maxLength={300}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="input resize-none"
            />
          </label>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn border border-gray-300 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second"
            >
              Cancelar
            </button>
            <button type="button" onClick={submit} disabled={sending} className="btn bg-rose-600 text-white hover:bg-rose-500">
              {sending ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
