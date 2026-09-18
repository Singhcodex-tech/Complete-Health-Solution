"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PhoneCall, Siren, X } from "lucide-react";

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 md:bottom-8 md:right-8">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-64 rounded-2xl border border-line bg-paper-raised p-4 shadow-xl shadow-ink/10"
          >
            <p className="mb-3 text-[13px] font-medium text-ink-soft">
              Medical emergency? Call our 24/7 line for immediate ambulance dispatch.
            </p>
            <a
              href="tel:108"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emergency px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-emergency/90"
            >
              <PhoneCall className="h-4 w-4" /> Call 108 Now
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Emergency"
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emergency text-white shadow-lg shadow-emergency/40 transition-transform hover:scale-105"
      >
        <span className="pulse-ring absolute inline-flex h-full w-full rounded-full text-emergency opacity-40" />
        {open ? <X className="h-6 w-6" /> : <Siren className="h-6 w-6" />}
      </button>
    </div>
  );
}
