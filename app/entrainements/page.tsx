
"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";


type Activity = {
  id: string;
  date: string;
  name: string;
  type: string;
  distance: number;
  duration: string;
  pace: string;
  heartRate: number | null;
};
type CoachModification = {
  jour: string;
  type: string;
  description: string;
  recuperation?: string;
  allure?: string;
  raison: string;
};

type CoachResult = {
  analyse: string;
  modifications: CoachModification[];
  question: string;
};
function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatPace(distanceKm: number, durationSeconds: number) {
  if (distanceKm <= 0 || durationSeconds <= 0) return "--:--";

  const paceSeconds = Math.round(durationSeconds / distanceKm);
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = paceSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getActivityType(sport: string, name: string): string {
  const value = `${sport} ${name}`.toLowerCase();

  // Natation
  if (
    value.includes("swim") ||
    value.includes("natation") ||
    value.includes("eau libre")
  ) {
    return "Natation";
  }

  // Vélo
  if (
    value.includes("ride") ||
    value.includes("bike") ||
    value.includes("vélo") ||
    value.includes("vtt") ||
    value.includes("cyclisme") ||
    value.includes("cycling")
  ) {
    return "Vélo";
  }

  // Course à pied
  if (
    value.includes("run") ||
    value.includes("course à pied") ||
    value.includes("trail")
  ) {
    if (value.includes("trail")) return "Trail";
    return "Course à pied";
  }

  // Autres activités
  return "Autre";
}

export default function Entrainements() {
  function parseStravaNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function parseStravaDate(value: string): string | null {
  const months: Record<string, string> = {
    janv: "01", févr: "02", mars: "03",
    avr: "04", mai: "05", juin: "06",
    juil: "07", août: "08", sept: "09",
    oct: "10", nov: "11", déc: "12",
  };

  const match = value.match(
    /(\d{1,2})\s+([a-zéû]+)\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})/i
  );

  if (!match) return null;

  const [, day, month, year, hour, minute, second] = match;
  const monthNumber = months[month.toLowerCase()];

  if (!monthNumber) return null;

  return `${year}-${monthNumber}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}`;
}
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState("Toutes");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [type, setType] = useState("Endurance");
  const [heartRate, setHeartRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [lastImportDate, setLastImportDate] = useState<string | null>(null);
  const [coachMessage, setCoachMessage] = useState("");
  const [coachResponse, setCoachResponse] = useState<CoachResult | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");

  async function loadActivities() {
    setLoading(true);
    setMessage("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Connecte-toi pour afficher tes entraînements.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("started_at", { ascending: false });

    if (error) {
      setMessage("Erreur de chargement : " + error.message);
      setLoading(false);
      return;
    }

    const converted: Activity[] = (data || []).map((item) => {
      const distanceKm = item.distance_m / 1000;

      return {
        id: item.id,
        date: new Date(item.started_at).toLocaleDateString("fr-FR"),
        name: item.name,
        type: item.source === "manual"
          ? item.sport
          : getActivityType(item.sport, item.name),
        distance: distanceKm,
        duration: formatDuration(item.moving_time_s),
        pace: formatPace(distanceKm, item.moving_time_s),
        heartRate: item.average_hr,
      };
    });

    setActivities(converted);
    setLoading(false);
  }

  useEffect(() => {
    loadActivities();
  }, []);

 const filtered = filter === "Toutes"
  ? activities
  : activities.filter((a) => {
      if (filter === "Course à pied") {
        return a.type === "Course à pied" || a.type === "Trail";
      }

      return a.type === filter;
    });

  const totalDistance = activities.reduce(
    (sum, activity) => sum + activity.distance,
    0
  );
async function importStravaFile(file: File) {
  setImporting(true);
  setImportMessage("");

  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      throw new Error("Tu dois être connecté.");
    }

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as string[][];
          const headers = rows[0].map((h) =>
            String(h).replace(/^\uFEFF/, "").trim()
          );

          function column(name: string, occurrence = 0) {
            const indexes = headers
              .map((header, index) => header === name ? index : -1)
              .filter((index) => index !== -1);

            return indexes[occurrence] ?? -1;
          }

          function value(row: string[], name: string, occurrence = 0) {
            const index = column(name, occurrence);
            return index >= 0 ? row[index] : "";
          }

          const idIndex = column("ID de l'activité");
          const dateIndex = column("Date de l'activité");
          const nameIndex = column("Nom de l'activité");
          const sportIndex = column("Type d'activité");

          if ([idIndex, dateIndex, nameIndex, sportIndex].includes(-1)) {
            throw new Error("Les colonnes Strava sont introuvables.");
          }

          const activities = rows.slice(1)
            .filter((row) => row[idIndex] && row[dateIndex])
            .map((row) => {
              const date = parseStravaDate(row[dateIndex]);

              return {
                user_id: user.id,
                source: "strava",
                external_id: row[idIndex],
                name: row[nameIndex] || "Course Strava",
                sport: row[sportIndex] || "Course à pied",
                started_at: date,
                distance_m: Math.round(
  parseStravaNumber(value(row, "Distance", 1)) ?? 0
),
                moving_time_s: parseStravaNumber(
                  value(row, "Durée de déplacement")
                ),
                average_hr: parseStravaNumber(
                  value(row, "Fréquence cardiaque moyenne")
                ),
                max_hr: parseStravaNumber(
                  value(row, "Fréquence cardiaque max.", 1)
                ),
                average_watts: parseStravaNumber(
                  value(row, "Puissance moyenne")
                ),
                average_cadence: parseStravaNumber(
                  value(row, "Cadence moyenne")
                ),
                elevation_gain_m: parseStravaNumber(
                  value(row, "Dénivelé positif")
                ),
              };
            })
            .filter((activity) => activity.started_at !== null);

          const { data: existing, error: selectError } = await supabase
            .from("activities")
            .select("external_id")
            .eq("user_id", user.id)
            .eq("source", "strava");

          if (selectError) throw selectError;

          const existingIds = new Set(
            (existing || []).map((item) => item.external_id)
          );

          const newActivities = activities.filter(
            (activity) => !existingIds.has(activity.external_id)
          );

          if (newActivities.length > 0) {
            const { error: insertError } = await supabase
              .from("activities")
              .insert(newActivities);

            if (insertError) throw insertError;
          }

          await loadActivities();
          setLastImportDate(new Date().toLocaleString("fr-FR"));

          setImportMessage(
            `${newActivities.length} nouvelle(s) activité(s) importée(s). ${activities.length - newActivities.length} doublon(s) ignoré(s).`
          );
        } catch (error) {
          console.error("ERREUR IMPORT STRAVA :", JSON.stringify(error, Object.getOwnPropertyNames(error)));
          setImportMessage(
            error instanceof Error ? error.message : "Erreur pendant l'import."
          );
        } finally {
          setImporting(false);
        }
      },
      error: (error) => {
        setImportMessage(error.message);
        setImporting(false);
      },
    });
  } catch (error) {
    console.error(error);
    setImportMessage(
      error instanceof Error ? error.message : "Erreur pendant l'import."
    );
    setImporting(false);
  }
}
  async function addActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const km = Number(distance);
    if (!name.trim() || !km || !duration.trim()) return;

    const parts = duration.split(":").map(Number);

    if (
      parts.some((part) => !Number.isFinite(part) || part < 0) ||
      (parts.length !== 2 && parts.length !== 3)
    ) {
      setMessage("Format de durée invalide. Utilise MM:SS ou HH:MM:SS.");
      return;
    }

    const seconds = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1];

    setSaving(true);
    setMessage("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage("Tu dois être connecté pour enregistrer une séance.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("activities").insert({
      user_id: userData.user.id,
      source: "manual",
      name: name.trim(),
      sport: type,
      started_at: new Date().toISOString(),
      distance_m: Math.round(km * 1000),
      moving_time_s: seconds,
      average_hr: Number(heartRate) || null,
    });

    if (error) {
      setMessage("Erreur d'enregistrement : " + error.message);
      setSaving(false);
      return;
    }

    setName("");
    setDistance("");
    setDuration("");
    setHeartRate("");
    setShowForm(false);
    setMessage("Séance enregistrée avec succès !");
    setSaving(false);

    await loadActivities();
  }
