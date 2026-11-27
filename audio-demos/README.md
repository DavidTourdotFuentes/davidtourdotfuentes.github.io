# Laboratoire audio (FMOD)

Page statique autonome : une suite d'expériences. L'interface est générée depuis `demos.json` ; rien d'audio n'est chargé avant le premier clic.

## Versions

Runtime FMOD HTML5 **2.03.15**. Exporter les banks avec FMOD Studio **2.03.x** : le runtime refuse les banks d'une version plus récente que lui.
Pour changer de version majeure, remplacer le runtime, réexporter toutes les banks et revérifier `unlock()` dans `js/fmod-engine.js`.

## Exporter les banks

1. Dans FMOD Studio, *Edit > Preferences > Build* : choisir `audio-demos/banks` comme dossier de sortie. Les banks doivent se trouver directement dans ce dossier.
2. Encodage de la plateforme : **Vorbis**. Garder les musiques en streaming.
3. Créer une bank par démo, y assigner ses events, et ne laisser dans `Master` que ce qui est commun.
4. *File > Build*. `Master.bank` et `Master.strings.bank` sont toujours nécessaires.

Viser moins de 3 Mo par bank : elle est téléchargée en entier au lancement.

## Ajouter une expérience

1. Exporter la bank dans `banks/`.
2. Ajouter une entrée dans `demos.json`. Les chemins de banks sont relatifs à `banks/`.
3. Écrire ses textes dans `../translations.csv`, en anglais et en français : dans `demos.json`, `name`, `title`, `description`, `steps[].text`, `observation`, les `label`, `labels` et `ends` sont des **clés** de ce fichier (préfixe `lab_`). `project` reste un nom propre, écrit tel quel. Une clé absente du fichier s'affiche telle quelle.

L'exemple ci-dessous garde des textes lisibles pour la clarté ; en vrai, chacun est une clé (`"title": "lab_footsteps_title"`).

```json
{
  "id": "footsteps",
  "name": "Pas",
  "title": "Comment entendre où l'on marche ?",
  "description": "Le sol et la vitesse changent le son des pas.",
  "project": "Mon jeu",
  "steps": [
    { "text": "Lancez la marche.", "when": "play" },
    { "text": "Passez sur la pierre.", "when": "param", "value": 1 },
    { "text": "Courez.", "when": "param", "above": 0.9 }
  ],
  "observation": "Ce que l'on vient de comprendre.",
  "banks": ["footsteps.bank"],
  "events": [
    {
      "path": "event:/Player/Footsteps",
      "label": "Marcher",
      "mode": "loop",
      "parameters": [
        { "name": "Surface", "type": "labeled", "labels": ["Herbe", "Pierre", "Bois"] },
        { "name": "Speed", "label": "Vitesse", "type": "continuous", "min": 0, "max": 1, "step": 0.01, "default": 0.5 }
      ]
    }
  ]
}
```

| Champ | Valeur |
|---|---|
| `title` | La question posée par l'expérience |
| `name` | Nom court, sur le module (facultatif : `title` sinon) |
| `project` | Projet d'où vient l'extrait, facultatif : il devient le titre du module, la technique (`name`) passe au-dessus |
| `image` | Illustration du projet, au fond du module, facultative ; chemin relatif à `audio-demos/` (une version légère, vers 1400 px de large) |
| `steps` | Protocole, facultatif : des étapes cochées dans l'ordre, voir ci-dessous |
| `observation` | Explication, montrée d'elle-même une fois le protocole fini, facultative |
| `banks` | Banks de la démo ; `[]` si tout est dans les `sharedBanks` |
| `mode` | `"oneshot"` (déclenche) ou `"loop"` (bascule marche/arrêt) |
| `parameters[].name` | Nom exact du paramètre dans FMOD Studio |
| `parameters[].label` | Texte affiché, facultatif (le nom par défaut) |
| `parameters[].type` | Type de contrôle, voir ci-dessous |
| `parameters[].global` | `true` pour un paramètre global du projet |
| `parameters[].default` | Valeur de départ, facultative |

Event 3D : ajouter `"spatial": { "distance": [min, max] }` à l'event pour afficher la vue de dessus. Le listener (une oreille) reste au centre ; un clic dans sa portée y fait partir l'event.
`distance` n'est que l'affichage avant le premier lancement ; les vraies distances (celles du spatializer en « Override Range », sinon celles de l'event) sont lues à chaque lancement.

Étapes du protocole : `when` vaut `"play"` (lancer), `"param"` (changer un paramètre) ou `"move"` (event 3D : déclencher de l'autre côté de l'oreille).
Pour un `"play"` d'event 3D, `below` et `above` portent sur la distance entre l'explosion et l'oreille.
Pour `"param"`, on peut exiger `value` (valeur exacte), `below`, `above`, ou `count` (nombre de valeurs essayées).
Rien n'est gardé d'une visite à l'autre : chaque chargement de la page repart de zéro.

Types de contrôle :

| `type` | Contrôle | Champs propres |
|---|---|---|
| `"continuous"` | Potard | `min`, `max`, `step` ; `reversed: true` met le maximum à gauche ; `ends` : deux textes aux extrémités |
| `"stepped"` | Touches nommées | `labels` ; `min` : valeur du premier cran, puis +1 par cran ; `sequential: true` : on n'avance que vers le cran suivant, et « Recommencer » ramène au premier une fois le dernier atteint |
| `"toggle"` | Levier | `labels` et `values` : deux textes et leurs deux valeurs ; `default` : `0` ou `1` |
| `"labeled"` | Touches | `labels` (valeur = index du label) |

Sauf pour `"labeled"`, une courbe montre la valeur temps réel du paramètre (seek compris). Elle défile pendant la lecture de l'event et se fige à l'arrêt. Pour `"stepped"`, un repère marque chaque cran atteint.
L'oscilloscope, le spectre et l'aiguille montrent le son réellement émis : `js/scope.js` branche un analyseur sur la sortie de FMOD (`engine.outputNode`, propriété non documentée : sans elle, les écrans restent plats).
Lancer un event arrête celui en cours : un seul joue à la fois.
Au lancement, l'event prend directement la valeur choisie ; le seek s'applique aux changements suivants.

Un manifeste mal formé affiche la liste des erreurs sur la page.

## Tester en local

Lancer `python3 -m http.server` depuis le dossier **parent** du dépôt, puis ouvrir
`http://localhost:8000/davidtourdotfuentes.github.io/audio-demos/`.
