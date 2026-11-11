
"use client";

import { useState } from "react";

export default function ParametresPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function connecterGoogle() {
    window.location.href = "/api/google/connect";
  }

  async function synchroniserGoogle() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/google/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur de synchronisation");
      }

      setMessage(
  `Synchronisation réussie : ${data.created} séances créées, ${data.updated} mises à jour et ${data.deleted ?? 0} supprimées.`
);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080b0a] text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-3">
          Paramètres
        </h1>

        <p className="text-gray-400 mb-8">
          Configure tes outils et synchronise ton calendrier.
        </p>

        <div className="rounded-2xl border border-white/10 bg-[#111714] p-6">
          <div className="text-3xl mb-4">📅</div>

          <h2 className="text-xl font-bold mb-2">
            Google Agenda
          </h2>

          <p className="text-gray-400 text-sm mb-6">
            Connecte ton agenda pour retrouver tes séances
            de running directement dans Google Agenda.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={connecterGoogle}
              className="rounded-lg bg-lime-400 px-6 py-3 font-bold text-black hover:bg-lime-300"
            >
              Connecter Google Agenda
            </button>

            <button
              onClick={synchroniserGoogle}
              disabled={loading}
              className="rounded-lg border border-lime-400 px-6 py-3 font-bold text-lime-400 hover:bg-lime-400/10 disabled:opacity-50"
            >
              {loading
                ? "Synchronisation en cours..."
                : "Synchroniser mes entraînements"}
            </button>
          </div>

          {message && (
            <p className="mt-5 text-sm text-lime-300">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
