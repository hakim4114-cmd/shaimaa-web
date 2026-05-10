import Link from "next/link";

export function SizeSelector({ sizes, labels }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-coffee">{labels.size}</p>
        <Link href="/size-guide" className="text-sm font-semibold text-henna underline-offset-4 hover:underline">
          {labels.sizeGuide}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <span
            key={size}
            className="min-w-12 rounded-full border border-brass/50 px-4 py-2 text-center text-sm font-semibold text-cedar"
          >
            {size}
          </span>
        ))}
      </div>
    </div>
  );
}
