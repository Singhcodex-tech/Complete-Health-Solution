"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Save,
  ChevronDown,
  Building2,
  LogIn,
  ShieldAlert,
  Loader2,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type LabCompany, type LabImportResult } from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminLabsPage() {
  const { user, token, loading: authLoading } = useAuth();

  const [companies, setCompanies] = useState<LabCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    api.labs
      .list()
      .then(setCompanies)
      .catch(() => setError("Couldn't load lab data from the backend."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) setLoading(true);
      try {
        const data = await api.labs.list();
        if (!cancelled) setCompanies(data);
      } catch {
        if (!cancelled) setError("Couldn't load lab data from the backend.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-line bg-paper-raised p-10 text-center shadow-sm shadow-ink/5 my-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
          <LogIn className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
          Log in required
        </h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">
          This dashboard is restricted to admin accounts.
        </p>
        <Link
          href="/login?next=/admin/labs"
          className="mt-6 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark"
        >
          Log In
        </Link>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-line bg-paper-raised p-10 text-center shadow-sm shadow-ink/5 my-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emergency-soft">
          <ShieldAlert className="h-6 w-6 text-emergency" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
          Admins only
        </h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">
          Your account ({user.email}) is signed in as a {user.role}, which
          doesn&apos;t have access to this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Admin dashboard"
        title="Manage lab partners & pricing"
        description="Changes here save directly to the database and appear immediately on the public comparison page."
      />

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[13.5px] text-accent"
          >
            {notice}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6 rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13.5px] text-emergency"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AddCompanyForm
        token={token!}
        onCreated={() => {
          refresh();
          setNotice("Lab added.");
        }}
        onError={setError}
      />

      <div className="mt-10 space-y-5">
        {companies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            token={token!}
            onChange={() => refresh()}
            onNotice={setNotice}
            onError={setError}
          />
        ))}
      </div>
    </div>
  );
}

