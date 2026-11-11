
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PROGRAM_ID = "10km-fevrier-2027";

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
  nom: string;
  date_course: string;
  objectif_temps: string;
  allure_cible: string;
  semaines: Semaine[];
};

export default function ProgrammePage() {
  const [programme, setProgramme] = useState<Programme | null>(null);
  type StatutSeance = "todo" | "done" | "missed";

const [statuts, setStatuts] = useState<Record<string, StatutSeance>>({});
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState<string | null>(null);

  useEffect(() => {
    async function charger() {
      try {
        const response = await fetch("/programmes/10km-fevrier-2027.json");
        if (!response.ok) throw new Error("Impossible de charger le programme.");

        const data: Programme = await response.json();
        setProgramme(data);

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          setMessage("Connecte-toi pour sauvegarder tes séances.");
          return;
        }

        const { data: sessions, error: sessionsError } = await supabase
  .from("program_sessions")
  .select("session_key, status")
  .eq("user_id", authData.user.id)
  .eq("program_id", PROGRAM_ID);;

        if (sessionsError) throw sessionsError;

        const nouveauxStatuts: Record<string, StatutSeance> = {};

(sessions || []).forEach((s) => {
  nouveauxStatuts[s.session_key] = s.status as StatutSeance;
});

setStatuts(nouveauxStatuts);
      } catch (error) {
        console.error(error);
        setErreur("Impossible de charger le programme ou les séances enregistrées.");
      } finally {
        setChargement(false);
      }
    }

    charger();
  }, []);

 
