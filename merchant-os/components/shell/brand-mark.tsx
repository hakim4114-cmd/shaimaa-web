// The Atlas mark: an "M" drawn as a path between three points, with a saffron
// dot above the middle stroke (the merchant, at the centre of the flow).
export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-[30%] bg-accent text-accent-foreground ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[64%]" fill="none" aria-hidden>
        <path d="M4 18V7.5L12 14l8-6.5V18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="5" r="1.7" fill="var(--sidebar-accent)" />
      </svg>
    </span>
  );
}
