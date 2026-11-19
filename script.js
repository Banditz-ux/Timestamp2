const mediaInput = document.getElementById('mediaInput');
const logoInput = document.getElementById('logoInput');
const previewCanvas = document.getElementById('previewCanvas');
const ctx = previewCanvas.getContext('2d');
const hiddenVideo = document.getElementById('hiddenVideo');
const statusText = document.getElementById('statusText');
const btnProcess = document.getElementById('btnProcess');
const btnGps = document.getElementById('btnGps');
const btnLiveGps = document.getElementById('btnLiveGps');
const btnUpdateMap = document.getElementById('btnUpdateMap');

const inputName = document.getElementById('inputName');
const inputTime = document.getElementById('inputTime');
const inputCoords = document.getElementById('inputCoords');
const inputLocation = document.getElementById('inputLocation');
const inputAltitude = document.getElementById('inputAltitude');
const inputSpeed = document.getElementById('inputSpeed');
const toggleAltSpeed = document.getElementById('toggleAltSpeed');
const inputFontSize = document.getElementById('inputFontSize');
const fontSizeLabel = document.getElementById('fontSizeLabel');

const toggleMap = document.getElementById('toggleMap');
const mapPosition = document.getElementById('mapPosition');
const mapSize = document.getElementById('mapSize');
const mapSizeLabel = document.getElementById('mapSizeLabel');
const mapOpacity = document.getElementById('mapOpacity');
const mapOpacityLabel = document.getElementById('mapOpacityLabel');

const logoPosition = document.getElementById('logoPosition');
const logoSize = document.getElementById('logoSize');
const logoSizeLabel = document.getElementById('logoSizeLabel');
const logoOpacity = document.getElementById('logoOpacity');
const logoOpacityLabel = document.getElementById('logoOpacityLabel');

let mediaType = null;
let loadedImage = new Image();
let logoImage = null;
let mapTileImage = null;
let baseDate = new Date();
let animationId = null;
let gpsAccuracy = '2,20m';
let watchId = null;
let lastTileKey = '';

function setDefaultTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  inputTime.value = now.toISOString().slice(0, 19);
  baseDate = new Date(inputTime.value);
}
setDefaultTime();

function parseLatLon(rawStr) {
  const arr = rawStr.split(',');
  if (arr.length < 2) return null;
  const lat = parseFloat(arr.shift().trim());
  const lon = parseFloat(arr.shift().trim());
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat: lat, lon: lon };
}

function loadMapFromCoords() {
  const cleanStr = inputCoords.value.replace(/;/g, ',');
  const coords = parseLatLon(cleanStr);
  if (!coords) {
    statusText.innerText = 'Format koordinat tidak terbaca.';
    return;
  }

  const lat = coords.lat;
  const lon = coords.lon;
  const zoom = 16;

  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );

  const tileKey = zoom + '_' + x + '_' + y;
  if (tileKey === lastTileKey && mapTileImage) {
    if (mediaType === 'image') drawImageFrame();
    return;
  }

  const servers = new Array(
    'https://cartocdn.com' + zoom + '/' + x + '/' + y + '.png',
    'https://arcgisonline.com' + zoom + '/' + y + '/' + x,
    'https://openstreetmap.org' + zoom + '/' + x + '/' + y + '.png'
  );

  statusText.innerText = 'Memuat gambar peta...';

  function tryNextServer(idx) {
    if (idx >= servers.length) {
      statusText.innerText = 'Semua server peta gagal dimuat.';
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      mapTileImage = img;
      lastTileKey = tileKey;
      statusText.innerText = 'Peta berhasil dimuat!';
      if (mediaType === 'image') drawImageFrame();
    };
    img.onerror = function () {
      tryNextServer(idx + 1);
    };

    const targetUrl = servers.slice(idx, idx + 1).shift();
    img.src = targetUrl;
  }

  tryNextServer(0);
  }
    
loadMapFromCoords();
function refreshPreviewIfImage() {
  if (mediaType === 'image') drawImageFrame();
}

inputTime.addEventListener('change', function () {
  baseDate = new Date(inputTime.value);
  refreshPreviewIfImage();
});

inputName.addEventListener('input', refreshPreviewIfImage);
inputCoords.addEventListener('input', refreshPreviewIfImage);
inputLocation.addEventListener('input', refreshPreviewIfImage);
inputAltitude.addEventListener('input', refreshPreviewIfImage);
inputSpeed.addEventListener('input', refreshPreviewIfImage);

toggleAltSpeed.addEventListener('change', refreshPreviewIfImage);
toggleMap.addEventListener('change', refreshPreviewIfImage);
mapPosition.addEventListener('change', refreshPreviewIfImage);
logoPosition.addEventListener('change', refreshPreviewIfImage);

