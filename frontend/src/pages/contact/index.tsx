import { useState } from 'react';
import { CodeBracketIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import SEO from '@/components/SEO';
import { ToastError, ToastSuccess } from '@/components/toast/alerts';
import Layout from '@/hocs/Layout';
import sendContactForm, { SendContactFormProps } from '@/utils/api/contact/SendContactForm';
import { GITHUB_URL, PORTFOLIO_URL, SITE_URL } from '@/utils/site';

const EMPTY: SendContactFormProps = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  message: '',
};

const FIELDS: {
  name: keyof SendContactFormProps;
  label: string;
  type: string;
  autoComplete: string;
  full?: boolean;
}[] = [
  { name: 'firstName', label: 'Nombre', type: 'text', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Apellido', type: 'text', autoComplete: 'family-name' },
  { name: 'email', label: 'Correo electrónico', type: 'email', autoComplete: 'email', full: true },
  { name: 'phoneNumber', label: 'Teléfono', type: 'tel', autoComplete: 'tel', full: true },
];

export default function Page() {
  const [form, setForm] = useState<SendContactFormProps>(EMPTY);
  const [loading, setLoading] = useState<boolean>(false);

  const update = (name: keyof SendContactFormProps, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleOnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await sendContactForm(form);
      if (res?.status === 201) {
        setForm(EMPTY);
        ToastSuccess('Mensaje enviado. Te responderé pronto.');
      } else {
        ToastError('No se pudo enviar el mensaje');
      }
    } catch (err) {
      ToastError('No se pudo enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Contacto"
        description="Escríbeme sobre un artículo, una propuesta o un proyecto."
        href={`${SITE_URL}/contact`}
      />
      <section className="container-page py-12 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Contacto
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              Hablemos
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600 dark:text-dark-txt-secondary">
              ¿Una duda sobre un artículo, una propuesta de trabajo o un proyecto en mente? Déjame un
              mensaje y te responderé lo antes posible.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { href: PORTFOLIO_URL, label: 'Portafolio', value: 'edqs.online', icon: GlobeAltIcon },
                { href: GITHUB_URL, label: 'GitHub', value: 'Elvis-David-Quinteros-Siles', icon: CodeBracketIcon },
              ].map(({ href, label, value, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-dark-third dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5"
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
                      <span className="block truncate text-sm text-gray-500 dark:text-gray-400">{value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={handleOnSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-3 dark:border-dark-third dark:bg-dark-bg"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <label key={field.name} htmlFor={`contact-${field.name}`} className={`block ${field.full ? 'sm:col-span-2' : ''}`}>
                  <span className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-dark-txt">
                    {field.label}
                  </span>
                  <input
                    id={`contact-${field.name}`}
                    name={field.name}
                    type={field.type}
                    required
                    autoComplete={field.autoComplete}
                    value={form[field.name]}
                    onChange={(e) => update(field.name, e.target.value)}
                    className="input"
                  />
                </label>
              ))}
              <label htmlFor="contact-message" className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-gray-900 dark:text-dark-txt">
                  Mensaje
                </span>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  className="input resize-y"
                />
              </label>
            </div>
            <button type="submit" disabled={loading} className="btn-primary mt-6 w-full py-3 sm:w-auto">
              {loading ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
