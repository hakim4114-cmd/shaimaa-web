export function Badge({ children }) {
  return (
    <span className="inline-flex rounded-full bg-cedar px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-ivory">
      {children}
    </span>
  );
}
