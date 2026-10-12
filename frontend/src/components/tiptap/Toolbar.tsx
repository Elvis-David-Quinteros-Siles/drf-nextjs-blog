import { useEffect, useReducer } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
  SquareCode,
  Link2,
  Minus,
} from 'lucide-react';
import { type Editor } from '@tiptap/react';

interface ComponentProps {
  editor: Editor | null;
  compact?: boolean;
}

interface ToolButtonProps {
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolButton({ label, shortcut, icon: Icon, active, disabled, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // no quitar el foco del editor
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-txt-secondary dark:hover:bg-dark-second dark:hover:text-white'
      }`}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}

ToolButton.defaultProps = {
  shortcut: '',
  active: false,
  disabled: false,
};

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-gray-200 dark:bg-dark-third" aria-hidden="true" />;
}

export default function Toolbar({ editor, compact = false }: ComponentProps) {
  // Re-render con cada transacción para reflejar el estado activo de los botones
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!editor) return undefined;
    editor.on('transaction', forceUpdate);
    return () => {
      editor.off('transaction', forceUpdate);
    };
  }, [editor]);

  if (!editor) {
    return <div className="h-[53px] border-b border-gray-200 dark:border-dark-third" />;
  }

  const chain = () => editor.chain().focus();

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    // eslint-disable-next-line no-alert
    const url = window.prompt('Dirección del enlace (vacío para quitarlo)', previous || 'https://');
    if (url === null) return;
    if (url.trim() === '' || url === 'https://') {
      chain().extendMarkRange('link').unsetLink().run();
      return;
    }
    const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
    chain().extendMarkRange('link').setLink({ href }).run();
  };

  const words = editor.getText().split(/\s+/).filter(Boolean).length;

  return (
    <div className="sticky top-16 z-10 flex items-center gap-2 rounded-t-xl border-b border-gray-200 bg-white/95 px-2 py-2 backdrop-blur dark:border-dark-third dark:bg-dark-bg/95">
      <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {!compact && (
          <>
            <ToolButton
              label="Título de sección"
              icon={Heading2}
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => chain().toggleHeading({ level: 2 }).run()}
            />
            <Divider />
          </>
        )}
        <ToolButton label="Negrita" shortcut="Ctrl+B" icon={Bold} active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
        <ToolButton label="Cursiva" shortcut="Ctrl+I" icon={Italic} active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
        <ToolButton label="Subrayado" shortcut="Ctrl+U" icon={Underline} active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} />
        <ToolButton label="Tachado" icon={Strikethrough} active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
        <ToolButton label="Enlace" shortcut="" icon={Link2} active={editor.isActive('link')} onClick={setLink} />
        <Divider />
        <ToolButton label="Lista" icon={List} active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
        <ToolButton label="Lista numerada" icon={ListOrdered} active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
        {!compact && (
          <>
            <ToolButton label="Cita" icon={Quote} active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()} />
            <ToolButton label="Bloque de código" icon={SquareCode} active={editor.isActive('codeBlock')} onClick={() => chain().toggleCodeBlock().run()} />
            <ToolButton label="Separador" icon={Minus} onClick={() => chain().setHorizontalRule().run()} />
          </>
        )}
        <Divider />
        <ToolButton label="Deshacer" shortcut="Ctrl+Z" icon={Undo} disabled={!editor.can().undo()} onClick={() => chain().undo().run()} />
        <ToolButton label="Rehacer" shortcut="Ctrl+Shift+Z" icon={Redo} disabled={!editor.can().redo()} onClick={() => chain().redo().run()} />
      </div>
      {!compact && (
        <span className="hidden shrink-0 pr-2 text-xs tabular-nums text-gray-500 sm:block dark:text-gray-400">
          {words} {words === 1 ? 'palabra' : 'palabras'} · {Math.max(1, Math.round(words / 200))} min
        </span>
      )}
    </div>
  );
}

Toolbar.defaultProps = {
  compact: false,
};
