"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Building2,
  MapPin,
  Clock,
  Check,
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { labCompanies, commonCategories } from "@/lib/data";

export default function LabPartnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const company = labCompanies.find((c) => c.slug === slug);

  if (!company) notFound();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const categories = useMemo(
    () => [
      "All",
      ...commonCategories.filter((cat) =>
        company.tests.some((t) => t.category === cat)
      ),
    ],
    [company]
  );

  const filtered = useMemo(() => {
    return company.tests.filter((t) => {
      const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All" || t.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [company, query, category]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectedTests = company.tests.filter((t) => selected.has(t.name));
  const total = selectedTests.reduce((sum, t) => sum + t.price, 0);

  const bookingNotes =
    selectedTests.length > 0
      ? `Lab partner: ${company.name}. Tests requested: ${selectedTests
          .map((t) => t.name)
          .join(", ")}.`
      : "";

  return (
    <div className="pb-28">
      <section className="bg-paper-raised py-12">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Link
            href="/#services"
            className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-soft hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to services
          </Link>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">
                  {company.name}
                </h1>
                <p className="mt-1.5 max-w-lg text-[14px] text-ink-soft">
                  {company.tagline}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Est. {company.established}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {company.labsCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <SectionHeading
          eyebrow="Test catalog"
          title="Select the tests you need"
          description="Tick as many tests as you'd like, filter by category, then proceed to book — all in one home visit."
        />

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5">
            <Search className="h-4.5 w-4.5 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search a test…"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-soft/70"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((test, i) => {
            const isSelected = selected.has(test.name);
            return (
              <motion.button
                key={test.name}
                onClick={() => toggle(test.name)}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, delay: (i % 9) * 0.04 }}
                className={`flex items-start gap-3.5 rounded-2xl border p-5 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary-soft"
                    : "border-line bg-paper-raised hover:border-primary/40"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-paper-raised"
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="flex-1">
                  <span className="block text-[14.5px] font-medium text-ink">
                    {test.name}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[12px] text-ink-soft">
                    <span className="rounded-full bg-paper px-2 py-0.5">
                      {test.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {test.turnaround}
                    </span>
                  </span>
                  <span className="mt-2 block font-mono-tight text-[14px] font-semibold text-ink">
                    ₹{test.price}
                  </span>
                </span>
              </motion.button>
            );
          })}

          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-[14px] text-ink-soft">
              No tests match your search. Try a different keyword or category.
            </p>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedTests.length > 0 && (
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
                    {selectedTests.length} test{selectedTests.length > 1 ? "s" : ""} selected
                  </p>
                  <p className="font-mono-tight text-[13px] text-ink-soft">
                    Total: ₹{total}
                  </p>
                </div>
              </div>
              <Link
                href={`/booking?service=blood-test-booking&notes=${encodeURIComponent(bookingNotes)}`}
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
