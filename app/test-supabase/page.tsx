
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [message, setMessage] = useState("Vérification en cours...");
  const [activities, setActivities] = useState<number | null>(null);

  useEffect(() => {
    async function testConnection() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setMessage("❌ Aucun utilisateur connecté.");
        return;
      }

      const { count, error } = await supabase
        .from("activities")
        .select("id", { count: "exact", head: true });

      if (error) {
        setMessage("❌ Erreur Supabase : " + error.message);
        return;
      }

      setActivities(count ?? 0);
      setMessage("✅ Connexion Supabase réussie !");
    }

    testConnection();
  }, []);

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <h1 className="mb-6 text-3xl font-bold text-lime-400">
        Test Supabase
      </h1>

      <p className="text-lg">{message}</p>

      {activities !== null && (
        <p className="mt-4 text-gray-300">
          Nombre total d'activités dans Supabase : {activities}
        </p>
      )}
    </main>
  );
}
