// Wrapper FMOD Studio : chargement paresseux, banks, instances et cycle de vie.
// Signatures vérifiées sur les exemples HTML5 du SDK 2.02.13 (api/studio/examples).

const FMOD_DIR = 'lib/fmod/';
const BANK_DIR = 'banks/';
const DSP_BUFFER_SIZE = 2048; // Le mixage tourne sur le thread principal : en dessous, risque de craquements.
const DSP_BUFFER_COUNT = 2;
const MAX_CHANNELS = 256;
const IDLE_DELAY_MS = 500; // Laisse finir les dernières traînes avant de suspendre le mixeur.

/** code : "missing-fmod", "missing-bank", "fmod" ou "released". */
export class EngineError extends Error {
    constructor(code, message, options) {
        super(message, options);
        this.code = code;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => {
            script.remove();
            reject(new EngineError('missing-fmod', `${src} est introuvable.`));
        };
        document.head.append(script);
    });
}

/** Télécharge un fichier en signalant la part reçue (0 à 1) quand la taille est connue. */
async function download(url, missingCode, onProgress) {
    let response;
    try {
        response = await fetch(url);
    } catch (cause) {
        throw new EngineError(missingCode, `${url} n'a pas pu être téléchargé.`, { cause });
    }
    if (!response.ok) throw new EngineError(missingCode, `${url} est introuvable (HTTP ${response.status}).`);

    const total = Number(response.headers.get('Content-Length'));
    if (!total || !response.body) return new Uint8Array(await response.arrayBuffer());

    const chunks = [];
    let received = 0;
    const reader = response.body.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        // Content-Length compte les octets compressés : on borne à 1.
        onProgress?.(Math.min(received / total, 1));
    }

    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}

class FmodEngine {
    #fmod = null;
    #studio = null;
    #core = null;
    #output = null;
    #sharedBanks = [];
    #ready = false;
    #initPromise = null;
    #banks = new Map(); // nom → { promise, bank }
    #handles = new Set();
    #frame = 0;
    #idleSince = 0;
    #hidden = false; // suspension demandée par la page (onglet caché)
    #mixing = false;
    #masterVolume = 1;

    /** Appelé si la boucle de mise à jour échoue ; le moteur est alors déjà libéré. */
    onFailure = null;

    get isReady() {
        return this.#ready;
    }

    /** true si le navigateur attend encore un geste pour laisser passer le son (Safari). */
    get isLocked() {
        // mContext : contexte audio global du runtime FMOD, non documenté, donc accès facultatif.
        return this.#ready && this.#mixing && globalThis.mContext?.state === 'suspended';
    }

