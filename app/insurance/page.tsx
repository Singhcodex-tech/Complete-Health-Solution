"use client";

import { motion } from "framer-motion";
import { ShieldCheck, FileCheck2, HandCoins, Upload } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { insurancePartners } from "@/lib/data";

const assistance = [
  { icon: ShieldCheck, title: "Cashless Guidance", desc: "We coordinate directly with your insurer for cashless treatment approvals." },
  { icon: FileCheck2, title: "Claim Assistance", desc: "End-to-end documentation and follow-up support for faster claim settlement." },
  { icon: Upload, title: "Policy Upload", desc: "Upload your policy once and reuse it across every future booking." },
  { icon: HandCoins, title: "Cost Estimates", desc: "Get upfront treatment cost estimates before your procedure begins." },
];

export default function InsurancePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="Insurance assistance"
        title="We handle the paperwork"
        description="From cashless approvals to claim documentation, our insurance desk works on your behalf."
      />

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {assistance.map((a, i) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.08 }}
            className="rounded-2xl border border-line bg-paper-raised p-6"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft">
              <a.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-display text-[16px] font-semibold text-ink">
              {a.title}
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
              {a.desc}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-16">
        <h3 className="font-display text-xl font-semibold text-ink">
          Our insurance network
        </h3>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {insurancePartners.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center justify-between rounded-2xl border border-line bg-paper-raised p-5"
            >
              <div>
                <p className="font-display text-[15.5px] font-semibold text-ink">
                  {p.name}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-soft">{p.coverage}</p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-medium text-accent">
                {p.type}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
