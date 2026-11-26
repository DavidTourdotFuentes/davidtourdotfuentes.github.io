// Détail d'une carte de la collection : elle sort de sa case et se pose à gauche, ses informations s'affichent à droite.
import { createCard, el, reducedMotion, text } from './card.js';
import { createKnob, svg } from './meter.js';
import { createModal } from './modal.js';
import { createPlayer } from './player.js';

const FLIGHT = 650; // durée du trajet, en millisecondes
const RETURN = 450;

/** Fin d'un trajet. Une animation est gelée dans un onglet caché : on n'attend jamais beaucoup plus que sa durée. */
const landed = (flight, duration) => Promise.race([
    flight.finished.catch(() => {}), // annulée si on ferme en cours de route
    new Promise((resolve) => { setTimeout(resolve, duration + 150); }),
]);

export function createDetail({ cards, describe }) {
    const background = el('div', 'detail__bg');
    // Une croix dessinée plutôt que « × », dont le dessin n'est pas centré dans sa boîte
    const closeButton = el('button', 'detail__close', { type: 'button' }, svg('detail__cross', '0 0 24 24', '<path d="M6 6l12 12M18 6L6 18"/>'));
    const slot = el('div', 'detail__card');
    const info = el('div', 'detail__info');
    // Le bouton se pose dans le coin de l'encart, hors de la partie qui défile
    const panel = el('div', 'detail__panel', {}, info, closeButton);
    const layout = el('div', 'detail__layout', {}, slot, panel);
    const overlay = el('div', 'detail', {}, background, layout);
    overlay.setAttribute('aria-labelledby', 'detail-title');
    const modal = createModal(overlay, close);

    let current = null; // carte affichée
    let origin = null; // case d'où elle sort, et où elle retourne
    let node = null; // sa version agrandie
    let isClosing = false;

    /** Transformation qui ramène la grande carte sur la case de la collection. */
    function toTile() {
        const tile = origin.getBoundingClientRect();
        const big = slot.getBoundingClientRect(); // la case de gauche a la taille de la carte et n'est jamais transformée
        const x = tile.left + tile.width / 2 - (big.left + big.width / 2);
        const y = tile.top + tile.height / 2 - (big.top + big.height / 2);
        return `translate(${x}px, ${y}px) scale(${tile.width / big.width})`;
    }

    /** Ce qu'on lit d'un coup d'œil. */
    function ticket(card, content) {
        const { role, year } = content;
        const row = (key, ...value) => [el('div', '', {}, text('dt', '', key), el('dd', '', {}, ...value))];
        return el('dl', 'ticket', {},
            ...row('ticket_type', text('span', '', `type_${card.type}`)),
            ...(role ? row('ticket_role', role) : []),
            ...(year ? row('ticket_year', year) : []),
            ...row('ticket_number', `${cards.indexOf(card) + 1} / ${cards.length}`));
    }

    function fill(card) {
        const content = describe(card);
        const title = el('h2', 'detail__title', { textContent: content.name });
        title.id = 'detail-title';
        const description = el('div', 'detail__text');
        description.innerHTML = content.longHtml;

        info.replaceChildren(el('p', 'detail__rarity', {}, createKnob(card.rarity), text('span', '', `rarity_${card.rarity.id}`)),
            title, ticket(card, content), ...(content.embed.src ? [createPlayer(content)] : []), description);
        info.scrollTop = 0;

        overlay.scrollTop = 0;
        overlay.style.setProperty('--rarity', card.rarity.color);
        overlay.dataset.rarity = card.rarity.id;
        closeButton.setAttribute('aria-label', getTranslation('cards_close'));
        return content;
    }

    /** from : élément d'où sort la carte, sa case dans la grille par défaut. */
    async function open(card, from = card.node) {
        if (current) return;
        current = card;
        origin = from;
        const content = fill(card);
        node = createCard('div', card, content, cards.indexOf(card) + 1, cards.length);
        node.classList.add('is-flipped', 'tcard--detail');
        slot.replaceChildren(node);
        modal.open();
        closeButton.focus({ preventScroll: true });
        origin.classList.add('is-out'); // sa case reste vide
        overlay.classList.remove('is-closing');

        if (!reducedMotion()) {
            overlay.classList.add('is-moving');
            const start = toTile();
            const flight = node.animate(
                [
                    { transform: start },
                    { transform: `${start} translateY(-6%) scale(1.06)`, offset: 0.2 }, // elle se soulève de sa case
                    { transform: 'none' },
                ],
                { duration: FLIGHT, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' },
            );
            await landed(flight, FLIGHT);
            if (current !== card || isClosing) return;
            overlay.classList.remove('is-moving');
        }
    }

    async function close() {
        if (!current || isClosing) return;
        isClosing = true;
        for (const frame of info.querySelectorAll('iframe')) frame.remove(); // coupe le son
        overlay.classList.add('is-closing', 'is-moving');
        if (!reducedMotion()) {
            const from = getComputedStyle(node).transform;
            for (const animation of node.getAnimations()) animation.cancel();
            const flight = node.animate(
                [{ transform: from }, { transform: toTile() }],
                { duration: RETURN, easing: 'cubic-bezier(0.4, 0, 0.3, 1)', fill: 'forwards' },
            );
            await landed(flight, RETURN);
        }
        origin.classList.remove('is-out');
        overlay.classList.remove('is-moving');
        modal.close();
        slot.replaceChildren();
        info.replaceChildren();
        current = origin = node = null;
        isClosing = false;
    }

    closeButton.addEventListener('click', close);
    // Un clic à côté de la carte et du texte ferme aussi.
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target === layout || event.target === background) close();
    });

    return { open };
}
