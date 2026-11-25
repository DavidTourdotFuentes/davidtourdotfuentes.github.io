// La timeline : les projets par année, du plus récent au plus ancien, comme les clips d'un montage. Lisible sans ouvrir de booster.
import { el, text } from './card.js';
import { createKnob, createWave } from './meter.js';

const PLAYHEAD = 0.55; // hauteur de la tête de lecture dans l'écran, de 0 (haut) à 1 (bas)

/** onOpen(card, origin) reçoit aussi l'élément d'où la carte doit sortir. Une carte sans année n'apparaît pas. */
export function createTimeline(root, { cards, describe, onOpen }) {
    const list = el('ol', 'timeline__years');
    const head = el('span', 'timeline__head');
    root.append(el('span', 'timeline__rail', {}, el('span', 'timeline__played'), head), list);

    function clip(card) {
        const { name, role, html } = describe(card);
        const knob = createKnob(card.rarity);
        const description = el('span', 'clip__text');
        description.innerHTML = html; // textes de data.js, qui contiennent des <br>
        const node = el('button', 'clip', { type: 'button' },
            el('span', 'clip__wave', {}, createWave(name, 16)), // nombre pair : le défilement boucle sans saut
            el('span', 'clip__head', {}, el('span', 'clip__name', { textContent: name }), knob),
            el('span', 'clip__role', { textContent: role }),
            description,
            text('span', 'sr-only', `rarity_${card.rarity.id}`));
        node.dataset.rarity = card.rarity.id;
        node.addEventListener('click', () => onOpen(card, knob));
        return el('li', '', {}, node);
    }

    function render() {
        const years = new Map();
        for (const card of cards) {
            const { year } = describe(card);
            if (year) years.set(year, [...(years.get(year) ?? []), card]);
        }
        list.replaceChildren(...[...years].sort(([a], [b]) => b - a).map(([year, group]) => el('li', 'timeline__year', {},
            el('h3', 'timeline__label', { textContent: year }),
            el('ul', 'timeline__clips', {}, ...group.map(clip)))));
        play();
    }

    /** La tête de lecture descend avec le défilement ; les années déjà passées s'allument. */
    function play() {
        const box = root.getBoundingClientRect();
        const played = Math.min(Math.max(window.innerHeight * PLAYHEAD - box.top, 0), box.height);
        root.style.setProperty('--played', `${played.toFixed(1)}px`);
        for (const year of list.children) year.classList.toggle('is-played', year.offsetTop <= played);
    }
    window.addEventListener('scroll', play, { passive: true });
    new ResizeObserver(play).observe(root);

    return { render };
}
