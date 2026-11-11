
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { readFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { decryptGoogleToken } from "@/lib/google-encryption";

const PROGRAM_ID = "10km-fevrier-2027";
const FIRST_MONDAY = Date.UTC(2026, 10, 2);
const TIME_ZONE = "Europe/Paris";

const DAYS: Record<string, number> = {
  Lundi: 0,
  Mardi: 1,
  Mercredi: 2,
  Jeudi: 3,
  Vendredi: 4,
  Samedi: 5,
  Dimanche: 6,
};

type Session = {
  jour: string;
  type: string;
  description: string;
  recuperation?: string;
  allure?: string;
};

type Week = {
  numero: number;
  objectif: string;
  seances: Session[];
};

type Program = {
  id: string;
  nom: string;
  date_course: string;
  semaines: Week[];
};

function getDate(weekNumber: number, day: string): string {
  const dayOffset = DAYS[day];

  if (dayOffset === undefined) {
    throw new Error(`Jour inconnu : ${day}`);
  }

  const date = new Date(
    FIRST_MONDAY +
      ((weekNumber - 1) * 7 + dayOffset) * 86400000
  );

  return date.toISOString().slice(0, 10);
}

function getEndTime(startHour: number, duration: number): string {
  const totalMinutes = startHour * 60 + duration;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Tu dois être connecté à Mon Coach Running." },
        { status: 401 }
      );
    }

    // Récupération des jetons Google chiffrés
    const { data: tokenRow, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select(
        "access_token_encrypted, refresh_token_encrypted, expiry_date"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError || !tokenRow?.refresh_token_encrypted) {
      return NextResponse.json(
        { error: "Aucune connexion Google Agenda valide." },
        { status: 400 }
      );
    }

    // Configuration de Google
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Identifiants Google manquants.");
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "http://localhost:3000/api/google/callback"
    );

    oauth2Client.setCredentials({
      access_token: tokenRow.access_token_encrypted
        ? decryptGoogleToken(tokenRow.access_token_encrypted)
        : undefined,
      refresh_token: decryptGoogleToken(
        tokenRow.refresh_token_encrypted
      ),
      expiry_date: tokenRow.expiry_date
        ? Number(tokenRow.expiry_date)
        : undefined,
    });

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    // Lecture du programme d'entraînement
    const filePath = join(
      process.cwd(),
      "public",
      "programmes",
      `${PROGRAM_ID}.json`
    );

    const fileContent = await readFile(filePath, "utf8");
    const program = JSON.parse(fileContent) as Program;

    // Séances déjà envoyées à Google
    const { data: existingEvents, error: eventsError } = await supabase
      .from("google_calendar_events")
      .select("session_key, google_event_id, event_hash")
      .eq("user_id", user.id)
      .eq("program_id", PROGRAM_ID);

    if (eventsError) {
      throw eventsError;
    }

    const existingMap = new Map(
  (existingEvents || []).map((event) => [
    event.session_key,
    {
      googleEventId: event.google_event_id,
      eventHash: event.event_hash,
    },
  ])
);

  let created = 0;
  let updated = 0;
  let deleted = 0;

const currentSessionKeys = new Set<string>();

for (const week of program.semaines) {
  for (const session of week.seances) {

    const date = getDate(week.numero, session.jour);
    const hour =
      session.jour === "Samedi" ||
      session.jour === "Dimanche"
        ? 9
        : 17;

    const duration =
      session.type === "Repos"
        ? 30
        : session.jour === "Samedi" ||
            session.jour === "Dimanche"
          ? 90
          : 60;

        const sessionKey = `semaine-${week.numero}-${session.jour}`;
        currentSessionKeys.add(sessionKey);

        const startTime = `${String(hour).padStart(2, "0")}:00:00`;
        const endTime = getEndTime(hour, duration);

        const description = [
          `Programme : ${program.nom}`,
          `Semaine ${week.numero} : ${week.objectif}`,
          `Type : ${session.type}`,
          `Séance : ${session.description}`,
          session.recuperation
            ? `Récupération : ${session.recuperation}`
            : "",
          session.allure ? `Allure : ${session.allure}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const event = {
          summary: `Mon Coach Running - ${session.type}`,
          description,
          start: {
            dateTime: `${date}T${startTime}`,
            timeZone: TIME_ZONE,
          },
          end: {
            dateTime: `${date}T${endTime}`,
            timeZone: TIME_ZONE,
          },
        };

        const existingRecord = existingMap.get(sessionKey);

const eventHash = createHash("sha256")
  .update(JSON.stringify(event))
  .digest("hex");

let googleEventId: string;

if (existingRecord) {
  if (existingRecord.eventHash === eventHash) {
    // Séance inchangée : aucune requête Google
    googleEventId = existingRecord.googleEventId;
  } else {
    try {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const result = await calendar.events.update({
    calendarId: "primary",
    eventId: existingRecord.googleEventId,
    requestBody: event,
  });

      if (!result.data.id) {
        throw new Error("Identifiant Google manquant.");
      }

      googleEventId = result.data.id;
      updated++;

    } catch (error: any) {
      if (error?.code === 404) {
         await new Promise((resolve) => setTimeout(resolve, 1000));
        const result = await calendar.events.insert({
                  calendarId: "primary",
          requestBody: event,
        });

        if (!result.data.id) {
          throw new Error("Identifiant Google manquant.");
        }

        googleEventId = result.data.id;
        created++;
      } else {
        throw error;
      }
    }
  }
} else {
  await new Promise((resolve) => setTimeout(resolve, 1000));

const result = await calendar.events.update({
  calendarId: "primary",
  eventId: existingRecord.googleEventId,
  requestBody: event,
});

  if (!result.data.id) {
    throw new Error("Identifiant Google manquant.");
  }

  googleEventId = result.data.id;
  created++;
}

        // Mémorisation de l'événement pour éviter les doublons
        const { error: saveError } = await supabase
          .from("google_calendar_events")
          .upsert(
            {
              user_id: user.id,
              program_id: PROGRAM_ID,
              session_key: sessionKey,
              google_event_id: googleEventId,
              event_hash: eventHash,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,program_id,session_key",
            }
          );

        if (saveError) {
          throw saveError;
        }
      }
    }

    // Suppression des séances qui ne sont plus dans le programme
    for (const oldEvent of existingEvents || []) {
      if (!currentSessionKeys.has(oldEvent.session_key)) {
        try {
          await calendar.events.delete({
            calendarId: "primary",
            eventId: oldEvent.google_event_id,
          });
        } catch (error: any) {
          // Si l'événement n'existe déjà plus dans Google, on continue
          if (error?.code !== 404) {
            throw error;
          }
        }

        const { error: deleteError } = await supabase
          .from("google_calendar_events")
          .delete()
          .eq("user_id", user.id)
          .eq("program_id", PROGRAM_ID)
          .eq("session_key", oldEvent.session_key);

        if (deleteError) {
          throw deleteError;
        }

        deleted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Synchronisation Google Agenda terminée.",
      created,
      updated,
      deleted,
      total: created + updated,
    });
  } catch (error) {
    console.error("Erreur synchronisation Google :", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant la synchronisation.",
      },
      { status: 500 }
    );
  }
}
