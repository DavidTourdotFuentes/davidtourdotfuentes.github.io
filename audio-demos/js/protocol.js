// Protocole d'une expérience : des étapes qui se cochent quand on les fait, puis l'observation.
import { el } from './controls.js';
import { t, text } from './i18n.js';

// Rien n'est gardé d'une visite à l'autre : le compteur, les voyants et les protocoles repartent ensemble de zéro.
try {
    localStorage.removeItem('labo-experiences'); // où les anciennes versions gardaient les expériences menées
} catch {
    // Stockage bloqué : rien à effacer.
}

const done = new Set(); // menées pendant cette visite
export const isDone = (id) => done.has(id);

const started = new Set(); // commencées pendant cette visite (une étape au moins), pas encore menées
export const isStarted = (id) => started.has(id) && !done.has(id);

const remember = (id) => done.add(id);

/** Une étape est faite si l'action correspond : { type: 'play' | 'param' | 'move', value?, count? }. */
function matches(step, action) {
    if (step.when !== action.type) return false;
    if (step.value !== undefined && action.value !== step.value) return false;
    if (step.below !== undefined && !(action.value <= step.below)) return false;
    if (step.above !== undefined && !(action.value >= step.above)) return false;
    return step.count === undefined || action.count >= step.count;
}

/** Renvoie { node, report }. report(action) avance d'une étape au plus ; les étapes se font dans l'ordre. */
export function createProtocol(demo, { onDone, onStart }) {
    const steps = demo.steps ?? [];
    const seen = new Set(); // valeurs déjà essayées du paramètre
    let index = 0;

    const items = steps.map((step) => el('li', { className: 'step' }, text(el('span', { className: 'step__text' }), step.text), el('span', { className: 'sr-only step__state' })));
    const list = el('ol', { className: 'steps' }, ...items);
    const observation = el('div', { className: 'observation__text' }, demo.observation ? text(el('p'), demo.observation) : el('p'));
    const details = el('details', { className: 'observation' },
        el('summary', {}, text(el('span', { className: 'observation__title' }), 'lab_observation')), observation);
    const live = el('p', { className: 'sr-only' });
    live.setAttribute('aria-live', 'polite');

    const draw = () => items.forEach((item, i) => {
        item.classList.toggle('is-done', i < index);
        item.classList.toggle('is-current', i === index);
        item.querySelector('.step__state').textContent = i < index ? ` ${t('lab_step_done')}` : '';
    });

    function finish() {
        details.open = true;
        details.classList.add('is-revealed');
        live.textContent = t('lab_finished');
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
        if (index === 1 && !started.has(demo.id)) {
            started.add(demo.id);
            onStart?.(demo);
        }
        if (index === steps.length) finish();
    }

    draw();
    const node = el('div', { className: 'protocol' });
    if (steps.length) node.append(text(el('h3', { className: 'protocol__title' }), 'lab_protocol'), list);
    if (demo.observation) node.append(details);
    node.append(live);
    return { node, report };
}
