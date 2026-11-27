// Langue de départ : le français, sauf si l'adresse demande ?lang=en (le lien d'une page à l'autre garde ainsi la langue choisie).
let currentLang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'fr';
const translations = {};
// Le fichier est à côté de ce script : la même table sert au portfolio et au labo audio (audio-demos/).
const TRANSLATIONS_URL = new URL('translations.csv', document.currentScript.src);

function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];

        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } // "" -> "
            else if (c === '"') inQuotes = false;
            else cell += c;
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ',') { row.push(cell); cell = ''; }
            else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
            else if (c !== '\r') cell += c;
        }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
}

function loadTranslations(lang = 'fr') {
    fetch(TRANSLATIONS_URL)
        .then(response => response.text())
        .then(text => {
            const rows = parseCSV(text.trim());
            const langIndex = rows[0].indexOf(lang);

            for (let i = 1; i < rows.length; i++) {
                const key = rows[i][0];
                if (!key) continue;
                translations[key] = rows[i][langIndex] ?? '';
            }

            currentLang = lang;
            document.documentElement.lang = lang;
            applyTranslations(translations);
            document.dispatchEvent(new Event('translationschange'));
        })
        .catch(err => console.error('Erreur de chargement des traductions :', err));
}

function applyTranslations(translations) {
    for (const key in translations) {
        const text = translations[key];

        document.querySelectorAll(`[data-i18n="${key}"]`).forEach(el => {
            // Si le texte contient <br>, <strong>, <em>, etc., on injecte en HTML
            if (/<\/?[a-z][\s\S]*>/i.test(text)) {
                el.innerHTML = text;
            } else {
                el.textContent = text;
            }
        });
        // Libellé lu par les lecteurs d'écran, pour un élément sans texte visible
        document.querySelectorAll(`[data-i18n-aria="${key}"]`).forEach(el => el.setAttribute('aria-label', text));
    }
}


function getTranslation(key) {
    return translations[key] ?? '';
}

function setLanguage(lang) {    
    document.querySelectorAll('.lang').forEach(group => {
        group.querySelectorAll('[data-set-lang]').forEach(button => {
            const active = button.dataset.setLang === lang;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active);
        });
    });

    loadTranslations(lang);
}

/** Le temps d'une animation, le groupe porte .is-switching : seul un clic anime le choix, jamais le chargement. */
function markSwitching(group) {
    if (!group) return;
    group.classList.remove('is-switching');
    void group.offsetWidth; // relance l'animation si l'on clique vite
    group.classList.add('is-switching');
    clearTimeout(group.switchTimer);
    group.switchTimer = setTimeout(() => group.classList.remove('is-switching'), 700);
}

// Set initial language
setLanguage(currentLang);

// Add event listeners for language buttons
document.querySelectorAll('[data-set-lang]').forEach(button => {
    button.addEventListener('click', () => {
        markSwitching(button.parentElement);
        setLanguage(button.dataset.setLang);
    });
});
