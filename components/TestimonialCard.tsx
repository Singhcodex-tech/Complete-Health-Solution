"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export default function TestimonialCard({
  name,
  role,
  quote,
  rating,
  index = 0,
}: {
  name: string;
  role: string;
  quote: string;
  rating: number;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="flex h-full flex-col rounded-2xl border border-line bg-paper-raised p-6 shadow-sm shadow-ink/5"
    >
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.round(rating) ? "fill-accent text-accent" : "text-line"
            }`}
          />
        ))}
      </div>
      <p className="mt-4 flex-1 text-[14.5px] leading-relaxed text-ink-soft">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft font-display text-[13px] font-semibold text-primary">
          {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-ink">{name}</p>
          <p className="text-[12.5px] text-ink-soft">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}
