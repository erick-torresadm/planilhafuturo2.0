/**
 * Simple auth provider for local development.
 * No real authentication — always provides a mock user.
 * Swap for real auth (Supabase/Auth.js) in production.
 */

import { createContext, useContext, type ReactNode } from "react";

type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type AuthContext = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthContext>({
  user: { id: "local-dev-user", email: "dev@local.dev", name: "Você" },
  loading: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContext = {
    user: { id: "local-dev-user", email: "dev@local.dev", name: "Você" },
    loading: false,
    logout: async () => {},
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
