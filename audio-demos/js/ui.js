// Construction des expériences à partir du manifeste : à gauche le cahier, à droite l'établi.
// Les textes du manifeste sont des clés de ../translations.csv : ils changent avec la langue (i18n.js).
import { createKnob, createLever, createPads, el, perFrame, svg } from './controls.js';
import { createCurve } from './curve.js';
import { attr, live, t, text } from './i18n.js';
import { createMap } from './map.js';
import { createProtocol, isDone, isStarted } from './protocol.js';

export { perFrame };

const LEDS = ['rare', 'epic', 'jaune', 'crete']; // couleur de la trace, d'une expérience à l'autre

// --- Voyant de mise sous tension, dans l'en-tête ---

const statusNode = document.getElementById('status');
let status = { key: 'lab_status_idle', vars: {} };
function drawStatus() {
    const words = t(status.key, status.vars);
    if (statusNode.textContent !== words) statusNode.textContent = words;
    statusNode.parentElement.title = words; // sur téléphone, seul le voyant est visible
}
live(drawStatus);

/** state : "idle", "loading", "ready", "locked" ou "error" ; key : clé du texte, vars : ses variables. */
export function setStatus(state, key, vars = {}) {
    status = { key, vars };
    document.getElementById('status-dot').dataset.state = state;
    statusNode.dataset.state = state;
    drawStatus();
}

/** Ajoute un message à la zone d'erreur de la page. */
export function showPageError(message) {
    const box = document.getElementById('page-error');
    box.textContent = box.textContent ? `${box.textContent}\n${message}` : message;
    box.hidden = false;
}

// --- Touches de lecture (et vue de dessus, qui déclenche aussi un event) ---

const STATE_KEYS = { loading: 'lab_state_loading', missing: 'lab_state_missing', error: 'lab_state_error' };
const triggers = new Set();

function drawTrigger(button) {
    const key = STATE_KEYS[button.dataset.state];
    const label = button.querySelector('.key__label');
    if (label) label.textContent = t(key ?? button.dataset.label);
    else button.title = key ? t(key) : ''; // vue de dessus : elle garde son propre libellé
}
live(() => triggers.forEach(drawTrigger));

/** state : "idle", "loading", "missing" ou "error". Le bouton reste cliquable pour réessayer. */
export function setEventState(button, state) {
    triggers.add(button);
    button.dataset.state = state;
    drawTrigger(button);
    button.setAttribute('aria-busy', String(state === 'loading'));
}

