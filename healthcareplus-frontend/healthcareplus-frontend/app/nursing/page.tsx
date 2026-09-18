"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import { nursingPlans } from "@/lib/data";

export default function NursingPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="Home nursing care"
        title="Nursing plans for every need"
        description="From daytime support to ICU-trained specialists — choose the plan that fits your family's situation."
        align="center"
        className="mx-auto"
      />

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {nursingPlans.map((plan, i) => (
          <motion.div
            key={plan.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            className={`flex flex-col rounded-2xl border p-7 ${
              plan.highlight
                ? "border-primary bg-primary text-white shadow-xl shadow-primary/30"
                : "border-line bg-paper-raised"
            }`}
          >
            {plan.highlight && (
              <span className="mb-3 w-fit rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                Most popular
              </span>
            )}
            <h3 className={`font-display text-xl font-semibold ${plan.highlight ? "text-white" : "text-ink"}`}>
              {plan.title}
            </h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className={`font-display text-3xl font-semibold ${plan.highlight ? "text-white" : "text-ink"}`}>
                {plan.price}
              </span>
              <span className={`text-[13px] ${plan.highlight ? "text-white/80" : "text-ink-soft"}`}>
                {plan.period}
              </span>
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13.5px]">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-white" : "text-accent"}`} />
                  <span className={plan.highlight ? "text-white/90" : "text-ink-soft"}>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/booking?service=home-nursing-care"
              className={`mt-7 rounded-full py-3 text-center text-[14px] font-semibold transition-colors ${
                plan.highlight
                  ? "bg-white text-primary hover:bg-white/90"
                  : "bg-primary text-white hover:bg-primary-dark"
              }`}
            >
              Book This Plan
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
