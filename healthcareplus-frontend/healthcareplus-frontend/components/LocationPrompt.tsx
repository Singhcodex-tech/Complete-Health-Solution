"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";

// Don't greet admins / riders / login screens with a location popup.
const SKIP_AUTO_PROMPT = ["/admin", "/rider", "/login", "/register", "/signup"];

export default function LocationPrompt() {
  const loc = useLocation();
  const pathname = usePathname();
  const [pinInput, setPinInput] = useState("");
  const asked = useRef(false);

  // First visit: ask once (after localStorage is read), unless dismissed in the last week.
  useEffect(() => {
    if (!loc.ready || asked.current) return;
    if (SKIP_AUTO_PROMPT.some((p) => pathname.startsWith(p))) return;
    asked.current = true;
    if (!loc.pin && !loc.wasDismissedRecently()) loc.openPrompt();
  }, [loc, pathname]);

  return (
    <AnimatePresence>
      {loc.promptOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => loc.closePrompt(true)}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Choose your location"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-line bg-paper-raised p-6 shadow-xl"
          >
            <button
              onClick={() => loc.closePrompt(true)}
              aria-label="Close"
              className="absolute right-4 top-4 text-ink-soft hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-ink">Find labs near you</h2>
            <p className="mt-1.5 text-[13.5px] leading-snug text-ink-soft">
              Share your location and we&apos;ll show the partner labs and test prices for your area.
              Your location stays in this browser and is only used to find your pin code.
            </p>

            <button
              onClick={loc.detect}
              disabled={loc.detecting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {loc.detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              {loc.detecting ? "Finding your location…" : "Use my current location"}
            </button>

            <div className="my-4 flex items-center gap-3 text-[12px] text-ink-soft">
              <span className="h-px flex-1 bg-line" /> or enter pin code <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex gap-2">
              <input
                value={pinInput}
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 800012"
                aria-label="Pin code"
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && loc.setManualPin(pinInput)}
                className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-primary"
              />
              <button
                onClick={() => loc.setManualPin(pinInput)}
                className="shrink-0 rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5 text-[13.5px] font-semibold text-primary hover:bg-primary/10"
              >
                Confirm
              </button>
            </div>

            {loc.error && <p className="mt-3 text-[12.5px] text-emergency">{loc.error}</p>}

            <button
              onClick={() => loc.closePrompt(true)}
              className="mt-4 w-full text-center text-[12.5px] font-medium text-ink-soft hover:text-ink"
            >
              Not now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
