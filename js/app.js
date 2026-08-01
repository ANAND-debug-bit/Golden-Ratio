const MODEL_URL = './models';

const els = {
  captureCard: document.getElementById('captureCard'),
  stateChoose: document.getElementById('stateChoose'),
  stateCamera: document.getElementById('stateCamera'),
  stateAnalysing: document.getElementById('stateAnalysing'),
  stateError: document.getElementById('stateError'),

  btnUseCamera: document.getElementById('btnUseCamera'),
  fileInput: document.getElementById('fileInput'),
  video: document.getElementById('video'),
  btnShoot: document.getElementById('btnShoot'),
  btnCancelCamera: document.getElementById('btnCancelCamera'),

  analysingImg: document.getElementById('analysingImg'),
  analysingStatus: document.getElementById('analysingStatus'),

  errorTitle: document.getElementById('errorTitle'),
  errorBody: document.getElementById('errorBody'),
  btnRetry: document.getElementById('btnRetry'),

  resultsSection: document.getElementById('resultsSection'),
  overlayCanvas: document.getElementById('overlayCanvas'),
  scoreNumber: document.getElementById('scoreNumber'),
  scoreVerdict: document.getElementById('scoreVerdict'),
  ratioList: document.getElementById('ratioList'),
  btnDownload: document.getElementById('btnDownload'),
  btnRestart: document.getElementById('btnRestart'),
};

let mediaStream = null;
let modelsReady = false;
let modelsLoadingPromise = null;

// Show one panel of the capture card at a time.
function showCaptureState(name) {
  const panels = {
    choose: els.stateChoose,
    camera: els.stateCamera,
    analysing: els.stateAnalysing,
    error: els.stateError,
  };
  Object.entries(panels).forEach(([key, el]) => {
    el.hidden = key !== name;
  });
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

// Models load on first use, not page load, so visitors aren't stuck waiting on a download.
function ensureModelsLoaded() {
  if (modelsReady) return Promise.resolve();
  if (modelsLoadingPromise) return modelsLoadingPromise;

  modelsLoadingPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  ]).then(() => {
    modelsReady = true;
  });

  return modelsLoadingPromise;
}

els.btnUseCamera.addEventListener('click', async () => {
  showCaptureState('camera');
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      audio: false,
    });
    els.video.srcObject = mediaStream;
  } catch (err) {
    showError(
      "We couldn't reach your camera.",
      "Your browser may have blocked camera access for this page. Check the address bar for a blocked-camera icon, or upload a photo instead."
    );
    stopCamera();
  }
});

els.btnCancelCamera.addEventListener('click', () => {
  stopCamera();
  showCaptureState('choose');
});

els.btnShoot.addEventListener('click', () => {
  const video = els.video;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  // Mirror the still so it matches the live preview.
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  stopCamera();
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    runAnalysis(url);
  }, 'image/jpeg', 0.92);
});

els.fileInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  runAnalysis(url);
  // Clear the input so picking the same file again still fires 'change'.
  e.target.value = '';
});

function showError(title, body) {
  els.errorTitle.textContent = title;
  els.errorBody.textContent = body;
  showCaptureState('error');
}

els.btnRetry.addEventListener('click', () => {
  showCaptureState('choose');
});

async function runAnalysis(imageUrl) {
  showCaptureState('analysing');
  els.analysingImg.src = imageUrl;
  els.analysingStatus.textContent = 'Loading the measurement model…';

  try {
    await ensureModelsLoaded();
  } catch (err) {
    console.error(err);
    showError(
      "The measurement model didn't load.",
      "This page needs to download a small face-detection model from a CDN the first time you use it. Check your internet connection and that nothing is blocking cdn.jsdelivr.net, then try again."
    );
    return;
  }

  els.analysingStatus.textContent = 'Finding your features…';

  const img = await loadImage(imageUrl);

  let detection;
  try {
    detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
      .withFaceLandmarks();
  } catch (err) {
    console.error(err);
    detection = null;
  }

  if (!detection) {
    showError(
      "We couldn't find a face in that photo.",
      "Try a photo with more even light, facing the camera directly, with nothing covering your eyes, nose or mouth."
    );
    return;
  }

  els.analysingStatus.textContent = 'Measuring…';

  const points = detection.landmarks.positions; // array of 68 {x,y}
  const { rows } = computeFacialRatios(points);
  const score = scoreFromRatios(rows);
  const verdict = verdictFromScore(score);

  renderResults({ img, points, rows, score, verdict });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function renderResults({ img, points, rows, score, verdict }) {
  els.resultsSection.hidden = false;
  els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  drawOverlay(img, points, rows);

  els.scoreNumber.textContent = score;
  els.scoreVerdict.textContent = verdict;

  els.ratioList.innerHTML = '';
  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'ratio-row';

    const close = r.diffPct <= 12;

    row.innerHTML = `
      <span class="ratio-row__name">${r.label}</span>
      <span class="ratio-row__value">${r.value.toFixed(2)} : ${r.ideal === PHI ? '1.618' : r.ideal.toFixed(2)}</span>
      <span class="ratio-row__diff ${close ? 'is-close' : 'is-far'}">${close ? '≈ matches' : '±' + r.diffPct.toFixed(0) + '%'}</span>
    `;
    els.ratioList.appendChild(row);
  });

  showCaptureState('choose'); // reset the capture card, ready for "measure another"
}

