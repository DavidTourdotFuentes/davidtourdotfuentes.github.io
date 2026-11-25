// Lecteurs d'une fiche. Rien ne charge avant le clic ; ensuite, une même platine aux couleurs du site pilote YouTube et SoundCloud
// par leurs API officielles. Spotify et Vimeo n'ont pas d'affichage sans leurs propres commandes : ils gardent les leurs, dans le même châssis.
import { el, setText, text } from './card.js';
import { createWave, svg } from './meter.js';

export const SOURCES = { youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud', vimeo: 'Vimeo' };
const TIMEOUT = 8000; // au-delà, on montre le lecteur d'origine
const ICONS = {
    play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
    pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
    previous: '<path d="M19 5v14L9 12zM5 5h3v14H5z" fill="currentColor"/>',
    next: '<path d="M5 5v14l10-7zM16 5h3v14h-3z" fill="currentColor"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    fullscreen: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
};

let volume = 1; // gardé d'un lecteur à l'autre
const scripts = new Map();

/** Charge une API une seule fois. ready() dit si elle est utilisable. */
function loadApi(src, ready) {
    if (!scripts.has(src)) {
        scripts.set(src, new Promise((resolve, reject) => {
            const started = performance.now();
            const script = el('script', '', { src, async: true });
            script.addEventListener('error', () => reject(new Error(`API injoignable : ${src}`)));
            document.head.append(script);
            const wait = () => {
                if (ready()) resolve();
                else if (performance.now() - started > TIMEOUT) reject(new Error(`API trop lente : ${src}`));
                else setTimeout(wait, 50);
            };
            wait();
        }));
        scripts.get(src).catch(() => scripts.delete(src)); // on pourra réessayer
    }
    return scripts.get(src);
}

const withTimeout = (promise) => Promise.race([
    promise,
    new Promise((resolve, reject) => { setTimeout(() => reject(new Error('lecteur trop lent')), TIMEOUT); }),
]);

const clock = (seconds) => {
    const total = Math.max(Math.floor(seconds || 0), 0);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Page du morceau ou de la vidéo sur sa plateforme. */
function pageOf({ type, src }) {
    const url = new URL(src);
    if (type === 'youtube') return `https://www.youtube.com/watch?v=${url.pathname.split('/').pop()}`;
    if (type === 'spotify') return `https://open.spotify.com${url.pathname.replace('/embed', '')}`;
    if (type === 'vimeo') return `https://vimeo.com/${[url.pathname.split('/').pop(), url.searchParams.get('h')].filter(Boolean).join('/')}`;
    return url.searchParams.get('url') ?? src;
}

function frameOf({ type, src }, name) {
    const url = new URL(src);
    if (type === 'vimeo') for (const [key, value] of [['color', 'ff5a3a'], ['title', 0], ['byline', 0], ['portrait', 0], ['autoplay', 1]]) url.searchParams.set(key, value);
    const frame = el('iframe', `deck__frame deck__frame--${type}`, { src: url.href, title: name });
    frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    return frame;
}

// ---------- Pilotes : { toggle, seek, setVolume, skip?, state() } ; state renvoie { playing, time, duration, ... } ----------

async function driveYouTube({ src }, name, screen) {
    await loadApi('https://www.youtube.com/iframe_api', () => window.YT?.Player);
    const holder = el('div');
    screen.append(holder);
    let ended = false;
    const player = await withTimeout(new Promise((resolve, reject) => {
        const created = new window.YT.Player(holder, {
            videoId: new URL(src).pathname.split('/').pop(),
            playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, iv_load_policy: 3, origin: window.location.origin },
            events: {
                onReady: () => resolve(created),
                onError: ({ data }) => reject(new Error(`YouTube : erreur ${data}`)),
                onStateChange: ({ data }) => { ended = data === 0; },
            },
        });
    }));
    const frame = player.getIframe();
    frame.classList.add('deck__frame');
    frame.title = name;
    return {
        toggle: () => (player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo()),
        seek: (time) => player.seekTo(time, true),
        setVolume: (value) => { player.unMute(); player.setVolume(value * 100); },
        state: () => ({ playing: [1, 3].includes(player.getPlayerState()) && !ended, time: player.getCurrentTime?.(), duration: player.getDuration?.() }),
    };
}

async function driveSoundCloud({ src }, name, screen) {
    await loadApi('https://w.soundcloud.com/player/api.js', () => window.SC?.Widget);
    const url = new URL(src);
    for (const [key, value] of [['auto_play', true], ['visual', false], ['show_comments', false], ['hide_related', true]]) url.searchParams.set(key, value);
    const frame = el('iframe', 'deck__hidden', { src: url.href, title: name, tabIndex: -1 });
    frame.allow = 'autoplay';
    frame.setAttribute('aria-hidden', 'true');
    screen.append(frame);

    const widget = window.SC.Widget(frame);
    const { Events } = window.SC.Widget;
    const get = (method) => new Promise((resolve) => { widget[method](resolve); });
    await withTimeout(new Promise((resolve, reject) => {
        widget.bind(Events.READY, resolve);
        widget.bind(Events.ERROR, () => reject(new Error('SoundCloud : erreur')));
    }));
    const now = { playing: false, time: 0, duration: 0, index: 0, tracks: [], page: '', wave: null };
    let waveUrl = '';

    async function refresh() {
        const [sounds, sound, index, duration] = await Promise.all([get('getSounds'), get('getCurrentSound'), get('getCurrentSoundIndex'), get('getDuration')]);
        now.tracks = sounds.map(({ title }) => title ?? ''); // SoundCloud ne donne pas tout de suite tous les titres d'une longue liste
        now.index = index;
        now.duration = duration / 1000;
        now.page = sound?.permalink_url ?? '';
        if (sound?.waveform_url && sound.waveform_url !== waveUrl) {
            waveUrl = sound.waveform_url;
            now.wave = null;
            fetch(waveUrl.replace(/\.png$/, '.json')).then((response) => response.json()).then(({ samples }) => { now.wave = samples; }).catch(() => {});
        }
    }
    widget.bind(Events.PLAY, () => { now.playing = true; refresh(); });
    widget.bind(Events.PAUSE, () => { now.playing = false; });
    widget.bind(Events.FINISH, () => { now.playing = false; });
    widget.bind(Events.PLAY_PROGRESS, ({ currentPosition }) => { now.time = currentPosition / 1000; });
    await refresh();
    return {
        toggle: () => widget.toggle(),
        seek: (time) => { widget.seekTo(time * 1000); now.time = time; },
        setVolume: (value) => widget.setVolume(value * 100),
        skip: (index) => { now.time = 0; widget.skip(index); },
        state: () => now,
    };
}

const DRIVERS = { youtube: driveYouTube, soundcloud: driveSoundCloud };

// ---------- Platine ----------

function iconButton(icon, key, onClick) {
    const node = el('button', 'deck__button', { type: 'button' }, svg('deck__icon', '0 0 24 24', ICONS[icon]));
    node.setAttribute('aria-label', getTranslation(key));
    node.addEventListener('click', onClick);
    return node;
}

function setIcon(node, icon, key) {
    if (node.dataset.icon === icon) return;
    node.dataset.icon = icon;
    node.firstChild.innerHTML = ICONS[icon];
    node.setAttribute('aria-label', getTranslation(key));
}

/** Vraie forme d'onde du morceau, lue chez SoundCloud : la partie écoutée est allumée. */
function drawWave(canvas, samples, progress) {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const style = getComputedStyle(canvas);
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    const step = 5;
    const count = Math.floor(width / step);
    const peak = Math.max(...samples) || 1;
    for (let i = 0; i < count; i++) {
        const from = Math.floor(i / count * samples.length);
        const to = Math.max(Math.floor((i + 1) / count * samples.length), from + 1);
        const bar = Math.max(Math.max(...samples.slice(from, to)) / peak * height, 2);
        context.fillStyle = i / count < progress ? style.color : style.getPropertyValue('--unplayed');
        context.beginPath();
        context.roundRect(i * step, (height - bar) / 2, step - 2, bar, 1.5);
        context.fill();
    }
}

function deckLink(type, href) {
    const link = el('a', 'deck__link', { href, target: '_blank', rel: 'noopener' }, text('span', '', 'player_open_on'), ` ${SOURCES[type] ?? ''}`);
    link.hidden = !href;
    return link;
}

async function openDeck(box, { name, embed }) {
    const screen = el('div', `deck__screen deck__screen--${embed.type}`);
    const status = text('p', 'deck__status', 'player_loading');
    status.setAttribute('role', 'status');
    const link = deckLink(embed.type, embed.type === 'soundcloud' ? '' : pageOf(embed));
    const deck = el('div', 'deck', {}, screen, status);
    box.replaceChildren(deck);

    /** Lecteur d'origine, pour les plateformes sans pilote ou quand l'API ne répond pas. */
    function showFrame() {
        screen.className = `deck__screen deck__screen--${embed.type} has-frame`;
        link.href = pageOf(embed);
        link.hidden = false;
        screen.replaceChildren(frameOf(embed, name));
        status.replaceWith(el('div', 'deck__bar', {}, el('span', 'deck__title', { textContent: name }), link));
    }

    if (!DRIVERS[embed.type]) {
        showFrame();
        return;
    }
    let driver;
    try {
        driver = await DRIVERS[embed.type](embed, name, screen);
    } catch (error) {
        console.warn(`cards/player.js, ${name} : ${error.message}`);
        if (box.isConnected) showFrame();
        return;
    }
    if (!box.isConnected) return; // fiche refermée entre-temps

    const isVideo = embed.type === 'youtube';
    const toggle = iconButton('play', 'player_play', () => driver.toggle());
    toggle.classList.add('deck__button--main');
    const previous = iconButton('previous', 'player_previous', () => driver.skip(Math.max(driver.state().index - 1, 0)));
    const next = iconButton('next', 'player_next', () => driver.skip(driver.state().index + 1));
    const title = el('span', 'deck__title', { textContent: name });
    const time = el('span', 'deck__time', { textContent: '0:00 / 0:00' });
    const range = (className, key, max) => {
        const node = el('input', className, { type: 'range', min: 0, max, step: 'any', value: 0 });
        node.setAttribute('aria-label', getTranslation(key));
        return node;
    };
    const seek = range('deck__seek', 'player_seek', 1);
    const gain = range('deck__gain', 'player_volume', 1);
    const wave = el('canvas', 'deck__wave', { hidden: true });
    wave.setAttribute('aria-hidden', 'true');
    const list = el('ol', 'deck__tracks', { hidden: true });

    let seeking = false;
    seek.addEventListener('input', () => { seeking = true; seek.style.setProperty('--value', seek.value); });
    seek.addEventListener('change', () => {
        driver.seek(seek.value * (driver.state().duration || 0));
        seeking = false;
    });
    const setGain = () => {
        volume = Number(gain.value);
        gain.style.setProperty('--value', volume);
        driver.setVolume(volume);
    };
    gain.value = volume;
    gain.addEventListener('input', setGain);
    setGain();

    const fullscreen = iconButton('fullscreen', 'player_fullscreen', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else deck.requestFullscreen?.().catch(() => {});
    });
    fullscreen.hidden = !isVideo || !document.fullscreenEnabled;
    const gainBox = el('span', 'deck__volume', {}, svg('deck__icon', '0 0 24 24', ICONS.volume), gain);
    // L'iframe reste à sa place : la déplacer dans la page la rechargerait.
    status.replaceWith(
        el('div', 'deck__scrub', {}, wave, seek),
        el('div', 'deck__bar', {}, previous, toggle, next, el('span', 'deck__info', {}, title, time), gainBox, fullscreen),
        list,
        el('div', 'deck__foot', {}, link));
    toggle.focus({ preventScroll: true });

    let shownTracks = '';
    function showTracks({ tracks = [], index = 0 }) {
        previous.hidden = next.hidden = tracks.length < 2;
        previous.disabled = index === 0;
        next.disabled = index >= tracks.length - 1;
        const key = `${index}|${tracks.join('|')}`;
        if (key === shownTracks) return;
        shownTracks = key;
        if (tracks[index]) title.textContent = tracks[index];
        list.hidden = tracks.length < 2;
        list.replaceChildren(...tracks.map((track, i) => {
            const label = el('span', 'deck__trackname', { textContent: track });
            if (!track) setText(label, 'player_track');
            const row = el('button', 'deck__track', { type: 'button' }, el('span', 'deck__trackno', { textContent: i + 1 }), label);
            if (i === index) row.setAttribute('aria-current', 'true');
            row.addEventListener('click', () => (i === index ? driver.toggle() : driver.skip(i)));
            return el('li', '', {}, row);
        }));
    }

    function refresh() {
        if (!box.isConnected) {
            clearInterval(timer);
            return;
        }
        const state = driver.state();
        const progress = state.duration ? Math.min((state.time || 0) / state.duration, 1) : 0;
        setIcon(toggle, state.playing ? 'pause' : 'play', state.playing ? 'player_pause' : 'player_play');
        deck.classList.toggle('is-playing', state.playing);
        time.textContent = `${clock(state.time)} / ${clock(state.duration)}`;
        if (!seeking) {
            seek.value = progress;
            seek.style.setProperty('--value', progress);
        }
        seek.setAttribute('aria-valuetext', time.textContent);
        if (state.page) {
            link.href = state.page;
            link.hidden = false;
        }
        showTracks(state);
        wave.hidden = !state.wave;
        if (state.wave) drawWave(wave, state.wave, seeking ? Number(seek.value) : progress);
    }
    const timer = setInterval(refresh, 250);
    refresh();
}

/** Façade du lecteur : il n'est chargé qu'au clic, rien ne joue sans geste. */
export function createPlayer({ name, embed }) {
    const box = el('div', 'player');
    const facade = el('button', 'player__facade', { type: 'button' },
        el('span', 'player__play'),
        el('span', 'player__track', {},
            createWave(name),
            el('span', 'player__title', {}, text('span', '', 'player_listen'), ` ${name}`),
            el('span', 'player__source', {}, text('span', '', 'player_open'), ` ${SOURCES[embed.type] ?? embed.type}`)));
    facade.addEventListener('click', () => openDeck(box, { name, embed }));
    box.append(facade);
    return box;
}
