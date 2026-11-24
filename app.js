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
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn === button);
            btn.setAttribute('aria-pressed', btn === button);
        });
        
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

}


function lockScroll() {
    // Compense la disparition de la scrollbar pour éviter que la page "saute"
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
}

function unlockScroll() {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}