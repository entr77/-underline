export type User = {
  id: string;
  username: string;
  bio?: string;
  occupation?: string;
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

export type CardStyle = "photo" | "text";

export type Underline = {
  id: string;
  user: User;
  book: Book;
  content: string;
  page_number?: number;
  image_url?: string;
  card_style?: CardStyle;
  is_public: boolean;
  like_count: number;
  is_liked?: boolean;
  created_at: string;
};
