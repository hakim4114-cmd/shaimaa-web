export function StatCard({ label, value, detail }) {
  return (
    <div className="bg-ivory p-6 shadow-soft">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-henna">{label}</p>
      <p className="mt-3 font-display text-4xl font-bold text-cedar">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-coffee">{detail}</p> : null}
    </div>
  );
}
