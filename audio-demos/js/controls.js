// Commandes de l'établi : potard, levier et touches. Chacune repose sur un vrai contrôle de formulaire, utilisable au clavier.

const SWEEP = 270; // course d'un potard, en degrés
const TRAVEL = 180; // en pixels de glisser pour toute la course
const TICKS = 21;

export function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
}

export function svg(viewBox, html, className = '') {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('viewBox', viewBox);
    node.setAttribute('aria-hidden', 'true');
    if (className) node.setAttribute('class', className);
    node.innerHTML = html;
    return node;
}

/** Regroupe les appels : au plus un par frame, avec la dernière valeur. */
export function perFrame(fn) {
    let frame = 0;
    let latest;
    return (...args) => {
        latest = args;
        frame ||= requestAnimationFrame(() => {
            frame = 0;
            fn(...latest);
        });
    };
}

const polar = (radius, angle) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return `${(50 + radius * Math.cos(radians)).toFixed(2)} ${(50 + radius * Math.sin(radians)).toFixed(2)}`;
};
const arc = (radius, from, to) => `M${polar(radius, from)}A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${polar(radius, to)}`;

/** Potard : glisser vers le haut ou la droite, ou flèches du clavier. reversed : le minimum est à droite. */
export function createKnob({ id, min, max, step, value, reversed, label }, onChange) {
    const input = el('input', { type: 'range', id, min, max, step, className: 'knob__input' });
    input.value = value;
    if (reversed) input.classList.add('is-reversed');
    const fraction = () => {
        const ratio = (Number(input.value) - min) / (max - min);
        return reversed ? 1 - ratio : ratio;
    };

    let ticks = '';
    for (let i = 0; i < TICKS; i++) {
        const angle = -SWEEP / 2 + (SWEEP * i) / (TICKS - 1);
        ticks += `<path class="knob__tick" d="M${polar(44, angle)}L${polar(i % 5 ? 46.5 : 49, angle)}"/>`;
    }
    const dial = svg('0 0 100 100', `${ticks}<path class="knob__lit" d=""/><circle class="knob__body" cx="50" cy="50" r="31"/><g class="knob__rotor"><path d="M50 22V36"/></g>`, 'knob__dial');
    const lit = dial.querySelector('.knob__lit');
    const rotor = dial.querySelector('.knob__rotor');
    const node = el('div', { className: 'knob' }, dial, input);

    const draw = () => {
        const angle = -SWEEP / 2 + SWEEP * fraction();
        rotor.setAttribute('transform', `rotate(${angle.toFixed(1)} 50 50)`);
        lit.setAttribute('d', fraction() > 0.004 ? arc(39, -SWEEP / 2, angle) : '');
    };
    const send = perFrame(onChange);
    const changed = () => {
        draw();
        send(Number(input.value));
    };
    input.addEventListener('input', changed);

    let grab = null;
    node.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        input.focus({ preventScroll: true });
        grab = { x: event.clientX, y: event.clientY, fraction: fraction() };
        node.setPointerCapture(event.pointerId);
        node.classList.add('is-turning');
    });
    node.addEventListener('pointermove', (event) => {
        if (!grab) return;
        const moved = (event.clientX - grab.x + grab.y - event.clientY) / TRAVEL;
        const next = Math.min(Math.max(grab.fraction + moved, 0), 1);
        input.value = min + (max - min) * (reversed ? 1 - next : next);
        changed();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        node.addEventListener(type, () => {
            grab = null;
            node.classList.remove('is-turning');
        });
    }
    draw();
    if (label) input.setAttribute('aria-label', label);
    return { node, input };
}

/** Levier à deux positions, chacune avec son voyant. */
export function createLever({ id, label, labels, index }, onChange) {
    const sides = labels.map((text) => el('span', { className: 'lever__side', textContent: text, ariaHidden: 'true' }));
    const button = el('button', { type: 'button', className: 'lever', id },
        sides[0], el('span', { className: 'lever__plate', ariaHidden: 'true' }, el('span', { className: 'lever__stick' })), sides[1]);
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-label', label);
    let current = index;
    const draw = () => {
        button.setAttribute('aria-checked', String(current === 1));
        sides.forEach((side, i) => side.classList.toggle('is-on', i === current));
    };
    button.addEventListener('click', () => {
        current = 1 - current;
        draw();
        onChange(current);
    });
    draw();
    return button;
}

/** Rangée de touches : une seule enfoncée. */
export function createPads({ id, legend, labels, index, numbers }, onChange) {
    const pads = labels.map((text, i) => {
        const input = el('input', { type: 'radio', name: id, value: i, checked: i === index });
        input.addEventListener('change', () => onChange(i));
        return el('label', { className: 'pad' }, input,
            el('span', { className: 'pad__key' }, el('span', { className: 'pad__number', textContent: numbers?.[i] ?? i + 1, ariaHidden: 'true' }), el('span', { textContent: text })));
    });
    return el('fieldset', { className: 'pads' }, el('legend', { className: 'control__name', textContent: legend }), el('div', { className: 'pads__row' }, ...pads));
}
