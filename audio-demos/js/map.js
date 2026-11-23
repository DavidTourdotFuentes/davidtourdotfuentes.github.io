// Vue de dessus : la source à cliquer au centre, le listener à déplacer, les distances d'atténuation.

const MARGIN = 1.15; // espace visible au-delà de la distance max
const DRAG_THRESHOLD = 4; // en pixels : en dessous, c'est un clic et non un glisser
const KEY_STEPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

const HEADPHONES = `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 16v-4a8 8 0 0 1 16 0v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <rect x="2.5" y="13" width="5" height="8" rx="2" fill="currentColor"/>
    <rect x="16.5" y="13" width="5" height="8" rx="2" fill="currentColor"/>
</svg>`;

function div(className, text = '') {
    const node = document.createElement('div');
    node.className = className;
    node.textContent = text;
    return node;
}

/**
 * Renvoie { node, source, setRange, pulse }. source est le bouton qui déclenche l'event. Le haut de la carte est l'avant du listener (axe z de FMOD).
 * onMove reçoit la position du listener en unités FMOD : { x, z }.
 */
export function createMap({ range, listener, onMove }) {
    const minRing = div('map__ring map__ring--min');
    const maxRing = div('map__ring map__ring--max');
    const minLabel = div('map__label');
    const maxLabel = div('map__label');
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'map__listener';
    handle.innerHTML = HEADPHONES;
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', 'Listener : glisser, ou utiliser les flèches du clavier');

    const source = document.createElement('button');
    source.type = 'button';
    source.className = 'map__source';
    const dot = div('map__dot');
    source.append(dot);
    const shockwave = div('map__ring map__shockwave');

    const readout = document.createElement('output');
    readout.className = 'map__readout';
    const node = div('map');
    node.append(maxRing, minRing, shockwave, maxLabel, minLabel, readout, source, handle);
    readout.setAttribute('aria-live', 'off');

    const position = { x: listener[0], z: listener[1] };
    let [min, max] = range;
    const extent = () => max * MARGIN;
    const percent = (value) => `${(value / extent()) * 50}%`;

    function place() {
        handle.style.left = `calc(50% + ${percent(position.x)})`;
        handle.style.top = `calc(50% - ${percent(position.z)})`;
        const distance = Math.hypot(position.x, position.z).toFixed(1);
        readout.textContent = `Distance : ${distance}`;
        handle.setAttribute('aria-valuemin', '0');
        handle.setAttribute('aria-valuemax', (extent() * Math.SQRT2).toFixed(1));
        handle.setAttribute('aria-valuenow', distance);
        handle.setAttribute('aria-valuetext', `Distance ${distance}`);
    }

    function moveTo(x, z) {
        const limit = extent();
        position.x = Math.min(Math.max(x, -limit), limit);
        position.z = Math.min(Math.max(z, -limit), limit);
        place();
        onMove({ ...position });
    }

    /** Distances d'atténuation lues dans FMOD. Le listener reste en place à l'écran : sa position suit l'échelle. */
    function setRange([newMin, newMax]) {
        const scale = newMax / max;
        min = newMin;
        max = newMax;
        for (const [ring, label, name, value] of [[minRing, minLabel, 'min', min], [maxRing, maxLabel, 'max', max]]) {
            ring.style.width = ring.style.height = `${(value / extent()) * 100}%`;
            label.textContent = `${name} ${Number(value.toFixed(1))}`;
            label.style.top = `calc(50% - ${percent(value)})`;
        }
        shockwave.style.width = shockwave.style.height = maxRing.style.width;
        if (scale === 1) place();
        else moveTo(position.x * scale, position.z * scale);
    }

    /** Le point gonfle puis revient, et une onde part du centre jusqu'à la distance max. */
    function pulse() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        for (const animated of [dot, shockwave]) animated.getAnimations().forEach((animation) => animation.cancel());
        dot.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(2.4)', offset: 0.25 }, { transform: 'scale(1)' }],
            { duration: 600, easing: 'ease-out' },
        );
        shockwave.animate(
            [
                { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
            ],
            { duration: 1400, easing: 'cubic-bezier(0.1, 0.6, 0.4, 1)' },
        );
    }

    // Décalage entre le pointeur et le centre du listener, pour qu'il ne saute pas à la prise.
    let grab = null;
    let dragged = false;
    handle.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const box = handle.getBoundingClientRect();
        grab = {
            x: event.clientX - (box.left + box.width / 2),
            y: event.clientY - (box.top + box.height / 2),
            startX: event.clientX,
            startY: event.clientY,
        };
        dragged = false;
        handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', (event) => {
        if (!grab) return;
        dragged ||= Math.hypot(event.clientX - grab.startX, event.clientY - grab.startY) >= DRAG_THRESHOLD;
        if (!dragged) return;
        const box = node.getBoundingClientRect();
        const scale = (2 * extent()) / box.width;
        moveTo(
            (event.clientX - grab.x - box.left - box.width / 2) * scale,
            (box.top + box.height / 2 - event.clientY + grab.y) * scale,
        );
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        handle.addEventListener(type, () => { grab = null; });
    }
    // Un simple clic sur le listener posé devant la source déclenche quand même l'event.
    handle.addEventListener('click', (event) => {
        if (dragged) return;
        const box = source.getBoundingClientRect();
        const inside = event.clientX >= box.left && event.clientX <= box.right
            && event.clientY >= box.top && event.clientY <= box.bottom;
        if (inside) source.click();
    });
    handle.addEventListener('keydown', (event) => {
        const step = KEY_STEPS[event.key];
        if (!step) return;
        event.preventDefault(); // sinon la page défile
        const size = max / (event.shiftKey ? 4 : 20);
        moveTo(position.x + step[0] * size, position.z + step[1] * size);
    });

    setRange(range);
    return { node, source, setRange, pulse };
}
