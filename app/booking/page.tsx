"use client";

import { Suspense, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, Siren } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { services } from "@/lib/data";

function BookingForm() {
  const params = useSearchParams();
  const preselected = params.get("service") ?? "";
  const [emergency, setEmergency] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-line bg-paper-raised p-10 text-center shadow-lg shadow-ink/5"
      >
        <CheckCircle2 className="h-12 w-12 text-accent" />
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
          Booking request received
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
          A care coordinator will call you within 15 minutes to confirm the
          appointment and share provider details.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark"
        >
          Make another booking
        </button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-3xl rounded-2xl border border-line bg-paper-raised p-6 shadow-sm shadow-ink/5 md:p-10"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Patient Name" required>
          <input required type="text" placeholder="Full name" className={inputClass} />
        </Field>
        <Field label="Age" required>
          <input required type="number" min={0} placeholder="e.g. 42" className={inputClass} />
        </Field>
        <Field label="Gender" required>
          <select required className={inputClass} defaultValue="">
            <option value="" disabled>Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Phone Number" required>
          <input required type="tel" placeholder="+91 98765 43210" className={inputClass} />
        </Field>
        <Field label="Email Address" required>
          <input required type="email" placeholder="you@example.com" className={inputClass} />
        </Field>
        <Field label="City" required>
          <input required type="text" placeholder="e.g. Bengaluru" className={inputClass} />
        </Field>
        <Field label="Address" required className="sm:col-span-2">
          <input required type="text" placeholder="House no, street, area" className={inputClass} />
        </Field>
        <Field label="PIN Code" required>
          <input required type="text" placeholder="560001" className={inputClass} />
        </Field>
        <Field label="Service" required>
          <select required className={inputClass} defaultValue={preselected}>
            <option value="" disabled>Select a service</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Doctor Preference">
          <select className={inputClass} defaultValue="">
            <option value="">No preference</option>
            <option>Male doctor</option>
            <option>Female doctor</option>
          </select>
        </Field>
        <Field label="Preferred Date" required>
          <div className="relative">
            <input required type="date" className={inputClass} />
            <CalendarClock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          </div>
        </Field>
        <Field label="Preferred Time" required>
          <input required type="time" className={inputClass} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea rows={3} placeholder="Anything our team should know?" className={`${inputClass} resize-none`} />
        </Field>
      </div>

      <button
        type="button"
        onClick={() => setEmergency((v) => !v)}
        className={`mt-6 flex w-full items-center justify-between rounded-xl border px-4 py-3.5 transition-colors ${
          emergency ? "border-emergency bg-emergency-soft" : "border-line bg-paper"
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Siren className={`h-5 w-5 ${emergency ? "text-emergency" : "text-ink-soft"}`} />
          <span className={`text-[14px] font-medium ${emergency ? "text-emergency" : "text-ink"}`}>
            This is an emergency booking
          </span>
        </span>
        <span
          className={`relative h-6 w-11 rounded-full transition-colors ${
            emergency ? "bg-emergency" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              emergency ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>

      <button
        type="submit"
        className="mt-6 w-full rounded-full bg-primary py-4 text-[15px] font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Confirm Booking
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-paper-raised px-4 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[13px] font-medium text-ink">
        {label} {required && <span className="text-emergency">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function BookingPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="Book a visit"
        title="Tell us what you need"
        description="Fill in the details below and our care coordinators will confirm your appointment shortly."
        align="center"
        className="mx-auto"
      />
      <div className="mt-10">
        <Suspense fallback={null}>
          <BookingForm />
        </Suspense>
      </div>
    </div>
  );
}
