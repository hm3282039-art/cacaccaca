# 🐾 Pet Blocs 99

Un jeu web 3D de **casse de pièces et de collection de pets**, dans l'esprit des jeux de type
« pet simulator » : tu tapes des coffres, tu gagnes des pièces, tu éclos des œufs, tu remplis ton
inventaire de pets et tu repars en renaissance pour aller toujours plus loin.

> ⚠️ **Projet original, non officiel.** Pet Blocs 99 s'inspire d'un *genre* de jeu, pas d'un jeu
> précis. Aucun asset, modèle, nom de pet, code ou donnée d'un jeu existant n'est utilisé.
> Les personnages, pets et décors sont générés par le code (boîtes, cônes, sphères). Le jeu n'est
> ni affilié à Roblox Corporation, ni à BIG Games, ni à aucun éditeur.

![style](https://img.shields.io/badge/style-blocs%203D-ffd24a) ![three](https://img.shields.io/badge/three.js-r170-3ddcff) ![vite](https://img.shields.io/badge/vite-7-a78bfa)

---

## ▶️ Lancer le jeu

```bash
npm install
npm run dev        # http://localhost:3000
```

Build de production :

```bash
npm run build      # génère dist/
npm run preview    # sert le build
```

Le build utilise `base: './'`, donc il fonctionne aussi bien à la racine d'un domaine que dans un
sous-dossier (`https://utilisateur.github.io/mon-repo/`). Le workflow
`.github/workflows/static.yml` publie déjà `dist/` sur GitHub Pages à chaque push sur `main`.

---

## 🎮 Comment jouer

| Action | Effet |
| --- | --- |
| **Clic / tap sur un objet** | Ton personnage court jusqu'à l'objet et frappe (dégâts de clic) |
| **Glisser** | Faire tourner la caméra |
| **Molette / pincer** | Zoomer |
| **1 · 2 · 3 · 4** | Boutique · Pets · Améliorations · Renaissance |
| **Échap** | Fermer un panneau |

### Boucle de jeu

1. **Casse** les tas de pièces, coffres, coffres géants et coffres diamant. Chaque objet lâche des
   pièces (et parfois des gemmes 💎) puis réapparaît.
2. **Éclos** des œufs dans la boutique pour obtenir des pets, du plus commun au **secret**.
3. **Équipe** tes meilleurs pets : ils tapent automatiquement et infligent des dégâts continus.
4. **Améliore** : force de clic, puissance des pets, vitesse, emplacements, multiplicateur de pièces,
   clic automatique. Les gemmes et les diamants débloquent les bonus les plus forts.
5. **Débloque** les 6 zones (Prairie → Forêt → Plage → Volcan → Galaxie → Néon) : objets plus
   résistants, mais pièces beaucoup plus nombreuses.
6. **Renaissance** : à partir d'un certain seuil de pièces, repars de zéro avec un multiplicateur
   permanent et des diamants ✨. Tu gardes tes pets, gemmes, diamants et bonus permanents.

### Ce qu'il y a dedans

- **27 pets** répartis sur 7 raretés (commun → secret), avec 20 familles de modèles 3D procéduraux.
- **6 œufs** avec tables de butin pondérées et probabilités affichées dans la boutique.
- **6 zones** décorées différemment (arbres, palmiers, lave, cristaux, blocs néon, étoiles).
- **Avatar personnalisable** (6 palettes) + les pets équipés qui suivent et attaquent.
- **Progression sauvegardée** automatiquement dans le navigateur (`localStorage`) + gains hors-ligne.
- **Interface responsive** (mobile / tablette / desktop), mode léger pour désactiver les ombres.
- Petits sons générés à la volée (WebAudio), désactivables.

---

## 🗂️ Structure

```
index.html                 écran de jeu (HUD, panneaux, overlay d'éclosion)
src/ps99/
  main.js                  contrôleur : boucle, dégâts, récompenses, sons, sauvegarde
  world3d.js               scène three.js : caméra, zones, objets à casser, avatar, pets
  models.js                génération des modèles « blocs » (avatar, pets, décor)
  data.js                  pets, raretés, œufs, zones, objets, améliorations, formatage
  state.js                 état du jeu, dérivés (DPS, multiplicateurs), sauvegarde
  ui.js                    HUD, boutiques, inventaire, panneaux, éclosions
  style.css                interface (thème sombre + boutons « bloc »)
tests/
  logic.test.mjs           tables de butin, sauvegarde, économie, doublons…
  world.test.mjs           monde 3D sans WebGL (renderer injecté) : zones, raycast, respawn
  ui.test.mjs              interface dans jsdom : panneaux, HUD, éclosion
```

### Tests

```bash
npm test
```

Les tests tournent sans navigateur : `jsdom` pour le DOM et un faux renderer injecté dans
`World` pour valider la scène 3D, les collisions de clic et la boucle de jeu.

---

## 🛠️ Notes techniques

- **three.js** (WebGL) pour le rendu ; tous les modèles sont construits à partir de primitives,
  aucune texture externe n'est chargée.
- Les géométries et matériaux sont **mutualisés** (cache) pour limiter les allocations ; les pets et
  les objets réutilisent les mêmes boîtes.
- La caméra suit le joueur et glisse vers la cible ; les clics passent par un **raycast** sur des
  boîtes de collision invisibles (faciles à viser au doigt).
- Les dégâts sont de deux natures : **clics** (instantanés, avec coups critiques) et **DPS des pets**
  (appliqué en continu quand le personnage est à portée).
- Sauvegarde : un seul objet JSON versionné dans `localStorage`, écrit toutes les 6 s et à la
  fermeture de l'onglet.

### Ancien prototype

Le dépôt contenait auparavant un petit RPG idle (`src/main.ts`, `src/scripts/`, `src/styles/`).
Ces fichiers ne sont plus chargés par `index.html` et peuvent être supprimés sans risque si tu
veux garder le dépôt propre.

---

## 📄 Licence

Code sous licence ISC (voir `package.json`). Les noms « Pet Blocs 99 » et les visuels générés
appartiennent à leurs auteurs. Projet de démonstration, sans monétisation.
