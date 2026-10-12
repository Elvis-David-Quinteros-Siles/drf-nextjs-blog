import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { ToastError } from '@/components/toast/alerts';
import { IPost } from '@/interfaces/blog/IPost';
import { RootState } from '@/redux/reducers';
import likePost, { LikePostProps } from '@/utils/api/blog/post/like';
import unLikePost from '@/utils/api/blog/post/unlike';

interface ComponentProps {
  post: IPost;
}

export default function Like({ post }: ComponentProps) {
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [loading, setLoading] = useState<boolean>(false);
  const [postLiked, setPostLiked] = useState<boolean>(post?.has_liked);
  const [postLikes, setPostLikes] = useState<number>(post?.likes_count || 0);

  const handleLike = async () => {
    // Sin sesión, enviar al login y volver al artículo después
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(router.asPath)}`);
      return;
    }
    try {
      setLoading(true);
      const likePostData: LikePostProps = { slug: post?.slug };
      const res = postLiked ? await unLikePost(likePostData) : await likePost(likePostData);
      if (res?.status === 200) {
        setPostLikes(postLikes + (postLiked ? -1 : 1));
        setPostLiked(!postLiked);
      } else {
        ToastError('No se pudo registrar tu me gusta');
      }
    } catch (e) {
      ToastError('No se pudo registrar tu me gusta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={loading}
      aria-pressed={postLiked}
      aria-label={postLiked ? 'Quitar me gusta' : 'Me gusta'}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
        postLiked
          ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400'
          : 'border-gray-200 text-gray-700 hover:border-rose-200 hover:text-rose-600 dark:border-dark-third dark:text-dark-txt dark:hover:text-rose-400'
      }`}
    >
      {postLiked ? <HeartSolidIcon className="size-5" /> : <HeartIcon className="size-5" />}
      {postLikes}
    </button>
  );
}
