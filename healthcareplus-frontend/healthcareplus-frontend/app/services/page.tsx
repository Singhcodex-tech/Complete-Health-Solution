"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import OfferTileCard from "@/components/OfferTileCard";
import SectionHeading from "@/components/SectionHeading";
import { homeOfferTiles } from "@/lib/data";

function ServicesPageContent() {
  // The search box lives in the header; it sends people here as /services?q=…
  const query = (useSearchParams().get("q") ?? "").trim();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return homeOfferTiles;
    return homeOfferTiles.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.subItems ?? []).some((s) => s.label.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-12 pt-2 sm:pt-4 md:px-8 md:pb-16 md:pt-6">
      <SectionHeading
        eyebrow={`${homeOfferTiles.length} services, one platform`}
        title="Explore all our services"
        description="Blood tests, nursing, doctors, ambulance and more — all delivered to your doorstep."
      />

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
        <div className="mt-6 grid grid-cols-1 items-start gap-5 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tile, i) => (
            <OfferTileCard key={tile.slug} tile={tile} index={i} />
          ))}
        </div>
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
