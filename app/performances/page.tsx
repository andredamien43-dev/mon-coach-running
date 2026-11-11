
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Activity = {
  id: string;
  name: string;
  started_at: string;
  distance_m: number;
  moving_time_s: number;
  average_hr: number | null;
  max_hr: number | null;
  average_watts: number | null;
  average_cadence: number | null;
};

type WeeklyMetric = {
  label: string;
  km: number;
  pace: number | null;
  hr: number | null;
  watts: number | null;
  cadence: number | null;
};

function mondayOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function formatPace(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatKm(value: number) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function weightedAverage(
  rows: Activity[],
  field: "average_hr" | "average_watts" | "average_cadence"
) {
  const valid = rows.filter(
    (a) => Number(a[field]) > 0 && Number(a.distance_m) > 0
  );

  const distance = valid.reduce(
    (sum, a) => sum + Number(a.distance_m),
    0
  );

  if (!distance) return null;

  return valid.reduce(
    (sum, a) =>
      sum + Number(a[field]) * Number(a.distance_m),
    0
  ) / distance;
}

function MetricChart({
  title,
  subtitle,
  values,
  color = "bg-lime-400",
  unit,
  formatter,
  lowerIsBetter = false,
}: {
  title: string;
  subtitle: string;
  values: { label: string; value: number | null }[];
  color?: string;
  unit: string;
  formatter: (value: number) => string;
  lowerIsBetter?: boolean;
}) {
  const valid = values
    .map((item) => item.value)
    .filter((value): value is number => value !== null && value > 0);

  const max = Math.max(1, ...valid);
  const min = Math.min(...valid);
  const range = Math.max(1, max - min);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

      <div className="mt-7 flex h-48 items-end justify-between gap-2 border-b border-white/10 pb-2">
        {values.map((item, index) => {
          const value = item.value;
          const height =
            value === null
              ? 0
              : 20 + ((value - min) / range) * 105;

          return (
            <div
              key={`${item.label}-${index}`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              title={value === null ? "Aucune donnée" : `${formatter(value)} ${unit}`}
            >
              <span className="text-[10px] text-gray-400">
                {value === null ? "--" : formatter(value)}
              </span>
              <div
                className={`w-full max-w-12 rounded-t-lg ${color}`}
                style={{
                  height: value === null ? "0px" : `${height}px`,
                  opacity: value === null ? 0 : 0.9,
                }}
              />
              <span className="text-[10px] text-gray-500">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {valid.length === 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Pas encore de données disponibles pour cet indicateur.
        </p>
      )}
      {valid.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          {lowerIsBetter
            ? "Une valeur plus basse indique une amélioration."
            : "Évolution calculée à partir des séances enregistrées."}
        </p>
      )}
    </section>
  );
}

export default function Performances() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [period, setPeriod] = useState("8");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
      
    async function loadActivities() {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError("Connecte-toi pour consulter tes performances.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("activities")
        .select(
          "id, name, started_at, distance_m, moving_time_s, average_hr, max_hr, average_watts, average_cadence"
        )
        .eq("user_id", userData.user.id)
        .order("started_at", { ascending: true });

      if (queryError) {
        setError("Impossible de charger tes activités.");
        setLoading(false);
        return;
      }

      setActivities((data || []) as Activity[]);
      setLoading(false);
    }

 loadActivities();
    setNow(new Date());
  }, []);

   const stats = useMemo(() => {
    if (!now) return null;
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent = activities.filter((a) => {
      const date = new Date(a.started_at);
      return date >= thirtyDaysAgo && date <= now;
    });

    const totalKm = activities.reduce(
      (sum, a) => sum + (Number(a.distance_m) || 0),
      0
    ) / 1000;

    const recentKm = recent.reduce(
      (sum, a) => sum + (Number(a.distance_m) || 0),
      0
    ) / 1000;

    const recentDistance = recent.reduce(
      (sum, a) => sum + (Number(a.distance_m) || 0),
      0
    );

    const recentTime = recent.reduce(
      (sum, a) => sum + (Number(a.moving_time_s) || 0),
      0
    );

    const maxHr = recent.reduce(
      (max, a) => Math.max(max, Number(a.max_hr) || 0),
      0
    );

    const currentMonday = mondayOf(now);

    const weekly: WeeklyMetric[] = Array.from(
      { length: 8 },
      (_, index) => {
        const start = new Date(currentMonday);
        start.setDate(start.getDate() - 7 * (7 - index));

        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        const rows = activities.filter((a) => {
          const date = new Date(a.started_at);
          return date >= start && date < end;
        });

        const distance = rows.reduce(
          (sum, a) => sum + (Number(a.distance_m) || 0),
          0
        );

        const time = rows.reduce(
          (sum, a) => sum + (Number(a.moving_time_s) || 0),
          0
        );

        return {
          label: start.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
          }),
          km: distance / 1000,
          pace: distance > 0 ? time / (distance / 1000) : null,
          hr: weightedAverage(rows, "average_hr"),
          watts: weightedAverage(rows, "average_watts"),
          cadence: weightedAverage(rows, "average_cadence"),
        };
      }
    );

    const monthly = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1
      );
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const km = activities
        .filter((a) => {
          const d = new Date(a.started_at);
          return d >= date && d < next;
        })
        .reduce((sum, a) => sum + Number(a.distance_m || 0), 0) / 1000;

      return {
        label: date.toLocaleDateString("fr-FR", { month: "short" }),
        km,
      };
    });

    return {
      totalKm,
      recentKm,
      recentCount: recent.length,
      recentPace:
        recentDistance > 0 ? recentTime / (recentDistance / 1000) : 0,
      averageHr: weightedAverage(recent, "average_hr"),
      averagePower: weightedAverage(recent, "average_watts"),
      averageCadence: weightedAverage(recent, "average_cadence"),
      maxHr,
      weekly,
      monthly,
    };
    }, [activities, now]);
      if (!stats) {
    return (
      <main className="min-h-screen bg-[#090d0b] p-8 text-white">
        Chargement des performances...
      </main>
    );
  }

  const displayedWeeks =
    period === "4" ? stats.weekly.slice(4) : stats.weekly;

  const maxWeeklyKm = Math.max(
    1,
    ...displayedWeeks.map((week) => week.km)
  );

  const maxMonthlyKm = Math.max(
    1,
    ...stats.monthly.map((month) => month.km)
  );

  const weeklyMetricValues = {
    pace: displayedWeeks.map((w) => ({
      label: w.label,
      value: w.pace,
    })),
    hr: displayedWeeks.map((w) => ({
      label: w.label,
      value: w.hr,
    })),
    watts: displayedWeeks.map((w) => ({
      label: w.label,
      value: w.watts,
    })),
    cadence: displayedWeeks.map((w) => ({
      label: w.label,
      value: w.cadence,
    })),
  };

  return (
    <main className="min-h-screen bg-[#090d0b] p-5 text-white sm:p-8">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm text-lime-400 hover:underline">
          ← Retour au tableau de bord
        </a>

        <header className="mb-8 mt-6">
          <div className="text-xs font-bold uppercase tracking-widest text-lime-400">
            Analyse sportive
          </div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Mes performances
          </h1>
          <p className="mt-2 text-gray-400">
            Analyse de tes entraînements enregistrés dans Supabase.
          </p>
        </header>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-[#121a15] p-6 text-gray-400">
            Chargement de tes performances...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-lime-400/20 bg-gradient-to-br from-[#1a281c] to-[#111713] p-5">
                <div className="text-sm text-gray-400">
                  Distance totale enregistrée
                </div>
                <div className="mt-3 text-3xl font-black text-lime-400">
                  {formatKm(stats.totalKm)} km
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {activities.length} activités
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
                <div className="text-sm text-gray-400">
                  Distance des 30 derniers jours
                </div>
                <div className="mt-3 text-3xl font-black">
                  {formatKm(stats.recentKm)} km
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.recentCount} séances
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
                <div className="text-sm text-gray-400">
                  Allure moyenne · 30 jours
                </div>
                <div className="mt-3 text-3xl font-black text-lime-400">
                  {stats.recentPace
                    ? `${formatPace(stats.recentPace)} /km`
                    : "--"}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Calculée sur la distance et le temps cumulés
                </div>
              </div>
            </div>

            <section className="mb-6 rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Volume hebdomadaire
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Kilomètres réellement parcourus
                  </p>
                </div>

                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#090d0b] px-3 py-2 text-sm"
                >
                  <option value="8">8 semaines</option>
                  <option value="4">4 semaines</option>
                </select>
              </div>

              <div className="mt-8 flex h-52 items-end justify-between gap-2 border-b border-white/10 pb-2">
                {displayedWeeks.map((week, index) => (
                  <div
                    key={`${week.label}-${index}`}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="text-xs text-gray-400">
                      {week.km > 0 ? formatKm(week.km) : "0"}
                    </span>
                    <div
                      className="w-full max-w-14 rounded-t-lg bg-lime-400"
                      style={{
                        height: `${week.km > 0 ? Math.max(5, (week.km / maxWeeklyKm) * 145) : 0}px`,
                      }}
                    />
                    <span className="text-[10px] text-gray-500">
                      {week.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Les semaines sont calculées du lundi au dimanche.
              </p>
            </section>

            <section className="mb-6 rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6">
              <h2 className="text-lg font-bold">Évolution mensuelle</h2>
              <p className="mt-1 text-sm text-gray-500">
                Kilomètres parcourus sur les 6 derniers mois
              </p>

              <div className="mt-7 flex h-44 items-end justify-between gap-3 border-b border-white/10 pb-2">
                {stats.monthly.map((month, index) => (
                  <div
                    key={`${month.label}-${index}`}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="text-xs text-gray-400">
                      {month.km > 0 ? formatKm(month.km) : "0"}
                    </span>
                    <div
                      className="w-full max-w-14 rounded-t-lg bg-lime-400/80"
                      style={{
                        height: `${month.km > 0 ? Math.max(5, (month.km / maxMonthlyKm) * 115) : 0}px`,
                      }}
                    />
                    <span className="text-xs text-gray-500">
                      {month.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Évolution des indicateurs</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Comparaison semaine après semaine
                </p>
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#121a15] px-3 py-2 text-sm"
              >
                <option value="8">8 semaines</option>
                <option value="4">4 semaines</option>
              </select>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <MetricChart
                title="Allure moyenne"
                subtitle="Temps moyen par kilomètre"
                values={weeklyMetricValues.pace}
                unit="min/km"
                formatter={formatPace}
                lowerIsBetter
              />
              <MetricChart
                title="Fréquence cardiaque moyenne"
                subtitle="Moyenne pondérée par la distance"
                values={weeklyMetricValues.hr}
                color="bg-orange-400"
                unit="bpm"
                formatter={(v) => Math.round(v).toString()}
              />
              <MetricChart
                title="Puissance moyenne"
                subtitle="Moyenne pondérée par la distance"
                values={weeklyMetricValues.watts}
                color="bg-sky-400"
                unit="W"
                formatter={(v) => Math.round(v).toString()}
              />
              <MetricChart
                title="Cadence moyenne"
                subtitle="Moyenne pondérée par la distance"
                values={weeklyMetricValues.cadence}
                color="bg-violet-400"
                unit="ppm"
                formatter={(v) => Math.round(v).toString()}
              />
            </div>

            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "FC moyenne",
                  value: stats.averageHr
                    ? Math.round(stats.averageHr).toString()
                    : "--",
                  unit: "bpm",
                },
                {
                  label: "FC maximale",
                  value: stats.maxHr > 0 ? stats.maxHr.toString() : "--",
                  unit: "bpm",
                },
                {
                  label: "Puissance moyenne",
                  value: stats.averagePower
                    ? Math.round(stats.averagePower).toString()
                    : "--",
                  unit: "W",
                },
                {
                  label: "Cadence moyenne",
                  value: stats.averageCadence
                    ? Math.round(stats.averageCadence).toString()
                    : "--",
                  unit: "ppm",
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/10 bg-[#121a15] p-5"
                >
                  <div className="text-sm text-gray-400">{metric.label}</div>
                  <div className="mt-3 text-3xl font-black">
                    {metric.value}
                    <span className="text-sm font-normal text-gray-500">
                      {" "}{metric.unit}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    30 derniers jours
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6">
              <h2 className="text-xl font-bold">Repères de performance</h2>
              <p className="mt-1 text-sm text-gray-500">
                Records personnels connus, à distinguer des estimations.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-4">
                  <div>
                    <div className="font-bold">10 km</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Record personnel connu
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-lime-400">
                      43:53
                    </div>
                    <div className="text-xs text-gray-500">4:23 /km</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-4">
                  <div>
                    <div className="font-bold">Semi-marathon</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Record personnel connu
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-lime-400">
                      1:34:49
                    </div>
                    <div className="text-xs text-gray-500">4:30 /km</div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500">
                Les records sont des repères connus et ne sont pas recalculés
                automatiquement. Les statistiques utilisent les activités
                présentes dans ta base.
              </p>
            </section>
          </>
        )}

        <footer className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-gray-600">
          MON COACH RUNNING · ANALYSE ET PROGRESSION
        </footer>
      </div>
    </main>
  );
}
