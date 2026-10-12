import Layout from '@/hocs/Layout';
import validator from 'validator';
import axios from 'axios';

import Container from '@/components/pages/profile/Container';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/reducers';
import { useEffect, useState } from 'react';
import EditText from '@/components/forms/EditText';
import { ToastError, ToastSuccess, ToastWarning } from '@/components/toast/alerts';
import { ThunkDispatch } from 'redux-thunk';
import { UnknownAction } from 'redux';
import { loadProfile, loadUser } from '@/redux/actions/auth/actions';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { SITE_URL } from '@/utils/site';
import EditDate from '@/components/forms/EditDate';
import EditURL from '@/components/forms/EditURL';
import EditRichText from '@/components/forms/EditRichText';
import EditImage from '@/components/forms/EditImage';
import useProfilePicture from '@/hooks/useProfilePicture';
import { fetchS3SignedURL } from '@/utils/api/s3/FetchPresignedUrl';
import uploadProfilePicture from '@/utils/api/profile/UploadProfilePicture';
import useBannerPicture from '@/hooks/useBannerPicture';
import uploadBannerPicture from '@/utils/api/profile/UploadBannerPicture';
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
  const user = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.auth.profile);

  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [hasChangesProfile, setHasChangesProfile] = useState<boolean>(false);
  const [hasChangesProfilePicture, setHasChangesProfilePicture] = useState<boolean>(false);
  const [hasChangesBannerPicture, setHasChangesBannerPicture] = useState<boolean>(false);

  const [username, setUsername] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  const [biography, setBiography] = useState<string>('');
  const [birthday, setBirthDay] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [instagram, setInstagram] = useState<string>('');
  const [facebook, setFacebook] = useState<string>('');
  const [threads, setThreads] = useState<string>('');
  const [linkedin, setLinkedin] = useState<string>('');
  const [youtube, setYouTube] = useState<string>('');
  const [tiktok, setTikTok] = useState<string>('');
  const [github, setGitHub] = useState<string>('');
  const [gitlab, setGitLab] = useState<string>('');

  const {
    profilePicture,
    setProfilePicture,
    percentage: profilePicturePerceentage,
    setPercentage: setProfilePicturePercentage,
    // loading: loadingProfilePicture,
  } = useProfilePicture();

  const {
    bannerPicture,
    setBannerPicture,
    percentage: bannerPicturePercentage,
    setPercentage: setBannerPicturePercentage,
    // loading: loadingBannerPicture,
  } = useBannerPicture();

  const onLoadProfilePicture = (newImage: any) => {
    if (newImage !== profilePicture) {
      setProfilePicture(newImage);
      setHasChangesProfilePicture(true);
    }
  };

  const onLoadBannerPicture = (newImage: any) => {
    if (newImage !== bannerPicture) {
      setBannerPicture(newImage);
      setHasChangesBannerPicture(true);
    }
  };

  // Rellenar el estado con datos iniciales de usuario
  useEffect(() => {
    if (user) {
      setUsername(user?.username);
      setFirstName(user?.first_name);
      setLastName(user?.last_name);
    }

    if (profile) {
      setBiography(profile?.biography);
      setBirthDay(profile?.birthday);
      setWebsite(profile?.website);
      setInstagram(profile?.instagram);
      setFacebook(profile?.facebook);
      setThreads(profile?.threads);
      setLinkedin(profile?.linkedin);
      setYouTube(profile?.youtube);
      setTikTok(profile?.tiktok);
      setGitHub(profile?.github);
      setGitLab(profile?.gitlab);
    }
  }, [user, profile]);

  // Detectar cambios
  // Check if profile data has changes and is valid
  const isValidDate = (date: string) => !Number.isNaN(new Date(date).getTime());
  const isValidUrl = (url: string) => validator.isURL(url, { require_protocol: false });
  const isEmpty = (str: string) => {
    // Strip all HTML tags and trim whitespace
    const cleanedContent = str.replace(/<[^>]*>/g, '').trim();
    return cleanedContent === '';
  };

  useEffect(() => {
    if (
      username !== user?.username ||
      firstName !== user?.first_name ||
      lastName !== user?.last_name
    ) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }

    if (
      (biography !== profile?.biography && !isEmpty(biography)) ||
      (birthday !== profile?.birthday && isValidDate(birthday)) ||
      (website !== profile?.website && isValidUrl(website)) ||
      (instagram !== profile?.instagram && isValidUrl(instagram)) ||
      (facebook !== profile?.facebook && isValidUrl(facebook)) ||
      (threads !== profile?.threads && isValidUrl(threads)) ||
      (linkedin !== profile?.linkedin && isValidUrl(linkedin)) ||
      (youtube !== profile?.youtube && isValidUrl(youtube)) ||
      (tiktok !== profile?.tiktok && isValidUrl(tiktok)) ||
      (github !== profile?.github && isValidUrl(github)) ||
      (gitlab !== profile?.gitlab && isValidUrl(gitlab))
    ) {
      setHasChangesProfile(true);
    } else {
      setHasChangesProfile(false);
    }
  }, [
    username,
    firstName,
    user,
    lastName,
    birthday,
    profile,
    website,
    instagram,
    facebook,
    threads,
    linkedin,
    youtube,
    tiktok,
    github,
    gitlab,
    biography,
  ]);

  const dispatch: ThunkDispatch<any, any, UnknownAction> = useDispatch();
  const [loading, setLoading] = useState<boolean>(false);

  const handleSaveUserData = async () => {
    // Iniciar objeto vacio para mandar datos
    const updatedData: Record<string, string> = {};

    // Comparar el estado actual con el estado original
    if (username !== user?.username) {
      updatedData.username = username;
    }
    if (firstName !== user?.first_name) {
      updatedData.first_name = firstName;
    }
    if (lastName !== user?.last_name) {
      updatedData.last_name = lastName;
    }

    // Revisar si hay algo para guardar
    if (Object.keys(updatedData).length === 0) {
      ToastWarning('No hay cambios para guardar.');
      return;
    }

    try {
      // Hacer PUT request con datos actualizados
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        ToastSuccess('Datos de la cuenta actualizados');
        // Actualizar el estado de redux
        await dispatch(loadUser());
      } else {
        ToastError('No se pudieron actualizar los datos de la cuenta');
      }
    } catch (error) {
      ToastError('No se pudieron actualizar los datos de la cuenta');
    }
  };

  const handleSaveProfileData = async () => {
    // Iniciar objeto vacio para mandar datos
    const updatedData: Record<string, string> = {};

    // Comparar el estado actual con el estado original
    if (biography !== profile?.biography) {
      updatedData.biography = biography;
    }
    if (birthday !== profile?.birthday) {
      updatedData.birthday = birthday;
    }
    if (website !== profile?.website) {
      updatedData.website = website;
    }
    if (instagram !== profile?.instagram) {
      updatedData.instagram = instagram;
    }
    if (facebook !== profile?.facebook) {
      updatedData.facebook = facebook;
    }
    if (threads !== profile?.threads) {
      updatedData.threads = threads;
    }
    if (linkedin !== profile?.linkedin) {
      updatedData.linkedin = linkedin;
    }
    if (youtube !== profile?.youtube) {
      updatedData.youtube = youtube;
    }
    if (tiktok !== profile?.tiktok) {
      updatedData.tiktok = tiktok;
    }
    if (github !== profile?.github) {
      updatedData.github = github;
    }
    if (gitlab !== profile?.gitlab) {
      updatedData.gitlab = gitlab;
    }

    // Revisar si hay algo para guardar
    if (Object.keys(updatedData).length === 0) {
      ToastWarning('No hay cambios para guardar.');
      return;
    }

    try {
      // Hacer PUT request con datos actualizados
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        ToastSuccess('Perfil actualizado');
        // Actualizar el estado de redux
        await dispatch(loadProfile());
      } else {
        ToastError('No se pudo actualizar el perfil');
      }
    } catch (error) {
      ToastError('No se pudo actualizar el perfil');
    }
  };

  const handleSaveProfilePicture = async () => {
    if (!profilePicture.file) {
      ToastError('No has elegido ninguna imagen');
      return null;
    }

    const { file } = profilePicture;
    const { name: title, size, type } = file;
    const sanitizedTitle = title.replace(/\s/g, '_');
    const fileKey = `media/users/pictures/${user?.username}/${sanitizedTitle}`;

    try {
      const presignedUrl = await fetchS3SignedURL({
        bucket: `${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}`,
        key: fileKey,
      });

      const uploadResponse = await axios.put(presignedUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.floor((progressEvent.loaded / progressEvent.total) * 100);
            setProfilePicturePercentage(percentage);
          }
        },
      });

      if (uploadResponse.status === 200) {
        const backendResponse = await uploadProfilePicture({
          key: fileKey,
          title,
          size,
          type,
        });

        if (backendResponse.status === 200) {
          setProfilePicturePercentage(0);
          ToastSuccess('Foto de perfil actualizada');
          dispatch(loadProfile());
          setHasChangesProfilePicture(false);
        }
      }
    } catch (err) {
      ToastError('No se pudo subir la imagen');
    }

    return null;
  };

  const handleSaveBannerPicture = async () => {
    if (!bannerPicture.file) {
      ToastError('No has elegido ninguna imagen');
      return null;
    }

    const { file } = bannerPicture;
    const { name: title, size, type } = file;
    const sanitizedTitle = title.replace(/\s/g, '_');
    const fileKey = `media/users/banners/${user?.username}/${sanitizedTitle}`;

    try {
      const presignedUrl = await fetchS3SignedURL({
        bucket: `${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}`,
        key: fileKey,
      });

      const uploadResponse = await axios.put(presignedUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.floor((progressEvent.loaded / progressEvent.total) * 100);
            setBannerPicturePercentage(percentage);
          }
        },
      });

      if (uploadResponse.status === 200) {
        const backendResponse = await uploadBannerPicture({
          key: fileKey,
          title,
          size,
          type,
        });

        if (backendResponse.status === 200) {
          setBannerPicturePercentage(0);
          ToastSuccess('Portada del perfil actualizada');
          setHasChangesBannerPicture(false);
        }
      }
    } catch (err) {
      ToastError('No se pudo subir la imagen');
    }

    return null;
  };

  const handleSaveData = async () => {
    if (
      !hasChanges &&
      !hasChangesProfile &&
      !hasChangesProfilePicture &&
      !hasChangesBannerPicture
    ) {
      ToastWarning('No hay cambios para guardar.');
      return;
    }

    try {
      setLoading(true);

      // If there are changes in user data, save them
      if (hasChanges) {
        await handleSaveUserData();
      }

      // If there are changes in profile data, save them
      if (hasChangesProfile) {
        await handleSaveProfileData();
      }

      if (hasChangesProfilePicture) {
        await handleSaveProfilePicture();
      }

      if (hasChangesBannerPicture) {
        await handleSaveBannerPicture();
      }
    } catch (error) {
      ToastError('No se pudieron guardar los cambios');
    } finally {
      setLoading(false);
    }
  };
  const anyChanges =
    hasChanges || hasChangesProfile || hasChangesProfilePicture || hasChangesBannerPicture;

  const socialFields = [
    { label: 'Sitio web', value: website, set: setWebsite, placeholder: 'https://tusitio.com' },
    { label: 'GitHub', value: github, set: setGitHub, placeholder: 'https://github.com/usuario' },
    { label: 'LinkedIn', value: linkedin, set: setLinkedin, placeholder: 'https://linkedin.com/in/usuario' },
    { label: 'GitLab', value: gitlab, set: setGitLab, placeholder: 'https://gitlab.com/usuario' },
    { label: 'YouTube', value: youtube, set: setYouTube, placeholder: 'https://youtube.com/@canal' },
    { label: 'Instagram', value: instagram, set: setInstagram, placeholder: 'https://instagram.com/usuario' },
    { label: 'Facebook', value: facebook, set: setFacebook, placeholder: 'https://facebook.com/usuario' },
    { label: 'Threads', value: threads, set: setThreads, placeholder: 'https://threads.net/@usuario' },
    { label: 'TikTok', value: tiktok, set: setTikTok, placeholder: 'https://tiktok.com/@usuario' },
  ];

  return (
    <Container
      title="Perfil"
      description="Esta información aparece en tu perfil público y en tus artículos."
      actions={
        user?.username && (
          <Link href={`/@/${user.username}`} className="btn-ghost border border-gray-200 dark:border-dark-third">
            Ver perfil público
          </Link>
        )
      }
    >
      <Card title="Datos de la cuenta">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <EditText
              title="Nombre de usuario"
              description={`Tu perfil público: ${SITE_URL.replace('https://', '')}/@/${username || 'usuario'}`}
              data={username}
              setData={setUsername}
            />
          </div>
          <EditText title="Nombre" data={firstName} setData={setFirstName} />
          <EditText title="Apellido" data={lastName} setData={setLastName} />
        </div>
      </Card>

      <Card title="Imágenes" description="JPG, PNG o WebP de hasta 5 MB.">
        <div className="space-y-8">
          <EditImage
            onLoad={onLoadProfilePicture}
            data={profilePicture}
            setData={setProfilePicture}
            percentage={profilePicturePerceentage}
            title="Foto de perfil"
          />
          <EditImage
            onLoad={onLoadBannerPicture}
            data={bannerPicture}
            setData={setBannerPicture}
            percentage={bannerPicturePercentage}
            variant="banner"
            title="Portada del perfil"
          />
        </div>
      </Card>

      <Card title="Sobre ti">
        <div className="space-y-5">
          <EditRichText
            title="Biografía"
            description="Cuéntale a los lectores quién eres y de qué escribes."
            data={biography}
            setData={setBiography}
            compact
          />
          <div className="max-w-xs">
            <EditDate title="Fecha de nacimiento" useTime={false} data={birthday} setData={setBirthDay} />
          </div>
        </div>
      </Card>

      <Card title="Enlaces" description="Se muestran como iconos en tu perfil público.">
        <div className="grid gap-5 sm:grid-cols-2">
          {socialFields.map((field) => (
            <EditURL
              key={field.label}
              title={field.label}
              data={field.value}
              setData={field.set}
              placeholder={field.placeholder}
            />
          ))}
        </div>
      </Card>

      {/* Barra de guardado: fija abajo mientras haya cambios sin guardar */}
      <div
        className={`sticky bottom-4 z-20 transition-all duration-200 ${
          anyChanges ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        aria-hidden={!anyChanges}
      >
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur dark:border-dark-third dark:bg-dark-bg/95">
          <p className="text-sm text-gray-700 dark:text-dark-txt">Tienes cambios sin guardar</p>
          <button type="button" onClick={handleSaveData} disabled={loading} className="btn-primary">
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Container>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
