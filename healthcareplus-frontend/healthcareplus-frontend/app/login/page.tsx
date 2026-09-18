"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { useAuth, ApiError, RiderOtpRequiredError } from "@/contexts/AuthContext";
import VitalsDivider from "@/components/VitalsDivider";
import type { UserRole } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/";
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("patient");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ full_name: fullName, email, phone, password, role });
      }
      router.push(nextPath);
    } catch (err) {
      if (err instanceof RiderOtpRequiredError) {
        router.push(`/rider/login?email=${encodeURIComponent(email)}`);
        return;
      }
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          "Couldn't reach the server. Make sure the backend is running at the configured API URL."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-5rem)] grid-cols-1 lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden overflow-hidden bg-primary-dark px-12 py-16 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative">
          <span className="font-display text-2xl font-semibold text-white">
            HealthCare<span className="text-accent">+</span>
          </span>
          <h1 className="mt-16 max-w-md font-display text-4xl font-semibold leading-tight text-white">
            Care that comes to you, whenever you need it.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/70">
            Sign in to book doctors, nurses and diagnostics, track your
            appointments and manage your family&apos;s care — all from one
            account.
          </p>
        </div>

        <div className="relative space-y-4">
          <div className="flex items-center gap-3 text-white/80">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="text-[14px]">Verified doctors & nurses, background-checked</span>
          </div>
          <div className="flex items-center gap-3 text-white/80">
            <HeartPulse className="h-5 w-5 text-accent" />
            <span className="text-[14px]">18-minute average emergency response</span>
          </div>
          <VitalsDivider color="rgba(255,255,255,0.4)" className="mt-6 max-w-xs" />
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center px-5 py-14 md:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex rounded-full border border-line bg-paper p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 rounded-full py-2.5 text-[13.5px] font-semibold transition-colors ${
                  mode === m
                    ? "bg-primary text-white shadow-sm"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="font-display text-2xl font-semibold text-ink">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1.5 text-[13.5px] text-ink-soft">
                {mode === "login"
                  ? "Log in to manage your bookings and care team."
                  : "Takes less than a minute — no credit card needed."}
              </p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                {mode === "register" && (
                  <>
                    <FieldWrap icon={User}>
                      <input
                        required
                        type="text"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputClass}
                      />
                    </FieldWrap>
                    <FieldWrap icon={Phone}>
                      <input
                        required
                        type="tel"
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                      />
                    </FieldWrap>
                  </>
                )}

                <FieldWrap icon={Mail}>
                  <input
                    required
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </FieldWrap>

                <FieldWrap icon={Lock}>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </FieldWrap>

                {mode === "register" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-ink">
                      I am a
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["patient", "doctor"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`rounded-xl border py-2.5 text-[13.5px] font-medium capitalize transition-colors ${
                            role === r
                              ? "border-primary bg-primary-soft text-primary"
                              : "border-line text-ink-soft"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13px] text-emergency">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  {loading
                    ? "Please wait…"
                    : mode === "login"
                      ? "Log In"
                      : "Create Account"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-ink-soft">
                {mode === "login" ? (
                  <>
                    New to HealthCare+?{" "}
                    <button
                      onClick={() => setMode("register")}
                      className="font-semibold text-primary"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      onClick={() => setMode("login")}
                      className="font-semibold text-primary"
                    >
                      Log in
                    </button>
                  </>
                )}
              </p>
              <p className="mt-3 text-center text-[12.5px] text-ink-soft">
                <Link href="/" className="hover:text-primary">
                  ← Back to home
                </Link>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-paper-raised py-3 pl-10 pr-10 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

function FieldWrap({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
      {children}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
