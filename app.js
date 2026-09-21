const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxei4QqVbT8TPKWdhw4d8nxExxfhMMsND0NWuBBDSPV3u_CwH-wbQupKqdUNBmvZq4/exec";

let html5QrCode;
let isProcessing = false;
const statusBox = document.getElementById("status-box");
const syncBtn = document.getElementById("sync-btn");
const btnKamera = document.getElementById("btn-kamera");

function showStatus(pesan, tipe) {
    statusBox.innerText = pesan;
    statusBox.className = tipe;
    statusBox.style.display = "block";
    setTimeout(() => { statusBox.style.display = "none"; }, 4000);
}

function mulaiKamera() {
    const readerDiv = document.getElementById("reader");
    readerDiv.style.display = "block"; 

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess
    ).then(() => {
    }).catch(err => {
        showStatus("Gagal akses kamera. Pastikan izin kamera aktif.", "offline");
    });
}

function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch(e) {}
}

function onScanSuccess(qrCodeMessage) {
    if (isProcessing) return;
    isProcessing = true;
    
    let hariIni = new Date().toISOString().split('T')[0];
    let cacheAbsen = JSON.parse(localStorage.getItem('absensiHarianLokal')) || { tanggal: hariIni, ids: [] };
    
    // Jika tanggal berubah ke hari esok, reset catatan lokal
    if (cacheAbsen.tanggal !== hariIni) {
        cacheAbsen = { tanggal: hariIni, ids: [] };
    }

    if (cacheAbsen.ids.includes(qrCodeMessage)) {
        try { navigator.vibrate([100, 50, 100]); } catch(e) {} // Getar khusus peringatan
        showStatus("⚠️ ID " + qrCodeMessage + " sudah input absen hari ini!", "offline");
        setTimeout(() => { isProcessing = false; }, 3000);
        return;
    }

    try { navigator.vibrate(200); } catch(e) {}
    playBeep(); 
    
    cacheAbsen.ids.push(qrCodeMessage);
    localStorage.setItem('absensiHarianLokal', JSON.stringify(cacheAbsen));

    const dataAbsen = { id: qrCodeMessage, waktu: Date.now() };

    if (navigator.onLine) {
        kirimKeServer(dataAbsen);
    } else {
        simpanKeLokal(dataAbsen);
        showStatus("📶 Offline. Data absen disimpan di HP.", "offline");
        setTimeout(() => { isProcessing = false; }, 3000);
    }
}


function kirimKeServer(data) {
    showStatus("Memproses absen...", "offline");
    const url = GOOGLE_SCRIPT_URL + "?id=" + encodeURIComponent(data.id) + "&waktu=" + data.waktu;

    fetch(url)
        .then(res => res.json())
        .then(result => {
            if (result.status === "sukses") {
                showStatus("✅ " + result.nama + " Hadir!", "sukses");
            } else {
                showStatus("⚠️ Gagal: " + result.pesan, "offline");
            }
        })
        .catch(err => {
            simpanKeLokal(data);
            showStatus("Jaringan tarabae. Disimpan offline.", "offline");
        })
        .finally(() => {
            setTimeout(() => { isProcessing = false; }, 3000);
        });
}

function simpanKeLokal(data) {
    let antrean = JSON.parse(localStorage.getItem('antreanAbsen')) || [];
    antrean.push(data);
    localStorage.setItem('antreanAbsen', JSON.stringify(antrean));
    cekAntreanOffline();
}

function cekAntreanOffline() {
    let antrean = JSON.parse(localStorage.getItem('antreanAbsen')) || [];
    if (antrean.length > 0) {
        syncBtn.style.display = "block";
        syncBtn.innerText = "⬆️ Kirim " + antrean.length + " Data Tertunda";
    } else {
        syncBtn.style.display = "none";
    }
}

function syncData() {
    if (!navigator.onLine) { alert("Sabar-sabar dulu, jaringan masih ilang yaa"); return; }
    
    let antrean = JSON.parse(localStorage.getItem('antreanAbsen')) || [];
    if (antrean.length === 0) return;

    syncBtn.innerText = "🔄 Sedang mengirim...";
    syncBtn.disabled = true;

    let dataTeratas = antrean[0];
    const url = GOOGLE_SCRIPT_URL + "?id=" + encodeURIComponent(dataTeratas.id) + "&waktu=" + dataTeratas.waktu;

    fetch(url)
        .then(res => res.json())
        .then(result => {
            if (result.status === "sukses") {
                antrean.shift();
                localStorage.setItem('antreanAbsen', JSON.stringify(antrean));
                cekAntreanOffline();
                
                if(antrean.length > 0) syncData(); 
                else { syncBtn.disabled = false; showStatus("✅ Semua data sinkron!", "sukses"); }
            }
        })
        .catch(err => {
            alert("Gagal sinkron. Nanti jaga tes-tes ulang.");
            syncBtn.disabled = false;
            cekAntreanOffline();
        });
}

window.onload = cekAntreanOffline;
window.addEventListener('online', syncData);


function absenManual() {
    let inputForm = document.getElementById("input-manual");
    let manualId = inputForm.value.trim();
    
    if (manualId !== "") {
        onScanSuccess(manualId);
        inputForm.value = ""; 
    } else {
        alert("Ketik ID-nya dulu, Bos!");
    }
}
