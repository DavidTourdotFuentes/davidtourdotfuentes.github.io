// L'ouverture du site : une main de cartes en éventail sert de graduation à un VU-mètre, l'aiguille désigne une carte.
import { createCard, el, iconButton, setText, text, typeLine } from './card.js';
import { arc, point, svg, tick } from './meter.js';
import { TYPES } from './config.js';

// Géométrie, en part de la largeur du cadran. cards.css la reçoit en variables : --radius, --center, --size et --dome.
const RADIUS = 0.86; // rayon de la graduation : plus il est grand, plus la courbe est douce
const CENTER = 1.005; // distance du haut du cadran au centre du cercle
const SIZE = 0.122; // largeur d'une carte
const DOME = 0.655; // rayon de la plaque, concentrique à la main
const HALF = 32; // demi-ouverture de l'éventail, en degrés
const FULL = SIZE / RADIUS * 180 / Math.PI; // ouverture d'une carte entière, en degrés
const LIFT_MAX = 26.5; // la carte levée se centre sur l'aiguille, mais pas au-delà de cet angle : elle sortirait de l'écran
const WEIGHTS = { legendary: 1.9, epic: 1.2 }; // largeur d'une carte sur la graduation (1 par défaut)
const NARROW = 896; // en pixels : en dessous, l'aiguille reste au zénith et la main tourne
const DRAG_STEP = 22; // en pixels, pour passer d'une carte à la suivante au doigt
const CLICK_THRESHOLD = 6;

/**
 * Les cartes découvertes sont de face, les autres de dos.
 * onOpen(card, origin) ouvre une fiche, onBooster() propose un booster, onRevealAll() (facultatif) propose de tout révéler.
 */
