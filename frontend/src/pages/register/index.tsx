import Button from '@/components/Button';
import EditEmail from '@/components/forms/EditEmail';
import EditPassword from '@/components/forms/EditPassword';
import EditText from '@/components/forms/EditText';
import SocialLoginButtons from '@/components/forms/SocialLoginButtons';
import LoadingMoon from '@/components/loaders/LoadingMoon';
import { ToastError } from '@/components/toast/alerts';
import Layout from '@/hocs/Layout';
import usePasswordValidation from '@/hooks/usePasswordValidation';
import { register } from '@/redux/actions/auth/actions';
import { IRegisterProps } from '@/redux/actions/auth/interfaces';
import Link from 'next/link';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { UnknownAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

export default function Page() {
  const [email, setEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rePassword, setRePassword] = useState<string>('');

  const { canSubmit, PasswordValidationText } = usePasswordValidation({
    username,
    password,
    rePassword,
  });

  const dispatch: ThunkDispatch<any, any, UnknownAction> = useDispatch();
  const [loading, setLoading] = useState<boolean>(false);

  const handleOnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canSubmit) {
      ToastError('Ensure all fields in the form are complete and meet the requirements.');
      return;
    }

    const registerData: IRegisterProps = {
      email,
      username,
      first_name: firstName,
      last_name: lastName,
      password,
      re_password: rePassword,
    };

    try {
      setLoading(true);
      await dispatch(register(registerData));
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
          Crea tu cuenta
        </h2>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:mx-auto sm:w-full sm:max-w-md sm:p-8 dark:border-dark-third dark:bg-dark-bg">
        <form onSubmit={handleOnSubmit} className="space-y-4">
          <EditText data={firstName} setData={setFirstName} title="Nombre" required />
          <EditText data={lastName} setData={setLastName} title="Apellido" required />
          <EditText data={username} setData={setUsername} title="Nombre de usuario" required />
          <EditEmail data={email} setData={setEmail} title="Correo electrónico" required />
          <EditPassword data={password} setData={setPassword} title="Contraseña" required />
          <EditPassword
            data={rePassword}
            setData={setRePassword}
            title="Repite la contraseña"
            required
          />

          {PasswordValidationText()}

          <Button disabled={loading} hoverEffect={!loading} type="submit">
            {loading ? <LoadingMoon /> : 'Crear cuenta'}
          </Button>
        </form>

        <SocialLoginButtons />

        <div className="mt-8 space-y-2 border-t border-gray-100 pt-6 dark:border-dark-third">
          <p className="text-center text-sm/6 text-gray-500 dark:text-gray-400">
            ¿No te llegó el correo de activación?{' '}
            <Link
              href="/resend-activation"
              className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Reenviar correo
            </Link>
          </p>
          <p className="text-center text-sm/6 text-gray-500 dark:text-gray-400">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              Ingresar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
