// L'ouverture du site : une main de cartes en éventail sert de graduation à un VU-mètre, l'aiguille désigne une carte.
import { createCard, el, setText, text } from './card.js';
import { arc, point, svg, tick } from './meter.js';

const HALF = 48; // demi-ouverture de l'éventail, en degrés
const WEIGHTS = { legendary: 1.9, ultra: 1.2 }; // largeur d'une carte sur la graduation (1 par défaut)
const STRIP = 3.7; // largeur visible d'une carte dans l'éventail, en degrés
const NARROW = 896; // en pixels : en dessous, l'aiguille reste au zénith et la main tourne
const DRAG_STEP = 22; // en pixels, pour passer d'une carte à la suivante au doigt
const CLICK_THRESHOLD = 6;

/**
 * Les cartes découvertes sont de face, les autres de dos.
 * onOpen(card, origin) ouvre une fiche, onBooster() propose un booster.
 */
export function createDial(scene, { cards, describe, has, onOpen, onBooster }) {
    const hand = [...cards].sort((a, b) => a.rarity.level - b.rarity.level);
    const weights = hand.map((card) => WEIGHTS[card.rarity.id] ?? 1);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    /** Angle du bord gauche de la carte d'index i. */
    const edge = (i) => -HALF + 2 * HALF * weights.slice(0, i).reduce((sum, weight) => sum + weight, 0) / total;
    const angles = hand.map((card, i) => (edge(i) + edge(i + 1)) / 2);
    const start = (id) => {
        const i = hand.findIndex((card) => card.rarity.id === id);
        return i < 0 ? HALF : edge(i);
    };

    function drawScale() {
        const red = start('legendary');
        const color = (angle) => (angle >= red ? 'var(--crete)' : 'var(--encre)');
        let html = `<path d="${arc(50, 56.5, 45, -HALF, red)}" fill="none" style="stroke:var(--encre)" stroke-width=".3"/>`;
        html += `<path d="${arc(50, 56.5, 45.35, red, HALF)}" fill="none" style="stroke:var(--crete)" stroke-width="1"/>`;
        for (const angle of angles) html += `<path d="${tick(50, 56.5, 45, 46.2, angle)}" style="stroke:${color(angle)}" stroke-width=".2"/>`;
        for (const [label, angle] of [['−20', -HALF], ['−7', start('rare')], ['−3', start('ultra')], ['0', red], ['+3', HALF]]) {
            const [x, y] = point(50, 56.5, 48.2, angle);
            html += `<path d="${tick(50, 56.5, 44.6, 47, angle)}" style="stroke:${color(angle)}" stroke-width=".4"/>`;
            html += `<text class="${angle >= red ? 'is-red' : ''}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)})">${label}</text>`;
        }
        return svg('dial__scale', '0 0 100 56.5', html);
    }

    let current = -1;
    let drag = null;
    let dragged = false;
    let pressed = { index: -1, touch: false }; // carte visée au début du clic : le focus la change avant la fin
    const isNarrow = () => scene.parentElement.clientWidth < NARROW;

    const slots = hand.map((card, i) => {
        const slot = el('button', 'dial__card', { type: 'button', tabIndex: -1 });
        slot.style.setProperty('--a', `${angles[i].toFixed(2)}deg`);
        slot.addEventListener('focus', () => aim(i));
        slot.addEventListener('click', (event) => {
            if (dragged && event.detail) return; // fin d'un glisser
            aim(i);
            // Au doigt, le premier appui vise et le second ouvre.
            if (!event.detail || !pressed.touch || pressed.index === i) act();
        });
        return slot;
    });
    const handNode = el('div', 'dial__hand', {}, ...slots);
    handNode.setAttribute('role', 'group');
    const needle = el('div', 'dial__needle');
    const pivot = el('div', 'dial__pivot', {}, drawScale(), handNode, needle);
    const level = el('p', 'dial__level');
    const name = el('p', 'dial__name');
    const role = el('p', 'dial__role');
    const button = text('button', 'btn btn--plate', 'dial_open');
    button.type = 'button';
    button.addEventListener('click', () => act());
    /** Flèche vers la carte voisine ; au bout de la main, on repart de l'autre côté. */
    function arrow(step, path) {
        const node = el('button', 'dial__arrow', { type: 'button' }, svg('dial__chevron', '0 0 24 24',
            `<path d="${path}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`));
        node.addEventListener('click', () => aim((current + step + hand.length) % hand.length));
        return node;
    }
    const previous = arrow(-1, 'M15 4 7 12l8 8');
    const next = arrow(1, 'M9 4l8 8-8 8');
    const plate = el('div', 'dial__plate', {}, level, name, role, el('div', 'dial__controls', {}, previous, button, next));
    scene.append(pivot, plate);

    function act() {
        const card = hand[current];
        if (has(card)) onOpen(card, slots[current]);
        else onBooster();
    }

    function turn() {
        pivot.style.setProperty('--turn', `${isNarrow() ? -angles[current] : 0}deg`);
    }

    function describeAim() {
        const card = hand[current];
        const isShown = has(card);
        const content = describe(card);
        if (isShown) plate.dataset.rarity = card.rarity.id;
        else delete plate.dataset.rarity;
        for (const node of [level, name, role]) delete node.dataset.i18n;
        if (isShown) {
            setText(level, `rarity_${card.rarity.id}`);
            name.textContent = content.name;
            if (content.role) role.textContent = [content.role, content.year].filter(Boolean).join(', ');
            else setText(role, `type_${card.type}`);
        } else {
            level.textContent = '−∞ VU';
            setText(name, 'cards_hidden');
            role.textContent = `${cards.indexOf(card) + 1} / ${cards.length}`;
        }
        setText(button, isShown ? 'dial_open' : 'cards_open_booster');
    }

    function aim(i) {
        if (i === current) return;
        slots[current]?.classList.remove('is-raised');
        if (slots[current]) slots[current].tabIndex = -1;
        current = i;
        slots[i].classList.add('is-raised');
        slots[i].tabIndex = 0;
        needle.style.setProperty('--needle', `${angles[i]}deg`);
        turn();
        describeAim();
    }

    const closest = (angle) => angles.reduce((best, value, i) => (Math.abs(value - angle) < Math.abs(angles[best] - angle) ? i : best), 0);

    scene.addEventListener('pointermove', (event) => {
        if (isNarrow()) {
            if (!drag) return;
            const distance = event.clientX - drag.x;
            dragged ||= Math.abs(distance) >= CLICK_THRESHOLD;
            if (dragged) aim(Math.min(Math.max(drag.index - Math.round(distance / DRAG_STEP), 0), hand.length - 1));
            return;
        }
        if (event.pointerType === 'touch' || plate.contains(event.target)) return;
        const box = scene.getBoundingClientRect();
        const x = event.clientX - (box.left + box.width / 2);
        const y = box.top + box.width * 0.565 - event.clientY;
        const radius = Math.hypot(x, y) / box.width;
        if (radius > 0.24 && radius < 0.53) aim(closest(Math.atan2(x, y) * 180 / Math.PI - STRIP / 2));
    });
    scene.addEventListener('pointerdown', (event) => {
        dragged = false;
        pressed = { index: current, touch: event.pointerType !== 'mouse' };
        if (isNarrow()) drag = { x: event.clientX, index: current };
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) scene.addEventListener(type, () => { drag = null; });

    handNode.addEventListener('keydown', (event) => {
        const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
        let target = event.key === 'Home' ? 0 : event.key === 'End' ? hand.length - 1 : null;
        if (step) target = Math.min(Math.max(current + step, 0), hand.length - 1);
        if (target === null) return;
        event.preventDefault();
        aim(target);
        slots[target].focus({ preventScroll: true });
    });

    new ResizeObserver(() => { if (current >= 0) turn(); }).observe(scene);

    /** Refait les cartes : découvertes, langue. */
    function update() {
        handNode.setAttribute('aria-label', getTranslation('dial_hand'));
        previous.setAttribute('aria-label', getTranslation('dial_previous'));
        next.setAttribute('aria-label', getTranslation('dial_next'));
        hand.forEach((card, i) => {
            const isShown = has(card);
            const content = describe(card);
            const face = createCard('span', card, content, cards.indexOf(card) + 1, cards.length, { tilts: false });
            face.classList.toggle('is-flipped', isShown);
            slots[i].replaceChildren(face);
            slots[i].setAttribute('aria-label', isShown
                ? [content.name, content.role, content.year, getTranslation(`rarity_${card.rarity.id}`)].filter(Boolean).join(', ')
                : `${getTranslation('cards_hidden')}, ${cards.indexOf(card) + 1} / ${cards.length}`);
        });
        if (current >= 0) {
            describeAim();
            return;
        }
        // Au départ, l'aiguille vise la carte découverte la plus rare.
        const best = hand.findLastIndex((card) => has(card) && card.isProject);
        aim(best >= 0 ? best : Math.floor(hand.length / 2));
    }

    /** Vise une carte, par exemple la dernière découverte. */
    function aimAt(card) {
        aim(hand.indexOf(card));
    }

    return { update, aimAt };
}
