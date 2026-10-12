import { useState } from 'react';
import Link from 'next/link';
import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { useSelector } from 'react-redux';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { Cog6ToothIcon, PlusIcon } from '@heroicons/react/24/outline';
import PostsList from '@/components/pages/blog/PostsList';
import SEO from '@/components/SEO';
import Avatar from '@/components/ui/Avatar';
import Layout from '@/hocs/Layout';
import usePosts from '@/hooks/usePosts';
import { IProfile } from '@/interfaces/auth/IProfile';
import { IUser } from '@/interfaces/auth/IUser';
import { RootState } from '@/redux/reducers';
import sanitizeContent from '@/utils/sanitizeContent';
import { SITE_URL } from '@/utils/site';

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { slug } = context.params as { slug: string[] };
  const username = Array.isArray(slug) ? slug[0] : slug;

  let user: IUser | null = null;
  let profile: IProfile | null = null;

  try {
    const apiRes = await fetch(`${process.env.API_URL}/api/profile/get/?username=${encodeURIComponent(username)}`, {
      headers: {
        Accept: 'application/json',
        'API-Key': `${process.env.BACKEND_API_KEY}`,
      },
    });
    const data = await apiRes.json();
    if (apiRes.status === 200) {
      user = data.results.user;
      profile = data.results.profile;
    }
  } catch (e) {
    user = null;
  }

  if (!user) return { notFound: true };

  return { props: { profile, user } };
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  moderator: 'Moderador',
  helper: 'Colaborador',
  seller: 'Autor',
  customer: 'Lector',
};

export default function Page({
  profile,
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const myUser = useSelector((state: RootState) => state.auth.user);
  const isOwner = myUser?.username === user?.username;
  const canWrite = user?.role !== 'customer';

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username;

  const social = [
    { name: 'Sitio web', href: profile?.website, icon: 'bx bx-globe' },
    { name: 'GitHub', href: profile?.github, icon: 'bx bxl-github' },
    { name: 'GitLab', href: profile?.gitlab, icon: 'bx bxl-gitlab' },
    { name: 'LinkedIn', href: profile?.linkedin, icon: 'bx bxl-linkedin' },
    { name: 'YouTube', href: profile?.youtube, icon: 'bx bxl-youtube' },
    { name: 'Instagram', href: profile?.instagram, icon: 'bx bxl-instagram' },
    { name: 'Facebook', href: profile?.facebook, icon: 'bx bxl-facebook' },
    { name: 'Threads', href: profile?.threads, icon: 'bx bx-at' },
    { name: 'TikTok', href: profile?.tiktok, icon: 'bx bxl-tiktok' },
  ].filter((item) => item.href && item.href.trim() !== '');

  const bio = sanitizeContent(profile?.biography || '');
  const bioText = bio.replace(/<[^>]*>/g, '').trim();
  const [expanded, setExpanded] = useState<boolean>(false);
  const isLongBio = bioText.length > 500;

  const { posts, loading, count, nextUrl, loadMore, loadingMore } = usePosts({ username: user?.username });

  return (
    <>
      <SEO
        title={fullName}
        description={bioText.slice(0, 160) || `Artículos de ${fullName}.`}
        href={`${SITE_URL}/@/${user?.username}`}
        image={profile?.profile_picture?.url}
      />

      {/* Portada */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 sm:h-56">
        {profile?.banner_picture?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.banner_picture.url} alt="" className="size-full object-cover" />
        )}
      </div>

      <div className="container-page relative">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
            <Avatar
              name={fullName}
              src={profile?.profile_picture?.url}
              className="size-24 text-2xl ring-4 ring-white sm:size-32 dark:ring-dark-main"
            />
            <div className="sm:pb-2">
              <h1 className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                {fullName}
                {user?.verified && (
                  <CheckBadgeIcon className="size-6 text-indigo-500" aria-label="Cuenta verificada" />
                )}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                @{user?.username}
                {user?.role && <> · {ROLE_LABELS[user.role] || user.role}</>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:pb-2">
            {social.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.name}
                title={item.name}
                className="inline-flex size-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-indigo-200 hover:text-indigo-600 dark:border-dark-third dark:text-dark-txt dark:hover:text-indigo-300"
              >
                <i className={`${item.icon} text-xl`} aria-hidden="true" />
              </a>
            ))}
            {isOwner && (
              <>
                <Link href="/profile" className="btn border border-gray-300 hover:bg-gray-50 dark:border-dark-third dark:hover:bg-dark-second">
                  <Cog6ToothIcon className="size-4" aria-hidden="true" />
                  Editar perfil
                </Link>
                {canWrite && (
                  <Link href="/profile/posts/new" className="btn-primary">
                    <PlusIcon className="size-4" aria-hidden="true" />
                    Nuevo artículo
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {bioText && (
          <div className="mt-8 max-w-3xl">
            <div
              className={`prose prose-gray relative max-w-none dark:prose-invert ${
                isLongBio && !expanded ? 'max-h-48 overflow-hidden' : ''
              }`}
            >
              {/* eslint-disable-next-line react/no-danger */}
              <div dangerouslySetInnerHTML={{ __html: bio }} />
              {isLongBio && !expanded && (
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-dark-main" />
              )}
            </div>
            {isLongBio && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                {expanded ? 'Ver menos' : 'Leer más'}
              </button>
            )}
          </div>
        )}

        {canWrite && (
          <div className="mt-12 border-t border-gray-200 pt-10 dark:border-dark-third">
            <PostsList
              title={count > 0 ? `Artículos (${count})` : 'Artículos'}
              posts={posts}
              loading={loading}
              emptyMessage={
                isOwner ? 'Todavía no has publicado artículos.' : 'Todavía no hay artículos publicados.'
              }
              hasMore={Boolean(nextUrl)}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          </div>
        )}
      </div>
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
