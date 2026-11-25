// Comportement commun aux fenêtres plein écran : le reste de la page ne reçoit plus ni clic, ni focus, ni défilement.

export function createModal(overlay, onEscape) {
    let background = [];
    let previousFocus = null;
    let wasInert = false; // ouverte par-dessus une autre fenêtre, qui l'avait désactivée avec le reste de la page

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
            previousFocus = document.activeElement;
            wasInert = overlay.inert;
            overlay.inert = false;
            background = [...document.body.children].filter((node) => node !== overlay && !node.inert && !node.matches('script'));
            for (const node of background) node.inert = true;
            lockScroll();
            overlay.hidden = false;
        },
        close() {
            overlay.hidden = true;
            for (const node of background) node.inert = false;
            overlay.inert = wasInert;
            unlockScroll();
            previousFocus?.focus?.({ preventScroll: true });
        },
    };
}