async function askCoach() {
  if (!coachMessage.trim()) return;

  setCoachLoading(true);
  setCoachResponse(null);
  setCoachError("");

  try {
    const response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: coachMessage }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur du coach.");
    }

    const resultat: CoachResult =
      typeof data.conseil === "string"
        ? JSON.parse(data.conseil)
        : data.conseil;

    setCoachResponse(resultat);
  } catch (error) {
    setCoachError(
      error instanceof Error
        ? error.message
        : "Impossible de contacter le coach."
    );
  } finally {
    setCoachLoading(false);
  }
}
  return (
    <main className="min-h-screen bg-[#090d0b] p-5 text-white sm:p-8">
      <div className="mb-6 rounded-xl border border-gray-200 p-4">
  <h2 className="mb-2 text-lg font-semibold">
  Mettre à jour mes activités Strava
</h2>
<p className="mb-3 text-sm text-gray-400">
  Sélectionne ton nouvel export CSV pour récupérer tes dernières séances.
</p>

 <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-lime-400 px-4 py-3 font-semibold text-black hover:bg-lime-300">
  {importing ? "Synchronisation en cours..." : "Choisir mon export Strava"}
  <input
    type="file"
    accept=".csv,text/csv"
    disabled={importing}
    className="hidden"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) importStravaFile(file);
      e.currentTarget.value = "";
    }}
  />
