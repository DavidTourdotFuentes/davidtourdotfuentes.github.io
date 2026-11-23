// Génération des cartes et des contrôles à partir du manifeste.

/** Crée un élément ; les textes passent par textContent, jamais par innerHTML. */
function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
}

export function setStatus(state, text) {
    document.getElementById('status').dataset.state = state;
    document.getElementById('status-text').textContent = text;
}

/** Ajoute un message à la zone d'erreur de la page. */
export function showPageError(message) {
    const box = document.getElementById('page-error');
    box.textContent = box.textContent ? `${box.textContent}\n${message}` : message;
    box.hidden = false;
}

/** state : "idle" ou "missing". Le bouton reste focalisable quand la bank manque. */
export function setEventState(button, state) {
    button.dataset.state = state;
    button.textContent = state === 'missing' ? 'Bank manquante' : button.dataset.label;
    button.setAttribute('aria-disabled', String(state === 'missing'));
}

function renderContinuous(param, id) {
    const value = param.default ?? param.min;
    const step = param.step ?? (param.max - param.min) / 100;
    const decimals = Math.min((String(step).split('.')[1] ?? '').length, 3);
    const format = (v) => Number(v).toFixed(decimals);

    const label = el('label', { htmlFor: id, textContent: param.name });
    const output = el('output', { textContent: format(value) });
    output.setAttribute('for', id);
    const input = el('input', { type: 'range', id, min: param.min, max: param.max, step });
    input.value = value;
    input.addEventListener('input', () => { output.textContent = format(input.value); });

    return el('div', { className: 'param' }, el('div', { className: 'param__head' }, label, output), input);
}

function renderLabeled(param) {
    const buttons = param.labels.map((text, index) => {
        const button = el('button', { type: 'button', className: 'btn', textContent: text });
        button.setAttribute('aria-pressed', String(index === (param.default ?? 0)));
        button.addEventListener('click', () => {
            buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        });
        return button;
    });
    return el('fieldset', { className: 'param' },
        el('legend', { textContent: param.name }),
        el('div', { className: 'segments' }, ...buttons));
}

function renderEvent(event, id, { onTrigger }) {
    const button = el('button', { type: 'button', className: 'btn btn--primary', textContent: event.label });
    button.dataset.label = event.label;
    if (event.mode === 'loop') button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => onTrigger(button, event));

    const params = (event.parameters ?? []).map((param, i) => (
        param.type === 'labeled' ? renderLabeled(param) : renderContinuous(param, `${id}-p${i}`)
    ));
    return el('div', { className: 'event' }, button, ...params);
}

export function renderDemos(container, demos, handlers) {
    if (demos.length === 0) {
        container.replaceChildren(el('p', { textContent: 'Aucune démo pour le moment.' }));
        return;
    }
    container.replaceChildren(...demos.map((demo) => {
        const titleId = `demo-${demo.id}-title`;
        const card = el('article', { className: 'demo', id: `demo-${demo.id}` },
            el('h2', { id: titleId, textContent: demo.title }),
            el('p', { textContent: demo.description }),
            ...demo.events.map((event, i) => renderEvent(event, `demo-${demo.id}-e${i}`, handlers)));
        card.setAttribute('aria-labelledby', titleId);
        return card;
    }));
}
