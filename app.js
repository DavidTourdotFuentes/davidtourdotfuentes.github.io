// --- Adresse étirée : elle remplit sa largeur en jouant sur l'axe « wdth » de la police ---

const WIDTH_MIN = 50;
const WIDTH_MAX = 150;

class StretchLine {
    constructor(text) {
        this.node = document.createElement('span');
        this.node.className = 'stretch__line';
        this.node.setAttribute('aria-hidden', 'true');
        this.letters = [...text].map((letter) => {
            const span = document.createElement('span');
            span.textContent = letter;
            return span;
        });
        this.node.append(...this.letters);
        this.base = 100;
    }

    set(width) {
        for (const letter of this.letters) letter.style.fontVariationSettings = `"wdth" ${width}`;
    }

    /** Cherche la largeur de lettres qui remplit exactement la ligne ; agrandit le corps si l'axe ne suffit pas. */
    fit(available, fontSize) {
        this.node.style.fontSize = `${fontSize}px`;
        let low = WIDTH_MIN;
        let high = WIDTH_MAX;
        for (let i = 0; i < 9; i++) {
            this.base = (low + high) / 2;
            this.set(this.base);
            if (this.node.offsetWidth > available) high = this.base;
            else low = this.base;
        }
        this.base = low;
        this.set(low);
        const left = available / this.node.offsetWidth;
        if (left > 1.01 || left < 0.99) this.node.style.fontSize = `${fontSize * left}px`;
    }
}

const email = document.querySelector('[data-stretch-text]');
const emailLine = new StretchLine(email.dataset.stretchText);
email.setAttribute('aria-label', email.dataset.stretchText);
email.replaceChildren(emailLine.node);

function fitEmail() {
    if (email.clientWidth) emailLine.fit(email.clientWidth, email.clientWidth / emailLine.letters.length * 1.62);
}
fitEmail();
document.fonts.addEventListener('loadingdone', fitEmail); // la police arrive parfois après le premier calcul

let fittedWidth = 0;
new ResizeObserver(() => {
    if (email.clientWidth === fittedWidth) return;
    fittedWidth = email.clientWidth;
    fitEmail();
}).observe(email);

// --- Navigation : la section visible est soulignée ---

const navLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
const visible = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
        const link = navLinks.find((item) => item.hash === `#${target.id}`);
        if (isIntersecting) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
    }
}, { rootMargin: '-45% 0px -50%' });
for (const link of navLinks) visible.observe(document.querySelector(link.hash));

// --- Filtres des projets ---

const filterButtons = [...document.querySelectorAll('.filter-btn')];
const projectCards = [...document.querySelectorAll('.project-card')];

for (const button of filterButtons) {
    button.addEventListener('click', () => {
        for (const other of filterButtons) other.setAttribute('aria-pressed', other === button);
        const { filter } = button.dataset;
        for (const card of projectCards) card.hidden = filter !== 'all' && !card.dataset.category.split(' ').includes(filter);
    });
}

// --- Défilement bloqué sous les fenêtres (cards/modal.js) ---

let locks = 0; // fenêtres ouvertes : une fiche peut s'ouvrir par-dessus le booster

function lockScroll() {
    if (locks++) return;
    // Compense la barre de défilement qui disparaît, pour que la page ne saute pas.
    document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    document.documentElement.style.overflow = 'hidden';
}

function unlockScroll() {
    if (--locks) return;
    document.documentElement.style.overflow = '';
    document.body.style.paddingRight = '';
}
