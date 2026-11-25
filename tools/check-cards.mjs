// Vérifie cards/data.js : `node tools/check-cards.mjs`. Signale aussi les images absentes, trop lourdes ou inutilisées.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { checkCards } from '../cards/content.js';
import { CARDS } from '../cards/data.js';
import { RARITIES, TAGS } from '../cards/config.js';

const MAX_KB = 300; // toutes les images de l'éventail chargent à l'ouverture du site
const root = new URL('../', import.meta.url);
const problems = checkCards(CARDS, { rarities: RARITIES, tags: TAGS });
const notes = [];

/** GitHub Pages distingue majuscules et minuscules, Windows non : on compare le nom exact. */
function exactExists(path) {
    if (!existsSync(new URL(path, root))) return false;
    const parts = path.split('/');
    return parts.every((part, i) => readdirSync(new URL(`${parts.slice(0, i).join('/')}/`.replace(/^\//, './'), root)).includes(part));
}

for (const { id, image } of CARDS) {
    if (!image) continue;
    if (!exactExists(image)) {
        problems.push(`carte '${id}' : image introuvable (attention aux majuscules) : ${image}`);
        continue;
    }
    const size = Math.round(statSync(new URL(image, root)).size / 1024);
    if (size > MAX_KB) notes.push(`carte '${id}' : image de ${size} Ko, viser moins de ${MAX_KB} Ko : ${image}`);
}

const used = new Set(CARDS.map(({ image }) => image));
for (const file of readdirSync(new URL('ressources/Cards/', root))) {
    if (!used.has(`ressources/Cards/${file}`)) notes.push(`image inutilisée : ressources/Cards/${file}`);
}

for (const problem of problems) console.log(`ERREUR  ${problem}`);
for (const note of notes) console.log(`Note    ${note}`);
console.log(`${CARDS.length} cartes, ${problems.length} erreur(s), ${notes.length} note(s).`);
process.exitCode = problems.length ? 1 : 0;
