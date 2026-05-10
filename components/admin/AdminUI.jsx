import Link from "next/link";

export function AdminPageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b border-brass/20 pb-6 md:flex-row md:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-henna">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-cedar sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl leading-7 text-coffee">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function AdminStatCard({ label, value, detail, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "border-henna/35 bg-henna/10"
      : tone === "success"
        ? "border-emerald-800/20 bg-emerald-50"
        : "border-brass/25 bg-ivory";

  return (
    <div className={`border p-5 shadow-soft ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-coffee">{label}</p>
      <p className="mt-3 font-display text-4xl font-bold text-cedar">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-coffee">{detail}</p> : null}
    </div>
  );
}

export function AdminSectionCard({ title, description, children, footer }) {
  return (
    <section className="bg-ivory p-5 shadow-soft sm:p-6">
      <div className="mb-5">
        <h2 className="font-display text-3xl font-semibold text-cedar">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-coffee">{description}</p> : null}
      </div>
      {children}
      {footer ? <div className="mt-5 border-t border-brass/20 pt-4">{footer}</div> : null}
    </section>
  );
}

export function AdminStatusBadge({ children, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-800/25 bg-emerald-50 text-emerald-900"
      : tone === "warning"
        ? "border-henna/30 bg-henna/10 text-henna"
        : tone === "danger"
          ? "border-red-900/25 bg-red-50 text-red-900"
          : "border-brass/30 bg-pearl text-coffee";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${toneClass}`}>
      {children}
    </span>
  );
}

export function AdminEmptyState({ title, description, href, actionLabel }) {
  return (
    <div className="border border-dashed border-brass/40 bg-pearl p-6 text-center">
      <h3 className="font-display text-2xl font-semibold text-cedar">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-coffee">{description}</p>
      {href && actionLabel ? (
        <Link
          href={href}
          className="mt-4 inline-flex rounded-full border border-cedar/25 px-5 py-3 text-sm font-bold text-cedar transition hover:border-henna hover:text-henna"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function AdminButton({ children, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded-full border border-brass/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-cedar transition hover:border-henna hover:text-henna disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
