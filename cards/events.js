// Les évènements de la timeline : un marqueur à une date précise. C'est le seul fichier à modifier pour en ajouter, changer ou retirer un.
//
//     {
//         date: '2026/05/01',              // année/mois/jour
//         title: { fr: 'Mon évènement', en: 'My event' }, // quelques mots. Un simple texte 'Mon évènement' vaut pour les deux langues
//     },
//
// L'ordre de la liste ne compte pas. Une année sans projet apparaît aussi dans la timeline.
// Un texte avec une apostrophe s'écrit entre accents graves (AltGr + 7) : `L'évènement`.
// Vérifier : `node tools/check-cards.mjs`, ou la console du navigateur (F12).

export const EVENTS = [
    { date: '2020/09/03', title: { fr: '3iS Bordeaux', en: '3iS Bordeaux' } },
    { date: '2023/07/03', title: { fr: 'Stage à G4F Prod', en: 'Start of the internship at G4F Prod' } },
    { date: '2024/01/22', title: { fr: 'CDD à G4F Prod', en: 'Fixed-term contract at G4F Prod' } },
    { date: '2025/07/11', title: { fr: 'CDI à G4F Prod', en: 'Permanent contract at G4F Prod' } },
];
