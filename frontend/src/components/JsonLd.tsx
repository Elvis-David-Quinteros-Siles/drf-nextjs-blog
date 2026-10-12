import Head from 'next/head';

/** Datos estructurados schema.org. Se escapa "<" para que el JSON no pueda cerrar la etiqueta. */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <Head>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
      />
    </Head>
  );
}
