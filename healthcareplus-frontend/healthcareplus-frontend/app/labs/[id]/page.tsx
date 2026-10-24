"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MapPin, Search } from "lucide-react";
import { api, ApiError, type LabBranchDetail } from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";

export default function LabBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lab, setLab] = useState<LabBranchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.prices
      .labDetail(id)
      .then((d) => !cancelled && setLab(d))
      .catch((e) => !cancelled && setError(e instanceof ApiError && e.status === 404 ? "This lab branch was not found." : "Couldn't load this lab."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (lab?.tests ?? []).filter((t) => !q || t.test_name.toLowerCase().includes(q));
  }, [lab, query]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <Link href="/lab-partners" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-soft hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to compare labs
      </Link>

      {error ? (
        <p className="mt-10 text-[14px] text-emergency">{error}</p>
      ) : !lab ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <SectionHeading eyebrow="Lab branch" title={lab.name} description={`${lab.tests.length.toLocaleString()} tests with prices`} />
            <p className="mt-2 flex flex-wrap items-center gap-x-4 text-[13px] text-ink-soft">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Pin code {lab.pin_code}
              </span>
              {lab.last_updated && (
                <span>Prices updated {new Date(lab.last_updated + "Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              )}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-xl border border-line bg-paper-raised px-3.5">
            <Search className="h-4 w-4 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this lab's tests…"
              className="w-full bg-transparent py-3 text-[14px] outline-none"
            />
          </div>

          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-paper-raised">
            {tests.map((t) => (
              <li key={t.test_id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <span className="text-[14px] text-ink">{t.test_name}</span>
                <span className="shrink-0 font-mono-tight text-[14px] font-semibold text-ink">₹{t.price.toLocaleString("en-IN")}</span>
              </li>
            ))}
            {tests.length === 0 && <li className="px-5 py-10 text-center text-[14px] text-ink-soft">No tests match your search.</li>}
          </ul>
        </>
      )}
    </div>
  );
}
