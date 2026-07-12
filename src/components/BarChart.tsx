type Bar = { label: string; value: number; display: string };

export default function BarChart({
  title,
  bars,
  color = "bg-blue-500",
}: {
  title: string;
  bars: Bar[];
  color?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="space-y-2.5">
        {bars.length === 0 && <p className="text-sm text-zinc-400">No data yet.</p>}
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-0.5 flex items-baseline justify-between text-xs">
              <span className="font-mono">{b.label}</span>
              <span className="font-medium text-zinc-600 dark:text-zinc-300">{b.display}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${Math.max(2, (b.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
