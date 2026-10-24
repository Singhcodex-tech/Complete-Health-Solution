"use client";

import { useMemo, useRef, useState, useEffect, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CornerDownLeft, Scale, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { services } from "@/lib/data";

type Item = { key: string; label: string; sub: string; href: string; icon: LucideIcon };

const PAGES: { label: string; sub: string; href: string; words: string }[] = [
  { label: "Compare lab prices", sub: "Labs near you, side by side", href: "/lab-partners", words: "lab test price compare blood pathology" },
  { label: "Book lab tests", sub: "Home sample collection", href: "/lab-tests", words: "lab test blood sample" },
  { label: "Doctors", sub: "Consult a doctor", href: "/doctors", words: "doctor consultation physician specialist" },
  { label: "Home nursing", sub: "Trained nurses at home", href: "/nursing", words: "nurse nursing care attendant" },
  { label: "Ambulance", sub: "Emergency and transfers", href: "/ambulance", words: "ambulance emergency 108" },
  { label: "Medical equipment", sub: "Rent or buy", href: "/equipment", words: "equipment oxygen bed wheelchair rental" },
  { label: "Insurance", sub: "Plans and claims", href: "/insurance", words: "insurance claim cashless policy" },
];

const POPULAR = ["Blood test", "Home nursing", "Injection", "Wound dressing", "Ambulance"];

export default function HeaderSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const svc = services
      .filter((s) => `${s.name} ${s.category} ${s.description}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map<Item>((s) => ({
        key: `s-${s.slug}`,
        label: s.name,
        sub: `${s.category} · ${s.price}`,
        href: `/services?q=${encodeURIComponent(s.name)}`,
        icon: s.icon,
      }));
    const pg = PAGES.filter((p) => `${p.label} ${p.words}`.toLowerCase().includes(q))
      .slice(0, 3)
      .map<Item>((p) => ({ key: `p-${p.href}`, label: p.label, sub: p.sub, href: p.href, icon: Scale }));
    return [...pg, ...svc];
  }, [query]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (active >= 0 && items[active]) return go(items[active].href);
    go(q ? `/services?q=${encodeURIComponent(q)}` : "/services");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    }
  };

  return (
    <>
      {/* click-away backdrop (sits behind the header bar, above the page) */}
      <div className="fixed inset-0 -z-10 bg-ink/25" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        className="border-t border-line bg-paper-raised shadow-lg shadow-ink/10"
      >
        <div className="mx-auto max-w-3xl px-5 py-4 md:px-8">
          <form onSubmit={submit} className="flex items-center gap-2.5 rounded-2xl border border-line bg-paper px-3.5 py-2.5 focus-within:border-primary">
            <Search className="h-5 w-5 shrink-0 text-ink-soft" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search doctors, nursing, lab tests, ambulance…"
              aria-label="Search the site"
              className="w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-soft/70"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); setActive(-1); inputRef.current?.focus(); }} aria-label="Clear search" className="text-ink-soft hover:text-primary">
                <X className="h-4 w-4" />
              </button>
            )}
            <button type="submit" aria-label="Search" className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-[13px] font-semibold text-white hover:bg-primary-dark">
              <span className="hidden sm:inline">Search</span> <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {query.trim() === "" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-ink-soft">Popular:</span>
              {POPULAR.map((p) => (
                <Link
                  key={p}
                  href={`/services?q=${encodeURIComponent(p)}`}
                  onClick={onClose}
                  className="rounded-full border border-line px-3 py-1 text-[12.5px] font-medium text-ink-soft hover:border-primary hover:text-primary"
                >
                  {p}
                </Link>
              ))}
            </div>
          ) : items.length > 0 ? (
            <ul className="mt-3 max-h-[55vh] overflow-auto rounded-xl border border-line">
              {items.map((it, i) => (
                <li key={it.key} className="border-b border-line last:border-0">
                  <button
                    onClick={() => go(it.href)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i === active ? "bg-primary-soft" : "hover:bg-paper"}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <it.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{it.label}</span>
                      <span className="block truncate text-[12px] text-ink-soft">{it.sub}</span>
                    </span>
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-ink-soft">
              No quick matches. Press Enter to search all services for “{query.trim()}”.
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
