import TiptapEditor from '../tiptap/TipTapEditor';

interface ComponentProps {
  data: string;
  setData: (value: string) => void;
  title?: string;
  description?: string;
  compact?: boolean;
  placeholder?: string;
}

export default function EditRichText({
  data,
  setData,
  title = '',
  description = '',
  compact = false,
  placeholder = '',
}: ComponentProps) {
  return (
    <div className="flex w-full flex-col">
      {title && (
        <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-dark-txt">{title}</span>
      )}
      {description && (
        <span className="mb-2 block text-sm text-gray-500 dark:text-dark-txt-secondary">{description}</span>
      )}
      <div className="rounded-xl border border-gray-300 bg-white transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-dark-third dark:bg-dark-bg">
        <TiptapEditor data={data} setData={setData} compact={compact} placeholder={placeholder} />
      </div>
    </div>
  );
}

EditRichText.defaultProps = {
  title: '',
  description: '',
  compact: false,
  placeholder: '',
};
