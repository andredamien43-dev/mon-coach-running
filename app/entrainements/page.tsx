
"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";


type Activity = {
  id: string;
  date: string;
  startedAt: string;
  durationSeconds: number;
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
  startedAt: item.started_at,
  durationSeconds: item.moving_time_s,
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
const [now, setNow] = useState<Date | null>(null);
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

const totalDuration = activities.reduce(
  (sum, activity) => sum + activity.durationSeconds,
  0
);

const averagePace = totalDistance > 0
  ? formatPace(totalDistance, totalDuration)
  : "--:--";

const sevenDaysAgo = now
  ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  : null;

const lastSevenDays = now && sevenDaysAgo
  ? activities.filter((activity) => {
      const activityDate = new Date(activity.startedAt);
      return activityDate >= sevenDaysAgo && activityDate <= now;
    })
  : [];

const weeklyDistance = lastSevenDays.reduce(
  (sum, activity) => sum + activity.distance,
  0
);

const weeklySessions = lastSevenDays.length;

const weeklyDuration = lastSevenDays.reduce(
  (sum, activity) => sum + activity.durationSeconds,
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
async function importGpxFile(file: File) {
  setImporting(true);
  setImportMessage("");

  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      throw new Error("Tu dois être connecté.");
    }

    const text = await file.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    if (xml.querySelector("parsererror")) {
      throw new Error("Le fichier GPX est invalide.");
    }

    const points = Array.from(xml.getElementsByTagName("trkpt"));

    if (points.length < 2) {
      throw new Error("Aucun parcours GPS exploitable.");
    }

  const coordinates = points.map((point) => {
  const elements = Array.from(point.getElementsByTagName("*"));

  function getMeasurement(names: string[]): number | null {
    const element = elements.find((el) =>
      names.includes(
        (el.localName || el.tagName.split(":").pop() || "").toLowerCase()
      )
    );

    if (!element?.textContent) return null;

    const value = Number(element.textContent);
    return Number.isFinite(value) ? value : null;
  }

  return {
    lat: Number(point.getAttribute("lat")),
    lon: Number(point.getAttribute("lon")),
    time: point.querySelector("time")?.textContent,
    elevation: getMeasurement(["ele"]),
    heartRate: getMeasurement(["hr", "heartrate"]),
    watts: getMeasurement(["power", "powerinwatts"]),
  };
});

    const validPoints = coordinates.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)
    );

    let distanceMeters = 0;

    function distanceBetween(a: typeof validPoints[0], b: typeof validPoints[0]) {
      const R = 6371000;
      const rad = (value: number) => value * Math.PI / 180;

      const dLat = rad(b.lat - a.lat);
      const dLon = rad(b.lon - a.lon);

      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.lat)) *
        Math.cos(rad(b.lat)) *
        Math.sin(dLon / 2) ** 2;

      return 2 * R * Math.asin(Math.sqrt(h));
    }

    for (let i = 1; i < validPoints.length; i++) {
      distanceMeters += distanceBetween(
        validPoints[i - 1],
        validPoints[i]
      );
    }

    const times = validPoints
      .map((p) => p.time ? new Date(p.time).getTime() : NaN)
      .filter(Number.isFinite);

    if (distanceMeters <= 0 || times.length < 2) {
      throw new Error("Distance ou durée introuvable dans le GPX.");
    }

    const startedAt = new Date(Math.min(...times)).toISOString();
    const durationSeconds = Math.round(
      (Math.max(...times) - Math.min(...times)) / 1000
    );
const heartRates = validPoints
  .map((p) => p.heartRate)
  .filter((v): v is number => v !== null);

const powers = validPoints
  .map((p) => p.watts)
  .filter((v): v is number => v !== null);

const averageHr = heartRates.length
  ? Math.round(heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length)
  : null;

const maxHr = heartRates.length
  ? Math.max(...heartRates)
  : null;

const averageWatts = powers.length
  ? Math.round(powers.reduce((sum, value) => sum + value, 0) / powers.length)
  : null;

let elevationGain = 0;

for (let i = 1; i < validPoints.length; i++) {
  const previous = validPoints[i - 1].elevation;
  const current = validPoints[i].elevation;

  if (previous !== null && current !== null && current > previous) {
    elevationGain += current - previous;
  }
}
    const activityName =
      file.name.replace(/\.gpx$/i, "") || "Course GPX";

    const externalId = `gpx-${file.name}-${startedAt}`;

    const { data: existing, error: checkError } = await supabase
      .from("activities")
      .select("id")
      .eq("user_id", user.id)
      .eq("source", "gpx")
      .eq("external_id", externalId)
      .maybeSingle();

    if (checkError) throw checkError;

   if (existing) {
  const { error: updateError } = await supabase
    .from("activities")
    .update({
      elevation_gain_m: Math.round(elevationGain),
    })
    .eq("id", existing.id)
    .eq("user_id", user.id);

  if (updateError) throw updateError;

  await loadActivities();

  setLastImportDate(new Date().toLocaleString("fr-FR"));
  setImportMessage(
    `Dénivelé mis à jour : ${Math.round(elevationGain)} m.`
  );

  return;
}
    

    const { error } = await supabase.from("activities").insert({
      user_id: user.id,
      source: "gpx",
      external_id: externalId,
      name: activityName,
      sport: "Course à pied",
      started_at: startedAt,
         distance_m: Math.round(distanceMeters),
      moving_time_s: durationSeconds,
      average_hr: averageHr,
      max_hr: maxHr,
      average_watts: averageWatts,
      elevation_gain_m: Math.round(elevationGain),
    });

    if (error) throw error;

    await loadActivities();

    setLastImportDate(new Date().toLocaleString("fr-FR"));
    setImportMessage(
      `Import réussi : ${(distanceMeters / 1000).toFixed(2)} km.`
    );
       } catch (error: any) {
    console.error("Erreur import GPX détaillée :", error);
    console.error("Message :", error?.message);
    console.error("Code :", error?.code);
    console.error("Détails :", error?.details);
    console.error("Indice :", error?.hint);

    setImportMessage(
      error?.message ||
      error?.details ||
      error?.hint ||
      "Erreur inconnue pendant l'import GPX."
    );
  } finally {
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

<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white hover:bg-blue-400">
  {importing ? "Import GPX en cours..." : "Importer un fichier GPX"}

  <input
    type="file"
    accept=".gpx,application/gpx+xml,application/xml,text/xml"
    disabled={importing}
    className="hidden"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) importGpxFile(file);
      e.currentTarget.value = "";
    }}
  />
