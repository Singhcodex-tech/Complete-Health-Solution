"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  Clock,
  Users,
  Sparkles,
  ArrowRight,
  MapPin,
  HeartPulse,
  Activity,
} from "lucide-react";
import VitalsDivider from "@/components/VitalsDivider";
import SectionHeading from "@/components/SectionHeading";
import OfferTileCard from "@/components/OfferTileCard";
import StatBlock from "@/components/StatBlock";
import TestimonialCard from "@/components/TestimonialCard";
import FaqItem from "@/components/FaqItem";
import ContactForm from "@/components/ContactForm";
import { homeOfferTiles, testimonials, faqs, stats, partners } from "@/lib/data";

const whyUs = [
  {
    icon: ShieldCheck,
    title: "Verified Professionals",
    desc: "Every doctor, nurse and attendant is background-checked, licensed and trained.",
  },
  {
    icon: Clock,
    title: "Rapid Response",
    desc: "Average dispatch time of 18 minutes for emergencies, 90 minutes for scheduled care.",
  },
  {
    icon: Users,
    title: "Whole-Family Care",
    desc: "From newborn care to senior support — one platform for every stage of life.",
  },
  {
    icon: Sparkles,
    title: "Transparent Pricing",
    desc: "Upfront pricing on every service with no hidden fees or surprise charges.",
  },
];

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-paper">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-96 w-96 rounded-full bg-primary-soft blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-10%] h-80 w-80 rounded-full bg-accent-soft blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-4 py-1.5 text-[12.5px] font-medium text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Trusted across 40+ cities in India
            </span>

            <h1 className="mt-6 font-display text-[38px] font-semibold leading-[1.1] text-ink sm:text-[46px] lg:text-[52px]">
              Premium healthcare,
              <br />
              <span className="italic text-primary">delivered home.</span>
            </h1>

            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-ink-soft">
              Book doctors, nurses, diagnostics, ambulances and full home-care
              setups in minutes — verified professionals, transparent pricing,
              round-the-clock support.
            </p>

            {/* Search bar */}
            <form className="mt-8 flex flex-col gap-2.5 rounded-2xl border border-line bg-paper-raised p-2.5 shadow-lg shadow-ink/5 sm:flex-row">
              <div className="flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-2.5">
                <Search className="h-5 w-5 shrink-0 text-ink-soft" />
                <input
                  type="text"
                  placeholder="Search doctors, nursing, lab tests, ambulance…"
                  className="w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-soft/70"
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Search <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/booking"
                className="rounded-full bg-primary px-6 py-3 text-[14.5px] font-semibold text-white shadow-sm shadow-primary/30 transition-transform hover:scale-[1.02] hover:bg-primary-dark"
              >
                Book a Visit
              </Link>
              <a
                href="tel:108"
                className="rounded-full border border-emergency/30 bg-emergency-soft px-6 py-3 text-[14.5px] font-semibold text-emergency transition-colors hover:bg-emergency/10"
              >
                Emergency: Call 108
              </a>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((s, i) => (
                <StatBlock key={s.label} value={s.value} label={s.label} index={i} />
              ))}
            </div>
          </motion.div>

          {/* Illustration / vitals card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="rounded-[28px] border border-line bg-paper-raised p-6 shadow-2xl shadow-ink/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-emergency" />
                  <span className="text-[13.5px] font-semibold text-ink">
                    Live Vitals Feed
                  </span>
                </div>
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                  Stable
                </span>
              </div>

              <VitalsDivider className="mt-4" color="var(--emergency)" />

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-paper p-3 text-center">
                  <p className="font-display text-lg font-semibold text-ink">72</p>
                  <p className="text-[11px] text-ink-soft">BPM</p>
                </div>
                <div className="rounded-xl bg-paper p-3 text-center">
                  <p className="font-display text-lg font-semibold text-ink">98%</p>
                  <p className="text-[11px] text-ink-soft">SpO2</p>
                </div>
                <div className="rounded-xl bg-paper p-3 text-center">
                  <p className="font-display text-lg font-semibold text-ink">120/80</p>
                  <p className="text-[11px] text-ink-soft">BP</p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl border border-line p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-medium text-ink">
                    Nurse en route
                  </p>
                  <p className="text-[12px] text-ink-soft">Arriving in 14 minutes</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-xl border border-line p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                  <MapPin className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-[13.5px] font-medium text-ink">
                    Ambulance dispatched
                  </p>
                  <p className="text-[12px] text-ink-soft">Koramangala, Bengaluru</p>
                </div>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-6 -top-6 hidden rounded-2xl border border-line bg-paper-raised px-4 py-3 shadow-lg shadow-ink/10 sm:block"
            >
              <p className="text-[12px] text-ink-soft">Doctors online</p>
              <p className="font-display text-lg font-semibold text-primary">1,240+</p>
            </motion.div>
          </motion.div>
        </div>

        <VitalsDivider color="var(--line)" animate={false} />
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="What we offer"
            title="Every service your family needs"
            description="From routine diagnostics to critical home ICU setups — tap a tile to see what's inside."
          />
          <Link
            href="/services"
            className="flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-primary"
          >
            View all services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {homeOfferTiles.map((tile, i) => (
            <OfferTileCard key={tile.slug} tile={tile} index={i} />
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="bg-paper-raised py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 md:px-8 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="About HealthCare+"
              title="Built by clinicians. Designed for families."
              description="HealthCare+ began with a simple frustration: getting reliable medical care at home shouldn't take a dozen phone calls. Today, we coordinate doctors, nurses, diagnostics and emergency response through one platform — vetted, tracked, and available around the clock."
            />
            <div className="mt-8 grid grid-cols-2 gap-6">
              <div>
                <p className="font-display text-2xl font-semibold text-primary">2019</p>
                <p className="text-[13px] text-ink-soft">Founded in Bengaluru</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-primary">40+</p>
                <p className="text-[13px] text-ink-soft">Cities served nationwide</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 rounded-2xl bg-primary-soft p-8">
              <p className="font-display text-3xl italic text-primary">
                &ldquo;Care that comes to you.&rdquo;
              </p>
              <p className="mt-3 text-[14px] text-ink-soft">
                Our mission, in five words.
              </p>
            </div>
            <div className="rounded-2xl border border-line p-6">
              <p className="font-display text-2xl font-semibold text-ink">3,500+</p>
              <p className="mt-1 text-[13px] text-ink-soft">Verified doctors on network</p>
            </div>
            <div className="rounded-2xl border border-line p-6">
              <p className="font-display text-2xl font-semibold text-ink">98%</p>
              <p className="mt-1 text-[13px] text-ink-soft">Patient satisfaction score</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section id="why-us" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <SectionHeading
          eyebrow="Why choose us"
          title="Healthcare that earns your trust"
          align="center"
          className="mx-auto"
        />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyUs.map((w, i) => (
            <motion.div
              key={w.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border border-line bg-paper-raised p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft">
                <w.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mt-4 font-display text-[16.5px] font-semibold text-ink">
                {w.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                {w.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="bg-paper-raised py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionHeading
            eyebrow="Testimonials"
            title="Stories from families we've cared for"
            align="center"
            className="mx-auto"
          />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t, i) => (
              <TestimonialCard key={t.name} {...t} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <p className="text-center text-[13px] font-medium uppercase tracking-wide text-ink-soft">
          Trusted diagnostic & pharmacy partners
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {partners.map((p) => (
            <span
              key={p}
              className="font-display text-[17px] font-medium text-ink-soft/60"
            >
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 py-20 md:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          align="center"
          className="mx-auto"
        />
        <div className="mt-10">
          {faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section className="bg-paper-raised py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-5 md:px-8 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Get in touch"
              title="Have a question before booking?"
              description="Send us a message and our care coordinators will help you find the right service for your family."
            />
            <div className="mt-8 rounded-2xl border border-line p-6">
              <p className="text-[13.5px] font-medium text-ink">
                Prefer to talk now?
              </p>
              <p className="mt-1 text-[13.5px] text-ink-soft">
                Call our 24/7 care line at{" "}
                <span className="font-semibold text-primary">1800-123-456</span>
              </p>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
