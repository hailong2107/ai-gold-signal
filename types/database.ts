export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      cron_state: {
        Row: {
          id: number;
          last_signal: string | null;
          last_crossover: string | null;
          last_alerted_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          last_signal?: string | null;
          last_crossover?: string | null;
          last_alerted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          last_signal?: string | null;
          last_crossover?: string | null;
          last_alerted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      gold_prices: {
        Row: {
          id: number;
          price: number;
          change: number | null;
          change_percent: number | null;
          high: number | null;
          low: number | null;
          trend: "up" | "down" | "neutral" | null;
          recorded_at: string;
        };
        Insert: {
          price: number;
          change?: number | null;
          change_percent?: number | null;
          high?: number | null;
          low?: number | null;
          trend?: "up" | "down" | "neutral" | null;
          recorded_at?: string;
        };
        Update: {
          price?: number;
          change?: number | null;
          change_percent?: number | null;
          high?: number | null;
          low?: number | null;
          trend?: "up" | "down" | "neutral" | null;
        };
        Relationships: [];
      };
      ai_signals: {
        Row: {
          id: number;
          signal: "BUY" | "SELL" | "HOLD";
          confidence: number | null;
          risk: "Low" | "Medium" | "High" | null;
          analysis: string | null;
          gold_price: number | null;
          rsi: number | null;
          ema20: number | null;
          ema50: number | null;
          macd: number | null;
          macd_signal: number | null;
          macd_histogram: number | null;
          macd_crossover: "bullish" | "bearish" | "none" | null;
          created_at: string;
        };
        Insert: {
          signal: "BUY" | "SELL" | "HOLD";
          confidence?: number | null;
          risk?: "Low" | "Medium" | "High" | null;
          analysis?: string | null;
          gold_price?: number | null;
          rsi?: number | null;
          ema20?: number | null;
          ema50?: number | null;
          macd?: number | null;
          macd_signal?: number | null;
          macd_histogram?: number | null;
          macd_crossover?: "bullish" | "bearish" | "none" | null;
          created_at?: string;
        };
        Update: {
          signal?: "BUY" | "SELL" | "HOLD";
          confidence?: number | null;
          risk?: "Low" | "Medium" | "High" | null;
          analysis?: string | null;
        };
        Relationships: [];
      };
      alert_history: {
        Row: {
          id: number;
          user_id: string;
          signal_id: number | null;
          channel: string;
          success: boolean;
          sent_at: string;
        };
        Insert: {
          user_id: string;
          signal_id?: number | null;
          channel?: string;
          success?: boolean;
          sent_at?: string;
        };
        Update: {
          success?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "alert_history_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_history_signal_id_fkey";
            columns: ["signal_id"];
            referencedRelation: "ai_signals";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          user_id: string;
          telegram_bot_token: string | null;
          telegram_chat_id: string | null;
          alerts_enabled: boolean;
          min_confidence: number;
          alert_on_crossover: boolean;
          alert_on_rsi_breakout: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          telegram_bot_token?: string | null;
          telegram_chat_id?: string | null;
          alerts_enabled?: boolean;
          min_confidence?: number;
          alert_on_crossover?: boolean;
          alert_on_rsi_breakout?: boolean;
          updated_at?: string;
        };
        Update: {
          telegram_bot_token?: string | null;
          telegram_chat_id?: string | null;
          alerts_enabled?: boolean;
          min_confidence?: number;
          alert_on_crossover?: boolean;
          alert_on_rsi_breakout?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
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
}

// Convenience row types
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type GoldPriceRow = Database["public"]["Tables"]["gold_prices"]["Row"];
export type AiSignalRow = Database["public"]["Tables"]["ai_signals"]["Row"];
export type AlertHistoryRow =
  Database["public"]["Tables"]["alert_history"]["Row"];
export type UserSettingsRow =
  Database["public"]["Tables"]["user_settings"]["Row"];
