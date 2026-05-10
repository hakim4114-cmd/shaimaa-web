export function IconTextRow({
  icon,
  children,
  direction = "rtl",
  className = "",
  iconClassName = "",
  textClassName = ""
}) {
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <div dir={direction} className={`flex items-start gap-3 ${textAlignment} ${className}`}>
      <span className={`shrink-0 pt-1 ${iconClassName}`}>{icon}</span>
      <span className={`min-w-0 flex-1 ${textAlignment} ${textClassName}`}>{children}</span>
    </div>
  );
}
