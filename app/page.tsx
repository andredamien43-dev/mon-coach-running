
"use client";


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
type Seance = {
  jour: string;
  type: string;
  description: string;
  recuperation?: string;
  allure?: string;
};

type Semaine = {
  numero: number;
  dates: string;
  objectif: string;
  seances: Seance[];
};

type Programme = {
  date_course: string;
  semaines: Semaine[];
};

type ProchaineSeance = {
  id: string;
  date: Date;
  type: string;
  description: string;
  statut: "todo" | "done" | "missed";
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


export default function Home() {
 
const [active, setActive] = useState("Tableau de bord");
const router = useRouter();

const [activities, setActivities] = useState<Activity[]>([]);
const [loadingActivities, setLoadingActivities] = useState(true);
const [activitiesError, setActivitiesError] = useState("");
const [clientReady, setClientReady] = useState(false);
const [prochainesSeances, setProchainesSeances] = useState<ProchaineSeance[]>([]);
const [loadingSeances, setLoadingSeances] = useState(true);
useEffect(() => {
  setClientReady(true);
}, []);

useEffect(() => {
  async function loadActivities() {
    setLoadingActivities(true);
    setActivitiesError("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setActivitiesError("Connecte-toi pour afficher tes entraînements.");
      setLoadingActivities(false);
      return;
    }

    const { data, error } = await supabase
      .from("activities")
      .select(
        "id, name, started_at, distance_m, moving_time_s, average_hr, max_hr, average_watts, average_cadence"
      )
      .eq("user_id", userData.user.id)
      .order("started_at", { ascending: false });

    if (error) {
      setActivitiesError("Impossible de charger tes entraînements.");
      setLoadingActivities(false);
      return;
    }

    setActivities((data || []) as Activity[]);
    setLoadingActivities(false);
  }

  loadActivities();
}, []);
useEffect(() => {
  async function loadSeances() {
    try {
      setLoadingSeances(true);

      const response = await fetch("/programmes/10km-fevrier-2027.json");
      if (!response.ok) throw new Error("Programme introuvable.");

      const programme: Programme = await response.json();

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setProchainesSeances([]);
        return;
      }

      const { data: sessions, error } = await supabase
        .from("program_sessions")
        .select("session_key, status")
        .eq("user_id", userData.user.id)
        .eq("program_id", "10km-fevrier-2027");

      if (error) throw error;

      const statuts: Record<string, "todo" | "done" | "missed"> = {};

      (sessions || []).forEach((session) => {
        statuts[session.session_key] = session.status;
      });

      const premiereSemaine = programme.semaines[0];
      const match = premiereSemaine.dates.match(/(\d{2})\/(\d{2})/);

      if (!match) throw new Error("Date de début introuvable.");

      const jourDebut = Number(match[1]);
      const moisDebut = Number(match[2]) - 1;

      const dateCourse = new Date(`${programme.date_course}T12:00:00`);
      let anneeDebut = dateCourse.getFullYear();

      if (moisDebut > dateCourse.getMonth()) {
        anneeDebut--;
      }

      const jours: Record<string, number> = {
        Lundi: 0,
        Mardi: 1,
        Mercredi: 2,
        Jeudi: 3,
        Vendredi: 4,
        Samedi: 5,
        Dimanche: 6,
      };

      const debut = new Date(anneeDebut, moisDebut, jourDebut, 12);
      const aujourdHui = new Date();
      aujourdHui.setHours(0, 0, 0, 0);

      const toutesLesSeances: ProchaineSeance[] = [];

      programme.semaines.forEach((semaine) => {
        semaine.seances.forEach((seance, index) => {
          const decalage = jours[seance.jour];

          if (decalage === undefined) return;

          const date = new Date(debut);
          date.setDate(
            debut.getDate() + (semaine.numero - 1) * 7 + decalage
          );

          if (date >= aujourdHui) {
            const id = `${semaine.numero}-${index}`;

            toutesLesSeances.push({
              id,
              date,
              type: seance.type,
              description: seance.description,
              statut: statuts[id] || "todo",
            });
          }
        });
      });

      toutesLesSeances.sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );

      setProchainesSeances(toutesLesSeances.slice(0, 5));
    } catch (error) {
      console.error("Erreur chargement des prochaines séances :", error);
      setProchainesSeances([]);
    } finally {
      setLoadingSeances(false);
    }
  }

  loadSeances();
}, []);
const stats = useMemo(() => {
 if (!clientReady) {
  return {
    totalKm: 0,
    totalTime: 0,
    pace: 0,
    heartRate: null,
    power: null,
    cadence: null,
    daily: Array.from({ length: 7 }, (_, index) => ({
      day: "",
      value: 0,
    })),
    count: 0,
  };
}

const now = new Date();
const monday = mondayOf(now);
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  const weekActivities = activities.filter((activity) => {
    const date = new Date(activity.started_at);
    return date >= monday && date < nextMonday;
  });

  const totalDistance = weekActivities.reduce(
    (sum, activity) => sum + Number(activity.distance_m || 0),
    0
  );

  const totalTime = weekActivities.reduce(
    (sum, activity) => sum + Number(activity.moving_time_s || 0),
    0
  );

  const weightedAverage = (
    field: "average_hr" | "average_watts" | "average_cadence"
  ) => {
    const valid = weekActivities.filter(
      (activity) =>
        Number(activity[field]) > 0 &&
        Number(activity.distance_m) > 0
    );

    const distance = valid.reduce(
      (sum, activity) => sum + Number(activity.distance_m),
      0
    );

    if (!distance) return null;

    return valid.reduce(
      (sum, activity) =>
        sum +
        Number(activity[field]) * Number(activity.distance_m),
      0
    ) / distance;
  };

  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);

    const km = weekActivities
      .filter((activity) => {
        const activityDate = new Date(activity.started_at);
        return activityDate.toDateString() === date.toDateString();
      })
      .reduce(
        (sum, activity) => sum + Number(activity.distance_m || 0),
        0
      ) / 1000;

    return {
      day: date.toLocaleDateString("fr-FR", { weekday: "short" }),
      value: km,
    };
  });

  return {
    totalKm: totalDistance / 1000,
    totalTime,
    pace:
      totalDistance > 0
        ? totalTime / (totalDistance / 1000)
        : 0,
    heartRate: weightedAverage("average_hr"),
    power: weightedAverage("average_watts"),
    cadence: weightedAverage("average_cadence"),
    daily,
    count: weekActivities.length,
  };
}, [activities, clientReady]);


    const menu = [
    { name: "Tableau de bord", icon: "⌂" },
    { name: "Entraînements", icon: "◉" },
    { name: "Performances", icon: "↗" },
    { name: "Planning", icon: "▦" },
    { name: "Coach IA", icon: "✧" },
  ];

  return (
    <main className="min-h-screen bg-[#090d0b] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/[0.07] bg-[#0b100d] p-5 md:flex md:flex-col">

          {/* Identité */}
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400 text-2xl font-black text-black shadow-lg shadow-lime-400/10">
              M
            </div>
            <div>
              <div className="text-lg font-black tracking-wide">
                MON COACH
              </div>
              <div className="text-[10px] font-bold tracking-[0.35em] text-lime-400">
                RUNNING
              </div>
            </div>
          </div>

          {/* Objectif */}
          <div className="mb-9 overflow-hidden rounded-2xl border border-lime-400/20 bg-gradient-to-br from-[#1b2a1d] to-[#111713] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-400">
                Objectif principal
              </span>
              <span className="rounded-full bg-lime-400/10 px-2 py-1 text-[9px] font-bold text-lime-400">
                2027
              </span>
            </div>

            <div className="mt-4 text-xl font-black">
              10 km - Bourges
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Dimanche 7 février 2027
            </div>

            <div className="my-4 h-px bg-white/10" />

            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-gray-400">Temps visé</div>
                <div className="mt-1 text-3xl font-black text-lime-400">
                  40:00
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Allure cible</div>
                <div className="mt-1 text-sm font-bold text-white">
                  4:00/km
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/objectifs")}
              className="mt-5 w-full rounded-xl bg-lime-400 px-3 py-3 text-xs font-black text-black transition hover:bg-lime-300"
            >
              SUIVRE MA PROGRESSION →
            </button>
          </div>

          {/* Navigation */}
          <div className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
            Navigation
          </div>

          <nav className="space-y-1.5">
            {menu.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setActive(item.name);

                  const routes: Record<string, string> = {
                    "Tableau de bord": "/",
                    "Entraînements": "/entrainements",
                    "Performances": "/performances",
                    "Planning": "/programme",
                    "Coach IA": "/coach",
                  };

                  router.push(routes[item.name]);
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all ${
                  active === item.name
                    ? "border border-lime-400/20 bg-lime-400/10 font-bold text-lime-400"
                    : "border border-transparent text-gray-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition ${
                  active === item.name
                    ? "bg-lime-400 text-black"
                    : "bg-white/[0.04] text-gray-400 group-hover:text-white"
                }`}>
                  {item.icon}
                </span>
                {item.name}
                {active === item.name && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-400" />
                )}
              </button>
            ))}
          </nav>

          {/* Bas de menu */}
          <div className="mt-auto border-t border-white/[0.07] pt-5">
            <div className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-xs font-bold text-gray-300">
                Chaque séance compte.
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Objectif sub 40 · On avance !
              </div>
            </div>
            <div className="mt-4 text-center text-[9px] font-bold tracking-[0.2em] text-gray-700">
              MON COACH RUNNING · V1
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
          <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">DIMANCHE 1 NOVEMBRE 2026</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Bonjour Damien <span className="text-lime-400">👋</span>
              </h1>
              <p className="mt-2 text-sm text-gray-400">Prêt à repousser tes limites ?</p>
            </div>
<button
  type="button"
  onClick={() => router.push("/connexion")}
  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#121a15] px-4 py-3 transition hover:border-lime-400/50 hover:bg-lime-400/5"
>
  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-400/15 text-lg">
    🏃
  </div>
  <div className="text-left">
    <div className="text-sm font-bold">Mon espace</div>
    <div className="text-xs text-gray-500">Connexion / Mon compte</div>
  </div>
</button>
          </header>

          <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
             
{[
  {
    label: "Distance semaine",
    value: formatKm(stats.totalKm),
    unit: "km",
    icon: "↗",
    note: "Kilométrage total",
  },
  {
    label: "Temps de course",
    value: `${Math.floor(stats.totalTime / 3600)}h ${String(
      Math.floor((stats.totalTime % 3600) / 60)
    ).padStart(2, "0")}`,
    unit: "",
    icon: "◷",
    note: "Temps cumulé",
  },
  {
    label: "Allure moyenne",
    value: formatPace(stats.pace),
    unit: "/km",
    icon: "⚡",
    note: "Sur la semaine",
  },
  {
    label: "Fréquence cardiaque",
    value: stats.heartRate
      ? String(Math.round(stats.heartRate))
      : "--",
    unit: "bpm",
    icon: "♡",
    note: "Moyenne pondérée",
  },
].map((stat) => (
  <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#121a15] p-4 sm:p-5">
    <div className="flex items-center justify-between text-sm text-gray-400">
      {stat.label}
      <span className="text-xl text-lime-400">{stat.icon}</span>
    </div>
    <div className="mt-4 flex items-baseline gap-1">
      <span className="text-3xl font-black tracking-tight sm:text-4xl">
        {loadingActivities ? "..." : stat.value}
      </span>
      <span className="text-sm text-gray-400">{stat.unit}</span>
    </div>
    <div className="mt-2 text-xs text-gray-500">{stat.note}</div>
  </div>
))}

          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6 xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Volume d'entraînement</h2>
                  <p className="mt-1 text-sm text-gray-500">Kilométrage par jour · Exemple</p>
                </div>
                <div className="rounded-lg bg-lime-400/10 px-3 py-2 text-sm font-bold text-lime-400">Cette semaine</div>
              </div>

              
<div className="mt-8 flex h-48 items-end justify-between gap-3 border-b border-white/10 pb-2">
  {stats.daily.map((day) => {
    const maxKm = Math.max(...stats.daily.map((item) => item.value), 1);
    const height = day.value > 0 ? Math.max((day.value / maxKm) * 140, 5) : 5;

    return (
      <div
        key={day.day}
        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
      >
        <span className="text-xs text-gray-400">
          {day.value > 0 ? formatKm(day.value) : ""}
        </span>
        <div
          className={`w-full max-w-12 rounded-t-lg ${
            day.value > 0 ? "bg-lime-400" : "bg-white/5"
          }`}
          style={{ height: `${height}px` }}
        />
        <span className="text-xs text-gray-500">{day.day}</span>
      </div>
    );
  })}
</div>

<div className="mt-5 flex justify-between text-sm">
  <span className="text-gray-500">Total hebdomadaire</span>
  <span className="font-bold text-lime-400">
    {loadingActivities ? "..." : `${formatKm(stats.totalKm)} km`}
  </span>
</div>

                   
             </div>
            

            <div className="rounded-2xl border border-lime-400/20 bg-gradient-to-br from-[#1a281c] to-[#111713] p-5 sm:p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-lime-400">Tes records personnels</div>
              <h2 className="mt-3 text-xl font-black">Tes meilleures performances</h2>
              <div className="mt-6 space-y-5">
                {[
                  { name: "10 kilomètres", time: "43:53" },
                  { name: "Semi-marathon", time: "1:34:49" },
                ].map((record) => (
                  <div key={record.name} className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-sm text-gray-400">{record.name}</span>
                    <span className="text-2xl font-black text-lime-400">{record.time}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-black/20 p-3 text-sm text-gray-300">
                Continue sur cette lancée. Chaque séance compte !
              </div>
            </div>
          </div>
<div className="mt-6 rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6">
  <div className="mb-5 flex items-center justify-between">
    <div>
      <h2 className="text-lg font-bold">Prochaines séances</h2>
      <p className="mt-1 text-sm text-gray-500">
        Ton programme de préparation 10 km
      </p>
    </div>
    <button
      onClick={() => router.push("/programme")}
      className="text-sm font-bold text-lime-400 hover:text-lime-300"
    >
      Voir le programme →
    </button>
  </div>

  {loadingSeances ? (
    <p className="py-5 text-center text-sm text-gray-500">
      Chargement des séances...
    </p>
  ) : prochainesSeances.length === 0 ? (
    <p className="py-5 text-center text-sm text-gray-500">
      Aucune séance à venir.
    </p>
  ) : (
    <div className="space-y-3">
      {prochainesSeances.map((seance) => (
        <div
          key={seance.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
              <span className="text-xs font-bold">
                {seance.date.toLocaleDateString("fr-FR", {
                  weekday: "short",
                })}
              </span>
              <span className="text-lg font-black">
                {seance.date.getDate()}
              </span>
            </div>

            <div>
              <div className="font-bold">{seance.type}</div>
              <div className="mt-1 text-sm text-gray-400">
                {seance.description}
              </div>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              seance.statut === "done"
                ? "bg-lime-400/10 text-lime-400"
                : seance.statut === "missed"
                ? "bg-red-400/10 text-red-400"
                : "bg-white/10 text-gray-300"
            }`}
          >
            {seance.statut === "done"
              ? "Terminée"
              : seance.statut === "missed"
              ? "Non faite"
              : "À faire"}
          </span>
        </div>
      ))}
    </div>
  )}
