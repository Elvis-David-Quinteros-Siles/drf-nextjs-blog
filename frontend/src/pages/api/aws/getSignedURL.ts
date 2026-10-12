import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { NextApiRequest, NextApiResponse } from 'next';

// Con MinIO, AWS_S3_PUBLIC_ENDPOINT_URL es la dirección que usa el navegador para subir el archivo.
// La firma se genera sin conectarse al servidor, así que no necesita ser accesible desde el contenedor.
const s3 = new S3Client({
  region: `${process.env.AWS_S3_REGION}`,
  ...(process.env.AWS_S3_PUBLIC_ENDPOINT_URL && {
    endpoint: process.env.AWS_S3_PUBLIC_ENDPOINT_URL,
    forcePathStyle: true,
  }),
  credentials: {
    accessKeyId: `${process.env.AWS_ACCESS_KEY_ID}`,
    secretAccessKey: `${process.env.AWS_SECRET_ACCESS_KEY}`,
  },
});

type ResponseData = {
  results?: string;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      error: `Method ${req.method} not allowed`,
    });
  }

  const { key, bucket } = req.body;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return res.status(200).json({ results: signedUrl });
}
