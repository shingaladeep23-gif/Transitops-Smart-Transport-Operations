import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata = { title: "Track Shipment — TransitOps" };

// Public page: only exposes non-sensitive, refNo-scoped data.
// No phone numbers, license numbers, revenue or cost figures.
export default async function TrackPage({ params }: { params: Promise<{ refNo: string }> }) {
  const { refNo } = await params;
  const trip = await prisma.trip.findUnique({
    where: { refNo: decodeURIComponent(refNo).toUpperCase() },
    select: {
      refNo: true,
      source: true,
      destination: true,
      status: true,
      createdAt: true,
      dispatchedAt: true,
      completedAt: true,
      podReceiver: true,
      vehicle: { select: { name: true, type: true } },
      driver: { select: { name: true } },
    },
  });

  const steps = trip
    ? [
        { label: "Order created", date: trip.createdAt, done: true },
        { label: "Dispatched — on the way", date: trip.dispatchedAt, done: trip.dispatchedAt != null },
        trip.status === "CANCELLED"
          ? { label: "Cancelled", date: null, done: true }
          : {
              label: trip.podReceiver ? `Delivered — received by ${trip.podReceiver}` : "Delivered",
              date: trip.completedAt,
              done: trip.status === "COMPLETED",
            },
      ]
    : [];

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950 dark:text-zinc-100">
      <AutoRefresh seconds={20} />
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold tracking-tight">
            Transit<span className="text-blue-600">Ops</span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Shipment Tracking</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {!trip ? (
            <div className="text-center">
              <p className="text-lg font-semibold">Shipment not found</p>
              <p className="mt-1 text-sm text-zinc-500">
                No shipment matches reference “{decodeURIComponent(refNo)}”. Check the link and try again.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs text-zinc-500">{trip.refNo}</div>
                  <div className="mt-1 text-xl font-semibold">
                    {trip.source} → {trip.destination}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    trip.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : trip.status === "CANCELLED"
                        ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400"
                        : trip.status === "DISPATCHED"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300"
                  }`}
                >
                  {trip.status === "DISPATCHED" ? "IN TRANSIT" : trip.status}
                </span>
              </div>

              <div className="mt-4 text-sm text-zinc-500">
                {trip.vehicle.type} · {trip.vehicle.name} · Driver {trip.driver.name.split(" ")[0]}
              </div>

              <ol className="mt-6 space-y-0">
                {steps.map((s, i) => (
                  <li key={s.label} className="relative flex gap-4 pb-8 last:pb-0">
                    {i < steps.length - 1 && (
                      <span
                        className={`absolute left-[9px] top-6 h-full w-0.5 ${
                          steps[i + 1].done ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"
                        }`}
                      />
                    )}
                    <span
                      className={`relative mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${
                        s.done
                          ? "border-blue-600 bg-blue-600"
                          : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                      }`}
                    >
                      {s.done && (
                        <svg viewBox="0 0 16 16" className="h-full w-full text-white">
                          <path fill="currentColor" d="M6.5 10.6 3.9 8l-1 1 3.6 3.6 7-7-1-1z" />
                        </svg>
                      )}
                    </span>
                    <div>
                      <div className={`text-sm font-medium ${s.done ? "" : "text-zinc-400"}`}>{s.label}</div>
                      {s.date && <div className="text-xs text-zinc-500">{fmtDate(s.date)}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-zinc-400">
          Questions about your delivery? Contact your logistics provider.
        </p>
      </div>
    </main>
  );
}
