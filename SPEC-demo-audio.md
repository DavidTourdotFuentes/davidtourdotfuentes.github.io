# Spec : page de démos audio interactives (FMOD) pour le portfolio

> Document destiné à Claude Code. Lis-le en entier avant de commencer, puis inspecte le dépôt existant avant d'écrire du code.

## 1. Contexte et objectif

Le dépôt contient un **site portfolio hébergé sur GitHub Pages**. On veut ajouter une **page séparée** qui présente des intégrations audio de jeu en **FMOD Studio**, jouables directement dans le navigateur : events déclenchables, paramètres en temps réel, musique adaptative.

Priorité absolue : **le reste du site ne doit rien perdre en légèreté**. Le moteur audio (WebAssembly) et les banks ne sont chargés **que sur la page de démo, et seulement quand l'utilisateur lance une démo**.

## 2. Contraintes d'hébergement (GitHub Pages)

- 100 % statique : pas de serveur, pas de backend, pas de fonctions serverless.
- **Impossible de définir des en-têtes HTTP personnalisés** (pas de COOP/COEP, pas de Cache-Control sur mesure). Donc :
  - utiliser le build FMOD **WebAssembly sans threads** (sans SharedArrayBuffer) ;
  - ne rien construire qui dépende de `crossOriginIsolated`.
- Le site peut être servi sous un sous-chemin (`https://user.github.io/nom-du-repo/`). **Tous les chemins doivent être relatifs** (pas de `/` en début de chemin).
- Si le site utilise Jekyll : **ne pas ajouter de `.nojekyll`** (ça casserait le site existant). Ne pas nommer de dossier ou de fichier avec un `_` initial dans la partie démo, car Jekyll les ignore.
- Limites : fichiers < 100 Mo, dépôt idéalement < 1 Go. Garder des banks petites.

## 3. Étape 0 : inspecter l'existant (obligatoire)

Avant toute écriture :
1. Identifier la stack du site : HTML statique, Jekyll, Astro, Hugo, etc. Repérer aussi s'il y a un workflow GitHub Actions dans `.github/workflows/`.
2. Repérer le layout, la navigation, les feuilles de style et les polices déjà utilisées.
3. Me résumer la stack trouvée et le plan d'intégration en 5 lignes max, puis continuer.

Règles d'intégration :
- **Ne modifier aucune page existante**, sauf pour ajouter un lien « Démos audio » dans la navigation.
- Réutiliser les couleurs et la typographie du site (variables CSS existantes si elles existent), sans importer le CSS global s'il est lourd.
- Si le site a une étape de build (Jekyll, Astro…), intégrer la page de la façon la plus native possible, mais **garder le JS de démo en vanilla ES modules**, sans dépendance npm.

## 4. Choix techniques

| Sujet | Choix |
|---|---|
| Moteur audio | FMOD Studio API, build HTML5 **WASM** (`fmodstudio.js` + `fmodstudio.wasm`) |
| JS | Vanilla ES modules, aucun framework, aucun bundler requis |
| Visuel optionnel | Canvas 2D natif. Pas de Three.js/PixiJS sauf demande explicite |
| Données des démos | Un manifeste `demos.json` (piloté par les données) |
| Tests locaux | `python3 -m http.server` à la racine du site |

Pourquoi FMOD et pas Wwise : FMOD a un support HTML5/WASM officiel et mature. La plateforme Web de Wwise reste expérimentale.

## 5. Arborescence cible

À adapter au chemin réel du site (par exemple `docs/` si Pages sert depuis `docs/`) :

```
audio-demos/
├── index.html            # la page de démos (autonome)
├── demos.json            # manifeste des démos
├── css/
│   └── demos.css
├── js/
│   ├── main.js           # point d'entrée : lit le manifeste, construit l'UI
│   ├── fmod-engine.js    # wrapper FMOD (chargement paresseux, cycle de vie)
│   ├── ui.js             # génération des cartes et contrôles
│   └── visibility.js     # pause/reprise (IntersectionObserver, onglet caché)
├── lib/
│   └── fmod/             # fichiers du SDK, copiés à la main par moi
│       ├── fmodstudio.js
│       └── fmodstudio.wasm
└── banks/
    ├── Master.bank
    ├── Master.strings.bank
    └── <demo-id>.bank    # une bank par démo
```

