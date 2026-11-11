
"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

type StravaActivity = {
  [key: string]: string;
};

type ActivityToImport = {
  user_id: string;
  source: string;
  external_id: string;
  name: string;
  sport: string;
  started_at: string;
  distance_m: number;
  moving_time_s: number;
  average_hr: number | null;
  max_hr: number | null;
  average_watts: number | null;
  average_cadence: number | null;
  elevation_gain_m: number | null;
};

function numberValue(value: string | undefined): number | null {
  if (!value) return null;

  const result = Number(value.replace(",", ".").trim());

  return Number.isFinite(result) ? result : null;
}

function parseStravaDate(value: string): string | null {
  const months: Record<string, string> = {
    janv: "01",
    "févr": "02",
    mars: "03",
    avr: "04",
    mai: "05",
    juin: "06",
    juil: "07",
    août: "08",
    sept: "09",
    oct: "10",
    nov: "11",
    déc: "12",
  };

  const match = value.trim().match(
    /^(\d{1,2})\s+([a-zéû]+)\.?\s+(\d{4}),?\s+(\d{2}:\d{2}:\d{2})$/i
  );

  if (!match) return null;

  const day = match[1].padStart(2, "0");
  const month = months[match[2].toLowerCase()];
  const year = match[3];

  if (!month) return null;

  return `${year}-${month}-${day}T${match[4]}Z`;
}

function getMaxHr(row: StravaActivity): number | null {
  const possibleColumns = [
    "Fréquence cardiaque max..1",
    "Fréquence cardiaque max.",
    "Fréquence cardiaque max",
  ];

  for (const column of possibleColumns) {
    const value = numberValue(row[column]);
    if (value !== null && value > 0) return value;
  }

  return null;
}

