import { IMedia } from '../media/IMedia';

export interface ICommentAuthor {
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  verified: boolean;
  profile_picture: IMedia | null;
}

export interface IComment {
  id: string;
  user: string;
  author: ICommentAuthor | null;
  post: string;
  parent: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  replies_count: number;
}

export interface ICommentPage {
  results: IComment[];
  count: number;
  next: string | null;
  /** Solo en la lista principal: comentarios + respuestas */
  extra_data?: { total: number };
}
