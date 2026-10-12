import { useId, useState } from 'react';
import newsletterSignup, { NewsLetterSignupProps } from '@/utils/api/newsletter/newsletterSignup';
import { ToastError, ToastSuccess } from '../toast/alerts';

interface ComponentProps {
  /** "row" pone el campo y el botón en la misma línea desde sm */
  layout?: 'row' | 'stack';
}

export default function EmailForm({ layout = 'row' }: ComponentProps) {
  const inputId = useId();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  const handleSubscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData: NewsLetterSignupProps = { email };

    try {
      setLoading(true);
      const res = await newsletterSignup(formData);
      if (res.status === 200) {
        ToastSuccess('¡Listo! Te avisaremos cuando haya artículos nuevos.');
        setEmail('');
        setDone(true);
      } else {
        ToastError(res.detail || 'No se pudo completar la suscripción');
      }
    } catch (e) {
      ToastError('No se pudo completar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
        Suscripción confirmada. ¡Gracias!
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubscribe}
      className={layout === 'row' ? 'flex flex-col gap-2 sm:flex-row' : 'flex flex-col gap-2'}
    >
      <label htmlFor={inputId} className="min-w-0 flex-1">
        <span className="sr-only">Correo electrónico</span>
        <input
          id={inputId}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="input"
        />
      </label>
      <button type="submit" disabled={loading} className="btn-primary shrink-0">
        {loading ? 'Enviando…' : 'Suscribirme'}
      </button>
    </form>
  );
}

EmailForm.defaultProps = {
  layout: 'row',
};
