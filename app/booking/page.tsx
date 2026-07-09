"use client";

import { Suspense, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, LogIn, Siren } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { services } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";

function BookingForm() {
  const params = useSearchParams();
  const preselected = params.get("service") ?? "";
  const preNotes = params.get("notes") ?? "";
  const { user, token, loading: authLoading } = useAuth();

  const [emergency, setEmergency] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [service, setService] = useState(preselected);
  const [doctorPreference, setDoctorPreference] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState(preNotes);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);

    try {
      // Save the profile details alongside this booking.
      await api.patients.updateMe(token, {
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
        address: address || undefined,
        city: city || undefined,
        pincode: pincode || undefined,
      });

      const combinedNotes = [
        doctorPreference && `Doctor preference: ${doctorPreference}`,
        notes,
      ]
        .filter(Boolean)
        .join(" — ");

      await api.bookings.create(token, {
        service_slug: service,
        preferred_date: date,
        preferred_time: `${time}:00`,
        is_emergency: emergency,
        notes: combinedNotes || undefined,
      });

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reach the server. Make sure the backend is running."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-line bg-paper-raised p-10 text-center shadow-sm shadow-ink/5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
          <LogIn className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">
          Log in to book a visit
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
          Create a free account or log in so we can attach this booking to
          your profile and keep you updated on its status.
        </p>
        <Link
          href={`/login?next=/booking${service ? `?service=${service}` : ""}`}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark"
        >
          Log In / Sign Up
        </Link>
      </div>
    );
  }

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
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-primary">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[13.5px] font-medium text-ink">{user.full_name}</p>
          <p className="text-[12px] text-ink-soft">
            {user.email} · {user.phone}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Age" required>
          <input
            required
            type="number"
            min={0}
            placeholder="e.g. 42"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Gender" required>
          <select
            required
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>Select gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="City" required>
          <input
            required
            type="text"
            placeholder="e.g. Bengaluru"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="PIN Code" required>
          <input
            required
            type="text"
            placeholder="560001"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Address" required className="sm:col-span-2">
          <input
            required
            type="text"
            placeholder="House no, street, area"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Service" required>
          <select
            required
            value={service}
            onChange={(e) => setService(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>Select a service</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Doctor Preference">
          <select
            value={doctorPreference}
            onChange={(e) => setDoctorPreference(e.target.value)}
            className={inputClass}
          >
            <option value="">No preference</option>
            <option>Male doctor</option>
            <option>Female doctor</option>
          </select>
        </Field>
        <Field label="Preferred Date" required>
          <div className="relative">
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
            <CalendarClock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          </div>
        </Field>
        <Field label="Preferred Time" required>
          <input
            required
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            rows={3}
            placeholder="Anything our team should know?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputClass} resize-none`}
          />
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

      {error && (
        <div className="mt-4 rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13px] text-emergency">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-full bg-primary py-4 text-[15px] font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Confirm Booking"}
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
