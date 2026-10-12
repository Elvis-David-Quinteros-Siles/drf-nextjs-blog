import { useEffect, useId, useRef, useState } from 'react';

const MAX_LENGTH = 2000;

interface ComponentProps {
  onSubmit: (text: string) => Promise<boolean>;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
}

export default function CommentForm({
  onSubmit,
  initialValue = '',
  placeholder = '¿Qué opinas?',
  submitLabel = 'Publicar',
  onCancel,
  autoFocus = false,
  compact = false,
}: ComponentProps) {
  const id = useId();
  const [text, setText] = useState<string>(initialValue);
  const [sending, setSending] = useState<boolean>(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Crece con el texto, hasta un máximo
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const ok = await onSubmit(text);
    setSending(false);
    if (ok) setText('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-xl border border-gray-300 bg-white transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-dark-third dark:bg-dark-bg"
    >
      <label htmlFor={id} className="block">
        <span className="sr-only">{placeholder}</span>
        <textarea
          id={id}
          ref={ref}
          value={text}
          maxLength={MAX_LENGTH}
          rows={compact ? 2 : 3}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter publica
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
            if (e.key === 'Escape' && onCancel) onCancel();
          }}
          placeholder={placeholder}
          className="block w-full resize-none rounded-t-xl bg-transparent px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-dark-txt"
        />
      </label>
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 dark:border-dark-third">
        <span className="text-xs tabular-nums text-gray-400">
          {text.length > MAX_LENGTH * 0.8 ? `${text.length}/${MAX_LENGTH}` : 'Ctrl + Enter para publicar'}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-ghost px-3 py-1.5">
              Cancelar
            </button>
          )}
          <button type="submit" disabled={!text.trim() || sending} className="btn-primary px-3 py-1.5">
            {sending ? 'Enviando…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

CommentForm.defaultProps = {
  initialValue: '',
  placeholder: '¿Qué opinas?',
  submitLabel: 'Publicar',
  onCancel: undefined,
  autoFocus: false,
  compact: false,
};
