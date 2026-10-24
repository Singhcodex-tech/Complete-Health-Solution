"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  LogIn,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  api,
  ApiError,
  PriceUploadBlockedError,
  type PriceUploadReport,
} from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";

const MAX_MB = 10;

function downloadErrorsCsv(report: PriceUploadReport) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = ["row,column,reason", ...report.errors.map((e) => [e.row, e.column, e.reason].map(esc).join(","))];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "price-upload-errors.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  const color = tone === "bad" ? "text-emergency" : tone === "good" ? "text-accent" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-paper-raised px-4 py-3">
      <div className={`font-display text-2xl font-semibold ${color}`}>{value.toLocaleString()}</div>
      <div className="text-[12px] text-ink-soft">{label}</div>
    </div>
  );
}

function GateCard({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto my-16 flex max-w-lg flex-col items-center rounded-2xl border border-line bg-paper-raised p-10 text-center shadow-sm shadow-ink/5">
      {icon}
      <h2 className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-[14.5px] text-ink-soft">{text}</p>
      {action}
    </div>
  );
}

export default function PriceUploadPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [autoCreate, setAutoCreate] = useState(false);
  const [allowPartial, setAllowPartial] = useState(false);
  const [report, setReport] = useState<PriceUploadReport | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user || !token) {
    return (
      <GateCard
        icon={<LogIn className="h-6 w-6 text-primary" />}
        title="Log in required"
        text="This page is restricted to admin accounts."
        action={
          <Link href="/login?next=/admin/price-upload" className="mt-6 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark">
            Log In
          </Link>
        }
      />
    );
  }
  if (user.role !== "admin") {
    return (
      <GateCard
        icon={<ShieldAlert className="h-6 w-6 text-emergency" />}
        title="Admins only"
        text={`Your account (${user.email}) is a ${user.role} and cannot upload prices.`}
      />
    );
  }

  const pick = (f: File | null) => {
    setReport(null);
    setError(null);
    if (!f) return setFile(null);
    const okExt = /\.(csv|xlsx)$/i.test(f.name);
    if (!okExt) {
      setFile(null);
      return setError("Only .csv and .xlsx files are accepted.");
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      return setError(`File is larger than ${MAX_MB} MB.`);
    }
    setFile(f);
  };

  const runPreview = async () => {
    if (!file) return;
    setBusy("preview");
    setError(null);
    setReport(null);
    try {
      setReport(await api.prices.preview(token, file, { autoCreateTests: autoCreate }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(null);
    }
  };

  const runCommit = async () => {
    if (!file) return;
    setBusy("commit");
    setError(null);
    try {
      setReport(await api.prices.commit(token, file, { autoCreateTests: autoCreate, allowPartial }));
    } catch (e) {
      if (e instanceof PriceUploadBlockedError) {
        setReport(e.report);
        setError(e.message);
      } else {
        setError(e instanceof ApiError ? e.message : "Upload failed.");
      }
    } finally {
      setBusy(null);
    }
  };

  const s = report?.summary;
  const hasErrors = (s?.errors ?? 0) > 0;
  const nothingToSave = !!s && s.prices_updated === 0;
  const canConfirm = !!report && report.dry_run && !nothingToSave && (!hasErrors || allowPartial);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Admin dashboard"
        title="Bulk price upload"
        description="One file, many labs. Column A = test names; every other header = LabName(PinCode); cells = price in rupees, empty = not offered. Long-format CSV (lab_name, pin_code, test_name, price) also works."
      />

      <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-5 shadow-sm shadow-ink/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-line bg-paper px-4 py-3 text-[13.5px] text-ink-soft hover:border-primary">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span className="truncate">{file ? file.name : `Choose a .csv or .xlsx file (max ${MAX_MB} MB)…`}</span>
            <input type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          <button
            onClick={runPreview}
            disabled={!file || busy !== null}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-[13.5px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Validate &amp; preview
          </button>
        </div>
        <label className="mt-4 flex items-start gap-2 text-[13px] text-ink-soft">
          <input type="checkbox" className="mt-0.5" checked={autoCreate} onChange={(e) => { setAutoCreate(e.target.checked); setReport(null); }} />
          <span>
            Auto-create test names that are not in the master list
            <span className="block text-[12px]">Off = unmatched tests are skipped and listed in the report.</span>
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13.5px] text-emergency">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {report && s && (
        <section className="mt-8 space-y-6">
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-medium ${
              report.committed ? "border-accent/30 bg-accent-soft text-accent" : "border-line bg-primary-soft text-primary-dark"
            }`}
          >
            {report.committed ? <CheckCircle2 className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
            {report.committed ? "Saved. " : report.dry_run ? "Preview — nothing saved yet. Would save: " : "Not saved. "}
            {report.message}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <Stat label="New prices" value={s.new} tone="good" />
            <Stat label="Changed" value={s.changed} />
            <Stat label="Unchanged" value={s.unchanged} />
            <Stat label="Branches touched" value={s.branches} />
            <Stat label="New branches" value={s.new_branches} />
            <Stat label="New tests" value={s.new_tests} />
            <Stat label="Unmatched tests" value={s.unmatched_tests} tone={s.unmatched_tests ? "bad" : undefined} />
            <Stat label="Errors" value={s.errors} tone={s.errors ? "bad" : undefined} />
          </div>

          {report.errors.length > 0 && (
            <div className="rounded-2xl border border-emergency/30 bg-paper-raised p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-emergency">
                  <AlertTriangle className="h-4 w-4" /> {s.errors} error{s.errors > 1 ? "s" : ""}
                  {report.errors_truncated && <span className="font-normal text-ink-soft">(first {report.errors.length} shown)</span>}
                </div>
                <button onClick={() => downloadErrorsCsv(report)} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-primary">
                  <Download className="h-3.5 w-3.5" /> Download error list
                </button>
              </div>
              <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-line">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="sticky top-0 bg-paper text-ink-soft">
                    <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Column</th><th className="px-3 py-2">Reason</th></tr>
                  </thead>
                  <tbody>
                    {report.errors.map((e, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-3 py-1.5 font-mono-tight">{e.row}</td>
                        <td className="px-3 py-1.5 font-mono-tight">{e.column}</td>
                        <td className="px-3 py-1.5 text-ink">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.unmatched_tests.length > 0 && (
            <div className="rounded-2xl border border-line bg-paper-raised p-5">
              <div className="text-[14px] font-semibold text-ink">
                {report.unmatched_tests.length} test name{report.unmatched_tests.length > 1 ? "s" : ""} not in the master list — skipped
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {report.unmatched_tests.map((t) => (
                  <li key={t.name} className="rounded-full bg-emergency-soft px-3 py-1 text-[12px] text-emergency">
                    {t.name} <span className="opacity-70">({t.count})</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-ink-soft">Tick &ldquo;Auto-create&rdquo; above and validate again to add them.</p>
            </div>
          )}

          {report.preview_rows.length > 0 && (
            <div className="rounded-2xl border border-line bg-paper-raised p-5">
              <div className="text-[14px] font-semibold text-ink">
                Parsed preview <span className="font-normal text-ink-soft">(first {report.preview_rows.length}, changes first)</span>
              </div>
              <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-line">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="sticky top-0 bg-paper text-ink-soft">
                    <tr><th className="px-3 py-2">Lab</th><th className="px-3 py-2">Pin</th><th className="px-3 py-2">Test</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2">Status</th></tr>
                  </thead>
                  <tbody>
                    {report.preview_rows.map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-3 py-1.5">{r.lab}</td>
                        <td className="px-3 py-1.5 font-mono-tight">{r.pin_code}</td>
                        <td className="px-3 py-1.5">{r.test}</td>
                        <td className="px-3 py-1.5 text-right">
                          {r.old_price !== null && r.status === "changed" && <span className="mr-1.5 text-ink-soft line-through">₹{r.old_price}</span>}₹{r.price}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.status === "new" ? "bg-accent-soft text-accent" : r.status === "changed" ? "bg-primary-soft text-primary" : "bg-paper text-ink-soft"}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.dry_run && (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-paper-raised p-5">
              {hasErrors && (
                <label className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <input type="checkbox" checked={allowPartial} onChange={(e) => setAllowPartial(e.target.checked)} />
                  Import valid rows only, skip the {s.errors} error{s.errors > 1 ? "s" : ""}
                </label>
              )}
              <button
                onClick={runCommit}
                disabled={!canConfirm || busy !== null}
                className="ml-auto flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy === "commit" && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm &amp; save {s.prices_updated.toLocaleString()} prices
              </button>
              {nothingToSave && <span className="text-[12.5px] text-ink-soft">Nothing new or changed to save.</span>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
