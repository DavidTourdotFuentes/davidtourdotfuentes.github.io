// Réglages du jeu de cartes : c'est le seul fichier à modifier pour changer les raretés.

/**
 * Raretés, de la plus courante à la plus rare.
 * weight    : chance relative d'être tirée (60 sort deux fois plus souvent que 30)
 * color     : couleur du cadre, du halo et des particules
 * charge    : suspense avant le retournement de la carte, en millisecondes
 * particles : nombre de particules à l'apparition
 * effect    : 'none' (simple retournement), 'glow' (éclat), 'burst' (rayons et onde), 'legend' (tout, avec flash)
 */
export const RARITIES = [
    { id: 'common', weight: 60, color: '#94a3b8', charge: 0, particles: 0, effect: 'none' },
    { id: 'rare', weight: 27, color: '#38bdf8', charge: 250, particles: 12, effect: 'glow' },
    { id: 'ultra', weight: 10, color: '#c084fc', charge: 700, particles: 28, effect: 'burst' },
    { id: 'legendary', weight: 3, color: '#fbbf24', charge: 1300, particles: 60, effect: 'legend' },
];

export const BOOSTER = {
    size: 5, // cartes par booster
    guaranteed: 'rare', // la dernière carte vaut au moins cette rareté, tant qu'il en reste (null : aucune garantie)
    openOnFirstVisit: true, // propose un booster à la première arrivée sur le site
    allowRevealAll: true, // affiche « Voir tout le portfolio », pour les visiteurs pressés
};

/** Rareté de chaque carte. La clé est l'attribut data-card dans index.html ; une carte absente d'ici est commune. */
export const CARDS = {
    // Projets
    mechanicus: 'legendary',
    furyball: 'legendary',
    mallow: 'legendary',
    mol: 'ultra',
    meot: 'ultra',
    al: 'rare',
    dc: 'rare',
    hf: 'rare',
    polarnatt: 'rare',
    lrds: 'rare',
    lc: 'ultra',
    tr: 'common',
    pm: 'rare',
    aa: 'common',
    spring: 'rare',

    // Logiciels
    wwise: 'rare',
    reaper: 'ultra',
    fmod: 'rare',
    unity: 'rare',
    bitwig: 'ultra',
    unreal: 'rare',
    maxmsp: 'common',
    ableton: 'common',
    audition: 'common',
    protools: 'common',
};
