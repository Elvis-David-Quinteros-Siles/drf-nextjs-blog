import { IComment, ICommentPage } from '@/interfaces/blog/IComment';

const BASE = '/api/blog/comments';

async function request(action: string, init: RequestInit & { query?: Record<string, string | number> } = {}) {
  const { query, ...rest } = init;
  const qs = query ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}` : '';
  const res = await fetch(`${BASE}/${action}${qs}`, {
    ...rest,
    headers: { Accept: 'application/json', ...(rest.body && { 'Content-Type': 'application/json' }) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error || data?.detail || 'Error en la petición') as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function listComments(slug: string, page = 1): Promise<ICommentPage> {
  return request('list', { method: 'GET', query: { slug, p: page, page_size: 10 } });
}

export async function listReplies(commentId: string, page = 1): Promise<ICommentPage> {
  return request('replies', { method: 'GET', query: { comment_id: commentId, p: page, page_size: 20 } });
}

export async function createComment(slug: string, content: string): Promise<IComment> {
  return (await request('create', { method: 'POST', body: JSON.stringify({ slug, content }) })).results;
}

export async function replyToComment(commentId: string, content: string): Promise<IComment> {
  return (await request('reply', { method: 'POST', body: JSON.stringify({ comment_id: commentId, content }) }))
    .results;
}

export async function updateComment(commentId: string, content: string): Promise<IComment> {
  return (await request('update', { method: 'PUT', body: JSON.stringify({ comment_id: commentId, content }) }))
    .results;
}

export async function deleteComment(commentId: string): Promise<void> {
  await request('delete', { method: 'DELETE', query: { comment_id: commentId } });
}

/** Texto plano del usuario → HTML seguro (párrafos y saltos de línea). */
export function textToHtml(text: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** HTML guardado → texto para editar. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}
