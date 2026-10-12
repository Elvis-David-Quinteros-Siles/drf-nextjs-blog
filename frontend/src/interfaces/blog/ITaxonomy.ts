import { ICommentAuthor } from './IComment';

export interface ITag {
  name: string;
  slug: string;
  posts_count?: number;
}

export interface ISeriesBrief {
  id: string;
  title: string;
  slug: string;
  description: string;
  posts_count: number;
}

export interface ISeries {
  id: string;
  title: string;
  slug: string;
  description: string;
  author: ICommentAuthor | null;
  posts: { title: string; slug: string; order: number }[];
}
