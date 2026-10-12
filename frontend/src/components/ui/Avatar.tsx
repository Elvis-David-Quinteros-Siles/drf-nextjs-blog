import { initials } from '@/utils/format';

interface ComponentProps {
  name?: string;
  src?: string | null;
  className?: string;
}

/** Foto de perfil o, si no hay, un círculo con las iniciales. */
export default function Avatar({ name, src, className = 'size-9' }: ComponentProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `Foto de ${name}` : ''}
        loading="lazy"
        className={`${className} shrink-0 rounded-full bg-gray-100 object-cover dark:bg-dark-second`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300`}
    >
      {initials(name)}
    </span>
  );
}

Avatar.defaultProps = {
  name: '',
  src: null,
  className: 'size-9',
};
