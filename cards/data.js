// Toutes les cartes du site. C'est le seul fichier à modifier pour ajouter, changer ou retirer une carte.
//
// AJOUTER UNE CARTE
// 1. Mettre son image dans ressources/Cards (640 px de haut suffisent, en .jpg).
// 2. Copier le modèle ci-dessous à l'endroit voulu de la liste : l'ordre de la liste donne le numéro de la carte.
// 3. Vérifier : `node tools/check-cards.mjs`, ou la console du navigateur (F12) qui signale les mêmes erreurs.
//
//     {
//         id: 'mon-projet',                // unique, en minuscules. Ne plus le changer ensuite : il est enregistré chez les visiteurs.
//         type: 'project',                 // 'project', 'skill' ou 'career' (études et postes) (liste : TYPES dans config.js)
//         rarity: 'rare',                  // 'common', 'rare', 'epic' ou 'legendary' (réglages : config.js)
//         tags: ['sound-design'],          // filtres du portfolio, projets seulement (liste : TAGS dans config.js)
//         name: 'Mon projet',              // ou { fr: 'Mon projet', en: 'My project' }
//         role: { fr: 'Design Sonore', en: 'Sound Design' },
//         year: 2026,
//         short: {                         // sur la carte : une phrase, trois lignes au plus
//             fr: 'Une phrase.',
//             en: 'One sentence.',
//         },
//         long: {                          // dans la fiche. Entre `accents graves`, chaque retour à la ligne s'affiche.
//             fr: `
//                 Premier paragraphe.
//                 - Une tâche
//                 - Une autre`,
//             en: `
//                 First paragraph.
//                 - One task
//                 - Another one`,
//         },
//         image: 'ressources/Cards/mon-projet.jpg',
//         crop: 50,                        // point de l'image à garder, de 0 (gauche) à 100 (droite). 50 par défaut
//         zoom: 1.2,                       // grossit l'image depuis le bas. 1 par défaut
//         player: 'https://youtu.be/...',  // YouTube, Vimeo, Spotify ou SoundCloud. Un lien normal suffit
//     },
//
// Facultatifs : tags, role, long (sinon short), crop, zoom, player, art, label.
// label remplace la ligne sous le nom (« Projet, 2026 » : le type et l'année), par exemple { fr: 'Logiciel', en: 'Software' }.
// art: 'logo' montre un petit logo blanc au-dessus d'une onde, comme pour les logiciels, au lieu d'une image qui remplit le haut.
// year place un projet dans la timeline : il y est obligatoire. Une étape du parcours s'y montre par un évènement (events.js).
// Le type choisit la section du site et l'aspect de la carte. Les affiches skill-*.svg et education.svg font 500 x 400.
// Textes : fr est obligatoire ; sans en, le site anglais affiche le français.
// Un texte avec une apostrophe s'écrit entre accents graves (AltGr + 7) : `L'outil`.

