"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  History,
  ListPlus,
  Loader2,
  Undo2,
  UploadCloud,
} from "lucide-react";
import {
  api,
  ApiError,
  type PriceUploadReport,
  type TestListImportResult,
  type UploadHistoryItem,
  type UploadJob,
} from "@/lib/api";

const MAX_MB = 10;
const POLL_MS = 1000;

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

function MasterTestList({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<TestListImportResult | null>(null);
  const [busy, setBusy] = useState<"dry" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (dry: boolean) => {
    if (!file) return;
    setBusy(dry ? "dry" : "save");
    setError(null);
    try {
      setRes(await api.prices.importTestList(token, file, dry));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-line bg-paper p-4">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
        <ListPlus className="h-4 w-4 text-primary" /> Step 1 — Master test list (one-time setup)
      </div>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        Upload a file with test names in the first column. Names already in the list are skipped, so it is safe to repeat.
      </p>
      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-[13px] text-ink-soft hover:border-primary">
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          <span className="truncate">{file ? file.name : "Choose a .csv or .xlsx of test names…"}</span>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setRes(null);
              setError(f && !/\.(csv|xlsx)$/i.test(f.name) ? "Only .csv and .xlsx files are accepted." : null);
              setFile(f && /\.(csv|xlsx)$/i.test(f.name) ? f : null);
            }}
          />
        </label>
        <button onClick={() => run(true)} disabled={!file || busy !== null} className="shrink-0 rounded-lg border border-line px-4 py-2.5 text-[13px] font-semibold text-ink hover:border-primary disabled:opacity-50">
          {busy === "dry" ? "Checking…" : "Check"}
        </button>
        <button onClick={() => run(false)} disabled={!file || busy !== null} className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
          {busy === "save" ? "Saving…" : "Save to master list"}
        </button>
      </div>
      {error && <p className="mt-3 text-[12.5px] text-emergency">{error}</p>}
      {res && (
        <div className="mt-3 rounded-lg border border-line bg-paper-raised p-3 text-[12.5px] text-ink-soft">
          <div className={`font-medium ${res.committed ? "text-accent" : "text-primary-dark"}`}>
            {res.committed ? "Saved. " : "Check only — nothing saved. "}
            {res.added} {res.committed ? "added" : "would be added"}, {res.already_existed} already existed, {res.duplicates_in_file} duplicate
            {res.duplicates_in_file === 1 ? "" : "s"} in file. Master list total: {res.master_total.toLocaleString()}.
          </div>
          {res.too_long_rows.length > 0 && <div className="mt-1 text-emergency">Skipped rows with names over 500 characters: {res.too_long_rows.join(", ")}</div>}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ job }: { job: UploadJob }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-center justify-between text-[13px] text-ink">
        <span className="flex items-center gap-2 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> {job.stage}
        </span>
        <span className="font-mono-tight text-ink-soft">{job.progress}%</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(3, job.progress)}%` }} />
      </div>
      <p className="mt-2 text-[12px] text-ink-soft">
        You can keep this page open. Large files take a little while; nothing is saved until you confirm.
      </p>
    </div>
  );
}

function UploadHistory({ token, refreshKey, onMessage }: { token: string; refreshKey: number; onMessage: (m: string) => void }) {
  const [items, setItems] = useState<UploadHistoryItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.prices
      .uploadHistory(token)
      .then((r) => !cancelled && setItems(r))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey, version]);

  const undo = async (item: UploadHistoryItem) => {
    if (!window.confirm(`Undo "${item.filename}"? Prices it changed go back to what they were before.`)) return;
    setBusyId(item.id);
    try {
      let job = await api.prices.undoUpload(token, item.id);
      while (job.status === "queued" || job.status === "running") {
        await new Promise((r) => setTimeout(r, POLL_MS));
        job = await api.prices.getJob(token, job.id);
      }
      onMessage(job.status === "done" ? (job.message ?? "Undone.") : (job.error ?? "Undo failed."));
    } catch (e) {
      onMessage(e instanceof ApiError ? e.message : "Undo failed.");
    } finally {
      setBusyId(null);
      setVersion((v) => v + 1);
    }
  };

  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
        <History className="h-4 w-4 text-primary" /> Recent uploads
      </div>
      <ul className="mt-3 divide-y divide-line">
        {items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[12.5px]">
            <div className="min-w-0">
              <div className="truncate font-medium text-ink">
                {it.kind === "undo" ? "Undo of " : ""}
                {it.filename}
                {it.status === "undone" && <span className="ml-2 rounded-full bg-paper-raised px-2 py-0.5 text-[11px] text-ink-soft">undone</span>}
                {it.status === "failed" && <span className="ml-2 rounded-full bg-emergency-soft px-2 py-0.5 text-[11px] text-emergency">failed</span>}
              </div>
              <div className="text-ink-soft">
                {new Date(it.created_at + "Z").toLocaleString()} {it.by ? `· ${it.by}` : ""}
                {(it.message || it.error) && <span className="block">{it.message ?? it.error}</span>}
              </div>
            </div>
            {it.can_undo && (
              <button
                onClick={() => undo(it)}
                disabled={busyId !== null}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink hover:border-primary disabled:opacity-50"
              >
                {busyId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />} Undo
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PriceUploadPanel({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [autoCreate, setAutoCreate] = useState(false);
  const [allowPartial, setAllowPartial] = useState(false);
  const [report, setReport] = useState<PriceUploadReport | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [job, setJob] = useState<UploadJob | null>(null); // job currently running (for the progress bar)
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Poll until the job leaves queued/running. Tolerates a few network blips. */
  const waitFor = useCallback(
    async (first: UploadJob): Promise<UploadJob> => {
      let current = first;
      let misses = 0;
      setJob(current);
      while (alive.current && (current.status === "queued" || current.status === "running")) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        try {
          current = await api.prices.getJob(token, current.id);
          misses = 0;
          if (alive.current) setJob(current);
        } catch (e) {
          if (++misses >= 5) throw e;
        }
      }
      return current;
    },
    [token]
  );

  const pick = (f: File | null) => {
    setReport(null);
    setPreviewJobId(null);
    setError(null);
    setNotice(null);
    if (!f) return setFile(null);
    if (!/\.(csv|xlsx)$/i.test(f.name)) {
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
    setError(null);
    setNotice(null);
    setReport(null);
    setPreviewJobId(null);
    try {
      const done = await waitFor(await api.prices.startUpload(token, file, { mode: "preview", autoCreateTests: autoCreate }));
      if (done.status === "done" && done.report) {
        setReport(done.report);
        setPreviewJobId(done.id);
      } else {
        setError(done.error ?? "Couldn't read that file.");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lost connection while checking the file.");
    } finally {
      setJob(null);
    }
  };

  const runCommit = async () => {
    if (!previewJobId) return;
    setError(null);
    try {
      const done = await waitFor(await api.prices.commitPreview(token, previewJobId, allowPartial));
      if (done.report) setReport(done.report);
      if (done.status === "done") {
        setPreviewJobId(null);
        setNotice("Saved. You can undo this upload from Recent uploads below.");
      } else {
        setError(done.error ?? "Saving failed. Nothing was changed.");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lost connection while saving. Check Recent uploads before retrying.");
    } finally {
      setJob(null);
      setHistoryKey((k) => k + 1);
    }
  };

  const applySuggestion = async (alias: string, testId: string) => {
    try {
      await api.prices.addAlias(token, alias, testId);
      setNotice(`"${alias}" will now be matched automatically. Re-checking the file…`);
      await runPreview();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save that match.");
    }
  };

  const s = report?.summary;
  const hasErrors = (s?.errors ?? 0) > 0;
  const nothingToSave = !!s && s.prices_updated === 0;
  const busy = job !== null;
  const canConfirm = !!report && report.dry_run && !!previewJobId && !nothingToSave && (!hasErrors || allowPartial) && !busy;

  return (
    <div className="mt-8 rounded-2xl border border-line bg-paper-raised shadow-sm shadow-ink/5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-5 text-left">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
            <UploadCloud className="h-5 w-5 text-primary" />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold text-ink">Bulk price upload (all labs, all branches)</span>
            <span className="block text-[12.5px] text-ink-soft">
              One file: column A = tests, other headers = LabName(PinCode), cells = price. Empty = not offered.
            </span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-5 border-t border-line p-5">
          <MasterTestList token={token} />
          <div className="text-[13.5px] font-semibold text-ink">Step 2 — Upload prices</div>

          <div className="rounded-xl border border-line bg-paper p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-line bg-paper px-4 py-3 text-[13.5px] text-ink-soft hover:border-primary">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span className="truncate">{file ? file.name : `Choose a .csv or .xlsx file (max ${MAX_MB} MB)…`}</span>
                <input type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
              </label>
              <button
                onClick={runPreview}
                disabled={!file || busy}
                className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-[13.5px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" /> Validate &amp; preview
              </button>
            </div>
            <label className="mt-4 flex items-start gap-2 text-[13px] text-ink-soft">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={autoCreate}
                onChange={(e) => {
                  setAutoCreate(e.target.checked);
                  setReport(null);
                  setPreviewJobId(null);
                }}
              />
              <span>
                Auto-create test names that are not in the master list
                <span className="block text-[12px]">Off = unmatched tests are skipped and listed in the report.</span>
              </span>
            </label>
          </div>

          {job && <ProgressBar job={job} />}

          {notice && (
            <div className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[13.5px] text-accent">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13.5px] text-emergency">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {report && s && (
            <section className="space-y-6">
              <div
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-medium ${
                  report.committed ? "border-accent/30 bg-accent-soft text-accent" : "border-line bg-primary-soft text-primary-dark"
                }`}
              >
                {report.committed ? <CheckCircle2 className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                {report.committed ? "Saved. " : report.dry_run ? "Preview — nothing saved yet. Would save: " : "Not saved. "}
                {report.message}
              </div>

              {s.big_changes > 0 && report.dry_run && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-400/50 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <b>{s.big_changes.toLocaleString()}</b> price{s.big_changes > 1 ? "s change" : " changes"} by more than 50%. Check the flagged rows below
                    for typos (an extra zero is common) before saving.
                  </span>
                </div>
              )}

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
                  <p className="mt-1 text-[12px] text-ink-soft">
                    If one is just another spelling of an existing test, click the closest match. It is remembered for every future upload.
                  </p>
                  <ul className="mt-3 max-h-72 space-y-2 overflow-auto">
                    {report.unmatched_tests.map((t) => (
                      <li key={t.name} className="rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px]">
                        <span className="font-medium text-emergency">{t.name}</span>
                        <span className="ml-1 text-ink-soft">({t.count} price{t.count > 1 ? "s" : ""})</span>
                        {t.suggestions.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-ink-soft">Did you mean:</span>
                            {t.suggestions.map((sg) => (
                              <button
                                key={sg.id}
                                disabled={busy}
                                onClick={() => applySuggestion(t.name, sg.id)}
                                className="rounded-full border border-primary/30 bg-primary-soft px-2.5 py-0.5 text-[12px] font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                              >
                                {sg.name}
                              </button>
                            ))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[12px] text-ink-soft">Or tick &ldquo;Auto-create&rdquo; above and validate again to add them as new tests.</p>
                </div>
              )}

              {report.preview_rows.length > 0 && (
                <div className="rounded-2xl border border-line bg-paper-raised p-5">
                  <div className="text-[14px] font-semibold text-ink">
                    Parsed preview <span className="font-normal text-ink-soft">(first {report.preview_rows.length}; suspicious changes first)</span>
                  </div>
                  <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-line">
                    <table className="w-full text-left text-[12.5px]">
                      <thead className="sticky top-0 bg-paper text-ink-soft">
                        <tr><th className="px-3 py-2">Lab</th><th className="px-3 py-2">Pin</th><th className="px-3 py-2">Test</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2">Status</th></tr>
                      </thead>
                      <tbody>
                        {report.preview_rows.map((r, i) => (
                          <tr key={i} className={`border-t border-line ${r.warning ? "bg-amber-50" : ""}`}>
                            <td className="px-3 py-1.5">{r.lab}</td>
                            <td className="px-3 py-1.5 font-mono-tight">{r.pin_code}</td>
                            <td className="px-3 py-1.5">{r.test}</td>
                            <td className="px-3 py-1.5 text-right">
                              {r.old_price !== null && r.status === "changed" && <span className="mr-1.5 text-ink-soft line-through">₹{r.old_price}</span>}₹{r.price}
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.status === "new" ? "bg-accent-soft text-accent" : r.status === "changed" ? "bg-primary-soft text-primary" : "bg-paper text-ink-soft"}`}>{r.status}</span>
                              {r.warning && r.change_pct !== null && (
                                <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                  {r.change_pct > 0 ? "+" : ""}{r.change_pct}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {report.dry_run && previewJobId && (
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-paper-raised p-5">
                  {hasErrors && (
                    <label className="flex items-center gap-2 text-[13px] text-ink-soft">
                      <input type="checkbox" checked={allowPartial} onChange={(e) => setAllowPartial(e.target.checked)} />
                      Import valid rows only, skip the {s.errors} error{s.errors > 1 ? "s" : ""}
                    </label>
                  )}
                  <button
                    onClick={runCommit}
                    disabled={!canConfirm}
                    className="ml-auto flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Confirm &amp; save {s.prices_updated.toLocaleString()} prices
                  </button>
                  {nothingToSave && <span className="text-[12.5px] text-ink-soft">Nothing new or changed to save.</span>}
                </div>
              )}
            </section>
          )}

          <UploadHistory token={token} refreshKey={historyKey} onMessage={setNotice} />
        </div>
      )}
    </div>
  );
}
