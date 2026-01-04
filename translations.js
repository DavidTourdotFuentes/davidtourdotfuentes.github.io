let currentLang = 'fr';
const translations = {};

function loadTranslations(lang = 'fr') {
    fetch('translations.csv')
        .then(response => response.text())
        .then(text => {
            const rows = text.trim().split('\n');
            const headers = rows[0].replace(/\r/g, '').split(','); // ['key', 'en', 'fr']
            const langIndex = headers.indexOf(lang);

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // CSV-safe split
                const key = cols[0];
                const value = cols[langIndex];
                translations[key] = value;
            }

            applyTranslations(translations);
        })
        .catch(err => console.error('Erreur de chargement des traductions :', err));
}

function applyTranslations(translations) {
    for (const key in translations) {
        const el = document.querySelector(`[data-i18n="${key}"]`);
        if (!el) continue;

        const text = translations[key];

        // Si le texte contient <br>, <strong>, <em>, etc., on injecte en HTML
        if (/<\/?[a-z][\s\S]*>/i.test(text)) {
            el.innerHTML = text;
        } else {
            el.textContent = text;
        }
    }
}


function getTranslation(key) {
    return translations[key] ?? '';
}

function setLanguage(lang) {    
    // Update active language button
    document.getElementById('lang-en').classList.toggle('bg-primary-700', lang === 'en');
    document.getElementById('lang-en').classList.toggle('bg-transparent', lang !== 'en');
    document.getElementById('lang-en').classList.toggle('text-white', lang === 'en');
    document.getElementById('lang-en').classList.toggle('text-slate-400', lang !== 'en');
    
    document.getElementById('lang-fr').classList.toggle('bg-primary-700', lang === 'fr');
    document.getElementById('lang-fr').classList.toggle('bg-transparent', lang !== 'fr');
    document.getElementById('lang-fr').classList.toggle('text-white', lang === 'fr');
    document.getElementById('lang-fr').classList.toggle('text-slate-400', lang !== 'fr');
    
    document.getElementById('mobile-lang-en').classList.toggle('bg-primary-700', lang === 'en');
    document.getElementById('mobile-lang-en').classList.toggle('bg-transparent', lang !== 'en');
    document.getElementById('mobile-lang-en').classList.toggle('text-white', lang === 'en');
    document.getElementById('mobile-lang-en').classList.toggle('text-slate-400', lang !== 'en');
    
    document.getElementById('mobile-lang-fr').classList.toggle('bg-primary-700', lang === 'fr');
    document.getElementById('mobile-lang-fr').classList.toggle('bg-transparent', lang !== 'fr');
    document.getElementById('mobile-lang-fr').classList.toggle('text-white', lang === 'fr');
    document.getElementById('mobile-lang-fr').classList.toggle('text-slate-400', lang !== 'fr');

    loadTranslations(lang);
}

// Set initial language
setLanguage(currentLang);

// Add event listeners for language buttons
document.getElementById('lang-en').addEventListener('click', () => setLanguage('en'));
document.getElementById('lang-fr').addEventListener('click', () => setLanguage('fr'));
document.getElementById('mobile-lang-en').addEventListener('click', () => setLanguage('en'));
document.getElementById('mobile-lang-fr').addEventListener('click', () => setLanguage('fr'));
