"use client";

export default function VitalsDivider({
  className = "",
  color = "var(--primary)",
  animate = true,
}: {
  className?: string;
  color?: string;
  animate?: boolean;
}) {
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1400 60"
        preserveAspectRatio="none"
        className="h-10 w-full md:h-14"
      >
        <path
          d="M0 30 H140 L165 30 L180 8 L200 52 L220 30 L240 30 L255 18 L268 42 L280 30 H420
             H560 L585 30 L600 8 L620 52 L640 30 L660 30 L675 18 L688 42 L700 30 H840
             H980 L1005 30 L1020 8 L1040 52 L1060 30 L1080 30 L1095 18 L1108 42 L1120 30 H1400"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate ? "vital-path" : ""}
          style={{ opacity: 0.5 }}
        />
      </svg>
    </div>
  );
}
