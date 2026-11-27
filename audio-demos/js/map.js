// Vue de dessus : le listener (une oreille) au centre, les distances d'atténuation autour de lui.
// Un clic dans sa portée fait partir l'explosion de cet endroit.
import { attr, t, text } from './i18n.js';

const MARGIN = 1.15; // espace visible au-delà de la distance max
const KEY_STEPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
const SIDE = 0.05; // en fraction de la distance max : plus près de l'axe, l'explosion n'est ni à gauche ni à droite

// Une oreille vue de profil : le pavillon et sa conque
const EAR = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 2.6-1.4 3.7-2.6 4.9-1 1-1.2 1.9-1.4 3.1-.3 1.9-1.6 3-3.3 3-1.5 0-2.7-1-3-2.4"/>
    <path d="M9.5 9.8a2.5 2.5 0 0 1 5 0c0 1.3-.9 1.9-1.6 2.5"/>
</svg>`;

function div(className) {
    const node = document.createElement('div');
    node.className = className;
    return node;
}

/**
 * Renvoie { node, surface, setRange, pulse }. surface est le bouton qui déclenche l'event. Le haut de la carte est l'avant du listener (axe z de FMOD).
 * onFire(position, { flipped }) : position de l'explosion en unités FMOD { x, z } ; flipped si elle est passée de l'autre côté de l'oreille
 * par rapport à la précédente. Au clavier, les flèches déplacent la cible et Entrée déclenche.
 */
export function createMap({ range, onFire }) {
    const minRing = div('map__ring map__ring--min');
    const maxRing = div('map__ring map__ring--max');
    const minLabel = div('map__label');
    const maxLabel = div('map__label');
    const listener = div('map__listener');
    listener.innerHTML = EAR;

    const surface = document.createElement('button');
    surface.type = 'button';
    surface.className = 'map__surface';
    attr(surface, 'aria-label', 'lab_map_label');
    const blast = div('map__blast'); // l'explosion, là où l'on a cliqué
    const target = div('map__target'); // la cible du clavier, visible au focus
    const shockwave = div('map__ring map__shockwave');

    const readout = document.createElement('output');
    readout.className = 'map__readout';
    readout.setAttribute('aria-live', 'polite');
    const node = div('map');
    node.append(maxRing, minRing, maxLabel, minLabel, surface, shockwave, blast, target, listener, readout);

    let [min, max] = range;
    let aim = { x: max * 0.45, z: max * 0.45 }; // cible du clavier
    let last = null; // dernière explosion
    const extent = () => max * MARGIN;
    const percent = (value) => `${(value / extent()) * 50}%`;
    const put = (element, { x, z }) => {
        element.style.left = `calc(50% + ${percent(x)})`;
        element.style.top = `calc(50% - ${percent(z)})`;
    };

    let distance = null;
    text(readout, 'lab_map_distance', () => ({ distance }));
    readout.hidden = true;

    /** Distances d'atténuation lues dans FMOD. Les positions gardent leur place à l'écran : elles suivent l'échelle. */
    function setRange([newMin, newMax]) {
        const scale = newMax / max;
        min = newMin;
        max = newMax;
        for (const [ring, label, name, value] of [[minRing, minLabel, 'min', min], [maxRing, maxLabel, 'max', max]]) {
            ring.style.width = ring.style.height = `${(value / extent()) * 100}%`;
            label.textContent = `${name} ${Number(value.toFixed(1))}`;
            label.style.top = `calc(50% - ${percent(value)})`;
        }
        aim = { x: aim.x * scale, z: aim.z * scale };
        put(target, aim);
        if (last) {
            last = { x: last.x * scale, z: last.z * scale };
            put(blast, last);
        }
    }

    /** L'onde de choc part de l'explosion. */
    function pulse() {
        if (!last || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        for (const animated of [blast, shockwave]) animated.getAnimations().forEach((animation) => animation.cancel());
        put(shockwave, last);
        shockwave.style.width = shockwave.style.height = minRing.style.width;
        blast.animate(
            [{ transform: 'translate(-50%, -50%) scale(1)' }, { transform: 'translate(-50%, -50%) scale(2.6)', offset: 0.2 }, { transform: 'translate(-50%, -50%) scale(1)' }],
            { duration: 650, easing: 'ease-out' },
        );
        shockwave.animate(
            [
                { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 1 },
                { transform: 'translate(-50%, -50%) scale(2.2)', opacity: 0 },
            ],
            { duration: 900, easing: 'cubic-bezier(0.1, 0.6, 0.4, 1)' },
        );
    }

    function fire(position) {
        if (surface.getAttribute('aria-disabled') === 'true') return; // une autre expérience se charge
        const side = (p) => (Math.abs(p.x) < max * SIDE ? 0 : Math.sign(p.x));
        const flipped = Boolean(last && side(last) && side(position) && side(last) !== side(position));
        last = position;
        put(blast, last);
        blast.classList.add('is-set');
        distance = Math.hypot(position.x, position.z).toFixed(1);
        readout.hidden = false;
        readout.textContent = t('lab_map_distance', { distance });
        onFire({ ...position }, { flipped });
    }

    /** Position FMOD sous le pointeur ; null hors de la portée du listener. */
    function positionAt(event) {
        const box = node.getBoundingClientRect();
        const scale = (2 * extent()) / box.width;
        const position = { x: (event.clientX - box.left - box.width / 2) * scale, z: (box.top + box.height / 2 - event.clientY) * scale };
        return Math.hypot(position.x, position.z) <= max ? position : null;
    }

    surface.addEventListener('pointermove', (event) => surface.classList.toggle('is-out', !positionAt(event)));
    surface.addEventListener('click', (event) => {
        if (event.detail === 0) { // Entrée ou Espace : à la cible du clavier
            fire({ ...aim });
            return;
        }
        const position = positionAt(event);
        if (position) fire(position);
    });
    surface.addEventListener('keydown', (event) => {
        const step = KEY_STEPS[event.key];
        if (!step) return;
        event.preventDefault(); // sinon la page défile
        const size = max / (event.shiftKey ? 4 : 20);
        const next = { x: aim.x + step[0] * size, z: aim.z + step[1] * size };
        const length = Math.hypot(next.x, next.z);
        aim = length > max ? { x: (next.x / length) * max, z: (next.z / length) * max } : next; // la cible reste dans la portée
        put(target, aim);
    });

    setRange(range);
    return { node, surface, setRange, pulse };
}
