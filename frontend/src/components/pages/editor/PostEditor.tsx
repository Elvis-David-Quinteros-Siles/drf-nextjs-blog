import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

import EditImage from '@/components/forms/EditImage';
import TagInput from '@/components/forms/TagInput';
import EditRichText from '@/components/forms/EditRichText';
import { ToastError, ToastSuccess } from '@/components/toast/alerts';
import Card from '@/components/ui/Card';
import { ICategoryList } from '@/interfaces/blog/ICategory';
import { ISeriesBrief } from '@/interfaces/blog/ITaxonomy';
import { createSeries, listMySeries, listTags } from '@/utils/api/blog/meta';
import { IPost } from '@/interfaces/blog/IPost';
import { RootState } from '@/redux/reducers';
import createPost, { CreatePostProps } from '@/utils/api/blog/post/create';
import updatePost, { UpdatePostProps } from '@/utils/api/blog/post/update';
import { fetchS3SignedURL } from '@/utils/api/s3/FetchPresignedUrl';
import { readingTime } from '@/utils/format';
import { SITE_URL } from '@/utils/site';

const TITLE_MAX = 128;
const DESCRIPTION_MAX = 256;

/** "Cómo desplegué Django" → "como-desplegue-django" */
export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

interface ComponentProps {
  categories: ICategoryList[];
  loadingCategories: boolean;
  /** Si se pasa, el editor edita este post; si no, crea uno nuevo */
  post?: IPost | null;
}

