import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nome?: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: "AuthProvider não montado" }),
  signUp: async () => ({ error: "AuthProvider não montado", needsConfirmation: false }),
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    // Hydrate session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Se veio de um link de convite, retorna para a página de aceite após login
      if (event === "SIGNED_IN") {
        const invite = sessionStorage.getItem("planilhafuturo_pending_invite");
        if (invite) {
          sessionStorage.removeItem("planilhafuturo_pending_invite");
          window.location.href = `/convite/${invite}`;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { error: null };
    const msg =
      error.message === "Invalid login credentials" ? "Email ou senha incorretos" :
      error.message.includes("Email not confirmed") ? "Confirme seu email antes de fazer login. Verifique sua caixa de entrada." :
      error.message;
    return { error: msg };
  }

  async function signUp(email: string, password: string, nome?: string) {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { name: nome || "Usuário" },
      },
    });
    if (error) {
      const msg =
        error.message.includes("already registered") ? "Este email já está cadastrado" :
        error.message.includes("Password should be") ? "Senha deve ter no mínimo 6 caracteres" :
        error.message;
      return { error: msg, needsConfirmation: false };
    }

    // If no session, email confirmation is required
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  }

  async function signInWithGoogle() {
    try {
      // OAuth nativo do Supabase — redirect de página inteira. Funciona em
      // qualquer host (Vercel), diferente do Lovable Cloud Auth que precisava
      // dos endpoints server-side ~oauth/initiate (só existem na infra da Lovable).
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      // A session é restaurada no retorno pelo persistSession + onAuthStateChange
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      toast?.error(err.message || "Erro ao fazer login com Google");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    qc.clear();
    window.location.href = "/auth";
  }

  return (
    <Ctx.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
