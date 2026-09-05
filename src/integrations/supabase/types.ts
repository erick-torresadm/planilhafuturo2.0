export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assinaturas: {
        Row: {
          created_at: string | null;
          id: string;
          plano: string | null;
          status: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          plano?: string | null;
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          plano?: string | null;
          status?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assinaturas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      caixinhas: {
        Row: {
          atual: number | null;
          created_at: string | null;
          icone: string | null;
          id: string;
          meta: number | null;
          nome: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          atual?: number | null;
          created_at?: string | null;
          icone?: string | null;
          id?: string;
          meta?: number | null;
          nome: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          atual?: number | null;
          created_at?: string | null;
          icone?: string | null;
          id?: string;
          meta?: number | null;
          nome?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "caixinhas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      club_event_rsvps: {
        Row: {
          created_at: string | null;
          event_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          event_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "club_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_event_rsvps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      club_events: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          scheduled_at: string;
          tier_required: string;
          title: string;
          type: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          scheduled_at: string;
          tier_required?: string;
          title: string;
          type: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          scheduled_at?: string;
          tier_required?: string;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      club_lessons: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          modulo: string | null;
          ordem: number;
          published: boolean;
          tier_required: string;
          title: string;
          updated_at: string | null;
          video_url: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          modulo?: string | null;
          ordem?: number;
          published?: boolean;
          tier_required?: string;
          title: string;
          updated_at?: string | null;
          video_url?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          modulo?: string | null;
          ordem?: number;
          published?: boolean;
          tier_required?: string;
          title?: string;
          updated_at?: string | null;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "club_lessons_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      club_memberships: {
        Row: {
          billing_method: string | null;
          cancel_renewal: boolean;
          created_at: string | null;
          current_period_end: string | null;
          current_period_start: string | null;
          gateway_txid: string | null;
          id: string;
          plan: string;
          renewal_notice_sent_at: string | null;
          source: string;
          status: string;
          updated_at: string | null;
          user_id: string;
          valor_pago: number | null;
        };
        Insert: {
          billing_method?: string | null;
          cancel_renewal?: boolean;
          created_at?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          gateway_txid?: string | null;
          id?: string;
          plan: string;
          renewal_notice_sent_at?: string | null;
          source: string;
          status: string;
          updated_at?: string | null;
          user_id: string;
          valor_pago?: number | null;
        };
        Update: {
          billing_method?: string | null;
          cancel_renewal?: boolean;
          created_at?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          gateway_txid?: string | null;
          id?: string;
          plan?: string;
          renewal_notice_sent_at?: string | null;
          source?: string;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
          valor_pago?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "club_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      club_posts: {
        Row: {
          author_id: string;
          channel: string;
          content: string;
          created_at: string | null;
          id: string;
          pinned: boolean;
        };
        Insert: {
          author_id: string;
          channel: string;
          content: string;
          created_at?: string | null;
          id?: string;
          pinned?: boolean;
        };
        Update: {
          author_id?: string;
          channel?: string;
          content?: string;
          created_at?: string | null;
          id?: string;
          pinned?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "club_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      compras_avulsas: {
        Row: {
          created_at: string | null;
          id: string;
          item: string;
          status: string | null;
          txid: string | null;
          updated_at: string | null;
          user_id: string;
          valor: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item: string;
          status?: string | null;
          txid?: string | null;
          updated_at?: string | null;
          user_id: string;
          valor: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item?: string;
          status?: string | null;
          txid?: string | null;
          updated_at?: string | null;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "compras_avulsas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      convites: {
        Row: {
          aceito_em: string | null;
          aceito_por: string | null;
          criado_em: string;
          email: string | null;
          expira_em: string;
          id: string;
          owner_id: string;
          role: string;
          status: string;
          token: string;
        };
        Insert: {
          aceito_em?: string | null;
          aceito_por?: string | null;
          criado_em?: string;
          email?: string | null;
          expira_em: string;
          id?: string;
          owner_id: string;
          role?: string;
          status?: string;
          token: string;
        };
        Update: {
          aceito_em?: string | null;
          aceito_por?: string | null;
          criado_em?: string;
          email?: string | null;
          expira_em?: string;
          id?: string;
          owner_id?: string;
          role?: string;
          status?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "convites_aceito_por_fkey";
            columns: ["aceito_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "convites_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crm_membros: {
        Row: {
          criado_em: string;
          nome: string | null;
          papel: string;
          user_id: string;
        };
        Insert: {
          criado_em?: string;
          nome?: string | null;
          papel: string;
          user_id: string;
        };
        Update: {
          criado_em?: string;
          nome?: string | null;
          papel?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      crm_perfis: {
        Row: {
          arquivo_path: string | null;
          atualizado_em: string;
          codigos_reserva: string[];
          criado_em: string;
          data_nascimento: string | null;
          email: string | null;
          fa2_key: string | null;
          id: string;
          id_perfil: string | null;
          login: string | null;
          notas: string | null;
          plataforma: string;
          preco_pago: number | null;
          preco_vendido: number | null;
          raw_texto: string | null;
          senha: string | null;
          status: string;
          tags: string[];
          uploaded_by: string | null;
        };
        Insert: {
          arquivo_path?: string | null;
          atualizado_em?: string;
          codigos_reserva?: string[];
          criado_em?: string;
          data_nascimento?: string | null;
          email?: string | null;
          fa2_key?: string | null;
          id?: string;
          id_perfil?: string | null;
          login?: string | null;
          notas?: string | null;
          plataforma?: string;
          preco_pago?: number | null;
          preco_vendido?: number | null;
          raw_texto?: string | null;
          senha?: string | null;
          status?: string;
          tags?: string[];
          uploaded_by?: string | null;
        };
        Update: {
          arquivo_path?: string | null;
          atualizado_em?: string;
          codigos_reserva?: string[];
          criado_em?: string;
          data_nascimento?: string | null;
          email?: string | null;
          fa2_key?: string | null;
          id?: string;
          id_perfil?: string | null;
          login?: string | null;
          notas?: string | null;
          plataforma?: string;
          preco_pago?: number | null;
          preco_vendido?: number | null;
          raw_texto?: string | null;
          senha?: string | null;
          status?: string;
          tags?: string[];
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
      desejos: {
        Row: {
          created_at: string | null;
          id: string;
          item: string;
          observacao: string | null;
          parcelado: boolean | null;
          qtd_parcelas: number | null;
          tipo: string | null;
          updated_at: string | null;
          user_id: string;
          valor: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item: string;
          observacao?: string | null;
          parcelado?: boolean | null;
          qtd_parcelas?: number | null;
          tipo?: string | null;
          updated_at?: string | null;
          user_id: string;
          valor?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item?: string;
          observacao?: string | null;
          parcelado?: boolean | null;
          qtd_parcelas?: number | null;
          tipo?: string | null;
          updated_at?: string | null;
          user_id?: string;
          valor?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "desejos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      focos_diarios: {
        Row: {
          created_at: string | null;
          data: string;
          feito: boolean | null;
          id: string;
          ordem: number | null;
          texto: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          data: string;
          feito?: boolean | null;
          id?: string;
          ordem?: number | null;
          texto: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          data?: string;
          feito?: boolean | null;
          id?: string;
          ordem?: number | null;
          texto?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "focos_diarios_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      gastos_fixos: {
        Row: {
          ativo: boolean | null;
          categoria: string;
          created_at: string | null;
          descricao: string;
          dia: number | null;
          forma: string | null;
          frequencia: string | null;
          id: string;
          mes_anual: number | null;
          nota: string | null;
          parcela_atual: number | null;
          parcela_total: number | null;
          tipo: string | null;
          updated_at: string | null;
          user_id: string;
          valor: number;
        };
        Insert: {
          ativo?: boolean | null;
          categoria: string;
          created_at?: string | null;
          descricao: string;
          dia?: number | null;
          forma?: string | null;
          frequencia?: string | null;
          id?: string;
          mes_anual?: number | null;
          nota?: string | null;
          parcela_atual?: number | null;
          parcela_total?: number | null;
          tipo?: string | null;
          updated_at?: string | null;
          user_id: string;
          valor?: number;
        };
        Update: {
          ativo?: boolean | null;
          categoria?: string;
          created_at?: string | null;
          descricao?: string;
          dia?: number | null;
          forma?: string | null;
          frequencia?: string | null;
          id?: string;
          mes_anual?: number | null;
          nota?: string | null;
          parcela_atual?: number | null;
          parcela_total?: number | null;
          tipo?: string | null;
          updated_at?: string | null;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "gastos_fixos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      habitos: {
        Row: {
          ativo: boolean | null;
          cor: string | null;
          created_at: string | null;
          dias_semana: number[] | null;
          icone: string | null;
          id: string;
          meta_semanal: number | null;
          nome: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          ativo?: boolean | null;
          cor?: string | null;
          created_at?: string | null;
          dias_semana?: number[] | null;
          icone?: string | null;
          id?: string;
          meta_semanal?: number | null;
          nome: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          ativo?: boolean | null;
          cor?: string | null;
          created_at?: string | null;
          dias_semana?: number[] | null;
          icone?: string | null;
          id?: string;
          meta_semanal?: number | null;
          nome?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habitos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      habitos_registros: {
        Row: {
          created_at: string | null;
          data: string;
          feito: boolean | null;
          habito_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          data: string;
          feito?: boolean | null;
          habito_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          data?: string;
          feito?: boolean | null;
          habito_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habitos_registros_habito_id_fkey";
            columns: ["habito_id"];
            isOneToOne: false;
            referencedRelation: "habitos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "habitos_registros_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      investimentos: {
        Row: {
          created_at: string | null;
          data: string | null;
          id: string;
          nome: string;
          posicao_atual: number | null;
          renda: string | null;
          tipo: string | null;
          updated_at: string | null;
          user_id: string;
          valor_aplicado: number | null;
          vencimento: string | null;
        };
        Insert: {
          created_at?: string | null;
          data?: string | null;
          id?: string;
          nome: string;
          posicao_atual?: number | null;
          renda?: string | null;
          tipo?: string | null;
          updated_at?: string | null;
          user_id: string;
          valor_aplicado?: number | null;
          vencimento?: string | null;
        };
        Update: {
          created_at?: string | null;
          data?: string | null;
          id?: string;
          nome?: string;
          posicao_atual?: number | null;
          renda?: string | null;
          tipo?: string | null;
          updated_at?: string | null;
          user_id?: string;
          valor_aplicado?: number | null;
          vencimento?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "investimentos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lancamentos: {
        Row: {
          created_at: string | null;
          data: string;
          descricao: string | null;
          id: string;
          tipo: string;
          updated_at: string | null;
          user_id: string;
          valor: number;
        };
        Insert: {
          created_at?: string | null;
          data: string;
          descricao?: string | null;
          id?: string;
          tipo: string;
          updated_at?: string | null;
          user_id: string;
          valor?: number;
        };
        Update: {
          created_at?: string | null;
          data?: string;
          descricao?: string | null;
          id?: string;
          tipo?: string;
          updated_at?: string | null;
          user_id?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lancamentos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notas: {
        Row: {
          coluna: string;
          conteudo: string | null;
          created_at: string | null;
          etiqueta: string | null;
          id: string;
          ordem: number | null;
          titulo: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          coluna?: string;
          conteudo?: string | null;
          created_at?: string | null;
          etiqueta?: string | null;
          id?: string;
          ordem?: number | null;
          titulo: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          coluna?: string;
          conteudo?: string | null;
          created_at?: string | null;
          etiqueta?: string | null;
          id?: string;
          ordem?: number | null;
          titulo?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacoes: {
        Row: {
          corpo: string;
          created_at: string | null;
          dedupe_key: string | null;
          id: string;
          ref_email: string | null;
          ref_plano: string | null;
          ref_user_id: string | null;
          ref_valor: number | null;
          tipo: string;
          titulo: string;
        };
        Insert: {
          corpo: string;
          created_at?: string | null;
          dedupe_key?: string | null;
          id?: string;
          ref_email?: string | null;
          ref_plano?: string | null;
          ref_user_id?: string | null;
          ref_valor?: number | null;
          tipo: string;
          titulo: string;
        };
        Update: {
          corpo?: string;
          created_at?: string | null;
          dedupe_key?: string | null;
          id?: string;
          ref_email?: string | null;
          ref_plano?: string | null;
          ref_user_id?: string | null;
          ref_valor?: number | null;
          tipo?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notificacoes_ref_user_id_fkey";
            columns: ["ref_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      parcelas: {
        Row: {
          cartao: string | null;
          categoria: string | null;
          created_at: string | null;
          data: string;
          descricao: string;
          id: string;
          nota: string | null;
          parcela_inicial: number | null;
          qtd_parcelas: number;
          updated_at: string | null;
          user_id: string;
          valor_total: number;
        };
        Insert: {
          cartao?: string | null;
          categoria?: string | null;
          created_at?: string | null;
          data: string;
          descricao: string;
          id?: string;
          nota?: string | null;
          parcela_inicial?: number | null;
          qtd_parcelas?: number;
          updated_at?: string | null;
          user_id: string;
          valor_total?: number;
        };
        Update: {
          cartao?: string | null;
          categoria?: string | null;
          created_at?: string | null;
          data?: string;
          descricao?: string;
          id?: string;
          nota?: string | null;
          parcela_inicial?: number | null;
          qtd_parcelas?: number;
          updated_at?: string | null;
          user_id?: string;
          valor_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "parcelas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pomodoros: {
        Row: {
          created_at: string | null;
          data: string;
          duracao_min: number | null;
          id: string;
          tarefa: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          data: string;
          duracao_min?: number | null;
          id?: string;
          tarefa?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          data?: string;
          duracao_min?: number | null;
          id?: string;
          tarefa?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pomodoros_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pre_pagamentos: {
        Row: {
          activated_at: string | null;
          created_at: string | null;
          email: string;
          id: string;
          pagamento_metodo: string | null;
          paid_at: string | null;
          plano: string;
          status: string;
          txid: string | null;
          user_id: string | null;
          valor: number;
        };
        Insert: {
          activated_at?: string | null;
          created_at?: string | null;
          email: string;
          id?: string;
          pagamento_metodo?: string | null;
          paid_at?: string | null;
          plano: string;
          status?: string;
          txid?: string | null;
          user_id?: string | null;
          valor?: number;
        };
        Update: {
          activated_at?: string | null;
          created_at?: string | null;
          email?: string;
          id?: string;
          pagamento_metodo?: string | null;
          paid_at?: string | null;
          plano?: string;
          status?: string;
          txid?: string | null;
          user_id?: string | null;
          valor?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          meses_reserva_emergencia: number | null;
          meta_renda_fixa: number | null;
          migration_completed_at: string | null;
          nome: string | null;
          onboarding_completed: boolean | null;
          plano: string | null;
          positivo_em: string | null;
          renda_mensal: number | null;
          saldo_inicial: number | null;
          trial_ends_at: string | null;
          trial_started_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id: string;
          meses_reserva_emergencia?: number | null;
          meta_renda_fixa?: number | null;
          migration_completed_at?: string | null;
          nome?: string | null;
          onboarding_completed?: boolean | null;
          plano?: string | null;
          positivo_em?: string | null;
          renda_mensal?: number | null;
          saldo_inicial?: number | null;
          trial_ends_at?: string | null;
          trial_started_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          meses_reserva_emergencia?: number | null;
          meta_renda_fixa?: number | null;
          migration_completed_at?: string | null;
          nome?: string | null;
          onboarding_completed?: boolean | null;
          plano?: string | null;
          positivo_em?: string | null;
          renda_mensal?: number | null;
          saldo_inicial?: number | null;
          trial_ends_at?: string | null;
          trial_started_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string | null;
          endpoint: string;
          p256dh: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          auth: string;
          created_at?: string | null;
          endpoint: string;
          p256dh: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string | null;
          endpoint?: string;
          p256dh?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tarefas: {
        Row: {
          created_at: string | null;
          data: string | null;
          descricao: string;
          id: string;
          status: string | null;
          tipo: string | null;
          updated_at: string | null;
          user_id: string;
          valor: number | null;
        };
        Insert: {
          created_at?: string | null;
          data?: string | null;
          descricao: string;
          id?: string;
          status?: string | null;
          tipo?: string | null;
          updated_at?: string | null;
          user_id: string;
          valor?: number | null;
        };
        Update: {
          created_at?: string | null;
          data?: string | null;
          descricao?: string;
          id?: string;
          status?: string | null;
          tipo?: string | null;
          updated_at?: string | null;
          user_id?: string;
          valor?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tarefas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          source: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          source?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          source?: string | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          criado_em: string;
          member_id: string;
          owner_id: string;
          role: string;
        };
        Insert: {
          criado_em?: string;
          member_id: string;
          owner_id: string;
          role?: string;
        };
        Update: {
          criado_em?: string;
          member_id?: string;
          owner_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      crm_perfis_safe: {
        Row: {
          atualizado_em: string | null;
          criado_em: string | null;
          data_nascimento: string | null;
          id: string | null;
          id_perfil: string | null;
          plataforma: string | null;
          status: string | null;
          tags: string[] | null;
          uploaded_by: string | null;
        };
        Insert: {
          atualizado_em?: string | null;
          criado_em?: string | null;
          data_nascimento?: string | null;
          id?: string | null;
          id_perfil?: string | null;
          plataforma?: string | null;
          status?: string | null;
          tags?: string[] | null;
          uploaded_by?: string | null;
        };
        Update: {
          atualizado_em?: string | null;
          criado_em?: string | null;
          data_nascimento?: string | null;
          id?: string | null;
          id_perfil?: string | null;
          plataforma?: string | null;
          status?: string | null;
          tags?: string[] | null;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      club_tier: { Args: { uid: string }; Returns: string };
      club_tier_rank: { Args: { t: string }; Returns: number };
      crm_is_admin: { Args: never; Returns: boolean };
      crm_is_membro: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;
