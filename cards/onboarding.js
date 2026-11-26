// Première arrivée sur le site : le visiteur choisit comment le parcourir.
// « Navigation simplifiée » révèle tout le portfolio ; « Expérience complète » le laisse ouvrir des boosters pour le découvrir.
// Fonctions de translations.js utilisées ici : currentLang, setLanguage, markSwitching.
import { el, text } from './card.js';
import { createModal } from './modal.js';

/** Trois petites cartes : de face pour la navigation simplifiée, de dos devant un booster pour l'expérience complète. */
function illustration(kind) {
    const cards = [0, 1, 2].map((i) => {
        const card = el('span', 'onboard__mini');
        card.style.setProperty('--i', i);
        return card;
    });
    if (kind === 'full') cards.push(el('span', 'onboard__pack'));
    const node = el('span', `onboard__art onboard__art--${kind}`, {}, ...cards);
    node.setAttribute('aria-hidden', 'true');
    return node;
}

/** Le choix de langue, comme dans la bannière : le reste de la page est inaccessible tant que l'on n'a pas choisi. */
function languageSwitch() {
    const group = el('div', 'lang onboard__lang', {}, ...['fr', 'en'].map((lang) => {
        const button = el('button', '', { type: 'button', textContent: lang.toUpperCase() });
        button.dataset.setLang = lang;
        button.setAttribute('aria-pressed', String(lang === currentLang));
        button.addEventListener('click', () => {
            markSwitching(group);
            setLanguage(lang); // met à jour tous les sélecteurs de langue, celui de la bannière compris
        });
        return button;
    }));
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Langue / Language');
    return group;
}

/** choices : { quick() , full() }, appelées après la fermeture. Il n'y a pas de croix : on entre sur le site en choisissant. */
export function createOnboarding(choices) {
    const title = text('h2', 'onboard__title', 'onboard_title');
    title.id = 'onboard-title';
    const intro = text('p', 'onboard__intro', 'onboard_text');
    intro.id = 'onboard-intro';

    function choice(kind) {
        const name = text('span', 'onboard__name', `onboard_${kind}_title`);
        const button = el('button', `onboard__choice onboard__choice--${kind}`, { type: 'button' },
            illustration(kind),
            name,
            text('span', 'onboard__desc', `onboard_${kind}_text`),
            text('span', 'onboard__go', `onboard_${kind}_go`));
        button.addEventListener('click', () => {
            modal.close();
            choices[kind]();
        });
        return button;
    }

    const quick = choice('quick');
    const box = el('div', 'onboard__box', {}, languageSwitch(), title, intro, el('div', 'onboard__choices', {}, quick, choice('full')));
    const overlay = el('div', 'onboard', {}, el('div', 'onboard__bg'), box);
    overlay.setAttribute('aria-labelledby', title.id);
    overlay.setAttribute('aria-describedby', intro.id);
    const modal = createModal(overlay, () => {}); // Échap ne choisit pas à la place du visiteur

    return {
        open() {
            modal.open();
            quick.focus({ preventScroll: true });
        },
    };
}