</div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Derniers entraînements</h2>
                <p className="mt-1 text-sm text-gray-500">Historique de tes séances</p>
              </div>
              <button onClick={() => setActive("Entraînements")} className="text-sm font-bold text-lime-400 hover:text-lime-300">
                Voir tout →
              </button>
            </div>

            
<div className="space-y-3">
  {loadingActivities ? (
    <p className="py-6 text-center text-sm text-gray-500">
      Chargement de tes entraînements...
    </p>
  ) : activitiesError ? (
    <p className="py-6 text-center text-sm text-gray-400">
      {activitiesError}
    </p>
  ) : activities.length === 0 ? (
    <p className="py-6 text-center text-sm text-gray-500">
      Aucun entraînement enregistré pour le moment.
    </p>
  ) : (
    activities.slice(0, 3).map((activity) => {
      const distanceKm = Number(activity.distance_m || 0) / 1000;
      const duration = Number(activity.moving_time_s || 0);
      const pace =
        distanceKm > 0 ? duration / distanceKm : 0;

      return (
        <div
          key={activity.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 text-lg">
              🏃
            </div>
            <div>
              <div className="font-bold">{activity.name}</div>
              <div className="mt-1 text-xs text-gray-500">
                {new Date(activity.started_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-5 text-right sm:gap-8">
            <div>
              <div className="font-bold">{formatKm(distanceKm)} km</div>
              <div className="text-xs text-gray-500">Distance</div>
            </div>
            <div>
              <div className="font-bold">
                {Math.floor(duration / 3600)}h{" "}
                {String(Math.floor((duration % 3600) / 60)).padStart(2, "0")}
              </div>
              <div className="text-xs text-gray-500">Durée</div>
            </div>
            <div>
              <div className="font-bold text-lime-400">
                {formatPace(pace)}
              </div>
              <div className="text-xs text-gray-500">Allure/km</div>
            </div>
          </div>
        </div>
      );
    })
  )}
</div>
</div>

          <footer className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-gray-600">
            MON COACH RUNNING · TON ENTRAÎNEMENT, TES OBJECTIFS, TA PROGRESSION
          </footer>
        </section>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0d120f] px-2 py-3">
  <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
    {[
      { name: "Accueil", icon: "⌂", route: "/" },
      { name: "Entraînements", icon: "🏃", route: "/entrainements" },
      { name: "Historique", icon: "◷", route: "/entrainements" },
      { name: "Performances", icon: "↗", route: "/performances" },
    ].map((item) => (
      <button
        key={item.name}
        onClick={() => router.push(item.route)}
        className="flex flex-col items-center gap-1 rounded-lg py-1 text-xs text-gray-300"
      >
        <span className="text-xl">{item.icon}</span>
        <span>{item.name}</span>
      </button>
    ))}
  </div>
</nav>
    </main>
  );
}
