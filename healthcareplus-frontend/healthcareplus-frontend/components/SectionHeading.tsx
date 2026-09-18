import { cn } from "@/lib/utils";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <span className="font-mono-tight text-[11px] font-medium uppercase text-primary sm:text-[12px]">
        {eyebrow}
      </span>
      <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink sm:mt-3 sm:text-3xl md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-soft sm:mt-4 sm:text-[15.5px]">
          {description}
        </p>
      )}
    </div>
  );
}
