"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import SectionHeading from "@/components/SectionHeading";
import { services, serviceCategories } from "@/lib/data";

function ServicesPageContent() {
  // The search box lives in the header now; it sends people here as /services?q=…
  const query = (useSearchParams().get("q") ?? "").trim();
  const [active, setActive] = useState("All");

  const filtered = useMemo(() => {
    const byCategory = active === "All" ? services : services.filter((s) => s.category === active);
    const q = query.toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [active, query]);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-12 pt-2 sm:pt-4 md:px-8 md:pb-16 md:pt-6">
      {/* Heading on the left, filters on the right (desktop) — no empty band beside the title */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <SectionHeading
          eyebrow={`${services.length} services, one platform`}
          title="Explore all our services"
          description="Diagnostics, nursing, clinical procedures, emergency response and more — all delivered to your doorstep."
          className="lg:max-w-md lg:shrink-0"
        />

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:max-w-3xl lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {["All", ...serviceCategories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                active === cat
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-paper-raised text-ink-soft hover:border-primary hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {query && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-soft">
          <span>
            {filtered.length} result{filtered.length === 1 ? "" : "s"} for
          </span>
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 font-medium text-primary hover:bg-primary/10"
            aria-label={`Clear search for ${query}`}
          >
            “{query}” <X className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {filtered.length > 0 ? (
        <motion.div
          layout
          className="mt-5 grid grid-cols-1 gap-5 sm:mt-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((s, i) => (
            <ServiceCard key={s.slug} service={s} index={i} />
          ))}
        </motion.div>
      ) : (
        <div className="mt-14 flex flex-col items-center justify-center text-center">
          <p className="text-[15px] font-medium text-ink">No services match “{query}”.</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">Try a different keyword or clear the search.</p>
          <Link href="/services" className="mt-4 rounded-full bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-dark">
            Show all services
          </Link>
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