export const CARDS = [
    // ---------- Projets ----------

    {
        id: 'mallow',
        type: 'project',
        rarity: 'legendary',
        tags: ['sound-design'],
        name: 'Mallow',
        role: { fr: 'Sound Designer', en: 'Sound Designer' },
        year: 2026,
        short: {
            fr: `Enceinte de jeux audio interactive destinés aux enfants de 4 à 10 ans (basé sur l'IA)`,
            en: 'Interactive audio gaming speaker for children from 4 to 10 years old (AI based)',
        },
        long: {
            fr: `Mallow est une enceinte audio interactive dont l'enfant parle pour devenir acteur d'histoire et jouer a des minijeux. L'IA est utilisé comme maitre du jeu pour guider l'enfant tout en lui laissant choisir les différentes issues de l'histoire. J'ai été en charge du sound design d'une grande partie des figurines (Oli et l'arbre d'or, Bébé Dragon, Miraculous, Quiz des Chevaliers, Mini jeux de charlie et d'autres en préparation). J'ai ainsi pu défini la direction artistique de ses figurines ainsi que l'intégration des sons dans leur moteur audio fait maison`,
            en: `Mallow is an interactive audio speaker that the child talks about to become a history actor and play mini-games. AI is used as a game master to guide the child while letting him choose the different outcomes of the story. I was in charge of the sound design of a large part of the figurines (Oli and the Golden Tree, Baby Dragon, Miraculous, Knights Quiz, Charlie's mini games and others in preparation). I was thus able to define the artistic direction of his figurines as well as the integration of sounds into their homemade audio engine`,
        },
        image: 'ressources/Cards/mallow.jpg',
        crop: 56,
    },
    {
        id: 'furyball',
        type: 'project',
        rarity: 'legendary',
        tags: ['audio-integration', 'sound-design'],
        name: 'Furyball',
        role: { fr: 'Sound Designer', en: 'Sound Designer' },
        year: 2026,
        short: {
            fr: 'Furyball : Rogue Revenge : un roguelite d’action rapide développé par Rebound',
            en: 'Furyball: Rogue Revenge : a fast-paced action roguelite developed by Rebound',
        },
        long: {
            fr: `
                Furyball est un roguelite d’action au rythme effréné où ta seule arme est une balle rebondissante mortelle.
                Prends le contrôle du chaos, pulvérise tes ennemis et survis dans des arènes inspirées du sport, du flipper et du cinéma grindhouse.
                Sur ce projet j'ai été missionné avec Laurent Bariet (G4F) pour créer et intégrer l'intégralité des sons du jeu, de l'interface aux différentes attaques d'Azami, des ennemis en passant par les ambiances et l'intégration de la musique composée par Toxic Avenger`,
            en: `
                Furyball is a fast-paced action roguelite where your only weapon is a deadly bouncy ball.
                Take control of the chaos, pulverize your enemies and survive in sports-inspired arenas, pinball machines and grindhouse cinema.
                On this project, I was commissioned with Laurent Bariet (G4F) to create and integrate all the sounds of the game, from the interface to the different attacks by Azami and his enemies, the ambiances and the integration of the music composed by Toxic Avenger`,
        },
        image: 'ressources/Cards/furyball.jpg',
        crop: 74,
        zoom: 1.4,
        player: 'https://www.youtube.com/embed/-gwJ_qL7aWE',
    },
    {
        id: 'mechanicus',
        type: 'project',
        rarity: 'legendary',
        tags: ['sound-design'],
        name: 'Mechanicus II',
        role: { fr: 'Sound Designer', en: 'Sound Designer' },
        year: 2026,
        short: {
            fr: 'Warhammer 40K : Mechanicus II est la suite du jeu de tactique Mechanicus, développée par Bulwark Studios et éditée par Kasedo Games.',
            en: 'Warhammer 40K: Mechanicus II is the sequel to the tactical game Mechanicus, developed by Bulwark Studios and published by Kasedo Games',
        },
        long: {
            fr: `Warhammer 40K : Mechanicus II est la suite du jeu de tactique Mechanicus, développée par Bulwark Studios et éditée par Kasedo Games. J'ai eu la chance de pouvoir sonoriser une grande partie des cinématiques ingame dont la direction artistique a été défini aupréalable par Guillaume David`,
            en: 'Warhammer 40K: Mechanicus II is the sequel to the tactical game Mechanicus, developed by Bulwark Studios and published by Kasedo Games. I was lucky enough to be able to sound a large part of the ingame cinematics, whose artistic direction was previously defined by Guillaume David',
        },
        image: 'ressources/Cards/mechanicus.jpg',
        crop: 44,
        player: 'https://www.youtube.com/embed/ekWDGK76-tA',
    },
    {
        id: 'meot',
        type: 'project',
        rarity: 'epic',
        tags: ['audio-tool'],
        name: { fr: `Génération audio procédurale`, en: 'Procedural audio generation' },
        role: { fr: 'Développeur Audio', en: 'Audio Programer' },
        year: 2025,
        short: {
            fr: `Outil Unity C# Wwise de génération de masses d'entités (foules / essaims)`,
            en: `Unity C# Wwise tool for generating clusters of entities's (crowds / swarms)`,
        },
        long: {
            fr: `
                Cet outil C# Unity / Wwise permet d'optimiser la sonorisation d'entité en masse.
                Le principe est simple : Utiliser Wwise pour sonoriser un groupe d'entité proche (cluster) calculé en temps réel par l'outil.
                Le contenu du flux audio de chaque cluster est ensuite modulé en fonction du nombre d'entité dans le groupe.
                Tout est entièrement paramétrable et dynamique afin d'être utilisé comme "toolbox" pour n'importe quel systeme demandant de sonoriser un grand nombre d'entité (foule, troupeau, banc de poissons, essaims d'abeilles, etc...)`,
            en: `
                This C# Unity/ Wwise tool allows to optimize the entity sound in bulk.
                The principle is simple: Use Wwise to sonorize a entity cluster calculated in real time by the tool.
                The audio stream content of each cluster is then modulated based on the number of entities in the group.
                Everything is fully configurable and dynamic in order to be used as a "toolbox" for any system requiring the sound of a large number of entities (crowd, herd, fish school, bee swarms, etc...)`,
        },
        image: 'ressources/Cards/meot.jpg',
        crop: 30,
        player: 'https://www.youtube.com/embed/nACOWAFpqb0',
    },
    {
        id: 'al',
        type: 'project',
        rarity: 'rare',
        tags: ['sound-design'],
        name: 'Architect Life',
        role: { fr: 'Sound Designer', en: 'Sound Designer' },
        year: 2024,
        short: {
            fr: `Jeu Vidéo de simulation d'architecture développé par Shine Research et édité par Nacon`,
            en: 'Architect game simulator developed by Shine Research and published by Nacon',
        },
        long: {
            fr: `Architect Life est un jeu de simulation d'architecture permettant de passer de la modélisation des plans 3D basé sur les critères du client au décisions sur le chantier. Sur ce projet G4F a été missionné pour créer tous les assets audios du jeu de l'interface aux différents materiaux peintures et meubles posés lors de la modélisation.`,
            en: 'Architect Life is an architecture simulation game that allows you to move from modeling 3D plans based on client criteria to making decisions on the construction site. On this project G4F was commissioned to create all the audio assets of the interface game with the different materials paints and furniture installed during modeling.',
        },
        image: 'ressources/Cards/al.jpg',
        crop: 25,
        player: 'https://www.youtube.com/embed/HXyH9aJs2qA',
    },
    {
        id: 'mol',
        type: 'project',
        rarity: 'epic',
        tags: ['sound-design'],
        name: 'Masters of Light',
        role: { fr: 'Sound Designer', en: 'Sound Designer' },
        year: 2024,
        short: {
            fr: 'Wave Shooter en réalité mixte développé par COVEN & ALBYON et sonorisé par G4F',
            en: 'Wave Shooter in mixed reality developed by COVEN & ALBYON and voiced by G4F',
        },
        long: {
            fr: `
                Masters of Light est un Wave Shooter en réalité mixte développé par Coven & Albyon dont toute la production audio a été délégué a G4F Prod. Etant arrivé récement dans l'entreprise j'ai pu donner un coup de main a Laurent Bariet sur la production audio des assets du jeu :
                - Sonorisation d'animations d'attaques et de mouvements des ennemis
                - Sonorisation des spells du joueurs
                - Tests ingame avec le casque VR pour le mixage audio`,
            en: `
                Masters of Light is a mixed reality Wave Shooter developed by Coven & Albyon whose entire audio production has been delegated to G4F Prod. Having recently arrived at the company I was able to give a hand to Laurent Bariet on the audio production of the game assets:
                - Attacks animations and enemy movements sound design
                - Player spells sound design
                - In-game tests with the VR headset for audio mixing`,
        },
        image: 'ressources/Cards/mol.jpg',
        player: 'https://www.youtube.com/embed/v4n8ufGG90I',
    },
    {
        id: 'dc',
        type: 'project',
        rarity: 'epic',
        tags: ['soundtrack'],
        name: 'Darkest Canopy',
        role: { fr: 'Compositeur', en: 'Composer' },
        year: 2023,
        short: {
            fr: 'Une bande son épique aux influences incas',
            en: 'An epic soundtrack with Inca influences',
        },
        long: {
            fr: `
                Darkest Canopy est un jeu vidéo étudiant dans lequel j'ai pu donner un coup de main sur la composition musicale :
                - Theme orignial du jeu
                - Theme d'exploration
                - Theme de combat
                Les compositions des musiques d'explorations et de combats ont exactement la meme durée et bouclent pour mettre de transitionner entre l'une et l'autre a n'importe quel moment du jeu.`,
            en: `
                Darkest Canopy is a student video game in which I was able to give a hand on the musical composition:
                - Original theme of the game
                - Exploration theme
                - Combat theme
                The exploration and combat musics have exactly the same duration and loop to transition between one and the other at any time during the game.`,
        },
        image: 'ressources/Cards/dc.jpg',
        player: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/1646295394&color=%230ea5e9&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true',
    },
    {
        id: 'lrds',
        type: 'project',
        rarity: 'rare',
        tags: ['soundtrack'],
        name: 'La Route des Sommets',
        role: { fr: 'Composer', en: 'Composer' },
        year: 2023,
        short: {
            fr: 'Une bande son douce et mélancolique entre sonorités acoustiques du pays basque et nappes electroniques',
            en: 'A soft and melancholic soundtrack between acoustic sounds of the Basque country and electronic pads',
        },
        long: {
            fr: `
                La Route des sommets est un court métrage étudiant 3iS Bordeaux parlant du pays basque et de l'isolation géographique.
                J'ai choisi des guitares et des synthétiseurs retro pour créer une bande son mélancolique qui illustre les 2 visions des 2 jeunes filles : Rester participer a la transhumance ou déménager en ville.`,
            en: `
                La Route des sommets is a short film by 3iS Bordeaux students about the Basque country and geographical isolation.
                I chose retro guitars and synthesizers to create a melancholic soundtrack that illustrates the two visions of the two young girls: Stay participate in transhumance or move to the city.`,
        },
        image: 'ressources/Cards/lrds.jpg',
        crop: 58,
        player: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/1697210334&color=%230ea5e9&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true',
    },
    {
        id: 'lc',
        type: 'project',
        rarity: 'epic',
        tags: ['audio-integration', 'sound-design', 'soundtrack'],
        name: 'Lofi Clicker',
        role: { fr: 'Sound Designer / Programmeur Audio / Compositeur', en: 'Sound Designer / Audio Programer / Composer' },
        year: 2023,
        short: {
            fr: 'Jeu de rythme musical issu de la Winter Jam 2023',
            en: 'Musical rhythm game from the Winter Jam 2023',
        },
        long: {
            fr: `Lofi Clicker est un jeu de rythme musical créé lors de la Winter Jam 2022 sur FMod / Unity. L'audio se démarque notamment par des morceaux orginaux évolutifs créé pour évoluer au rythme du joueur (detection de tempo dans Unity basé sur les information du morceau actuel donné par FMod).`,
            en: `Lofi Clicker is a musical rhythm game created during the Winter Jam 2022 on FMod / Unity. The audio is notably distinguished by evolutionary orginal pieces created to evolve according to the player's rhythm (tempo detection in Unity based on the information of the current piece given by FMod).`,
        },
        image: 'ressources/Cards/lc.jpg',
        player: 'https://open.spotify.com/embed/album/2WLig8GusnxG5Qt9VCJw51?utm_source=generator&theme=0',
    },
    {
        id: 'tr',
        type: 'project',
        rarity: 'common',
        tags: ['sound-design'],
        name: 'The Roaming',
        role: { fr: 'Sound Designer', en: 'Sound Designer' },
        year: 2022,
        short: {
            fr: 'Théâtre immersif en réalité mixte',
            en: 'Immersive theater in mixed reality',
        },
        long: {
            fr: `
                THE ROAMING est un conte présenté sous la forme d'une piece de théatre immersive et interractive dans lequel j'ai pu donner un coup de main lors de la création du son pendant mon stage a G4F :
                - Sonorisations des environnements en format Quad
                - Participation et dépilage des enregistrements des foleys sur les animations
                - Intégration des sons en jeu via Wwise et Unity (pose des évènements audio sur la timeline)`,
            en: `
                THE ROAMING is a tale presented as an immersive and interactive theater piece in which I was able to lend a hand during the creation of sound during my internship at G4F :
                - Sound reinforcement of environments in Quad format
                - Post production of foleys recordings over animations
                - Integration of in-game sounds via Wwise and Unity (placing audio events on the timeline)`,
        },
        image: 'ressources/Cards/tr.jpg',
        player: 'https://player.vimeo.com/video/652819674?h=7de0b67f2d',
    },
    {
        id: 'pm',
        type: 'project',
        rarity: 'rare',
        tags: ['audio-integration', 'sound-design', 'soundtrack'],
        name: 'Phantom Memories',
        role: { fr: 'Sound Designer / Compositeur', en: 'Sound Designer Composer' },
        year: 2022,
        short: {
            fr: `Jeu vidéo d'enquête narratif en huis clos créé par la classe d'animation Jeu Vidéo de 3iS Bordeaux`,
            en: 'Narrative investigation video game in a closed context created by the 3iS Bordeaux Video Game animation class',
        },
        long: {
            fr: `
                Phantom Memories est un jeu vidéo d'enquête narratif dans lequel j'ai pu m'occuper d'une partie de la production audio :
                - Lead Sound Design (une équipe de 4)
                - Intégrateur Sonore Wwise / Unity
                - Compositeur d'une grande partie de l'OST finale du jeu
                - Enregistrement des themes originaux avec une violoncelliste semi-professionelle`,
            en: `
                Phantom Memories is a narrative investigation video game in which I was able to take care of part of the audio production :
                - Lead Sound Design (a team of 4)
                - Wwise/ Unity
                - Composer of few part of the final OST of the game
                - Recording of the original themes with a semi-professional cellist`,
        },
        image: 'ressources/Cards/pm.jpg',
    },
    {
        id: 'polarnatt',
        type: 'project',
        rarity: 'rare',
        tags: ['sound-design', 'soundtrack'],
        name: 'Polarnatt',
        role: { fr: 'Sound Designer / Compositeur', en: 'Sound Designer & Composer' },
        year: 2022,
        short: {
            fr: `Court Métrage d'animation de fin d'études 3iS Bordeaux`,
            en: 'Animated short film at the end of studies 3iS Bordeaux',
        },
        long: {
            fr: `
                Polarnatt est un court métrage d'animation de la classe d'animation jeu vidéo 3ème année sur lequel j'ai pu m'occuper de toute la partie audio :
                - Sound Design sur Reaper
                - Mixage des enregistrement voix sur Protools
                - Composition musicale sur Bitwig Studio`,
            en: `
                Polarnatt is a short animation film from the 3rd year video game animation class on which I was able to take care of all the audio part :
                - Sound Design on Reaper
                - Mixing of voice recordings on Protools
                - Music composition on Bitwig Studio`,
        },
        image: 'ressources/Cards/polarnatt.jpg',
        crop: 45,
        player: 'https://www.youtube.com/embed/4Wsf-ILv3VA?si=2rMGF-0IX_XtqQEA',
    },
    {
        id: 'hf',
        type: 'project',
        rarity: 'rare',
        tags: ['audio-integration', 'sound-design', 'soundtrack'],
        name: 'Hide And Flee',
        role: { fr: 'Sound Designer / Programmeur Audio / Compositeur', en: 'Sound Designer / Audio Programer    / Composer' },
        year: 2022,
        short: {
            fr: 'Jeu de platforming puzzle créé pour la Simiji Game Jam 2022',
            en: 'Puzzle platforming game created for the Simiji Game Jam 2022',
        },
        long: {
            fr: `
                Hide and Flee est un jeu de platforming dont j'ai pu pousser la narration audio afin d'illustrer la dualité mignon / horrifiant
                - Sound Design simple et efficace
                - Intégration Sonore FMod / Unity permettant de faire évoluer le son au fil de la narration
                - Composition originale permettant d'y fixer l'ambiance sonore`,
            en: `
                Hide and Flee is a platforming game whose audio narration I was able to push in order to illustrate the 'cute/horrifying' duality
                - Simple and effective Sound Design
                - FMod / Unity Sound Integration allowing the sound to evolve over the narrative
                - Original composition allowing to set the atmosphere`,
        },
        image: 'ressources/Cards/hf.jpg',
        crop: 60,
        zoom: 1.1,
        player: 'https://open.spotify.com/embed/album/3IMaxVIqnao0gLb7jlIj11?utm_source=generator&theme=0',
    },
    {
        id: 'aa',
        type: 'project',
        rarity: 'common',
        tags: ['soundtrack'],
        name: 'Alpha Alpha',
        role: { fr: 'Bande Son', en: 'Soundtrack' },
        year: 2021,
        short: {
            fr: 'Série de 4 épisodes créé par les étudiants en réalisation de 3iS Bordeaux',
            en: 'Series of 4 episodes created by the students in realization of 3iS Bordeaux',
        },
        long: {
            fr: `Alpha Alpha est une série de 4 épisodes créé par les étudiants en réalisation de 3iS Bordeaux dont j'ai pu m'occuper de la bande son de l'épisode 3 : Une composition a l'image créé sur Bitwig Studio reflétant l'anxiétée et le stress des évènements du 3eme épisode.`,
            en: 'Alpha Alpha is a 4-episode series created by the directing students of 3iS Bordeaux for which I was able to take care of the soundtrack of episode 3: A composition with the image created on Bitwig Studio reflecting the anxiety and stress of the events of the 3rd episode.',
        },
        image: 'ressources/Cards/aa.jpg',
        crop: 30,
        player: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/1469265319&color=%230369a1&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true',
    },
    {
        id: 'spring',
        type: 'project',
        rarity: 'rare',
        tags: ['soundtrack'],
        name: 'Spring',
        role: { fr: 'Compositeur', en: 'Composer' },
        year: 2021,
        short: {
            fr: 'Recomposition de la bande son du court métrage Blender Spring',
            en: 'Recomposition of the soundtrack for the short film Blender Spring',
        },
        long: {
            fr: `Spring est un court métrage créé sur Blender et mis a disposition lors d'un concours de composition. Ceci est donc ma version de la bande son de ce court métrage composé sur Blender.`,
            en: 'Spring is a short film created on Blender and made available during a composition competition. This is therefore my version of the soundtrack of this short film composed on Blender.',
        },
        image: 'ressources/Cards/spring.jpg',
        crop: 62,
        player: 'https://www.youtube.com/embed/WB5QWPH_wgk',
    },

    // ---------- Compétences ----------

    {
        id: 'skill-sound-design',
        type: 'skill',
        rarity: 'common',
        name: 'Sound design',
        short: {
            fr: `Créer les sons de jeux, de cinématiques et des ambiances`,
            en: `Creating the sounds of games, cinematics and ambiants`,
        },
        long: {
            fr: `
                Créer les sons de jeux, de cinématiques et d'objets interactifs, de la direction artistique à l'intégration.
                Outil principal : Reaper`,
            en: `
                Creating the sounds of games, cinematics and interactive objects, from art direction to integration.
                Main tool: Reaper`,
        },
        image: 'ressources/Cards/skill-sound-design.svg',
    },
    {
        id: 'skill-composition',
        type: 'skill',
        rarity: 'legendary',
        name: { fr: 'Composition musicale', en: 'Music composition' },
        short: {
            fr: `Musiques originales, interactives pour le jeu ou écrites à l'image`,
            en: `Original music, interactive for games or written to picture`,
        },
        long: {
            fr: `
                Musiques originales, interactives pour le jeu ou écrites à l'image.
                Outil principal : Bitwig Studio`,
            en: `
                Original music, interactive for games or written to picture.
                Main tool: Bitwig Studio`,
        },
        image: 'ressources/Cards/skill-composition.svg',
    },
    {
        id: 'skill-integration',
        type: 'skill',
        rarity: 'epic',
        name: { fr: 'Intégration audio', en: 'Audio integration' },
        short: {
            fr: `Faire vivre les sons, la musique et les ambiances dans le moteur du jeu`,
            en: `Bringing sounds music and ambient to life in the game engine`,
        },
        long: {
            fr: `
                Faire vivre les sons et la musique dans le moteur du jeu.
                - Middlewares : Wwise et FMOD
                - Moteurs : Unity et Unreal`,
            en: `
                Bringing sounds and music to life in the game engine.
                - Middleware: Wwise and FMOD
                - Engines: Unity and Unreal`,
        },
        image: 'ressources/Cards/skill-integration.svg',
    },
    {
        id: 'skill-programming',
        type: 'skill',
        rarity: 'rare',
        name: { fr: 'Programmation', en: 'Programming' },
        short: {
            fr: `Développer des outils et systèmes audio sur mesure mais aussi des logiciel / algorithmes pour automatiser les longue tâches`,
            en: `Develop custom-made tools and audio systems as well as software/algorithms to automate long tasks`,
        },
        long: {
            fr: `Développer des outils et systèmes audio sur mesure mais aussi des logiciel / algorithmes pour automatiser les longue tâches
                - C#
                - Python
                - Javascript
                - Godot Scripts`,
            en: `Develop custom-made tools and audio systems as well as software/algorithms to automate long tasks
                - C#
                - Python
                - Javascript
                - Godot Scripts`,
        },
        image: 'ressources/Cards/skill-programming.svg',
    },
    {
        id: 'skill-mixing',
        type: 'skill',
        rarity: 'rare',
        name: { fr: 'Mixage', en: 'Mixing' },
        short: {
            fr: `Mixage de cinématiques, de voix et de sound design, tests en jeu jusqu'au casque VR`,
            en: `Mixing cinematics, voices and sound design, with in-game tests up to VR headsets`,
        },
        long: {
            fr: `
                Mixage de cinématiques, de voix et de sound design.
                - Cinématiques sur Reaper où Pro Tools
                - Voix sur Pro Tools, nettoyage sur Audition
                - Environnements de mixage en quad`,
            en: `
                Mixing cinematics, voices and sound design.
                - Cinematics in Reaper or Pro Tools
                - Voices in Pro Tools, cleaning in Audition
                - Quad environments mixing`,
        },
        image: 'ressources/Cards/skill-mixing.svg',
    },
    {
        id: 'skill-recording',
        type: 'skill',
        rarity: 'common',
        name: { fr: 'Prise de son', en: 'Recording' },
        short: {
            fr: `Enregistrement de voix et bruitages`,
            en: `Recording voices and foley`,
        },
        long: {
            fr: `
                Enregistrement de voix et bruitages.
                - Voix sur ProTools où Reaper à G4F
                - Bruitages : participation a l'enregistrement, dépilage et nettoyange à G4F.
                - Enregistrement de violoncelle pour les thèmes de Phantom Memories`,
            en: `
                Recording voices and foley.
                - Voices in Pro Tools or Reaper at G4F
                - Foley: sessions, editing and cleaning at G4F
                - Cello recoding for the themes of Phantom Memories`,
        },
        image: 'ressources/Cards/skill-recording.svg',
    },

    // ---------- Compétences : logiciels ----------

    {
        id: 'reaper',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'epic',
        name: 'Reaper',
        short: {
            fr: `
                Station de travail audio numérique pour le design sonore et le mixage de cinématiques
                Outil de travail principal que j'utilise au quotidien pour du Sound Design`,
            en: `
                Digital audio workstation for sound design and cinematics mixing
                Main working tool that I use every day for Sound Design`,
        },
        image: 'ressources/Generic/Reaper_White.svg',
    },
    {
        id: 'bitwig',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'epic',
        name: 'Bitwig Studio',
        short: {
            fr: `
                Station de travail audio numérique développée par Bitwig GmbH
                Logiciel de composition principal, robuste sur de grands projets orchestraux`,
            en: `
                Digital audio workstation developed by Bitwig GmbH
                Main composition software, robust on large orchestral projects`,
        },
        image: 'ressources/Generic/Bitwig_White.svg',
    },
    {
        id: 'wwise',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'rare',
        name: 'Wwise',
        short: {
            fr: `
                Middleware audio interactif avec fonctionnalités avancées
                Je l'utilise pour la plupart des intégration audio ingame`,
            en: `
                Interactive audio middleware with advanced implementation features
                I use it for most in-game audio integration`,
        },
        image: 'ressources/Generic/Wwise_White.svg',
    },
    {
        id: 'fmod',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'rare',
        name: 'FMOD',
        short: {
            fr: `
                Moteur audio et ensemble d'outils pour l'audio adaptatif dans les jeux
                Je l'utilise pour les projets d'intégration audio ingame de jeux indé`,
            en: `
                Audio engine and toolset for adaptive audio in games
                I use it for indie game in-game audio integration projects`,
        },
        image: 'ressources/Generic/FMOD_White.svg',
    },
    {
        id: 'unity',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'rare',
        name: 'Unity',
        short: {
            fr: `
                Moteur de jeu multiplateforme édité par Unity Technologies
                Je l'utilise pour la plupart de mes projets de jeux vidéos`,
            en: `
                Cross-platform game engine developed by Unity Technologies : I use it for persona game making
                I use it for most of my video game projects`,
        },
        image: 'ressources/Generic/Unity_White.svg',
    },
    {
        id: 'unreal',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'rare',
        name: 'Unreal',
        short: {
            fr: `
                Moteur de jeu vidéo propriétaire développé par Epic Games
                Je l'utilise pour certains de mes projets G4F`,
            en: `
                3D computer graphics game engine developed by Epic Games
                I use it for some of my G4F projects`,
        },
        image: 'ressources/Generic/UE_White.svg',
    },
    {
        id: 'maxmsp',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'common',
        name: 'Max MSP',
        short: {
            fr: `
                Logiciel musical de programmation graphique pour la synthese sonore et controle MIDI
                Je l'utilise pour des créer des outils d'audio procéduraux sur Ableton`,
            en: `
                Musical graphical programming software for sound synthesis and MIDI control
                I use it to create procedural audio tools on Ableton`,
        },
        image: 'ressources/Generic/Ableton_White.svg',
    },
    {
        id: 'ableton',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'common',
        name: 'Ableton Live',
        short: {
            fr: `
                Station de travail audio numérique pour le design sonore par synthèse et traitement sonores
                Je l'utilise principalement pour Max4Live`,
            en: `
                Digital audio workstation for synthesized sound design
                I mainly use it for Max4Live`,
        },
        image: 'ressources/Generic/Ableton_White.svg',
    },
    {
        id: 'audition',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'common',
        name: 'Audition',
        short: {
            fr: `
                Logiciel de traitement audio professionnel : nettoyage de voix et traitement audio par lots
                Je l'utilise principalement pour nettoyage des enregistrements voix`,
            en: `
                Professional audio processing software: voice cleaning and batch audio processing
                I mainly use it for cleaning voice recordings`,
        },
        image: 'ressources/Generic/AA_White.svg',
    },
    {
        id: 'protools',
        type: 'skill',
        art: 'logo',
        label: { fr: 'Logiciel', en: 'Software' },
        rarity: 'common',
        name: 'Pro Tools',
        short: {
            fr: `
                Station de travail audio numérique professionnelle développée par Avid Technology
                Il m'arrive de l'utiliser lors de l'enregistrement de voix ou mixage professionnel à G4F`,
            en: `
                Professional digital audio workstation developed by Avid Technology
                I sometimes use it when recording voices or professional mixes at G4F`,
        },
        image: 'ressources/Generic/PT_White.svg',
    },

    // ---------- Parcours : études et postes ----------

    {
        id: '3is',
        type: 'career',
        rarity: 'rare',
        name: '3iS Bordeaux',
        label: { fr: 'École, de 2020 à 2024', en: 'School, from 2020 to 2024' },
        year: 2020,
        short: {
            fr: `École où j'ai été formé, à partir de septembre 2020 jusqu'a juillet 2024`,
            en: 'The school where I trained, from September 2020 to July 2024',
        },
        long: {
            fr: `
                École où j'ai été formé, à partir de septembre 2020 jusqu'a juillet 2024.
                Quatre projets de cette collection y sont nés :
                - Alpha Alpha (2021)
                - Polarnatt (2022)
                - Phantom Memories (2022)
                - La Route des Sommets (2023)`,
            en: `
                The school where I trained, from September 2020 to July 2024.
                Four projects of this collection were born there:
                - Alpha Alpha (2021)
                - Polarnatt (2022)
                - Phantom Memories (2022)
                - La Route des Sommets (2023)`,
        },
        image: 'ressources/Cards/3iS.png',
    },
    {
        id: 'g4f',
        type: 'career',
        rarity: 'legendary',
        name: 'G4F Prod',
        label: { fr: 'Poste de Sound Designer depuis 2023', en: 'Sound Designer since 2023' },
        year: 2023,
        short: {
            fr: 'Studio français basé a Angoulème spécialisé dans la production sonore interractive. Je suis actuellement Sound Designer en CDI',
            en: 'French studio based in Angoulème specializing in interactive sound production. I am currently a Sound Designer on a permanent contract.',
        },
        long: {
            fr: `
                G4F Prod réalise la production audio de jeux vidéo et d'expériences immersives. J'y ai commencé en stage et j'y travaille aujourd'hui en CDI :
                
                Mon travail va de la création des sons à leur intégration en jeu : design sonore, bruitages, voix, mixage et tests en jeu.

                Quatre projets de cette collection y sont nés :
                - Furyball
                - Architect Life
                - Masters of Light
                - The Roaming`,
            en: `
                G4F Prod handles audio production for video games and immersive experiences. I started there as an intern and now work there on a permanent contract:
                
                My work ranges from creating sounds to integrating them in game: sound design, foley, voices, mixing and in-game tests.

                Four projects of this collection were born there:
                - Furyball
                - Architect Life
                - Masters of Light
                - The Roaming`,
        },
        image: 'ressources/Cards/g4f.jpg',
    },
];
