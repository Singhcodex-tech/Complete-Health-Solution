"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BedDouble, Wind, Gauge, Activity, Accessibility, Wrench } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { equipment } from "@/lib/data";

const iconMap: Record<string, typeof BedDouble> = {
  bed: BedDouble,
  wheelchair: Accessibility,
  wind: Wind,
  cylinder: Gauge,
  monitor: Activity,
};

export default function EquipmentPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="Medical equipment"
        title="Everything for a home hospital setup"
        description="Rent or purchase clinical-grade equipment, delivered and installed by our technicians."
      />

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {equipment.map((e, i) => {
          const Icon = iconMap[e.icon] ?? Wrench;
          return (
            <motion.div
              key={e.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: (i % 6) * 0.06 }}
              className="flex flex-col rounded-2xl border border-line bg-paper-raised p-6 shadow-sm shadow-ink/5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft">
                <Icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="mt-4 font-display text-[17px] font-semibold text-ink">
                {e.name}
              </h3>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-soft">
                {e.detail}
              </p>
              <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
                <Link
                  href="/booking?service=medical-equipment-arrangement"
                  className="flex-1 rounded-full bg-primary py-2.5 text-center text-[13px] font-semibold text-white hover:bg-primary-dark"
                >
                  Rent Now
                </Link>
                <button className="flex-1 rounded-full border border-line py-2.5 text-[13px] font-semibold text-ink-soft hover:border-primary hover:text-primary">
                  Get Quote
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
