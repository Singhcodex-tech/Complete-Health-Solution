"use client";

import { motion } from "framer-motion";

export default function StatBlock({
  value,
  label,
  index = 0,
}: {
  value: string;
  label: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="flex flex-col items-center text-center md:items-start md:text-left"
    >
      <span className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink whitespace-nowrap md:text-4xl">
        {value}
      </span>
      <span className="mt-2 text-[13.5px] text-ink-soft">{label}</span>
    </motion.div>
  );
}
