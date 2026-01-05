// Mobile menu toggle
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

const spheres = document.querySelectorAll('.floating-sphere');

function updateSpheres() {
    const scrollY = window.scrollY;

    spheres.forEach(sphere => {
        const depth = parseFloat(sphere.dataset.depth) || 0.3;

        // Parallax inversé (plus depth est grand, plus ça bouge)
        const translateY = -scrollY * depth;

        // Flou inversé : loin = flou, proche = net
        const blur = (1 - depth) * 6;

        sphere.style.transform = `translateY(${translateY}px)`;
        sphere.style.filter = `blur(${blur}px)`;
    });
}

// appel initial
updateSpheres();

// écoute du scroll
window.addEventListener('scroll', updateSpheres);


// Scroll animations
const observerOptions = {
    threshold: 0.1
};



const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.section').forEach(section => {
    observer.observe(section);
});

// Project filtering
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Update active button
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const filter = button.dataset.filter;

        projectCards.forEach(card => {
            const categories = card.dataset.category.split(' ');
            if (filter === 'all' || categories.includes(filter)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Load more projects
const loadMoreBtn = document.getElementById('load-more');
let visibleProjects = 6;

// Initially hide projects beyond the first 6
projectCards.forEach((card, index) => {
    if (index >= 6) {
        card.style.display = 'none';
    }
});

loadMoreBtn.addEventListener('click', () => {
    visibleProjects += 6;
    
    // Show next batch of projects
    projectCards.forEach((card, index) => {
        if (index < visibleProjects) {
            card.style.display = 'block';
        }
    });
    
    // Hide button if all projects are visible
    if (visibleProjects >= projectCards.length) {
        loadMoreBtn.style.display = 'none';
    }
});

// Back to top button
const backToTopButton = document.querySelector('.back-to-top');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTopButton.classList.add('active');
    } else {
        backToTopButton.classList.remove('active');
    }
});

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Custom cursor
const cursor = document.querySelector('.cursor');
const cursorFollower = document.querySelector('.cursor-follower');
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

if (isTouchDevice) {
  cursor.style.display = 'none';
  cursorFollower.style.display = 'none';
} else {

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        setTimeout(() => {
            cursorFollower.style.left = e.clientX + 'px';
            cursorFollower.style.top = e.clientY + 'px';
        }, 75);
    });

    document.addEventListener('mousedown', () => {
        cursor.classList.add('cursor-active');
        cursorFollower.classList.add('cursor-follower-active');
    });

    document.addEventListener('mouseup', () => {
        cursor.classList.remove('cursor-active');
        cursorFollower.classList.remove('cursor-follower-active');
    });

    // Add cursor effects to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .project-card, .software-card, .tool-item, .soundcloud-embed');

    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('cursor-active');
            cursorFollower.classList.add('cursor-follower-active');
        });
        
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('cursor-active');
            cursorFollower.classList.remove('cursor-follower-active');
        });
    });

    // Hide cursor on iframe elements
    const iframes = document.querySelectorAll('iframe');

    iframes.forEach(iframe => {
    iframe.addEventListener('mouseenter', () => {
        cursor.classList.add('cursor-hide');
        cursorFollower.classList.add('cursor-follower-hide');
    });

    iframe.addEventListener('mouseleave', () => {
        cursor.classList.remove('cursor-hide');
        cursorFollower.classList.remove('cursor-follower-hide');
    });
    });

}


// Portfolio detail panel
const portfolioPanel = document.getElementById('portfolio-panel');
const portfolioPanelContent = document.getElementById('portfolio-panel-content');
const portfolioPanelClose = document.getElementById('portfolio-panel-close');
const panelBg = document.getElementById('portfolio-panel-bg');

function getEmbedHeight(type) {
    switch (type) {
        case 'soundcloud':
            return '300px';
        case 'spotify':
            return '380px';
        case 'youtube':
            return '450px';
        default:
            return '300px';
    }
}


projectCards.forEach(card => {
    card.addEventListener('click', () => {

        panelBg.style.backgroundImage = `
            linear-gradient(
                to top,
                rgba(30, 41, 59, 1) 0%,
                rgba(30, 41, 59, 0.9) 10%,
                rgba(30, 41, 59, 0.35) 30%,
                rgba(30, 41, 59, 0.2) 50%,
                rgba(30, 41, 59, 0.35) 70%,
                rgba(30, 41, 59, 0.9) 90%,
                rgba(30, 41, 59, 1) 100%
            ),
            url('${card.dataset.bg}')
        `;
        panelBg.classList.add('panel-bg');

        console.log(getEmbedHeight(card.dataset.embedType));

        if(!card.dataset.iframe) {
            // Injection du contenu dans le panel
            document.getElementById('portfolio-panel-title').textContent = getTranslation(card.dataset.title);
            portfolioPanelContent.innerHTML = `
                <p class="text-slate-400 mb-6 whitespace-pre-wrap flex-1">${getTranslation(card.dataset.i18nLong)}</p>
            `;
        } else {
            // Injection du contenu dans le panel
            document.getElementById('portfolio-panel-title').textContent = getTranslation(card.dataset.title);
            portfolioPanelContent.innerHTML = `
                <p class="text-slate-400 mb-6 whitespace-pre-wrap flex-1">${getTranslation(card.dataset.i18nLong)}</p>
                <div class="iframe-wrapper w-full flex-shrink-0">
                    <div class="relative w-full aspect-video md:aspect-[16/9]">
                        <iframe class="absolute inset-0 w-full h-full" allow="autoplay" frameborder="0" src="${card.dataset.iframe}"></iframe>
                    </div>
                </div>
            `;
        }


        // Affichage avec animation
        portfolioPanel.classList.remove('hidden');
        portfolioPanel.classList.add('flex');
    });

    card.innerHTML = `
        <img src="${card.dataset.icon}" alt="${card.dataset.alt}" class="w-full h-48 object-cover">
        <div class="project-content p-6">
            <h3 id="panel-title" class="text-lg md:text-2xl font-bold mb-4 flex-shrink-0"></h3>
            <p class="text-slate-400 mb-4" data-i18n="${card.dataset.i18nDesc}">Description</p>
        </div>
    `;
});

// Fermeture avec animation
function closePortfolioPanel() {
    const panelContent = portfolioPanel.querySelector('div');

    // Ajoute les animations de sortie
    panelContent.classList.add('animate-scale-out');
    portfolioPanel.classList.add('animate-fade-out');

    // Après la durée de l'animation, cache l'élément et reset
    setTimeout(() => {
        portfolioPanel.classList.add('hidden');
        portfolioPanel.classList.remove('flex', 'animate-fade-out');
        panelContent.classList.remove('animate-scale-out');
        portfolioPanelContent.innerHTML = '';
    }, 300);
}

// Fermer via la croix
portfolioPanelClose.addEventListener('click', closePortfolioPanel);

// Fermer en cliquant en dehors
portfolioPanel.addEventListener('click', (e) => {
    if (e.target === portfolioPanel) closePortfolioPanel();
});

