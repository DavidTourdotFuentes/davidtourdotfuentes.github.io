// Réglages du jeu de cartes : raretés, boosters et filtres. Les cartes elles-mêmes sont dans data.js.

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
    { id: 'epic', weight: 8, color: '#f190b4', knob: 45, needle: 14, charge: 700, particles: 28, effect: 'burst' },
    { id: 'legendary', weight: 7, color: '#ff5a3a', knob: 135, needle: 42, charge: 1300, particles: 60, effect: 'legend' },
];

export const BOOSTER = {
    size: 5, // cartes par booster
    guaranteed: 'rare', // une carte au moins vaut cette rareté, tant qu'il en reste (null : aucune garantie)
    openOnFirstVisit: true, // propose un booster à la première arrivée sur le site
    allowRevealAll: true, // affiche « Tout révéler », pour les visiteurs pressés
};

/**
 * Types de cartes. Ajouter un type : une ligne ici, son nom dans translations.csv (type_xxx), sa grille dans index.html
 * (data-types="xxx" ; plusieurs types peuvent partager une grille), et la couleur de son recto dans cards/cards.css ([data-type="xxx"]).
 * timeline : true si les cartes de ce type, datées par year, sortent dans la timeline
 * art : 'cover' (l'image remplit le haut de la carte) ou 'logo' (petit logo blanc centré sur fond sombre) ; une carte peut le changer
 * kinds : sortes possibles à l'intérieur du type (champ kind d'une carte), filtrables dans sa section ; leur nom : kind_xxx dans translations.csv
 * icon : pictogramme de la pastille en haut à droite de la carte, en SVG 24 x 24 (traits de 2, sans remplissage)
 */
export const TYPES = {
    project: { art: 'cover', timeline: true, icon: '<path class="fill" d="M8.5 5.5v13l10-6.5z"/>' }, // touche lecture
    skill: { art: 'cover', kinds: ['software'], icon: '<path d="M6 4v16M12 4v16M18 4v16"/><rect class="fill" x="3.5" y="13" width="5" height="3.4" rx="1"/><rect class="fill" x="9.5" y="6.5" width="5" height="3.4" rx="1"/><rect class="fill" x="15.5" y="10.5" width="5" height="3.4" rx="1"/>' }, // savoir-faire et logiciels : des faders
    career: { art: 'cover', icon: '<circle class="fill" cx="5" cy="18.5" r="2.2"/><circle class="fill" cx="19" cy="5.5" r="2.2"/><path d="M5 18.5c0-5 7-3 7-7s7-1 7-6" stroke-dasharray="2.4 2.6"/>' }, // parcours : études et postes, un chemin d'étape en étape
};

/** Filtres du portfolio, dans l'ordre : la valeur à mettre dans les tags d'une carte, et sa clé dans translations.csv. */
export const TAGS = {
    'sound-design': 'filter_sound_design',
    soundtrack: 'filter_soundtrack',
    'audio-integration': 'filter_audio_integration',
    'audio-tool': 'filter_audio_tool',
};
