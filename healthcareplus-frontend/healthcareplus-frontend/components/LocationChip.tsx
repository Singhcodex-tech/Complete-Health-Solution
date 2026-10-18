"use client";

import { MapPin } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";

export default function LocationChip({ className = "" }: { className?: string }) {
  const { pin, area, city, ready, openPrompt } = useLocation();
  if (!ready) return null;
  const place = area ?? city;
  return (
    <button
      onClick={openPrompt}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3.5 py-1.5 text-[12.5px] font-medium text-ink hover:border-primary hover:text-primary ${className}`}
    >
      <MapPin className="h-3.5 w-3.5 text-primary" />
      {pin ? (
        <>
          {place ? `${place} · ` : ""}
          <span className="font-mono-tight">{pin}</span>
          <span className="text-ink-soft">· Change</span>
        </>
      ) : (
        "Set your location"
      )}
    </button>
  );
}