export default function ImportStravaPage() {
  const [activities, setActivities] = useState<ActivityToImport[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(0);
  const [updated, setUpdated] = useState(0);

  function handleFile(file: File) {
    setFileName(file.name);
    setMessage("Lecture du fichier en cours...");
    setActivities([]);
    setImported(0);
    setUpdated(0);

    Papa.parse<StravaActivity>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const running = result.data.filter(
          (row) => row["Type d'activité"] === "Course à pied"
        );

        const converted: ActivityToImport[] = [];
        let invalid = 0;

        for (const row of running) {
          const id = String(row["ID de l'activité"] || "").trim();
          const date = parseStravaDate(row["Date de l'activité"] || "");
          const name = row["Nom de l'activité"] || "Course à pied";

          if (!id || !date) {
            invalid++;
            continue;
          }

          const distance =
            numberValue(row["Distance.1"]) ??
            ((numberValue(row["Distance"]) ?? 0) * 1000);

          converted.push({
            user_id: "",
            source: "strava",
            external_id: id,
            name,
            sport: "Run",
            started_at: date,
            distance_m: Math.round(distance),
            moving_time_s: Math.round(
              numberValue(row["Durée de déplacement"]) ??
              numberValue(row["Temps écoulé"]) ?? 0
            ),
            average_hr: numberValue(row["Fréquence cardiaque moyenne"]),
            max_hr: getMaxHr(row),
            average_watts: numberValue(row["Puissance moyenne"]),
            average_cadence: numberValue(row["Cadence moyenne"]),
            elevation_gain_m: numberValue(row["Dénivelé positif"]),
          });
        }

        setActivities(converted);

        const withMaxHr = converted.filter(
          (activity) => activity.max_hr !== null
        ).length;

        setMessage(
          `${converted.length} courses détectées. ${withMaxHr} avec une FC maximale. ${invalid} ligne(s) ignorée(s).`
        );
      },
      error: (error) => {
        setMessage("Erreur de lecture : " + error.message);
      },
    });
  }

  async function importActivities() {
    if (activities.length === 0) return;

    setLoading(true);
    setImported(0);
    setUpdated(0);
    setMessage("Mise à jour de tes activités dans Supabase...");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Tu dois être connecté pour importer.");
      }

      const userId = userData.user.id;

      const ids = activities.map((activity) => activity.external_id);

      const { data: existing, error: existingError } = await supabase
        .from("activities")
        .select("id, external_id")
        .eq("user_id", userId)
        .eq("source", "strava")
        .in("external_id", ids);

      if (existingError) throw existingError;

      const existingMap = new Map(
        (existing || []).map((item) => [item.external_id, item.id])
      );

      const newActivities = activities
        .filter((activity) => !existingMap.has(activity.external_id))
        .map((activity) => ({
          ...activity,
          user_id: userId,
        }));

      // Mise à jour des FC maximales des courses déjà importées
      const toUpdate = activities.filter(
        (activity) =>
          existingMap.has(activity.external_id) &&
          activity.max_hr !== null
      );

      let updateCount = 0;

      for (const activity of toUpdate) {
        const existingId = existingMap.get(activity.external_id);

        if (!existingId) continue;

        const { error } = await supabase
          .from("activities")
          .update({ max_hr: activity.max_hr })
          .eq("id", existingId)
          .eq("user_id", userId);

        if (error) throw error;

        updateCount++;
        setUpdated(updateCount);
      }

      // Insertion des nouvelles activités
      let insertCount = 0;

      for (let i = 0; i < newActivities.length; i += 50) {
        const batch = newActivities.slice(i, i + 50);

        const { error } = await supabase
          .from("activities")
          .insert(batch);

        if (error) throw error;

        insertCount += batch.length;
        setImported(insertCount);
      }

      setMessage(
        `Terminé ! ${updateCount} activités mises à jour avec leur FC maximale. ${insertCount} nouvelles courses importées.`
      );
    } catch (error) {
      setMessage(
        "Erreur : " +
        (error instanceof Error ? error.message : "Erreur inconnue")
      );
    } finally {
      setLoading(false);
    }
  }

  const maxHrCount = activities.filter(
    (activity) => activity.max_hr !== null
  ).length;

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold text-lime-400">
          Import Strava
        </h1>

        <p className="mb-8 text-gray-400">
          Importe et mets à jour ton historique de courses à pied.
        </p>

        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6">
          <label className="mb-3 block font-semibold">
            Sélectionne ton fichier activities.csv
          </label>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:font-bold file:text-black"
          />

          {fileName && (
            <p className="mt-3 text-sm text-gray-400">
              Fichier : {fileName}
            </p>
          )}

          {message && (
            <p className="mt-5 rounded-lg bg-gray-800 p-4 text-sm text-lime-300">
              {message}
            </p>
          )}

          {activities.length > 0 && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">Courses détectées</p>
                  <p className="text-3xl font-bold text-lime-400">
                    {activities.length}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">Avec FC maximale</p>
                  <p className="text-3xl font-bold text-lime-400">
                    {maxHrCount}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-800 p-4">
                  <p className="text-sm text-gray-400">FC mises à jour</p>
                  <p className="text-3xl font-bold text-lime-400">
                    {updated}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Activité</th>
                      <th className="p-2">Distance</th>
                      <th className="p-2">FC moy.</th>
                      <th className="p-2">FC max.</th>
                    </tr>
                  </thead>

                  <tbody>
                    {activities.slice(0, 8).map((activity) => (
                      <tr
                        key={activity.external_id}
                        className="border-t border-gray-700"
                      >
                        <td className="p-2">
                          {new Date(activity.started_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="p-2">{activity.name}</td>
                        <td className="p-2">
                          {(activity.distance_m / 1000).toFixed(2)} km
                        </td>
                        <td className="p-2">
                          {activity.average_hr ?? "—"}
                        </td>
                        <td className="p-2 text-lime-400">
                          {activity.max_hr ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="mt-2 text-xs text-gray-500">
                  Aperçu des 8 premières courses.
                </p>
              </div>

              <button
                onClick={importActivities}
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-lime-400 p-4 font-bold text-black hover:bg-lime-300 disabled:opacity-50"
              >
                {loading
                  ? "Mise à jour en cours..."
                  : "Mettre à jour mes courses dans Supabase"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
