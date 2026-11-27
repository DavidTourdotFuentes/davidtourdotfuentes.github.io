// Textes du labo : la table du portfolio, ../translations.csv (clés lab_…), lue par ../translations.js.
// Ce script classique définit getTranslation et currentLang, et annonce chaque changement de langue par l'évènement translationschange.

const refreshers = new Set();
document.addEventListener('translationschange', () => {
    for (const refresh of refreshers) refresh();
});

/** Texte d'une clé, avec ses {variables} remplacées. Vide tant que la table n'est pas chargée. */
export function t(key, vars = {}) {
    let text = getTranslation(key); // fonction globale de translations.js
    if (!text && getTranslation('lab_title')) text = key; // clé absente de la table (un nom FMOD, par exemple) : affichée telle quelle
    return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

/** Lance fn tout de suite, puis à chaque changement de langue. */
export function live(fn) {
    fn();
    refreshers.add(fn);
}

/** Le texte du nœud suit la langue. vars : valeurs fixes, ou fonction qui les renvoie au moment voulu. */
export function text(node, key, vars) {
    live(() => {
        node.textContent = t(key, typeof vars === 'function' ? vars() : vars);
    });
    return node;
}

/** Un attribut du nœud (aria-label, title…) suit la langue. */
export function attr(node, name, key, vars) {
    live(() => node.setAttribute(name, t(key, typeof vars === 'function' ? vars() : vars)));
    return node;
}

/** Ajoute ?lang=en à un lien vers le portfolio, pour qu'il s'ouvre dans la même langue. */
export function keepLanguage(link) {
    const base = link.getAttribute('href');
    live(() => {
        const url = new URL(base, location.href);
        if (currentLang === 'en') url.searchParams.set('lang', 'en'); // currentLang : variable globale de translations.js
        link.href = url.href;
    });
}
