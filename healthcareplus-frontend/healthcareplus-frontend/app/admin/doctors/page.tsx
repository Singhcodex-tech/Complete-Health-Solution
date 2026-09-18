"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Save,
  ChevronDown,
  Stethoscope,
  LogIn,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type Doctor } from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";

export default function AdminDoctorsPage() {
  const { user, token, loading: authLoading } = useAuth();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => {
    if (!token) return;
    setLoading(true);
    api.doctors
      .adminList(token)
      .then(setDoctors)
      .catch(() => setError("Couldn't load doctors from the backend."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      if (!cancelled) setLoading(true);
      try {
        const data = await api.doctors.adminList(token);
        if (!cancelled) setDoctors(data);
      } catch {
        if (!cancelled) setError("Couldn't load doctors from the backend.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  if (authLoading || (loading && user)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-line bg-paper-raised p-10 text-center shadow-sm shadow-ink/5 my-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
          <LogIn className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">Log in required</h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">
          This dashboard is restricted to admin accounts.
        </p>
        <Link
          href="/login?next=/admin/doctors"
          className="mt-6 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark"
        >
          Log In
        </Link>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-line bg-paper-raised p-10 text-center shadow-sm shadow-ink/5 my-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emergency-soft">
          <ShieldAlert className="h-6 w-6 text-emergency" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">Admins only</h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">
          Your account ({user.email}) is signed in as a {user.role}, which doesn&apos;t have
          access to this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Admin dashboard"
        title="Manage doctors"
        description="Add, edit, or remove doctor profiles. Changes save directly to the database and appear immediately on the public /doctors page."
      />

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[13.5px] text-accent"
          >
            {notice}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-6 rounded-xl border border-emergency/30 bg-emergency-soft px-4 py-3 text-[13.5px] text-emergency"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AddDoctorForm
        token={token!}
        onCreated={() => {
          refresh();
          setNotice("Doctor added.");
        }}
        onError={setError}
      />

      <div className="mt-10 space-y-4">
        {doctors.length === 0 ? (
          <p className="text-[13.5px] text-ink-soft">No doctors yet — add one above.</p>
        ) : (
          doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              token={token!}
              onChange={() => refresh()}
              onNotice={setNotice}
              onError={setError}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AddDoctorForm({
  token,
  onCreated,
  onError,
}: {
  token: string;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [experience, setExperience] = useState("");
  const [languages, setLanguages] = useState("English");
  const [fee, setFee] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !password || !speciality) {
      onError("Fill in name, email, phone, password, and speciality.");
      return;
    }
    setSubmitting(true);
    try {
      await api.doctors.adminCreate(token, {
        full_name: fullName,
        email,
        phone,
        password,
        speciality,
        experience_years: experience ? Number(experience) : 0,
        languages: languages || "English",
        consultation_fee: fee ? Number(fee) : 0,
        bio: bio || undefined,
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setSpeciality("");
      setExperience("");
      setLanguages("English");
      setFee("");
      setBio("");
      setOpen(false);
      onCreated();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't add the doctor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line bg-paper-raised p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
          <Plus className="h-4 w-4 text-primary" /> Add a new doctor
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
              <input
                required
                placeholder="Speciality (e.g. Cardiologist)"
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                className={inputClass}
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <input
                required
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
              <input
                required
                type="password"
                placeholder="Login password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                placeholder="Experience (years)"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="Languages (comma separated)"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                placeholder="Consultation fee (₹)"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className={inputClass}
              />
              <textarea
                placeholder="Short bio (optional)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={`${inputClass} sm:col-span-2 min-h-[80px] resize-none`}
              />
              <button
                type="submit"
                disabled={submitting}
                className="sm:col-span-2 rounded-lg bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {submitting ? "Adding…" : "Add doctor"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DoctorCard({
  doctor,
  token,
  onChange,
  onNotice,
  onError,
}: {
  doctor: Doctor;
  token: string;
  onChange: () => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [speciality, setSpeciality] = useState(doctor.speciality);
  const [experience, setExperience] = useState(String(doctor.experience_years));
  const [languages, setLanguages] = useState(doctor.languages);
  const [fee, setFee] = useState(String(doctor.consultation_fee));
  const [isOnline, setIsOnline] = useState(doctor.is_online);
  const [bio, setBio] = useState(doctor.bio ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.doctors.adminUpdate(token, doctor.id, {
        speciality,
        experience_years: Number(experience) || 0,
        languages,
        consultation_fee: Number(fee) || 0,
        is_online: isOnline,
        bio,
      });
      onNotice("Doctor updated.");
      setEditing(false);
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't update the doctor.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove Dr. ${doctor.user.full_name}? This deletes their profile and login.`)) return;
    try {
      await api.doctors.adminDelete(token, doctor.id);
      onNotice("Doctor removed.");
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Couldn't remove the doctor.");
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-[16px] font-semibold text-ink">
              Dr. {doctor.user.full_name}
            </p>
            <p className="text-[13px] text-ink-soft">
              {doctor.user.email} · {doctor.user.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
              doctor.is_online
                ? "bg-accent-soft text-accent"
                : "bg-paper text-ink-soft"
            }`}
          >
            {doctor.is_online ? "Online" : "Offline"}
          </span>
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-primary hover:text-primary"
            aria-label="Edit doctor"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${editing ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={remove}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft hover:border-emergency hover:text-emergency"
            aria-label="Remove doctor"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-line pt-4 sm:grid-cols-2">
              <input
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
                placeholder="Speciality"
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Experience (years)"
                className={inputClass}
              />
              <input
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="Languages"
                className={inputClass}
              />
              <input
                type="number"
                min={0}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="Consultation fee (₹)"
                className={inputClass}
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio"
                className={`${inputClass} sm:col-span-2 min-h-[70px] resize-none`}
              />
              <label className="flex items-center gap-2 text-[13.5px] text-ink-soft sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-primary"
                />
                Online / available for booking
              </label>
              <button
                onClick={save}
                disabled={saving}
                className="sm:col-span-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-line bg-paper-raised px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-primary";