inputFontSize.addEventListener('input', function () {
  fontSizeLabel.innerText = inputFontSize.value + '%';
  refreshPreviewIfImage();
});

mapSize.addEventListener('input', function () {
  mapSizeLabel.innerText = mapSize.value + '%';
  refreshPreviewIfImage();
});

mapOpacity.addEventListener('input', function () {
  mapOpacityLabel.innerText = mapOpacity.value + '%';
  refreshPreviewIfImage();
});

logoSize.addEventListener('input', function () {
  logoSizeLabel.innerText = logoSize.value + '%';
  refreshPreviewIfImage();
});

logoOpacity.addEventListener('input', function () {
  logoOpacityLabel.innerText = logoOpacity.value + '%';
  refreshPreviewIfImage();
});

btnGps.addEventListener('click', getSingleLocation);
btnLiveGps.addEventListener('click', toggleLiveTracking);
btnUpdateMap.addEventListener('click', loadMapFromCoords);
btnProcess.addEventListener('click', processAndDownload);

logoInput.addEventListener('change', function () {
  const file = this.files.item(0);
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      logoImage = img;
      statusText.innerText = 'Logo berhasil dimuat!';
      refreshPreviewIfImage();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

async function handleGpsPosition(pos, fetchAddress) {
  const lat = pos.coords.latitude.toFixed(6);
  const lon = pos.coords.longitude.toFixed(6);
  inputCoords.value = lat + ', ' + lon;

  if (pos.coords.accuracy) {
    gpsAccuracy = pos.coords.accuracy.toFixed(2).replace('.', ',') + 'm';
  }
  if (pos.coords.altitude !== null && !isNaN(pos.coords.altitude)) {
    inputAltitude.value = pos.coords.altitude.toFixed(1) + 'msnm';
  }
  if (pos.coords.speed !== null && !isNaN(pos.coords.speed)) {
    const kmh = (pos.coords.speed * 3.6).toFixed(1);
    inputSpeed.value = kmh + 'km/h';
  } else {
    inputSpeed.value = '0.0km/h';
  }

  loadMapFromCoords();

  if (fetchAddress) {
    try {
      const res = await fetch(
        'https://openstreetmap.org' + lat + '&lon=' + lon
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        const line1 = (parts.shift() || '').trim();
        const line2 = (parts.shift() || '').trim();
        inputLocation.value = line1 + (line2 ? '\n' + line2 : '');
      }
    } catch (e) {
      console.log('Alamat otomatis dilewati.');
    }
  }
  refreshPreviewIfImage();
}

function getSingleLocation() {
  if (!navigator.geolocation) {
    alert('Browser tidak mendukung GPS.');
    return;
  }
  statusText.innerText = 'Mencari titik koordinat GPS...';
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      handleGpsPosition(pos, true);
      statusText.innerText = 'GPS, Altitude, Speed & Peta diperbarui!';
    },
    function () {
      statusText.innerText = 'Izin lokasi ditolak atau GPS HP belum aktif.';
    },
    { enableHighAccuracy: true }
  );
}

