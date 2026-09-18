"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import SectionHeading from "@/components/SectionHeading";
import { services, serviceCategories } from "@/lib/data";

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [active, setActive] = useState("All");
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const byCategory =
      active === "All" ? services : services.filter((s) => s.category === active);

    const q = query.trim().toLowerCase();
    if (!q) return byCategory;

    return byCategory.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [active, query]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:py-12 md:px-8 md:py-16">
      <SectionHeading
        eyebrow="29 services, one platform"
        title="Explore all our services"
        description="Browse diagnostics, nursing, clinical procedures, emergency response and more — every one delivered to your doorstep."
      />

      <div className="mt-5 flex items-center gap-2.5 rounded-2xl border border-line bg-paper-raised px-3.5 py-2.5 shadow-sm shadow-ink/5 sm:mt-8">
        <Search className="h-5 w-5 shrink-0 text-ink-soft" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search doctors, nursing, lab tests, ambulance…"
          className="w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-soft/70"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-soft hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 sm:mt-5">
        {["All", ...serviceCategories].map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
              active === cat
                ? "border-primary bg-primary text-white"
                : "border-line bg-paper-raised text-ink-soft hover:border-primary hover:text-primary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <motion.div
          layout
          className="mt-6 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((s, i) => (
            <ServiceCard key={s.slug} service={s} index={i} />
          ))}
        </motion.div>
      ) : (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <p className="text-[15px] font-medium text-ink">No services match “{query}”.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Try a different keyword or clear the search.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={null}>
      <ServicesPageContent />
    </Suspense>
  );
}
