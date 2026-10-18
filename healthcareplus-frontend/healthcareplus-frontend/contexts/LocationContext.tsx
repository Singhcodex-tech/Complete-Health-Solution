"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";

const STORAGE_KEY = "healthcareplus:location";
const DISMISS_KEY = "healthcareplus:location-dismissed";
const DISMISS_DAYS = 7;

type Saved = {
  pin: string;
  area: string | null;
  city: string | null;
  source: "gps" | "manual";
};

type LocationContextValue = {
  pin: string | null;
  area: string | null;
  city: string | null;
  source: "gps" | "manual" | null;
  /** false until localStorage has been read (avoids a flash of "no location") */
  ready: boolean;
  detecting: boolean;
  error: string | null;
  promptOpen: boolean;
  openPrompt: () => void;
  /** dismiss=true remembers "not now" for a week so we don't nag */
  closePrompt: (dismiss?: boolean) => void;
  detect: () => Promise<void>;
  setManualPin: (pin: string) => boolean;
  clear: () => void;
  wasDismissedRecently: () => boolean;
};

const Ctx = createContext<LocationContextValue | null>(null);

function readSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Saved;
    return /^\d{6}$/.test(v.pin) ? v : null;
  } catch {
    return null;
  }
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [ready, setReady] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setSaved(readSaved());
    setReady(true);
  }, []);

  const persist = useCallback((v: Saved | null) => {
    setSaved(v);
    try {
      if (v) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // private mode etc. — still works for this session
    }
  }, []);

  const wasDismissedRecently = useCallback(() => {
    try {
      const t = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
      return t > 0 && Date.now() - t < DISMISS_DAYS * 86_400_000;
    } catch {
      return false;
    }
  }, []);

  const openPrompt = useCallback(() => {
    setError(null);
    setPromptOpen(true);
  }, []);

  const closePrompt = useCallback((dismiss = false) => {
    setPromptOpen(false);
    setError(null);
    if (dismiss) {
      try {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        // ignore
      }
    }
  }, []);

  const detect = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This browser can't share location. Please enter your pin code.");
      return;
    }
    setDetecting(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12_000,
          maximumAge: 10 * 60_000,
        })
      );
      const g = await api.geo.reverse(pos.coords.latitude, pos.coords.longitude);
      persist({ pin: g.pin_code, area: g.area ?? null, city: g.city ?? null, source: "gps" });
      setPromptOpen(false);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else if (typeof e === "object" && e !== null && "code" in e) {
        const code = (e as GeolocationPositionError).code;
        setError(
          code === 1
            ? "Location permission is blocked. Allow it in your browser, or enter your pin code below."
            : "Couldn't get your location. Please enter your pin code below."
        );
      } else {
        setError("Couldn't reach the server. Please enter your pin code below.");
      }
    } finally {
      setDetecting(false);
    }
  }, [persist]);

  const setManualPin = useCallback(
    (pin: string) => {
      const clean = pin.trim();
      if (!/^\d{6}$/.test(clean)) {
        setError("Pin code must be exactly 6 digits.");
        return false;
      }
      persist({ pin: clean, area: null, city: null, source: "manual" });
      setPromptOpen(false);
      setError(null);
      return true;
    },
    [persist]
  );

  const clear = useCallback(() => persist(null), [persist]);

  const value = useMemo<LocationContextValue>(
    () => ({
      pin: saved?.pin ?? null,
      area: saved?.area ?? null,
      city: saved?.city ?? null,
      source: saved?.source ?? null,
      ready,
      detecting,
      error,
      promptOpen,
      openPrompt,
      closePrompt,
      detect,
      setManualPin,
      clear,
      wasDismissedRecently,
    }),
    [saved, ready, detecting, error, promptOpen, openPrompt, closePrompt, detect, setManualPin, clear, wasDismissedRecently]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocation(): LocationContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLocation must be used inside <LocationProvider>");
  return v;
}
