// Fonction serveur (Vercel) : relaie les demandes du site vers TMDB en ajoutant la clé secrète.
// La clé est lue dans une "variable d'environnement" nommée TMDB_KEY (réglée dans Vercel, jamais dans le code).

const AUTORISES = [
  /^\/discover\/movie$/,
  /^\/genre\/movie\/list$/,
  /^\/watch\/providers\/movie$/,
  /^\/movie\/\d+$/,
  /^\/search\/movie$/,
];

module.exports = async function handler(req, res) {
  const cle = process.env.TMDB_KEY;
  if (!cle) {
    return res.status(500).json({ error: "La variable TMDB_KEY n'est pas configurée." });
  }

  const chemin = String(req.query.chemin || "");
  // Sécurité : on n'accepte que les quelques adresses TMDB dont le site a besoin
  if (!AUTORISES.some((motif) => motif.test(chemin))) {
    return res.status(400).json({ error: "Chemin non autorisé." });
  }

  const url = new URL("https://api.themoviedb.org/3" + chemin);
  for (const [nom, valeur] of Object.entries(req.query)) {
    if (nom !== "chemin") url.searchParams.set(nom, String(valeur));
  }

  // Deux types de clés existent : la courte (api_key) et le long jeton (Bearer)
  const entetes = {};
  if (cle.length > 40) entetes.Authorization = "Bearer " + cle;
  else url.searchParams.set("api_key", cle);

  try {
    const reponse = await fetch(url, { headers: entetes });
    const donnees = await reponse.json();
    // Les listes (genres, plateformes) changent rarement : on les garde en cache une heure
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(reponse.status).json(donnees);
  } catch (e) {
    return res.status(502).json({ error: "TMDB injoignable." });
  }
};
