// La timeline : les projets par année, du plus récent au plus ancien, comme les clips d'un montage. Lisible sans ouvrir de booster.
// Les évènements s'y posent en marqueurs, à leur date : chaque année de la règle est graduée en douze mois, décembre en haut.
import { el, text } from './card.js';
import { dayOf } from './content.js';
import { createKnob } from './meter.js';

const PLAYHEAD = 0.55; // hauteur de la tête de lecture dans l'écran, de 0 (haut) à 1 (bas)
const MARKER_GAP = 8; // px entre deux marqueurs

/** Place d'un jour dans son année, de 0 (31 décembre, en haut) à 1 (1er janvier, en bas). */
function depthOf(day) {
    const start = Date.UTC(day.getUTCFullYear(), 0);
    const end = Date.UTC(day.getUTCFullYear() + 1, 0);
    return 1 - (day - start) / (end - start);
}

/** onOpen(card, origin) reçoit aussi l'élément d'où la carte doit sortir. Sans année ou sans date lisible, rien n'apparaît. */
export function createTimeline(root, { cards, events, describe, describeEvent, onOpen }) {
    const list = el('ol', 'timeline__years');
    const head = el('span', 'timeline__head');
    root.append(el('span', 'timeline__rail', {}, el('span', 'timeline__played'), head), list);
    const dates = events.map((event) => ({ event, day: dayOf(event.date) })).filter(({ day }) => day).sort((a, b) => b.day - a.day);

    /** Bannière du clip : l'image du projet (banner dans data.js, sinon celle de la carte), calée sur focus. */
    function clipBanner({ image, focus }) {
        const img = el('img', '', { src: image, alt: '', loading: 'lazy', decoding: 'async' });
        if (focus) img.style.setProperty('--focus', focus);
        return el('span', 'clip__banner', {}, img);
    }

    function clip(card) {
        const { name, role, html, banner } = describe(card);
        const knob = createKnob(card.rarity);
        const description = el('span', 'clip__text');
        description.innerHTML = html; // textes de data.js, qui contiennent des <br>
        const node = el('button', 'clip', { type: 'button' },
            clipBanner(banner),
            el('span', 'clip__head', {}, el('span', 'clip__name', { textContent: name }), knob),
            el('span', 'clip__role', {}, role || text('span', '', `type_${card.type}`)),
            description,
            text('span', 'sr-only', `rarity_${card.rarity.id}`));
        node.dataset.rarity = card.rarity.id;
        node.addEventListener('click', () => onOpen(card, knob));
        return el('li', '', {}, node);
    }

    function marker({ event, day }) {
        const { title, date } = describeEvent(event, day);
        return el('li', 'marker', { depth: depthOf(day) },
            el('span', 'marker__flag', {},
                el('time', 'marker__date', { textContent: date, dateTime: day.toISOString().slice(0, 10) }),
                el('span', 'marker__title', { textContent: title })),
            el('span', 'marker__link'),
            el('span', 'marker__pin'));
    }

    function yearBlock(year, { group, markers }) {
        const items = group.map(clip);
        // Sur téléphone, les marqueurs s'intercalent entre les clips ; ailleurs, place() les pose sur la règle.
        // Du plus ancien au plus récent : une insertion ne décale pas les rangs des suivantes.
        for (const date of [...markers].reverse()) {
            const node = marker(date);
            items.splice(Math.round(node.depth * group.length), 0, node);
        }
        return el('li', 'timeline__year', {},
            el('span', 'timeline__months'),
            el('h3', 'timeline__label', { textContent: year }),
            el('ul', 'timeline__clips', {}, ...items));
    }

    function render() {
        const years = new Map();
        const at = (year) => {
            if (!years.has(year)) years.set(year, { group: [], markers: [] });
            return years.get(year);
        };
        for (const card of cards) {
            const { year } = describe(card);
            if (year) at(year).group.push(card);
        }
        for (const date of dates) at(String(date.day.getUTCFullYear())).markers.push(date);
        list.replaceChildren(...[...years].sort(([a], [b]) => b - a).map(([year, content]) => yearBlock(year, content)));
        place();
    }

    /** Pose chaque marqueur à sa date. Trop proches, les étiquettes s'écartent ; leur repère reste à la date exacte. */
    function place() {
        for (const year of list.children) {
            const markers = [...year.querySelectorAll('.marker')];
            if (!markers.length) continue;
            year.style.minHeight = '';
            if (getComputedStyle(markers[0]).position !== 'absolute') continue;

            const months = year.querySelector('.timeline__months');
            const start = months.offsetTop;
            const heights = markers.map((node) => node.offsetHeight + MARKER_GAP);
            const needed = heights.reduce((sum, height) => sum + height, 0);
            if (needed > months.offsetHeight) year.style.minHeight = `${year.offsetHeight - months.offsetHeight + needed}px`;
            const length = months.offsetHeight;

            const exact = markers.map(({ depth }) => start + depth * length);
            const tops = [];
            let floor = start;
            exact.forEach((y, i) => {
                tops[i] = Math.max(y - heights[i] / 2, floor);
                floor = tops[i] + heights[i];
            });
            let ceiling = start + length;
            for (let i = tops.length - 1; i >= 0; i--) {
                tops[i] = Math.min(tops[i], ceiling - heights[i]);
                ceiling = tops[i];
            }
            markers.forEach((node, i) => {
                const top = tops[i] + MARKER_GAP / 2;
                node.style.setProperty('--at', `${top.toFixed(1)}px`);
                node.style.setProperty('--shift', `${(exact[i] - top - node.offsetHeight / 2).toFixed(1)}px`);
            });
        }
        play();
    }

    /** La tête de lecture descend avec le défilement ; les années et les évènements déjà passés s'allument. */
    function play() {
        const box = root.getBoundingClientRect();
        const played = Math.min(Math.max(window.innerHeight * PLAYHEAD - box.top, 0), box.height);
        root.style.setProperty('--played', `${played.toFixed(1)}px`);
        for (const year of list.children) year.classList.toggle('is-played', year.offsetTop <= played);
        for (const pin of list.querySelectorAll('.marker__pin')) {
            const { top, height } = pin.getBoundingClientRect();
            pin.parentNode.classList.toggle('is-played', top + height / 2 - box.top <= played);
        }
    }
    window.addEventListener('scroll', play, { passive: true });
    new ResizeObserver(place).observe(root);
    document.fonts.ready.then(place); // les étiquettes changent de hauteur avec leur police

    return { render };
}
