// Aspect d'une carte à collectionner, et effets d'apparition selon sa rareté.
import { createKnob, createMeter, createWave } from './meter.js';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function el(tag, className = '', props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), { className }, props);
    node.append(...children);
    return node;
}

/** Texte traduit, qui suit aussi les changements de langue. */
export function text(tag, className, key) {
    const node = el(tag, className);
    setText(node, key);
    return node;
}

export function setText(node, key) {
    node.dataset.i18n = key;
    node.textContent = getTranslation(key);
}

/** Éclats du Légendaire : x et y en % de la carte, taille en cqw, retard en secondes. */
const SPARKS = [[86, 8, 11, 0], [30, 6, 6, 1.1], [94, 30, 7, 0.5], [60, 15, 5, 1.9], [13, 33, 8, 1.5], [78, 42, 5, 2.4], [44, 37, 6, 0.8], [92, 52, 9, 2], [66, 28, 4, 2.8]];

/** Lumière de la carte : un reflet, et des éclats sur la plus rare. Le reste est dans cards.css. */
function light({ effect }) {
    const node = el('span', 'light', {}, el('span', 'light__sheen'));
    node.setAttribute('aria-hidden', 'true');
    if (effect === 'legend') {
        node.append(el('span', 'sparks', {}, ...SPARKS.map(([x, y, size, delay]) => {
            const spark = el('span', 'spark');
            spark.style.cssText = `left:${x}%;top:${y}%;--size:${size}cqw;--delay:-${delay}s`;
            return spark;
        })));
    }
    return node;
}

/** Recto d'une carte. info : { name, role, year, html, image, crop, zoom }. */
function front(card, info, number, total) {
    const art = el('span', `tcard__art${card.isProject ? '' : ' tcard__art--logo'}`, {}, el('img', '', { src: info.image, alt: '' }));
    if (info.crop) art.style.setProperty('--crop', info.crop);
    if (info.zoom) art.style.setProperty('--zoom', info.zoom);
    if (!card.isProject) art.append(createWave(info.name, 6));
    const description = el('span', 'tcard__text');
    description.innerHTML = info.html; // textes de translations.csv, qui contiennent des <br>

    const type = el('span', 'tcard__type');
    if (info.role) type.textContent = [info.role, info.year].filter(Boolean).join(', ');
    else setText(type, `type_${card.type}`);

    return el('span', 'tcard__face tcard__front', {},
        art,
        createKnob(card.rarity),
        el('span', 'tcard__body', {},
            el('span', 'tcard__name', { textContent: info.name }),
            type,
            description,
            el('span', 'tcard__footer', {},
                text('span', 'tcard__rarity', `rarity_${card.rarity.id}`),
                el('span', '', { textContent: `${number}/${total}` }))),
        light(card.rarity));
}

/** Dos : un VU-mètre, dont l'aiguille monte au niveau de la carte avant le retournement. */
function back() {
    const node = el('span', 'tcard__face tcard__back', {}, el('span', 'tcard__vu', { textContent: 'VU' }), createMeter());
    node.setAttribute('aria-hidden', 'true');
    return node;
}

/** tag vaut 'button' pour une carte à retourner, 'div' pour une carte déjà visible. */
export function createCard(tag, card, info, number, total, { tilts = true } = {}) {
    const inner = el('span', 'tcard__inner', {}, back(), front(card, info, number, total));
    const node = el(tag, 'tcard', {}, inner);
    if (tag === 'button') node.type = 'button';
    node.dataset.effect = card.rarity.effect;
    node.dataset.rarity = card.rarity.id;
    node.style.setProperty('--rarity', card.rarity.color);
    node.style.setProperty('--target', `${card.rarity.needle}deg`);
    if (tilts) followPointer(node);
    return node;
}

/** La carte s'incline vers le pointeur et son reflet le suit. */
function followPointer(node) {
    node.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch' || reducedMotion()) return;
        const box = node.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        node.style.setProperty('--mx', `${x * 100}%`);
        node.style.setProperty('--my', `${y * 100}%`);
        node.style.setProperty('--tilt-x', `${(0.5 - y) * 18}deg`);
        node.style.setProperty('--tilt-y', `${(x - 0.5) * 18}deg`);
    });
    node.addEventListener('pointerleave', () => {
        for (const name of ['--mx', '--my', '--tilt-x', '--tilt-y']) node.style.removeProperty(name);
    });
}

const CONFETTI = ['#58bcc4', '#f190b4', '#f3c34b', '#ff5a3a'];

/** Confettis qui partent du centre de la scène, de la couleur de la carte ou des quatre ; des étoiles pour la plus rare. */
export function burst(stage, { color, particles, effect = 'burst' }) {
    if (reducedMotion()) return;
    for (let i = 0; i < particles; i++) {
        const isStar = effect === 'legend';
        const particle = el('span', `particle${isStar ? ' particle--star' : ''}`);
        const angle = Math.random() * Math.PI * 2;
        const distance = 140 + Math.random() * 260;
        const size = (isStar ? 12 : 6) + Math.random() * (isStar ? 18 : 9);
        const ink = isStar ? (i % 3 ? '#fffbe6' : '#ffcf6b') : effect === 'glow' ? color : CONFETTI[i % CONFETTI.length];
        particle.style.cssText = `width:${size}px;height:${isStar ? size : size * (0.4 + Math.random() * 0.6)}px;background:${ink}`;
        stage.append(particle);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        particle.animate(
            [
                { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
                { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + 60}px)) rotate(${Math.random() * 720 - 360}deg)`, opacity: 1, offset: 0.75 },
                { transform: `translate(calc(-50% + ${x * 1.05}px), calc(-50% + ${y + 130}px)) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
            ],
            { duration: 900 + Math.random() * 900, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' },
        ).finished.finally(() => particle.remove());
    }
}