export function createDial(scene, { cards, describe, has, onOpen, onBooster, onRevealAll }) {
    // De la Commune à la Légendaire, puis par type dans l'ordre de TYPES (projets, compétences, parcours)
    const typeOrder = Object.keys(TYPES);
    const hand = [...cards].sort((a, b) => a.rarity.level - b.rarity.level || typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
    const weights = hand.map((card) => WEIGHTS[card.rarity.id] ?? 1);
    // La dernière carte n'est recouverte par aucune autre : elle prend toute sa largeur, les autres se partagent le reste.
    const unit = (2 * HALF - FULL) / weights.slice(0, -1).reduce((sum, weight) => sum + weight, 0);
    /** Angle du bord gauche de la carte d'index i. */
    const edge = (i) => -HALF + unit * weights.slice(0, i).reduce((sum, weight) => sum + weight, 0);
    const angles = hand.map((card, i) => edge(i) + unit * weights[i] / 2); // milieu de la tranche visible : l'aiguille la vise
    const start = (id) => {
        const i = hand.findIndex((card) => card.rarity.id === id);
        return i < 0 ? HALF : edge(i);
    };

    function drawScale() {
        const r = RADIUS * 100;
        const cy = CENTER * 100;
        const red = start('legendary');
        const color = (angle) => (angle >= red ? 'var(--crete)' : 'var(--encre)');
        let html = `<path d="${arc(50, cy, r, -HALF, red)}" fill="none" style="stroke:var(--encre)" stroke-width=".3"/>`;
        html += `<path d="${arc(50, cy, r + 0.35, red, HALF)}" fill="none" style="stroke:var(--crete)" stroke-width="1"/>`;
        for (const angle of angles) html += `<path d="${tick(50, cy, r, r + 1.1, angle)}" style="stroke:${color(angle)}" stroke-width=".2"/>`;
        for (const [label, angle] of [['−20', -HALF], ['−7', start('rare')], ['−3', start('epic')], ['0', red], ['+3', HALF]]) {
            const [x, y] = point(50, cy, r + 2.7, angle);
            html += `<path d="${tick(50, cy, r - 0.4, r + 1.8, angle)}" style="stroke:${color(angle)}" stroke-width=".4"/>`;
            html += `<text class="${angle >= red ? 'is-red' : ''}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(1)})">${label}</text>`;
        }
        return svg('dial__scale', `0 0 100 ${cy}`, html);
    }

    let current = -1;
    let drag = null;
    let dragged = false;
    let pressed = { index: -1, touch: false }; // carte visée au début du clic : le focus la change avant la fin
    const isNarrow = () => scene.parentElement.clientWidth < NARROW;

    const slots = hand.map((card, i) => {
        const slot = el('button', 'dial__card', { type: 'button', tabIndex: -1 });
        slot.style.setProperty('--a', `${(edge(i) + FULL / 2).toFixed(2)}deg`);
        const up = Math.min(Math.max(angles[i], -LIFT_MAX), LIFT_MAX);
        slot.style.setProperty('--up', `${up.toFixed(2)}deg`);
        slot.style.setProperty('--aim', `${angles[i].toFixed(2)}deg`); // sur téléphone, la main tourne : jamais hors de l'écran
        slot.addEventListener('focus', () => aim(i));
        slot.addEventListener('click', (event) => {
            if (dragged && event.detail) return; // fin d'un glisser
            if (event.detail && !pressed.touch && !isNarrow()) return; // à la souris, voir le clic du cadran
            aim(i);
            // Au doigt, le premier appui vise et le second ouvre.
            if (!event.detail || !pressed.touch || pressed.index === i) act();
        });
        return slot;
    });
    const handNode = el('div', 'dial__hand', {}, ...slots);
    handNode.setAttribute('role', 'group');
    handNode.addEventListener('mousedown', (event) => event.preventDefault()); // appuyer ne donne pas le focus, qui viserait la voisine
    const needle = el('div', 'dial__needle');
    const pivot = el('div', 'dial__pivot', {}, drawScale(), handNode, needle);
    const level = el('p', 'dial__level');
    const name = el('p', 'dial__name');
    const role = el('p', 'dial__role');
    const button = text('button', 'btn btn--plate', 'dial_open');
    button.type = 'button';
    button.addEventListener('click', () => act());
    // À droite du bouton, tant qu'il reste des cartes à découvrir. Sur téléphone, son icône seule (cards.css).
    const reveal = iconButton('cards_reveal_all', 'reveal', 'btn btn--plate-line dial__reveal', () => onRevealAll());
    reveal.hidden = !onRevealAll;
    /** Flèche vers la carte voisine ; au bout de la main, on repart de l'autre côté. */
    function arrow(step, path) {
        const node = el('button', 'dial__arrow', { type: 'button' }, svg('dial__chevron', '0 0 24 24',
            `<path d="${path}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`));
        node.addEventListener('click', () => aim((current + step + hand.length) % hand.length));
        return node;
    }
    const previous = arrow(-1, 'M15 4 7 12l8 8');
    const next = arrow(1, 'M9 4l8 8-8 8');
    const plate = el('div', 'dial__plate', {}, previous, el('div', 'dial__info', {}, level, name, role, el('div', 'dial__buttons', {}, button, reveal)), next);
    scene.style.cssText = `--radius:${RADIUS};--center:${CENTER};--size:${SIZE};--dome:${DOME};--half:${HALF}deg`;
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
        for (const node of [level, name]) delete node.dataset.i18n;
        if (isShown) {
            setText(level, `rarity_${card.rarity.id}`);
            name.textContent = content.name;
            role.replaceChildren(...typeLine(card, content));
        } else {
            level.textContent = '−∞ dB';
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

    /** Angle du pointeur s'il est sur la main, sinon null. */
    function angleAt(event) {
        if (plate.contains(event.target)) return null;
        const box = scene.getBoundingClientRect();
        const x = event.clientX - (box.left + box.width / 2);
        const y = box.top + box.width * CENTER - event.clientY;
        const radius = Math.hypot(x, y) / box.width;
        return radius > DOME && radius < RADIUS + 0.06 ? Math.atan2(x, y) * 180 / Math.PI : null;
    }

    // À la souris, on ouvre la carte visée : levée, elle a quitté le pointeur, qui est sur sa voisine ou dans le vide.
    scene.addEventListener('click', (event) => {
        if (!event.detail || pressed.touch || isNarrow()) return;
        const angle = angleAt(event);
        if (slots[current].contains(event.target) || (angle !== null && Math.abs(angle) <= HALF + 1)) act();
    });

    scene.addEventListener('pointermove', (event) => {
        if (isNarrow()) {
            if (!drag) return;
            const distance = event.clientX - drag.x;
            dragged ||= Math.abs(distance) >= CLICK_THRESHOLD;
            if (dragged) aim(Math.min(Math.max(drag.index - Math.round(distance / DRAG_STEP), 0), hand.length - 1));
            return;
        }
        const angle = event.pointerType === 'touch' ? null : angleAt(event);
        if (angle !== null) aim(closest(angle));
        scene.classList.toggle('is-previewing', angle !== null); // TEMPORAIRE : aperçu des FullArt
    });
    scene.addEventListener('pointerleave', () => scene.classList.remove('is-previewing')); // TEMPORAIRE : aperçu des FullArt
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
        reveal.hidden = !onRevealAll || cards.every(has);
        reveal.setAttribute('aria-label', getTranslation('cards_reveal_all'));
        handNode.setAttribute('aria-label', getTranslation('dial_hand'));
        previous.setAttribute('aria-label', getTranslation('dial_previous'));
        next.setAttribute('aria-label', getTranslation('dial_next'));
        hand.forEach((card, i) => {
            const isShown = has(card);
            const content = describe(card);
            const face = createCard('span', card, content, cards.indexOf(card) + 1, cards.length, { tilts: false });
            face.classList.toggle('is-flipped', isShown);
            // Dans l'éventail, la carte entière est une image : la FullArt, si la carte en a une
            if (content.fullArt) face.querySelector('.tcard__art').append(el('img', 'tcard__full', { src: content.fullArt, alt: '' }));
            // TEMPORAIRE : au survol de l'éventail, la carte levée montre sa FullArt en entier, pour juger son dessin
            if (content.fullArt) face.querySelector('.tcard__front').append(el('img', 'tcard__preview', { src: content.fullArt, alt: '' }));
            slots[i].replaceChildren(face);
            slots[i].setAttribute('aria-label', isShown
                ? [content.name, ...(content.label ? [content.label] : content.kind ? [getTranslation(`kind_${content.kind}`)] : [getTranslation(`type_${card.type}`), content.year]), getTranslation(`rarity_${card.rarity.id}`)].filter(Boolean).join(', ')
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
