
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Objectif = {
  id: string;
  nom: string;
  type: string;
  distance_km: number | null;
  date_objectif: string | null;
  temps_cible_secondes: number | null;
  objectif_principal: boolean;
  statut: string;
};

export default function ObjectifsPage() {
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const [nom, setNom] = useState("");
  const [type, setType] = useState("10 km");
  const [distance, setDistance] = useState("10");
  const [date, setDate] = useState("");
  const [temps, setTemps] = useState("00:40");
  const [principal, setPrincipal] = useState(false);
  const [objectifEnCours, setObjectifEnCours] = useState<string | null>(null);
const [confirmationSuppression, setConfirmationSuppression] = useState<string | null>(null);

  async function chargerObjectifs() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Tu dois être connecté pour voir tes objectifs.");
      setChargement(false);
      return;
    }

    const { data, error } = await supabase
      .from("objectifs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErreur(error.message);
    } else {
      setObjectifs(data as Objectif[]);
      setErreur("");
    }

    setChargement(false);
  }

  useEffect(() => {
    chargerObjectifs();
  }, []);

  async function ajouterObjectif(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur("");
    setMessage("");
    setEnregistrement(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setErreur("Tu dois être connecté.");
      setEnregistrement(false);
      return;
    }

    const partiesTemps = temps.split(":").map(Number);
    const heures = partiesTemps[0] || 0;
    const minutes = partiesTemps[1] || 0;
    const secondes = partiesTemps[2] || 0;
    const tempsSecondes = temps
      ? heures * 3600 + minutes * 60 + secondes
      : null;

    if (principal) {
      const { error: updateError } = await supabase
        .from("objectifs")
        .update({ objectif_principal: false })
        .eq("user_id", user.id);

      if (updateError) {
        setErreur(updateError.message);
        setEnregistrement(false);
        return;
      }
    }

    const { error } = await supabase.from("objectifs").insert({
      user_id: user.id,
      nom,
      type,
      distance_km: distance ? Number(distance) : null,
      date_objectif: date || null,
      temps_cible_secondes: tempsSecondes,
      objectif_principal: principal,
      statut: "en_cours",
    });

    if (error) {
      setErreur(error.message);
    } else {
      setMessage("Objectif ajouté avec succès !");
      setNom("");
      setDate("");
      setTemps("00:40");
      setPrincipal(false);
      await chargerObjectifs();
    }

    setEnregistrement(false);
  }

async function supprimerObjectif(id: string) {
  const { error } = await supabase
    .from("objectifs")
    .delete()
    .eq("id", id);

  if (error) {
    setErreur(error.message);
    return;
  }

  setMessage("Objectif supprimé avec succès !");
  setConfirmationSuppression(null);
  await chargerObjectifs();
}

async function modifierObjectif(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  if (!objectifEnCours) return;

  setErreur("");
  setMessage("");
  setEnregistrement(true);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    setErreur("Tu dois être connecté.");
    setEnregistrement(false);
    return;
  }

  const partiesTemps = temps.split(":").map(Number);
  const heures = partiesTemps[0] || 0;
  const minutes = partiesTemps[1] || 0;
  const secondes = partiesTemps[2] || 0;

  const tempsSecondes = temps
    ? heures * 3600 + minutes * 60 + secondes
    : null;

  if (principal) {
    const { error: updateError } = await supabase
      .from("objectifs")
      .update({ objectif_principal: false })
      .eq("user_id", user.id);

    if (updateError) {
      setErreur(updateError.message);
      setEnregistrement(false);
      return;
    }
  }

  const { error } = await supabase
    .from("objectifs")
    .update({
      nom,
      type,
      distance_km: distance ? Number(distance) : null,
      date_objectif: date || null,
      temps_cible_secondes: tempsSecondes,
      objectif_principal: principal,
    })
    .eq("id", objectifEnCours)
    .eq("user_id", user.id);

  if (error) {
    setErreur(error.message);
  } else {
    setMessage("Objectif modifié avec succès !");
    setObjectifEnCours(null);
    setNom("");
    setType("10 km");
    setDistance("10");
    setDate("");
    setTemps("00:40");
    setPrincipal(false);
    await chargerObjectifs();
  }

  setEnregistrement(false);
}

