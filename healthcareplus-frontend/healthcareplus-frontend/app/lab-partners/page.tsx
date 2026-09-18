"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, ShoppingCart, ArrowLeft, WifiOff, LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  labCompanies as fallbackCompanies,
  commonCategories,
  getTestComparison,
  type TestComparisonRow,
  LAB_SELECTION_STORAGE_KEY,
  type StoredLabSelection,
} from "@/lib/data";
import { api, type LabCompany as ApiLabCompany } from "@/lib/api";

type SelectedKey = string; // `${companySlug}::${testName}`

function comparisonFromApi(companies: ApiLabCompany[]): {
  rows: TestComparisonRow[];
  companies: { slug: string; name: string; id: string }[];
} {
  const rowMap = new Map<string, TestComparisonRow>();
  for (const company of companies) {
    for (const test of company.tests) {
      const existing = rowMap.get(test.name);
      const offer = {
        companySlug: company.slug,
        companyName: company.name,
        companyId: company.id,
        testId: test.id,
        price: test.price,
        turnaround: test.turnaround,
      };
      if (existing) existing.offers.push(offer);
      else rowMap.set(test.name, { testName: test.name, category: test.category, offers: [offer] });
    }
  }
  return {
    rows: Array.from(rowMap.values()),
    companies: companies.map((c) => ({ slug: c.slug, name: c.name, id: c.id })),
  };
}


