
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const activities = [
  { date: "Aujourd'hui", name: "Footing endurance", distance: "8,2 km", time: "43:12", pace: "5:16", type: "Endurance" },
  { date: "Mercredi", name: "Fractionné 5 × 1000 m", distance: "10,4 km", time: "49:36", pace: "4:46", type: "Fractionné" },
  { date: "Lundi", name: "Sortie longue", distance: "15,2 km", time: "1:14:20", pace: "4:53", type: "Sortie longue" },
];

const weeks = [
  { day: "Lun", value: 8 },
  { day: "Mar", value: 0 },
  { day: "Mer", value: 10 },
  { day: "Jeu", value: 5 },
  { day: "Ven", value: 0 },
  { day: "Sam", value: 15 },
  { day: "Dim", value: 0 },
];

export default function Home() {
  const [active, setActive] = useState("Tableau de bord");
  const router = useRouter();

  const menu = [
    { name: "Tableau de bord", icon: "▦" },
    { name: "Entraînements", icon: "🏃" },
    { name: "Performances", icon: "↗" },
    { name: "Planning", icon: "▣" },
    { name: "Coach IA", icon: "✦" },
  ];

  return (
    <main className="min-h-screen bg-[#090d0b] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d120f] p-6 md:flex md:flex-col">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400 text-xl font-black text-black">M</div>
            <div>
              <div className="text-lg font-black tracking-wide">MON COACH</div>
              <div className="text-xs font-bold tracking-[0.25em] text-lime-400">RUNNING</div>
            </div>
          </div>

          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">Menu principal</div>
          <nav className="space-y-2">
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
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  active === item.name
                    ? "bg-lime-400 font-bold text-black"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-lime-400/20 bg-lime-400/5 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-lime-400">Objectif actuel</div>
            <div className="text-lg font-black">Semi-marathon</div>
            <div className="mt-1 text-sm text-gray-400">Continuer à progresser</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/4 rounded-full bg-lime-400" />
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
              { label: "Distance semaine", value: "38,6", unit: "km", icon: "↗", note: "Kilométrage total" },
              { label: "Temps de course", value: "3h 27", unit: "min", icon: "◷", note: "Temps cumulé" },
              { label: "Allure moyenne", value: "4:58", unit: "/km", icon: "⚡", note: "Sur la semaine" },
              { label: "Fréquence cardiaque", value: "158", unit: "bpm", icon: "♡", note: "Moyenne indicative" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#121a15] p-4 sm:p-5">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  {stat.label}
                  <span className="text-xl text-lime-400">{stat.icon}</span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight sm:text-4xl">{stat.value}</span>
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
                {weeks.map((week) => (
                  <div key={week.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs text-gray-400">{week.value || ""}</span>
                    <div
                      className={`w-full max-w-12 rounded-t-lg ${week.value ? "bg-lime-400" : "bg-white/5"}`}
                      style={{ height: `${Math.max(week.value * 8, 5)}px` }}
                    />
                    <span className="text-xs text-gray-500">{week.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-between text-sm">
                <span className="text-gray-500">Total hebdomadaire</span>
                <span className="font-bold text-lime-400">38,6 km</span>
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
              {activities.map((activity) => (
                <div key={activity.name} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 text-lg">🏃</div>
                    <div>
                      <div className="font-bold">{activity.name}</div>
                      <div className="mt-1 text-xs text-gray-500">{activity.date} · {activity.type}</div>
                    </div>
                  </div>
                  <div className="flex gap-5 text-right sm:gap-8">
                    <div><div className="font-bold">{activity.distance}</div><div className="text-xs text-gray-500">Distance</div></div>
                    <div><div className="font-bold">{activity.time}</div><div className="text-xs text-gray-500">Durée</div></div>
                    <div><div className="font-bold text-lime-400">{activity.pace}</div><div className="text-xs text-gray-500">Allure/km</div></div>
                  </div>
                </div>
              ))}
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
