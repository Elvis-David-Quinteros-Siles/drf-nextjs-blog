import Link from 'next/link';

/** Isotipo de EDQS (el mismo del portafolio edqs.online) con el nombre del blog. */
export default function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2 font-semibold" aria-label="edqs.blog — inicio">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.png"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 transition-[filter] duration-300 group-hover:drop-shadow-[0_0_10px_rgb(34_211_238/0.5)]"
      />
      <span className="text-base tracking-tight text-gray-900 dark:text-white">
        edqs<span className="text-indigo-600 dark:text-indigo-400">.blog</span>
      </span>
    </Link>
  );
}
