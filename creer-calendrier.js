
const fs = require("fs");

const chemin = "public/programmes/10km-fevrier-2027.json";
const programme = JSON.parse(fs.readFileSync(chemin, "utf8"));

const jours = {
  Mardi: { decalage: 1, heure: 16, duree: 60 },
  Mercredi: { decalage: 2, heure: 16, duree: 60 },
  Jeudi: { decalage: 3, heure: 16, duree: 60 },
  Samedi: { decalage: 5, heure: 8, duree: 60 },
  Dimanche: { decalage: 6, heure: 8, duree: 90 }
};

function dateUTC(lundi, decalage, heure, duree) {
  const debut = new Date(Date.UTC(
    lundi.getUTCFullYear(),
    lundi.getUTCMonth(),
    lundi.getUTCDate() + decalage,
    heure
  ));

  const fin = new Date(debut.getTime() + duree * 60000);
  return { debut, fin };
}

function formatDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function echapper(texte) {
  return String(texte || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

const lignes = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Mon Coach Running//Programme 10 km//FR",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  "X-WR-CALNAME:Mon Coach Running - Objectif 40 min",
  "X-WR-TIMEZONE:Europe/Paris"
];

const lundiDepart = new Date(Date.UTC(2026, 10, 2));

programme.semaines.forEach((semaine) => {
  const lundi = new Date(lundiDepart);
  lundi.setUTCDate(lundi.getUTCDate() + (semaine.numero - 1) * 7);

  semaine.seances.forEach((seance) => {
    const horaire = jours[seance.jour];
    if (!horaire) return;

    const { debut, fin } = dateUTC(
      lundi,
      horaire.decalage,
      horaire.heure,
      horaire.duree
    );

    const description = [
      semaine.objectif,
      seance.description,
      seance.recuperation
        ? "Récupération : " + seance.recuperation
        : "",
      "Programme : " + programme.nom
    ].filter(Boolean).join("\n");

    lignes.push(
      "BEGIN:VEVENT",
      "UID:semaine-" + semaine.numero + "-" +
        seance.jour.toLowerCase() + "@moncoachrunning",
      "DTSTAMP:" + formatDate(new Date()),
      "DTSTART:" + formatDate(debut),
      "DTEND:" + formatDate(fin),
      "SUMMARY:" + echapper(
        "Running - S" + semaine.numero + " - " + seance.type
      ),
      "DESCRIPTION:" + echapper(description),
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Rappel entraînement running",
      "END:VALARM",
      "END:VEVENT"
    );
  });
});

lignes.push("END:VCALENDAR");

fs.writeFileSync(
  "programme-10km-fevrier-2027.ics",
  lignes.join("\r\n") + "\r\n",
  "utf8"
);

console.log("Calendrier créé avec succès !");
console.log("Fichier : programme-10km-fevrier-2027.ics");
