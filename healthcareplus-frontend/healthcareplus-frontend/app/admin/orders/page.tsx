"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  LogIn,
  ShieldAlert,
  IndianRupee,
  Package,
  Bike,
  Plus,
  ChevronDown,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  api,
  ApiError,
  type Order,
  type OrderStatus,
  type Rider,
  type AnalyticsSummary,
} from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  picked_up: "Picked Up",
  at_lab: "At Lab",
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

export default function AdminOrdersPage() {
  const { user, token, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    if (!token) return;
    try {
      const [ordersData, ridersData, analyticsData] = await Promise.all([
        api.orders.all(token),
        api.riders.list(token),
        api.orders.analytics(token),
      ]);
      setOrders(ordersData);
      setRiders(ridersData);
      setAnalytics(analyticsData);
    } catch {
      setError("Couldn't load order data from the backend.");
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
        const [ordersData, ridersData, analyticsData] = await Promise.all([
          api.orders.all(token),
          api.riders.list(token),
          api.orders.analytics(token),
        ]);
        if (!cancelled) {
          setOrders(ordersData);
          setRiders(ridersData);
          setAnalytics(analyticsData);
        }
      } catch {
        if (!cancelled) setError("Couldn't load order data from the backend.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

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
        message="This dashboard is restricted to admin accounts."
        cta={{ href: "/login?next=/admin/orders", label: "Log In" }}
      />
    );
  }

  if (user.role !== "admin") {
    return (
      <GuardCard
        icon={ShieldAlert}
        title="Admins only"
        message={`Your account (${user.email}) is signed in as a ${user.role}, which doesn't have access to this dashboard.`}
      />
    );
  }

  const filteredOrders =
    statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Admin dashboard"
        title="Orders & delivery operations"
        description="Track every sample pickup, assign riders, and see revenue in one place."
      />

      <AnimatePresence>
        {notice && <Banner tone="accent" text={notice} />}
        {error && <Banner tone="emergency" text={error} />}
      </AnimatePresence>

      {analytics && <AnalyticsCards analytics={analytics} />}

      <RiderManager
        token={token!}
        riders={riders}
        onChange={() => {
          refresh();
          setNotice("Rider account created.");
        }}
        onError={setError}
      />

      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-ink">Orders</h3>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "pending", "assigned", "picked_up", "at_lab", "completed", "cancelled"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                    statusFilter === s
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-line text-ink-soft hover:border-primary/40"
                  }`}
                >
                  {s === "all" ? "All" : STATUS_LABEL[s]}
                </button>
              )
            )}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <p className="mt-6 text-[13.5px] text-ink-soft">No orders match this filter.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-line">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-paper">
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Order</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Pickup</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Tests</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Amount</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Status</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Rider</th>
                  <th className="px-4 py-2.5 font-medium text-ink-soft">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    riders={riders}
                    token={token!}
                    onAssigned={() => {
                      refresh();
                      setNotice("Rider assigned.");
                    }}
                    onError={setError}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsCards({ analytics }: { analytics: AnalyticsSummary }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        icon={Package}
        label="Total orders"
        value={analytics.total_orders.toString()}
      />
      <StatCard
        icon={IndianRupee}
        label="Total revenue"
        value={`₹${analytics.total_revenue.toLocaleString("en-IN")}`}
      />
      <StatCard
        icon={Bike}
        label="Active riders"
        value={analytics.rider_performance.length.toString()}
      />

      <div className="rounded-2xl border border-line bg-paper-raised p-5 sm:col-span-3">
        <p className="text-[13px] font-semibold text-ink">Orders by status</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(analytics.orders_by_status).map(([status, count]) => (
            <span
              key={status}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium capitalize ${
                STATUS_COLOR[status as OrderStatus] ?? "border-line text-ink-soft"
              }`}
            >
              {status.replace("_", " ")}: {count}
            </span>
          ))}
        </div>
      </div>

      {Object.keys(analytics.revenue_by_lab).length > 0 && (
        <div className="rounded-2xl border border-line bg-paper-raised p-5 sm:col-span-3">
          <p className="text-[13px] font-semibold text-ink">Revenue by lab</p>
          <div className="mt-3 space-y-2">
            {Object.entries(analytics.revenue_by_lab).map(([lab, revenue]) => (
              <div key={lab} className="flex items-center justify-between text-[13px]">
                <span className="text-ink-soft">{lab}</span>
                <span className="font-mono-tight font-semibold text-ink">
                  ₹{revenue.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.rider_performance.length > 0 && (
        <div className="rounded-2xl border border-line bg-paper-raised p-5 sm:col-span-3">
          <p className="text-[13px] font-semibold text-ink">Rider performance</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 font-medium text-ink-soft">Rider</th>
                  <th className="py-2 font-medium text-ink-soft">Assigned</th>
                  <th className="py-2 font-medium text-ink-soft">Completed</th>
                  <th className="py-2 font-medium text-ink-soft">Revenue handled</th>
                </tr>
              </thead>
              <tbody>
                {analytics.rider_performance.map((r) => (
                  <tr key={r.rider_id} className="border-b border-line last:border-0">
                    <td className="py-2 text-ink">{r.rider_name}</td>
                    <td className="py-2 text-ink-soft">{r.orders_assigned}</td>
                    <td className="py-2 text-ink-soft">{r.orders_completed}</td>
                    <td className="py-2 font-mono-tight text-ink-soft">
                      ₹{r.revenue_handled.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <p className="mt-3 font-mono-tight text-2xl font-semibold text-ink">{value}</p>
      <p className="text-[12.5px] text-ink-soft">{label}</p>
    </div>
  );
}

function OrderRow({
  order,
  riders,
  token,
  onAssigned,
  onError,
}: {
  order: Order;
  riders: Rider[];
  token: string;
  onAssigned: () => void;
  onError: (msg: string) => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [completing, setCompleting] = useState(false);

  const handleAssign = async (riderId: string) => {
    if (!riderId) return;
    setAssigning(true);
    try {
      await api.orders.assignRider(token, order.id, riderId);
      onAssigned();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't assign rider.");
    } finally {
      setAssigning(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.orders.complete(token, order.id);
      onAssigned();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't mark this order complete.");
    } finally {
      setCompleting(false);
    }
  };

  const labNames = Array.from(new Set(order.items.map((i) => i.lab_company_name)));
  const dropoffsDone = order.lab_dropoffs.filter((d) => d.verified_at).length;

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-2.5 font-mono-tight text-ink">#{order.id.slice(0, 8)}</td>
      <td className="px-4 py-2.5 text-ink-soft">
        {order.pickup_date} · {order.pickup_time}
      </td>
      <td className="px-4 py-2.5 text-ink-soft">
        {order.items.length} test(s)
        {labNames.length > 1 ? (
          <span className="ml-1.5 text-[11.5px] text-ink-soft/70">
            ({labNames.length} labs
            {order.status === "picked_up" ? ` · ${dropoffsDone}/${labNames.length} dropped off` : ""})
          </span>
        ) : (
          labNames[0] && <span className="ml-1.5 text-[11.5px] text-ink-soft/70">({labNames[0]})</span>
        )}
      </td>
      <td className="px-4 py-2.5 font-mono-tight text-ink">₹{order.total_amount.toFixed(0)}</td>
      <td className="px-4 py-2.5">
        <span
          className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${STATUS_COLOR[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {order.status === "pending" ? (
          <select
            disabled={assigning}
            defaultValue=""
            onChange={(e) => handleAssign(e.target.value)}
            className="rounded-lg border border-line bg-paper-raised px-2.5 py-1.5 text-[12.5px] outline-none focus:border-primary"
          >
            <option value="" disabled>
              {assigning ? "Assigning…" : "Assign rider"}
            </option>
            {riders.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-ink-soft">
            {riders.find((r) => r.id === order.rider_id)?.full_name ?? "—"}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {order.status === "at_lab" && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {completing ? "Marking…" : "Mark complete"}
          </button>
        )}
      </td>
    </tr>
  );
}

function RiderManager({
  token,
  riders,
  onChange,
  onError,
}: {
  token: string;
  riders: Rider[];
  onChange: () => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.riders.create(token, { full_name: fullName, email, phone, password });
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setOpen(false);
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't create rider account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line bg-paper-raised p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
          <UserPlus className="h-4 w-4 text-primary" /> Riders ({riders.length}) — add new
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
              <input
                required
                type="tel"
                placeholder="Phone (for OTP + assignments)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <input
                required
                type="password"
                minLength={6}
                placeholder="Temporary password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-dark disabled:opacity-60 sm:col-span-2"
              >
                <Plus className="h-4 w-4" />
                {submitting ? "Creating…" : "Create rider account"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {riders.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {riders.map((r) => (
            <span
              key={r.id}
              className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] text-ink-soft"
            >
              <CheckCircle2 className="h-3 w-3 text-accent" /> {r.full_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Banner({ tone, text }: { tone: "accent" | "emergency"; text: string }) {
  const cls =
    tone === "accent"
      ? "border-accent/30 bg-accent-soft text-accent"
      : "border-emergency/30 bg-emergency-soft text-emergency";
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`mt-6 rounded-xl border px-4 py-3 text-[13.5px] ${cls}`}
    >
      {text}
    </motion.div>
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

const inputClass =
  "w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-primary";
