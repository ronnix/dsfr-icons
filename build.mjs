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

// Libellés FR des catégories d'icônes.
const ICON_LABELS = {
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

// Libellés FR des sous-catégories de pictogrammes.
const PICTO_LABELS = {
  accessibility: "Accessibilité",
  buildings: "Bâtiments",
  digital: "Numérique",
  document: "Documents",
  environment: "Environnement",
  health: "Santé",
  institutions: "Institutions",
  leisure: "Loisirs",
  map: "Carte",
  system: "Système",
};

// Réduit le markup SVG pour l'inlining : on retire xmlns/width/height de la racine
// (taille et couleur pilotées en CSS) et on compacte les espaces.
function minifySvg(svg) {
  return svg
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/\s+xmlns(:xlink)?="[^"]*"/g, "")
    .replace(/\s+(width|height)="[^"]*"/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Les pictos réutilisent tous les mêmes id internes (artwork-decorative/minor/major)
// + des <use href="#…">. Inlinés ensemble dans la même page, ces id entreraient en
// collision (tous pointeraient vers le premier picto). On préfixe donc les id et les
// références par un slug unique au picto, ce qui garde chaque SVG autonome et valide.
function namespaceArtwork(svg, prefix) {
  return svg
    .replace(/id="artwork-/g, `id="${prefix}-artwork-`)
    .replace(/(xlink:)?href="#artwork-/g, (m, x) => `${x || ""}href="#${prefix}-artwork-`);
}

async function listSvgDirs(base) {
  return (await readdir(base, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

async function collectIcons() {
  const dir = join(DSFR, "dist", "icons");
  const categories = await listSvgDirs(dir);
  const icons = [];
  for (const c of categories) {
    const files = (await readdir(join(dir, c))).filter((f) => f.endsWith(".svg")).sort();
    for (const file of files) {
      const name = file.replace(/\.svg$/, "");
      // Le DSFR utilise les icônes comme masques (mask-image) : leur `fill` interne
      // n'est jamais rendu. Quelques icônes embarquent pourtant un fill="#000091" /
      // "black" qui, inliné tel quel, les afficherait en bleu/noir de façon
      // incohérente. On retire tous les `fill` → rendu uniforme en currentColor
      // (CSS), fidèle au DSFR et lisible en thème sombre. (0 icône n'a de stroke ni
      // de fill="none" sur un <path> : retrait sans effet de bord.)
      const svg = minifySvg(await readFile(join(dir, c, file), "utf8")).replace(
        /\s+fill="[^"]*"/g,
        "",
      );
      let v = "other";
      if (name.endsWith("-fill")) v = "fill";
      else if (name.endsWith("-line")) v = "line";
      icons.push({ n: name, c, v, s: svg });
    }
  }
  const cats = categories.map((c) => ({
    id: c,
    label: ICON_LABELS[c] || c,
    count: icons.filter((i) => i.c === c).length,
  }));
  return { count: icons.length, categories: cats, icons };
}

async function collectPictos() {
  const dir = join(DSFR, "dist", "artwork", "pictograms");
  const categories = await listSvgDirs(dir);
  const pictos = [];
  for (const c of categories) {
    const files = (await readdir(join(dir, c))).filter((f) => f.endsWith(".svg")).sort();
    for (const file of files) {
      const name = file.replace(/\.svg$/, "");
      const raw = await readFile(join(dir, c, file), "utf8");
      // Calques réellement présents (certains pictos n'ont pas les 3).
      const layers = [...raw.matchAll(/id="artwork-([a-z]+)"/g)].map((m) => m[1]);
      const prefix = `${c}-${name}`.replace(/[^a-z0-9-]/gi, "-");
      const svg = namespaceArtwork(minifySvg(raw), prefix);
      // n = "sous-catégorie/nom" : sert d'identifiant et de "nom de fichier".
      pictos.push({ n: `${c}/${name}`, c, l: layers, s: svg });
    }
  }
  const cats = categories.map((c) => ({
    id: c,
    label: PICTO_LABELS[c] || c,
    count: pictos.filter((p) => p.c === c).length,
  }));
  return { count: pictos.length, categories: cats, pictos };
}

async function emit(file, globalName, version, payload) {
  await writeFile(
    join(OUT, file),
    `// Généré par build.mjs depuis @gouvfr/dsfr@${version}. Ne pas éditer à la main.\n` +
      `window.${globalName}=${JSON.stringify({ version, ...payload })};\n`,
    "utf8",
  );
}

async function main() {
  const pkg = JSON.parse(await readFile(join(DSFR, "package.json"), "utf8"));
  const version = pkg.version;

  const icons = await collectIcons();
  const pictos = await collectPictos();

  if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "fonts"), { recursive: true });

  // Manifeste léger toujours chargé (compteurs d'onglets sans tirer les données).
  await emit("manifest.js", "DSFR_MANIFEST", version, {
    counts: { icons: icons.count, pictos: pictos.count },
  });
  await emit("icons-data.js", "DSFR_ICONS", version, icons);
  await emit("pictograms-data.js", "DSFR_PICTOS", version, pictos);

  for (const f of ["index.html", "style.css", "app.js"]) {
    await copyFile(join(SRC, f), join(OUT, f));
  }
  for (const f of FONTS) {
    await copyFile(join(DSFR, "dist", "fonts", f), join(OUT, "fonts", f));
  }

  console.log(
    `✓ ${icons.count} icônes (${icons.categories.length} cat.) + ` +
      `${pictos.count} pictogrammes (${pictos.categories.length} cat.) — DSFR ${version}\n` +
      `  → public/ prêt (icons-data.js, pictograms-data.js, index.html, style.css, app.js, fonts/)`,
  );
}

main().catch((err) => {
  console.error("✗ Build échoué :", err);
  process.exit(1);
});
