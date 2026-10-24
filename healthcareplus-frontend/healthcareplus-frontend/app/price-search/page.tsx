"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Search } from "lucide-react";
import { api, ApiError, type PriceSearchResponse, type TestSuggestion } from "@/lib/api";
import SectionHeading from "@/components/SectionHeading";
import LocationChip from "@/components/LocationChip";
import { useLocation } from "@/contexts/LocationContext";

export default function PriceSearchPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TestSuggestion[]>([]);
  const [selected, setSelected] = useState<TestSuggestion | null>(null);
  const [pinEdit, setPinEdit] = useState<string | null>(null);
  const [data, setData] = useState<PriceSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const loc = useLocation();

  // default the pin to the user's saved location; typing overrides it
  const pin = pinEdit ?? loc.pin ?? "";
  const setPin = setPinEdit;

  // typeahead (debounced)
  useEffect(() => {
    if (selected || query.trim().length < 2) return;
    const id = ++reqId.current;
    const t = setTimeout(() => {
      api.prices
        .suggestTests(query.trim())
        .then((r) => id === reqId.current && setSuggestions(r))
        .catch(() => id === reqId.current && setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, selected]);

  const pinValid = pin === "" || /^\d{6}$/.test(pin);

  const search = async (test: TestSuggestion | null = selected) => {
    if (!test) return setError("Pick a test from the list first.");
    if (!pinValid) return setError("Pin code must be exactly 6 digits.");
    setError(null);
    setLoading(true);
    try {
      setData(await api.prices.search(test.id, pin || undefined));
    } catch (e) {
      setData(null);
      setError(e instanceof ApiError ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const exact = data?.results.filter((r) => r.match === "exact") ?? [];
  const nearby = data?.results.filter((r) => r.match === "nearby") ?? [];
  const all = data?.results.filter((r) => r.match === "any") ?? [];

  const group = (title: string, rows: typeof exact) =>
    rows.length > 0 && (
      <div className="mt-6">
        <h3 className="font-mono-tight text-[11px] font-medium uppercase text-primary">{title}</h3>
        <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-paper-raised">
          {rows.map((r, i) => (
            <li key={r.lab_id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <div className="text-[15px] font-semibold text-ink">
                  <Link href={`/labs/${r.lab_id}`} className="hover:text-primary hover:underline">{r.lab_name}</Link>
                  {i === 0 && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Lowest</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-soft">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {r.pin_code}
                    {r.match === "nearby" && r.distance_km !== null ? ` · ${r.distance_km} km away` : ""}
                  </span>
                  <span className="text-ink-soft/70">
                    Updated {new Date(r.updated_at + "Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="font-display text-2xl font-semibold text-ink">₹{r.price.toLocaleString("en-IN")}</div>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <SectionHeading
        eyebrow="Compare prices"
        title="Find the cheapest lab near you"
        description="Search a test, add your pin code, and see every lab that offers it — cheapest first."
      />
      <div className="mt-3">
        <LocationChip />
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-5 shadow-sm shadow-ink/5">
        <div className="relative">
          <label className="text-[12.5px] font-medium text-ink-soft">Test</label>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-line bg-paper px-3">
            <Search className="h-4 w-4 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); setData(null); }}
              placeholder="e.g. CBC, Lipid Profile"
              className="w-full bg-transparent py-3 text-[14px] outline-none"
            />
          </div>
          {!selected && suggestions.length > 0 && query.trim().length >= 2 && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-paper-raised shadow-lg">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    className="w-full px-4 py-2.5 text-left text-[14px] hover:bg-primary-soft"
                    onClick={() => { setSelected(s); setQuery(s.name); setSuggestions([]); search(s); }}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-[12.5px] font-medium text-ink-soft">Pin code (optional)</label>
            <input
              value={pin}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="800012"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-3 text-[14px] outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading || !selected}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-[14px] font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Search
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-[13.5px] text-emergency">{error}</p>}

      {data && (
        <div className="mt-2">
          <p className="mt-6 text-[14px] text-ink-soft">
            {data.results.length === 0
              ? `No lab offers ${data.test.name}${data.pin_code ? ` near ${data.pin_code}` : ""} yet.`
              : `${data.results.length} lab${data.results.length > 1 ? "s" : ""} offering ${data.test.name}`}
          </p>
          {group(`In pin code ${data.pin_code}`, exact)}
          {group("Nearby", nearby)}
          {group("All labs", all)}
        </div>
      )}
    </div>
  );
}
