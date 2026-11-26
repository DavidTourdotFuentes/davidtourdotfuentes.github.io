// Liens externes d'une fiche : chaque adresse reçoit le logo de son site, reconnu à son nom de domaine.
import { el } from './card.js';
import { svg } from './meter.js';

const FILL = (d) => `<path d="${d}" fill="currentColor"/>`;
const LINE = (d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Sites connus : domaines, nom affiché, logo (24 x 24). Le premier qui correspond gagne ; sinon, un globe. */
const SITES = [
    { hosts: ['youtube.com', 'youtu.be'], name: 'YouTube', icon: FILL('M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.3V8.7l5.8 3.3z') },
    { hosts: ['vimeo.com'], name: 'Vimeo', icon: FILL('M22 7.4c-.1 1.9-1.4 4.5-4 7.8-2.6 3.4-4.8 5.1-6.6 5.1-1.1 0-2.1-1-2.9-3.1L7 11.4C6.4 9.3 5.8 8.3 5.1 8.3c-.1 0-.6.3-1.4.9L2.9 8.1l2.6-2.3C6.6 4.8 7.5 4.3 8.1 4.2c1.4-.1 2.2.8 2.5 2.8.3 2.2.6 3.5.7 4 .4 1.8.8 2.6 1.3 2.6.4 0 .9-.6 1.6-1.7.7-1.1 1.1-2 1.1-2.6.1-1-.3-1.5-1.1-1.5-.4 0-.8.1-1.2.3.8-2.6 2.3-3.9 4.6-3.8 1.7 0 2.5 1.1 2.4 3.1z') },
    { hosts: ['store.steampowered.com', 'steampowered.com', 'steamcommunity.com'], name: 'Steam', icon: `${LINE('M3 14.5l5.6 2.3M16.5 10.5l-5.3 3.8')}<circle cx="16.5" cy="8.5" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9.5" cy="17" r="2.5" fill="currentColor"/>` },
    { hosts: ['itch.io'], name: 'itch.io', icon: LINE('M4 9l2-4h12l2 4M4 9v1.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0V9M5 12v6.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V12M10 16h4') },
    { hosts: ['soundcloud.com'], name: 'SoundCloud', icon: `${FILL('M12 18.5V6.3a6.2 6.2 0 018 4.6 3.85 3.85 0 11.4 7.6z')}${LINE('M1 13v4M4.2 11v7.4M7.4 8.8v9.6')}` },
    { hosts: ['spotify.com'], name: 'Spotify', icon: `<circle cx="12" cy="12" r="11" fill="currentColor"/>${'<path d="M6.5 9.3c3.8-1.1 7.7-.8 11 1M7 12.6c3.2-.9 6.3-.6 9 .9M7.6 15.7c2.5-.6 4.8-.4 6.8.7" fill="none" style="stroke:var(--cadran)" stroke-width="1.7" stroke-linecap="round"/>'}` },
    { hosts: ['bandcamp.com'], name: 'Bandcamp', icon: FILL('M1 18.5 7.5 5.5H23l-6.5 13z') },
    { hosts: ['linkedin.com'], name: 'LinkedIn', icon: FILL('M20.4 20.5h-3.5v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5zM5.3 7.4a2 2 0 1 1 0-4.1 2 2 0 0 1 0 4.1zM7.1 20.5H3.6V9h3.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z') },
    { hosts: ['instagram.com'], name: 'Instagram', icon: '<rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.8" cy="6.2" r="1.4" fill="currentColor"/>' },
    { hosts: ['github.com'], name: 'GitHub', icon: LINE('M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21') },
];
const WEB = { name: '', icon: `<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>${LINE('M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20')}` };

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

/** links : [{ url, label }] (label déjà traduit, facultatif). Renvoie la rangée de logos, ou null s'il n'y a rien. */
export function createLinks(links) {
    if (!links.length) return null;
    return el('ul', 'detail__links', {}, ...links.map(({ url, label }) => {
        const site = siteOf(url);
        const name = label || site.name;
        const link = el('a', 'detail__link', { href: url, target: '_blank', rel: 'noopener' }, svg('', '0 0 24 24', site.icon));
        link.setAttribute('aria-label', name);
        link.title = name;
        return el('li', '', {}, link);
    }));
}