/** Pendant qu'une expérience se charge, les autres touches de lecture attendent. active : la touche qui charge, ou null. */
export function setBusy(active) {
    for (const button of triggers) {
        if (active && button !== active) button.setAttribute('aria-disabled', 'true');
        else button.removeAttribute('aria-disabled');
    }
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

/** Clé du nom d'un paramètre ; sans label, le nom FMOD s'affiche tel quel. */
const nameKey = (param) => param.label ?? param.name;

/** Les textes d'une liste de nœuds suivent une liste de clés. */
function texts(nodes, keys) {
    nodes.forEach((node, i) => text(node, keys[i]));
}

/** Courbe temps réel du paramètre, sur l'étendue de ses valeurs possibles. */
function paramCurve(param, min, max, steps) {
    const stepLabels = [];
    if (steps) live(() => stepLabels.splice(0, Infinity, ...param.labels.map((key) => t(key))));
    const curve = createCurve({ min, max, steps, stepLabels, initial: initialValue(param) });
    attr(curve.node, 'aria-label', 'lab_curve', () => ({ name: t(nameKey(param)) }));
    return curve;
}

function renderContinuous(param, id, onChange) {
    const { min, max } = param;
    const knob = createKnob({ id, min, max, step: param.step ?? (max - min) / 100, value: initialValue(param), reversed: param.reversed }, onChange);
    const node = el('div', { className: 'control control--knob' }, text(el('label', { className: 'control__name', htmlFor: id }), nameKey(param)));
    const row = el('div', { className: 'control__knob' });
    if (param.ends) row.append(text(el('span', { className: 'control__end' }), param.ends[0]));
    row.append(knob.node);
    if (param.ends) row.append(text(el('span', { className: 'control__end' }), param.ends[1]));
    node.append(row);
    return { node, curve: paramCurve(param, min, max) };
}

/** Touches nommées ; la première vaut param.min. sequential : on n'avance que d'un cran à la fois, puis on recommence au début. */
function renderStepped(param, id, onChange) {
    const values = param.labels.map((_, i) => param.min + i);
    const node = createPads({ id, labels: param.labels.map(() => ''), numbers: values, index: initialValue(param) - param.min, sequential: param.sequential }, (i, options) => onChange(values[i], options));
    text(node.querySelector('legend'), nameKey(param));
    texts([...node.querySelectorAll('.pad__name')], param.labels);
    const reset = node.querySelector('.pads__reset');
    if (reset) text(reset.querySelector('span'), 'lab_restart');
    return { node, curve: paramCurve(param, values[0], values.at(-1), values) };
}

function renderToggle(param, id, onChange) {
    const lever = createLever({ id, labels: ['', ''], index: param.default ?? 0 }, (i) => onChange(param.values[i]));
    texts([...lever.querySelectorAll('.lever__side')], param.labels);
    attr(lever, 'aria-label', nameKey(param));
    const node = el('div', { className: 'control' }, text(el('span', { className: 'control__name' }), nameKey(param)), lever);
    return { node, curve: paramCurve(param, Math.min(...param.values), Math.max(...param.values)) };
}

function renderLabeled(param, id, onChange) {
    const node = createPads({ id, labels: param.labels.map(() => ''), index: param.default ?? 0 }, onChange);
    text(node.querySelector('legend'), nameKey(param));
    texts([...node.querySelectorAll('.pad__name')], param.labels);
    return { node, curve: null };
}

const PARAM_RENDERERS = { continuous: renderContinuous, stepped: renderStepped, toggle: renderToggle, labeled: renderLabeled };

function screen(key, canvas) {
    return el('figure', { className: 'screen' }, canvas, text(el('figcaption', { className: 'screen__title' }), key));
}

/** Un event : sa touche (ou sa vue de dessus), ses écrans et ses commandes. */
function renderEvent(demo, event, id, { onTrigger, onParam, onAim, displays, maps, scope, isPlaying, report }) {
    let button;
    let map = null;
    if (event.spatial) {
        // Le listener est au centre ; un clic dans sa portée y fait partir l'explosion.
        map = createMap({
            range: event.spatial.distance,
            onFire(position, { flipped }) {
                onAim(event, position);
                if (flipped) report({ type: 'move' }); // l'explosion est passée de l'autre côté de l'oreille
                onTrigger(map.surface, demo, event);
            },
        });
        maps.set(event, map);
        button = map.surface;
    } else {
        button = el('button', { type: 'button', className: 'key' }, el('span', { className: 'key__cap', ariaHidden: 'true' }), el('span', { className: 'key__label' }));
        button.addEventListener('click', () => onTrigger(button, demo, event));
    }
    button.dataset.label = event.label;
    button.dataset.mode = event.mode;
    setEventState(button, 'idle');
    if (event.mode === 'loop') setEventPlaying(button, false);

    const wave = el('canvas', { className: 'scope' });
    wave.setAttribute('role', 'img');
    attr(wave, 'aria-label', 'lab_wave');
    scope.addScreen(wave, { isActive: () => isPlaying(event) });
    const screens = el('div', { className: 'screens' }, screen('lab_signal', wave));

    const controls = el('div', { className: 'controls' });
    if (map) controls.append(map.node);
    else controls.append(el('div', { className: 'control control--key' }, button));
    (event.parameters ?? []).forEach((param, i) => {
        const { node, curve } = PARAM_RENDERERS[param.type](param, `${id}-p${i}`, (value, options) => {
            onParam(event, param, value, options);
            report({ type: 'param', value });
        });
        if (curve) {
            screens.append(screen(nameKey(param), curve.node));
            displays.set(param, (value) => curve.push(value));
        }
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

/** En-tête du module : le projet en titre, la technique au-dessus. Sans projet, la technique seule. */
function plate(demo) {
    const name = demo.name ?? demo.title;
    const words = demo.project
        ? [text(el('p', { className: 'bench__kind' }), name), el('p', { className: 'bench__name', textContent: demo.project })]
        : [text(el('p', { className: 'bench__name' }), name)];
    return el('div', { className: 'bench__plate' }, el('span', { className: 'bench__led', ariaHidden: 'true' }), el('div', { className: 'bench__words' }, ...words));
}

const jack = (side) => el('span', { className: `jack jack--${side}`, ariaHidden: 'true' });

/** Construit les expériences, remplit handlers.displays et handlers.maps, et renvoie une Map article → { demo, report }. */
export function renderDemos(container, demos, handlers) {
    const cards = new Map();
    const nodes = demos.flatMap((demo, i) => {
        const titleId = `demo-${demo.id}-title`;
        const number = String(i + 1).padStart(2, '0');
        const protocol = createProtocol(demo, { onDone: handlers.onDone, onStart: handlers.onStart });
        const notes = el('div', { className: 'notes' },
            el('p', { className: 'notes__number' }, text(el('span', { className: 'sr-only' }), 'lab_experiment_sr'), number),
            text(el('h2', { id: titleId, className: 'notes__title' }), demo.title),
            text(el('p', { className: 'notes__text' }), demo.description),
            protocol.node);
        if (demo.project) notes.append(text(el('p', { className: 'notes__project' }), 'lab_extract', { project: demo.project }));

        const bench = el('div', { className: 'bench' },
            jack('in'),
            plate(demo),
            ...demo.events.map((event, e) => renderEvent(demo, event, `demo-${demo.id}-e${e}`, { ...handlers, report: protocol.report })),
            jack('out'));
        if (demo.image) { // l'illustration du projet, au fond du module (adresse absolue : la variable est lue depuis demos.css)
            bench.classList.add('has-art');
            bench.style.setProperty('--art', `url("${new URL(demo.image, document.baseURI).href}")`);
        }
        const card = el('article', { className: 'exp', id: `demo-${demo.id}` }, notes, bench);
        card.dataset.led = LEDS[i % LEDS.length];
        card.classList.toggle('is-tried', isDone(demo.id));
        card.setAttribute('aria-labelledby', titleId);
        cards.set(card, { demo, report: protocol.report });
        return i ? [cable(i), card] : [card];
    });
    container.replaceChildren(...(nodes.length ? nodes : [text(el('p'), 'lab_empty')]));
    return cards;
}

/** Voyants de l'en-tête : un par expérience, allumé une fois menée. */
export function renderLamps(list, count, demos) {
    const lamps = new Map(demos.map((demo, i) => {
        const name = () => (demo.project ? `${demo.project} · ${t(demo.name ?? demo.title)}` : t(demo.name ?? demo.title));
        const link = el('a', { className: 'lamp', href: `#demo-${demo.id}` },
            text(el('span', { className: 'sr-only' }), 'lab_lamp', () => ({ number: i + 1, name: name() })),
            el('span', { textContent: i + 1, ariaHidden: 'true' }));
        live(() => { link.title = name(); });
        return [demo.id, link];
    }));
    list.replaceChildren(...[...lamps.values()].map((link) => el('li', {}, link)));
    let total = 0;
    text(count, 'lab_count', () => ({ done: total, total: demos.length }));
    return function update() {
        total = 0;
        for (const [id, link] of lamps) {
            link.classList.toggle('is-on', isDone(id)); // menée : vert
            link.classList.toggle('is-started', isStarted(id)); // commencée : orange
            total += isDone(id);
        }
        count.textContent = t('lab_count', { done: total, total: demos.length });
        document.body.classList.toggle('is-complete', total === demos.length && total > 0);
    };
}
