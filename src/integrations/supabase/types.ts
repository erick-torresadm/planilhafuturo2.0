export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          created_at: string | null
          id: string
          plano: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plano?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plano?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      caixinhas: {
        Row: {
          atual: number | null
          created_at: string | null
          icone: string | null
          id: string
          meta: number | null
          nome: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          atual?: number | null
          created_at?: string | null
          icone?: string | null
          id?: string
          meta?: number | null
          nome: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          atual?: number | null
          created_at?: string | null
          icone?: string | null
          id?: string
          meta?: number | null
          nome?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      desejos: {
        Row: {
          created_at: string | null
          id: string
          item: string
          observacao: string | null
          parcelado: boolean | null
          qtd_parcelas: number | null
          tipo: string | null
          updated_at: string | null
          user_id: string
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item: string
          observacao?: string | null
          parcelado?: boolean | null
          qtd_parcelas?: number | null
          tipo?: string | null
          updated_at?: string | null
          user_id: string
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item?: string
          observacao?: string | null
          parcelado?: boolean | null
          qtd_parcelas?: number | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number | null
        }
        Relationships: []
      }
      gastos_fixos: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          descricao: string
          dia: number
          forma: string | null
          frequencia: string | null
          id: string
          mes_anual: number | null
          nota: string | null
          parcela_atual: number | null
          parcela_total: number | null
          tipo: string | null
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string | null
          descricao: string
          dia?: number
          forma?: string | null
          frequencia?: string | null
          id?: string
          mes_anual?: number | null
          nota?: string | null
          parcela_atual?: number | null
          parcela_total?: number | null
          tipo?: string | null
          updated_at?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          descricao?: string
          dia?: number
          forma?: string | null
          frequencia?: string | null
          id?: string
          mes_anual?: number | null
          nota?: string | null
          parcela_atual?: number | null
          parcela_total?: number | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      investimentos: {
        Row: {
          created_at: string | null
          data: string | null
          id: string
          nome: string
          posicao_atual: number | null
          renda: string | null
          tipo: string | null
          updated_at: string | null
          user_id: string
          valor_aplicado: number | null
          vencimento: string | null
        }
        Insert: {
          created_at?: string | null
          data?: string | null
          id?: string
          nome: string
          posicao_atual?: number | null
          renda?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id: string
          valor_aplicado?: number | null
          vencimento?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string | null
          id?: string
          nome?: string
          posicao_atual?: number | null
          renda?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string
          valor_aplicado?: number | null
          vencimento?: string | null
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          created_at: string | null
          data: string
          descricao: string | null
          id: string
          tipo: string
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          data: string
          descricao?: string | null
          id?: string
          tipo: string
          updated_at?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string | null
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      parcelas: {
        Row: {
          cartao: string | null
          categoria: string | null
          created_at: string | null
          data: string
          descricao: string
          id: string
          nota: string | null
          parcela_inicial: number | null
          qtd_parcelas: number
          updated_at: string | null
          user_id: string
          valor_total: number
        }
        Insert: {
          cartao?: string | null
          categoria?: string | null
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          nota?: string | null
          parcela_inicial?: number | null
          qtd_parcelas?: number
          updated_at?: string | null
          user_id: string
          valor_total?: number
        }
        Update: {
          cartao?: string | null
          categoria?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          nota?: string | null
          parcela_inicial?: number | null
          qtd_parcelas?: number
          updated_at?: string | null
          user_id?: string
          valor_total?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          meses_reserva_emergencia: number | null
          meta_renda_fixa: number | null
          nome: string | null
          onboarding_completed: boolean | null
          plano: string | null
          renda_mensal: number | null
          saldo_inicial: number | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          meses_reserva_emergencia?: number | null
          meta_renda_fixa?: number | null
          nome?: string | null
          onboarding_completed?: boolean | null
          plano?: string | null
          renda_mensal?: number | null
          saldo_inicial?: number | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          meses_reserva_emergencia?: number | null
          meta_renda_fixa?: number | null
          nome?: string | null
          onboarding_completed?: boolean | null
          plano?: string | null
          renda_mensal?: number | null
          saldo_inicial?: number | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          created_at: string | null
          data: string | null
          descricao: string
          id: string
          status: string | null
          tipo: string | null
          updated_at: string | null
          user_id: string
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data?: string | null
          descricao: string
          id?: string
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id: string
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string | null
          descricao?: string
          id?: string
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
