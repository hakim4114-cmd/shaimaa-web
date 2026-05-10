export function SectionTitle({ label, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-henna">{label}</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-cedar sm:text-5xl">{title}</h1>
      {text ? <p className="mt-4 leading-7 text-coffee">{text}</p> : null}
    </div>
  );
}
