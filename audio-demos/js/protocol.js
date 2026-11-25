// Protocole d'une expérience : des étapes qui se cochent quand on les fait, puis l'observation.
import { el } from './controls.js';

const STORAGE_KEY = 'labo-experiences';

function readDone() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return new Set(Array.isArray(saved) ? saved : []);
    } catch {
        return new Set(); // stockage bloqué ou illisible : on repart de zéro
    }
}

const done = readDone();

/** Expériences déjà menées, gardées d'une visite à l'autre. */
export const isDone = (id) => done.has(id);

function remember(id) {
    done.add(id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
    } catch {
        // Même cas que dans readDone.
    }
}

/** Une étape est faite si l'action correspond : { type: 'play' | 'param' | 'move', value?, count? }. */
function matches(step, action) {
    if (step.when !== action.type) return false;
    if (step.value !== undefined && action.value !== step.value) return false;
    if (step.below !== undefined && !(action.value <= step.below)) return false;
    if (step.above !== undefined && !(action.value >= step.above)) return false;
    return step.count === undefined || action.count >= step.count;
}

/** Renvoie { node, report }. report(action) avance d'une étape au plus ; les étapes se font dans l'ordre. */
export function createProtocol(demo, { onDone }) {
    const steps = demo.steps ?? [];
    const seen = new Set(); // valeurs déjà essayées du paramètre
    let index = 0;

    const items = steps.map((step) => el('li', { className: 'step' }, el('span', { className: 'step__text', textContent: step.text }), el('span', { className: 'sr-only step__state' })));
    const list = el('ol', { className: 'steps' }, ...items);
    const observation = el('div', { className: 'observation__text' }, el('p', { textContent: demo.observation ?? '' }));
    const details = el('details', { className: 'observation' },
        el('summary', {}, el('span', { className: 'observation__title', textContent: 'Observation' })), observation);
    const live = el('p', { className: 'sr-only' });
    live.setAttribute('aria-live', 'polite');

    const draw = () => items.forEach((item, i) => {
        item.classList.toggle('is-done', i < index);
        item.classList.toggle('is-current', i === index);
        item.querySelector('.step__state').textContent = i < index ? ' (fait)' : '';
    });

    function finish() {
        details.open = true;
        details.classList.add('is-revealed');
        live.textContent = 'Expérience terminée, observation affichée.';
        remember(demo.id);
        onDone(demo);
    }

    function report(action) {
        if (action.type === 'param') {
            seen.add(action.value);
            action = { ...action, count: seen.size };
        }
        if (index >= steps.length || !matches(steps[index], action)) return;
        index++;
        draw();
        if (index === steps.length) finish();
    }

    draw();
    const node = el('div', { className: 'protocol' });
    if (steps.length) node.append(el('h3', { className: 'protocol__title', textContent: 'Protocole' }), list);
    if (demo.observation) node.append(details);
    node.append(live);
    return { node, report };
}
