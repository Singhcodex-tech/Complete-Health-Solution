"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import type { OfferTile } from "@/lib/data";

export default function OfferTileCard({ tile, index = 0 }: { tile: OfferTile; index?: number }) {
  const [open, setOpen] = useState(false);
  const Icon = tile.icon;
  const tintBg = tile.tint === "accent" ? "bg-accent-soft" : "bg-primary-soft";
  const tintText = tile.tint === "accent" ? "text-accent" : "text-primary";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: (index % 9) * 0.05 }}
      className="flex flex-col rounded-2xl border border-line bg-paper-raised p-5 shadow-sm shadow-ink/5 transition-shadow hover:shadow-lg hover:shadow-ink/10"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3.5">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tintBg}`}>
            <Icon className={`h-6 w-6 ${tintText}`} />
          </div>
          <h3 className="font-display text-[16.5px] font-semibold leading-snug text-ink">
            {tile.title}
          </h3>
        </div>
        <ChevronDown
          className={`mt-1.5 h-4.5 w-4.5 shrink-0 text-ink-soft transition-transform duration-300 ${
            open ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
              {tile.description}
            </p>

            {tile.subItems && (
              <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                {tile.subItems.map((item) => (
                  <li key={item.label}>
                    {item.slug ? (
                      <Link
                        href={`/booking?service=${item.slug}`}
                        className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-paper hover:text-primary"
                      >
                        {item.label}
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    ) : (
                      <span className="block px-2 py-1.5 text-[13px] text-ink-soft">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              {tile.price && (
                <span className="font-mono-tight text-[13px] font-medium text-ink">
                  {tile.price}
                </span>
              )}
              <Link
                href={`/booking?service=${tile.bookSlug}`}
                className="ml-auto rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Book Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
