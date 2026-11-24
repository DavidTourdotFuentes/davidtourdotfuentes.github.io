// Liaison directe entre deux joueurs. Un service de mise en relation (PeerJS) les présente l'un à l'autre
// à partir du code du salon ; ensuite, leurs navigateurs se parlent directement.

const LIBRARIES = {
    Peer: {
        src: 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
        integrity: 'sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR',
    },
    qrcode: {
        src: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
        integrity: 'sha384-lQXOAyZwHXE55JFyrOMB7nY2Wv+m5ZWNtJcHrd1rceRQXAYNLak8ukN5TjBTcIwz',
    },
};
const JOIN_TIMEOUT = 15_000;
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sans 0/O ni 1/I/L, faciles à confondre
export const CODE_LENGTH = 5;

/** Erreur à montrer au joueur ; key est une clé de translations.csv. */
export class RoomError extends Error {
    constructor(key) {
        super(key);
        this.key = key;
    }
}

/** Charge une bibliothèque au premier besoin seulement. */
const loading = {};
function load(name) {
    loading[name] ??= new Promise((resolve, reject) => {
        const script = Object.assign(document.createElement('script'), { ...LIBRARIES[name], crossOrigin: 'anonymous' });
        script.onload = () => resolve(window[name]);
        script.onerror = () => {
            delete loading[name]; // un nouvel essai reste possible
            script.remove();
            reject(new RoomError('room_error_network'));
        };
        document.head.append(script);
    });
    return loading[name];
}

/** QR code d'un lien, en SVG, ou null s'il ne peut pas être chargé. */
export async function qrCode(link) {
    try {
        const qrcode = await load('qrcode');
        const qr = qrcode(0, 'M');
        qr.addData(link);
        qr.make();
        return qr.createSvgTag({ scalable: true, margin: 2 });
    } catch {
        return null;
    }
}

/** Met en forme un code saisi à la main. */
export function cleanCode(input) {
    return [...String(input).toUpperCase()].filter((letter) => ALPHABET.includes(letter)).join('').slice(0, CODE_LENGTH);
}

function randomCode() {
    return [...crypto.getRandomValues(new Uint8Array(CODE_LENGTH))].map((byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

/** Adresse d'un salon ; le nom du jeu est brouillé, le service n'a pas à le connaître. */
function peerId(gameId, code) {
    let hash = 0x811c9dc5; // FNV-1a
    for (const letter of gameId) hash = Math.imul(hash ^ letter.codePointAt(0), 0x01000193);
    return `tcg-${(hash >>> 0).toString(36)}-${code}`;
}

function errorKey(type) {
    if (type === 'peer-unavailable') return 'room_error_missing';
    if (type === 'browser-incompatible') return 'room_error_browser';
    return 'room_error_network';
}

/** Canal entre les deux joueurs : send(message), close(), et onMessage / onClose à brancher. */
function createChannel(peer, connection) {
    const end = () => {
        window.removeEventListener('pagehide', end);
        if (!peer.destroyed) peer.destroy();
    };
    const channel = {
        onMessage: () => {},
        onClose: () => {},
        send(message) {
            if (connection.open) connection.send(message);
        },
        close() {
            channel.onClose = () => {};
            setTimeout(end, 100); // laisse partir le dernier message
        },
    };
    const lost = () => {
        const notify = channel.onClose;
        channel.onClose = () => {};
        end();
        notify();
    };
    connection.on('data', (message) => {
        if (message && typeof message === 'object') channel.onMessage(message);
    });
    connection.on('close', lost);
    connection.on('error', lost);
    window.addEventListener('pagehide', end); // prévient l'autre joueur tout de suite
    return channel;
}

/**
 * Crée un salon. onGuest(channel) est appelé quand un joueur arrive, onError(key) si la liaison casse avant.
 * Renvoie { code, close }.
 */
export async function createRoom({ gameId, server, onGuest, onError }) {
    const Peer = await load('Peer');
    for (let attempt = 0; attempt < 3; attempt++) {
        const code = randomCode();
        const peer = new Peer(peerId(gameId, code), server ?? {});
        try {
            await new Promise((resolve, reject) => {
                peer.once('open', resolve);
                peer.once('error', reject);
            });
        } catch (error) {
            peer.destroy();
            if (error.type === 'unavailable-id') continue; // code déjà pris
            throw new RoomError(errorKey(error.type));
        }

        let guest = null;
        peer.on('connection', (connection) => {
            connection.on('open', () => {
                if (guest) { // salon complet
                    connection.send({ type: 'full' });
                    setTimeout(() => connection.close(), 500);
                    return;
                }
                guest = connection;
                onGuest(createChannel(peer, connection));
            });
        });
        // Le service coupe parfois la ligne pendant l'attente : on se représente avec le même code.
        peer.on('disconnected', () => { if (!peer.destroyed && !guest) peer.reconnect(); });
        peer.on('error', (error) => { if (!guest) onError(errorKey(error.type)); });
        return { code, close: () => peer.destroy() };
    }
    throw new RoomError('room_error_network');
}

/** Rejoint un salon. Renvoie { ready, cancel } : ready donne le canal, ou null si on a annulé. */
export function joinRoom({ gameId, server, code }) {
    let peer = null;
    let cancelled = false;

    async function connect() {
        const Peer = await load('Peer');
        if (cancelled) return null;
        peer = new Peer(server ?? {});
        try {
            return await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new RoomError('room_error_timeout')), JOIN_TIMEOUT);
                peer.on('error', (error) => {
                    clearTimeout(timer);
                    reject(new RoomError(errorKey(error.type)));
                });
                peer.once('open', () => {
                    const connection = peer.connect(peerId(gameId, code), { reliable: true, serialization: 'json' });
                    connection.once('open', () => {
                        clearTimeout(timer);
                        resolve(createChannel(peer, connection));
                    });
                });
            });
        } catch (error) {
            peer.destroy();
            if (cancelled) return null;
            throw error;
        }
    }

    return {
        ready: connect(),
        cancel() {
            cancelled = true;
            peer?.destroy();
        },
    };
}
