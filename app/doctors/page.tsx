"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Star, Video, Globe2, BriefcaseMedical } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { doctors } from "@/lib/data";

export default function DoctorsPage() {
  const [query, setQuery] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const specialities = Array.from(new Set(doctors.map((d) => d.speciality)));
  const [speciality, setSpeciality] = useState("All");

  const filtered = useMemo(() => {
    return doctors.filter((d) => {
      const matchesQuery =
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.speciality.toLowerCase().includes(query.toLowerCase());
      const matchesSpeciality = speciality === "All" || d.speciality === speciality;
      const matchesOnline = !onlineOnly || d.online;
      return matchesQuery && matchesSpeciality && matchesOnline;
    });
  }, [query, speciality, onlineOnly]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="Doctor consultation"
        title="Find the right specialist"
        description="Search by name or speciality, filter by availability and book an in-person or video consultation."
      />

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5">
          <Search className="h-4.5 w-4.5 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search doctor or speciality…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-soft/70"
          />
        </div>
        <select
          value={speciality}
          onChange={(e) => setSpeciality(e.target.value)}
          className="rounded-xl border border-line px-3.5 py-2.5 text-[14px] text-ink outline-none"
        >
          <option>All</option>
          {specialities.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setOnlineOnly((v) => !v)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] font-medium transition-colors ${
            onlineOnly ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft"
          }`}
        >
          <Video className="h-4 w-4" /> Online now
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((d, i) => (
          <motion.div
            key={d.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: (i % 6) * 0.05 }}
            className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm shadow-ink/5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft font-display text-[16px] font-semibold text-primary">
                  {d.initials}
                </div>
                <div>
                  <h3 className="font-display text-[16px] font-semibold text-ink">
                    {d.name}
                  </h3>
                  <p className="text-[13px] text-ink-soft">{d.speciality}</p>
                </div>
              </div>
              {d.online && (
                <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Online
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-ink-soft">
              <span className="flex items-center gap-1.5">
                <BriefcaseMedical className="h-3.5 w-3.5" /> {d.experience}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {d.rating}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe2 className="h-3.5 w-3.5" /> {d.languages.join(", ")}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <div>
                <p className="text-[11px] text-ink-soft">Consultation fee</p>
                <p className="font-mono-tight text-[14px] font-semibold text-ink">{d.fee}</p>
              </div>
              <button className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-primary-dark">
                Book Appointment
              </button>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-[14px] text-ink-soft">
            No doctors match your filters. Try adjusting your search.
          </p>
        )}
      </div>
    </div>
  );
}