</label>

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
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
  <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
    <p className="text-sm text-gray-400">Distance totale</p>
    <p className="mt-3 text-3xl font-black text-lime-400">
      {totalDistance.toFixed(1).replace(".", ",")}
      <span className="ml-1 text-base font-semibold text-gray-400">km</span>
    </p>
    <p className="mt-2 text-xs text-gray-500">Toutes activités</p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
    <p className="text-sm text-gray-400">Séances</p>
    <p className="mt-3 text-3xl font-black">{activities.length}</p>
    <p className="mt-2 text-xs text-gray-500">Enregistrées</p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
    <p className="text-sm text-gray-400">Temps total</p>
    <p className="mt-3 text-3xl font-black">
      {Math.floor(totalDuration / 3600)}h
      {String(Math.floor((totalDuration % 3600) / 60)).padStart(2, "0")}
    </p>
    <p className="mt-2 text-xs text-gray-500">Temps en mouvement</p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
    <p className="text-sm text-gray-400">Allure moyenne</p>
    <p className="mt-3 text-3xl font-black text-lime-400">
      {averagePace}
    </p>
    <p className="mt-2 text-xs text-gray-500">min/km</p>
  </div>
</div>

<div className="mb-8 rounded-2xl border border-lime-400/20 bg-[#121a15] p-5 sm:p-6">
  <div className="mb-5 flex items-center justify-between gap-3">
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-lime-400">
        Activité récente
      </p>
      <h2 className="mt-1 text-xl font-bold">Les 7 derniers jours</h2>
    </div>
    <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-400">
      {weeklySessions} séances
    </span>
  </div>

  <div className="grid grid-cols-3 gap-3">
    <div>
      <p className="text-xs text-gray-400">Distance</p>
      <p className="mt-2 text-xl font-black">
        {weeklyDistance.toFixed(1).replace(".", ",")} km
      </p>
    </div>

    <div>
      <p className="text-xs text-gray-400">Durée</p>
      <p className="mt-2 text-xl font-black">
        {Math.floor(weeklyDuration / 3600)}h
        {String(Math.floor((weeklyDuration % 3600) / 60)).padStart(2, "0")}
      </p>
    </div>

    <div>
      <p className="text-xs text-gray-400">Séances</p>
      <p className="mt-2 text-xl font-black">{weeklySessions}</p>
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

       
<div className="flex flex-wrap gap-2">
  {[
    { label: "Toutes", value: "Toutes" },
    { label: "🏃 Course à pied", value: "Course à pied" },
    { label: "🚴 Vélo", value: "Vélo" },
    { label: "🏊 Natation", value: "Natation" },
    { label: "Autre", value: "Autre" },
  ].map((item) => (
    <button
      key={item.value}
      type="button"
      onClick={() => setFilter(item.value)}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
        filter === item.value
          ? "border-lime-400 bg-lime-400 text-[#090d0b]"
          : "border-white/10 bg-[#121a15] text-gray-300 hover:border-lime-400/40 hover:text-white"
      }`}
    >
      {item.label}
    </button>
  ))}
</div>

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
    className="group rounded-2xl border border-white/10 bg-[#121a15] p-5 transition-all duration-200 hover:border-lime-400/40 hover:bg-[#17221a]"
  >
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-xl">
            {a.type === "Course à pied"
              ? "🏃"
              : a.type === "Trail"
              ? "⛰️"
              : a.type === "Vélo"
              ? "🚴"
              : a.type === "Natation"
              ? "🏊"
              : "🏅"}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-bold text-white">
              {a.name}
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              {a.date} · {a.type}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 sm:gap-6">
        <div>
          <p className="text-xs text-gray-500">Distance</p>
          <p className="mt-1 text-lg font-black text-lime-400">
            {a.distance.toFixed(2).replace(".", ",")}
            <span className="ml-1 text-xs font-medium text-gray-400">km</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Durée</p>
          <p className="mt-1 text-lg font-bold text-white">{a.duration}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Allure</p>
          <p className="mt-1 text-lg font-bold text-white">
            {a.pace}
            <span className="ml-1 text-xs font-medium text-gray-400">/km</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Fréquence cardiaque</p>
          <p className="mt-1 text-lg font-bold text-white">
            {a.heartRate ? `${a.heartRate}` : "--"}
            <span className="ml-1 text-xs font-medium text-gray-400">bpm</span>
          </p>
        </div>
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
