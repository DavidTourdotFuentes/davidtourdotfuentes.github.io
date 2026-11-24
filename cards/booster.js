// Ouverture d'un booster : on déchire le paquet, on retourne les cartes une à une, puis on voit le résultat.
import { actionButton as button, burst, coins, createCard, el, reducedMotion, setText, text, waveform } from './card.js';
import { createModal } from './modal.js';

const FLIP = 220; // en millisecondes : passé ce temps, la carte est lisible et un clic passe à la suivante
const LEAVE = 180; // sortie de la carte vue
const CLICK_THRESHOLD = 6; // en pixels : en dessous, c'est un clic et non un geste de déchirure
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * draw() paie et renvoie les cartes du booster, déjà ajoutées à la collection : [{ card, isNew, reward }], ou null si on ne peut pas payer.
 * onChange est appelé après une vente, onClose à la fermeture avec le nombre de cartes ouvertes.
 */
export function createBooster({ player, size, draw, describe, onRevealAll, onChange, onClose }) {
    const { cards } = player;
    const title = text('h2', 'booster__title', 'cards_welcome_title');
    title.id = 'booster-title';
    const intro = text('p', 'booster__intro', 'cards_welcome_text');
    const stage = el('div', 'booster__stage');
    const hint = text('p', 'booster__hint', 'cards_open_hint');
    const live = el('p', 'booster__live');
    live.setAttribute('aria-live', 'polite');
    const actions = el('div', 'booster__actions');
    const overlay = el('div', 'booster', {}, el('div', 'booster__scene', {}, title, intro, stage, hint, actions), live);
    overlay.setAttribute('aria-labelledby', 'booster-title');
    const modal = createModal(overlay, close);

    let session = 0; // change à chaque ouverture ou fermeture : une animation en retard ne touche plus la scène
    let opened = 0;

    function setPhase(phase) {
        overlay.dataset.phase = phase;
        overlay.classList.remove('is-flashing');
        overlay.scrollTop = 0;
    }

    // --- 1. Le paquet ---

    function showPack(isWelcome) {
        session++;
        setPhase('pack');
        setText(title, isWelcome ? 'cards_welcome_title' : 'cards_pack_title');
        setText(intro, isWelcome ? 'cards_welcome_text' : 'cards_pack_text');
        setText(hint, 'cards_open_hint');

        const half = (part) => el('span', `pack__half pack__half--${part}`, {},
            el('span', 'pack__art', {},
                el('span', 'pack__brand', { textContent: 'David Tourdot-Fuentes' }),
                waveform(),
                el('span', 'pack__label', { textContent: 'SOUND CARDS' }),
                el('span', 'pack__count', { textContent: `× ${size}` })));
        const pack = el('button', 'pack', { type: 'button' }, half('bottom'), half('top'), el('span', 'pack__cut'));
        pack.setAttribute('aria-label', getTranslation('cards_open_booster'));
        bindTear(pack, () => openPack(pack));
        stage.replaceChildren(pack);

        actions.replaceChildren(priceLabel(), button('cards_later', 'booster__link', close));
        if (onRevealAll) actions.append(button('cards_reveal_all', 'booster__link', () => { onRevealAll(); close(); }));
        pack.focus({ preventScroll: true });
    }

    /** Prix du prochain booster. */
    function priceLabel() {
        const free = player.freeBoosters;
        return el('p', 'booster__price', {}, ...(free > 0
            ? [text('span', '', 'booster_free'), ` × ${free}`]
            : [text('span', '', 'booster_cost'), ' ', coins(player.rules.economy.boosterPrice)]));
    }

    /** Glisser en travers du paquet le déchire ; un clic, ou Entrée au clavier, l'ouvre directement. */
    function bindTear(pack, onOpen) {
        let startX = null;
        let dragged = false;
        let done = false;
        const setTear = (value) => pack.style.setProperty('--tear', value);
        const open = () => {
            if (done) return;
            done = true;
            startX = null;
            setTear(1);
            onOpen();
        };

        pack.addEventListener('pointerdown', (event) => {
            if (event.button !== 0 || done) return;
            startX = event.clientX;
            dragged = false;
            pack.setPointerCapture(event.pointerId);
        });
        pack.addEventListener('pointermove', (event) => {
            if (startX === null) return;
            const distance = Math.abs(event.clientX - startX);
            dragged ||= distance >= CLICK_THRESHOLD;
            if (!dragged) return;
            const tear = Math.min(distance / (pack.offsetWidth * 0.7), 1);
            pack.classList.add('is-tearing');
            setTear(tear);
            if (tear === 1) open();
        });
        for (const type of ['pointerup', 'pointercancel']) {
            pack.addEventListener(type, () => {
                startX = null;
                pack.classList.remove('is-tearing');
                if (!done) setTear(0);
            });
        }
        pack.addEventListener('click', (event) => {
            if (event.detail === 0 || !dragged) open(); // detail vaut 0 au clavier
        });
    }

    async function openPack(pack) {
        const current = session;
        const drawn = draw();
        if (!drawn) { // payé entre-temps dans un autre onglet
            close();
            return;
        }
        opened += drawn.length;
        for (const { card } of drawn) new Image().src = describe(card).image;
        actions.replaceChildren();
        pack.classList.add('is-open');
        burst(stage, { color: '#7dd3fc', particles: 24 });
        await wait(reducedMotion() ? 0 : 750);
        if (current === session) showDeck(drawn);
    }

    // --- 2. Les cartes, une à une ---

    function showDeck(drawn) {
        setPhase('deck');
        actions.replaceChildren(button('cards_skip', 'booster__link', () => showSummary(drawn)));
        showDeckCard(drawn, 0);
    }

    function showDeckCard(drawn, index) {
        const current = ++session;
        const { card, isNew, reward } = drawn[index];
        const { rarity } = card;
        overlay.classList.remove('is-flashing');
        setText(hint, 'cards_flip_hint');

        const node = createCard('button', card, describe(card), cards.indexOf(card) + 1, cards.length);
        node.classList.add('tcard--deck');
        node.setAttribute('aria-label', `${getTranslation('cards_face_down')} ${index + 1}/${drawn.length}`);

        const fx = el('div', 'fx', {}, el('span', 'fx__rays'), el('span', 'fx__ring'));
        fx.dataset.effect = rarity.effect;
        fx.style.setProperty('--rarity', rarity.color);
        // Cartes restantes, visibles en dessous.
        const pile = el('div', 'pile');
        for (let i = 1; i < drawn.length - index; i++) {
            const under = el('span', 'pile__card');
            under.style.setProperty('--depth', i);
            pile.append(under);
        }
        stage.replaceChildren(fx, pile, node, el('p', 'booster__counter', { textContent: `${index + 1} / ${drawn.length}` }));

        let state = 'down';
        let skip = () => {}; // abrège l'attente en cours
        const skippable = (ms) => Promise.race([wait(ms), new Promise((resolve) => { skip = resolve; })]);

        async function flip() {
            state = 'revealing';
            if (!reducedMotion() && rarity.charge) {
                node.classList.add('is-charging');
                node.style.setProperty('--charge', `${rarity.charge}ms`);
                await skippable(rarity.charge);
                if (current !== session) return;
                node.classList.remove('is-charging');
            }
            node.getBoundingClientRect(); // une carte tout juste posée doit être dessinée de dos pour que le retournement s'anime
            node.classList.add('is-flipped');
            fx.classList.add('is-active');
            if (rarity.effect === 'legend' && !node.classList.contains('is-instant')) overlay.classList.add('is-flashing');
            burst(stage, rarity);
            const status = getTranslation(isNew ? 'cards_new' : 'cards_double');
            const announced = `${describe(card).name}, ${getTranslation(`rarity_${rarity.id}`)}, ${status}`;
            stage.append(statusTag(isNew, reward));
            live.textContent = announced;
            node.setAttribute('aria-label', announced);
            setText(hint, index + 1 < drawn.length ? 'cards_next_hint' : 'cards_end_hint');
            if (!reducedMotion() && !node.classList.contains('is-instant')) await skippable(FLIP);
            if (current === session) state = 'up';
        }

        node.addEventListener('click', () => {
            if (state === 'down') {
                flip();
            } else if (state === 'revealing') {
                // Clic pendant l'animation : la carte s'affiche aussitôt.
                node.classList.add('is-instant');
                overlay.classList.remove('is-flashing');
                skip();
            } else if (state === 'up') {
                state = 'left';
                if (index + 1 < drawn.length) {
                    showDeckCard(drawn, index + 1);
                    flyOut(node);
                } else showSummary(drawn);
            }
        });
        node.focus({ preventScroll: true });
    }

    /** La carte vue s'envole par-dessus la suivante, déjà en place : rien n'attend la fin de ce mouvement. */
    function flyOut(node) {
        if (reducedMotion()) return;
        node.classList.replace('tcard--deck', 'tcard--leaving');
        node.inert = true;
        stage.append(node);
        node.animate(
            [
                { transform: 'none', opacity: 1 },
                { opacity: 1, offset: 0.5 },
                { transform: 'translateX(120%) rotate(16deg)', opacity: 0 },
            ],
            { duration: LEAVE, easing: 'ease-in', fill: 'forwards' },
        );
        setTimeout(() => node.remove(), LEAVE);
    }

    /** « Nouveau +10 » ou « Double ». */
    function statusTag(isNew, reward) {
        const tag = el('p', `status-tag${isNew ? ' is-new' : ''}`, {}, text('span', '', isNew ? 'cards_new' : 'cards_double'));
        if (reward) tag.append(' ', coins(reward, '+'));
        return tag;
    }

    // --- 3. Le résultat ---

    function showSummary(drawn) {
        session++;
        setPhase('summary');
        setText(title, player.isComplete ? 'cards_complete' : 'cards_summary_title');
        setText(hint, 'cards_summary_hint');
        stage.replaceChildren(...drawn.map(({ card, isNew, reward }, i) => {
            const node = createCard('div', card, describe(card), cards.indexOf(card) + 1, cards.length);
            node.classList.add('is-flipped');
            const item = el('div', 'booster__item', {}, node, statusTag(isNew, reward));
            item.style.setProperty('--i', i);
            return item;
        }));
        showSummaryActions(drawn);
        actions.querySelector('.booster__btn--main').focus({ preventScroll: true });
    }

    function showSummaryActions(drawn) {
        actions.replaceChildren(button('cards_see_collection', 'booster__btn booster__btn--main', close));
        if (player.canOpenBooster) actions.append(button('cards_again', 'booster__btn', () => showPack(false)), priceLabel());

        const doubles = drawn.filter(({ card, isNew }) => !isNew && player.spare(card) > 0).map(({ card }) => card);
        if (!doubles.length) return;
        const value = doubles.reduce((sum, card) => sum + player.sellPrice(card), 0);
        actions.prepend(button('sell_booster', 'booster__btn booster__btn--coins', () => {
            for (const card of doubles) player.sell(card);
            onChange();
            stage.querySelectorAll('.status-tag:not(.is-new)').forEach((tag) => tag.replaceChildren(text('span', '', 'sell_done')));
            for (const result of drawn) if (doubles.includes(result.card)) result.isNew = true; // vendu : plus rien à vendre ici
            showSummaryActions(drawn);
            actions.querySelector('.booster__btn--main').focus({ preventScroll: true });
        }, ' ', coins(value, '+')));
    }

    // --- Ouverture et fermeture ---

    function open({ isWelcome = false } = {}) {
        if (!overlay.hidden || !player.canOpenBooster) return;
        opened = 0;
        modal.open();
        showPack(isWelcome);
    }

    function close() {
        session++;
        modal.close();
        stage.replaceChildren();
        onClose(opened);
    }

    return { open };
}
