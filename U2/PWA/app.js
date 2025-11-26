//app principal
let stream = null; // Mediastream actual de la camara
let currentFacing = 'environment'; // User = frontal y environment = trasera
let mediaRecorder = null; // Instancia de MediaRecorder para audio 
let chunks = []; // Buffers para audio grabado
let beforeInstallEvent = null; // Evento diferido para mostrar el botón de instalacion

// Accesos rápidos al DOM
const $ = (sel) => document.querySelector(sel);
const video = $('#video');
const canvas = $('#canvas');
const photos = $('#photos');
const audios = $('#audios');
const btnStartCam = $('#btnStartCam');
const btnStopCam = $('#btnStopCam');
const btnFlip = $('#btnFlip');
const btnTorch = $('#btnTorch');
const btnShot = $('#btnShot');
const videoDevices = $('#videoDevices');
const btnStartRec = $('#btnStartRec');
const btnStopRec = $('#btnStopRec');
const recStatus = $('#recStatus');
const btnInstall = $('#btnInstall');

// Instalación de PWA (A2HS)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    beforeInstallEvent = e;
    btnInstall.hidden = false;
});

btnInstall.addEventListener('click', async () => {
    if (!beforeInstallEvent) return;
    beforeInstallEvent.prompt();
    await beforeInstallEvent.userChoice;
    btnInstall.hidden = true;
    beforeInstallEvent = null;
});

// Listado de cámaras
async function listVideoInputs() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');

        videoDevices.innerHTML = '';

        cams.forEach((d, i) => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || `Camara ${i + 1}`;
            videoDevices.appendChild(opt);
        });
    } catch (err) {
        console.warn('No se pudo enumerar dispositivos:', err);
    }
}

// Iniciar cámara
async function startCam(constraints = {}) {
    if (!('mediaDevices' in navigator)) {
        alert('Este navegador no soporta acceso a Cámara/Micrófono');
        return;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacing, ...constraints },
            audio: false
        });

        video.srcObject = stream;

        btnStopCam.disabled = false;
        btnFlip.disabled = false;
        btnShot.disabled = false;
        btnTorch.disabled = false;

        await listVideoInputs();
    } catch (err) {
        alert('No se pudo iniciar la cámara: ' + err.message);
        console.error(err);
    }
}

// Detener cámara
function stopCam() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }

    video.srcObject = null;

    btnStopCam.disabled = true;
    btnFlip.disabled = true;
    btnShot.disabled = true;
    btnTorch.disabled = true;
}

// Botones de control de camara
btnStartCam.addEventListener('click', () => startCam());

btnStopCam.addEventListener('click', stopCam);

btnFlip.addEventListener('click', async () => {
    currentFacing = (currentFacing === 'environment') ? 'user' : 'environment';
    stopCam();
    await startCam();
});

// Cambiar cámara desde el select
videoDevices.addEventListener('change', async (e) => {
    const id = e.target.value;
    stopCam();
    await startCam({ deviceId: { exact: id } });
});

// Activar linterna
btnTorch.addEventListener('click', async () => {
    try {
        const [track] = stream ? stream.getVideoTracks() : [];
        if (!track) return;

        const cts = track.getConstraints();
        const torch = !(cts.advanced && cts.advanced[0]?.torch);

        await track.applyConstraints({ advanced: [{ torch }] });
    } catch (err) {
        alert('La linterna no es compatible con este dispositivo / navegador');
    }
});

// Tomar foto
btnShot.addEventListener('click', () => {
    if (!stream) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `foto-${Date.now()}.png`;
        a.textContent = 'Descargar Foto';
        a.className = 'btn';

        const img = document.createElement('img');
        img.src = url;
        img.alt = 'captura';
        img.style.width = '100%';

        const wrap = document.createElement('div');
        wrap.appendChild(img);
        wrap.appendChild(a);

        photos.prepend(wrap);
    }, 'image/png');
});
