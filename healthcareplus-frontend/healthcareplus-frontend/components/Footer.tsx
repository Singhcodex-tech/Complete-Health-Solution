import Link from "next/link";
import { AtSign, Globe, Mail, MapPin, MessageCircle, PhoneCall, Share2 } from "lucide-react";

const columns = [
  {
    title: "Services",
    links: [
      { href: "/services", label: "All Services" },
      { href: "/doctors", label: "Doctor Consultation" },
      { href: "/nursing", label: "Home Nursing" },
      { href: "/lab-tests", label: "Lab Tests" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#about", label: "About Us" },
      { href: "/#why-us", label: "Why Choose Us" },
      { href: "/#testimonials", label: "Testimonials" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/ambulance", label: "Ambulance" },
      { href: "/equipment", label: "Medical Equipment" },
      { href: "/insurance", label: "Insurance Assistance" },
      { href: "/booking", label: "Book a Visit" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper-raised">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full bg-accent" />
              <span className="font-display text-xl font-semibold text-ink">
                HealthCare<span className="text-primary">+</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-[14.5px] leading-relaxed text-ink-soft">
              Premium, on-demand healthcare — doctors, nurses, diagnostics and
              emergency response, brought to your doorstep.
            </p>
            <div className="mt-5 flex gap-3">
              {[Globe, MessageCircle, Share2, AtSign].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-[15px] font-semibold text-ink">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-ink-soft transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 border-t border-line pt-8 text-[14px] text-ink-soft sm:grid-cols-3">
          <div className="flex items-center gap-2.5">
            <PhoneCall className="h-4 w-4 text-primary" /> 9631655055 (24/7)
          </div>
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-primary" /> care@healthcareplus.in
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-primary" /> Available in 40+ cities
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-[13px] text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} HealthCare+. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
