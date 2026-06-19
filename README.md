# Icônes DSFR

Explorateur visuel des icônes du [Système de Design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/).
Recherchez, filtrez par catégorie/style, et copiez l'identifiant `fr-icon-*` (ou le nom, le HTML, le SVG) en un clic.

Pensé pour combler le manque de la [page officielle des icônes](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone),
peu pratique pour choisir une icône visuellement et récupérer son identifiant.

## Fonctionnalités

- Recherche instantanée (nom + mots-clés, tokens combinés)
- Filtre par catégorie (18) et par style (Ligne / Plein)
- Copie au format **classe `fr-icon-*`**, **nom**, **HTML `<span>`** ou **SVG inline**
- Thème clair/sombre (suit l'OS, mémorisé)
- État partageable dans l'URL (`#q=...&cat=...&v=...`)
- Raccourcis : `/` pour chercher, `Échap` pour effacer

## Architecture

Site **100 % statique, zéro dépendance runtime**. Le seul paquet (`@gouvfr/dsfr`,
en `devDependency`) sert de **source de vérité** : `build.mjs` scanne ses 1036 SVG,
en extrait l'identifiant et le markup, et génère `public/`.

```
build.mjs        scanne node_modules/@gouvfr/dsfr → public/
src/             index.html · style.css · app.js (sources éditables)
public/          sortie générée (gitignorée) — c'est ce qui est déployé
```

Les données sont émises en `icons-data.js` (et non un `.json` à `fetch`) pour que
`public/index.html` s'ouvre aussi **directement en local** (`file://`), sans serveur.

## Développement

```bash
npm install        # installe @gouvfr/dsfr
npm run build      # génère public/
npm run serve      # sert public/ sur http://localhost:3000
# ou simplement : ouvrir public/index.html dans un navigateur
```

## Mettre à jour les icônes

Quand une nouvelle version du DSFR sort :

```bash
npm install @gouvfr/dsfr@latest
npm run build
```

## Déploiement

Poussé sur `main`, le workflow `.github/workflows/deploy.yml` build et publie
`public/` sur **GitHub Pages** (activer Pages → source « GitHub Actions » dans les
réglages du dépôt).

Tous les chemins sont **relatifs**, donc le même build fonctionne aussi sur
**GitLab Pages** (artefact `public/`) ou n'importe quel hébergement statique, sans
configuration de base-path.
