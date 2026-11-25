// Thème Light / Dark, commun au portfolio et aux démos audio. Chargé dans <head> pour que la page ne clignote pas.
// Sans choix du visiteur, on suit le réglage de son système.
(() => {
    const STORAGE_KEY = 'portfolio-theme';
    const root = document.documentElement;
    const system = window.matchMedia('(prefers-color-scheme: dark)');

    let chosen = null;
    try {
        chosen = localStorage.getItem(STORAGE_KEY);
    } catch {
        // Stockage bloqué : le choix ne dure que le temps de la visite.
    }

    function apply() {
        root.dataset.theme = (chosen ?? (system.matches ? 'dark' : 'light')) === 'dark' ? 'dark' : 'light';
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', root.dataset.theme === 'dark' ? '#15110e' : '#f3c34b');
        for (const button of document.querySelectorAll('[data-set-theme]')) {
            button.setAttribute('aria-pressed', button.dataset.setTheme === root.dataset.theme);
        }
    }

    apply();
    system.addEventListener('change', apply);
    document.addEventListener('DOMContentLoaded', () => {
        apply();
        for (const button of document.querySelectorAll('[data-set-theme]')) {
            button.addEventListener('click', () => {
                chosen = button.dataset.setTheme;
                try {
                    localStorage.setItem(STORAGE_KEY, chosen);
                } catch {
                    // Même cas que plus haut.
                }
                apply();
            });
        }
    });
})();
