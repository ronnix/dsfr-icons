# Icônes & pictogrammes DSFR

Explorateur visuel des **icônes** et **pictogrammes** du [Système de Design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/).
Recherchez, filtrez, et copiez l'identifiant `fr-icon-*` (ou le nom, le HTML, le SVG) en un clic.

Pensé pour combler le manque des pages officielles
([icônes](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/icone),
[pictogrammes](https://www.systeme-de-design.gouv.fr/version-courante/fr/fondamentaux/pictogramme)),
peu pratiques pour choisir un visuel et récupérer son identifiant.

## Fonctionnalités

- Deux onglets : **1036 icônes** et **102 pictogrammes**
- Recherche instantanée (nom + mots-clés, tokens combinés)
- Filtre par catégorie (18 / 10) et, pour les icônes, par style (Ligne / Plein)
- Copie adaptée à chaque type :
  - icônes → **classe `fr-icon-*`**, **nom**, **HTML `<span>`** ou **SVG inline**
  - pictogrammes → **SVG inline**, **nom de fichier** ou **markup DSFR `<use>`**
- Rendu fidèle : icônes monochromes (comme l'usage `mask-image` du DSFR),
  pictogrammes multicolores avec adaptation au thème sombre
- Thème clair/sombre (suit l'OS, mémorisé)
- État partageable dans l'URL (`#t=...&q=...&cat=...&v=...`)
- Raccourcis : `/` pour chercher, `Échap` pour effacer

## Architecture

Site **100 % statique, zéro dépendance runtime**. Le seul paquet (`@gouvfr/dsfr`,
en `devDependency`) sert de **source de vérité** : `build.mjs` scanne ses SVG
(icônes + pictogrammes), en extrait identifiants et markup, et génère `public/`.

```
build.mjs        scanne node_modules/@gouvfr/dsfr → public/
src/             index.html · style.css · app.js (sources éditables)
public/          sortie générée (gitignorée) — c'est ce qui est déployé
  manifest.js          compteurs (toujours chargé)
  icons-data.js        1036 icônes (chargé d'emblée)
  pictograms-data.js   102 pictogrammes (chargé à la demande, à l'ouverture de l'onglet)
```

Les données sont émises en `*.js` (et non un `.json` à `fetch`) pour que
`public/index.html` s'ouvre aussi **directement en local** (`file://`), sans serveur.

Deux traitements au build : les `fill` des icônes sont retirés (rendu monochrome
uniforme en `currentColor`) ; les IDs internes des pictogrammes
(`artwork-decorative/minor/major`) sont préfixés par picto pour éviter toute
collision quand ils sont inlinés ensemble dans la même page.

## Développement

```bash
npm install        # installe @gouvfr/dsfr
npm run build      # génère public/
npm run serve      # sert public/ sur http://localhost:3000
# ou simplement : ouvrir public/index.html dans un navigateur
```

## Mettre à jour les icônes & pictogrammes

**Automatique.** Dependabot (`.github/dependabot.yml`) ouvre une PR dès qu'une
nouvelle version de `@gouvfr/dsfr` sort. Le workflow
`.github/workflows/dependabot-auto-merge.yml` la prend en charge : il **build**
(garde-fou), **déploie** la nouvelle version sur Pages, puis **merge** la PR — sans
intervention. Exception : une montée de version **majeure** n'est pas auto-mergée
(la PR reste ouverte pour revue, car le DSFR peut introduire des changements
cassants).

**Manuellement** (test local, ou pour forcer une mise à jour) :

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
