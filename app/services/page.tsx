"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ServiceCard from "@/components/ServiceCard";
import SectionHeading from "@/components/SectionHeading";
import { services, serviceCategories } from "@/lib/data";

export default function ServicesPage() {
  const [active, setActive] = useState("All");

  const filtered = useMemo(
    () => (active === "All" ? services : services.filter((s) => s.category === active)),
    [active]
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="29 services, one platform"
        title="Explore all our services"
        description="Browse diagnostics, nursing, clinical procedures, emergency response and more — every one delivered to your doorstep."
      />

      <div className="mt-8 flex flex-wrap gap-2">
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

      <motion.div
        layout
        className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {filtered.map((s, i) => (
          <ServiceCard key={s.slug} service={s} index={i} />
        ))}
      </motion.div>
    </div>
  );
}
