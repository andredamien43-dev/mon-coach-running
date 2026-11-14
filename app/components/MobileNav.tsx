"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { name: "Accueil", icon: "⌂", route: "/" },
  { name: "Entraînements", icon: "🏃", route: "/entrainements" },
  { name: "Performances", icon: "↗", route: "/performances" },
  { name: "Objectifs", icon: "🎯", route: "/objectifs" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[9999] border-t border-white/10 bg-[#0d120f] px-2 pt-3 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {items.map((item) => (
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
  );
}