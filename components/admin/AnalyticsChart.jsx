export function AnalyticsChart() {
  return (
    <div className="bg-ivory p-6 shadow-soft">
      <p className="font-display text-3xl font-semibold text-cedar">Manual analytics placeholder</p>
      <p className="mt-2 text-sm leading-6 text-coffee">
        No live analytics source is connected. This chart is a visual placeholder for future Google Sheets or analytics data.
      </p>
      <div className="mt-6 flex h-48 items-end gap-3">
        {[22, 34, 26, 40, 31, 44].map((height) => (
          <div key={height} className="flex-1 bg-henna/50" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}
