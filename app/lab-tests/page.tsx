"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TestTube2, Clock, FileUp } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { labTests } from "@/lib/data";

export default function LabTestsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="Diagnostics"
        title="Lab tests, sampled at home"
        description="Certified phlebotomists collect samples at your convenience — digital reports follow within hours."
      />

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-paper-raised p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FileUp className="h-5 w-5 text-primary" />
          <p className="text-[14px] text-ink">
            Have a prescription? Upload it and we&apos;ll recommend the right tests.
          </p>
        </div>
        <button className="rounded-full bg-primary-soft px-5 py-2.5 text-[13.5px] font-semibold text-primary hover:bg-primary/10">
          Upload Prescription
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {labTests.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: (i % 6) * 0.05 }}
            className="flex flex-col rounded-2xl border border-line bg-paper-raised p-6 shadow-sm shadow-ink/5"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
              <TestTube2 className="h-5.5 w-5.5 text-primary" />
            </div>
            <h3 className="mt-4 font-display text-[16px] font-semibold text-ink">
              {t.name}
            </h3>
            <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
              <Clock className="h-3.5 w-3.5" /> {t.turnaround}
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="font-mono-tight text-[14px] font-semibold text-ink">
                {t.price}
              </span>
              <Link
                href="/booking?service=blood-test-booking"
                className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-primary-dark"
              >
                Book Now
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
