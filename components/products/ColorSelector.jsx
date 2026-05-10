export function ColorSelector({ colors, label = "Color", colorLabels = {} }) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-coffee">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <span
            key={color}
            className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-pearl px-4 py-2 text-sm font-semibold text-cedar"
          >
            <span className="h-3 w-3 rounded-full bg-brass" />
            {colorLabels[color] || color}
          </span>
        ))}
      </div>
    </div>
  );
}
