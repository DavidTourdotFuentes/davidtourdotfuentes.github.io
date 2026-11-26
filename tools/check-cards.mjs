// Vérifie cards/data.js et cards/events.js : `node tools/check-cards.mjs`. Signale aussi les images absentes, trop lourdes,
// inutilisées (un Card, FullArt ou Banner qu'aucune carte ne cite) ou mal nommées.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { checkCards, checkEvents } from '../cards/content.js';
import { CARDS } from '../cards/data.js';
import { EVENTS } from '../cards/events.js';
import { RARITIES, TAGS, TYPES } from '../cards/config.js';

const MAX_KB = 300; // toutes les images de l'éventail chargent à l'ouverture du site
const root = new URL('../', import.meta.url);
const problems = [...checkCards(CARDS, { rarities: RARITIES, tags: TAGS, types: TYPES }), ...checkEvents(EVENTS)];
const notes = [];

/** GitHub Pages distingue majuscules et minuscules, Windows non : on compare le nom exact. */
function exactExists(path) {
    if (!existsSync(new URL(path, root))) return false;
    const parts = path.split('/');
    return parts.every((part, i) => readdirSync(new URL(`${parts.slice(0, i).join('/')}/`.replace(/^\//, './'), root)).includes(part));
}

const bannerOf = ({ banner }) => (typeof banner === 'string' ? banner : banner?.image);
const imagesOf = (card) => [['Card', card.image], ['FullArt', card.fullArt], ['Banner', bannerOf(card)]].filter(([, path]) => path);
const GENERIC = 'ressources/Generic/'; // logos partagés (logiciels) : ils gardent leur nom

for (const card of CARDS) {
    for (const [kind, path] of imagesOf(card)) {
        if (!exactExists(path)) {
            problems.push(`carte '${card.id}' : image introuvable (attention aux majuscules) : ${path}`);
            continue;
        }
        const name = path.split('/').pop().replace(/\.[^.]+$/, '');
        if (name !== kind && !path.startsWith(GENERIC)) notes.push(`carte '${card.id}' : l'image ${kind} devrait s'appeler ${kind} : ${path}`);
        const size = Math.round(statSync(new URL(path, root)).size / 1024);
        if (kind !== 'Banner' && size > MAX_KB) notes.push(`carte '${card.id}' : image ${kind} de ${size} Ko, viser moins de ${MAX_KB} Ko : ${path}`);
    }
}

/** Tous les fichiers Card, FullArt et Banner sous ressources : chacun doit servir à une carte. */
function named(dir) {
    return readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((entry) => {
        const path = `${dir}${entry.name}`;
        if (entry.isDirectory()) return named(`${path}/`);
        return /^(Card|FullArt|Banner)\./.test(entry.name) ? [path] : [];
    });
}
const used = new Set(CARDS.flatMap((card) => imagesOf(card).map(([, path]) => path)));
for (const path of named('ressources/')) if (!used.has(path)) notes.push(`image inutilisée : ${path}`);

for (const problem of problems) console.log(`ERREUR  ${problem}`);
for (const note of notes) console.log(`Note    ${note}`);
console.log(`${CARDS.length} cartes, ${EVENTS.length} évènements, ${problems.length} erreur(s), ${notes.length} note(s).`);
process.exitCode = problems.length ? 1 : 0;
