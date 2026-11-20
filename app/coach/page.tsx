
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Modification = {
  jour: string;
  type: string;
  description: string;
  recuperation?: string;
  allure?: string;
  raison?: string;
};

type Conseil = {
  analyse: string;
  modifications: Modification[];
  question: string;
};

type Message = {
  role: "user" | "coach";
  content: string;
};

export default function CoachPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "coach",
      content:
        "Bonjour ! Je suis ton coach running. Je peux analyser tes entraînements, suivre ta progression vers ton objectif et répondre à tes questions. Comment te sens-tu aujourd'hui ?",
    },
  ]);

  const [saisie, setSaisie] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [conseil, setConseil] = useState<Conseil | null>(null);
  const [decisions, setDecisions] = useState<Record<number, string>>({});

  async function envoyerMessage(message: string) {
    const texte = message.trim();
    if (!texte || chargement) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", content: texte },
    ]);
    setSaisie("");
    setChargement(true);
    setErreur("");
    setConseil(null);
    setDecisions({});

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: texte }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur du coach IA.");
      }

      let resultat: Conseil;

      try {
        resultat =
          typeof data.conseil === "string"
            ? JSON.parse(data.conseil)
            : data.conseil;
      } catch {
        throw new Error("La réponse du coach est illisible. Réessaie.");
      }

      if (!resultat || typeof resultat.analyse !== "string") {
        throw new Error("Le coach a renvoyé une réponse incomplète.");
      }

      resultat.modifications = Array.isArray(resultat.modifications)
        ? resultat.modifications
        : [];

      setConseil(resultat);

      setMessages((previous) => [
        ...previous,
        { role: "coach", content: resultat.analyse },
      ]);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de contacter le coach IA."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090d0b] p-4 pb-32 text-white sm:p-6 sm:pb-32 lg:p-8 lg:pb-32">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-lime-400">
              MON COACH RUNNING
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">
              Coach <span className="text-lime-400">IA</span>
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Ton entraîneur personnel, disponible à chaque étape.
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/10"
          >
            ← Tableau de bord
          </button>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-lime-400/20 bg-[#121a15] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Objectif
            </div>
            <div className="mt-2 text-xl font-black">10 km</div>
            <div className="mt-1 text-sm text-gray-400">Bourges · 7 février 2027</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Temps visé
            </div>
            <div className="mt-2 text-3xl font-black text-lime-400">40:00</div>
            <div className="mt-1 text-sm text-gray-400">Allure cible : 4:00/km</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Mode coach
            </div>
            <div className="mt-2 text-xl font-black">Accompagnement</div>
            <div className="mt-1 text-sm text-gray-400">Aucune modification automatique</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="flex min-h-[600px] flex-col rounded-2xl border border-white/10 bg-[#121a15]">
            <div className="flex items-center gap-3 border-b border-white/10 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime-400 text-2xl font-black text-black">
                ✦
              </div>
              <div>
                <h2 className="font-black">Discussion avec ton coach</h2>
                <p className="text-xs text-lime-400">Coach IA · Gemini</p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-lime-400" />
                Disponible
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap rounded-2xl p-4 text-sm leading-7 ${
                      message.role === "user"
                        ? "rounded-br-sm bg-lime-400 font-medium text-black"
                        : "rounded-bl-sm border border-white/10 bg-[#1a241d] text-gray-200"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {chargement && (
                <div className="rounded-2xl border border-white/10 bg-[#1a241d] p-4 text-sm text-lime-400">
                  Ton coach analyse tes données...
                </div>
              )}

              {erreur && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                  {erreur}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  "Analyse ma progression",
                  "Comment gérer ma fatigue ?",
                  "Suis-je prêt pour mon objectif ?",
                ].map((question) => (
                  <button
                    key={question}
                    disabled={chargement}
                    onClick={() => envoyerMessage(question)}
                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-400 transition hover:border-lime-400/40 hover:text-lime-400 disabled:opacity-40"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  envoyerMessage(saisie);
                }}
                className="flex gap-2"
              >
                <input
                  value={saisie}
                  onChange={(event) => setSaisie(event.target.value)}
                  placeholder="Pose une question à ton coach..."
                  disabled={chargement}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#090d0b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-lime-400/50"
                />
                <button
                  type="submit"
                  disabled={chargement || !saisie.trim()}
                  className="rounded-xl bg-lime-400 px-5 py-3 text-sm font-black text-black transition hover:bg-lime-300 disabled:opacity-40"
                >
                  Envoyer
                </button>
              </form>
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black">Analyse du coach</h2>
                <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-400">
                  Gemini
                </span>
              </div>

              {conseil ? (
                <div className="whitespace-pre-wrap text-sm leading-7 text-gray-300">
                  {conseil.analyse}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                  <div className="mb-3 text-3xl">✦</div>
                  <p className="text-sm text-gray-400">
                    Lance une analyse ou pose une question pour obtenir les conseils de ton coach.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#121a15] p-5">
              <h2 className="mb-4 text-lg font-black">
                Séances proposées
              </h2>

              {conseil?.modifications.length ? (
                <div className="space-y-4">
                  {conseil.modifications.map((modification, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-white/10 bg-[#0d140f] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-lime-400">
                          {modification.jour}
                        </span>
                        <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-gray-400">
                          {modification.type}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-gray-200">
                        {modification.description}
                      </p>

                      {modification.allure && (
                        <p className="mt-2 text-xs text-gray-400">
                          Allure : {modification.allure}
                        </p>
                      )}

                      {modification.recuperation && (
                        <p className="mt-1 text-xs text-gray-400">
                          Récupération : {modification.recuperation}
                        </p>
                      )}

                      {modification.raison && (
                        <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-gray-500">
                          Pourquoi : {modification.raison}
                        </p>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() =>
                            setDecisions((previous) => ({
                              ...previous,
                              [index]: "accepted",
                            }))
                          }
                          className={`flex-1 rounded-lg px-3 py-2 text-xs font-black transition ${
                            decisions[index] === "accepted"
                              ? "bg-lime-400 text-black"
                              : "border border-lime-400/30 text-lime-400 hover:bg-lime-400/10"
                          }`}
                        >
                          {decisions[index] === "accepted" ? "Acceptée" : "Accepter"}
                        </button>

                        <button
                          onClick={() =>
                            setDecisions((previous) => ({
                              ...previous,
                              [index]: "refused",
                            }))
                          }
                          className={`flex-1 rounded-lg px-3 py-2 text-xs font-black transition ${
                            decisions[index] === "refused"
                              ? "bg-red-400/20 text-red-300"
                              : "border border-white/10 text-gray-400 hover:bg-white/5"
                          }`}
                        >
                          {decisions[index] === "refused" ? "Refusée" : "Refuser"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-gray-500">
                  Aucune modification proposée pour le moment.
                </p>
              )}

              {conseil?.question && (
                <div className="mt-4 rounded-xl border border-lime-400/20 bg-lime-400/5 p-4">
                  <p className="text-sm font-bold text-lime-400">
                    {conseil.question}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Tu peux répondre directement dans la discussion.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
