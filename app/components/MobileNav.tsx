
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { name: "Tableau de bord", icon: "⌂", route: "/" },
  { name: "Entraînements", icon: "◉", route: "/entrainements" },
  { name: "Performances", icon: "↗", route: "/performances" },
  { name: "Planning", icon: "▦", route: "/programme" },
  { name: "Coach IA", icon: "✧", route: "/coach" },
  { name: "Objectifs", icon: "◎", route: "/objectifs" },
  { name: "Paramètres", icon: "⚙", route: "/parametres" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Bouton menu */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="fixed left-4 top-4 z-[10002] flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#151d17] text-2xl text-lime-400 shadow-lg md:hidden"
      >
        ☰
      </button>

      {/* Fond sombre */}
      {open && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[10000] bg-black/70 md:hidden"
        />
      )}

      {/* Menu latéral */}
      <aside
        className={`fixed inset-y-0 left-0 z-[10001] flex w-[290px] flex-col border-r border-white/10 bg-[#0b100d] p-5 shadow-2xl transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400 text-2xl font-black text-black">
              M
            </div>
            <div>
              <div className="text-lg font-black tracking-wide text-white">
                MON COACH
              </div>
              <div className="text-[10px] font-bold tracking-[0.35em] text-lime-400">
                RUNNING
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="rounded-lg px-3 py-2 text-xl text-gray-400 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-lime-400/20 bg-gradient-to-br from-[#1b2a1d] to-[#111713] p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-lime-400">
            Objectif principal
          </div>
          <div className="mt-3 text-lg font-black text-white">
            10 km - Bourges
          </div>
          <div className="mt-1 text-xs text-gray-400">
            7 février 2027
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-xs text-gray-400">Temps visé</div>
              <div className="text-2xl font-black text-lime-400">40:00</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Allure cible</div>
              <div className="font-bold text-white">4:00/km</div>
            </div>
          </div>
        </div>

        <div className="mb-3 px-3 text-[10px] font-black uppercase tracking-widest text-gray-500">
          Navigation
        </div>

        <nav className="space-y-1.5">
          {items.map((item) => (
            <Link
              key={item.name}
              href={item.route}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                pathname === item.route
                  ? "border border-lime-400/20 bg-lime-400/10 font-bold text-lime-400"
                  : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl">
                {item.icon}
              </span>
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Navigation du bas */}
      <nav className="fixed inset-x-0 bottom-0 z-[9999] border-t border-white/10 bg-[#0d120f] px-2 pt-3 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {[
            { name: "Accueil", icon: "⌂", route: "/" },
            { name: "Entraînements", icon: "◉", route: "/entrainements" },
            { name: "Performances", icon: "↗", route: "/performances" },
            { name: "Objectifs", icon: "◎", route: "/objectifs" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.route}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs ${
                pathname === item.route
                  ? "font-bold text-lime-400"
                  : "text-gray-300"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
