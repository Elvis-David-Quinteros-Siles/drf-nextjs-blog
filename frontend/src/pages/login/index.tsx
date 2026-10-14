import Button from '@/components/Button';
import EditEmail from '@/components/forms/EditEmail';
import EditPassword from '@/components/forms/EditPassword';
import EditText from '@/components/forms/EditText';
import SocialLoginButtons from '@/components/forms/SocialLoginButtons';
import LoadingMoon from '@/components/loaders/LoadingMoon';
import { ToastError, ToastSuccess } from '@/components/toast/alerts';
import Layout from '@/hocs/Layout';
import { loadProfile, loadUser, setLoginSuccess } from '@/redux/actions/auth/actions';
import verifyOTPLogin, { SendVerifyOTPLoginProps } from '@/utils/api/auth/VerifyOTPLogin';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { UnknownAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';

export default function Page() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [step, setStep] = useState<number>(1);
  const [otp, setOTP] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);

  const dispatch: ThunkDispatch<any, any, UnknownAction> = useDispatch();

  const router = useRouter();

  const finishLogin = async () => {
    await dispatch(loadProfile());
    await dispatch(loadUser());
    await dispatch(setLoginSuccess());
    ToastSuccess('Login successfull.');
    router.push(typeof router.query.next === 'string' && router.query.next.startsWith('/') ? router.query.next : '/');
  };

  // Vuelta del login con Google o GitHub (/api/auth/oauth/<proveedor>/callback)
  useEffect(() => {
    if (!router.isReady) return;
    const { social, otp_email: otpEmail, social_error: socialError } = router.query;

    if (social) {
      finishLogin();
    } else if (typeof otpEmail === 'string') {
      setEmail(otpEmail);
      setStep(2);
      ToastSuccess('Te enviamos un código de verificación a tu correo');
    } else if (socialError) {
      ToastError('No se pudo iniciar sesión con esa cuenta');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const handleOnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      ToastError('A valid email is required');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.status !== 200) {
        ToastError('Correo o contraseña incorrectos');
        return;
      }

      if (data.otp_required) {
        ToastSuccess('Te enviamos un código de verificación a tu correo');
        setStep(2);
        return;
      }

      await finishLogin();
    } catch (err) {
      ToastError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const sendVerifyOTPLoginData: SendVerifyOTPLoginProps = {
      email,
      otp,
    };

    try {
      setLoading(true);
      const res = await verifyOTPLogin(sendVerifyOTPLoginData);
      if (res) {
        await finishLogin();
      } else {
        ToastError('Código incorrecto o caducado');
        setOTP('');
      }
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
          Accede a tu cuenta
        </h2>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:mx-auto sm:w-full sm:max-w-md sm:p-8 dark:border-dark-third dark:bg-dark-bg">
        {step === 1 && (
          <form onSubmit={handleOnSubmit} className="space-y-4">
            <EditEmail data={email} setData={setEmail} title="Correo electrónico" required />
            <EditPassword data={password} setData={setPassword} title="Contraseña" required />
            <Button disabled={loading} hoverEffect={!loading} type="submit">
              {loading ? <LoadingMoon /> : 'Ingresar'}
            </Button>
          </form>
        )}

        {step === 1 && <SocialLoginButtons />}

        {step === 2 && (
          <form onSubmit={handleOTPSubmit} className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Introduce el código que enviamos a <span className="font-medium">{email}</span>. Caduca en 5 minutos.
            </p>
            <EditText data={otp} setData={setOTP} title="Código de verificación" required />
            <Button disabled={loading} hoverEffect={!loading} type="submit">
              {loading ? <LoadingMoon /> : 'Ingresar'}
            </Button>
          </form>
        )}

        <div className="mt-8 space-y-2 border-t border-gray-100 pt-6 dark:border-dark-third">
          <p className="text-center text-sm/6 text-gray-500 dark:text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              Regístrate
            </Link>
          </p>
          <p className="text-center text-sm/6 text-gray-500 dark:text-gray-400">
            ¿Olvidaste tu contraseña?{' '}
            <Link
              href="/forgot-password"
              className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Recupérala
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
