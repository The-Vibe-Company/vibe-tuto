export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      tutorials: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string | null;
          slug: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          slug?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string | null;
          slug?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutorials_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      steps: {
        Row: {
          id: string;
          tutorial_id: string | null;
          order_index: number;
          screenshot_url: string | null;
          text_content: string | null;
          timestamp_start: number | null;
          timestamp_end: number | null;
          click_x: number | null;
          click_y: number | null;
          click_type: string | null;
          url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutorial_id?: string | null;
          order_index: number;
          screenshot_url?: string | null;
          text_content?: string | null;
          timestamp_start?: number | null;
          timestamp_end?: number | null;
          click_x?: number | null;
          click_y?: number | null;
          click_type?: string | null;
          url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tutorial_id?: string | null;
          order_index?: number;
          screenshot_url?: string | null;
          text_content?: string | null;
          timestamp_start?: number | null;
          timestamp_end?: number | null;
          click_x?: number | null;
          click_y?: number | null;
          click_type?: string | null;
          url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "steps_tutorial_id_fkey";
            columns: ["tutorial_id"];
            isOneToOne: false;
            referencedRelation: "tutorials";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
