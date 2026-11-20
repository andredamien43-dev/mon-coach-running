
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ParametresPage() {
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    async function chargerProfil() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) return;

      const date = data.user.user_metadata?.birth_date;

      if (typeof date === "string") {
        setBirthDate(date);
      }
    }

    chargerProfil();
  }, []);

  function calculerAge(date: string) {
    if (!date) return null;

    const naissance = new Date(`${date}T00:00:00`);
    const aujourdHui = new Date();

    if (Number.isNaN(naissance.getTime()) || naissance > aujourdHui) {
      return null;
    }

    let age = aujourdHui.getFullYear() - naissance.getFullYear();

    const anniversairePasEncorePasse =
      aujourdHui.getMonth() < naissance.getMonth() ||
      (aujourdHui.getMonth() === naissance.getMonth() &&
        aujourdHui.getDate() < naissance.getDate());

    if (anniversairePasEncorePasse) age--;

    return age;
  }

  async function enregistrerProfil() {
    if (!birthDate) {
      setMessage("Merci de renseigner ta date de naissance.");
      return;
    }

    if (!calculerAge(birthDate)) {
      setMessage("La date de naissance renseignée est invalide.");
      return;
    }

    setSavingProfile(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          birth_date: birthDate,
        },
      });

      if (error) throw error;

      setMessage("Profil enregistré avec succès !");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le profil."
      );
    } finally {
      setSavingProfile(false);
    }
  }

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
    <main className="min-h-screen bg-[#080b0a] p-6 pb-32 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-3 text-3xl font-bold">
          Paramètres
        </h1>

        <p className="mb-8 text-gray-400">
          Configure ton profil et tes outils.
        </p>

        <div className="mb-6 rounded-2xl border border-lime-400/20 bg-[#111714] p-6">
          <div className="mb-4 text-3xl">🏃</div>

          <h2 className="mb-2 text-xl font-bold">
            Profil du coureur
          </h2>

          <p className="mb-6 text-sm text-gray-400">
            Ces informations permettent à ton coach IA
            d'adapter ses recommandations à ton profil.
          </p>

          <label className="mb-2 block text-sm font-medium text-gray-300">
            Date de naissance
          </label>

          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={today || undefined}
            className="mb-4 w-full rounded-lg border border-white/10 bg-[#080b0a] px-4 py-3 text-white"
          />

          {birthDate && calculerAge(birthDate) !== null && (
            <p className="mb-5 text-sm text-lime-400">
              Âge actuel : {calculerAge(birthDate)} ans
            </p>
          )}

          <button
            onClick={enregistrerProfil}
            disabled={savingProfile}
            className="w-full rounded-lg bg-lime-400 px-6 py-3 font-bold text-black hover:bg-lime-300 disabled:opacity-50"
          >
            {savingProfile
              ? "Enregistrement..."
              : "Enregistrer mon profil"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111714] p-6">
          <div className="mb-4 text-3xl">📅</div>

          <h2 className="mb-2 text-xl font-bold">
            Google Agenda
          </h2>

          <p className="mb-6 text-sm text-gray-400">
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
        </div>

        {message && (
          <p className="mt-5 text-sm text-lime-300">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
