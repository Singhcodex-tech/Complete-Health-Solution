"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ShieldCheck, ArrowRight, Bike, KeyRound } from "lucide-react";
import { useAuth, ApiError } from "@/contexts/AuthContext";

function RiderLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { requestRiderOtp, verifyRiderOtp } = useAuth();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const uid = await requestRiderOtp(email, password);
      setUserId(uid);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyRiderOtp(userId, code);
      router.push("/rider/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't verify that code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-5 py-14">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
            <Bike className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink">
            Rider Sign In
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-soft">
            Sample pickup & delivery — HealthCare+ field app.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "credentials" ? (
            <motion.form
              key="credentials"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={handleCredentials}
              className="space-y-4"
            >
              <FieldWrap icon={Mail}>
                <input
                  required
                  type="email"
                  placeholder="Rider email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </FieldWrap>
              <FieldWrap icon={Lock}>
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </FieldWrap>

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {loading ? "Sending OTP…" : "Continue"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="otp"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={handleOtp}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                We texted a 6-digit code to your registered phone number.
              </div>
              <FieldWrap icon={KeyRound}>
                <input
                  required
                  inputMode="numeric"
                  autoFocus
                  placeholder="Enter OTP"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${inputClass} tracking-[0.3em]`}
                />
              </FieldWrap>

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading || code.length < 4}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
              >
                {loading ? "Verifying…" : "Verify & Sign In"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setCode("");
                  setError(null);
                }}
                className="w-full text-center text-[13px] font-medium text-ink-soft hover:text-primary"
              >
                ← Use a different account
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-6 text-center text-[12.5px] text-ink-soft">
          <Link href="/" className="hover:text-primary">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13px] text-emergency">
      {message}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-paper-raised py-3 pl-10 pr-4 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

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

export default function RiderLoginPage() {
  return (
    <Suspense fallback={null}>
      <RiderLoginForm />
    </Suspense>
  );
}
