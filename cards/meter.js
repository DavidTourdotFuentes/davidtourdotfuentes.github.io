// Dessins des instruments : le cadran de VU-mètre, le potard et la forme d'onde d'un titre.

const SVG = 'http://www.w3.org/2000/svg';

export function svg(className, viewBox, html) {
    const node = document.createElementNS(SVG, 'svg');
    node.setAttribute('class', className);
    node.setAttribute('viewBox', viewBox);
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = html;
    return node;
}

/** Point d'un cercle ; 0° est en haut, les angles tournent vers la droite. */
export function point(cx, cy, radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
}

const pair = (cx, cy, radius, angle) => point(cx, cy, radius, angle).map((value) => value.toFixed(2)).join(' ');
export const arc = (cx, cy, radius, from, to) => `M${pair(cx, cy, radius, from)}A${radius} ${radius} 0 0 1 ${pair(cx, cy, radius, to)}`;
export const tick = (cx, cy, from, to, angle) => `M${pair(cx, cy, from, angle)}L${pair(cx, cy, to, angle)}`;

const LIMIT = 46; // course de l'aiguille, en degrés de part et d'autre

/** Angle de l'aiguille pour une valeur de 0 à 1. */
export const needleAngle = (value) => -LIMIT + 2 * LIMIT * value;

/**
 * Cadran de VU-mètre. ticks : nombre de graduations, red : index de la première graduation rouge,
 * labels : [texte, index]. L'angle de l'aiguille est la variable CSS --needle.
 */
export function createMeter({ ticks = 13, red = 9, labels = [['−20', 1.9], ['0', 9], ['+3', 11.6]], crete = '#9c1f12', needle = '#d42e1a' } = {}) {
    const angle = (index) => needleAngle(index / (ticks - 1));
    const color = (index) => (index >= red ? crete : 'currentColor');
    let html = '';
    for (let i = 0; i < ticks; i++) {
        const isLong = i === 0 || i === red || i === ticks - 1;
        html += `<path d="${tick(50, 62, 46, isLong ? 51.5 : 49, angle(i))}" style="stroke:${color(i)}" stroke-width="1"/>`;
    }
    html += `<path d="${arc(50, 62, 46, -LIMIT, angle(red))}" fill="none" stroke="currentColor" stroke-width="1"/>`;
    html += `<path d="${arc(50, 62, 45, angle(red), LIMIT)}" fill="none" style="stroke:${crete}" stroke-width="3"/>`;
    for (const [text, index] of labels) {
        const [x, y] = point(50, 62, 37.5, angle(index));
        html += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" style="font:700 8px var(--font-texte);fill:${color(index)}">${text}</text>`;
    }
    html += `<g class="meter__needle"><path d="M50 62V13" style="stroke:${needle}" stroke-width="1.6" stroke-linecap="round"/></g>`;
    html += '<circle cx="50" cy="62" r="11" fill="currentColor"/>';
    return svg('meter', '0 0 100 62', html);
}

/** Potard tourné selon la rareté : de 7 h (Commune) à 5 h (Légendaire). Sa couleur est currentColor. */
export function createKnob(rarity) {
    return svg('knob', '0 0 24 24', `<circle cx="12" cy="12" r="11" fill="currentColor"/>
        <path d="M12 11V2.5" stroke-width="4" stroke-linecap="round" transform="rotate(${rarity.knob} 12 12)"/>`);
}

/** Un titre composé en Wavefont devient une forme d'onde. C'est une signature, pas le signal réel. */
export function createWave(text, repeat = 4) {
    const node = document.createElement('span');
    node.className = 'wave';
    node.setAttribute('aria-hidden', 'true');
    node.textContent = `${text.toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, '')} `.repeat(repeat);
    return node;
}
