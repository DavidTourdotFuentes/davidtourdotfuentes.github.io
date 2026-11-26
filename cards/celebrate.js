// Collection complète : le grand VU-mètre part dans le rouge, le voyant PEAK s'allume, tout explose.
// Joué une fois par collection terminée (dernière carte d'un booster, ou Tout révéler). Un clic ou Échap l'arrête.
import { el, reducedMotion, text } from './card.js';
import { createMeter } from './meter.js';

const COLORS = ['#bfb296', '#58bcc4', '#f190b4', '#ff5a3a', '#f3c34b', '#fffbe6'];
const LENGTH = 4600; // durée totale, en millisecondes
const HIT = 950; // moment où l'aiguille cogne dans le rouge

/** Confettis et étoiles dessinés sur un canvas : des centaines de pièces sans alourdir la page. */
function createConfetti(canvas) {
    const ctx = canvas.getContext('2d');
    const pieces = [];
    let frame = 0;
    let last = 0;

    function resize() {
        const ratio = window.devicePixelRatio || 1;
        canvas.width = innerWidth * ratio;
        canvas.height = innerHeight * ratio;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function add(piece) {
        pieces.push({ life: 0, spin: Math.random() * 6, turn: (Math.random() - 0.5) * 14, ...piece });
        if (!frame) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
        }
    }

    /** Explosion depuis un point : en cercle, vers le haut d'abord. */
    function explode(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 380 + Math.random() * 900;
            add({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 380, size: 5 + Math.random() * 9, color: COLORS[i % COLORS.length], star: i % 5 === 0, max: 1.6 + Math.random() * 1.6 });
        }
    }

    /** Pluie depuis le haut de l'écran. */
    function rain(count) {
        for (let i = 0; i < count; i++) {
            add({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 220, size: 5 + Math.random() * 7, color: COLORS[i % COLORS.length], star: i % 7 === 0, max: 4 });
        }
    }

    function star(x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const radius = i % 2 ? r * 0.28 : r;
            const angle = (i * Math.PI) / 4;
            ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
    }

    function tick(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = pieces.length - 1; i >= 0; i--) {
            const p = pieces[i];
            p.life += dt;
            p.vx *= 1 - 1.6 * dt; // l'air freine
            p.vy = p.vy * (1 - 1.6 * dt) + 900 * dt; // la pesanteur reprend le dessus
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.spin += p.turn * dt;
            if (p.life > p.max || p.y > innerHeight + 40) {
                pieces.splice(i, 1);
                continue;
            }
            ctx.globalAlpha = Math.min(1, (p.max - p.life) * 2);
            ctx.fillStyle = p.color;
            if (p.star) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                star(p.x, p.y, p.size * 1.3);
                ctx.shadowBlur = 0;
            } else {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.spin);
                ctx.scale(1, Math.abs(Math.cos(p.spin * 1.7)) * 0.8 + 0.2); // la pièce tourne sur elle-même
                ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;
        frame = pieces.length ? requestAnimationFrame(tick) : 0;
    }

    resize();
    return {
        explode,
        rain,
        stop() {
            cancelAnimationFrame(frame);
            frame = 0;
            pieces.length = 0;
        },
    };
}

export function createCelebration() {
    let playing = null;

    /** total : nombre de cartes. Renvoie une promesse tenue quand l'animation est finie ou passée. */
    function play(total) {
        if (playing) return playing;
        const calm = reducedMotion();
        const canvas = el('canvas', 'peak__confetti');
        const meter = createMeter({ ticks: 21, red: 15, labels: [['−20', 2], ['−7', 8], ['0', 15], ['+3', 19.2]] });
        const needle = meter.querySelector('.meter__needle');
        const lamp = el('span', 'peak__lamp', {}, el('span', '', { textContent: 'PEAK' }));
        const dial = el('div', 'peak__dial', {}, meter, lamp);
        const title = el('p', 'peak__title');
        const word = getTranslation('cards_complete');
        title.setAttribute('aria-label', word);
        // Lettre par lettre pour l'animation, mais mot par mot pour le retour à la ligne
        let i = 0;
        word.split(' ').forEach((part, w) => {
            if (w) title.append(' ');
            const group = el('span', 'peak__word');
            group.setAttribute('aria-hidden', 'true');
            for (const letter of part) {
                const span = el('span', 'peak__letter', { textContent: letter });
                span.style.setProperty('--i', i++);
                group.append(span);
            }
            title.append(group);
        });
        const count = el('span', 'peak__count', { textContent: '0' });
        const sub = el('p', 'peak__sub', {}, count, ` / ${total} `, text('span', '', 'meter_cards'));
        const rings = el('div', 'peak__rings', {}, ...['#ff5a3a', '#f190b4', '#58bcc4'].map((color, i) => {
            const ring = el('span', 'peak__ring');
            ring.style.cssText = `--color:${color};--delay:${i * 120}ms`;
            return ring;
        }));
        const stage = el('div', 'peak__stage', {}, rings, dial, title, sub);
        const overlay = el('div', 'peak', {}, el('div', 'peak__flash'), canvas, stage);
        overlay.setAttribute('role', 'status');
        document.body.append(overlay);
        if (calm) overlay.classList.add('is-calm');

        const confetti = calm ? null : createConfetti(canvas);
        const timers = [];
        const later = (ms, fn) => timers.push(setTimeout(fn, ms));

        playing = new Promise((resolve) => {
            function end() {
                if (overlay.classList.contains('is-leaving')) return;
                timers.forEach(clearTimeout);
                overlay.classList.add('is-leaving');
                document.removeEventListener('keydown', onKey);
                setTimeout(() => {
                    confetti?.stop();
                    overlay.remove();
                    playing = null;
                    resolve();
                }, 400);
            }
            const onKey = (event) => { if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') end(); };
            overlay.addEventListener('click', end);
            document.addEventListener('keydown', onKey);

            if (calm) {
                count.textContent = total;
                overlay.classList.add('is-hit');
                later(2600, end);
                return;
            }

            // 1. L'aiguille balaie tout le cadran et cogne dans le rouge, puis tremble contre la butée
            needle.animate([
                { transform: 'rotate(-46deg)' },
                { transform: 'rotate(-30deg)', offset: 0.35 },
                { transform: 'rotate(54deg)', offset: 0.82 },
                { transform: 'rotate(44deg)', offset: 0.9 },
                { transform: 'rotate(51deg)' },
            ], { duration: HIT, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'forwards' }).finished.then(() => {
                needle.animate([{ transform: 'rotate(51deg)' }, { transform: 'rotate(47deg)' }, { transform: 'rotate(52deg)' }, { transform: 'rotate(48.5deg)' }],
                    { duration: 260, iterations: 6, direction: 'alternate', fill: 'forwards' });
            }).catch(() => {});

            // 2. Le choc : voyant, flash, ondes, explosion, la scène tremble
            later(HIT, () => {
                overlay.classList.add('is-hit');
                const box = meter.getBoundingClientRect();
                confetti.explode(box.left + box.width / 2, box.top + box.height * 0.75, 260);
            });
            // 3. Le compteur défile jusqu'au total
            later(HIT + 350, () => {
                const start = performance.now();
                const step = (now) => {
                    const t = Math.min((now - start) / 900, 1);
                    count.textContent = Math.round(total * (1 - (1 - t) ** 3));
                    if (t < 1 && overlay.isConnected) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            });
            // 4. Une pluie de confettis pour finir
            later(HIT + 700, () => confetti.rain(160));
            later(LENGTH, end);
        });
        return playing;
    }

    return { play };
}
