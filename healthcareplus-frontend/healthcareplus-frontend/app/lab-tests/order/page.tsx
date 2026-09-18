"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  LogIn,
  CheckCircle2,
  MapPin,
  CalendarClock,
  IndianRupee,
  FlaskConical,
  ArrowRight,
  X,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type Order } from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";
import { LAB_SELECTION_STORAGE_KEY, type StoredLabSelection } from "@/lib/data";

export default function OrderLabTestPage() {
  const { user, token, loading: authLoading } = useAuth();

  const [selection, setSelection] = useState<StoredLabSelection[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.sessionStorage.getItem(LAB_SELECTION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredLabSelection[]) : [];
    } catch {
      return [];
    }
  });
  const [selectionLoaded] = useState(true);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    api.patients
      .me(token)
      .then((profile) => {
        if (cancelled || !profile?.address) return;
        const parts = [profile.address, profile.city, profile.pincode].filter(Boolean);
        setAddress(parts.join(", "));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const total = selection.reduce((sum, t) => sum + t.price, 0);

  const removeTest = (testId: string, companyId: string) => {
    setSelection((prev) => {
      const next = prev.filter((t) => !(t.testId === testId && t.companyId === companyId));
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(LAB_SELECTION_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || selection.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      // One order per booking, even if the tests span several labs — the
      // rider still verifies drop-off at each lab individually behind the
      // scenes, but the patient and admin only ever see a single order.
      const order = await api.orders.create(token, {
        lab_test_ids: selection.map((i) => i.testId),
        pickup_address: address,
        pickup_date: date,
        pickup_time: `${time}:00`,
        notes: notes || undefined,
      });

      setConfirmedOrder(order);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(LAB_SELECTION_STORAGE_KEY);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't reach the server. Is the backend running?"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !selectionLoaded) {
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
        message="Sign in to book a lab test sample pickup."
        cta={{ href: "/login?next=/lab-tests/order", label: "Log In" }}
      />
    );
  }

  if (user.role !== "patient") {
    return (
      <GuardCard
        icon={LogIn}
        title="Patient accounts only"
        message="This booking flow is for patients. Log in with a patient account to continue."
      />
    );
  }

  if (confirmedOrder) {
    const labNames = Array.from(new Set(confirmedOrder.items.map((i) => i.lab_company_name)));
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <CheckCircle2 className="h-6 w-6 text-accent" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">Order placed</h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">
          Order #{confirmedOrder.id.slice(0, 8)} — ₹{confirmedOrder.total_amount.toFixed(0)} for{" "}
          {confirmedOrder.items.length} test{confirmedOrder.items.length > 1 ? "s" : ""}
          {labNames.length > 1 ? ` across ${labNames.length} labs` : ""}. A rider will be
          assigned for pickup on {confirmedOrder.pickup_date} at {confirmedOrder.pickup_time}.
        </p>
        <div className="mt-6 space-y-2 text-left">
          {confirmedOrder.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-line bg-paper-raised px-4 py-3 text-[13px]"
            >
              <span className="text-ink-soft">
                {item.test_name} · {item.lab_company_name}
              </span>
              <span className="font-mono-tight font-semibold text-ink">
                ₹{item.price.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
        <Link
          href="/lab-partners"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark"
        >
          Book another test
        </Link>
      </div>
    );
  }

  if (selection.length === 0) {
    return (
      <GuardCard
        icon={ClipboardList}
        title="No tests selected yet"
        message="Head over to Compare Labs to choose the tests and labs you want, then come back here to book."
        cta={{ href: "/lab-partners", label: "Compare Labs" }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Lab tests"
        title="Book a sample pickup"
        description="Confirm the tests you picked, then choose when and where a rider should collect the sample."
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <FlaskConical className="h-3.5 w-3.5" /> Select tests
          </label>
          <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-line p-2">
            {selection.map((t) => (
              <div
                key={`${t.companyId}::${t.testId}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-primary-soft px-3 py-2.5 text-[13.5px]"
              >
                <span>
                  <span className="text-ink">{t.testName}</span>{" "}
                  <span className="text-ink-soft">· {t.companyName}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono-tight font-semibold text-ink">
                    ₹{t.price.toFixed(0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTest(t.testId, t.companyId)}
                    aria-label={`Remove ${t.testName}`}
                    className="text-ink-soft hover:text-emergency"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>

        {selection.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary-soft/50 px-4 py-3">
            <span className="text-[13.5px] font-medium text-ink">
              {selection.length} test{selection.length > 1 ? "s" : ""} selected
            </span>
            <span className="flex items-center gap-1 font-mono-tight text-lg font-semibold text-primary">
              <IndianRupee className="h-4 w-4" />
              {total.toFixed(0)}
            </span>
          </div>
        )}

        <div>
          <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <MapPin className="h-3.5 w-3.5" /> Pickup address
          </label>
          <textarea
            required
            rows={2}
            minLength={5}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="House / street / area / city / pincode"
            className="mt-1.5 w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-[14px] outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <CalendarClock className="h-3.5 w-3.5" /> Date
            </label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-[14px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-ink">Time</label>
            <input
              required
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-[14px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-[13px] font-semibold text-ink">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Gate code, landmark, fasting status, etc."
            className="mt-1.5 w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-[14px] outline-none focus:border-primary"
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13.5px] text-emergency"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={submitting || selection.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {submitting ? "Placing order…" : `Book pickup${total > 0 ? ` — ₹${total.toFixed(0)}` : ""}`}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
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
