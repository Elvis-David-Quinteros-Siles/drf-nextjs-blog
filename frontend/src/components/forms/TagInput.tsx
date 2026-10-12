import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';

const MAX_TAGS = 8;

interface ComponentProps {
  id: string;
  /** Etiquetas separadas por comas (se guardan como palabras clave) */
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
}

const split = (value: string) =>
  value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

/** Campo de etiquetas: Enter o coma añaden, Retroceso con el campo vacío quita la última. */
export default function TagInput({ id, value, onChange, suggestions = [] }: ComponentProps) {
  const [draft, setDraft] = useState<string>('');
  const tags = split(value);

  const commit = (list: string[]) => onChange(list.join(', '));

  const add = (raw: string) => {
    const tag = raw.replace(/[^\p{L}\p{N}\-_.#+\s]/gu, '').trim().slice(0, 40);
    if (!tag || tags.length >= MAX_TAGS) return;
    if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) commit([...tags, tag]);
    setDraft('');
  };

  const available = suggestions
    .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
    .filter((s) => !draft || s.toLowerCase().includes(draft.toLowerCase()))
    .slice(0, 6);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-dark-third dark:bg-dark-bg">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 py-0.5 pl-2 pr-1 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
          >
            {tag}
            <button
              type="button"
              onClick={() => commit(tags.filter((t) => t !== tag))}
              aria-label={`Quitar ${tag}`}
              className="rounded p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
            >
              <XMarkIcon className="size-3.5" />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            id={id}
            aria-label="Añadir etiqueta"
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              if (v.includes(',')) {
                v.split(',').slice(0, -1).forEach(add);
                setDraft(v.split(',').pop() || '');
              } else {
                setDraft(v);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(draft);
              } else if (e.key === 'Backspace' && !draft && tags.length) {
                commit(tags.slice(0, -1));
              }
            }}
            onBlur={() => draft && add(draft)}
            placeholder={tags.length ? '' : 'django, docker, nginx'}
            className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-dark-txt"
          />
        )}
      </div>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-dark-third dark:text-dark-txt-secondary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

TagInput.defaultProps = {
  suggestions: [],
};