function drawOverlay(img, points, rows) {
  const canvas = els.overlayCanvas;
  const size = 640; // fixed square working resolution
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Centre-crop the source image into the square canvas.
  const srcSize = Math.min(img.width, img.height);
  const srcX = (img.width - srcSize) / 2;
  const srcY = (img.height - srcSize) / 2;
  ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);

  // Map source coordinates into the canvas's space.
  const scale = size / srcSize;
  const toCanvas = (pt) => ({ x: (pt.x - srcX) * scale, y: (pt.y - srcY) * scale });

  const p = points.map(toCanvas);
  const { hairline } = computeFacialRatios(points);
  const hairlineC = toCanvas(hairline);

  const jawLeft = p[0], jawRight = p[16], chin = p[8];
  const browMid = { x: (p[19].x + p[24].x) / 2, y: (p[19].y + p[24].y) / 2 };

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Brass guide lines: face oval approximated from jaw + hairline.
  ctx.strokeStyle = 'rgba(156, 122, 60, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([3, 5]);

  const faceCenterX = (jawLeft.x + jawRight.x) / 2;
  const faceWidthPx = Math.hypot(jawRight.x - jawLeft.x, jawRight.y - jawLeft.y);
  const faceHeightPx = Math.hypot(chin.x - hairlineC.x, chin.y - hairlineC.y);

  ctx.beginPath();
  ctx.ellipse(faceCenterX, (hairlineC.y + chin.y) / 2, faceWidthPx / 2, faceHeightPx / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Vertical midline.
  ctx.beginPath();
  ctx.moveTo(faceCenterX, hairlineC.y - 10);
  ctx.lineTo(faceCenterX, chin.y + 10);
  ctx.stroke();

  // Horizontal section lines: hairline, brow, nose base, mouth, chin.
  const sectionYs = [hairlineC.y, browMid.y, p[33].y, p[57].y, chin.y];
  ctx.setLineDash([2, 4]);
  ctx.lineWidth = 1;
  sectionYs.forEach(y => {
    ctx.beginPath();
    ctx.moveTo(faceCenterX - faceWidthPx * 0.62, y);
    ctx.lineTo(faceCenterX + faceWidthPx * 0.62, y);
    ctx.stroke();
  });

  // Terracotta: the feature lines actually used in scoring.
  ctx.strokeStyle = 'rgba(168, 68, 46, 0.9)';
  ctx.setLineDash([]);
  ctx.lineWidth = 1.6;

  rows.forEach(r => {
    const pts = r.points.map(toCanvas);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  });

  // Dots at every landmark used, so the plate reads as measured points.
  ctx.fillStyle = 'rgba(242, 237, 227, 0.95)';
  [27, 33, 31, 35, 36, 39, 42, 45, 48, 54, 51, 57, 8, 0, 16, 19, 24].forEach(i => {
    ctx.beginPath();
    ctx.arc(p[i].x, p[i].y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Golden spiral scaled to this face's width, echoing the hero illustration.
  drawGoldenSpiral(ctx, faceCenterX + faceWidthPx * 0.58, hairlineC.y + faceHeightPx * 0.12, faceWidthPx * 0.34);
}

function drawGoldenSpiral(ctx, originX, originY, baseRadius) {
  ctx.strokeStyle = 'rgba(168, 68, 46, 0.55)';
  ctx.setLineDash([]);
  ctx.lineWidth = 1.2;

  // Log spiral: r = r0 * PHI^(-theta / (pi/2)), drawn as a short-segment polyline.
  const turns = 1.3;
  const pointsPerTurn = 48;
  const totalSteps = Math.round(turns * pointsPerTurn);

  ctx.beginPath();
  for (let i = 0; i <= totalSteps; i++) {
    const theta = (i / pointsPerTurn) * Math.PI * 2;
    const r = baseRadius * Math.pow(PHI, -theta / (Math.PI / 2));
    const x = originX - r * Math.cos(theta); // mirrored so it curls toward the face
    const y = originY + r * Math.sin(theta);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

els.btnDownload.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'proportion-study.png';
  link.href = els.overlayCanvas.toDataURL('image/png');
  link.click();
});

els.btnRestart.addEventListener('click', () => {
  els.resultsSection.hidden = true;
  document.getElementById('measure').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

