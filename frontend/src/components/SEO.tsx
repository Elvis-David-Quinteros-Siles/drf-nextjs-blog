import Head from 'next/head';
import { SITE_NAME, SITE_URL } from '@/utils/site';

export interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  href?: string;
  robots?: string;
  author?: string;
  publisher?: string;
  image?: string;
  twitterHandle?: string;
  type?: 'website' | 'article';
}

export default function SEO({
  title,
  description,
  keywords = '',
  href = '',
  robots = 'index, follow',
  author = '',
  publisher = SITE_NAME,
  image = '',
  twitterHandle = '',
  type = 'website',
}: SEOProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`;
  const url = href || SITE_URL;
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      <meta name="robots" content={robots} />
      {author && <meta name="author" content={author} />}
      <meta name="publisher" content={publisher} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="es_ES" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
    </Head>
  );
}

SEO.defaultProps = {
  keywords: '',
  href: '',
  robots: 'index, follow',
  author: '',
  publisher: SITE_NAME,
  image: '',
  twitterHandle: '',
  type: 'website',
};
