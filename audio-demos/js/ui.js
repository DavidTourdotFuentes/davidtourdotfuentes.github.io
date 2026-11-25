// Génération des cartes et des contrôles à partir du manifeste.
import { createCurve } from './curve.js';
import { createMap } from './map.js';

/** Crée un élément ; les textes passent par textContent, jamais par innerHTML. */
function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
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

/** state : "idle", "loading", "ready", "locked" ou "error". Le texte n'est visible que pour les deux derniers. */
export function setStatus(state, text) {
    const dot = document.getElementById('status-dot');
    const status = document.getElementById('status');
    dot.dataset.state = state;
    dot.title = text;
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
    if (button.classList.contains('btn')) button.textContent = text;
    else button.title = button.ariaLabel = text; // point de la carte : pas de texte visible
    button.setAttribute('aria-busy', String(state === 'loading'));
}

export function setEventPlaying(button, playing) {
    button.setAttribute('aria-pressed', String(playing));
}

/** Valeur FMOD d'un paramètre avant toute action de l'utilisateur. */
export function initialValue(param) {
    if (param.type === 'labeled') return param.default ?? 0;
    if (param.type === 'toggle') return param.values[param.default ?? 0];
    return param.default ?? param.min;
}

/** Courbe temps réel du paramètre, sur l'étendue de ses valeurs possibles. */
function paramCurve(param, min, max, steps) {
    return createCurve({ min, max, steps, stepLabels: steps && param.labels, initial: initialValue(param), label: param.label ?? param.name });
}

function renderRange(param, id, onChange) {
    const step = param.step ?? (param.max - param.min) / 100;
    const label = el('label', { htmlFor: id, textContent: param.label ?? param.name });
    const input = el('input', { type: 'range', id, min: param.min, max: param.max, step });
    input.value = initialValue(param);
    // En sens inverse, le maximum est à gauche : utile pour une distance qui diminue.
    if (param.reversed) input.classList.add('is-reversed');
    const send = perFrame(onChange);
    input.addEventListener('input', () => send(Number(input.value)));
    return { label, input };
}

function renderContinuous(param, id, onChange) {
    const curve = paramCurve(param, param.min, param.max);
    const { label, input } = renderRange(param, id, onChange);
    const node = el('div', { className: 'param' }, label, input);
    if (param.ends) {
        node.append(el('div', { className: 'param__ends' }, ...param.ends.map((text) => el('span', { textContent: text }))));
    }
    return { node, curve };
}

/** Curseur à crans nommés ; le premier label correspond à param.min. */
function renderStepped(param, id, onChange) {
    const max = param.min + param.labels.length - 1;
    const curve = paramCurve(param, param.min, max, param.labels.map((_, i) => param.min + i));
    const { label, input } = renderRange({ ...param, max, step: 1 }, id, onChange);

    const ticks = param.labels.map((text, i) => el('li', {},
        el('span', { className: 'ticks__number', textContent: param.min + i }),
        el('span', { textContent: text })));
    const list = el('ol', { className: 'ticks' }, ...ticks);
    list.setAttribute('aria-hidden', 'true'); // Déjà annoncé par aria-valuetext.
    const select = () => {
        const index = Number(input.value) - param.min;
        ticks.forEach((tick, i) => tick.classList.toggle('is-current', i === index));
        input.setAttribute('aria-valuetext', param.labels[index]);
    };
    input.addEventListener('input', select);
    select();

    const node = el('div', { className: 'param stepped' }, label, input, list);
    node.style.setProperty('--steps', param.labels.length);
    return { node, curve };
}

/** Interrupteur entre deux valeurs, chacune avec son label. */
function renderToggle(param, id, onChange) {
    const curve = paramCurve(param, Math.min(...param.values), Math.max(...param.values));
    let index = param.default ?? 0;
    const state = el('span', { className: 'switch__state' });
    const button = el('button', { type: 'button', className: 'switch', id },
        el('span', { className: 'switch__track', ariaHidden: 'true' }), state);
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-label', param.label ?? param.name);
    const render = () => {
        button.setAttribute('aria-checked', String(index === 1));
        state.textContent = param.labels[index];
    };
    button.addEventListener('click', () => {
        index = 1 - index;
        render();
        onChange(param.values[index]);
    });
    render();

    const name = el('span', { className: 'param__name', textContent: param.label ?? param.name });
    const node = el('div', { className: 'param' }, name, button);
    return { node, curve };
}

function renderLabeled(param, onChange) {
    const buttons = param.labels.map((text, index) => {
        const button = el('button', { type: 'button', className: 'btn', textContent: text });
        button.setAttribute('aria-pressed', String(index === (param.default ?? 0)));
        button.addEventListener('click', () => {
            buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
            onChange(index);
        });
        return button;
    });
    const node = el('fieldset', { className: 'param' },
        el('legend', { textContent: param.label ?? param.name }),
        el('div', { className: 'segments' }, ...buttons));
    return { node, curve: null };
}

const PARAM_RENDERERS = {
    continuous: renderContinuous,
    stepped: renderStepped,
    toggle: renderToggle,
    labeled: (param, id, onChange) => renderLabeled(param, onChange),
};

function renderEvent(demo, event, id, { onTrigger, onParam, onListener, displays, maps }) {
    let map = null;
    if (event.spatial) {
        const { distance: range, listener } = event.spatial;
        map = createMap({ range, listener, onMove: perFrame((position) => onListener(event, position)) });
        maps.set(event, map);
    }
    const button = map?.source ?? el('button', { type: 'button', className: 'btn btn--primary' });
    button.dataset.label = event.label;
    setEventState(button, 'idle');
    button.dataset.mode = event.mode;
    if (event.mode === 'loop') setEventPlaying(button, false);
    button.addEventListener('click', () => onTrigger(button, demo, event));

    const row = el('div', { className: 'event__row' }, ...(map ? [] : [button]));
    const params = (event.parameters ?? []).map((param, i) => {
        const { node, curve } = PARAM_RENDERERS[param.type](param, `${id}-p${i}`, (value) => onParam(event, param, value));
        if (curve) {
            displays.set(param, curve.push);
            row.append(curve.node);
        }
        return node;
    });
    return el('div', { className: 'event' }, ...(row.hasChildNodes() ? [row] : []), ...(map ? [map.node] : []), ...params);
}

/** Construit les cartes, remplit handlers.displays (paramètre → ajout à la courbe) et handlers.maps (event → carte) et renvoie une Map carte → démo. */
export function renderDemos(container, demos, handlers) {
    const cards = new Map(demos.map((demo) => {
        const titleId = `demo-${demo.id}-title`;
        const card = el('article', { className: 'demo', id: `demo-${demo.id}` },
            el('h2', { id: titleId, textContent: demo.title }),
            el('p', { textContent: demo.description }),
            el('div', { className: 'events' },
                ...demo.events.map((event, i) => renderEvent(demo, event, `demo-${demo.id}-e${i}`, handlers))));
        card.setAttribute('aria-labelledby', titleId);
        return [card, demo];
    }));
    container.replaceChildren(...(cards.size ? cards.keys() : [el('p', { textContent: 'Aucune démo pour le moment.' })]));
    return cards;
}
