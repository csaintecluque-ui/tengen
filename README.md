# Tengen

Appli web (PWA) pour apprendre le go de zéro et jouer, en français, installable sur iPhone et utilisable hors ligne.

**En ligne :** https://csaintecluque-ui.github.io/tengen/

## Ce qu'elle contient

- **Parcours** : 7 modules (règles, tactique, vie et mort, formes, ouverture, milieu de partie, fin de partie) et plus de 30 leçons interactives.
- **Problèmes** : tsumego vérifiés par un solveur exact (réfutation des mauvais coups, suite principale), révisions espacées.
- **Jouer** : 9×9, 13×13, 19×19, handicap ; cinq niveaux, du moteur « maison » (Monte-Carlo) à **KataGo** embarqué.
- **Analyse** : courbe des chances de gain, erreurs repérées, meilleurs coups, export et import SGF.
- **Claude** (facultatif) : professeur et adversaire, avec ta propre clé API, conservée uniquement sur l'appareil.
- **Bibliothèque** : histoire, étiquette, rangs, glossaire franco-japonais, proverbes.

## Installer sur iPhone

Ouvre le lien dans Safari, touche **Partager**, puis **Sur l'écran d'accueil**.

## Développement

```bash
npm install
npm run dev        # serveur local
npm run build      # build de production dans dist/
npm run trees      # recalcule les solutions des problèmes (solveur exact)
npx vite-node scripts/check-content.ts   # vérifie tout le contenu
```

Chaque `push` sur `main` reconstruit l'appli et la publie sur la branche `gh-pages` (GitHub Actions).

## Moteur

- `public/models/kata-b15c192.onnx` : réseau **KataGo** g170 (15 blocs, 192 canaux) converti en ONNX (poids en float16). KataGo est un projet libre de David J. Wu, sous licence MIT : https://github.com/lightvector/KataGo
- Les entrées du réseau (`src/katago/features.ts`) sont un port du code C++ de KataGo ; elles ont été validées contre KataGo lui-même sur des positions aléatoires.
- Exécution dans le navigateur avec ONNX Runtime Web (WebAssembly), dans un Web Worker.

## Clé API Claude

La clé saisie dans Réglages est stockée dans le `localStorage` de l'appareil et n'est envoyée qu'à `api.anthropic.com`. Elle n'apparaît jamais dans ce dépôt.

---
Sceau Anamnesis · CSC
