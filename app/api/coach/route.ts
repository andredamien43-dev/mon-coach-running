import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { readFile } from "fs/promises";
import { join } from "path";

const PROGRAM_ID = "10km-fevrier-2027";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API Gemini manquante." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const supabase = await createSupabaseServerClient();

const { data: authData, error: authError } =
      await supabase.auth.getUser();

if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Tu dois être connecté pour utiliser ton coach." },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

const { data: activites, error: activitesError } = await supabase
      .from("activities")
      .select(
        "name, sport, started_at, distance_m, moving_time_s, average_hr, max_hr, average_watts, average_cadence, elevation_gain_m, splits"
      )
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(12);

    if (activitesError) throw activitesError;

const { data: seances, error: seancesError } = await supabase
      .from("program_sessions")
      .select("session_key, status, completed, completed_at")
      .eq("user_id", userId)
      .eq("program_id", PROGRAM_ID);

    if (seancesError) throw seancesError;

    const { data: bilanForme, error: bilanError } = await supabase
  .from("daily_wellness")
  .select("recorded_at, fatigue, jambes_lourdes, douleurs, forme, commentaire")
  .eq("user_id", userId)
  .order("recorded_at", { ascending: false })
  .limit(7);

if (bilanError) throw bilanError;

    let programme = null;

try {
const cheminProgramme = join(
process.cwd(),
"public",
"programmes",
`${PROGRAM_ID}.json`
);

const contenu = await readFile(cheminProgramme, "utf8");
      programme = JSON.parse(contenu);
    } catch (error) {
      console.error("Impossible de charger le programme :", error);
    }

const contexte = {
      objectif: {
        distance: "10 km",
        temps_cible: "40 minutes",
        allure_cible: "4:00 min/km",
        date_course: "2027-02-07",
      },
      programme,
      activites: activites || [],
      suivi_seances: seances || [],
      bilans_forme: bilanForme || [],
      message: body.message || "Analyse ma progression.",
    };

    const ai = new GoogleGenAI({ apiKey });

let response;

for (let tentative = 1; tentative <= 3; tentative++) {
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: JSON.stringify(contexte),
      config: {
        maxOutputTokens: 10000,
        responseMimeType: "application/json",
        temperature: 0.4,
        systemInstruction: `
Tu es Mon Coach Running, un entraîneur personnel spécialisé en course à pied.

Tu disposes des données réelles du coureur :
- Ses 12 dernières activités enregistrées.
- Ses allures, distances et temps.
- Sa fréquence cardiaque et sa puissance lorsqu'elles sont disponibles.
- Son programme d'entraînement.
- Le suivi des séances réalisées, manquées ou à faire.
- Les 7 derniers bilans de forme du coureur : fatigue, jambes lourdes, douleurs, état de forme et commentaires.

Tes missions :
- Analyser les entraînements et la progression.
- Comparer les résultats avec l'objectif de 10 km en 40 minutes.
- Adapter le programme en fonction des séances réalisées ou manquées.
- Tenir compte de la fatigue et de la récupération.
- Éviter deux séances difficiles rapprochées.
- Préserver les jours de repos.
- Proposer des séances précises et réalistes.

Règles importantes :
- Utilise uniquement les données réellement fournies.
- Ne considère pas une séance manquée comme une séance réalisée.
- Ne cherche jamais à rattraper toutes les séances manquées.
- Ne modifie pas le programme sans expliquer pourquoi.
- En cas de douleur ou de fatigue importante, privilégie la récupération.
- Si une donnée manque, indique-le clairement.
- Analyse systématiquement les bilans de forme avant de proposer une séance.
- Si la fatigue est élevée ou les jambes très lourdes, allège la séance.
- Si une douleur est signalée, ne propose pas de séance intense et recommande une évaluation adaptée si nécessaire.
- Si l'état de forme est faible, privilégie la récupération.
- Compare les sensations sur plusieurs jours pour détecter une fatigue persistante.
- Si aucun bilan n'est disponible, demande au coureur de renseigner ses sensations.

Adaptation intelligente du programme :
- Analyse les séances réalisées, manquées et à venir.
- Compare les allures réellement réalisées aux allures prévues.
- Identifie les signes de fatigue ou de progression.
- Propose des adaptations précises pour les 7 prochains jours.
- Donne le jour, le type de séance, la distance, les allures et les récupérations.
- Si une séance est manquée, ne la reporte pas automatiquement.
- Préserve les jours de repos.
- Explique pourquoi chaque modification est nécessaire.
- Ne prétends jamais avoir modifié le programme : tu proposes uniquement des changements.
- Réponds toujours en français.
- Retourne exclusivement un JSON valide, sans balises Markdown.
- Respecte exactement cette structure :
{
  "analyse": "Ton analyse détaillée des entraînements et de la forme",
  "modifications": [
    {
      "jour": "Mardi",
      "type": "Fractionné",
      "description": "Description précise de la séance proposée",
      "recuperation": "Récupération prévue",
      "allure": "Allure prévue",
      "raison": "Pourquoi cette modification est nécessaire"
    }
  ],
  "question": "Souhaites-tu appliquer ces modifications ?"
}
- Si aucune modification n'est nécessaire, retourne un tableau modifications vide.
- Ne propose que des modifications concernant les 7 prochains jours.
        `,
      },
    });

    break;
  } catch (error) {
    const status = (error as { status?: number }).status;

    if (status !== 503 || tentative === 3) {
      throw error;
    }

    console.log(`Gemini surchargé. Nouvelle tentative ${tentative + 1}/3...`);

    await new Promise((resolve) =>
      setTimeout(resolve, tentative * 3000)
    );
  }
}

if (!response) {

  throw new Error("Gemini n'a fourni aucune réponse.");
}

console.log("Fin de génération Gemini :", response.candidates?.[0]?.finishReason);
console.log("Nombre de caractères générés :", response.text?.length);
console.log("Réponse brute Gemini :", response.text);
return NextResponse.json({
      success: true,
      conseil: response.text,
      donnees: {
        activites: activites?.length || 0,
        seances: seances?.length || 0,
        programmeCharge: programme !== null,
      },
    });
  } catch (error) {
  console.error("Erreur Gemini :", error);

  const status = (error as { status?: number }).status;

  if (status === 503) {
    return NextResponse.json(
      { error: "Gemini est temporairement surchargé. Réessaie dans quelques instants." },
      { status: 503 }
    );
  }

  if (status === 429) {
    return NextResponse.json(
      { error: "Limite d'utilisation Gemini atteinte. Réessaie plus tard." },
      { status: 429 }
    );
  }

  if (status === 404) {
    return NextResponse.json(
      { error: "Le modèle Gemini demandé est indisponible." },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { error: "Impossible de contacter le coach IA." },
    { status: 500 }
  );
}
}
