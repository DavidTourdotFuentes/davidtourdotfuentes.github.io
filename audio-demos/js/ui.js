// Construction des expériences à partir du manifeste : à gauche le cahier, à droite l'établi.
import { createKnob, createLever, createPads, el, perFrame, svg } from './controls.js';
import { createCurve } from './curve.js';
import { createMap } from './map.js';
import { createProtocol, isDone } from './protocol.js';

export { perFrame };

const LEDS = ['rare', 'epic', 'jaune', 'crete']; // couleur de la trace, d'une expérience à l'autre

/** state : "idle", "loading", "ready", "locked" ou "error". Le texte n'est mis en avant que pour les deux derniers. */
export function setStatus(state, text) {
    const status = document.getElementById('status');
    document.getElementById('status-dot').dataset.state = state;
    status.dataset.state = state;
    if (status.textContent !== text) status.textContent = text;
}

/** Ajoute un message à la zone d'erreur de la page. */
export function showPageError(message) {
    const box = document.getElementById('page-error');
    box.textContent = box.textContent ? `${box.textContent}\n${message}` : message;
    box.hidden = false;
}

const STATE_LABELS = { loading: 'Chargement…', missing: 'Bank manquante', error: 'Erreur audio' };

/** state : "idle", "loading", "missing" ou "error". Le bouton reste cliquable pour réessayer. */
export function setEventState(button, state) {
    button.dataset.state = state;
    const text = STATE_LABELS[state] ?? button.dataset.label;
    const label = button.querySelector('.key__label');
    if (label) label.textContent = text;
    else button.title = button.ariaLabel = text; // point de la vue de dessus : pas de texte visible
    button.setAttribute('aria-busy', String(state === 'loading'));
}

export function setEventPlaying(button, playing) {
    button.setAttribute('aria-pressed', String(playing));
}

/** Le module en cours s'allume, et le câble qui en part. */
export function setLive(demo, playing) {
    document.getElementById(`demo-${demo.id}`)?.classList.toggle('is-live', playing);
}

/** Valeur FMOD d'un paramètre avant toute action de l'utilisateur. */
export function initialValue(param) {
    if (param.type === 'labeled') return param.default ?? 0;
    if (param.type === 'toggle') return param.values[param.default ?? 0];
    return param.default ?? param.min;
}

const nameOf = (param) => param.label ?? param.name;

/** Courbe temps réel du paramètre, sur l'étendue de ses valeurs possibles. */
function paramCurve(param, min, max, steps) {
    return createCurve({ min, max, steps, stepLabels: steps && param.labels, initial: initialValue(param), label: nameOf(param) });
}

/** Les yeux du monstre : ils s'ouvrent et grandissent quand il approche. near va de 0 à 1. */
function createEyes() {
    const eye = '<path class="eyes__lid" d="M0-11C9-11 16-5 18 0 16 5 9 11 0 11S-16 5-18 0C-16-5-9-11 0-11z"/><ellipse class="eyes__pupil" rx="3.4" ry="8"/>';
    const node = el('div', { className: 'eyes' }, svg('0 0 120 60', `<g transform="translate(34 30)"><g class="eyes__one">${eye}</g></g><g transform="translate(86 30)"><g class="eyes__one">${eye}</g></g>`));
    return { node, set: (near) => node.style.setProperty('--near', near.toFixed(3)) };
}
const VISUALS = { eyes: createEyes };

function renderContinuous(param, id, onChange) {
    const { min, max } = param;
    const knob = createKnob({ id, min, max, step: param.step ?? (max - min) / 100, value: initialValue(param), reversed: param.reversed }, onChange);
    const node = el('div', { className: 'control control--knob' }, el('label', { className: 'control__name', htmlFor: id, textContent: nameOf(param) }));
    const row = el('div', { className: 'control__knob' });
    if (param.ends) row.append(el('span', { className: 'control__end', textContent: param.ends[0] }));
    row.append(knob.node);
    if (param.ends) row.append(el('span', { className: 'control__end', textContent: param.ends[1] }));
    node.append(row);
    return { node, curve: paramCurve(param, min, max) };
}

/** Touches nommées ; la première vaut param.min. */
function renderStepped(param, id, onChange) {
    const values = param.labels.map((_, i) => param.min + i);
    const node = createPads({ id, legend: nameOf(param), labels: param.labels, numbers: values, index: initialValue(param) - param.min }, (i) => onChange(values[i]));
    return { node, curve: paramCurve(param, values[0], values.at(-1), values) };
}

function renderToggle(param, id, onChange) {
    const lever = createLever({ id, label: nameOf(param), labels: param.labels, index: param.default ?? 0 }, (i) => onChange(param.values[i]));
    const node = el('div', { className: 'control' }, el('span', { className: 'control__name', textContent: nameOf(param) }), lever);
    return { node, curve: paramCurve(param, Math.min(...param.values), Math.max(...param.values)) };
}

const PARAM_RENDERERS = {
    continuous: renderContinuous,
    stepped: renderStepped,
    toggle: renderToggle,
    labeled: (param, id, onChange) => ({
        node: createPads({ id, legend: nameOf(param), labels: param.labels, index: param.default ?? 0 }, onChange),
        curve: null,
    }),
};

function screen(title, canvas) {
    return el('figure', { className: 'screen' }, canvas, el('figcaption', { className: 'screen__title', textContent: title }));
}

