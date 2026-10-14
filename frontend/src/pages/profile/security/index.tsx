import Layout from '@/hocs/Layout';

import Container from '@/components/pages/profile/Container';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import EditPassword from '@/components/forms/EditPassword';
import usePasswordValidation from '@/hooks/usePasswordValidation';
import { ToastError, ToastSuccess } from '@/components/toast/alerts';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import verifyAccess from '@/utils/api/auth/VerifyAccess';
import { useDispatch, useSelector } from 'react-redux';
import { UnknownAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '@/redux/reducers';
import { loadUser } from '@/redux/actions/auth/actions';

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { verified } = await verifyAccess(context);

  if (!verified) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default function Page() {
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [repeatNewPassword, setRepeatNewPassword] = useState<string>('');

  const dispatch: ThunkDispatch<any, any, UnknownAction> = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const twoFactorEnabled = !!user?.two_factor_enabled;
  const [twoFactorPassword, setTwoFactorPassword] = useState<string>('');
  const [twoFactorLoading, setTwoFactorLoading] = useState<boolean>(false);

  const handleToggleTwoFactor = async () => {
    try {
      setTwoFactorLoading(true);
      const res = await fetch('/api/auth/two_factor', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !twoFactorEnabled, password: twoFactorPassword }),
      });

      if (res.status === 200) {
        ToastSuccess(twoFactorEnabled ? 'Verificación en dos pasos desactivada' : 'Verificación en dos pasos activada');
        setTwoFactorPassword('');
        await dispatch(loadUser());
      } else if (res.status === 403) {
        ToastError('Contraseña incorrecta');
      } else {
        ToastError('No se pudo cambiar la verificación en dos pasos');
      }
    } catch (err) {
      ToastError('No se pudo cambiar la verificación en dos pasos');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const { canSubmit, PasswordValidationText } = usePasswordValidation({
    password: newPassword,
    rePassword: repeatNewPassword,
  });

  const handleChangePassword = async () => {
    if (!canSubmit) {
      ToastError('Revisa la nueva contraseña: no cumple los requisitos o no coincide');
      return null;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/change_password', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_password: newPassword,
          re_new_password: repeatNewPassword,
          current_password: currentPassword,
        }),
      });

      if (res.status === 204) {
        ToastSuccess('Contraseña actualizada');
        setCurrentPassword('');
        setNewPassword('');
        setRepeatNewPassword('');
      } else {
        ToastError('No se pudo cambiar la contraseña. Revisa la contraseña actual.');
      }
    } catch (err) {
      ToastError('No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }

    return null;
  };

  return (
    <Container title="Seguridad" description="Gestiona el acceso a tu cuenta.">
      <Card title="Cambiar contraseña" description="Usa al menos 8 caracteres, con mayúsculas, números y símbolos.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleChangePassword();
          }}
          className="max-w-md space-y-5"
        >
          <EditPassword title="Contraseña actual" data={currentPassword} setData={setCurrentPassword} />
          <EditPassword title="Nueva contraseña" data={newPassword} setData={setNewPassword} />
          <EditPassword title="Repite la nueva contraseña" data={repeatNewPassword} setData={setRepeatNewPassword} />
          {PasswordValidationText()}
          <button type="submit" disabled={loading || !currentPassword} className="btn-primary">
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </Card>

      <Card
        title="Verificación en dos pasos"
        description="Al iniciar sesión, además de tu contraseña te pediremos un código que enviamos a tu correo."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleToggleTwoFactor();
          }}
          className="max-w-md space-y-5"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Estado:{' '}
            <span className={`font-semibold ${twoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
              {twoFactorEnabled ? 'activada' : 'desactivada'}
            </span>
          </p>
          <EditPassword title="Confirma con tu contraseña" data={twoFactorPassword} setData={setTwoFactorPassword} />
          <button type="submit" disabled={twoFactorLoading || !twoFactorPassword || !user} className="btn-primary">
            {twoFactorLoading && 'Guardando…'}
            {!twoFactorLoading && (twoFactorEnabled ? 'Desactivar' : 'Activar')}
          </button>
        </form>
      </Card>
    </Container>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
