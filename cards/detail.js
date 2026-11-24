// Détail d'une carte de la collection : elle sort de sa case et se pose à gauche, ses informations s'affichent à droite.
import { actionButton, coins, createCard, el, reducedMotion, text } from './card.js';
import { createModal } from './modal.js';

const FLIGHT = 650; // durée du trajet, en millisecondes
const RETURN = 450;

/** Fin d'un trajet. Une animation est gelée dans un onglet caché : on n'attend jamais beaucoup plus que sa durée. */
const landed = (flight, duration) => Promise.race([
    flight.finished.catch(() => {}), // annulée si on ferme en cours de route
    new Promise((resolve) => { setTimeout(resolve, duration + 150); }),
]);

export function createDetail({ player, describe, onChange, onTrade }) {
    const { cards } = player;
    const owned = el('div', 'detail__owned');
    const background = el('div', 'detail__bg');
    const closeButton = el('button', 'detail__close', { type: 'button', textContent: '×' });
    const slot = el('div', 'detail__card');
    const info = el('div', 'detail__info');
    const layout = el('div', 'detail__layout', {}, slot, info);
    const overlay = el('div', 'detail', {}, background, layout, closeButton);
    overlay.setAttribute('aria-labelledby', 'detail-title');
    const modal = createModal(overlay, close);

    let current = null; // carte affichée
    let node = null; // sa version agrandie
    let isClosing = false;

    /** Transformation qui ramène la grande carte sur la case de la collection. */
    function toTile() {
        const tile = current.node.getBoundingClientRect();
        const big = slot.getBoundingClientRect(); // la case de gauche a la taille de la carte et n'est jamais transformée
        const x = tile.left + tile.width / 2 - (big.left + big.width / 2);
        const y = tile.top + tile.height / 2 - (big.top + big.height / 2);
        return `translate(${x}px, ${y}px) scale(${tile.width / big.width})`;
    }

    function fill(card) {
        const content = describe(card);
        const title = el('h2', 'detail__title', { textContent: content.name });
        title.id = 'detail-title';
        const description = el('div', 'detail__text');
        description.innerHTML = content.longHtml;

        info.replaceChildren(
            el('p', 'detail__meta', {}, text('span', 'detail__rarity', `rarity_${card.rarity.id}`), text('span', '', `type_${card.type}`)),
            title);
        if (content.subtitle) info.append(el('p', 'detail__subtitle', { textContent: content.subtitle }));
        info.append(description, owned);
        showOwned(card);
        info.scrollTop = 0;

        overlay.scrollTop = 0;
        overlay.style.setProperty('--rarity', card.rarity.color);
        background.style.backgroundImage = content.background ? `url("${content.background}")` : '';
        closeButton.setAttribute('aria-label', getTranslation('cards_close'));
        return content;
    }

    /** Exemplaires possédés, et ce qu'on peut en faire. */
    function showOwned(card) {
        const spare = player.spare(card);
        owned.replaceChildren(el('p', 'detail__count', {}, text('span', '', 'detail_copies'), ` ${player.count(card)}`));
        const sell = (key, amount) => actionButton(key, 'booster__btn booster__btn--coins', () => {
            player.sell(card, amount);
            onChange();
            showOwned(card);
            (owned.querySelector('button') ?? closeButton).focus({ preventScroll: true });
        }, ' ', coins(amount * player.sellPrice(card), '+'));
        if (spare > 0) owned.append(sell('sell_one', 1));
        if (spare > 1) owned.append(sell('sell_all', spare));
        if (player.canTrade(card)) {
            owned.append(actionButton('trade_open', 'booster__btn', async () => {
                await close();
                onTrade(card);
            }));
        }
    }

    /** Le lecteur n'est chargé qu'une fois la carte posée, pour ne pas saccader le trajet. */
    function addEmbed({ name, embed }) {
        if (!embed.src) return;
        const frame = el('iframe', `detail__embed detail__embed--${embed.type}`, { src: embed.src, title: name });
        frame.allow = 'autoplay; encrypted-media; fullscreen';
        info.append(frame);
    }

    async function open(card) {
        if (current) return;
        current = card;
        const content = fill(card);
        node = createCard('div', card, content, cards.indexOf(card) + 1, cards.length);
        node.classList.add('is-flipped', 'tcard--detail');
        slot.replaceChildren(node);
        modal.open();
        closeButton.focus({ preventScroll: true });
        card.node.classList.add('is-out'); // sa case reste vide
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
        addEmbed(content);
    }

    async function close() {
        if (!current || isClosing) return;
        isClosing = true;
        info.querySelector('iframe')?.remove(); // coupe le son
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
        current.node.classList.remove('is-out');
        overlay.classList.remove('is-moving');
        modal.close();
        slot.replaceChildren();
        info.replaceChildren();
        current = node = null;
        isClosing = false;
    }

    closeButton.addEventListener('click', close);
    // Un clic à côté de la carte et du texte ferme aussi.
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target === layout || event.target === background) close();
    });

    return { open };
}
