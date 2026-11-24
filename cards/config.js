// Réglages du jeu de cartes : raretés, boosters, économie et échanges.

/** Identifiant du jeu : nom de la sauvegarde, et les codes d'échange d'un autre jeu sont refusés. */
export const GAME_ID = 'david-tf-portfolio';

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
    mixTypes: true, // mélange projets et logiciels dans chaque booster
    allowRevealAll: false, // affiche « Voir tout le portfolio », qui donne toutes les cartes d'un coup
};

/** Pièces et boosters gratuits. Les montants par rareté utilisent les id de RARITIES. */
export const ECONOMY = {
    startCoins: 0, // pièces à la première arrivée
    boosterPrice: 100, // prix d'un booster quand il n'y en a plus de gratuit
    freeBooster: {
        start: 2, // boosters gratuits à la première arrivée
        every: 10, // minutes pour en regagner un
        max: 3, // réserve maximale
    },
    discoverReward: { common: 5, rare: 10, ultra: 25, legendary: 60 }, // prime pour une carte jamais possédée
    sellPrice: { common: 10, rare: 25, ultra: 60, legendary: 150 }, // revente d'un double
};

/** Échanges entre joueurs. */
export const TRADE = {
    allowLastCopy: true, // on peut échanger son unique exemplaire, la carte redevient alors non découverte (false : doubles seulement)
    server: null, // service qui met les joueurs en relation : null pour le service public de PeerJS, ou { host, port, path, secure }
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
