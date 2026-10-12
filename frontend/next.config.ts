import type { NextConfig } from 'next';

type RemotePattern = NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number];

// Permite cargar imágenes desde MinIO (AWS_S3_PUBLIC_ENDPOINT_URL, ej: http://localhost:9020)
const minioPatterns: RemotePattern[] = [];
if (process.env.AWS_S3_PUBLIC_ENDPOINT_URL) {
  const minioUrl = new URL(process.env.AWS_S3_PUBLIC_ENDPOINT_URL);
  minioPatterns.push({
    protocol: minioUrl.protocol.replace(':', '') as 'http' | 'https',
    hostname: minioUrl.hostname,
    port: minioUrl.port,
    pathname: '**',
  });
}

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  images: {
    // El optimizador de Next descarga la imagen desde el servidor, donde la URL pública de MinIO
    // (localhost) no es accesible; además las URLs firmadas cambian en cada request.
    unoptimized: minioPatterns.length > 0,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd1d4k3x3vue16f.cloudfront.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '**',
      },
      ...minioPatterns,
    ],
  },
};

export default nextConfig;
