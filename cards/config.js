// Réglages du jeu de cartes : c'est le seul fichier à modifier pour changer les raretés.

/**
 * Raretés, de la plus courante à la plus rare.
 * weight    : chance de tirage de chaque carte de cette rareté. Des poids proches donnent à chaque booster des chances
 *             comparables ; un grand écart épuise vite les communes et garde les légendaires pour la fin
 * color     : couleur du potard, de l'aplat d'apparition et des éclats
 * knob      : angle du potard, en degrés (-135 = 7 h, 135 = 5 h)
 * needle    : angle de l'aiguille au dos de la carte, quand elle monte avant de se retourner
 * charge    : suspense avant le retournement de la carte, en millisecondes
 * particles : nombre de particules à l'apparition
 * effect    : lumière et mise en scène. 'none' (aucune), 'glow' (reflet, aplat),
 *             'burst' (reflet coloré, liseré, aplat et onde), 'legend' (reflet doré, halo, éclats, rayons et éclair)
 */
export const RARITIES = [
    { id: 'common', weight: 10, color: '#bfb296', knob: -135, needle: -26, charge: 0, particles: 0, effect: 'none' },
    { id: 'rare', weight: 9, color: '#58bcc4', knob: -45, needle: -4, charge: 250, particles: 12, effect: 'glow' },
    { id: 'ultra', weight: 8, color: '#f190b4', knob: 45, needle: 14, charge: 700, particles: 28, effect: 'burst' },
    { id: 'legendary', weight: 7, color: '#ff5a3a', knob: 135, needle: 42, charge: 1300, particles: 60, effect: 'legend' },
];

export const BOOSTER = {
    size: 5, // cartes par booster
    guaranteed: 'rare', // une carte au moins vaut cette rareté, tant qu'il en reste (null : aucune garantie)
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
