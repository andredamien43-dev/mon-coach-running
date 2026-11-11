
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setMessage(
          data.session
            ? "Compte créé ! Tu es connecté."
            : "Compte créé ! Vérifie tes e-mails pour confirmer ton inscription."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        window.location.href = "/entrainements";
      }
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
    <main className="min-h-screen bg-[#080b0a] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111714] p-8">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🏃</div>
          <h1 className="text-2xl font-bold">
            MON COACH <span className="text-lime-400">RUNNING</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Ton espace personnel d'entraînement
          </p>
        </div>

        <h2 className="text-xl font-semibold mb-2">
          {mode === "login" ? "Connexion" : "Créer mon compte"}
        </h2>

        <p className="text-sm text-gray-400 mb-6">
          {mode === "login"
            ? "Connecte-toi pour retrouver tes entraînements."
            : "Crée ton compte personnel."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Adresse e-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#080b0a] border border-white/10 p-3 outline-none focus:border-lime-400"
              placeholder="ton@email.fr"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-[#080b0a] border border-white/10 p-3 outline-none focus:border-lime-400"
              placeholder="6 caractères minimum"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-lime-400 p-3 font-bold text-black hover:bg-lime-300 disabled:opacity-50"
          >
            {loading
              ? "Chargement..."
              : mode === "login"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>
        </form>

        {message && (
          <p className="mt-5 text-sm text-lime-300 break-words">
            {message}
          </p>
        )}

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
          className="mt-6 w-full text-sm text-gray-400 hover:text-lime-400"
        >
          {mode === "login"
            ? "Pas encore de compte ? Créer mon compte"
            : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </main>
  );
}
