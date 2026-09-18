"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Star, Video, Globe2, BriefcaseMedical, WifiOff } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { doctors as fallbackDoctors } from "@/lib/data";
import { api, type Doctor as ApiDoctor } from "@/lib/api";

type DisplayDoctor = {
  id: string;
  name: string;
  initials: string;
  speciality: string;
  experience: string;
  languages: string[];
  rating: number;
  online: boolean;
  fee: string;
};

function fromApi(d: ApiDoctor): DisplayDoctor {
  const name = d.user.full_name;
  return {
    id: d.id,
    name,
    initials: name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    speciality: d.speciality,
    experience: `${d.experience_years} yrs experience`,
    languages: d.languages.split(",").map((l) => l.trim()).filter(Boolean),
    rating: d.rating,
    online: d.is_online,
    fee: d.consultation_fee ? `₹${d.consultation_fee}` : "Contact for pricing",
  };
}

function fromFallback(d: (typeof fallbackDoctors)[number], i: number): DisplayDoctor {
  return {
    id: `sample-${i}`,
    name: d.name,
    initials: d.initials,
    speciality: d.speciality,
    experience: d.experience,
    languages: d.languages,
    rating: d.rating,
    online: d.online,
    fee: d.fee,
  };
}

export default function DoctorsPage() {
  const [query, setQuery] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [speciality, setSpeciality] = useState("All");

  const [liveDoctors, setLiveDoctors] = useState<DisplayDoctor[] | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.doctors
      .list()
      .then((data) => {
        if (cancelled) return;
        // Fetch succeeded — trust it even if it's an empty list. An empty
        // roster is a real state (no doctors added via admin yet), not a
        // reason to fall back to sample data.
        setLiveDoctors(data.map(fromApi));
        setFetchFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fetch actually failed (network/API down) — this is when we fall
        // back to sample doctors, since we have no real data to show.
        setLiveDoctors(null);
        setFetchFailed(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const usingFallback = fetchFailed;
  const allDoctors: DisplayDoctor[] = fetchFailed
    ? fallbackDoctors.map(fromFallback)
    : liveDoctors ?? [];

  const specialities = Array.from(new Set(allDoctors.map((d) => d.speciality)));

  const filtered = useMemo(() => {
    return allDoctors.filter((d) => {
      const matchesQuery =
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.speciality.toLowerCase().includes(query.toLowerCase());
      const matchesSpeciality = speciality === "All" || d.speciality === speciality;
      const matchesOnline = !onlineOnly || d.online;
      return matchesQuery && matchesSpeciality && matchesOnline;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, speciality, onlineOnly, liveDoctors]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="Doctor consultation"
        title="Find the right specialist"
        description="Search by name or speciality, filter by availability and book an in-person or video consultation."
      />

      {!loading && usingFallback && (
        <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
          <WifiOff className="h-4 w-4 shrink-0" />
          Showing sample doctors — couldn&apos;t reach the backend API, so live
          data isn&apos;t available right now.
        </div>
      )}

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
            key={d.id}
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
              {d.languages.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" /> {d.languages.join(", ")}
                </span>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <div>
                <p className="text-[11px] text-ink-soft">Consultation fee</p>
                <p className="font-mono-tight text-[14px] font-semibold text-ink">{d.fee}</p>
              </div>
              <Link
                href="/booking?service=online-doctor-consultation"
                className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-primary-dark"
              >
                Book Appointment
              </Link>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && !usingFallback && !loading && (
          <p className="col-span-full py-10 text-center text-[14px] text-ink-soft">
            {allDoctors.length === 0
              ? "No doctors have been added yet. Check back soon."
              : "No doctors match your filters. Try adjusting your search."}
          </p>
        )}
      </div>
    </div>
  );
}
