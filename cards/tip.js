// Bulle d'explication sous un bouton : au survol, au focus, ou au toucher (un second toucher la ferme). Échap la ferme aussi.
import { el } from './card.js';

let count = 0;
let openTip = null; // une seule bulle ouverte à la fois

/** trigger : le bouton. fill(box) remplit la bulle ; appelée à chaque ouverture, elle suit la langue du moment. */
export function attachTip(trigger, fill) {
    const box = el('div', 'tip');
    box.id = `tip-${++count}`;
    box.setAttribute('role', 'tooltip');
    box.hidden = true;
    trigger.setAttribute('aria-describedby', box.id);
    trigger.setAttribute('aria-expanded', 'false');
    let pinned = false; // ouverte au toucher ou au clic : elle reste jusqu'au prochain

    function show() {
        if (openTip && openTip !== hide) openTip();
        openTip = hide;
        fill(box);
        box.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        // Près du bord droit de l'écran, la bulle se décale vers la gauche
        box.style.removeProperty('--shift');
        const overflow = box.getBoundingClientRect().right - (document.documentElement.clientWidth - 12);
        if (overflow > 0) box.style.setProperty('--shift', `${-overflow}px`);
    }
    function hide() {
        if (openTip === hide) openTip = null;
        pinned = false;
        box.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('mouseleave', () => { if (!pinned) hide(); });
    trigger.addEventListener('focus', show);
    trigger.addEventListener('blur', hide);
    trigger.addEventListener('click', () => {
        if (pinned) hide();
        else {
            pinned = true;
            show();
        }
    });
    trigger.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });
    document.addEventListener('pointerdown', (event) => { if (pinned && !trigger.contains(event.target)) hide(); });
    return box;
}
