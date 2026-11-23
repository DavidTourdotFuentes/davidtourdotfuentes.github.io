# Démos audio FMOD

Page statique autonome. L'interface est générée depuis `demos.json` ; rien d'audio n'est chargé avant le premier clic.

## Versions

Runtime FMOD HTML5 **2.03.15**. Exporter les banks avec FMOD Studio **2.03.x** : le runtime refuse les banks d'une version plus récente que lui.
Pour changer de version majeure, remplacer le runtime, réexporter toutes les banks et revérifier `unlock()` dans `js/fmod-engine.js`.

## Exporter les banks

1. Dans FMOD Studio, *Edit > Preferences > Build* : choisir `audio-demos/banks` comme dossier de sortie. Les banks doivent se trouver directement dans ce dossier.
2. Encodage de la plateforme : **Vorbis**. Garder les musiques en streaming.
3. Créer une bank par démo, y assigner ses events, et ne laisser dans `Master` que ce qui est commun.
4. *File > Build*. `Master.bank` et `Master.strings.bank` sont toujours nécessaires.

Viser moins de 3 Mo par bank : elle est téléchargée en entier au lancement.

## Ajouter une démo

1. Exporter la bank dans `banks/`.
2. Ajouter une entrée dans `demos.json`. Les chemins de banks sont relatifs à `banks/`.

```json
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
        { "name": "Speed", "label": "Vitesse", "type": "continuous", "min": 0, "max": 1, "step": 0.01, "default": 0.5 }
      ]
    }
  ]
}
```

| Champ | Valeur |
|---|---|
| `banks` | Banks de la démo ; `[]` si tout est dans les `sharedBanks` |
| `mode` | `"oneshot"` (déclenche) ou `"loop"` (bascule marche/arrêt) |
| `parameters[].name` | Nom exact du paramètre dans FMOD Studio |
| `parameters[].label` | Texte affiché, facultatif (le nom par défaut) |
| `parameters[].type` | Type de contrôle, voir ci-dessous |
| `parameters[].global` | `true` pour un paramètre global du projet |
| `parameters[].default` | Valeur de départ, facultative |

Event 3D : ajouter `"spatial": { "distance": [min, max], "listener": [x, z] }` à l'event pour afficher la vue de dessus.
`distance` n'est que l'affichage avant le premier lancement ; les vraies distances (celles du spatializer en « Override Range », sinon celles de l'event) sont lues à chaque lancement.
`listener` est la position de départ (x vers la droite, z vers le haut de la carte).

Types de contrôle :

| `type` | Contrôle | Champs propres |
|---|---|---|
| `"continuous"` | Curseur | `min`, `max`, `step` ; `reversed: true` met le maximum à gauche ; `ends` : deux textes aux extrémités |
| `"stepped"` | Curseur à crans nommés | `labels` ; `min` : valeur du premier cran, puis +1 par cran |
| `"toggle"` | Interrupteur | `labels` et `values` : deux textes et leurs deux valeurs ; `default` : `0` ou `1` |
| `"labeled"` | Boutons | `labels` (valeur = index du label) |

Sauf pour `"labeled"`, une courbe montre la valeur temps réel du paramètre (seek compris). Elle défile pendant la lecture de l'event et se fige à l'arrêt. Pour `"stepped"`, un repère marque chaque cran atteint.
Lancer un event arrête celui en cours : un seul joue à la fois.
Au lancement, l'event prend directement la valeur choisie ; le seek s'applique aux changements suivants.

Un manifeste mal formé affiche la liste des erreurs sur la page.

## Tester en local

Lancer `python3 -m http.server` depuis le dossier **parent** du dépôt, puis ouvrir
`http://localhost:8000/davidtourdotfuentes.github.io/audio-demos/`.
