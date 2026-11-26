// Lecteur d'une fiche : celui de la plateforme (YouTube, Vimeo, Spotify, SoundCloud), prêt tout de suite,
// posé dans un boîtier de bakélite et réglé aux couleurs du site quand la plateforme le permet. Rien ne joue sans un clic.
import { el, text } from './card.js';

export const SOURCES = { youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud', vimeo: 'Vimeo' };
const ACCENT = 'ff5a3a'; // led-crete

/** Adresse publique du morceau ou de la vidéo, pour « Ouvrir sur … ». */
function pageOf({ type, src }) {
    const url = new URL(src);
    if (type === 'youtube') return `https://www.youtube.com/watch?v=${url.pathname.split('/').pop()}`;
    if (type === 'spotify') return `https://open.spotify.com${url.pathname.replace('/embed', '')}`;
    if (type === 'vimeo') return `https://vimeo.com/${[url.pathname.split('/').pop(), url.searchParams.get('h')].filter(Boolean).join('/')}`;
    return url.searchParams.get('url') ?? src;
}

/** Adresse du lecteur, avec les réglages qui le rapprochent du site. */
function frameSrc({ type, src }) {
    const url = new URL(src);
    const set = (pairs) => { for (const [key, value] of pairs) url.searchParams.set(key, value); };
    if (type === 'youtube') {
        url.hostname = 'www.youtube-nocookie.com'; // pas de cookie avant la lecture
        set([['rel', 0], ['color', 'white'], ['playsinline', 1]]);
    }
    if (type === 'vimeo') set([['color', ACCENT], ['title', 0], ['byline', 0], ['portrait', 0], ['dnt', 1]]);
    if (type === 'soundcloud') set([['color', `#${ACCENT}`], ['auto_play', 'false'], ['show_reposts', 'false']]);
    if (type === 'spotify') set([['theme', 0]]); // le thème sombre
    return url.href;
}

/** content : { name, embed: { type, src } }. */
export function createPlayer({ name, embed }) {
    const source = SOURCES[embed.type] ?? embed.type;
    const frame = el('iframe', 'player__frame', { src: frameSrc(embed), title: `${source} : ${name}`, loading: 'lazy' });
    frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write';
    frame.allowFullscreen = true;
    const page = pageOf(embed);
    // Une playlist SoundCloud n'a qu'une adresse technique (api.soundcloud.com) : son lecteur porte déjà son propre lien
    const open = page.includes('api.soundcloud.com') ? null
        : el('a', 'player__open', { href: page, target: '_blank', rel: 'noopener' }, text('span', '', 'player_open_on'), ` ${source} ↗`);
    return el('div', `player player--${embed.type}`, {},
        el('div', 'player__bar', {}, el('span', 'player__name', { textContent: name }), ...(open ? [open] : [])),
        el('div', 'player__screen', {}, frame));
}
