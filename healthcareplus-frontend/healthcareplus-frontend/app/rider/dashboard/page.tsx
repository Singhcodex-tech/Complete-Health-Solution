"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  LogIn,
  ShieldAlert,
  MapPin,
  Clock,
  Package,
  CheckCircle2,
  Send,
  ChevronDown,
  Bike,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type Order, type OrderStatus, type OTPPurpose } from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending assignment",
  assigned: "Assigned — go to pickup",
  picked_up: "Picked up — heading to lab(s)",
  at_lab: "Delivered — awaiting report",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "text-ink-soft bg-paper border-line",
  assigned: "text-primary bg-primary-soft border-primary/30",
  picked_up: "text-accent bg-accent-soft border-accent/30",
  at_lab: "text-accent bg-accent-soft border-accent/30",
  completed: "text-accent bg-accent-soft border-accent/30",
  cancelled: "text-emergency bg-emergency-soft border-emergency/30",
};

export default function RiderDashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!token) return;
    try {
      const data = await api.orders.riderMine(token);
      setOrders(data);
    } catch {
      setError("Couldn't load your assigned orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await api.orders.riderMine(token);
        if (!cancelled) setOrders(data);
      } catch {
        if (!cancelled) setError("Couldn't load your assigned orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <GuardCard
        icon={LogIn}
        title="Log in required"
        message="This dashboard is for HealthCare+ riders only."
        cta={{ href: "/rider/login", label: "Rider Log In" }}
      />
    );
  }

  if (user.role !== "rider") {
    return (
      <GuardCard
        icon={ShieldAlert}
        title="Riders only"
        message={`Your account (${user.email}) is signed in as a ${user.role}, which doesn't have access to this dashboard.`}
      />
    );
  }

  const activeOrders = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Rider dashboard"
        title={`Welcome, ${user.full_name.split(" ")[0]}`}
        description="Your assigned sample pickups. Verify OTP at each checkpoint to move an order forward."
      />

      {error && (
        <div className="mt-6 rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13.5px] text-emergency">
          {error}
        </div>
      )}

      {activeOrders.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-line bg-paper-raised p-12 text-center">
          <Bike className="h-8 w-8 text-ink-soft" />
          <p className="mt-4 text-[14px] text-ink-soft">
            No active orders assigned right now. Check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} token={token!} onChange={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  token,
  onChange,
}: {
  order: Order;
  token: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-sm shadow-ink/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
            <Package className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink">
              Order #{order.id.slice(0, 8)}
            </p>
            <p className="text-[12.5px] text-ink-soft">
              {order.items.length} test{order.items.length > 1 ? "s" : ""}
              {order.lab_dropoffs.length > 1 ? ` · ${order.lab_dropoffs.length} labs` : ""} · ₹
              {order.total_amount.toFixed(0)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${STATUS_COLOR[order.status]}`}
          >
            {STATUS_LABEL[order.status]}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line"
          >
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-start gap-2.5 text-[13.5px] text-ink">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
                {order.pickup_address}
              </div>
              <div className="flex items-center gap-2.5 text-[13.5px] text-ink">
                <Clock className="h-4 w-4 shrink-0 text-ink-soft" />
                {order.pickup_date} at {order.pickup_time}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {order.items.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11.5px] text-ink-soft"
                  >
                    {item.test_name} · {item.lab_company_name} · ₹{item.price.toFixed(0)}
                  </span>
                ))}
              </div>
              {order.notes && (
                <p className="rounded-lg bg-paper px-3 py-2 text-[12.5px] text-ink-soft">
                  Note: {order.notes}
                </p>
              )}

              {order.status === "assigned" && (
                <OtpStep
                  key="pickup"
                  token={token}
                  orderId={order.id}
                  purpose="pickup"
                  title="Next step: verify pickup OTP"
                  hint="Ask the patient for the code sent to their phone."
                  onVerified={onChange}
                />
              )}

              {order.status === "picked_up" && (
                <div className="mt-2 space-y-3">
                  <p className="text-[13px] font-semibold text-ink">
                    Drop off at each lab, verifying as you go
                  </p>
                  {order.lab_dropoffs.map((dropoff) =>
                    dropoff.verified_at ? (
                      <div
                        key={dropoff.lab_company_id}
                        className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent"
                      >
                        <CheckCircle2 className="h-4 w-4" /> {dropoff.lab_company_name} — dropped off
                      </div>
                    ) : (
                      <OtpStep
                        key={dropoff.lab_company_id}
                        token={token}
                        orderId={order.id}
                        purpose="lab_dropoff"
                        labCompanyId={dropoff.lab_company_id}
                        title={`Verify drop-off — ${dropoff.lab_company_name}`}
                        hint="Ask the lab staff to relay the code sent to the patient."
                        onVerified={onChange}
                      />
                    )
                  )}
                </div>
              )}

              {order.status === "at_lab" && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Dropped off at every lab. Report goes to the patient on WhatsApp — no action
                    needed from you. Admin will mark this order complete once it&apos;s delivered.
                  </span>
                </div>
              )}

              {order.status === "pending" && (
                <div className="mt-2 rounded-xl border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
                  Waiting for admin to assign this order.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OtpStep({
  token,
  orderId,
  purpose,
  labCompanyId,
  title,
  hint,
  onVerified,
}: {
  token: string;
  orderId: string;
  purpose: OTPPurpose;
  labCompanyId?: string;
  title: string;
  hint: string;
  onVerified: () => void;
}) {
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const requestOtp = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      await api.orders.requestOtp(token, orderId, purpose, labCompanyId);
      setOtpSent(true);
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Couldn't send OTP.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      await api.orders.verifyOtp(token, orderId, purpose, code, labCompanyId);
      setCode("");
      setOtpSent(false);
      onVerified();
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : "Couldn't verify that code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[12px] text-ink-soft">{hint}</p>

      {!otpSent ? (
        <button
          onClick={requestOtp}
          disabled={busy}
          className="mt-3 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" />
          {busy ? "Sending…" : "Send OTP"}
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            inputMode="numeric"
            placeholder="Enter OTP"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-[13.5px] tracking-[0.25em] outline-none focus:border-primary sm:w-40"
          />
          <button
            onClick={verify}
            disabled={busy || code.length < 4}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {busy ? "Verifying…" : "Verify"}
          </button>
          <button
            onClick={requestOtp}
            disabled={busy}
            className="shrink-0 text-[12.5px] font-medium text-primary hover:underline"
          >
            Resend
          </button>
        </div>
      )}

      {localError && <p className="mt-2 text-[12.5px] text-emergency">{localError}</p>}
    </div>
  );
}

function GuardCard({
  icon: Icon,
  title,
  message,
  cta,
}: {
  icon: typeof LogIn;
  title: string;
  message: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-line bg-paper-raised p-10 text-center shadow-sm shadow-ink/5 my-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-[14.5px] text-ink-soft">{message}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
