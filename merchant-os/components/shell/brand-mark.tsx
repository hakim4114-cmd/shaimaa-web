export function BrandMark({ className = "size-7" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground ${className}`}>
      <svg viewBox="0 0 24 24" className="size-[60%]" fill="none" aria-hidden>
        <path d="M4 18V6l8 7 8-7v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
