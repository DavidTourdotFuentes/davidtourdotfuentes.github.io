# Démos audio FMOD

Page statique autonome. L'interface est générée depuis `demos.json` ; rien d'audio n'est chargé avant le premier clic.

## Versions

Runtime FMOD HTML5 **2.02.13**. Exporter les banks avec FMOD Studio **2.02.x** : le runtime 2.02 ne garantit pas la lecture de banks 2.03.
Pour passer en 2.03, remplacer le runtime et réexporter toutes les banks en même temps.

## Exporter les banks

1. Dans FMOD Studio, *Edit > Preferences > Build* : choisir `audio-demos/banks` comme dossier de sortie. FMOD y crée un sous-dossier par plateforme (`Desktop/`).
2. Encodage de la plateforme : **Vorbis**. Garder les musiques en streaming.
3. Créer une bank par démo, y assigner ses events, et ne laisser dans `Master` que ce qui est commun.
4. *File > Build*. `Master.bank` et `Master.strings.bank` sont toujours nécessaires.

Viser moins de 3 Mo par bank : elle est téléchargée en entier au lancement.

## Ajouter une démo

1. Exporter la bank dans `banks/Desktop/`.
2. Ajouter une entrée dans `demos.json`. Les chemins de banks sont relatifs à `banks/`.

```json
{
  "id": "footsteps",
  "title": "Pas adaptatifs",
  "description": "Changement de surface et de vitesse en temps réel.",
  "banks": ["Desktop/footsteps.bank"],
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
| `parameters[].type` | `"continuous"` (curseur) ou `"labeled"` (valeur = index du label) |
| `parameters[].global` | `true` pour un paramètre global du projet |
| `parameters[].default` | Valeur de départ, facultative |

Un manifeste mal formé affiche la liste des erreurs sur la page.

## Tester en local

Lancer `python3 -m http.server` depuis le dossier **parent** du dépôt, puis ouvrir
`http://localhost:8000/davidtourdotfuentes.github.io/audio-demos/`.