</label>

  {importing && (
    <p className="mt-2 text-sm">Import en cours...</p>
  )}

  {importMessage && (
  <p className="mt-2 text-sm">{importMessage}</p>
)}

{lastImportDate && (
  <p className="mt-2 text-xs text-gray-400">
    Dernière synchronisation : {lastImportDate}
  </p>
)}

</div>
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm text-lime-400 hover:underline">
          ← Retour au tableau de bord
        </a>

        <header className="mb-8 mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-lime-400">
              Mon activité sportive
            </div>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Mes entraînements
            </h1>
            <p className="mt-2 text-gray-400">
              Retrouve et analyse toutes tes séances de course.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-lime-400 px-5 py-3 font-bold text-black hover:bg-lime-300"
          >
            + Ajouter une séance
          </button>
        </header>
          <section className="mb-8 rounded-2xl border border-lime-500/30 bg-gray-900 p-6">
  <h2 className="mb-2 text-xl font-bold text-lime-400">
    Mon Coach Running IA
  </h2>

  <p className="mb-4 text-sm text-gray-300">
    Pose une question à ton coach : il analysera tes entraînements et ta progression vers les 40 minutes au 10 km.
  </p>

  <textarea
    value={coachMessage}
    onChange={(e) => setCoachMessage(e.target.value)}
    placeholder="Exemple : Analyse mes derniers entraînements et dis-moi si je suis sur la bonne voie pour atteindre les 40 minutes."
    className="mb-4 min-h-28 w-full rounded-xl border border-gray-700 bg-gray-800 p-3 text-white"
  />

  <button
    onClick={askCoach}
    disabled={coachLoading || !coachMessage.trim()}
    className="rounded-xl bg-lime-400 px-5 py-3 font-bold text-gray-900 disabled:opacity-50"
  >
    {coachLoading ? "Le coach réfléchit..." : "Demander conseil au coach"}
  </button>

  {coachError && (
  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
    {coachError}
  </div>
)}

