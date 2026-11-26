// Fenêtre de confirmation : une question, Oui ou Non. La croix, Échap et un clic à côté valent Non.
import { el, text } from './card.js';
import { svg } from './meter.js';
import { createModal } from './modal.js';

/** questionKey : la question, dans translations.csv. ask() renvoie une promesse : true pour Oui, false sinon. */
export function createConfirm(questionKey) {
    const question = text('p', 'confirm__text', questionKey);
    question.id = `confirm-${questionKey}`;
    // Oui et Non se ressemblent et réagissent pareil au survol : aucun n'est poussé plus que l'autre
    const yes = text('button', 'btn btn--line confirm__yes', 'confirm_yes');
    const no = text('button', 'btn btn--line confirm__no', 'confirm_no');
    const close = el('button', 'confirm__close', {}, svg('confirm__cross', '0 0 24 24', '<path d="M6 6l12 12M18 6L6 18"/>'));
    for (const button of [yes, no, close]) button.type = 'button';
    const box = el('div', 'confirm__box', {}, question, el('div', 'confirm__actions', {}, yes, no), close);
    const overlay = el('div', 'confirm', {}, el('div', 'confirm__bg'), box);
    overlay.setAttribute('aria-labelledby', question.id);

    let settle = null;
    const modal = createModal(overlay, () => answer(false));

    function answer(value) {
        if (!settle) return;
        modal.close();
        settle(value);
        settle = null;
    }

    yes.addEventListener('click', () => answer(true));
    no.addEventListener('click', () => answer(false));
    close.addEventListener('click', () => answer(false));
    overlay.addEventListener('click', (event) => {
        if (!box.contains(event.target)) answer(false);
    });

    return {
        ask() {
            if (settle) return Promise.resolve(false);
            close.setAttribute('aria-label', getTranslation('cards_close'));
            modal.open();
            no.focus({ preventScroll: true }); // la réponse sans conséquence, si l'on valide sans lire
            return new Promise((resolve) => { settle = resolve; });
        },
    };
}