async function basculerSeance(id: string, nouveauStatut: StatutSeance) {
  const ancienEtat = { ...statuts };

  setStatuts((ancien) => ({
    ...ancien,
    [id]: nouveauStatut,
  }));

  setSauvegarde(id);
  setMessage("");

  try {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error("Connecte-toi pour enregistrer tes séances.");
    }

    const { error } = await supabase
      .from("program_sessions")
      .upsert(
        {
          user_id: authData.user.id,
          program_id: PROGRAM_ID,
          session_key: id,
          status: nouveauStatut,
          completed: nouveauStatut === "done",
          completed_at:
            nouveauStatut === "done" ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,program_id,session_key" }
      );

    if (error) throw error;
  } catch (error) {
    setStatuts(ancienEtat);
    setMessage(
      error instanceof Error ? error.message : "Erreur de sauvegarde."
    );
  } finally {
    setSauvegarde(null);
  }
}


  if (chargement) {
    return (
      <main className="min-h-screen bg-[#090d0b] p-8 text-white">
        Chargement du programme...
      </main>
    );
  }

  if (erreur || !programme) {
    return (
      <main className="min-h-screen bg-[#090d0b] p-8 text-red-400">
        {erreur || "Programme introuvable."}
      </main>
    );
  }

  const total = programme.semaines.reduce(
    (n, semaine) => n + semaine.seances.length,
    0
  );

  const progression = total > 0
  ? (Object.values(statuts).filter((s) => s === "done").length / total) * 100
  : 0;;

  function couleur(type: string) {
    const t = type.toLowerCase();
    if (t.includes("fraction")) return "border-orange-400/30 bg-orange-400/5";
    if (t.includes("endurance") || t.includes("footing"))
      return "border-sky-400/30 bg-sky-400/5";
    if (t.includes("seuil") || t.includes("allure"))
      return "border-purple-400/30 bg-purple-400/5";
    if (t.includes("longue")) return "border-lime-400/30 bg-lime-400/5";
    if (t.includes("repos")) return "border-white/10 bg-white/[0.02]";
    return "border-white/10 bg-[#121a15]";
  }

  return (
    <main className="min-h-screen bg-[#090d0b] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
  <button
    onClick={() => (window.location.href = "/")}
    className="rounded-xl border border-lime-400/30 bg-lime-400/10 px-4 py-2 text-sm font-bold text-lime-400 transition hover:bg-lime-400 hover:text-black"
  >
    ← Accueil
  </button>
</div>
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-400">
            Mon Coach Running
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            {programme.nom}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Ton plan d'entraînement, semaine après semaine.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-lime-400/20 bg-gradient-to-br from-[#1a281c] to-[#111713] p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-400">Objectif chronométrique</p>
              <p className="mt-1 text-2xl font-black text-lime-400">
                {programme.objectif_temps}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Allure cible</p>
              <p className="mt-1 text-2xl font-black">
                {programme.allure_cible}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Date de course</p>
              <p className="mt-1 text-2xl font-black">7 février 2027</p>
            </div>
          </div>

          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Progression du programme</span>
              <span className="text-sm font-black text-lime-400">
                {Object.values(statuts).filter((s) => s === "done").length} / {total} séances
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-lime-400 transition-all duration-300"
                style={{ width: `${progression}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs text-gray-400">
              {Math.round(progression)} % réalisé
            </p>
          </div>
        </section>

        {message && (
          <p className="mb-5 rounded-xl border border-white/10 bg-[#121a15] p-3 text-sm text-amber-300">
            {message}
          </p>
        )}

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">Ton planning</h2>
          <span className="text-sm text-gray-500">
            {programme.semaines.length} semaines
          </span>
        </div>

        <div className="space-y-5">
          {programme.semaines.map((semaine) => {
           const faites = semaine.seances.filter((seance, index) =>
  statuts[`${semaine.numero}-${index}`] === "done"
).length;

            return (
              <section
                key={semaine.numero}
                className="rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-lime-400">
                      Semaine {semaine.numero}
                    </p>
                    <h3 className="mt-1 text-lg font-black">{semaine.dates}</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {semaine.objectif}
                    </p>
                  </div>
                  <span className="rounded-full bg-lime-400/10 px-3 py-2 text-xs font-bold text-lime-400">
                    {faites} / {semaine.seances.length} terminées
                  </span>
                </div>

                <div className="space-y-3">
                  {semaine.seances.map((seance, index) => {
                    const id = `${semaine.numero}-${index}`;
                    const statut = statuts[id] || "todo";
                    const enregistrement = sauvegarde === id;

                    return (
                     
<div
  key={id}
  className={`rounded-xl border p-4 transition ${couleur(seance.type)}`}
>
  <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="font-bold">
      {seance.jour} – {seance.type}
    </p>

    {enregistrement && (
      <span className="text-xs text-amber-300">
        Enregistrement...
      </span>
    )}
  </div>

  <p className="mt-2 text-sm leading-relaxed text-gray-300">
    {seance.description}
  </p>

  {seance.allure && (
    <p className="mt-2 text-xs text-lime-300">
      Allure : {seance.allure}
    </p>
  )}

  {seance.recuperation && (
    <p className="mt-1 text-xs text-gray-400">
      Récupération : {seance.recuperation}
    </p>
  )}

  <div className="mt-4 flex flex-wrap gap-2">
    <button
      disabled={enregistrement}
      onClick={() => basculerSeance(id, "todo")}
      className={`rounded-lg px-3 py-2 text-xs font-bold ${
        statut === "todo"
          ? "bg-gray-300 text-black"
          : "bg-white/10 text-gray-300"
      }`}
    >
      À faire
    </button>

    <button
      disabled={enregistrement}
      onClick={() => basculerSeance(id, "done")}
      className={`rounded-lg px-3 py-2 text-xs font-bold ${
        statut === "done"
          ? "bg-lime-400 text-black"
          : "bg-white/10 text-gray-300"
      }`}
    >
      ✓ Fait
    </button>

    <button
      disabled={enregistrement}
      onClick={() => basculerSeance(id, "missed")}
      className={`rounded-lg px-3 py-2 text-xs font-bold ${
        statut === "missed"
          ? "bg-red-400 text-black"
          : "bg-white/10 text-gray-300"
      }`}
    >
      ✕ Pas fait
    </button>
  </div>
</div>

                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
