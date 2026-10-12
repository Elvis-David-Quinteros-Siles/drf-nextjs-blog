import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2 font-semibold" aria-label="Inicio">
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-indigo-600 font-mono text-sm font-bold text-white transition-transform group-hover:-rotate-6">
        e/
      </span>
      <span className="text-base tracking-tight text-gray-900 dark:text-white">
        edqs<span className="text-indigo-600 dark:text-indigo-400">.blog</span>
      </span>
    </Link>
  );
}
