export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          bio: string | null;
          avatar_url: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          bio?: string | null;
          avatar_url?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          bio?: string | null;
          avatar_url?: string | null;
          tags?: string[];
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          kakao_id: string;
          title: string;
          author: string;
          publisher: string | null;
          cover_url: string | null;
          isbn: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kakao_id: string;
          title: string;
          author: string;
          publisher?: string | null;
          cover_url?: string | null;
          isbn?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          author?: string;
          publisher?: string | null;
          cover_url?: string | null;
          isbn?: string | null;
        };
      };
      underlines: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          content: string;
          page_number: number | null;
          image_url: string | null;
          is_public: boolean;
          like_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          content: string;
          page_number?: number | null;
          image_url?: string | null;
          is_public?: boolean;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          page_number?: number | null;
          image_url?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          user_id: string;
          underline_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          underline_id: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
