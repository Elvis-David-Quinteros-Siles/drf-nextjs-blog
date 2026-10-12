import { useMemo } from 'react';
import Link from 'next/link';
import parse, { DOMNode, Element } from 'html-react-parser';
import { GetServerSideProps, GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import EmailInput from '@/components/cta/EmailInput';
import Like from '@/components/pages/blog/Like';
import PostsList from '@/components/pages/blog/PostsList';
import ReadingProgress from '@/components/pages/blog/ReadingProgress';
import Share from '@/components/pages/blog/Share';
import TableOfContents from '@/components/pages/blog/TableOfContents';
import SEO from '@/components/SEO';
import Avatar from '@/components/ui/Avatar';
import Layout from '@/hocs/Layout';
import usePosts from '@/hooks/usePosts';
import { IPost } from '@/interfaces/blog/IPost';
import { formatDate, readingTime } from '@/utils/format';
import { SITE_URL } from '@/utils/site';

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const { slug } = context.params as { slug: string[] };
  const postSlug = Array.isArray(slug) ? slug[0] : slug;
  const accessToken = context.req.cookies.access;

  let post: IPost | null = null;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'API-Key': `${process.env.BACKEND_API_KEY}`,
    };
    if (accessToken) {
      headers.Authorization = `JWT ${accessToken}`;
    }

    const apiRes = await fetch(`${process.env.API_URL}/api/blog/post/?slug=${postSlug}`, {
      headers,
    });
    const data = await apiRes.json();
    if (apiRes.status === 200) {
      post = data.results;
    }
  } catch (e) {
    post = null;
  }

  if (!post) {
    return { notFound: true };
  }

  return { props: { post } };
};

export default function Page({ post }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const headings = useMemo(
    () => [...(post?.headings || [])].sort((a, b) => a.order - b.order),
    [post?.headings],
  );

  // Añade a cada encabezado del HTML el id de su entrada en el índice (mismo orden)
  const content = useMemo(() => {
    let index = 0;
    return parse(post?.content || '', {
      replace(domNode: DOMNode) {
        if (domNode instanceof Element && /^h[1-6]$/.test(domNode.name)) {
          const heading = headings[index];
          index += 1;
          if (heading) {
            // eslint-disable-next-line no-param-reassign
            domNode.attribs.id = heading.slug;
          }
        }
        return undefined;
      },
    });
  }, [post?.content, headings]);

  const categorySlug = useMemo(() => [post?.category?.slug], [post?.category?.slug]);
  const { posts, loading } = usePosts({ categories: categorySlug });
  const related = useMemo(
    () => posts.filter((relatedPost) => relatedPost.slug !== post?.slug).slice(0, 3),
    [posts, post?.slug],
  );

  const minutes = readingTime(post?.content);
  const hasToc = headings.length > 1;

  return (
    <>
      <SEO
        title={post?.title}
        description={post?.description}
        keywords={post?.keywords}
        href={`${SITE_URL}/blog/${post?.slug}`}
        author={post?.user}
        image={post?.thumbnail?.url}
        type="article"
      />
      <ReadingProgress targetId="articulo" />

      <article id="articulo">
        {/* Cabecera */}
        <header className="container-page pb-8 pt-8 sm:pt-12">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              Volver al blog
            </Link>
            <div className="mt-6">
              <Link
                href={`/category/${post?.category?.slug}`}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                {post?.category?.name}
              </Link>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
              {post?.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600 sm:text-xl dark:text-dark-txt-secondary">
              {post?.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
              <Link
                href={`/@/${post?.user}`}
                className="flex items-center gap-2 font-medium text-gray-900 hover:text-indigo-600 dark:text-white"
              >
                <Avatar name={post?.user} className="size-8" />
                {post?.user}
              </Link>
              <span aria-hidden="true">·</span>
              <time dateTime={post?.created_at}>{formatDate(post?.created_at)}</time>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="size-4" aria-hidden="true" />
                {minutes} min de lectura
              </span>
            </div>
          </div>
        </header>

        {post?.thumbnail?.url && (
          <div className="container-page">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.thumbnail.url}
              alt=""
              className="mx-auto aspect-[1200/630] w-full max-w-5xl rounded-2xl border border-gray-200 object-cover dark:border-dark-third"
            />
          </div>
        )}

        {/* Cuerpo: índice lateral en escritorio, desplegable en móvil */}
        <div className="container-page mt-10 lg:mt-14">
          <div
            className={`mx-auto lg:grid lg:gap-12 ${
              hasToc ? 'max-w-5xl lg:grid-cols-[minmax(0,1fr)_14rem]' : 'max-w-3xl'
            }`}
          >
            <div className="min-w-0">
              {hasToc && (
                <div className="mb-8 lg:hidden">
                  <TableOfContents headings={headings} variant="mobile" />
                </div>
              )}
              <div className="prose prose-gray max-w-none break-words sm:prose-lg dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-indigo-600 prose-pre:bg-gray-900 prose-pre:text-gray-100 dark:prose-a:text-indigo-400 dark:prose-pre:bg-dark-bg dark:prose-pre:ring-1 dark:prose-pre:ring-dark-third">
                {content}
              </div>

              <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6 dark:border-dark-third">
                <div className="flex items-center gap-3">
                  <Like post={post} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">¿Te sirvió?</span>
                </div>
                <Share post={post} />
              </div>
            </div>

            {hasToc && (
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <TableOfContents headings={headings} variant="desktop" />
                </div>
              </aside>
            )}
          </div>
        </div>
      </article>

      <div className="container-page mt-20 space-y-20">
        {(loading || related.length > 0) && (
          <PostsList
            title={`Más sobre ${post?.category?.name}`}
            posts={related}
            loading={loading}
          />
        )}
        <EmailInput />
      </div>
    </>
  );
}

Page.getLayout = function getLayout(page: React.ReactElement) {
  return <Layout>{page}</Layout>;
};