/** Un event : sa touche, ses écrans et ses commandes. */
function renderEvent(demo, event, id, { onTrigger, onParam, onListener, displays, maps, scope, isPlaying, report }) {
    let map = null;
    if (event.spatial) {
        const { distance: range, listener } = event.spatial;
        map = createMap({
            range,
            listener,
            onMove: perFrame((position) => {
                onListener(event, position);
                report({ type: 'move' });
            }),
        });
        maps.set(event, map);
    }
    const button = map?.source ?? el('button', { type: 'button', className: 'key' }, el('span', { className: 'key__cap', ariaHidden: 'true' }), el('span', { className: 'key__label' }));
    button.dataset.label = event.label;
    setEventState(button, 'idle');
    button.dataset.mode = event.mode;
    if (event.mode === 'loop') setEventPlaying(button, false);
    button.addEventListener('click', () => onTrigger(button, demo, event));

    const wave = el('canvas', { className: 'scope' });
    wave.setAttribute('role', 'img');
    wave.setAttribute('aria-label', 'Forme d’onde du son en cours');
    scope.addScreen(wave, { isActive: () => isPlaying(event) });
    const screens = el('div', { className: 'screens' }, screen('Signal', wave));

    const controls = el('div', { className: 'controls' });
    if (map) controls.append(map.node);
    else controls.append(el('div', { className: 'control control--key' }, button));
    (event.parameters ?? []).forEach((param, i) => {
        const { node, curve } = PARAM_RENDERERS[param.type](param, `${id}-p${i}`, (value) => {
            onParam(event, param, value);
            report({ type: 'param', value });
        });
        const visual = VISUALS[param.visual]?.();
        if (curve) {
            screens.append(screen(nameOf(param), curve.node));
            const near = (value) => visual?.set((param.reversed ? param.max - value : value - param.min) / (param.max - param.min));
            near(initialValue(param));
            displays.set(param, (value) => {
                curve.push(value);
                near(value);
            });
        }
        if (visual) controls.append(visual.node);
        controls.append(node);
    });
    return el('div', { className: 'event' }, screens, controls);
}

/** Câble qui relie un module au suivant. */
function cable(index) {
    const paths = ['M70 0C70 62 34 34 46 62S70 52 70 100', 'M70 0C70 70 92 30 84 60S70 58 70 100', 'M70 0C70 60 40 44 52 70S70 60 70 100'];
    const d = paths[index % paths.length];
    const node = svg('0 0 100 100', `<path class="cable__sleeve" d="${d}"/><path class="cable__signal" d="${d}" pathLength="100"/>`, 'cable');
    node.setAttribute('preserveAspectRatio', 'none');
    return node;
}

const jack = (side) => el('span', { className: `jack jack--${side}`, ariaHidden: 'true' });

/** Construit les expériences, remplit handlers.displays et handlers.maps, et renvoie une Map article → { demo, report }. */
export function renderDemos(container, demos, handlers) {
    const cards = new Map();
    const nodes = demos.flatMap((demo, i) => {
        const titleId = `demo-${demo.id}-title`;
        const number = String(i + 1).padStart(2, '0');
        const protocol = createProtocol(demo, { onDone: handlers.onDone });
        const notes = el('div', { className: 'notes' },
            el('p', { className: 'notes__number' }, el('span', { className: 'sr-only', textContent: 'Expérience ' }), number),
            el('h2', { id: titleId, className: 'notes__title', textContent: demo.title }),
            el('p', { className: 'notes__text', textContent: demo.description }),
            protocol.node);
        if (demo.project) notes.append(el('p', { className: 'notes__project', textContent: `Extrait de ${demo.project}` }));

        const bench = el('div', { className: 'bench' },
            jack('in'),
            el('div', { className: 'bench__plate' }, el('span', { className: 'bench__led', ariaHidden: 'true' }), el('p', { className: 'bench__name', textContent: demo.name ?? demo.title })),
            ...demo.events.map((event, e) => renderEvent(demo, event, `demo-${demo.id}-e${e}`, { ...handlers, report: protocol.report })),
            jack('out'));
        const card = el('article', { className: 'exp', id: `demo-${demo.id}` }, notes, bench);
        card.dataset.led = LEDS[i % LEDS.length];
        card.classList.toggle('is-tried', isDone(demo.id));
        card.setAttribute('aria-labelledby', titleId);
        cards.set(card, { demo, report: protocol.report });
        return i ? [cable(i), card] : [card];
    });
    container.replaceChildren(...(nodes.length ? nodes : [el('p', { textContent: 'Aucune expérience pour le moment.' })]));
    return cards;
}

/** Voyants de l'en-tête : un par expérience, allumé une fois menée. */
export function renderLamps(list, count, demos) {
    const lamps = new Map(demos.map((demo, i) => {
        const link = el('a', { className: 'lamp', href: `#demo-${demo.id}` }, el('span', { className: 'sr-only', textContent: `Expérience ${i + 1} : ${demo.name ?? demo.title}` }), el('span', { textContent: i + 1, ariaHidden: 'true' }));
        link.title = demo.name ?? demo.title;
        link.dataset.led = LEDS[i % LEDS.length];
        return [demo.id, link];
    }));
    list.replaceChildren(...[...lamps.values()].map((link) => el('li', {}, link)));
    return function update() {
        let total = 0;
        for (const [id, link] of lamps) {
            link.classList.toggle('is-on', isDone(id));
            total += isDone(id);
        }
        count.textContent = `${total} sur ${demos.length}`;
        document.body.classList.toggle('is-complete', total === demos.length && total > 0);
    };
}
