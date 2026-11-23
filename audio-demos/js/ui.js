// Génération des cartes et des contrôles à partir du manifeste.

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

/** state : "idle", "loading", "ready" ou "error". */
export function setStatus(state, text) {
    document.getElementById('status').dataset.state = state;
    const label = document.getElementById('status-text');
    if (label.textContent !== text) label.textContent = text;
    document.getElementById('progress').hidden = state !== 'loading';
}

export function setProgress(value) {
    document.getElementById('progress').value = value;
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
    button.textContent = STATE_LABELS[state] ?? button.dataset.label;
    button.setAttribute('aria-busy', String(state === 'loading'));
}

export function setEventPlaying(button, playing) {
    button.setAttribute('aria-pressed', String(playing));
}

function renderContinuous(param, id, onChange) {
    const value = param.default ?? param.min;
    const step = param.step ?? (param.max - param.min) / 100;
    const decimals = Math.min((String(step).split('.')[1] ?? '').length, 3);
    const format = (v) => Number(v).toFixed(decimals);

    const label = el('label', { htmlFor: id, textContent: param.label ?? param.name });
    const output = el('output', { textContent: format(value) });
    output.setAttribute('for', id);
    const input = el('input', { type: 'range', id, min: param.min, max: param.max, step });
    input.value = value;

    const send = perFrame(onChange);
    input.addEventListener('input', () => {
        output.textContent = format(input.value);
        send(Number(input.value));
    });

    return el('div', { className: 'param' }, el('div', { className: 'param__head' }, label, output), input);
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
    return el('fieldset', { className: 'param' },
        el('legend', { textContent: param.label ?? param.name }),
        el('div', { className: 'segments' }, ...buttons));
}

function renderEvent(demo, event, id, { onTrigger, onParam }) {
    const button = el('button', { type: 'button', className: 'btn btn--primary', textContent: event.label });
    button.dataset.label = event.label;
    button.dataset.mode = event.mode;
    if (event.mode === 'loop') setEventPlaying(button, false);
    button.addEventListener('click', () => onTrigger(button, demo, event));

    const params = (event.parameters ?? []).map((param, i) => {
        const onChange = (value) => onParam(event, param, value);
        return param.type === 'labeled' ? renderLabeled(param, onChange) : renderContinuous(param, `${id}-p${i}`, onChange);
    });
    return el('div', { className: 'event' }, button, ...params);
}

/** Construit les cartes et renvoie une Map carte → démo. */
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
