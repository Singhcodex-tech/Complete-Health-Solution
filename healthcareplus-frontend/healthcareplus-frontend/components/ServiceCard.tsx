"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageCircle, PhoneCall, ChevronDown } from "lucide-react";
import type { Service } from "@/lib/data";

export default function ServiceCard({ service, index = 0 }: { service: Service; index?: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = service.icon;
  const tintBg = service.tint === "accent" ? "bg-accent-soft" : "bg-primary-soft";
  const tintText = service.tint === "accent" ? "text-accent" : "text-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: (index % 6) * 0.05 }}
      className="group flex flex-col rounded-2xl border border-line bg-paper-raised p-5 shadow-sm shadow-ink/5 transition-shadow hover:shadow-lg hover:shadow-ink/10"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tintBg}`}>
          <Icon className={`h-6 w-6 ${tintText}`} />
        </div>
        <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-soft">
          {service.category}
        </span>
      </div>

      <h3 className="mt-4 font-display text-[17px] font-semibold leading-snug text-ink">
        {service.name}
      </h3>
      <p className={`mt-1.5 text-[13.5px] leading-relaxed text-ink-soft ${expanded ? "" : "line-clamp-2"}`}>
        {service.description}
      </p>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-primary"
      >
        {expanded ? "Show less" : "Learn more"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono-tight text-[13px] font-medium text-ink">
          {service.price}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={service.slug === "blood-test-booking" ? "/lab-partners" : `/booking?service=${service.slug}`}
          className="flex-1 rounded-full bg-primary py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Book Now
        </Link>
        <a
          href="tel:+919631655055"
          aria-label="Call"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft hover:border-primary hover:text-primary"
        >
          <PhoneCall className="h-4 w-4" />
        </a>
        <a
          href="https://wa.me/919631655055"
          aria-label="WhatsApp"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      </div>
    </motion.div>
  );
}
