"use client";

import { motion } from "framer-motion";
import { Ambulance, Plane, PhoneCall, TrainFront, Clock, MapPin, ShieldCheck } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import VitalsDivider from "@/components/VitalsDivider";

const types = [
  {
    icon: Ambulance,
    title: "Road Ambulance",
    desc: "Basic and advanced life-support ambulances for local and inter-city transfers.",
    eta: "Avg. 18 min response",
    features: ["Trained paramedics", "Oxygen & first-aid equipped", "GPS-tracked dispatch"],
  },
  {
    icon: TrainFront,
    title: "Railway Ambulance",
    desc: "Coordinated ambulance service meeting patients directly at railway platforms.",
    eta: "Avg. 25 min coordination",
    features: ["Platform-side pickup", "Stretcher & wheelchair access", "Station liaison support"],
  },
  {
    icon: Plane,
    title: "Air Ambulance",
    desc: "Fixed-wing and helicopter air ambulances for critical, long-distance transfers.",
    eta: "Nationwide coverage",
    features: ["ICU-equipped aircraft", "Doctor & nurse on board", "Hospital-to-hospital transfer"],
  },
];

export default function AmbulancePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-emergency-soft to-paper py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionHeading
            eyebrow="Emergency response"
            title="Ambulance, dispatched in minutes"
            description="Road, railway or air — request the right ambulance for your emergency and track it in real time."
          />
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="tel:108"
              className="flex items-center gap-2.5 rounded-full bg-emergency px-7 py-4 text-[15px] font-semibold text-white shadow-lg shadow-emergency/30 transition-transform hover:scale-[1.02]"
            >
              <PhoneCall className="h-5 w-5" /> Call Emergency: 108
            </a>
            <span className="flex items-center gap-2 text-[13.5px] text-ink-soft">
              <Clock className="h-4 w-4 text-emergency" /> Avg. dispatch time: 18 minutes
            </span>
          </div>
        </div>
        <VitalsDivider className="mt-10" color="var(--emergency)" />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {types.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col rounded-2xl border border-line bg-paper-raised p-7 shadow-sm shadow-ink/5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
                <t.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                {t.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                {t.desc}
              </p>
              <span className="mt-4 inline-flex w-fit rounded-full bg-accent-soft px-3 py-1 text-[12px] font-medium text-accent">
                {t.eta}
              </span>
              <ul className="mt-5 space-y-2 border-t border-line pt-5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13.5px] text-ink-soft">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href="tel:108"
                className="mt-6 rounded-full bg-primary py-3 text-center text-[14px] font-semibold text-white hover:bg-primary-dark"
              >
                Request Now
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 md:px-8">
        <div className="rounded-2xl border border-line bg-paper-raised p-8">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-ink">
              Live tracking preview
            </h3>
          </div>
          <div className="mt-5 flex h-64 items-center justify-center rounded-xl border border-dashed border-line bg-paper text-[13.5px] text-ink-soft">
            Live map & driver ETA will render here once connected to a backend
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-paper p-4">
              <p className="text-[12px] text-ink-soft">Driver</p>
              <p className="mt-1 text-[14px] font-medium text-ink">Ramesh Kumar</p>
            </div>
            <div className="rounded-xl bg-paper p-4">
              <p className="text-[12px] text-ink-soft">Vehicle No.</p>
              <p className="mt-1 text-[14px] font-medium text-ink">KA-05 AB 1234</p>
            </div>
            <div className="rounded-xl bg-paper p-4">
              <p className="text-[12px] text-ink-soft">ETA</p>
              <p className="mt-1 text-[14px] font-medium text-ink">14 minutes</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