function AddCompanyForm({
  token,
  onCreated,
  onError,
}: {
  token: string;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [established, setEstablished] = useState("");
  const [labsCount, setLabsCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.labs.createCompany(token, {
        slug: slugify(name),
        name,
        tagline,
        established,
        labs_count: labsCount,
      });
      setName("");
      setTagline("");
      setEstablished("");
      setLabsCount("");
      setOpen(false);
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't create the lab.");
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
          <Plus className="h-4 w-4 text-primary" /> Add a new lab
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
                placeholder="Lab name (e.g. Redcliffe Labs)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="Established year (e.g. 2019)"
                value={established}
                onChange={(e) => setEstablished(e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="Tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className={`${inputClass} sm:col-span-2`}
              />
              <input
                placeholder="Labs count (e.g. 2,000+ centres)"
                value={labsCount}
                onChange={(e) => setLabsCount(e.target.value)}
                className={`${inputClass} sm:col-span-2`}
              />
              <button
                type="submit"
                disabled={submitting}
                className="sm:col-span-2 rounded-full bg-primary py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {submitting ? "Adding…" : "Add Lab"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompanyCard({
  company,
  token,
  onChange,
  onNotice,
  onError,
}: {
  company: LabCompany;
  token: string;
  onChange: () => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const deleteCompany = async () => {
    if (!confirm(`Delete ${company.name} and all its tests? This can't be undone.`)) return;
    try {
      await api.labs.deleteCompany(token, company.id);
      onNotice(`${company.name} deleted.`);
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't delete this lab.");
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-paper-raised">
      <div className="flex items-center justify-between gap-3 p-5">
        <button onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display text-[15.5px] font-semibold text-ink">{company.name}</p>
            <p className="text-[12.5px] text-ink-soft">{company.tests.length} tests · /{company.slug}</p>
          </div>
        </button>
        <button
          onClick={deleteCompany}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft hover:border-emergency hover:text-emergency"
          aria-label={`Delete ${company.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button onClick={() => setOpen((v) => !v)} aria-label="Toggle">
          <ChevronDown className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line"
          >
            <div className="p-5">
              <TestsTable
                company={company}
                token={token}
                onChange={onChange}
                onNotice={onNotice}
                onError={onError}
              />
              <ImportTestsForm
                companyId={company.id}
                token={token}
                onImported={(result) => {
                  onChange();
                  onNotice(
                    `Imported ${result.imported_count} of ${result.total_rows} rows` +
                      (result.skipped.length ? ` (${result.skipped.length} skipped).` : ".")
                  );
                }}
                onError={onError}
              />
              <AddTestForm
                companyId={company.id}
                token={token}
                onCreated={() => {
                  onChange();
                  onNotice("Test added.");
                }}
                onError={onError}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TestsTable({
  company,
  token,
  onChange,
  onNotice,
  onError,
}: {
  company: LabCompany;
  token: string;
  onChange: () => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [edits, setEdits] = useState<Record<string, string>>({});

  const savePrice = async (testId: string) => {
    const raw = edits[testId];
    if (raw === undefined) return;
    const price = Number(raw);
    if (Number.isNaN(price) || price < 0) {
      onError("Price must be a valid positive number.");
      return;
    }
    try {
      await api.labs.updateTest(token, testId, { price });
      onNotice("Price updated.");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[testId];
        return next;
      });
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't update the price.");
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm("Delete this test?")) return;
    try {
      await api.labs.deleteTest(token, testId);
      onNotice("Test deleted.");
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't delete this test.");
    }
  };

  if (company.tests.length === 0) {
    return <p className="text-[13.5px] text-ink-soft">No tests yet — add one below.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line bg-paper">
            <th className="px-4 py-2.5 font-medium text-ink-soft">Test</th>
            <th className="px-4 py-2.5 font-medium text-ink-soft">Category</th>
            <th className="px-4 py-2.5 font-medium text-ink-soft">Turnaround</th>
            <th className="px-4 py-2.5 font-medium text-ink-soft">Price (₹)</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {company.tests.map((test) => (
            <tr key={test.id} className="border-b border-line last:border-0">
              <td className="px-4 py-2.5 text-ink">{test.name}</td>
              <td className="px-4 py-2.5 text-ink-soft">{test.category}</td>
              <td className="px-4 py-2.5 text-ink-soft">{test.turnaround}</td>
              <td className="px-4 py-2.5">
                <input
                  type="number"
                  min={0}
                  value={edits[test.id] ?? test.price}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [test.id]: e.target.value }))}
                  className="w-24 rounded-lg border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-primary"
                />
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => savePrice(test.id)}
                    disabled={edits[test.id] === undefined}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-primary hover:text-primary disabled:opacity-40"
                    aria-label="Save price"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteTest(test.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-emergency hover:text-emergency"
                    aria-label="Delete test"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportTestsForm({
  companyId,
  token,
  onImported,
  onError,
}: {
  companyId: string;
  token: string;
  onImported: (result: LabImportResult) => void;
  onError: (msg: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<LabImportResult | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await api.labs.importTests(token, companyId, file);
      setResult(res);
      onImported(res);
      setFile(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't import that file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-dashed border-line bg-paper p-4">
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
        <UploadCloud className="h-4 w-4 text-primary" /> Bulk import from Excel/CSV
      </div>
      <p className="mt-1 text-[12.5px] text-ink-soft">
        Column names don&apos;t need to match exactly — we auto-detect test
        name, category, price, and turnaround from common header variations.
      </p>

      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-[13px] text-ink-soft hover:border-primary">
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          <span className="truncate">{file ? file.name : "Choose a .csv or .xlsx file…"}</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </label>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {uploading ? "Importing…" : "Upload & Import"}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-3 rounded-lg border border-line bg-paper-raised p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-accent">
            <CheckCircle2 className="h-4 w-4" />
            Imported {result.imported_count} of {result.total_rows} rows
          </div>

          <div className="text-[12px] text-ink-soft">
            Detected columns:{" "}
            {Object.entries(result.detected_columns)
              .map(([field, header]) => `${field} → "${header}"`)
              .join(", ")}
          </div>

          {result.skipped.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-[12.5px] font-medium text-emergency">
                <AlertTriangle className="h-3.5 w-3.5" /> {result.skipped.length} row
                {result.skipped.length > 1 ? "s" : ""} skipped
              </div>
              <ul className="mt-1.5 space-y-1 pl-1">
                {result.skipped.map((s, i) => (
                  <li key={i} className="text-[12px] text-ink-soft">
                    Row {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddTestForm({
  companyId,
  token,
  onCreated,
  onError,
}: {
  companyId: string;
  token: string;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [turnaround, setTurnaround] = useState("24 hrs");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const priceNum = Number(price);
    if (!name || !category || Number.isNaN(priceNum)) {
      onError("Fill in test name, category, and a valid price.");
      return;
    }
    setSubmitting(true);
    try {
      await api.labs.createTest(token, companyId, {
        name,
        category,
        price: priceNum,
        turnaround,
      });
      setName("");
      setCategory("");
      setPrice("");
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't add the test.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
      <input
        placeholder="Test name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={`${inputClass} sm:col-span-2`}
      />
      <input
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={inputClass}
      />
      <input
        type="number"
        min={0}
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className={inputClass}
      />
      <div className="flex gap-2">
        <input
          placeholder="Turnaround"
          value={turnaround}
          onChange={(e) => setTurnaround(e.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-primary";
