// Liens externes d'une fiche : chaque adresse reçoit le logo de son site, reconnu à son nom de domaine.
// Les logos sont des fichiers SVG dans ressources/Generic (d'une seule couleur : le site les teinte à ses couleurs).
import { el } from './card.js';

const LOGOS = 'ressources/Generic/';

/** Sites connus : domaines, nom affiché, logo (fichier dans ressources/Generic). Le premier qui correspond gagne ; sinon, un globe. */
const SITES = [
    { hosts: ['youtube.com', 'youtu.be'], name: 'YouTube', logo: 'YouTube.svg' },
    { hosts: ['vimeo.com'], name: 'Vimeo', logo: 'Vimeo.svg' },
    { hosts: ['store.steampowered.com', 'steampowered.com', 'steamcommunity.com'], name: 'Steam', logo: 'Steam.svg' },
    { hosts: ['itch.io'], name: 'itch.io', logo: 'Itchio.svg' },
    { hosts: ['soundcloud.com'], name: 'SoundCloud', logo: 'SoundCloud.svg' },
    { hosts: ['spotify.com'], name: 'Spotify', logo: 'Spotify.svg' },
    { hosts: ['bandcamp.com'], name: 'Bandcamp', logo: 'Bandcamp.svg' },
    { hosts: ['linkedin.com'], name: 'LinkedIn', logo: 'LinkedIn.svg' },
    { hosts: ['instagram.com'], name: 'Instagram', logo: 'Instagram.svg' },
    { hosts: ['github.com'], name: 'GitHub', logo: 'GitHub.svg' },
];
const WEB = { name: '', logo: 'Web.svg' };

/** Le site d'une adresse, ou WEB si on ne le connaît pas. */
export function siteOf(url) {
    let host = '';
    try {
        host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return WEB;
    }
    return SITES.find(({ hosts }) => hosts.some((known) => host === known || host.endsWith(`.${known}`))) ?? { ...WEB, name: host };
}

/** Le logo, en masque : sa forme vient du fichier, sa couleur du texte (elle suit le thème et le survol). */
function logoOf(site) {
    const logo = el('span', 'detail__logo');
    // Adresse complète : dans une variable CSS, un chemin relatif se lirait depuis cards/cards.css
    logo.style.setProperty('--logo', `url("${new URL(LOGOS + site.logo, document.baseURI).href}")`);
    logo.setAttribute('aria-hidden', 'true');
    return logo;
}

/** links : [{ url, label }] (label déjà traduit, facultatif). Renvoie la rangée de logos, ou null s'il n'y a rien. */
export function createLinks(links) {
    if (!links.length) return null;
    return el('ul', 'detail__links', {}, ...links.map(({ url, label }) => {
        const site = siteOf(url);
        const name = label || site.name;
        const link = el('a', 'detail__link', { href: url, target: '_blank', rel: 'noopener' }, logoOf(site));
        link.setAttribute('aria-label', name);
        link.title = name;
        return el('li', '', {}, link);
    }));
}
