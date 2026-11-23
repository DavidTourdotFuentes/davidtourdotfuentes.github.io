// Pause et reprise selon la visibilité de la page et des cartes.

/** Suspend le moteur quand l'onglet est caché, le libère quand la page est quittée. */
export function watchPage(engine, { onError, onReleased }) {
    const guard = (action) => {
        try {
            action();
        } catch (error) {
            onError(error);
        }
    };

    document.addEventListener('visibilitychange', () => {
        guard(() => (document.hidden ? engine.suspend() : engine.resume()));
    });

    window.addEventListener('pagehide', () => {
        guard(() => engine.release());
        onReleased();
    });

    // Retour par le cache avant/arrière : la page revient sans événement visibilitychange garanti.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) guard(() => engine.resume());
    });
}

/** Appelle onHidden(carte) quand une carte sort entièrement de l'écran. */
export function watchCards(cards, onHidden) {
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) onHidden(entry.target);
        }
    });
    for (const card of cards) observer.observe(card);
}
