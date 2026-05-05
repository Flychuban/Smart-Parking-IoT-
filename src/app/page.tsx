"use client";

import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { bg } from "date-fns/locale";
import { Car, CircleParking, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Spot = {
  id: number;
  label: string;
  isOccupied: boolean;
  distanceCm: number | null;
  lastUpdated: string;
};

type SensorEvent = {
  id: number;
  spotId: number;
  status: "OCCUPIED" | "FREE";
  distanceCm: number;
  timestamp: string;
  spot: { label: string };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatRelative(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: bg });
}

function StatCard({
  label,
  value,
  accent,
  children,
}: {
  label: string;
  value: string;
  accent: "green" | "red" | "blue";
  children?: React.ReactNode;
}) {
  const accentText =
    accent === "green"
      ? "text-emerald-400"
      : accent === "red"
        ? "text-rose-400"
        : "text-sky-400";
  return (
    <Card className="bg-slate-900 border-slate-800 ring-1 ring-slate-800 hover:ring-slate-700 transition-all p-6 gap-3">
      <div className="text-sm uppercase tracking-wider text-slate-400 font-medium">
        {label}
      </div>
      <div className={cn("text-6xl font-bold tabular-nums", accentText)}>
        {value}
      </div>
      {children}
    </Card>
  );
}

function SpotCard({ spot }: { spot: Spot }) {
  const noSignal = spot.distanceCm == null;
  const occupied = spot.isOccupied;

  return (
    <Card
      className={cn(
        "relative p-6 gap-3 transition-all duration-500 ring-1 border-0",
        "bg-slate-900 ring-slate-800",
        !noSignal && occupied && "bg-rose-950/40 ring-rose-500/40 animate-pulse",
        !noSignal && !occupied && "bg-emerald-950/30 ring-emerald-500/30",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="text-5xl font-bold tracking-tight">{spot.label}</div>
        <div
          className={cn(
            "rounded-full p-3",
            noSignal
              ? "bg-slate-800 text-slate-500"
              : occupied
                ? "bg-rose-500/20 text-rose-300"
                : "bg-emerald-500/20 text-emerald-300",
          )}
        >
          {occupied ? (
            <Car className="size-6" />
          ) : (
            <CircleParking className="size-6" />
          )}
        </div>
      </div>

      {noSignal ? (
        <div className="text-sm text-slate-500 italic mt-2">
          Очаква се сигнал от сензор...
        </div>
      ) : (
        <>
          <div>
            <Badge
              className={cn(
                "text-xs px-2.5 py-1 font-semibold",
                occupied
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
              )}
              variant="outline"
            >
              {occupied ? "🔴 ЗАЕТО" : "🟢 СВОБОДНО"}
            </Badge>
          </div>
          <div className="mt-1 space-y-1 text-sm text-slate-400">
            <div>
              Разстояние:{" "}
              <span className="font-mono text-slate-300">
                {spot.distanceCm?.toFixed(1)} см
              </span>
            </div>
            <div>Актуализирано {formatRelative(spot.lastUpdated)}</div>
          </div>
        </>
      )}
    </Card>
  );
}

function EventRow({ event }: { event: SensorEvent }) {
  const occupied = event.status === "OCCUPIED";
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-slate-900/50 ring-1 ring-slate-800 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden>
          {occupied ? "🚗" : "✅"}
        </span>
        <span className="text-slate-200">
          {occupied ? "Кола паркира на " : "Кола напусна "}
          <span className="font-bold text-white">{event.spot.label}</span>
        </span>
      </div>
      <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
        {formatRelative(event.timestamp)}
      </span>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-slate-900 ring-1 ring-slate-800 animate-pulse",
        className,
      )}
    />
  );
}

export default function Home() {
  const { data: spots } = useSWR<Spot[]>("/api/spots", fetcher, {
    refreshInterval: 1000,
  });
  const { data: events } = useSWR<SensorEvent[]>("/api/events", fetcher, {
    refreshInterval: 1000,
  });

  const total = spots?.length ?? 0;
  const occupied = spots?.filter((s) => s.isOccupied).length ?? 0;
  const free = total - occupied;
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <span aria-hidden>🅿️</span> Умен Паркинг
            </h1>
            <p className="text-sm text-slate-400">
              IoT мониторинг в реално време
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-medium">На живо</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-10">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {spots ? (
            <>
              <StatCard
                label="Свободни места"
                value={String(free)}
                accent="green"
              />
              <StatCard
                label="Заети места"
                value={String(occupied)}
                accent="red"
              />
              <StatCard
                label="Заетост"
                value={`${occupancyPct}%`}
                accent="blue"
              >
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-700"
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
              </StatCard>
            </>
          ) : (
            <>
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-200">Паркоместа</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {spots
              ? spots.map((s) => <SpotCard key={s.id} spot={s} />)
              : Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="size-5 text-slate-400" />
            История на събитията
          </h2>
          <div className="space-y-2">
            {events && events.length === 0 && (
              <div className="text-sm text-slate-500 italic px-4 py-6 text-center">
                Все още няма събития.
              </div>
            )}
            {events
              ? events.map((e) => <EventRow key={e.id} event={e} />)
              : Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
          </div>
        </section>

        <footer className="pt-8 pb-4 text-xs text-slate-600 text-center">
          ESP32 → Next.js → PostgreSQL · обновяване на всяка секунда
        </footer>
      </main>
    </div>
  );
}