function preparerModification(objectif: Objectif) {
  setObjectifEnCours(objectif.id);
  setNom(objectif.nom);
  setType(objectif.type);
  setDistance(
    objectif.distance_km !== null
      ? String(objectif.distance_km)
      : ""
  );
  setDate(objectif.date_objectif || "");
  setPrincipal(objectif.objectif_principal);

  if (objectif.temps_cible_secondes !== null) {
    const total = objectif.temps_cible_secondes;
    const heures = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secondes = total % 60;

    setTemps(
      [heures, minutes, secondes]
        .map((valeur) => String(valeur).padStart(2, "0"))
        .join(":")
    );
  } else {
    setTemps("");
  }

  setMessage("");
  setErreur("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}


  return (
    <main className="min-h-screen bg-[#0d120f] p-6 pb-28 text-white">
      <h1 className="mb-2 text-2xl font-bold">Mes objectifs</h1>

      <p className="mb-6 text-sm text-gray-400">
        Définis et suis tes objectifs sportifs.
      </p>

      <form
       onSubmit={objectifEnCours ? modifierObjectif : ajouterObjectif}
        className="mb-6 space-y-4 rounded-xl border border-white/10 bg-[#151c17] p-5"
      >
        <h2 className="text-lg font-semibold">
  {objectifEnCours ? "Modifier l'objectif" : "Ajouter un objectif"}
</h2>

        <div>
          <label className="mb-1 block text-sm text-gray-300">
            Nom de la compétition
          </label>
          <input
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : 10 km de Bourges"
            className="w-full rounded-lg border border-white/10 bg-[#0d120f] p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">
            Type de course
          </label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              const distances: Record<string, string> = {
                "5 km": "5",
                "10 km": "10",
                "Semi-marathon": "21.1",
                "Marathon": "42.195",
                "Trail": "",
                "Autre": "",
              };
              setDistance(distances[e.target.value]);
            }}
            className="w-full rounded-lg border border-white/10 bg-[#0d120f] p-3 text-white"
          >
            <option>5 km</option>
            <option>10 km</option>
            <option>Semi-marathon</option>
            <option>Marathon</option>
            <option>Trail</option>
            <option>Autre</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">
            Distance en kilomètres
          </label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="Ex : 10"
            className="w-full rounded-lg border border-white/10 bg-[#0d120f] p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">
            Date de la compétition
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d120f] p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300">
            Temps cible
          </label>
          <input
            type="time"
            step="1"
            value={temps}
            onChange={(e) => setTemps(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d120f] p-3 text-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Exemple : 00:40:00 pour un 10 km en 40 minutes.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={principal}
            onChange={(e) => setPrincipal(e.target.checked)}
            className="h-4 w-4 accent-lime-400"
          />
          Définir comme objectif principal
        </label>

        {erreur && <p className="text-sm text-red-400">{erreur}</p>}
        {message && <p className="text-sm text-lime-400">{message}</p>}

        <button
          type="submit"
          disabled={enregistrement}
          className="w-full rounded-lg bg-lime-400 p-3 font-bold text-black disabled:opacity-50"
        >
          {enregistrement
  ? "Enregistrement..."
  : objectifEnCours
    ? "Enregistrer les modifications"
    : "Ajouter l'objectif"}
        </button>
        {objectifEnCours && (
  <button
    type="button"
    onClick={() => {
      setObjectifEnCours(null);
      setNom("");
      setType("10 km");
      setDistance("10");
      setDate("");
      setTemps("00:40");
      setPrincipal(false);
      setErreur("");
      setMessage("");
    }}
    className="w-full rounded-lg border border-white/20 p-3 text-white"
  >
    Annuler la modification
  </button>
)}
      </form>

      <h2 className="mb-3 text-lg font-semibold">Mes compétitions</h2>

      {chargement ? (
        <p className="text-gray-400">Chargement...</p>
      ) : objectifs.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[#151c17] p-5 text-sm text-gray-400">
          Aucun objectif pour le moment.
        </p>
      ) : (
        <div className="space-y-3">
          {objectifs.map((objectif) => (
            <div
              key={objectif.id}
              className="rounded-xl border border-white/10 bg-[#151c17] p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{objectif.nom}</h3>
                {objectif.objectif_principal && (
                  <span className="text-xs text-lime-400">
                    Objectif principal
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-gray-400">
                {objectif.type}
                {objectif.distance_km
                  ? ` • ${objectif.distance_km} km`
                  : ""}
              </p>

              {objectif.date_objectif && (
                <p className="mt-1 text-sm text-gray-400">
                  Date : {new Date(objectif.date_objectif).toLocaleDateString("fr-FR")}
                </p>
              )}
              <div className="mt-4 flex gap-2">
  <button
    type="button"
    onClick={() => preparerModification(objectif)}
    className="flex-1 rounded-lg bg-lime-400 p-2 font-semibold text-black"
  >
    Modifier
  </button>

  <button
    type="button"
    onClick={() => setConfirmationSuppression(objectif.id)}
    className="flex-1 rounded-lg border border-red-500/50 p-2 font-semibold text-red-400"
  >
    Supprimer
  </button>
</div>

{confirmationSuppression === objectif.id && (
  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
    <p className="mb-3 text-sm">
      Confirmer la suppression de « {objectif.nom} » ?
    </p>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => supprimerObjectif(objectif.id)}
        className="flex-1 rounded-lg bg-red-500 p-2 font-semibold text-white"
      >
        Confirmer
      </button>

      <button
        type="button"
        onClick={() => setConfirmationSuppression(null)}
        className="flex-1 rounded-lg border border-white/20 p-2"
      >
        Annuler
      </button>
    </div>
  </div>
)}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
