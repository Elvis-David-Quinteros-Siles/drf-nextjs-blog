import Button from '@/components/Button';
import EditEmail from '@/components/forms/EditEmail';
import LoadingMoon from '@/components/loaders/LoadingMoon';
import { ToastError } from '@/components/toast/alerts';
import Layout from '@/hocs/Layout';
import { forgotPassword } from '@/redux/actions/auth/actions';
import { IForgotPasswordProps } from '@/redux/actions/auth/interfaces';
import Link from 'next/link';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { UnknownAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

export default function Page() {
  const [email, setEmail] = useState<string>('');
  const dispatch: ThunkDispatch<any, any, UnknownAction> = useDispatch();
  const [loading, setLoading] = useState<boolean>(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleOnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!emailRegex.test(email)) {
      ToastError('A valid email is required');
      return;
    }

    const forgotPasswordData: IForgotPasswordProps = {
      email,
    };

    try {
      setLoading(true);
      await dispatch(forgotPassword(forgotPasswordData));
    } catch (err) {
      ToastError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-4 py-12 sm:py-20">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="text-center text-2xl/9 font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
          Recupera tu contraseña
        </h2>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:mx-auto sm:w-full sm:max-w-md sm:p-8 dark:border-dark-third dark:bg-dark-bg">
        <form onSubmit={handleOnSubmit} className="space-y-4">
          <EditEmail data={email} setData={setEmail} title="Email" required />

          <Button disabled={loading} hoverEffect={!loading} type="submit">
            {loading ? <LoadingMoon /> : 'Enviar correo'}
          </Button>
        </form>

        <p className="mt-10 text-center text-sm/6 text-gray-500">
          Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Acceder
          </Link>
        </p>
      </div>
    </div>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
