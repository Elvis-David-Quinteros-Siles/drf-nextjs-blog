import { useEffect, useState } from 'react';
import { CheckIcon, LinkIcon, ShareIcon } from '@heroicons/react/24/outline';
import { IPost } from '@/interfaces/blog/IPost';
import { SITE_URL } from '@/utils/site';

interface ComponentProps {
  post: IPost;
}

const buttonClass =
  'inline-flex size-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-indigo-200 hover:text-indigo-600 dark:border-dark-third dark:text-dark-txt dark:hover:border-indigo-500/40 dark:hover:text-indigo-300';

export default function Share({ post }: ComponentProps) {
  const url = `${SITE_URL}/blog/${post?.slug}`;
  const [copied, setCopied] = useState<boolean>(false);
  const [canNativeShare, setCanNativeShare] = useState<boolean>(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  const nativeShare = () => {
    navigator.share({ title: post?.title, text: post?.description, url }).catch(() => {});
  };

  const text = encodeURIComponent(post?.title || '');
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="flex items-center gap-2">
      {canNativeShare && (
        <button type="button" onClick={nativeShare} className={buttonClass} aria-label="Compartir">
          <ShareIcon className="size-5" />
        </button>
      )}
      <a
        href={`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className={buttonClass}
        aria-label="Compartir en X"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
          <path d="M13.68 10.62 20.24 3h-1.55l-5.7 6.62L8.44 3H3.2l6.88 10.01L3.2 21h1.55l6.02-6.99L15.57 21h5.24l-7.13-10.38Zm-2.13 2.48-.7-1-5.54-7.93H7.7l4.47 6.4.7 1 5.82 8.32H16.3l-4.75-6.79Z" />
        </svg>
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        className={buttonClass}
        aria-label="Compartir en LinkedIn"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
        </svg>
      </a>
      <button
        type="button"
        onClick={copyLink}
        className={buttonClass}
        aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
        title={copied ? 'Enlace copiado' : 'Copiar enlace'}
      >
        {copied ? <CheckIcon className="size-5 text-emerald-600" /> : <LinkIcon className="size-5" />}
      </button>
    </div>
  );
}