{coachResponse && (
  <div className="mt-5 space-y-5 rounded-xl bg-gray-800 p-5">

    <div>
      <h3 className="mb-2 text-lg font-bold text-lime-400">
        Analyse du coach
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-7 text-gray-200">
        {coachResponse.analyse}
      </p>
    </div>

    {coachResponse.modifications.length === 0 ? (
      <div className="rounded-xl border border-lime-500/30 bg-lime-500/10 p-4">
        <p className="font-bold text-lime-400">
          Ton programme reste inchangé.
        </p>
        <p className="mt-1 text-sm text-gray-300">
          Aucune modification n'est nécessaire pour les 7 prochains jours.
        </p>
      </div>
    ) : (
      <div>
        <h3 className="mb-3 text-lg font-bold text-lime-400">
          Modifications proposées
        </h3>

        <div className="space-y-3">
          {coachResponse.modifications.map((seance, index) => (
            <div
              key={index}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <p className="font-bold">
                {seance.jour} – {seance.type}
              </p>
              <p className="mt-2 text-sm text-gray-300">
                {seance.description}
              </p>

              {seance.allure && (
                <p className="mt-2 text-sm text-lime-400">
                  Allure : {seance.allure}
                </p>
              )}

              {seance.recuperation && (
                <p className="mt-1 text-sm text-gray-400">
                  Récupération : {seance.recuperation}
                </p>
              )}

              <p className="mt-2 text-sm text-gray-400">
                Raison : {seance.raison}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}

    <p className="border-t border-white/10 pt-4 text-sm font-semibold text-white">
      {coachResponse.question}
    </p>
  </div>
)}
</section>
        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
            <div className="text-sm text-gray-400">Nombre de séances</div>
            <div className="mt-2 text-3xl font-black">
              {activities.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
            <div className="text-sm text-gray-400">Distance cumulée</div>
            <div className="mt-2 text-3xl font-black text-lime-400">
              {totalDistance.toFixed(1).replace(".", ",")} km
            </div>
          </div>

          <div className="col-span-2 rounded-2xl border border-white/10 bg-[#121a15] p-5 md:col-span-1">
            <div className="text-sm text-gray-400">Source des données</div>
            <div className="mt-2 text-xl font-black">Strava + manuel</div>
            <div className="mt-1 text-xs text-gray-500">
              Synchronisation depuis Supabase
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-lime-400/20 bg-lime-400/10 p-4 text-sm text-lime-300">
            {message}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={addActivity}
            className="mb-7 rounded-2xl border border-lime-400/30 bg-[#121a15] p-5 sm:p-6"
          >
            <h2 className="mb-5 text-xl font-bold">Nouvelle séance</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-400">
                Nom de la séance
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Footing tranquille"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#090d0b] p-3 text-white outline-none focus:border-lime-400"
                />
              </label>

              <label className="text-sm text-gray-400">
                Type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#090d0b] p-3 text-white"
                >
                  <option>Endurance</option>
                  <option>Fractionné</option>
                  <option>Sortie longue</option>
                  <option>Compétition</option>
                  <option>Récupération</option>
                  <option>Trail</option>
                </select>
              </label>

              <label className="text-sm text-gray-400">
                Distance (km)
                <input
                  required
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="10.5"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#090d0b] p-3 text-white outline-none focus:border-lime-400"
                />
              </label>

              <label className="text-sm text-gray-400">
                Durée (MM:SS ou HH:MM:SS)
                <input
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="45:30"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#090d0b] p-3 text-white outline-none focus:border-lime-400"
                />
              </label>

              <label className="text-sm text-gray-400 sm:col-span-2">
                Fréquence cardiaque moyenne (bpm)
                <input
                  type="number"
                  min="0"
                  max="250"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="Facultatif"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#090d0b] p-3 text-white outline-none focus:border-lime-400"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-lime-400 px-5 py-3 font-bold text-black disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/20 px-5 py-3"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#121a15] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Historique des séances</h2>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#090d0b] px-3 py-2 text-sm text-white"
            >
             <option value="Toutes">Toutes les activités</option>
<option value="Course à pied">Course à pied</option>
<option value="Vélo">Vélo</option>
<option value="Natation">Natation</option>
<option value="Autre">Autre</option>
            </select>
          </div>

          {loading ? (
            <p className="py-8 text-center text-gray-400">
              Chargement des entraînements...
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-4"
                >
                  <div>
                    <div className="font-bold">{a.name}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {a.date} · {a.type}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-5 text-right">
                    <div>
                      <div className="font-bold">
                        {a.distance.toFixed(2).replace(".", ",")} km
                      </div>
                      <div className="text-xs text-gray-500">Distance</div>
                    </div>

                    <div>
                      <div className="font-bold">{a.duration}</div>
                      <div className="text-xs text-gray-500">Durée</div>
                    </div>

                    <div>
                      <div className="font-bold text-lime-400">{a.pace}</div>
                      <div className="text-xs text-gray-500">Allure/km</div>
                    </div>

                    <div>
                      <div className="font-bold">{a.heartRate ?? "--"}</div>
                      <div className="text-xs text-gray-500">FC moy.</div>
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <p className="py-8 text-center text-gray-500">
                  Aucune séance dans cette catégorie.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
