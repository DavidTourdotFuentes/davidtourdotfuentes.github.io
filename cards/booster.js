// Ouverture d'un booster : on déchire le paquet, on retourne les cartes une à une, puis on voit le résultat.
import { burst, createCard, el, reducedMotion, setText, text, waveform } from './card.js';
import { createModal } from './modal.js';

const CLICK_THRESHOLD = 6; // en pixels : en dessous, c'est un clic et non un geste de déchirure
const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * draw() renvoie les cartes du booster (déjà ajoutées à la collection), describe(card) leur contenu,
 * remaining() le nombre de cartes encore cachées. onClose est appelé à la fermeture, avec le nombre de cartes ouvertes.
 */
export function createBooster({ cards, size, draw, describe, remaining, onRevealAll, onClose }) {
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

    function button(key, className, onClick) {
        const node = text('button', className, key);
        node.type = 'button';
        node.addEventListener('click', onClick);
        return node;
    }

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
                el('span', 'pack__count', { textContent: `× ${Math.min(size, remaining())}` })));
        const pack = el('button', 'pack', { type: 'button' }, half('bottom'), half('top'), el('span', 'pack__cut'));
        pack.setAttribute('aria-label', getTranslation('cards_open_booster'));
        bindTear(pack, () => openPack(pack));
        stage.replaceChildren(pack);

        const later = button('cards_later', 'booster__link', close);
        actions.replaceChildren(later);
        if (onRevealAll) actions.append(button('cards_reveal_all', 'booster__link', () => { onRevealAll(); close(); }));
        pack.focus({ preventScroll: true });
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
        opened += drawn.length;
        for (const card of drawn) new Image().src = describe(card).image;
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
        const card = drawn[index];
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
        node.addEventListener('click', async () => {
            if (state === 'up') {
                state = 'left';
                node.classList.add('is-leaving');
                await wait(reducedMotion() ? 0 : 250);
                if (current !== session) return;
                if (index + 1 < drawn.length) showDeckCard(drawn, index + 1);
                else showSummary(drawn);
                return;
            }
            if (state !== 'down') return;
            state = 'charging';
            if (!reducedMotion() && rarity.charge) {
                node.classList.add('is-charging');
                node.style.setProperty('--charge', `${rarity.charge}ms`);
                await wait(rarity.charge);
                if (current !== session) return;
                node.classList.remove('is-charging');
            }
            node.classList.add('is-flipped');
            fx.classList.add('is-active');
            if (rarity.effect === 'legend') overlay.classList.add('is-flashing');
            burst(stage, rarity);
            const { name } = describe(card);
            const announced = `${name}, ${getTranslation(`rarity_${rarity.id}`)}`;
            live.textContent = announced;
            node.setAttribute('aria-label', announced);
            setText(hint, index + 1 < drawn.length ? 'cards_next_hint' : 'cards_end_hint');
            state = 'up';
        });
        node.focus({ preventScroll: true });
    }

    // --- 3. Le résultat ---

    function showSummary(drawn) {
        session++;
        setPhase('summary');
        setText(title, remaining() ? 'cards_summary_title' : 'cards_complete');
        setText(hint, 'cards_summary_hint');
        stage.replaceChildren(...drawn.map((card, i) => {
            const node = createCard('div', card, describe(card), cards.indexOf(card) + 1, cards.length);
            node.classList.add('is-flipped', 'tcard--summary');
            node.style.setProperty('--i', i);
            return node;
        }));

        const collection = button('cards_see_collection', 'booster__btn booster__btn--main', close);
        actions.replaceChildren(collection);
        if (remaining()) actions.append(button('cards_again', 'booster__btn', () => showPack(false)));
        collection.focus({ preventScroll: true });
    }

    // --- Ouverture et fermeture ---

    function open({ isWelcome = false } = {}) {
        if (!overlay.hidden) return;
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
