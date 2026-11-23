// Aspect d'une carte à collectionner, et effets d'apparition selon sa rareté.

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

const BARS = [30, 55, 80, 45, 100, 65, 90, 40, 70, 50, 25];

/** Forme d'onde : le motif du booster et du dos des cartes. */
export function waveform() {
    const wave = el('span', 'wave');
    wave.setAttribute('aria-hidden', 'true');
    for (const height of BARS) {
        const bar = el('span', 'wave__bar');
        bar.style.height = `${height}%`;
        wave.append(bar);
    }
    return wave;
}

/** Recto d'une carte. info : { name, subtitle, html, image }. */
function front(card, info, number, total) {
    const art = el('span', `tcard__art${card.isProject ? '' : ' tcard__art--logo'}`, {}, el('img', '', { src: info.image, alt: '' }));
    const description = el('span', 'tcard__text');
    description.innerHTML = info.html; // textes de translations.csv, qui contiennent des <br>

    const type = el('span', 'tcard__type', {}, text('span', '', `type_${card.type}`));
    if (info.subtitle) type.append(` · ${info.subtitle}`);

    return el('span', 'tcard__face tcard__front', {},
        el('span', 'tcard__name', { textContent: info.name }),
        art,
        type,
        description,
        el('span', 'tcard__footer', {},
            text('span', 'tcard__rarity', `rarity_${card.rarity.id}`),
            el('span', '', { textContent: `${number}/${total}` })),
        el('span', 'tcard__holo'));
}

/** tag vaut 'button' pour une carte à retourner, 'div' pour une carte déjà visible. */
export function createCard(tag, card, info, number, total) {
    const inner = el('span', 'tcard__inner', {},
        el('span', 'tcard__face tcard__back', {}, waveform()),
        front(card, info, number, total));
    const node = el(tag, 'tcard', {}, inner);
    if (tag === 'button') node.type = 'button';
    node.dataset.effect = card.rarity.effect;
    node.style.setProperty('--rarity', card.rarity.color);
    followPointer(node);
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

/** Particules qui partent du centre de la scène. */
export function burst(stage, { color, particles }) {
    if (reducedMotion()) return;
    for (let i = 0; i < particles; i++) {
        const particle = el('span', 'particle');
        const angle = Math.random() * Math.PI * 2;
        const distance = 140 + Math.random() * 260;
        const size = 3 + Math.random() * 6;
        particle.style.cssText = `width:${size}px;height:${size}px;background:${Math.random() < 0.25 ? '#ffffff' : color}`;
        stage.append(particle);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        particle.animate(
            [
                { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + 60}px)) scale(0)`, opacity: 0 },
            ],
            { duration: 900 + Math.random() * 900, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' },
        ).finished.finally(() => particle.remove());
    }
}
