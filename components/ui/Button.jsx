export function Button({ children, href = "#", variant = "primary" }) {
  const styles =
    variant === "secondary"
      ? "border border-cedar/25 text-cedar hover:border-henna hover:text-henna"
      : "bg-henna text-ivory shadow-soft hover:bg-cedar";

  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] transition ${styles}`}
    >
      {children}
    </a>
  );
}
