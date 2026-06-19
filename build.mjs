// Build script : scanne le package @gouvfr/dsfr, génère le site statique dans public/.
// Aucune dépendance runtime — uniquement les modules Node natifs.
import { readFile, writeFile, readdir, mkdir, copyFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DSFR = join(ROOT, "node_modules", "@gouvfr", "dsfr");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "public");

// Polices Marianne embarquées (la graisse Regular/Medium/Bold suffit pour l'UI).
const FONTS = [
  "Marianne-Regular.woff2",
  "Marianne-Medium.woff2",
  "Marianne-Bold.woff2",
];

// Libellés FR des catégories pour l'affichage des filtres.
const CATEGORY_LABELS = {
  arrows: "Flèches",
  buildings: "Bâtiments",
  business: "Business",
  communication: "Communication",
  design: "Design",
  development: "Développement",
  device: "Appareils",
  document: "Documents",
  editor: "Éditeur",
  finance: "Finance",
  health: "Santé",
  logo: "Logos",
  map: "Carte",
  media: "Média",
  others: "Autres",
  system: "Système",
  user: "Utilisateur",
  weather: "Météo",
};

// Réduit le markup SVG pour l'inlining : on retire xmlns/width/height de la racine
// (la taille et la couleur sont pilotées en CSS) et on compacte les espaces.
// On NE touche PAS aux attributs `fill` des <path> : certains logos (ex. drapeaux,
// #000091) ont des couleurs propres qu'il faut préserver. `fill: currentColor` sera
// appliqué uniquement sur l'élément <svg> en CSS (héritage), sans écraser ces fills.
function minifySvg(svg) {
  return svg
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/\s+xmlns="[^"]*"/g, "")
    .replace(/\s+(width|height)="[^"]*"/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function main() {
  const pkg = JSON.parse(await readFile(join(DSFR, "package.json"), "utf8"));
  const version = pkg.version;
  const iconsDir = join(DSFR, "dist", "icons");
  const categories = (await readdir(iconsDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const icons = [];
  for (const category of categories) {
    const files = (await readdir(join(iconsDir, category)))
      .filter((f) => f.endsWith(".svg"))
      .sort();
    for (const file of files) {
      const name = file.replace(/\.svg$/, "");
      const raw = await readFile(join(iconsDir, category, file), "utf8");
      const svg = minifySvg(raw);
      // variante : -fill / -line / autre (utile pour le filtre style).
      let variant = "other";
      if (name.endsWith("-fill")) variant = "fill";
      else if (name.endsWith("-line")) variant = "line";
      icons.push({ n: name, c: category, v: variant, s: svg });
    }
  }

  const catMeta = categories.map((c) => ({
    id: c,
    label: CATEGORY_LABELS[c] || c,
    count: icons.filter((i) => i.c === c).length,
  }));

  // Sortie
  if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(join(OUT, "fonts"), { recursive: true });

  const data = { version, count: icons.length, categories: catMeta, icons };
  await writeFile(
    join(OUT, "icons-data.js"),
    `// Généré par build.mjs depuis @gouvfr/dsfr@${version}. Ne pas éditer à la main.\n` +
      `window.DSFR_ICONS=${JSON.stringify(data)};\n`,
    "utf8",
  );

  for (const f of ["index.html", "style.css", "app.js"]) {
    await copyFile(join(SRC, f), join(OUT, f));
  }
  for (const f of FONTS) {
    await copyFile(join(DSFR, "dist", "fonts", f), join(OUT, "fonts", f));
  }

  console.log(
    `✓ ${icons.length} icônes (${categories.length} catégories) — DSFR ${version}\n` +
      `  → public/ prêt (icons-data.js, index.html, style.css, app.js, fonts/)`,
  );
}

main().catch((err) => {
  console.error("✗ Build échoué :", err);
  process.exit(1);
});
