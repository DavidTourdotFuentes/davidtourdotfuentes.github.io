// Oscilloscope, spectre et niveau du son que l'on entend vraiment : un analyseur branché sur la sortie de FMOD.

const FFT_SIZE = 2048;
const SILENCE = 0.002; // en dessous, l'écran se repose
const FALL = 0.93; // retombée des barres du spectre, par image
const NEEDLE_MS = 300; // temps d'intégration d'un VU-mètre
const BARS = 40;
const LOW_HZ = 40;
const HIGH_HZ = 14000;

/** L'écran suit les couleurs de son élément : color pour la trace, --grid pour la graduation. */
function prepare(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return null;
    const [w, h] = [Math.round(width * ratio), Math.round(height * ratio)];
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const style = getComputedStyle(canvas);
    return { ctx, width, height, color: style.color, grid: style.getPropertyValue('--grid').trim() || '#6d6152' };
}

function drawGrid({ ctx, width, height, grid }) {
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (let i = 1; i < 10; i++) {
        const x = Math.round((width * i) / 10) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let i = 1; i < 4; i++) {
        const y = Math.round((height * i) / 4) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
}

/** Trace l'onde à partir d'un passage montant par zéro, pour qu'elle reste stable à l'écran. */
function drawWave({ ctx, width, height, color }, samples) {
    const span = FFT_SIZE / 2;
    let from = 0;
    for (let i = 1; i < span; i++) {
        if (samples[i - 1] < 0 && samples[i] >= 0) {
            from = i;
            break;
        }
    }
    let peak = 0;
    for (let i = from; i < from + span; i++) peak = Math.max(peak, Math.abs(samples[i]));
    const gain = peak > SILENCE ? Math.min(0.85 / peak, 6) : 0; // l'écran s'adapte, comme un calibre automatique

    ctx.beginPath();
    for (let i = 0; i <= span; i += 2) {
        const x = (i / span) * width;
        const y = height / 2 - (samples[from + i] ?? 0) * gain * (height / 2);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawSpectrum({ ctx, width, height, color }, bars) {
    const step = width / BARS;
    ctx.fillStyle = color;
    bars.forEach((value, i) => {
        const size = Math.max(value * (height - 8), 2);
        ctx.globalAlpha = 0.35 + value * 0.65;
        ctx.fillRect(i * step + 1.5, height - size, step - 3, size);
    });
    ctx.globalAlpha = 1;
}

/**
 * getNode() renvoie la sortie du moteur ; addScreen(canvas, { mode, isActive }) ajoute un écran ; onLevel(0 à 1) suit l'aiguille.
 * Rien ne tourne tant que start() n'est pas appelé ; l'affichage s'arrête seul quand plus rien ne joue (isBusy) et que le silence est revenu.
 */
export function createScope({ getNode, onLevel, isBusy }) {
    const screens = new Set();
    const samples = new Float32Array(FFT_SIZE);
    const bins = new Uint8Array(FFT_SIZE / 2);
    const bars = new Array(BARS).fill(0);
    let analyser = null;
    let source = null;
    let frame = 0;
    let level = 0;
    let last = 0;
    let quietSince = 0;

    /** La sortie n'existe qu'un instant après le lancement, et change si le moteur redémarre. */
    function attach() {
        const node = getNode();
        if (!node || node === source) return;
        source = node;
        analyser = node.context.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.6;
        node.connect(analyser); // en dérivation : le son n'est pas modifié
    }

    function measure(now) {
        attach();
        let sum = 0;
        if (analyser?.context.state === 'running') {
            analyser.getFloatTimeDomainData(samples);
            analyser.getByteFrequencyData(bins);
        } else {
            samples.fill(0);
            bins.fill(0);
        }
        for (const value of samples) sum += value * value;
        const rms = Math.sqrt(sum / samples.length);
        const decibels = 20 * Math.log10(Math.max(rms, 1e-5));
        const target = Math.min(Math.max((decibels + 46) / 40, 0), 1); // −46 dB en bas, −6 dB en haut
        level += (target - level) * Math.min((now - last) / NEEDLE_MS, 1);
        last = now;

        const nyquist = (analyser?.context.sampleRate ?? 48000) / 2;
        for (let i = 0; i < BARS; i++) {
            const edge = (n) => Math.floor((LOW_HZ * (HIGH_HZ / LOW_HZ) ** (n / BARS) / nyquist) * bins.length);
            let value = 0;
            for (let b = edge(i); b <= Math.max(edge(i + 1) - 1, edge(i)); b++) value = Math.max(value, bins[b] ?? 0);
            bars[i] = Math.max(value / 255, bars[i] * FALL < 0.01 ? 0 : bars[i] * FALL);
        }
        return rms;
    }

    function draw() {
        for (const screen of screens) {
            const pen = prepare(screen.canvas);
            if (!pen) continue;
            drawGrid(pen);
            const isActive = screen.isActive?.() ?? true;
            if (screen.mode === 'spectrum') drawSpectrum(pen, isActive ? bars : bars.map(() => 0));
            else drawWave(pen, isActive ? samples : new Float32Array(FFT_SIZE));
        }
        onLevel(level);
    }

    function tick(now) {
        frame = 0;
        const rms = measure(now);
        draw();
        if (rms > SILENCE) quietSince = 0;
        else quietSince ||= now;
        const isResting = !isBusy() && quietSince && now - quietSince > 2500;
        if (!isResting && !document.hidden) frame = requestAnimationFrame(tick);
    }

    function start() {
        quietSince = 0;
        last = performance.now();
        frame ||= requestAnimationFrame(tick);
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && analyser) start();
    });

    return {
        start,
        addScreen(canvas, options = {}) {
            const screen = { canvas, mode: 'wave', ...options };
            screens.add(screen);
            new ResizeObserver(() => { if (!frame) draw(); }).observe(canvas);
            return {
                setMode(mode) {
                    screen.mode = mode;
                    if (!frame) draw();
                },
            };
        },
    };
}
