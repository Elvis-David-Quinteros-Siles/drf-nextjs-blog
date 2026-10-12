import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Toolbar from './Toolbar';

export interface TipTapEditorProps {
  data: string;
  setData: (value: string) => void;
  /** Versión reducida (biografía): menos botones y menos altura */
  compact?: boolean;
  placeholder?: string;
}

function TiptapEditor({ data, setData, compact = false, placeholder = '' }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      // El backend solo conserva h1/h2 (sanitize_html), así que no se ofrecen otros niveles
      StarterKit.configure({ heading: { levels: [2] }, code: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: null },
      }),
    ],
    content: data,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-gray max-w-none dark:prose-invert focus:outline-none px-4 py-4 sm:px-5 ${
          compact ? 'min-h-[140px] prose-sm' : 'min-h-[420px] sm:prose-lg'
        } prose-headings:font-semibold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-pre:bg-gray-900 prose-pre:text-gray-100`,
        'aria-label': placeholder || 'Contenido',
        'data-placeholder': placeholder,
      },
    },
    // Antes se recortaba el texto a N caracteres y se reemplazaba por texto plano,
    // perdiendo todo el formato. Ahora el contenido se guarda tal cual.
    onUpdate: ({ editor: currentEditor }) => {
      setData(currentEditor.isEmpty ? '' : currentEditor.getHTML());
    },
  });

  // Sincroniza cambios externos (carga inicial del post, reset del formulario)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (current !== (data || '')) {
      editor.commands.setContent(data || '', false);
    }
  }, [data, editor]);

  return (
    <div className="w-full">
      <Toolbar editor={editor} compact={compact} />
      <EditorContent editor={editor} />
    </div>
  );
}

TiptapEditor.defaultProps = {
  compact: false,
  placeholder: '',
};

export default TiptapEditor;