`lib/fmod/` et `banks/` seront fournis par moi. Crée les dossiers avec un `README.md` court qui indique quels fichiers y placer (et d'où viennent ceux du SDK : `api/studio/lib/wasm/`).

## 6. Le manifeste `demos.json`

L'UI est générée entièrement à partir de ce fichier. Ajouter une démo = ajouter une bank + une entrée JSON, sans toucher au JS.

```json
{
  "sharedBanks": ["Master.bank", "Master.strings.bank"],
  "demos": [
    {
      "id": "footsteps",
      "title": "Pas adaptatifs",
      "description": "Changement de surface et de vitesse en temps réel.",
      "banks": ["footsteps.bank"],
      "events": [
        {
          "path": "event:/Player/Footsteps",
          "label": "Marcher",
          "mode": "loop",
          "parameters": [
            { "name": "Surface", "type": "labeled", "labels": ["Herbe", "Pierre", "Bois"] },
            { "name": "Speed", "type": "continuous", "min": 0, "max": 1, "step": 0.01, "default": 0.5 }
          ]
        }
      ]
    }
  ]
}
```

- `mode` : `"oneshot"` (bouton qui déclenche) ou `"loop"` (bouton bascule start/stop).
- `parameters[].type` : `"continuous"` (slider) ou `"labeled"` (boutons segmentés, valeur = index du label).
- Paramètres **globaux** possibles : champ `"global": true`, appliqués via `studio.setParameterByName`.
- Valide le manifeste au chargement et affiche une erreur lisible s'il est mal formé.
- Crée **une démo d'exemple** dans le manifeste (placeholder) pour que la page s'affiche même sans banks. Les boutons affichent alors « Bank manquante ».

## 7. Wrapper FMOD (`fmod-engine.js`)

Base-toi sur **les exemples HTML5 fournis dans le SDK FMOD** (`api/studio/examples/js/`) pour les signatures exactes. Le binding JS utilise des objets « out » (`{}` puis `.val`) et des fonctions préfixées par `FMOD.`. Vérifie chaque appel contre ces exemples plutôt que de deviner.

API publique attendue :

```js
await engine.init()                  // charge fmodstudio.js + wasm, crée et initialise le Studio System, charge les sharedBanks
await engine.loadBanks(['x.bank'])   // fetch + loadBankMemory, idempotent (cache des banks chargées)
engine.unloadBanks(['x.bank'])
const inst = engine.play(eventPath)  // createInstance + start ; renvoie un handle
engine.stop(inst, { fade: true })
engine.setParam(inst, name, value)
engine.setGlobalParam(name, value)
engine.suspend() / engine.resume()   // mixerSuspend / mixerResume du core system
engine.isReady
```

Exigences :
- **Chargement paresseux** : `fmodstudio.js` est injecté (balise `<script>` créée dynamiquement) **uniquement au premier clic** sur « Activer l'audio » ou sur « Lancer ». Rien d'audio ne se charge au chargement de la page.
- **Déverrouillage audio** : init + `mixerResume()` dans le handler du geste utilisateur (exigence Chrome et Safari iOS).
- **Banks par démo** : chargées au lancement de la démo via `fetch` puis `loadBankMemory`. Si ce binding pose problème, repli sur `FS_createPreloadedFile` comme dans les exemples du SDK. Les shared banks sont chargées une seule fois.
- **Boucle de mise à jour** : `studio.update()` dans `requestAnimationFrame`, **active seulement si au moins une instance joue**. Arrêtée sinon.
- Buffer DSP assez large pour éviter les craquements (ex. `setDSPBufferSize(2048, 2)` avant `initialize`, à ajuster).
- Gérer et afficher proprement chaque code d'erreur FMOD (≠ `FMOD.OK`), avec un message utilisateur et le détail dans `console`.

## 8. Fluidité et cycle de vie

- `visibility.js` :
  - **onglet caché** (`visibilitychange`) → `engine.suspend()` ; retour → `resume()` ;
  - **carte de démo hors écran** (IntersectionObserver) → stopper ses instances en boucle.
- Quitter la page (`pagehide`) → stop de toutes les instances et release du système.
- Aucun travail continu sur le thread principal quand rien ne joue.
- Les sliders envoient leurs valeurs au plus une fois par frame (throttle via rAF).

## 9. UI / UX

- En haut : intro courte + bouton **« Activer l'audio »** avec indicateur d'état (inactif / chargement avec progression / prêt / erreur).
- Une **carte par démo** : titre, description, boutons d'events, contrôles des paramètres, éventuellement un petit visuel Canvas (vumètre ou valeur du paramètre).
- Bouton global **« Tout arrêter »** et **slider de volume master** (bus `bus:/`).
- Accessibilité : vrais `<button>` et `<input type="range">`, labels associés, navigation clavier complète, `aria-pressed` sur les toggles, `aria-live` pour l'état de chargement, contraste suffisant.
- Responsive : utilisable au doigt sur mobile (cibles ≥ 44 px).
- Message si le navigateur ne supporte pas WebAssembly.

## 10. Budgets de performance

| Élément | Budget |
|---|---|
| Page démo avant clic (HTML + CSS + JS) | < 50 Ko, zéro requête vers `lib/fmod/` ou `banks/` |
| Autres pages du site | **inchangées** (aucun script ajouté) |
| Bank par démo | viser < 3 Mo (Vorbis, musique en streaming) |
| Lighthouse (page démo, avant clic) | Performance ≥ 95 |

## 11. Critères d'acceptation

- [ ] Les pages existantes sont identiques, à part le lien de navigation.
- [ ] La page de démo s'affiche correctement **sans** les fichiers FMOD ni les banks (état « fichiers manquants » clair, pas d'exception non gérée).
- [ ] Avec le SDK et les banks : l'audio démarre au premier clic sur Chrome, Firefox et Safari (desktop et iOS).
- [ ] Le panneau Réseau ne montre aucune requête `.wasm` ou `.bank` avant le clic.
- [ ] Les paramètres répondent en temps réel, sans craquements audibles.
- [ ] Changer d'onglet coupe l'audio, revenir le reprend.
- [ ] Ça fonctionne sous un sous-chemin GitHub Pages (tester avec `python3 -m http.server` lancé depuis le dossier parent).
- [ ] Ajouter une démo ne demande qu'une bank et une entrée dans `demos.json`.

## 12. Hors périmètre

- Wwise (éventuellement plus tard, comme vidéo ou capture du profiler).
- Live Update FMOD, non supporté en HTML5.
- Tout backend, analytics ou cookie.

## 13. Livrables et déroulé

1. Résumé de l'existant et plan (étape 0).
2. Squelette : page + CSS + manifeste placeholder, sans FMOD → je valide l'affichage.
3. Wrapper FMOD + UI dynamique.
4. Cycle de vie et optimisations.
5. Un `audio-demos/README.md` qui explique comment exporter les banks depuis FMOD Studio (plateforme de build adaptée au web, une bank par démo, Master + Master.strings) et comment ajouter une démo.

Fais des commits atomiques à chaque étape, avec des messages clairs.
