"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function FormePage() {
  const [fatigue, setFatigue] = useState(1);
  const [jambes, setJambes] = useState(1);
  const [douleurs, setDouleurs] = useState(0);
  const [forme, setForme] = useState(5);
  const [commentaire, setCommentaire] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function enregistrerBilan() {
    setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Tu dois être connecté.");
      }

      const { error } = await supabase
        .from("daily_wellness")
        .upsert(
          {
            user_id: authData.user.id,
            recorded_at: new Date().toLocaleDateString("en-CA"),
            fatigue,
            jambes_lourdes: jambes,
            douleurs,
            forme,
            commentaire,
          },
          { onConflict: "user_id,recorded_at" }
        );

      if (error) throw error;

      setMessage("Bilan de forme enregistré avec succès !");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erreur lors de l'enregistrement."
      );
    } finally {
      setLoading(false);
    }
  }

  function choix(
    titre: string,
    valeur: number,
    modifier: (v: number) => void,
    maximum = 5,
    minimum = 1
  ) {
    return (
      <div className="mb-6">
        <h3 className="mb-3 font-semibold">{titre}</h3>
        <div className="flex flex-wrap gap-2">
          {Array.from(
            { length: maximum - minimum + 1 },
            (_, i) => i + minimum
          ).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => modifier(n)}
              className={`h-11 w-11 rounded-xl font-bold ${
                valeur === n
                  ? "bg-lime-400 text-gray-900"
                  : "bg-gray-800 text-white"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="text-lime-400 hover:underline">
          ← Accueil
        </a>

        <h1 className="mb-2 mt-6 text-3xl font-bold">
          Mon bilan de forme
        </h1>

        <p className="mb-8 text-gray-400">
          Indique tes sensations du jour pour aider ton coach à adapter tes entraînements.
        </p>

        {choix("Fatigue générale (1 = aucune, 5 = très élevée)", fatigue, setFatigue)}
        {choix("Jambes lourdes (1 = légères, 5 = très lourdes)", jambes, setJambes)}
        {choix("Douleurs (0 = aucune, 5 = importantes)", douleurs, setDouleurs, 5, 0)}
        {choix("État de forme (1 = mauvais, 5 = excellent)", forme, setForme)}

        <div className="mb-6">
          <label className="mb-2 block font-semibold">
            Commentaires (facultatif)
          </label>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Exemple : jambes lourdes après la sortie longue..."
            className="min-h-24 w-full rounded-xl border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <button
          onClick={enregistrerBilan}
          disabled={loading}
          className="rounded-xl bg-lime-400 px-6 py-3 font-bold text-gray-900 disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Enregistrer mon bilan"}
        </button>

        {message && (
          <p className="mt-4 rounded-xl bg-gray-800 p-4">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}