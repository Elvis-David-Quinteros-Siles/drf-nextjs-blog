import { EnvelopeIcon } from '@heroicons/react/24/outline';
import EmailForm from './EmailForm';

/** Bloque de suscripción a la newsletter, para el final de los artículos y la home. */
export default function EmailInput() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-10 text-white sm:px-10">
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="relative grid gap-6 lg:grid-cols-2 lg:items-center">
        <div>
          <EnvelopeIcon className="size-7 text-indigo-200" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Recibe los nuevos artículos</h2>
          <p className="mt-2 text-indigo-100">
            Un correo cuando publique algo nuevo sobre backend, DevOps o seguridad. Sin spam.
          </p>
        </div>
        <div className="[&_.input]:border-white/20 [&_.input]:bg-white [&_.input]:text-gray-900 [&_.btn-primary]:bg-gray-900 [&_.btn-primary:hover]:bg-gray-800">
          <EmailForm />
        </div>
      </div>
    </section>
  );
}
