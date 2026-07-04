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
      <span className="font-mono-tight text-[12px] font-medium uppercase text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
          {description}
        </p>
      )}
    </div>
  );
}
