"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError, api, onSessionExpired } from "@/lib/api";
import type { User } from "@/types/api";

type Status = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthContextValue {
  user: User | null;
  status: Status;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_FLAG = "documind_session";

function hasSessionFlag(): boolean {
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${SESSION_FLAG}=`));
}

function clearSessionFlag(): void {
  document.cookie = `${SESSION_FLAG}=; Max-Age=0; Path=/`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const loadUser = useCallback(async () => {
    if (!hasSessionFlag()) {
      setStatus("unauthenticated");
      return;
    }
    setStatus("loading");
    try {
      const res = await api<{ user: User }>("/auth/me");
      setUser(res.user);
      setStatus("authenticated");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSessionFlag();
        setStatus("unauthenticated");
      } else {
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(
    () =>
      onSessionExpired(() => {
        clearSessionFlag();
        setUser(null);
        setStatus("unauthenticated");
        toast.error("Your session has expired. Please log in again.");
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(res.user);
    setStatus("authenticated");
    return res.user;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api<{ user: User }>("/auth/register", {
        method: "POST",
        body: { name, email, password },
      });
      setUser(res.user);
      setStatus("authenticated");
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    clearSessionFlag();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, setUser, retry: loadUser }),
    [user, status, login, register, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
