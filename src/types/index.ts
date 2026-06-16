export type User = {
  id: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  tags?: string[];
};

export type Book = {
  id: string;
  kakao_id: string;
  title: string;
  author: string;
  publisher?: string;
  cover_url?: string;
};

export type Underline = {
  id: string;
  user: User;
  book: Book;
  content: string;
  page_number?: number;
  image_url?: string;
  is_public: boolean;
  like_count: number;
  is_liked?: boolean;
  created_at: string;
};
