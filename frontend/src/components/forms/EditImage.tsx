import { useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactDropzone from 'react-dropzone';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { ToastError } from '../toast/alerts';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

interface ComponentProps {
  encoding?: string;
  data: any;
  setData: any;
  onLoad?: any;
  percentage?: number;
  /** profile: avatar redondo · banner: franja ancha · cover: portada 1200x630 */
  variant?: 'profile' | 'banner' | 'cover';
  title?: string;
  description?: string;
}

function isUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

export default function EditImage({
  encoding = 'multipart',
  data,
  setData,
  onLoad = null,
  percentage = 0,
  variant = 'profile',
  title = '',
  description = '',
}: ComponentProps) {
  const handleDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!ALLOWED_TYPES[file.type]) {
      ToastError('Formato no permitido. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      ToastError(`La imagen supera los ${MAX_SIZE_MB} MB.`);
      return;
    }

    const base = {
      id: uuidv4(),
      title: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: ALLOWED_TYPES[file.type],
      lastModified: file.lastModified,
    };

    const commit = (item: any) => {
      setData(item);
      if (onLoad) onLoad(item);
    };

    if (encoding === 'base64') {
      const reader = new FileReader();
      reader.onload = () => commit({ ...base, file: reader.result });
      reader.readAsDataURL(file);
    } else {
      commit({ ...base, file });
    }
  };

  // URL de vista previa: imagen ya guardada (URL) o archivo recién elegido
  const previewUrl = useMemo(() => {
    if (isUrl(data)) return data;
    if (data?.file instanceof File) return URL.createObjectURL(data.file);
    if (typeof data?.file === 'string') return data.file;
    return '';
  }, [data]);

  useEffect(
    () => () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const previewClass = {
    profile: 'size-24 rounded-full',
    banner: 'aspect-[4/1] w-full rounded-xl',
    cover: 'aspect-[1200/630] w-full rounded-xl',
  }[variant];

  const dropzone = (
    <ReactDropzone
      onDrop={handleDrop}
      accept={{ 'image/jpeg': [], 'image/png': [], 'image/webp': [] }}
      multiple={false}
    >
      {({ getRootProps, getInputProps, isDragActive }) => (
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50 dark:border-dark-third dark:hover:border-indigo-500/60 dark:hover:bg-dark-second'
          }`}
        >
          <input {...getInputProps()} />
          <PhotoIcon className="size-7 text-gray-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-dark-txt">
            {data?.file ? data.title : 'Arrastra una imagen o haz clic para elegirla'}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            JPG, PNG o WebP · máx. {MAX_SIZE_MB} MB
          </p>
        </div>
      )}
    </ReactDropzone>
  );

  const preview = previewUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={previewUrl}
      alt="Vista previa"
      className={`${previewClass} shrink-0 border border-gray-200 object-cover dark:border-dark-third`}
    />
  ) : (
    <div
      aria-hidden="true"
      className={`${previewClass} shrink-0 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-500/20 dark:to-violet-500/20`}
    />
  );

  return (
    <div>
      {title && (
        <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-dark-txt">{title}</span>
      )}
      {description && (
        <span className="mb-2 block text-sm text-gray-500 dark:text-dark-txt-secondary">{description}</span>
      )}
      <div className={variant === 'profile' ? 'flex items-center gap-4' : 'space-y-3'}>
        {preview}
        <div className="min-w-0 flex-1">{dropzone}</div>
      </div>
      {percentage > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-second">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de subida"
          />
        </div>
      )}
    </div>
  );
}

EditImage.defaultProps = {
  encoding: 'multipart',
  onLoad: null,
  percentage: 0,
  variant: 'profile',
  title: '',
  description: '',
};