export default function PostEditor({ categories, loadingCategories, post }: ComponentProps) {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const isEdit = Boolean(post);

  const [title, setTitle] = useState<string>(post?.title || '');
  const [description, setDescription] = useState<string>(post?.description || '');
  const [content, setContent] = useState<string>(post?.content || '');
  const [keywords, setKeywords] = useState<string>(post?.keywords || '');
  const [slug, setSlug] = useState<string>(post?.slug || '');
  const [slugTouched, setSlugTouched] = useState<boolean>(isEdit);
  const [category, setCategory] = useState<string>(post?.category?.slug || '');
  const [status, setStatus] = useState<string>(post?.status || 'draft');
  const [series, setSeries] = useState<string>(post?.series?.slug || '');
  const [seriesOrder, setSeriesOrder] = useState<number>(post?.series_order || 1);
  const [mySeries, setMySeries] = useState<ISeriesBrief[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [newSeriesTitle, setNewSeriesTitle] = useState<string>('');
  const [creatingSeries, setCreatingSeries] = useState<boolean>(false);
  const [thumbnail, setThumbnail] = useState<any>(post?.thumbnail?.url || null);
  const [percentage, setPercentage] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);

  // Marca el formulario como modificado en cuanto cambia algo
  const markDirty = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setDirty(true);
  };

  useEffect(() => {
    listMySeries().then(setMySeries).catch(() => setMySeries([]));
    listTags()
      .then((tags) => setTagSuggestions(tags.map((t) => t.name)))
      .catch(() => setTagSuggestions([]));
  }, []);

  const handleCreateSeries = async () => {
    const seriesTitle = newSeriesTitle.trim();
    if (!seriesTitle) return;
    try {
      const created = await createSeries(seriesTitle);
      setMySeries((prev) => [created, ...prev]);
      setSeries(created.slug);
      setSeriesOrder(1);
      setNewSeriesTitle('');
      setCreatingSeries(false);
      setDirty(true);
    } catch (e) {
      ToastError('No se pudo crear la serie');
    }
  };

  // En un post nuevo, la URL se genera a partir del título hasta que se edite a mano
  useEffect(() => {
    if (!slugTouched) setSlug(toSlug(title));
  }, [title, slugTouched]);

  // Aviso al salir con cambios sin guardar
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // El título crece en altura según el texto
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const minutes = useMemo(() => readingTime(content), [content]);

  const uploadThumbnail = async () => {
    if (!thumbnail?.file) return null;
    const { file } = thumbnail;
    const name = file.name.replace(/\s/g, '_');
    const key = `media/blog/posts/${user?.username}/${slug}/${name}`;

    const presignedUrl = await fetchS3SignedURL({
      bucket: `${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}`,
      key,
    });
    const upload = await axios.put(presignedUrl, file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: (event) => {
        if (event.total) setPercentage(Math.floor((event.loaded / event.total) * 100));
      },
    });
    setPercentage(0);
    if (upload.status !== 200) throw new Error('upload failed');
    return {
      thumbnail_name: name,
      thumbnail_size: file.size,
      thumbnail_type: file.type,
      thumbnail_key: key,
    };
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'El título es obligatorio.';
    if (!description.trim()) return 'Escribe una descripción breve.';
    if (!stripHtml(content)) return 'El artículo no tiene contenido.';
    if (!category) return 'Elige una categoría.';
    if (!slug) return 'La URL del artículo es obligatoria.';
    return null;
  };

  const save = async (nextStatus: string) => {
    const error = validate();
    if (error) {
      ToastError(error);
      return;
    }

    try {
      setSaving(true);
      let thumbnailData = null;
      try {
        thumbnailData = await uploadThumbnail();
      } catch (e) {
        ToastError('No se pudo subir la portada; el artículo se guarda sin cambiarla.');
      }

      const base = {
        title: title.trim(),
        description: description.trim(),
        content,
        keywords,
        slug,
        category,
        status: nextStatus,
        series,
        series_order: series ? seriesOrder : 0,
        ...(thumbnailData || {}),
      };

      if (isEdit) {
        const res = await updatePost({ ...base, post_slug: post!.slug } as UpdatePostProps);
        if (res?.status === 200) {
          setStatus(nextStatus);
          setDirty(false);
          ToastSuccess(nextStatus === 'published' ? 'Cambios publicados' : 'Borrador guardado');
          if (slug !== post!.slug) {
            router.replace(`/profile/posts/edit/${slug}`);
          }
        } else {
          ToastError(res?.error || 'No se pudo guardar el artículo');
        }
      } else {
        const res = await createPost(base as CreatePostProps);
        if (res?.status === 201) {
          setDirty(false);
          ToastSuccess(nextStatus === 'published' ? 'Artículo publicado' : 'Borrador creado');
          router.push('/profile/posts');
        } else {
          ToastError(res?.error || 'No se pudo crear el artículo');
        }
      }
    } catch (e) {
      ToastError('No se pudo guardar el artículo');
    } finally {
      setSaving(false);
    }
  };

  const isPublished = status === 'published';

  const actions = (
    <>
      <button
        type="button"
        onClick={() => save('draft')}
        disabled={saving}
        className="btn flex-1 border border-gray-300 hover:bg-gray-50 lg:flex-none dark:border-dark-third dark:hover:bg-dark-second"
      >
        {isPublished ? 'Pasar a borrador' : 'Guardar borrador'}
      </button>
      <button type="button" onClick={() => save('published')} disabled={saving} className="btn-primary flex-1 lg:flex-none">
        {saving ? 'Guardando…' : (isPublished && 'Guardar y publicar') || 'Publicar'}
      </button>
    </>
  );

  return (
    <div className="container-page py-6 pb-28 sm:py-10 lg:pb-10">
      {/* Cabecera */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/profile/posts"
            aria-label="Volver a mis artículos"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-dark-third dark:text-dark-txt dark:hover:bg-dark-second"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
              {isEdit ? 'Editar artículo' : 'Nuevo artículo'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span
                className={`mr-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                }`}
              >
                {isPublished ? 'Publicado' : 'Borrador'}
              </span>
              {dirty ? 'Cambios sin guardar' : `${minutes} min de lectura`}
            </p>
          </div>
        </div>
        <div className="hidden gap-2 lg:flex">
          {isEdit && (
            <a
              href={`/blog/${post!.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              <ArrowTopRightOnSquareIcon className="size-4" aria-hidden="true" />
              {isPublished ? 'Ver' : 'Vista previa'}
            </a>
          )}
          {actions}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Columna principal */}
        <div className="min-w-0 space-y-5">
          <div>
            <label htmlFor="post-title" className="block">
              <span className="sr-only">Título</span>
            <textarea
              id="post-title"
              ref={titleRef}
              rows={1}
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => markDirty(setTitle)(e.target.value.replace(/\n/g, ''))}
              placeholder="Título del artículo"
              className="w-full resize-none overflow-hidden bg-transparent text-3xl font-bold leading-tight tracking-tight text-gray-900 placeholder:text-gray-300 focus:outline-none sm:text-4xl dark:text-white dark:placeholder:text-gray-600"
            />
            </label>
            <p className="text-right text-xs tabular-nums text-gray-400">
              {title.length}/{TITLE_MAX}
            </p>
          </div>

          <div>
            <label htmlFor="post-description" className="block">
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-dark-txt">Descripción</span>
            <textarea
              id="post-description"
              rows={3}
              value={description}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => markDirty(setDescription)(e.target.value)}
              placeholder="Un resumen de una o dos frases. Aparece en las tarjetas y al compartir el enlace."
              className="input resize-y"
            />
            </label>
            <p className="mt-1 text-right text-xs tabular-nums text-gray-400">
              {description.length}/{DESCRIPTION_MAX}
            </p>
          </div>

          <EditRichText
            title="Contenido"
            description="Usa «Título de sección» para crear el índice del artículo."
            data={content}
            setData={markDirty(setContent)}
            placeholder="Escribe tu artículo"
          />
        </div>

        {/* Panel lateral */}
        <aside className="space-y-5">
          <Card title="Portada" description="Recomendado 1200×630 px.">
            <EditImage
              variant="cover"
              data={thumbnail}
              setData={markDirty(setThumbnail)}
              percentage={percentage}
            />
          </Card>

          <Card title="Detalles">
            <div className="space-y-5">
              <div>
                <label htmlFor="post-category" className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-dark-txt">Categoría</span>
                <select
                  id="post-category"
                  value={category}
                  disabled={loadingCategories}
                  onChange={(e) => markDirty(setCategory)(e.target.value)}
                  className="input"
                >
                  <option value="" disabled>
                    Elige una categoría
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                </label>
              </div>

              <div>
                <label htmlFor="post-slug" className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-dark-txt">URL</span>
                <input
                  id="post-slug"
                  value={slug}
                  maxLength={128}
                  onChange={(e) => {
                    setSlugTouched(true);
                    markDirty(setSlug)(
                      e.target.value
                        .toLowerCase()
                        .replace(/\s/g, '-')
                        .replace(/[^a-z0-9-]/g, ''),
                    );
                  }}
                  onBlur={() => setSlug(toSlug(slug))}
                  className="input font-mono text-xs"
                />
                </label>
                <p className="mt-1.5 break-all text-xs text-gray-500 dark:text-gray-400">
                  {SITE_URL.replace('https://', '')}/blog/{slug || '…'}
                </p>
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-dark-txt">Etiquetas</span>
                <TagInput
                  id="post-keywords"
                  value={keywords}
                  onChange={markDirty(setKeywords)}
                  suggestions={tagSuggestions}
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Hasta 8. Enter o coma para añadir. Cada etiqueta tiene su página.
                </p>
              </div>

              <div>
                <label htmlFor="post-series" className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-dark-txt">Serie</span>
                  <select
                    id="post-series"
                    value={creatingSeries ? '__new__' : series}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setCreatingSeries(true);
                        return;
                      }
                      setCreatingSeries(false);
                      markDirty(setSeries)(e.target.value);
                    }}
                    className="input"
                  >
                    <option value="">Sin serie</option>
                    {mySeries.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.title}
                      </option>
                    ))}
                    <option value="__new__">+ Nueva serie…</option>
                  </select>
                </label>
                {creatingSeries && (
                  <div className="mt-2 flex gap-2">
                    <label htmlFor="new-series" className="min-w-0 flex-1">
                      <span className="sr-only">Título de la nueva serie</span>
                      <input
                        id="new-series"
                        value={newSeriesTitle}
                      onChange={(e) => setNewSeriesTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateSeries();
                        }
                      }}
                        placeholder="Título de la serie"
                        className="input"
                      />
                    </label>
                    <button type="button" onClick={handleCreateSeries} className="btn-primary shrink-0 px-3">
                      Crear
                    </button>
                  </div>
                )}
                {series && !creatingSeries && (
                  <label htmlFor="post-series-order" className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-dark-txt-secondary">
                    Parte nº
                    <input
                      id="post-series-order"
                      type="number"
                      min={1}
                      max={99}
                      value={seriesOrder}
                      onChange={(e) => markDirty(setSeriesOrder)(Math.max(1, Number(e.target.value) || 1))}
                      className="input w-20"
                    />
                  </label>
                )}
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {/* Acciones fijas abajo en móvil y tablet */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-dark-third dark:bg-dark-main/95">
        <div className="mx-auto flex max-w-3xl gap-2">{actions}</div>
      </div>
    </div>
  );
}

PostEditor.defaultProps = {
  post: null,
};
