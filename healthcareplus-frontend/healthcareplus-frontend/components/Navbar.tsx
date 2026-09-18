"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, PhoneCall, User, LogOut, LayoutDashboard, ChevronDown, Stethoscope, FlaskConical, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { href: "/services", label: "Services" },
  { href: "/doctors", label: "Doctors" },
  { href: "/nursing", label: "Nursing" },
  { href: "/lab-tests", label: "Lab Tests" },
  { href: "/ambulance", label: "Ambulance" },
  { href: "/equipment", label: "Equipment" },
  { href: "/insurance", label: "Insurance" },
  { href: "/contact", label: "Contact" },
];

const adminLinks = [
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/admin/labs", label: "Labs", icon: FlaskConical },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!adminMenuOpen) return;
    const close = () => setAdminMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [adminMenuOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-paper-raised/90 backdrop-blur-md border-b border-line shadow-[0_1px_0_0_rgba(11,32,54,0.04)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 mr-6 lg:mr-10">
          <span className="relative flex h-3 w-3">
            <span className="pulse-ring absolute inline-flex h-full w-full text-accent opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            HealthCare<span className="text-primary">+</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap text-[14.5px] font-medium text-ink-soft transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 xl:flex">
          <a
            href="tel:+919631655055"
            className="hidden shrink-0 items-center gap-2 whitespace-nowrap border-l border-line pl-4 ml-1 text-[14.5px] font-medium text-ink-soft hover:text-primary xl:flex"
          >
            <PhoneCall className="h-4 w-4 shrink-0" />
            9631655055
          </a>

          {!loading && user ? (
            <div className="flex shrink-0 items-center gap-2">
              {user.role === "admin" && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdminMenuOpen((v) => !v);
                    }}
                    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/30 bg-primary-soft px-3.5 py-2 text-[13.5px] font-semibold text-primary hover:bg-primary/10"
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" /> Admin
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${adminMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {adminMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-[calc(100%+8px)] w-44 overflow-hidden rounded-xl border border-line bg-paper-raised shadow-lg shadow-ink/10"
                      >
                        {adminLinks.map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setAdminMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-ink-soft hover:bg-primary-soft hover:text-primary"
                          >
                            <l.icon className="h-4 w-4 shrink-0" /> {l.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {user.role === "rider" && (
                <Link
                  href="/rider/dashboard"
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/30 bg-primary-soft px-3.5 py-2 text-[13.5px] font-semibold text-primary hover:bg-primary/10"
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" /> My Orders
                </Link>
              )}
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-line py-1.5 pl-1.5 pr-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[110px] truncate whitespace-nowrap text-[13.5px] font-medium text-ink">
                  {user.full_name.split(" ")[0]}
                </span>
              </div>
              <button
                onClick={logout}
                aria-label="Log out"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft hover:border-emergency hover:text-emergency"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            !loading && (
              <Link
                href="/login"
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[14.5px] font-medium text-ink-soft hover:text-primary"
              >
                <User className="h-4 w-4" /> Log In
              </Link>
            )
          )}

          <Link
            href="/booking"
            className="shrink-0 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm shadow-primary/30 transition-transform hover:scale-[1.03] hover:bg-primary-dark"
          >
            Book a Visit
          </Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink xl:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-line bg-paper-raised xl:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink-soft hover:bg-primary-soft hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}
              {!loading && user?.role === "admin" && (
                <div className="mt-2 space-y-1.5">
                  <p className="px-3 text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">
                    Admin
                  </p>
                  {adminLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-2.5 text-[15px] font-semibold text-primary"
                    >
                      <l.icon className="h-4 w-4" /> {l.label}
                    </Link>
                  ))}
                </div>
              )}
              {!loading && user?.role === "rider" && (
                <Link
                  href="/rider/dashboard"
                  onClick={() => setOpen(false)}
                  className="mt-2 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-2.5 text-[15px] font-semibold text-primary"
                >
                  <LayoutDashboard className="h-4 w-4" /> My Orders
                </Link>
              )}
              {!loading && user ? (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[14px] font-medium text-ink">
                      {user.full_name}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="text-[13px] font-semibold text-emergency"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink-soft hover:bg-primary-soft hover:text-primary"
                >
                  Log In / Sign Up
                </Link>
              )}
              <Link
                href="/booking"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-primary px-5 py-3 text-center text-[15px] font-semibold text-white"
              >
                Book a Visit
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
