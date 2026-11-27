// Comportement commun aux fenêtres plein écran : le reste de la page ne reçoit plus ni clic, ni focus, ni défilement.
// Le bouton retour du téléphone (ou du navigateur) ferme la fenêtre du dessus au lieu de quitter la page :
// chaque fenêtre ouverte ajoute une entrée à l'historique, que sa fermeture retire.

const stack = []; // fenêtres ouvertes qui se ferment au retour, la plus récente en dernier
let ownBacks = 0; // retours lancés ici, après une fermeture au clic : déjà traités

window.addEventListener('popstate', () => {
    if (ownBacks) {
        ownBacks--;
        return;
    }
    const entry = stack.pop();
    if (!entry) return;
    entry.popped = true;
    entry.onBack();
});

/** back : false pour une fenêtre que l'on ne peut pas fermer sans choisir (le retour quitte alors la page, comme d'habitude). */
export function createModal(overlay, onEscape, { back = true } = {}) {
    let background = [];
    let previousFocus = null;
    let wasInert = false; // ouverte par-dessus une autre fenêtre, qui l'avait désactivée avec le reste de la page
    let entry = null; // sa place dans l'historique

    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.tabIndex = -1;
    overlay.hidden = true;
    overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') onEscape();
    });
    document.body.append(overlay);

    return {
        open() {
            if (!overlay.hidden) return;
            previousFocus = document.activeElement;
            wasInert = overlay.inert;
            overlay.inert = false;
            background = [...document.body.children].filter((node) => node !== overlay && !node.inert && !node.matches('script'));
            for (const node of background) node.inert = true;
            lockScroll();
            overlay.hidden = false;
            if (back) {
                entry = { onBack: onEscape, popped: false };
                stack.push(entry);
                history.pushState({ modal: true }, '');
            }
        },
        close() {
            overlay.hidden = true;
            for (const node of background) node.inert = false;
            overlay.inert = wasInert;
            unlockScroll();
            previousFocus?.focus?.({ preventScroll: true });
            if (entry) {
                if (stack.includes(entry)) stack.splice(stack.indexOf(entry), 1);
                if (!entry.popped) { // fermée au clic : son entrée d'historique s'en va aussi
                    ownBacks++;
                    history.back();
                }
                entry = null;
            }
        },
    };
}