function toggleLiveTracking() {
  if (!navigator.geolocation) {
    alert('Browser tidak mendukung GPS.');
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    btnLiveGps.innerText = 'Lacak Gerakan HP: OFF';
    btnLiveGps.classList.remove('active');
    statusText.innerText = 'Pelacakan gerakan HP dimatikan.';
    return;
  }

  btnLiveGps.innerText = 'Lacak Gerakan HP: ON';
  btnLiveGps.classList.add('active');
  statusText.innerText = 'Melacak pergerakan HP secara real-time...';

  let firstFix = true;
  watchId = navigator.geolocation.watchPosition(
    function (pos) {
      handleGpsPosition(pos, firstFix);
      firstFix = false;
      statusText.innerText =
        'Live GPS Aktif | Alt: ' + inputAltitude.value + ' | Speed: ' + inputSpeed.value;
    },
    function () {
      statusText.innerText = 'Gagal melacak pergerakan HP. Pastikan GPS aktif.';
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
}
mediaInput.addEventListener('change', function () {
  const file = this.files.item(0);
  if (!file) return;

  cancelAnimationFrame(animationId);
  const url = URL.createObjectURL(file);
  statusText.innerText = 'Memuat media...';

  if (file.type.startsWith('image/')) {
    mediaType = 'image';
    loadedImage.onload = function () {
      previewCanvas.width = loadedImage.width;
      previewCanvas.height = loadedImage.height;
      drawImageFrame();
      statusText.innerText = 'Foto siap!';
    };
    loadedImage.src = url;
  } else if (file.type.startsWith('video/')) {
    mediaType = 'video';
    hiddenVideo.src = url;
    hiddenVideo.muted = true;
    hiddenVideo.loop = true;
    hiddenVideo.load();

    hiddenVideo.onloadeddata = function () {
      previewCanvas.width = hiddenVideo.videoWidth || 640;
      previewCanvas.height = hiddenVideo.videoHeight || 480;
      hiddenVideo
        .play()
        .then(function () {
          renderVideoLoop();
          statusText.innerText = 'Video siap! Pratinjau berjalan.';
        })
        .catch(function () {
          ctx.drawImage(hiddenVideo, 0, 0, previewCanvas.width, previewCanvas.height);
          drawOverlay(0);
          statusText.innerText = 'Video dimuat. Tekan Proses & Unduh.';
        });
    };
  }
});

function formatIndonesianDate(dateObj) {
  const days = new Array('Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu');
  const months = new Array(
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  );
  function pad(n) {
    return String(n).padStart(2, '0');
  }
  const dayName = days.slice(dateObj.getDay(), dateObj.getDay() + 1).shift();
  const d = pad(dateObj.getDate());
  const monthName = months.slice(dateObj.getMonth(), dateObj.getMonth() + 1).shift();
  const y = dateObj.getFullYear();
  const h = pad(dateObj.getHours());
  const min = pad(dateObj.getMinutes());
  const s = pad(dateObj.getSeconds());
  return dayName + ', ' + d + ' ' + monthName + ' ' + y + ' ' + h + ':' + min + ':' + s;
}

function formatDMSCoords(rawStr) {
  const coords = parseLatLon(rawStr);
  if (!coords) return rawStr;
  const latDir = coords.lat >= 0 ? 'N' : 'S';
  const lonDir = coords.lon >= 0 ? 'E' : 'W';
  const latVal = Math.abs(coords.lat).toFixed(4).replace('.', ',');
  const lonVal = Math.abs(coords.lon).toFixed(4).replace('.', ',');
  return latVal + latDir + ' ' + lonVal + lonDir + ' ±' + gpsAccuracy;
}

function getCoordinatesForPosition(pos, objW, objH, margin) {
  const cw = previewCanvas.width;
  const ch = previewCanvas.height;
  let x = margin;
  let y = margin;

  if (pos === 'top-left') {
    x = margin;
    y = margin;
  } else if (pos === 'top-center') {
    x = (cw - objW) / 2;
    y = margin;
  } else if (pos === 'top-right') {
    x = cw - objW - margin;
    y = margin;
  } else if (pos === 'bottom-left') {
    x = margin;
    y = ch - objH - margin;
  } else if (pos === 'bottom-center') {
    x = (cw - objW) / 2;
    y = ch - objH - margin;
  } else if (pos === 'bottom-right') {
    x = cw - objW - margin;
    y = ch - objH - margin;
  } else if (pos === 'center') {
    x = (cw - objW) / 2;
    y = (ch - objH) / 2;
  }
  return { x: x, y: y };
}

function drawOverlay(elapsedSeconds) {
  if (typeof elapsedSeconds === 'undefined') elapsedSeconds = 0;

  const cw = previewCanvas.width;
  const ch = previewCanvas.height;
  const margin = Math.max(12, Math.round(cw * 0.025));

  // 1. GAMBAR PETA MINI (SHOW MAP)
  if (toggleMap.checked && mapTileImage) {
    const mScale = parseInt(mapSize.value, 10) / 100;
    const mAlpha = parseInt(mapOpacity.value, 10) / 100;
    const baseMapDim = Math.max(95, Math.round(cw * 0.25));
    const mapW = Math.round(baseMapDim * mScale);
    const mapH = Math.round(baseMapDim * mScale);
    const coords = getCoordinatesForPosition(mapPosition.value, mapW, mapH, margin);

    ctx.save();
    ctx.globalAlpha = mAlpha;
    ctx.drawImage(mapTileImage, coords.x, coords.y, mapW, mapH);

    // Pin Lokasi Merah di Tengah Peta
    const pinX = coords.x + mapW / 2;
    const pinY = coords.y + mapH / 2;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(pinX, pinY, Math.max(5, mapW * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(coords.x, coords.y, mapW, mapH);
    ctx.restore();
  }

  // 2. GAMBAR LOGO WATERMARK
  if (logoImage) {
    const lScale = parseInt(logoSize.value, 10) / 100;
    const lAlpha = parseInt(logoOpacity.value, 10) / 100;
    const baseLogoH = Math.max(50, Math.round(cw * 0.14));
    const logoH = Math.round(baseLogoH * lScale);
    const logoW = Math.round((logoImage.width / logoImage.height) * logoH);
    const lCoords = getCoordinatesForPosition(logoPosition.value, logoW, logoH, margin);

    ctx.save();
    ctx.globalAlpha = lAlpha;
    ctx.drawImage(logoImage, lCoords.x, lCoords.y, logoW, logoH);
    ctx.restore();
  }

  // 3. GAMBAR TEKS DI POJOK KANAN BAWAH (Urutan sesuai referensi kanan)
  const currentDate = new Date(baseDate.getTime() + elapsedSeconds * 1000);
  const locLines = inputLocation.value
    .split('\n')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);

  const lines = new Array();
  lines.push(formatIndonesianDate(currentDate));
  if (inputCoords.value.trim()) {
    lines.push(formatDMSCoords(inputCoords.value));
  }

  locLines.forEach(function (l) {
    lines.push(l);
  });

  if (toggleAltSpeed.checked) {
    const altVal = inputAltitude.value.trim();
    const spdVal = inputSpeed.value.trim();
    if (altVal) lines.push('Altitude:' + altVal);
    if (spdVal) lines.push('Speed:' + spdVal);
  }

  if (inputName.value.trim()) {
    lines.push(inputName.value.trim());
  }

  const tScale = parseInt(inputFontSize.value, 10) / 100;
  const baseFontSize = Math.max(13, Math.round(cw * 0.028));
  const fontSize = Math.round(baseFontSize * tScale);
  const lineHeight = fontSize * 1.28;

  ctx.save();
  ctx.font = '500 ' + fontSize + 'px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffffff';

  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1.5;
  ctx.shadowOffsetY = 1.5;

  let startY = ch - margin;
  while (lines.length > 0) {
    const lineText = lines.pop();
    ctx.fillText(lineText, cw - margin, startY);
    startY -= lineHeight;
  }
  ctx.restore();
}

function drawImageFrame() {
  ctx.drawImage(loadedImage, 0, 0, previewCanvas.width, previewCanvas.height);
  drawOverlay(0);
}

function renderVideoLoop() {
  if (mediaType !== 'video') return;
  if (!hiddenVideo.paused && !hiddenVideo.ended) {
    ctx.drawImage(hiddenVideo, 0, 0, previewCanvas.width, previewCanvas.height);
    drawOverlay(hiddenVideo.currentTime);
  }
  animationId = requestAnimationFrame(renderVideoLoop);
}

function processAndDownload() {
  if (!mediaType) {
    alert('Pilih file foto atau video terlebih dahulu.');
    return;
  }

  if (mediaType === 'image') {
    drawImageFrame();
    const link = document.createElement('a');
    link.download = 'timestamp-foto-' + Date.now() + '.png';
    link.href = previewCanvas.toDataURL('image/png');
    link.click();
    statusText.innerText = 'Foto berhasil diunduh!';
  } else if (mediaType === 'video') {
    recordAndExportVideo();
  }
}

function recordAndExportVideo() {
  btnProcess.disabled = true;
  statusText.innerText = 'Sedang merender video... Tunggu hingga selesai.';

  hiddenVideo.loop = false;
  hiddenVideo.currentTime = 0;

  const stream = previewCanvas.captureStream(30);

  try {
    const videoStream = hiddenVideo.captureStream
      ? hiddenVideo.captureStream()
      : hiddenVideo.mozCaptureStream
      ? hiddenVideo.mozCaptureStream()
      : null;
    if (videoStream) {
      const audioTracks = videoStream.getAudioTracks();
      if (audioTracks.length > 0) {
        stream.addTrack(audioTracks.shift());
      }
    }
  } catch (e) {
    console.log('Audio tidak digabungkan:', e);
  }

  let mimeType = 'video/webm';
  let ext = 'webm';
  if (MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/mp4';
    ext = 'mp4';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
    mimeType = 'video/webm;codecs=vp8';
  }

  const recorder = new MediaRecorder(stream, { mimeType: mimeType });
  const chunks = new Array();

  recorder.ondataavailable = function (e) {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = function () {
    const blob = new Blob(chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'timestamp-video-' + Date.now() + '.' + ext;
    link.href = url;
    link.click();

    btnProcess.disabled = false;
    statusText.innerText = 'Video (.' + ext + ') selesai dirender dan diunduh!';
    hiddenVideo.loop = true;
    hiddenVideo.muted = true;
    hiddenVideo.play();
  };

  hiddenVideo.muted = false;
  recorder.start();
  hiddenVideo.play();
  renderVideoLoop();

  hiddenVideo.onended = function () {
    if (recorder.state === 'recording') {
      recorder.stop();
    }
  };
}
