// Courbe d'un paramètre au fil du temps, en Canvas 2D.

const WINDOW_MS = 8000; // durée visible sur toute la largeur
const MAX_GAP_MS = 100; // au-delà, l'event était arrêté : on reprend la courbe sans trou
const FRAME_MS = 16;
const PADDING = 6;
const RIGHT_MARGIN = 18; // place pour la valeur, centrée sur le point
const DOT_RADIUS = 4;
const TEXT_SIZE = 11;
const TEXT_GAP = 3;

/** Dernier cran atteint entre deux valeurs, ou undefined. */
export function reachedStep(steps, from, to) {
    const reached = steps.filter((step) => (from < step && to >= step) || (from > step && to <= step));
    return from < to ? reached.at(-1) : reached[0];
}

/** Le plus long début de texte qui tient dans la largeur, suivi de « … » s'il est coupé. */
export function fitText(text, width, measure) {
    if (measure(text) <= width) return text;
    for (let length = text.length - 1; length > 0; length--) {
        const cut = `${text.slice(0, length).trimEnd()}…`;
        if (measure(cut) <= width) return cut;
    }
    return '';
}

/**
 * Renvoie { node, push }. push() est à appeler à chaque mise à jour pendant la lecture :
 * le temps défile même si la valeur est stable, et s'arrête quand push() n'est plus appelé.
 * steps : valeurs croissantes dont le passage laisse un repère sur la courbe, nommé par stepLabels.
 */
export function createCurve({ min, max, initial, label, steps = [], stepLabels = [] }) {
    const canvas = document.createElement('canvas');
    canvas.className = 'curve';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Évolution en temps réel : ${label}`);

    const tolerance = (max - min) / 1000; // ignore le bruit d'arrondi
    const decimals = max - min > 10 ? 0 : 2;
    let samples = [{ t: 0, value: initial }];
    let markers = []; // passages de crans : { t, value, label }
    let clock = 0; // temps de lecture écoulé
    let lastPush = 0;

    function draw() {
        const ratio = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;
        const pixelWidth = Math.round(width * ratio);
        const pixelHeight = Math.round(height * ratio);
        if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
        if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const style = getComputedStyle(canvas);
        const color = style.color;
        const textColor = style.getPropertyValue('--text').trim() || color;
        const right = width - RIGHT_MARGIN;
        const x = (t) => right - ((clock - t) / WINDOW_MS) * right;
        const y = (value) => PADDING + (1 - (value - min) / (max - min)) * (height - 2 * PADDING);
        const dot = (cx, cy, radius) => {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.fill();
        };

        ctx.font = `400 ${TEXT_SIZE}px "Atkinson Hyperlegible Next", system-ui, sans-serif`;
        const write = (text, tx, ty, align, baseline, fill, alpha = 1) => {
            ctx.textAlign = align;
            ctx.textBaseline = baseline;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = fill;
            ctx.fillText(text, tx, ty);
            ctx.globalAlpha = 1;
        };

        // Avant le premier point connu, la valeur était constante.
        ctx.beginPath();
        ctx.moveTo(0, y(samples[0].value));
        for (const { t, value } of samples) ctx.lineTo(x(t), y(value));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.lineTo(right, height);
        ctx.lineTo(0, height);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;

        markers.forEach(({ t, value, label: name }, i) => {
            ctx.strokeStyle = textColor;
            ctx.fillStyle = textColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x(t), 0);
            ctx.lineTo(x(t), height);
            ctx.stroke();
            dot(x(t), y(value), 3);
            ctx.setLineDash([]);
            // Le nom s'arrête avant le repère suivant, ou avant la valeur courante.
            const from = x(t) + 4;
            const limit = i + 1 < markers.length ? x(markers[i + 1].t) - 4 : right - RIGHT_MARGIN;
            const text = fitText(name, limit - from, (part) => ctx.measureText(part).width);
            if (text) write(text, from, 2, 'left', 'top', textColor);
        });

        const current = samples.at(-1).value;
        const cy = y(current);
        ctx.fillStyle = color;
        dot(right, cy, DOT_RADIUS);

        // Valeur au-dessus du point, ou en dessous s'il n'y a pas la place.
        const offset = DOT_RADIUS + TEXT_GAP;
        const fitsAbove = cy - offset - TEXT_SIZE >= 0;
        const ty = fitsAbove ? cy - offset : cy + offset;
        write(current.toFixed(decimals), right, ty, 'center', fitsAbove ? 'bottom' : 'top', color, 0.75);
    }

    function push(rawValue) {
        // Un seek peut s'arrêter à un arrondi près du cran : on le considère atteint.
        const value = steps.find((step) => Math.abs(step - rawValue) <= tolerance) ?? rawValue;
        const now = performance.now();
        const elapsed = now - lastPush;
        lastPush = now;
        clock += elapsed < MAX_GAP_MS ? elapsed : FRAME_MS;

        const step = reachedStep(steps, samples.at(-1).value, value);
        if (step !== undefined) markers.push({ t: clock, value: step, label: stepLabels[steps.indexOf(step)] });

        // Un palier tient en deux points : on prolonge le dernier au lieu d'en ajouter.
        const [previous, last] = samples.slice(-2);
        const same = (sample) => sample && Math.abs(value - sample.value) <= tolerance;
        if (same(previous) && same(last)) last.t = clock;
        else samples.push({ t: clock, value });

        // Garde un seul point hors de la fenêtre, pour tracer le bord gauche.
        const start = clock - WINDOW_MS;
        const first = samples.findIndex(({ t }) => t >= start);
        if (first > 1) samples = samples.slice(first - 1);
        markers = markers.filter(({ t }) => t >= start - WINDOW_MS); // le nom sort après sa ligne
        draw();
    }

    new ResizeObserver(draw).observe(canvas);
    return { node: canvas, push };
}
