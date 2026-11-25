// Lecture de data.js : textes traduits, lecteurs, et vérification des erreurs. Sans page web : tools/check-cards.mjs s'en sert aussi.

export const LANGUAGES = ['fr', 'en'];
const TYPES = ['project', 'software', 'hardware'];

/** Texte dans la langue demandée. Une simple chaîne vaut pour toutes ; sans traduction, on garde le français. */
export function textOf(value, lang) {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value : value[lang] || value.fr || '';
}

/** Retours à la ligne en <br>, sans l'indentation du fichier. */
export const toHtml = (text) => text.trim().split('\n').map((line) => line.trim()).join('<br>');

/** Lien normal ou lien d'intégration d'un lecteur : { type, src }. src est vide si le lien n'est pas reconnu. */
export function playerOf(link) {
    if (!link) return { type: '', src: '' };
    let url;
    try {
        url = new URL(link);
    } catch {
        return { type: '', src: '' };
    }
    const host = url.hostname.replace(/^www\./, '');
    const path = url.pathname;

    if (host === 'youtu.be') return { type: 'youtube', src: `https://www.youtube.com/embed${path}` };
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
        if (path.startsWith('/embed/')) return { type: 'youtube', src: link };
        const id = url.searchParams.get('v') ?? path.match(/^\/shorts\/([^/]+)/)?.[1];
        return { type: 'youtube', src: id ? `https://www.youtube.com/embed/${id}` : '' };
    }
    if (host === 'player.vimeo.com') return { type: 'vimeo', src: link };
    if (host === 'vimeo.com') {
        const [, id, key] = path.match(/^\/(\d+)(?:\/(\w+))?/) ?? []; // la clé d'une vidéo non répertoriée suit son numéro
        return { type: 'vimeo', src: id ? `https://player.vimeo.com/video/${id}${key ? `?h=${key}` : ''}` : '' };
    }
    if (host === 'open.spotify.com') {
        if (path.startsWith('/embed/')) return { type: 'spotify', src: link };
        return { type: 'spotify', src: `https://open.spotify.com/embed${path.replace(/^\/intl-\w+/, '')}` };
    }
    if (host === 'w.soundcloud.com') return { type: 'soundcloud', src: link };
    if (host === 'soundcloud.com') {
        return { type: 'soundcloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.origin + path)}&visual=true` };
    }
    return { type: '', src: '' };
}

/** Erreurs de data.js, en phrases prêtes à lire. rarities et tags viennent de config.js. */
export function checkCards(cards, { rarities, tags }) {
    const problems = [];
    const seen = new Set();
    const list = (values) => values.map((value) => `'${value}'`).join(', ');

    cards.forEach((card, i) => {
        const say = (message) => problems.push(`carte ${card.id ? `'${card.id}'` : `n° ${i + 1}`} : ${message}`);

        if (!card.id) say('id manquant');
        else if (!/^[a-z0-9-]+$/.test(card.id)) say('id : minuscules, chiffres et tirets seulement');
        else if (seen.has(card.id)) say('id déjà pris par une autre carte');
        seen.add(card.id);

        if (!TYPES.includes(card.type)) say(`type '${card.type ?? ''}' inconnu, choisir parmi ${list(TYPES)}`);
        if (!rarities.some(({ id }) => id === card.rarity)) say(`rarity '${card.rarity ?? ''}' inconnue, choisir parmi ${list(rarities.map(({ id }) => id))}`);

        for (const field of ['name', 'role', 'short', 'long']) {
            const value = card[field];
            if (value === undefined) {
                if (field === 'name' || field === 'short') say(`${field} manquant`);
                continue;
            }
            if (typeof value === 'string') {
                if (field === 'short' || field === 'long') say(`${field} : attendu { fr: ..., en: ... }`);
                continue;
            }
            for (const lang of LANGUAGES) if (!value?.[lang]?.trim()) say(`${field} : texte ${lang} manquant`);
        }

        if (!card.image) say('image manquante');
        if (card.crop !== undefined && !(card.crop >= 0 && card.crop <= 100)) say('crop : un nombre de 0 à 100');
        if (card.zoom !== undefined && !(card.zoom >= 1)) say('zoom : un nombre, 1 ou plus');
        if (card.type === 'project' && card.year === undefined) say('year manquant : le projet ne sort pas dans la timeline');
        if (card.year !== undefined && !/^\d{4}$/.test(card.year)) say('year : quatre chiffres');
        if (card.player && !playerOf(card.player).src) say('player : lien non reconnu (YouTube, Vimeo, Spotify ou SoundCloud)');

        for (const tag of card.tags ?? []) if (!(tag in tags)) say(`tag '${tag}' inconnu, choisir parmi ${list(Object.keys(tags))}`);
        if (card.type === 'project' && !card.tags?.length) say('aucun tag : le projet ne sort que dans « Tous les projets »');

        const known = ['id', 'type', 'rarity', 'tags', 'name', 'role', 'year', 'short', 'long', 'image', 'crop', 'zoom', 'player'];
        for (const field of Object.keys(card)) if (!known.includes(field)) say(`champ '${field}' inconnu (faute de frappe ?)`);
    });
    return problems;
}