export default function LabComparePage() {
  const { user } = useAuth();
  const [liveRows, setLiveRows] = useState<TestComparisonRow[] | null>(null);
  const [liveCompanyList, setLiveCompanyList] = useState<
    { slug: string; name: string; id: string }[] | null
  >(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.labs
      .list()
      .then((data) => {
        if (cancelled) return;
        if (data.length === 0) {
          setUsingFallback(true);
          return;
        }
        const { rows, companies } = comparisonFromApi(data);
        setLiveRows(rows);
        setLiveCompanyList(companies);
      })
      .catch(() => !cancelled && setUsingFallback(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = liveRows ?? (usingFallback ? getTestComparison() : []);
  const companyList =
    liveCompanyList ?? (usingFallback ? fallbackCompanies.map((c) => ({ slug: c.slug, name: c.name })) : []);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Set<SelectedKey>>(new Set());

  const categories = useMemo(
    () => ["All", ...commonCategories.filter((c) => rows.some((r) => r.category === c))],
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      const matchesCategory = category === "All" || r.category === category;
      const matchesQuery =
        !q ||
        r.testName.toLowerCase().includes(q) ||
        r.offers.some((o) => o.companyName.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [rows, query, category]);

  const toggleSelection = (companySlug: string, testName: string) => {
    const key: SelectedKey = `${companySlug}::${testName}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedList = Array.from(selected).map((key) => {
    const [companySlug, testName] = key.split("::");
    const company = companyList.find((c) => c.slug === companySlug);
    const row = rows.find((r) => r.testName === testName);
    const offer = row?.offers.find((o) => o.companySlug === companySlug);
    return {
      companySlug,
      companyName: company?.name ?? companySlug,
      companyId: offer?.companyId,
      testId: offer?.testId,
      testName,
      price: offer?.price ?? 0,
    };
  });

  const total = selectedList.reduce((sum, s) => sum + s.price, 0);

  const activeCompanies = companyList;

  const LABS_PER_PAGE = 6;
  const [labsPage, setLabsPage] = useState(0);
  const totalLabPages = Math.max(1, Math.ceil(activeCompanies.length / LABS_PER_PAGE));

  // Keep the page in range whenever the active-lab set (or its size) changes.
  useEffect(() => {
    setLabsPage((p) => Math.min(p, totalLabPages - 1));
  }, [totalLabPages]);

  const visibleCompanies = activeCompanies.slice(
    labsPage * LABS_PER_PAGE,
    labsPage * LABS_PER_PAGE + LABS_PER_PAGE
  );

  const canCheckout = selectedList.every((s) => s.companyId && s.testId);

  const handleProceed = () => {
    if (typeof window === "undefined") return;
    const payload: StoredLabSelection[] = selectedList
      .filter((s): s is typeof s & { companyId: string; testId: string } => Boolean(s.companyId && s.testId))
      .map((s) => ({
        companyId: s.companyId,
        companyName: s.companyName,
        testId: s.testId,
        testName: s.testName,
        price: s.price,
      }));
    window.sessionStorage.setItem(LAB_SELECTION_STORAGE_KEY, JSON.stringify(payload));
  };

  return (
    <div className="pb-28">
      <section className="bg-paper-raised py-3 sm:py-4">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mb-1.5 flex items-center justify-between gap-3 sm:mb-2">
            <Link
              href="/#services"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-soft hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to services
            </Link>
            {user?.role === "admin" && (
              <Link
                href="/admin/labs"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-4 py-2 text-[13px] font-semibold text-primary hover:bg-primary/10"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Manage in Dashboard
              </Link>
            )}
          </div>
          <div className="max-w-3xl">
            <span className="font-mono-tight text-[11px] font-medium uppercase text-primary sm:text-[12px]">
              Compare labs
            </span>
            <h1 className="mt-1 font-display text-xl font-semibold leading-tight text-ink sm:text-2xl md:text-3xl">
              Every lab, every price, side by side
            </h1>
            <p className="mt-1.5 text-[13px] leading-snug text-ink-soft sm:text-[14px]">
              Search a test or a lab, filter by category, then tick the boxes to build a booking across any combination of labs.
            </p>
          </div>
          {usingFallback && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
              <WifiOff className="h-4 w-4 shrink-0" />
              Showing sample data — couldn&apos;t reach the backend API, so
              live prices aren&apos;t available right now.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-3 md:px-8">
        {/* Search + category filter */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-line px-3.5 py-2">
            <Search className="h-4.5 w-4.5 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search a test or a lab…"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-soft/70"
            />
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                category === cat
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-paper-raised text-ink-soft hover:border-primary hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12.5px] text-ink-soft">
            Showing{" "}
            <span className="font-medium text-ink">
              {activeCompanies.length === 0 ? 0 : labsPage * LABS_PER_PAGE + 1}
              –
              {Math.min(labsPage * LABS_PER_PAGE + LABS_PER_PAGE, activeCompanies.length)}
            </span>{" "}
            of <span className="font-medium text-ink">{activeCompanies.length}</span> labs
          </p>
          {totalLabPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLabsPage((p) => Math.max(0, p - 1))}
                disabled={labsPage === 0}
                className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-[12.5px] text-ink-soft">
                Page {labsPage + 1} of {totalLabPages}
              </span>
              <button
                onClick={() => setLabsPage((p) => Math.min(totalLabPages - 1, p + 1))}
                disabled={labsPage >= totalLabPages - 1}
                className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 hidden overflow-x-auto rounded-2xl border border-line bg-paper-raised sm:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-paper">
                <th className="sticky left-0 z-10 bg-paper px-5 py-3.5 text-[12.5px] font-semibold uppercase tracking-wide text-ink-soft">
                  Test
                </th>
                {visibleCompanies.map((c) => (
                  <th
                    key={c.slug}
                    className="min-w-[150px] px-4 py-3.5 text-[12.5px] font-semibold uppercase tracking-wide text-ink-soft"
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr
                  key={row.testName}
                  className={`border-b border-line last:border-0 ${i % 2 === 1 ? "bg-paper/50" : ""}`}
                >
                  <td className="sticky left-0 z-10 bg-paper-raised px-5 py-4">
                    <p className="text-[14px] font-medium text-ink">{row.testName}</p>
                    <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
                      {row.category}
                    </span>
                  </td>
                  {visibleCompanies.map((c) => {
                    const offer = row.offers.find((o) => o.companySlug === c.slug);
                    if (!offer) {
                      return (
                        <td key={c.slug} className="px-4 py-4 text-center text-[13px] text-ink-soft/40">
                          —
                        </td>
                      );
                    }
                    const key: SelectedKey = `${c.slug}::${row.testName}`;
                    const isSelected = selected.has(key);
                    return (
                      <td key={c.slug} className="px-4 py-4">
                        <button
                          onClick={() => toggleSelection(c.slug, row.testName)}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary-soft"
                              : "border-line hover:border-primary/40"
                          }`}
                        >
                          <span className="font-mono-tight text-[13px] font-semibold text-ink">
                            ₹{offer.price}
                          </span>
                          <span
                            className={`flex h-4.5 w-4.5 items-center justify-center rounded-[5px] border-2 ${
                              isSelected ? "border-primary bg-primary text-white" : "border-line"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleCompanies.length + 1}
                    className="px-5 py-10 text-center text-[14px] text-ink-soft"
                  >
                    No tests match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: card list with a horizontally scrollable price strip per test —
            avoids a wide table where only the "Test" column is visible with no scroll cue. */}
        <div className="mt-2 space-y-2.5 sm:hidden">
          {filteredRows.map((row) => (
            <div key={row.testName} className="rounded-2xl border border-line bg-paper-raised p-3.5">
              <p className="text-[13.5px] font-medium text-ink">{row.testName}</p>
              <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
                {row.category}
              </span>
              <div className="mt-2.5 -mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-0.5">
                {visibleCompanies.map((c) => {
                  const offer = row.offers.find((o) => o.companySlug === c.slug);
                  if (!offer) {
                    return (
                      <div
                        key={c.slug}
                        className="shrink-0 rounded-xl border border-line px-3 py-2 text-center"
                      >
                        <p className="max-w-[90px] truncate text-[10.5px] font-medium text-ink-soft">
                          {c.name}
                        </p>
                        <p className="mt-1 text-[13px] text-ink-soft/40">—</p>
                      </div>
                    );
                  }
                  const key: SelectedKey = `${c.slug}::${row.testName}`;
                  const isSelected = selected.has(key);
                  return (
                    <button
                      key={c.slug}
                      onClick={() => toggleSelection(c.slug, row.testName)}
                      className={`shrink-0 rounded-xl border px-3 py-2 text-center transition-colors ${
                        isSelected ? "border-primary bg-primary-soft" : "border-line"
                      }`}
                    >
                      <p className="max-w-[90px] truncate text-[10.5px] font-medium text-ink-soft">
                        {c.name}
                      </p>
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span className="font-mono-tight text-[13px] font-semibold text-ink">
                          ₹{offer.price}
                        </span>
                        {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredRows.length === 0 && (
            <p className="rounded-2xl border border-line bg-paper-raised px-5 py-10 text-center text-[14px] text-ink-soft">
              No tests match your search.
            </p>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedList.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-paper-raised/95 backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row md:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
                  <ShoppingCart className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-[13.5px] font-medium text-ink">
                    {selectedList.length} test{selectedList.length > 1 ? "s" : ""} selected
                  </p>
                  <p className="font-mono-tight text-[13px] text-ink-soft">Total: ₹{total}</p>
                </div>
              </div>
              <Link
                href="/lab-tests/order"
                onClick={(e) => {
                  if (!canCheckout) {
                    e.preventDefault();
                    return;
                  }
                  handleProceed();
                }}
                aria-disabled={!canCheckout}
                className={`w-full rounded-full px-7 py-3 text-center text-[14px] font-semibold text-white transition-colors sm:w-auto ${
                  canCheckout
                    ? "bg-primary hover:bg-primary-dark"
                    : "cursor-not-allowed bg-ink-soft/40"
                }`}
              >
                Proceed to Book
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
