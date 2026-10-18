"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Check,
  ShoppingCart,
  ArrowLeft,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  FlaskConical,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import LocationChip from "@/components/LocationChip";
import { LAB_SELECTION_STORAGE_KEY, type StoredLabSelection } from "@/lib/data";
import { api, type CompareBranch, type CompareRow } from "@/lib/api";

type SelectedKey = string; // `${labId}::${testId}`

const DEFAULT_CATEGORIES = ["Diabetes", "Thyroid", "Liver Function", "Kidney Function", "Vitamins", "Cardiac", "Full Body"];
const PAGE_SIZE = 30;
const LABS_PER_PAGE = 6;

export default function LabComparePage() {
  const { user } = useAuth();
  const loc = useLocation();
  const pin = loc.pin;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);

  const [branches, setBranches] = useState<CompareBranch[]>([]);
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [totalTests, setTotalTests] = useState(0);
  const [categoryList, setCategoryList] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<SelectedKey>>(new Set());
  const [labsPage, setLabsPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Different pin = different labs, so a basket from the old area no longer applies.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the location changes
    setSelected(new Set());
    setPage(1);
    setLabsPage(0);
  }, [pin]);

  useEffect(() => {
    if (!pin) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    setLoadError(null);
    api.prices
      .compare(pin, { q: debouncedQuery, category, page, pageSize: PAGE_SIZE })
      .then((d) => {
        if (cancelled) return;
        setBranches(d.branches);
        setRows((prev) => (d.page === 1 ? d.rows : [...prev, ...d.rows]));
        setTotalTests(d.total_tests);
        setCategoryList(d.categories);
        setLoadedFor(pin);
      })
      .catch(() => !cancelled && setLoadError("Couldn't load labs right now. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [pin, debouncedQuery, category, page]);

  const categories = useMemo(() => ["All", ...categoryList], [categoryList]);
  const hasData = !!pin && loadedFor === pin;
  const totalLabPages = Math.max(1, Math.ceil(branches.length / LABS_PER_PAGE));
  const safeLabsPage = Math.min(labsPage, totalLabPages - 1);
  const visibleBranches = branches.slice(safeLabsPage * LABS_PER_PAGE, safeLabsPage * LABS_PER_PAGE + LABS_PER_PAGE);

  const toggleSelection = (labId: string, testId: string) => {
    const key: SelectedKey = `${labId}::${testId}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedList = useMemo(() => {
    const out: StoredLabSelection[] = [];
    for (const key of selected) {
      const [labId, testId] = key.split("::");
      const branch = branches.find((b) => b.id === labId);
      const row = rows.find((r) => r.test_id === testId);
      const price = row?.prices[labId];
      if (!branch || !row || price === undefined) continue;
      out.push({
        companyId: labId,
        companyName: `${branch.name} (${branch.pin_code})`,
        testId,
        testName: row.test_name,
        price,
        source: "branch",
      });
    }
    return out;
  }, [selected, branches, rows]);

  const total = selectedList.reduce((sum, s) => sum + s.price, 0);

  const handleProceed = () => {
    window.sessionStorage.setItem(LAB_SELECTION_STORAGE_KEY, JSON.stringify(selectedList));
  };

  const initialLoading = !!pin && loading && !hasData;
  const noLabsHere = hasData && !loading && branches.length === 0;
  const noTestMatches = hasData && branches.length > 0 && rows.length === 0 && !loading;
  const showTable = hasData && branches.length > 0;

  const branchHeader = (b: CompareBranch) => (
    <>
      <span className="block">{b.name}</span>
      <span className="mt-0.5 block font-mono-tight text-[11px] normal-case tracking-normal text-ink-soft/80">
        {b.pin_code}
        {b.match === "exact" && <span className="ml-1.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] text-accent">your pin</span>}
      </span>
    </>
  );

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
              Labs and prices for your area. Search a test, filter by category, then tick the boxes to build a booking across any combination of local labs.
            </p>
            <LocationChip className="mt-2.5" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-3 md:px-8">
        {/* Search + category filter */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-line px-3.5 py-2">
            <Search className="h-4.5 w-4.5 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              type="text"
              placeholder="Search a test…"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-soft/70"
            />
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
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

        {!loc.ready || initialLoading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !pin ? (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-paper-raised p-8 text-center">
            <MapPin className="mx-auto h-7 w-7 text-primary" />
            <h2 className="mt-3 font-display text-lg font-semibold text-ink">Tell us where you are</h2>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">
              Labs and prices depend on your area. Share your location or enter your pin code.
            </p>
            <button onClick={loc.openPrompt} className="mt-5 rounded-full bg-primary px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-primary-dark">
              Set my location
            </button>
          </div>
        ) : loadError && !hasData ? (
          <p className="mt-10 text-center text-[14px] text-emergency">{loadError}</p>
        ) : noLabsHere ? (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-paper-raised p-8 text-center">
            <FlaskConical className="mx-auto h-7 w-7 text-primary" />
            <h2 className="mt-3 font-display text-lg font-semibold text-ink">No partner labs near {pin} yet</h2>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">
              We&apos;re adding local labs area by area. Try a nearby pin code.
            </p>
            <button onClick={loc.openPrompt} className="mt-5 rounded-full border border-primary/30 bg-primary-soft px-6 py-2.5 text-[14px] font-semibold text-primary hover:bg-primary/10">
              Change location
            </button>
          </div>
        ) : showTable ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] text-ink-soft">
                Showing{" "}
                <span className="font-medium text-ink">
                  {safeLabsPage * LABS_PER_PAGE + 1}–{Math.min(safeLabsPage * LABS_PER_PAGE + LABS_PER_PAGE, branches.length)}
                </span>{" "}
                of <span className="font-medium text-ink">{branches.length}</span> labs near{" "}
                <span className="font-mono-tight font-medium text-ink">{pin}</span>
              </p>
              {totalLabPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLabsPage((p) => Math.max(0, p - 1))}
                    disabled={safeLabsPage === 0}
                    className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <span className="text-[12.5px] text-ink-soft">
                    Page {safeLabsPage + 1} of {totalLabPages}
                  </span>
                  <button
                    onClick={() => setLabsPage((p) => Math.min(totalLabPages - 1, p + 1))}
                    disabled={safeLabsPage >= totalLabPages - 1}
                    className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-soft hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
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
                    {visibleBranches.map((b) => (
                      <th key={b.id} className="min-w-[150px] px-4 py-3.5 text-[12.5px] font-semibold uppercase tracking-wide text-ink-soft">
                        {branchHeader(b)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.test_id} className={`border-b border-line last:border-0 ${i % 2 === 1 ? "bg-paper/50" : ""}`}>
                      <td className="sticky left-0 z-10 bg-paper-raised px-5 py-4">
                        <p className="text-[14px] font-medium text-ink">{row.test_name}</p>
                        <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-soft">{row.category}</span>
                      </td>
                      {visibleBranches.map((b) => {
                        const price = row.prices[b.id];
                        if (price === undefined) {
                          return (
                            <td key={b.id} className="px-4 py-4 text-center text-[13px] text-ink-soft/40">
                              —
                            </td>
                          );
                        }
                        const isSelected = selected.has(`${b.id}::${row.test_id}`);
                        return (
                          <td key={b.id} className="px-4 py-4">
                            <button
                              onClick={() => toggleSelection(b.id, row.test_id)}
                              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                                isSelected ? "border-primary bg-primary-soft" : "border-line hover:border-primary/40"
                              }`}
                            >
                              <span className="font-mono-tight text-[13px] font-semibold text-ink">₹{price}</span>
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
                  {noTestMatches && (
                    <tr>
                      <td colSpan={visibleBranches.length + 1} className="px-5 py-10 text-center text-[14px] text-ink-soft">
                        No tests match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: card per test with a scrollable price strip */}
            <div className="mt-2 space-y-2.5 sm:hidden">
              {rows.map((row) => (
                <div key={row.test_id} className="rounded-2xl border border-line bg-paper-raised p-3.5">
                  <p className="text-[13.5px] font-medium text-ink">{row.test_name}</p>
                  <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-soft">{row.category}</span>
                  <div className="mt-2.5 -mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-0.5">
                    {visibleBranches.map((b) => {
                      const price = row.prices[b.id];
                      if (price === undefined) {
                        return (
                          <div key={b.id} className="shrink-0 rounded-xl border border-line px-3 py-2 text-center">
                            <p className="max-w-[90px] truncate text-[10.5px] font-medium text-ink-soft">{b.name}</p>
                            <p className="mt-1 text-[13px] text-ink-soft/40">—</p>
                          </div>
                        );
                      }
                      const isSelected = selected.has(`${b.id}::${row.test_id}`);
                      return (
                        <button
                          key={b.id}
                          onClick={() => toggleSelection(b.id, row.test_id)}
                          className={`shrink-0 rounded-xl border px-3 py-2 text-center transition-colors ${
                            isSelected ? "border-primary bg-primary-soft" : "border-line"
                          }`}
                        >
                          <p className="max-w-[90px] truncate text-[10.5px] font-medium text-ink-soft">{b.name}</p>
                          <p className="font-mono-tight text-[9.5px] text-ink-soft/70">{b.pin_code}</p>
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <span className="font-mono-tight text-[13px] font-semibold text-ink">₹{price}</span>
                            {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {noTestMatches && (
                <p className="rounded-2xl border border-line bg-paper-raised px-5 py-10 text-center text-[14px] text-ink-soft">
                  No tests match your search.
                </p>
              )}
            </div>

            {rows.length < totalTests && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-full border border-line bg-paper-raised px-6 py-2.5 text-[13.5px] font-medium text-ink hover:border-primary hover:text-primary disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load more tests ({rows.length} of {totalTests})
                </button>
              </div>
            )}
          </>
        ) : null}
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
                onClick={handleProceed}
                className="w-full rounded-full bg-primary px-7 py-3 text-center text-[14px] font-semibold text-white transition-colors hover:bg-primary-dark sm:w-auto"
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
