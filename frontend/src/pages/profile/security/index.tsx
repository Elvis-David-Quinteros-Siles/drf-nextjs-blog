import Layout from '@/hocs/Layout';

import Container from '@/components/pages/profile/Container';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import EditPassword from '@/components/forms/EditPassword';
import usePasswordValidation from '@/hooks/usePasswordValidation';
import { ToastError, ToastSuccess } from '@/components/toast/alerts';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import verifyAccess from '@/utils/api/auth/VerifyAccess';

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
    </Container>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