    /** À appeler dans un geste utilisateur. Réessayable après un échec. */
    init({ sharedBanks = [], onProgress } = {}) {
        this.#sharedBanks = sharedBanks;
        this.#initPromise ??= this.#init(onProgress).catch((error) => {
            this.#initPromise = null;
            throw error;
        });
        return this.#initPromise;
    }

    async #init(onProgress) {
        const steps = 1 + this.#sharedBanks.length;
        const report = (step, part) => onProgress?.((step + part) / steps);

        if (!this.#fmod) this.#fmod = await this.#loadRuntime((part) => report(0, part));
        if (!this.#studio) this.#createSystem();
        for (const [i, name] of this.#sharedBanks.entries()) {
            await this.#loadBank(name, (part) => report(1 + i, part));
        }

        this.#ready = true;
        this.#applyMasterVolume();
        this.#startMixer();
        this.unlock();
        this.#startLoop();
    }

    /**
     * Déverrouille la sortie audio. Le runtime ne crée son nœud de sortie que dans un gestionnaire
     * de clic installé par initialize() : sans cet appel, le premier clic resterait muet.
     * À rappeler dans un geste tant que isLocked est vrai.
     */
    unlock() {
        const name = this.#output === this.#fmod.OUTPUTTYPE_AUDIOWORKLET
            ? 'OutputAudioWorklet_resumeAudio' : 'OutputWebAudio_resumeAudio';
        globalThis[name]?.();
        if (this.isLocked) globalThis.mContext.resume();
    }

    async #loadRuntime(onProgress) {
        if (!globalThis.FMODModule) await loadScript(`${FMOD_DIR}fmodstudio.js`);
        const wasmBinary = await download(`${FMOD_DIR}fmodstudio.wasm`, 'missing-fmod', onProgress);

        return new Promise((resolve, reject) => {
            const fmod = {
                wasmBinary,
                INITIAL_MEMORY: 64 * 1024 * 1024,
                onRuntimeInitialized: () => {
                    delete fmod.wasmBinary;
                    resolve(fmod);
                },
                onAbort: (reason) => reject(new EngineError('fmod', `Le moteur FMOD n'a pas démarré : ${reason}`)),
            };
            globalThis.FMODModule(fmod);
        });
    }

    #createSystem() {
        const FMOD = this.#fmod;
        const out = {};
        this.#check(FMOD.Studio_System_Create(out), 'Studio_System_Create');
        const studio = out.val;
        try {
            this.#check(studio.getCoreSystem(out), 'getCoreSystem');
            const core = out.val;
            this.#check(core.setDSPBufferSize(DSP_BUFFER_SIZE, DSP_BUFFER_COUNT), 'setDSPBufferSize');
            // Mixer à la fréquence de la sortie évite un rééchantillonnage.
            this.#check(core.getDriverInfo(0, null, null, out, null, null), 'getDriverInfo');
            this.#check(core.setSoftwareFormat(out.val, FMOD.SPEAKERMODE_DEFAULT, 0), 'setSoftwareFormat');
            this.#check(studio.initialize(MAX_CHANNELS, FMOD.STUDIO_INIT_NORMAL, FMOD.INIT_NORMAL, null), 'initialize');
            this.#check(core.getOutput(out), 'getOutput');
            this.#output = out.val;
            this.#studio = studio;
            this.#core = core;
            this.#mixing = true;
        } catch (error) {
            studio.release();
            throw error;
        }
    }

    async loadBanks(names) {
        await Promise.all(names.map((name) => this.#loadBank(name)));
    }

    unloadBanks(names) {
        for (const name of names) {
            if (this.#sharedBanks.includes(name)) continue;
            const entry = this.#banks.get(name);
            this.#banks.delete(name);
            if (entry?.bank) this.#check(entry.bank.unload(), `unload ${name}`);
        }
        this.#flush();
    }

    #loadBank(name, onProgress) {
        const known = this.#banks.get(name);
        if (known) return known.promise;

        const entry = { promise: null, bank: null };
        entry.promise = this.#fetchBank(name, entry, onProgress).catch((error) => {
            if (this.#banks.get(name) === entry) this.#banks.delete(name);
            throw error;
        });
        this.#banks.set(name, entry);
        return entry.promise;
    }

    async #fetchBank(name, entry, onProgress) {
        const url = BANK_DIR + name.split('/').map(encodeURIComponent).join('/');
        const bytes = await download(url, 'missing-bank', onProgress);
        if (!this.#studio || this.#banks.get(name) !== entry) {
            throw new EngineError('released', `Chargement de ${name} abandonné.`);
        }
        const FMOD = this.#fmod;
        const out = {};
        this.#check(
            this.#studio.loadBankMemory(bytes, bytes.length, FMOD.STUDIO_LOAD_MEMORY, FMOD.STUDIO_LOAD_BANK_NORMAL, out),
            `loadBankMemory ${name}`,
        );
        entry.bank = out.val;
    }

    /** Démarre un event. onStopped est appelé une fois, quand l'instance est vraiment finie. */
    play(eventPath, { onStopped } = {}) {
        if (!this.#ready) throw new EngineError('released', "Le moteur audio n'est pas prêt.");
        const out = {};
        this.#check(this.#studio.getEvent(eventPath, out), `getEvent ${eventPath}`);
        this.#check(out.val.createInstance(out), `createInstance ${eventPath}`);
        const handle = { instance: out.val, path: eventPath, onStopped };
        try {
            this.#check(handle.instance.start(), `start ${eventPath}`);
        } catch (error) {
            handle.instance.release();
            throw error;
        }
        this.#handles.add(handle);
        this.#startMixer();
        this.#startLoop();
        return handle;
    }

    stop(handle, { fade = true } = {}) {
        if (!this.#handles.has(handle)) return;
        const mode = fade ? this.#fmod.STUDIO_STOP_ALLOWFADEOUT : this.#fmod.STUDIO_STOP_IMMEDIATE;
        this.#check(handle.instance.stop(mode), `stop ${handle.path}`);
    }

    stopAll(options) {
        for (const handle of this.#handles) this.stop(handle, options);
    }

    setParam(handle, name, value) {
        if (!this.#handles.has(handle)) return;
        this.#check(handle.instance.setParameterByName(name, value, false), `setParameterByName ${name}`);
    }

    setGlobalParam(name, value) {
        if (!this.#ready) return;
        this.#check(this.#studio.setParameterByName(name, value, false), `setParameterByName ${name} (global)`);
        this.#flush();
    }

    /** Volume linéaire de 0 à 1 sur le bus master. */
    setMasterVolume(value) {
        this.#masterVolume = value;
        if (!this.#ready) return;
        this.#applyMasterVolume();
        this.#flush();
    }

    #applyMasterVolume() {
        const out = {};
        this.#check(this.#studio.getBus('bus:/', out), 'getBus bus:/');
        this.#check(out.val.setVolume(this.#masterVolume), 'setVolume bus:/');
    }

    suspend() {
        this.#hidden = true;
        this.#stopLoop();
        this.#stopMixer();
    }

    resume() {
        this.#hidden = false;
        if (!this.#ready || this.#handles.size === 0) return;
        this.#startMixer();
        this.#startLoop();
    }

    /** Arrête tout et libère le système. init() peut être rappelé ensuite. */
    release() {
        this.#stopLoop();
        const handles = [...this.#handles];
        this.#handles.clear();
        this.#banks.clear();
        this.#ready = false;
        this.#initPromise = null;
        if (this.#studio) {
            for (const { instance } of handles) {
                instance.stop(this.#fmod.STUDIO_STOP_IMMEDIATE);
                instance.release();
            }
            const result = this.#studio.release();
            if (result !== this.#fmod.OK) console.error(`[FMOD] release : ${this.#fmod.ErrorString(result)}`);
        }
        this.#studio = null;
        this.#core = null;
        this.#mixing = false;
        for (const handle of handles) handle.onStopped?.();
    }

    // Le mixeur travaille en continu, même dans le silence : on le suspend dès que rien ne joue.
    #startMixer() {
        if (!this.#core || this.#mixing || this.#hidden) return;
        this.#check(this.#core.mixerResume(), 'mixerResume');
        this.#mixing = true;
    }

    #stopMixer() {
        if (!this.#core || !this.#mixing) return;
        this.#check(this.#core.mixerSuspend(), 'mixerSuspend');
        this.#mixing = false;
    }

    #startLoop() {
        this.#idleSince = 0;
        if (this.#frame || this.#hidden) return;
        const tick = (now) => {
            this.#frame = 0;
            try {
                this.#update();
            } catch (error) {
                this.release();
                this.onFailure?.(error);
                return;
            }
            if (this.#handles.size === 0) {
                this.#idleSince ||= now;
                if (now - this.#idleSince >= IDLE_DELAY_MS) {
                    this.#stopMixer();
                    return;
                }
            } else {
                this.#idleSince = 0;
            }
            this.#frame ||= requestAnimationFrame(tick);
        };
        this.#frame = requestAnimationFrame(tick);
    }

    #stopLoop() {
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
    }

    #update() {
        this.#check(this.#studio.update(), 'update');
        const out = {};
        for (const handle of [...this.#handles]) {
            const result = handle.instance.getPlaybackState(out);
            if (result === this.#fmod.OK && out.val !== this.#fmod.STUDIO_PLAYBACK_STOPPED) continue;
            this.#handles.delete(handle);
            handle.instance.release();
            handle.onStopped?.();
        }
    }

    /** Transmet les commandes en attente quand la boucle de mise à jour est arrêtée. */
    #flush() {
        if (this.#studio && !this.#frame) this.#check(this.#studio.update(), 'update');
    }

    #check(result, action) {
        if (result === this.#fmod.OK) return;
        const detail = this.#fmod.ErrorString(result);
        console.error(`[FMOD] ${action} : erreur ${result}, ${detail}`);
        throw new EngineError('fmod', `${action} a échoué (code ${result}).`, { cause: detail });
    }
}

export const engine = new FmodEngine();
