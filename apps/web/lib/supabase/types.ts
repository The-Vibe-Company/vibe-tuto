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
      desktop_connections: {
        Row: { id: string; challenge: string; user_id: string | null; token_id: string | null; issued_at: string | null; expires_at: string; created_at: string };
        Insert: { id?: string; challenge: string; user_id?: string | null; token_id?: string | null; issued_at?: string | null; expires_at?: string; created_at?: string };
        Update: { user_id?: string | null; token_id?: string | null; issued_at?: string | null };
        Relationships: [];
      };

      sources: {
        Row: {
          id: string;
          tutorial_id: string | null;
          order_index: number;
          screenshot_url: string | null;
          text_content: string | null;
          click_x: number | null;
          click_y: number | null;
          viewport_width: number | null;
          viewport_height: number | null;
          click_type: string | null;
          url: string | null;
          timestamp_start: number | null;
          timestamp_end: number | null;
          annotations: Json | null;
          element_info: Json | null;
          app_bundle_id: string | null;
          app_name: string | null;
          window_title: string | null;
          action_type: string | null;
          auto_caption: string | null;
          recording_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutorial_id?: string | null;
          order_index: number;
          screenshot_url?: string | null;
          text_content?: string | null;
          click_x?: number | null;
          click_y?: number | null;
          viewport_width?: number | null;
          viewport_height?: number | null;
          click_type?: string | null;
          url?: string | null;
          timestamp_start?: number | null;
          timestamp_end?: number | null;
          annotations?: Json | null;
          element_info?: Json | null;
          app_bundle_id?: string | null;
          app_name?: string | null;
          window_title?: string | null;
          action_type?: string | null;
          auto_caption?: string | null;
          recording_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tutorial_id?: string | null;
          order_index?: number;
          screenshot_url?: string | null;
          text_content?: string | null;
          click_x?: number | null;
          click_y?: number | null;
          viewport_width?: number | null;
          viewport_height?: number | null;
          click_type?: string | null;
          url?: string | null;
          timestamp_start?: number | null;
          timestamp_end?: number | null;
          annotations?: Json | null;
          element_info?: Json | null;
          app_bundle_id?: string | null;
          app_name?: string | null;
          window_title?: string | null;
          action_type?: string | null;
          auto_caption?: string | null;
          recording_id?: string | null;
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
      tutorials: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string | null;
          slug: string | null;
          visibility: string;
          public_token: string | null;
          published_at: string | null;
          is_public: boolean;
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
          visibility?: string;
          public_token?: string | null;
          published_at?: string | null;
          is_public?: boolean;
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
          visibility?: string;
          public_token?: string | null;
          published_at?: string | null;
          is_public?: boolean;
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
          source_id?: string | null;
          step_type?: string;
          order_index: number;
          screenshot_url: string | null;
          text_content: string | null;
          description: string | null;
          timestamp_start: number | null;
          timestamp_end: number | null;
          click_x: number | null;
          click_y: number | null;
          click_type: string | null;
          url: string | null;
          viewport_width: number | null;
          viewport_height: number | null;
          annotations: Json | null;
          element_info: Json | null;
          show_url: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tutorial_id?: string | null;
          source_id?: string | null;
          step_type?: string;
          order_index: number;
          screenshot_url?: string | null;
          text_content?: string | null;
          description?: string | null;
          timestamp_start?: number | null;
          timestamp_end?: number | null;
          click_x?: number | null;
          click_y?: number | null;
          click_type?: string | null;
          url?: string | null;
          viewport_width?: number | null;
          viewport_height?: number | null;
          annotations?: Json | null;
          element_info?: Json | null;
          show_url?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tutorial_id?: string | null;
          source_id?: string | null;
          step_type?: string;
          order_index?: number;
          screenshot_url?: string | null;
          text_content?: string | null;
          description?: string | null;
          timestamp_start?: number | null;
          timestamp_end?: number | null;
          click_x?: number | null;
          click_y?: number | null;
          click_type?: string | null;
          url?: string | null;
          viewport_width?: number | null;
          viewport_height?: number | null;
          annotations?: Json | null;
          element_info?: Json | null;
          show_url?: boolean | null;
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
      approve_desktop_connection: { Args: { connection_id: string; approving_user_id: string }; Returns: string };
      exchange_desktop_connection: { Args: { connection_id: string; verifier: string }; Returns: Json };
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
