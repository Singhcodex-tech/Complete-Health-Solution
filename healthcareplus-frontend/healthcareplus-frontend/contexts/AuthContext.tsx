"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, type CurrentUser, type UserRole } from "@/lib/api";

const TOKEN_KEY = "healthcareplus_token";

export class RiderOtpRequiredError extends Error {
  userId: string;
  constructor(userId: string) {
    super("This account requires OTP verification. Use the rider login page.");
    this.userId = userId;
  }
}

type AuthContextValue = {
  user: CurrentUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
  }) => Promise<void>;
  logout: () => void;
  requestRiderOtp: (email: string, password: string) => Promise<string>;
  verifyRiderOtp: (userId: string, code: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const stored = window.localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setToken(stored);
      try {
        const me = await api.auth.me(stored);
        if (!cancelled) setUser(me);
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuthResponse = async (accessToken: string) => {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    const me = await api.auth.me(accessToken);
    setUser(me);
  };

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if ("otp_required" in res) {
      throw new RiderOtpRequiredError(res.user_id);
    }
    await applyAuthResponse(res.access_token);
  };

  const requestRiderOtp = async (email: string, password: string): Promise<string> => {
    const res = await api.auth.login({ email, password });
    if (!("otp_required" in res)) {
      // Shouldn't happen for a rider account, but handle gracefully.
      await applyAuthResponse(res.access_token);
      return res.user_id;
    }
    return res.user_id;
  };

  const verifyRiderOtp = async (userId: string, code: string) => {
    const res = await api.auth.verifyLoginOtp({ user_id: userId, code });
    await applyAuthResponse(res.access_token);
  };

  const register = async (payload: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
  }) => {
    const res = await api.auth.register(payload);
    await applyAuthResponse(res.access_token);
  };

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, requestRiderOtp, verifyRiderOtp }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { ApiError };
